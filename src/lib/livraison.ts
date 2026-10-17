// Livraison par e-mail après un paiement confirmé : le client reçoit son lien d'accès personnel.
// Envoi via Resend (https://resend.com) avec un simple appel HTTP, sans bibliothèque.
//
// WhatsApp : le numéro est enregistré avec la commande, mais l'envoi automatique de messages
// WhatsApp demande l'API WhatsApp Business (compte vérifié, messages modèles approuvés,
// facturation). Ce n'est pas branché ici : voir CLAUDE.md. En attendant, la page de retour
// propose au client d'envoyer son lien sur WhatsApp lui-même.

import { supabaseAdmin } from "./supabase-admin";

type ProduitLigne = { type: string; nom_fr: string; nom_en: string };

function echapper(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const textes = {
  fr: {
    sujet: "Votre commande CamerMarket",
    bonjour: (nom: string) => (nom ? `Bonjour ${nom},` : "Bonjour,"),
    merci: "Merci pour votre achat ! Voici ce que vous avez commandé :",
    acces: "Voici votre lien d'accès personnel (téléchargements et formation). Gardez cet e-mail et ne partagez pas ce lien :",
    bouton: "Accéder à mon achat",
    suivi: "Vous pouvez suivre votre commande avec ce lien :",
    physique: "Votre produit physique est en préparation. Nous vous contacterons pour la livraison.",
    signature: "L'équipe CamerMarket",
  },
  en: {
    sujet: "Your CamerMarket order",
    bonjour: (nom: string) => (nom ? `Hello ${nom},` : "Hello,"),
    merci: "Thank you for your purchase! Here is what you ordered:",
    acces: "Here is your personal access link (downloads and course). Keep this email and do not share the link:",
    bouton: "Access my purchase",
    suivi: "You can follow your order with this link:",
    physique: "Your physical product is being prepared. We will contact you about delivery.",
    signature: "The CamerMarket team",
  },
} as const;

export async function livrerCommande(commandeId: string): Promise<void> {
  const db = supabaseAdmin();

  // On "réclame" l'envoi de façon atomique : si le webhook et la page de retour arrivent
  // en même temps, un seul des deux obtient la ligne et envoie l'e-mail.
  const { data: reclamees, error } = await db
    .from("commandes")
    .update({ livraison_envoyee_le: new Date().toISOString() })
    .eq("id", commandeId)
    .is("livraison_envoyee_le", null)
    .select("email_client, nom_client, lang, jeton_acces, lignes_commande(produits(type, nom_fr, nom_en))");

  if (error) throw error;
  if (!reclamees || reclamees.length === 0) return; // déjà envoyé

  const commande = reclamees[0];

  try {
    await envoyerEmail(commande);
  } catch (e) {
    // L'envoi a échoué : on libère la réservation pour qu'un nouvel essai soit possible.
    await db.from("commandes").update({ livraison_envoyee_le: null }).eq("id", commandeId);
    throw e;
  }
}

type CommandeAEnvoyer = {
  email_client: string;
  nom_client: string | null;
  lang: string;
  jeton_acces: string;
  lignes_commande: unknown;
};

async function envoyerEmail(commande: CommandeAEnvoyer): Promise<void> {
  const cle = process.env.RESEND_API_KEY;
  const expediteur = process.env.EMAIL_FROM;
  if (!cle || !expediteur) throw new Error("RESEND_API_KEY ou EMAIL_FROM manquante (voir .env.example)");

  const lang = commande.lang === "en" ? "en" : "fr";
  const t = textes[lang];

  const lignes = commande.lignes_commande as { produits: ProduitLigne | ProduitLigne[] | null }[];
  const produits = lignes
    .map((l) => (Array.isArray(l.produits) ? l.produits[0] : l.produits))
    .filter((p): p is ProduitLigne => !!p);

  const aAcces = produits.some((p) => p.type !== "physique");
  const aPhysique = produits.some((p) => p.type === "physique");
  const noms = produits.map((p) => (lang === "fr" ? p.nom_fr : p.nom_en));

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const lien = `${site}/${lang}/acces/${commande.jeton_acces}`;
  const nom = commande.nom_client ?? "";

  const texte = [
    t.bonjour(nom),
    "",
    t.merci,
    ...noms.map((n) => `- ${n}`),
    "",
    aAcces ? t.acces : t.suivi,
    lien,
    ...(aPhysique ? ["", t.physique] : []),
    "",
    t.signature,
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1b1f23;line-height:1.5">
      <p>${echapper(t.bonjour(nom))}</p>
      <p>${t.merci}</p>
      <ul>${noms.map((n) => `<li>${echapper(n)}</li>`).join("")}</ul>
      <p>${aAcces ? t.acces : t.suivi}</p>
      <p><a href="${lien}" style="display:inline-block;padding:12px 22px;background:#0a7a3d;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">${t.bouton}</a></p>
      <p style="font-size:13px;color:#5a6270;word-break:break-all">${lien}</p>
      ${aPhysique ? `<p>${t.physique}</p>` : ""}
      <p>${t.signature}</p>
    </div>`;

  const reponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: expediteur, to: [commande.email_client], subject: t.sujet, html, text: texte }),
  });

  if (!reponse.ok) {
    throw new Error(`Envoi de l'e-mail refusé (${reponse.status}) : ${await reponse.text()}`);
  }
}
