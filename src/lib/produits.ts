// Lecture des produits et de leurs prix dans Supabase (clé publique : seuls les produits
// actifs sont visibles). Le paiement relit les prix de son côté, avec la clé service role.

import type { Devise } from "./devises";
import { devises } from "./devises";
import type { Lang } from "./i18n";
import { supabasePublic } from "./supabase-public";

export type TypeProduit = "physique" | "digital" | "formation";
export const typesProduit: TypeProduit[] = ["physique", "digital", "formation"];

export type Produit = {
  slug: string;
  type: TypeProduit;
  imageUrl: string | null;
  nom: Record<Lang, string>;
  description: Record<Lang, string>;
  points: Record<Lang, string[]>;
  // Une devise peut manquer si son prix n'a pas encore été saisi.
  prix: Partial<Record<Devise, number>>;
  // Codes ISO des pays où l'on livre. Absent = tous les pays ouverts (digital, formations).
  paysLivraison?: string[];
};

// Visuel affiché tant qu'un produit n'a pas d'image.
export const emojiParType: Record<TypeProduit, string> = {
  physique: "📦",
  digital: "📘",
  formation: "🎓",
};

const colonnes =
  "slug, type, image_url, nom_fr, nom_en, description_fr, description_en, points_fr, points_en, pays_livraison, prix_produits(devise, montant)";

type LigneProduit = {
  slug: string;
  type: TypeProduit;
  image_url: string | null;
  nom_fr: string;
  nom_en: string;
  description_fr: string | null;
  description_en: string | null;
  points_fr: string[] | null;
  points_en: string[] | null;
  pays_livraison: string[] | null;
  prix_produits: { devise: string; montant: number }[];
};

function estDevise(valeur: string): valeur is Devise {
  return (devises as readonly string[]).includes(valeur);
}

function versProduit(ligne: LigneProduit): Produit {
  const prix: Partial<Record<Devise, number>> = {};
  for (const { devise, montant } of ligne.prix_produits) {
    if (estDevise(devise)) prix[devise] = Number(montant);
  }
  return {
    slug: ligne.slug,
    type: ligne.type,
    imageUrl: ligne.image_url,
    nom: { fr: ligne.nom_fr, en: ligne.nom_en },
    description: { fr: ligne.description_fr ?? "", en: ligne.description_en ?? "" },
    points: { fr: ligne.points_fr ?? [], en: ligne.points_en ?? [] },
    prix,
    paysLivraison: ligne.pays_livraison ?? undefined,
  };
}

export async function listerProduits(type?: TypeProduit): Promise<Produit[]> {
  // Le slug départage les produits créés au même instant (ex. : seed.sql), pour un ordre stable.
  let requete = supabasePublic().from("produits").select(colonnes).order("cree_le").order("slug");
  if (type) requete = requete.eq("type", type);

  const { data, error } = await requete.returns<LigneProduit[]>();
  if (error) throw new Error(`Lecture des produits impossible : ${error.message}`);
  return data.map(versProduit);
}

export async function trouverProduit(slug: string): Promise<Produit | undefined> {
  const { data, error } = await supabasePublic()
    .from("produits")
    .select(colonnes)
    .eq("slug", slug)
    .returns<LigneProduit[]>()
    .maybeSingle();
  if (error) throw new Error(`Lecture du produit impossible : ${error.message}`);
  return data ? versProduit(data) : undefined;
}
