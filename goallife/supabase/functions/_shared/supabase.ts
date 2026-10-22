import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont fournies
// automatiquement par Supabase aux Edge Functions. La clé service role ne quitte jamais le serveur.

function variable(nom: string): string {
  const v = Deno.env.get(nom);
  if (!v) throw new Error(`Variable manquante : ${nom}`);
  return v;
}

/** Client agissant AU NOM de l'utilisateur (son jeton) : la RLS s'applique. */
export function clientUtilisateur(req: Request): SupabaseClient {
  return createClient(variable('SUPABASE_URL'), variable('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client administrateur (contourne la RLS) : seulement pour quotas, messages du coach, suppression. */
export function clientAdmin(): SupabaseClient {
  return createClient(variable('SUPABASE_URL'), variable('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Identifiant de l'utilisateur connecté, ou null si le jeton est absent ou invalide. */
export async function utilisateurConnecte(req: Request): Promise<string | null> {
  const jeton = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!jeton) return null;
  const { data, error } = await clientUtilisateur(req).auth.getUser(jeton);
  if (error || !data.user) return null;
  return data.user.id;
}
