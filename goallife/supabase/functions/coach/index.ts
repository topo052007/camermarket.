import { z } from 'zod';
import { construireContexte, convertirPlanIa, promptPlan, promptSysteme, schemaPlanIa, schemaSaisieObjectif, type Langue, type ObjectifContexte } from '../_shared/coach.ts';
import { ENTETES_CORS, erreur, journaliser, json } from '../_shared/http.ts';
import { choisirFournisseur } from '../_shared/ia/index.ts';
import { clientAdmin, clientUtilisateur, utilisateurConnecte } from '../_shared/supabase.ts';

// Coach IA. Modes :
// - statut  : l'IA est-elle configurée ? quota du mois (ne consomme rien)
// - message : question libre -> réponse courte (consomme 1 requête du quota)
// - plan    : proposition de plan structuré pour un objectif (consomme 1 requête)
// Sans clé IA, renvoie { ok: false, raison: 'non_configuree' } : l'application reste utilisable.

const schemaCorps = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('statut') }),
  z.object({ mode: z.literal('message'), question: z.string().trim().min(2).max(1000), langue: z.enum(['fr', 'en']) }),
  z.object({ mode: z.literal('plan'), objectif: schemaSaisieObjectif, langue: z.enum(['fr', 'en']) }),
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: ENTETES_CORS });
  if (req.method !== 'POST') return erreur('methode', 405);

  const userId = await utilisateurConnecte(req);
  if (!userId) return erreur('non_connecte', 401);

  const corps = schemaCorps.safeParse(await req.json().catch(() => null));
  if (!corps.success) return erreur('requete_invalide', 400);

  const fournisseur = choisirFournisseur();
  const admin = clientAdmin();
  const utilisateur = clientUtilisateur(req);

  try {
    if (corps.data.mode === 'statut') {
      const [{ data: offre }, { data: parametres }, { data: usage }] = await Promise.all([
        admin.rpc('offre_effective', { p_user: userId }),
        admin.from('parametres_offres').select('offre, quota_ia_mensuel'),
        utilisateur.from('usage_ia').select('requetes').eq('mois', new Date().toISOString().slice(0, 8) + '01').maybeSingle(),
      ]);
      const quota = (parametres ?? []).find((p) => p.offre === offre)?.quota_ia_mensuel ?? 0;
      return json({ ia_configuree: fournisseur !== null, offre: offre ?? 'gratuit', utilise: usage?.requetes ?? 0, quota });
    }

    if (!fournisseur) return json({ ok: false, raison: 'non_configuree' });

    // Quota vérifié et consommé côté serveur, de façon atomique.
    const { data: quota, error: erreurQuota } = await admin.rpc('consommer_quota_ia', { p_user: userId });
    if (erreurQuota) throw erreurQuota;
    if (!quota?.autorise) return json({ ok: false, raison: 'quota_epuise' });

    const { data: profil } = await utilisateur.from('profils').select('fuseau_horaire, partage_objectifs_ia, minutes_par_jour').single();
    const aujourdhui = new Intl.DateTimeFormat('en-CA', { timeZone: profil?.fuseau_horaire ?? 'UTC' }).format(new Date());
    const langue: Langue = corps.data.langue;

    if (corps.data.mode === 'plan') {
      const saisie = corps.data.objectif;
      const brut = await fournisseur.repondreJson({
        systeme: promptSysteme(langue),
        messages: [{ role: 'user', contenu: promptPlan(saisie, profil?.minutes_par_jour ?? null) }],
        maxTokens: 4000,
        schema: schemaPlanIa,
      });
      const plan = brut ? convertirPlanIa(brut, saisie) : null;
      return json(plan ? { ok: true, plan } : { ok: false, raison: 'indisponible' });
    }

    // mode message : contexte minimal + derniers échanges
    const depuis = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
    const [{ data: objectifs }, { data: historique }] = await Promise.all([
      utilisateur
        .from('objectifs')
        .select('titre, categorie, type, statut, valeur_cible, valeur_initiale, unite, date_debut, date_echeance, evenements_progression(type, valeur), actions(statut, date_prevue)')
        .in('statut', ['actif', 'en_pause'])
        .gte('actions.date_prevue', depuis)
        .lte('actions.date_prevue', aujourdhui),
      utilisateur.from('messages_coach').select('role, contenu').order('cree_le', { ascending: false }).limit(6),
    ]);
    type Ligne = Omit<ObjectifContexte, 'contributions' | 'actions_faites_14j' | 'actions_prevues_14j'> & {
      evenements_progression: { type: string; valeur: number | null }[];
      actions: { statut: string }[];
    };
    const contexte = construireContexte(
      ((objectifs ?? []) as Ligne[]).map((o) => ({
        ...o,
        contributions: o.evenements_progression.filter((e) => e.type === 'contribution').reduce((s, e) => s + (e.valeur ?? 0), 0),
        actions_faites_14j: o.actions.filter((a) => a.statut === 'terminee').length,
        actions_prevues_14j: o.actions.filter((a) => a.statut !== 'annulee' && a.statut !== 'reportee').length,
      })),
      aujourdhui,
      profil?.partage_objectifs_ia ?? false,
    );
    const anciens = (historique ?? []).reverse().map((m) => ({ role: m.role === 'coach' ? ('assistant' as const) : ('user' as const), contenu: m.contenu as string }));
    const question = corps.data.question;
    const reponse = await fournisseur.repondre({
      systeme: `${promptSysteme(langue)}\n\n${contexte}`,
      messages: [...anciens, { role: 'user', contenu: question }],
      maxTokens: 1500,
    });
    if (!reponse) return json({ ok: false, raison: 'indisponible' });

    await admin.from('messages_coach').insert([
      { user_id: userId, role: 'utilisateur', contenu: question, source: 'ia' },
      { user_id: userId, role: 'coach', contenu: reponse.slice(0, 4000), source: 'ia' },
    ]);
    return json({ ok: true, reponse, utilise: quota.utilise, quota: quota.quota });
  } catch (e) {
    journaliser('coach', e);
    return json({ ok: false, raison: 'indisponible' });
  }
});
