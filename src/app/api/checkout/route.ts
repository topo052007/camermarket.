// Création d'une commande et de la page de paiement CinetPay.
// Le navigateur envoie seulement le produit, le pays et les coordonnées du client :
// le prix et la devise sont TOUJOURS déduits côté serveur (devise du pays, prix relu dans la base).

import { NextResponse } from "next/server";
import { creerLienDePaiement } from "@/lib/cinetpay";
import { estLangue } from "@/lib/i18n";
import { deviseDuPays, estCodePays, paysActifs } from "@/lib/pays";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texte(valeur: unknown, max: number): string {
  return typeof valeur === "string" ? valeur.trim().slice(0, max) : "";
}

// Les erreurs sont des codes : l'interface choisit le message dans la bonne langue.
function erreur(code: "invalide" | "pays_non_livre" | "paiement_indisponible", statut: number) {
  return NextResponse.json({ erreur: code }, { status: statut });
}

type LignePrix = { devise: string; montant: number | string };

export async function POST(requete: Request) {
  const corps = await requete.json().catch(() => null);
  if (!corps || typeof corps !== "object") return erreur("invalide", 400);

  const slug = texte(corps.slug, 100);
  const lang = texte(corps.lang, 2);
  const pays = texte(corps.pays, 2).toUpperCase();
  const email = texte(corps.email, 200).toLowerCase();
  const nom = texte(corps.nom, 120);
  const telephone = texte(corps.telephone, 30);
  const adresse = texte(corps.adresse, 300);

  if (!slug || !estLangue(lang)) return erreur("invalide", 400);
  if (!regexEmail.test(email) || !nom) return erreur("invalide", 400);

  // Seuls les pays ouverts (variable PAYS_ACTIFS) peuvent acheter.
  if (!estCodePays(pays) || !paysActifs().includes(pays)) return erreur("pays_non_livre", 400);
  const devise = deviseDuPays(pays);

  const db = supabaseAdmin();

  const { data: produit } = await db
    .from("produits")
    .select("id, nom_fr, nom_en, type, actif, pays_livraison, stock, prix_produits(devise, montant)")
    .eq("slug", slug)
    .maybeSingle();

  if (!produit || !produit.actif) return erreur("invalide", 404);

  const prix = (produit.prix_produits as LignePrix[]).find((p) => p.devise === devise);
  if (!prix) {
    console.error(`Aucun prix en ${devise} pour le produit ${slug}`);
    return erreur("paiement_indisponible", 500);
  }
  const montant = Number(prix.montant);

  // CinetPay n'accepte que des montants entiers multiples de 5 en francs CFA.
  if (!Number.isInteger(montant) || montant % 5 !== 0) {
    console.error(`Prix invalide pour CinetPay (${montant} ${devise}, produit ${slug}) : entier multiple de 5 attendu`);
    return erreur("paiement_indisponible", 500);
  }

  // Produit physique : adresse et téléphone obligatoires, et pays desservi.
  const physique = produit.type === "physique";
  if (physique) {
    if (!adresse || !telephone) return erreur("invalide", 400);
    if (produit.stock !== null && produit.stock <= 0) return erreur("invalide", 409);
    if (produit.pays_livraison && !produit.pays_livraison.includes(pays)) {
      return erreur("pays_non_livre", 400);
    }
  }

  const { data: commande, error: erreurCommande } = await db
    .from("commandes")
    .insert({
      statut: "en_attente",
      devise,
      total: montant,
      lang,
      email_client: email,
      nom_client: nom,
      whatsapp_client: telephone || null,
      pays_client: pays,
      pays_livraison: physique ? pays : null,
      adresse_livraison: physique ? adresse : null,
      telephone_livraison: physique ? telephone : null,
    })
    .select("id")
    .single();

  if (erreurCommande || !commande) {
    console.error("Création de commande impossible :", erreurCommande);
    return erreur("paiement_indisponible", 500);
  }

  const { error: erreurLigne } = await db.from("lignes_commande").insert({
    commande_id: commande.id,
    produit_id: produit.id,
    quantite: 1,
    prix_unitaire: montant,
  });

  if (erreurLigne) {
    console.error("Création de ligne de commande impossible :", erreurLigne);
    await db.from("commandes").update({ statut: "annulee" }).eq("id", commande.id);
    return erreur("paiement_indisponible", 500);
  }

  try {
    const lien = await creerLienDePaiement({
      commandeId: commande.id,
      montant,
      devise,
      lang,
      description: lang === "fr" ? produit.nom_fr : produit.nom_en,
      client: { nom, email, telephone: telephone || undefined, pays },
    });
    return NextResponse.json({ lien });
  } catch (e) {
    console.error(e);
    await db.from("commandes").update({ statut: "annulee" }).eq("id", commande.id);
    return erreur("paiement_indisponible", 502);
  }
}
