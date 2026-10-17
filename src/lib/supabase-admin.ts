// Client Supabase avec les pleins pouvoirs (clé "service role").
// À utiliser UNIQUEMENT côté serveur (routes API, pages serveur). Ne jamais l'importer
// dans un composant client : la clé donnerait accès à toute la base.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquante (voir .env.example)");
  }

  client = createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
