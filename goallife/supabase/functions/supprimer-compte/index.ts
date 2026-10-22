import { ENTETES_CORS, erreur, journaliser, json } from '../_shared/http.ts';
import { clientAdmin, utilisateurConnecte } from '../_shared/supabase.ts';

// Suppression définitive du compte. La suppression de auth.users entraîne, par les clés
// étrangères ON DELETE CASCADE, celle de TOUTES les données de l'utilisateur
// (vérifié par supabase/tests/10-securite-et-logique.sql).

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: ENTETES_CORS });
  if (req.method !== 'POST') return erreur('methode', 405);

  const userId = await utilisateurConnecte(req);
  if (!userId) return erreur('non_connecte', 401);
  const corps = await req.json().catch(() => null);
  if (corps?.confirmation !== true) return erreur('confirmation_requise', 400);

  const admin = clientAdmin();
  try {
    // Le journal ne garde aucune trace permettant de relier l'événement à la personne.
    await admin.from('journal_securite').update({ user_id: null }).eq('user_id', userId);
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
    await admin.from('journal_securite').insert({ type: 'compte_supprime', details: {} });
    return json({ ok: true });
  } catch (e) {
    journaliser('supprimer-compte', e);
    return erreur('echec', 500);
  }
});
