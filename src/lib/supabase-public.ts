// Client Supabase avec la clé PUBLIQUE : les règles de sécurité (RLS) s'appliquent,
// donc seuls les produits actifs et leurs prix sont lisibles. Sert à afficher la boutique.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabasePublic(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Nom créé par l'intégration Supabase de Vercel ; l'ancien nom reste accepté.
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !cle) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquante (voir .env.example)");
  }

  client = createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
