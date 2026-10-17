// Appels à l'API CinetPay (checkout v2). Côté serveur uniquement : la clé API et la clé secrète
// ne doivent jamais arriver dans le navigateur.
// Documentation : https://docs.cinetpay.com

import { createHmac, timingSafeEqual } from "crypto";

const API = "https://api-checkout.cinetpay.com/v2";

function identifiants(): { apikey: string; siteId: string } {
  const apikey = process.env.CINETPAY_API_KEY;
  const siteId = process.env.CINETPAY_SITE_ID;
  if (!apikey || !siteId) throw new Error("CINETPAY_API_KEY ou CINETPAY_SITE_ID manquante (voir .env.example)");
  return { apikey, siteId };
}

export function adresseDuSite(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// Notre identifiant de commande est un uuid avec des tirets. On l'envoie à CinetPay sans
// tirets (32 caractères) pour éviter tout caractère que leur système accepterait mal.
export function versTransactionId(commandeId: string): string {
  return commandeId.replace(/-/g, "");
}

export function depuisTransactionId(transactionId: string): string | null {
  if (!/^[0-9a-f]{32}$/i.test(transactionId)) return null;
  const t = transactionId.toLowerCase();
  return `${t.slice(0, 8)}-${t.slice(8, 12)}-${t.slice(12, 16)}-${t.slice(16, 20)}-${t.slice(20)}`;
}

// CinetPay refuse certains caractères dans la description : # / $ _ &
function nettoyerDescription(texte: string): string {
  return texte.replace(/[#/$_&]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

export type DemandePaiement = {
  commandeId: string;
  montant: number; // entier, multiple de 5 (règle de CinetPay pour les francs CFA)
  devise: string; // XAF ou XOF : doit être la devise activée sur votre compte CinetPay
  lang: "fr" | "en";
  description: string;
  client: { nom: string; email: string; telephone?: string; pays: string };
};

// Crée une page de paiement hébergée par CinetPay et renvoie son adresse.
// Les moyens de paiement proposés se règlent avec CINETPAY_CHANNELS : par défaut MOBILE_MONEY
// (Orange Money, MTN MoMo...). Pour accepter aussi les cartes bancaires (ALL ou CREDIT_CARD),
// CinetPay exige en plus l'adresse, la ville et le code postal du client : le formulaire
// d'achat ne les demande pas encore.
export async function creerLienDePaiement(demande: DemandePaiement): Promise<string> {
  const { apikey, siteId } = identifiants();
  const site = adresseDuSite();

  const [prenom, ...reste] = demande.client.nom.trim().split(/\s+/);
  const nomDeFamille = reste.join(" ") || prenom;

  const reponse = await fetch(`${API}/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // CinetPay bloque les requêtes sans User-Agent (erreur 1010)
      "User-Agent": "CamerMarket/1.0",
    },
    body: JSON.stringify({
      apikey,
      site_id: siteId,
      transaction_id: versTransactionId(demande.commandeId),
      amount: demande.montant,
      currency: demande.devise,
      description: nettoyerDescription(demande.description),
      // Ni notify_url ni return_url ne peuvent être en localhost : en test, utilisez un
      // tunnel public (ngrok...) comme NEXT_PUBLIC_SITE_URL.
      notify_url: `${site}/api/webhooks/cinetpay`,
      return_url: `${site}/api/paiement/retour?lang=${demande.lang}&ref=${demande.commandeId}`,
      channels: process.env.CINETPAY_CHANNELS ?? "MOBILE_MONEY",
      lang: demande.lang,
      metadata: demande.commandeId,
      customer_name: prenom,
      customer_surname: nomDeFamille,
      customer_email: demande.client.email,
      customer_country: demande.client.pays,
      ...(demande.client.telephone ? { customer_phone_number: demande.client.telephone } : {}),
    }),
  });

  const json = await reponse.json().catch(() => null);
  const lien = json?.data?.payment_url;
  if (json?.code !== "201" || typeof lien !== "string") {
    throw new Error(
      `CinetPay a refusé la création du paiement : ${json?.code ?? reponse.status} ${json?.message ?? ""} ${json?.description ?? ""}`.trim()
    );
  }
  return lien;
}

export type TransactionVerifiee = {
  statut: string; // ACCEPTED, REFUSED, WAITING_FOR_CUSTOMER...
  montant: number;
  devise: string;
  reference: string; // référence de l'opérateur, si elle existe
};

// Demande à CinetPay le résultat réel d'un paiement. On ne se fie jamais aux données de la
// notification ni du navigateur : seule cette vérification fait foi.
// Renvoie null si le paiement n'existe pas encore ou si la réponse n'est pas exploitable.
export async function verifierPaiement(commandeId: string): Promise<TransactionVerifiee | null> {
  const { apikey, siteId } = identifiants();

  const reponse = await fetch(`${API}/payment/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "CamerMarket/1.0" },
    body: JSON.stringify({ apikey, site_id: siteId, transaction_id: versTransactionId(commandeId) }),
    cache: "no-store",
  });

  const json = await reponse.json().catch(() => null);

  // Code 627 : transaction annulée
  if (json?.code === "627") return { statut: "REFUSED", montant: 0, devise: "", reference: "" };
  if (json?.code !== "00" || !json?.data) return null;

  const d = json.data;
  return {
    statut: String(d.status),
    montant: Number(d.amount),
    devise: String(d.currency),
    reference: d.operator_id ? String(d.operator_id) : "",
  };
}

// Champs de la notification, dans l'ordre exigé par CinetPay pour calculer le jeton x-token
// (https://docs.cinetpay.com/api/1.0-en/checkout/hmac).
const champsDuJeton = [
  "cpm_site_id",
  "cpm_trans_id",
  "cpm_trans_date",
  "cpm_amount",
  "cpm_currency",
  "signature",
  "payment_method",
  "cel_phone_num",
  "cpm_phone_prefixe",
  "cpm_language",
  "cpm_version",
  "cpm_payment_config",
  "cpm_page_action",
  "cpm_custom",
  "cpm_designation",
  "cpm_error_message",
] as const;

// Vérifie que la notification vient bien de CinetPay (HMAC-SHA256 avec votre clé secrète).
export function jetonNotificationValide(formulaire: FormData, jetonRecu: string, cleSecrete: string): boolean {
  const donnees = champsDuJeton.map((champ) => String(formulaire.get(champ) ?? "")).join("");
  const attendu = Buffer.from(createHmac("sha256", cleSecrete).update(donnees).digest("hex"));
  const recu = Buffer.from(jetonRecu.toLowerCase());
  return attendu.length === recu.length && timingSafeEqual(attendu, recu);
}
