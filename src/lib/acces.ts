// Lecture de ce qu'un client a acheté, à partir de son lien d'accès personnel (jeton).
// Côté serveur uniquement : le jeton remplace le compte client.

import { supabaseAdmin } from "./supabase-admin";

// 64 caractères hexadécimaux (voir commandes.jeton_acces dans schema.sql)
export const regexJeton = /^[0-9a-f]{64}$/;

const statutsPayes = ["payee", "en_preparation", "expediee", "livree"];

export type LeconAcces = {
  id: string;
  titre_fr: string;
  titre_en: string;
  video_url: string | null;
  contenu_fr: string | null;
  contenu_en: string | null;
  position: number;
};

export type ModuleAcces = {
  id: string;
  titre_fr: string;
  titre_en: string;
  position: number;
  lecons: LeconAcces[];
};

export type ProduitAcces = {
  slug: string;
  type: "physique" | "digital" | "formation";
  nom_fr: string;
  nom_en: string;
  fichier_chemin: string | null;
  modules: ModuleAcces[];
};

export type AccesCommande = {
  statut: string;
  produits: ProduitAcces[];
};

// Renvoie null si le jeton est inconnu ou si la commande n'est pas payée.
export async function chargerAcces(jeton: string): Promise<AccesCommande | null> {
  if (!regexJeton.test(jeton)) return null;

  const { data, error } = await supabaseAdmin()
    .from("commandes")
    .select(
      `statut,
       lignes_commande(
         produits(
           slug, type, nom_fr, nom_en, fichier_chemin,
           modules(id, titre_fr, titre_en, position,
             lecons(id, titre_fr, titre_en, video_url, contenu_fr, contenu_en, position))
         )
       )`
    )
    .eq("jeton_acces", jeton)
    .maybeSingle();

  if (error) throw error;
  if (!data || !statutsPayes.includes(data.statut)) return null;

  const lignes = data.lignes_commande as unknown as { produits: ProduitAcces | ProduitAcces[] | null }[];
  const produits = lignes
    .map((l) => (Array.isArray(l.produits) ? l.produits[0] : l.produits))
    .filter((p): p is ProduitAcces => !!p);

  for (const p of produits) {
    p.modules.sort((a, b) => a.position - b.position);
    for (const m of p.modules) m.lecons.sort((a, b) => a.position - b.position);
  }

  return { statut: data.statut, produits };
}

// Jeton d'une commande (sert à la page de retour, juste après le paiement).
export async function jetonDeLaCommande(commandeId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from("commandes")
    .select("jeton_acces")
    .eq("id", commandeId)
    .maybeSingle();

  if (error) throw error;
  return data?.jeton_acces ?? null;
}
