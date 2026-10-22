import { erreur, journaliser, json } from '../_shared/http.ts';
import { clientAdmin } from '../_shared/supabase.ts';

// Reçoit les événements d'abonnement (conçu pour RevenueCat, qui unifie Google Play et
// l'App Store) et met à jour la table `abonnements` : SEUL chemin pour devenir Premium.
// Configuration : dans RevenueCat, utiliser l'identifiant Supabase de l'utilisateur comme
// « App User ID », et l'en-tête Authorization = « Bearer <WEBHOOK_ABONNEMENT_SECRET> ».

const ACTIVATION = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE']);

function egalConstant(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i]! ^ eb[i]!;
  return diff === 0;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return erreur('methode', 405);
  const secret = Deno.env.get('WEBHOOK_ABONNEMENT_SECRET');
  if (!secret) return erreur('non_configure', 503);
  if (!egalConstant(req.headers.get('Authorization') ?? '', `Bearer ${secret}`)) return erreur('non_autorise', 401);

  const corps = await req.json().catch(() => null);
  const evenement = corps?.event;
  const userId: unknown = evenement?.app_user_id;
  if (typeof evenement?.type !== 'string' || typeof userId !== 'string' || !UUID.test(userId)) {
    return json({ ignore: true }); // 200 : on ne veut pas que le service réessaie indéfiniment
  }

  const expire = typeof evenement.expiration_at_ms === 'number' ? new Date(evenement.expiration_at_ms).toISOString() : null;
  const plateforme = evenement.store === 'APP_STORE' ? 'app_store' : evenement.store === 'PLAY_STORE' ? 'google_play' : 'manuel';
  let maj: Record<string, unknown> | null = null;
  if (ACTIVATION.has(evenement.type)) {
    maj = { offre: 'premium', statut: evenement.period_type === 'TRIAL' ? 'essai' : 'actif', plateforme, expire_le: expire, reference_externe: evenement.original_transaction_id ?? null };
  } else if (evenement.type === 'CANCELLATION') {
    // Le renouvellement est arrêté, mais l'accès reste valable jusqu'à expire_le.
    maj = { statut: 'annule', expire_le: expire };
  } else if (evenement.type === 'EXPIRATION') {
    maj = { offre: 'gratuit', statut: 'expire', expire_le: expire };
  }
  if (!maj) return json({ ignore: true });

  const admin = clientAdmin();
  try {
    const { error } = await admin.from('abonnements').update(maj).eq('user_id', userId);
    if (error) throw error;
    await admin.from('journal_securite').insert({ user_id: userId, type: 'abonnement', details: { evenement: evenement.type } });
    return json({ ok: true });
  } catch (e) {
    journaliser('webhook-abonnement', e);
    return erreur('echec', 500);
  }
});
