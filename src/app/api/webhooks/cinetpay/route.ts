// Notification envoyée par CinetPay à chaque changement de statut d'un paiement, même si le
// client ne revient jamais sur le site. CinetPay appelle aussi cette adresse en GET pour
// vérifier qu'elle répond. Elle ne doit pas être en localhost (utiliser un tunnel en test).
//
// La notification ne contient pas le statut du paiement : on lit seulement l'identifiant de la
// commande, puis confirmerPaiement interroge CinetPay pour connaître le vrai résultat.

import { NextResponse } from "next/server";
import { depuisTransactionId, jetonNotificationValide } from "@/lib/cinetpay";
import { confirmerPaiement } from "@/lib/paiement";

export const runtime = "nodejs";

export async function GET() {
  return new NextResponse("OK");
}

export async function POST(requete: Request) {
  const formulaire = await requete.formData().catch(() => null);
  if (!formulaire) return new NextResponse("Requête invalide", { status: 400 });

  // Si la clé secrète est configurée, on vérifie la signature x-token.
  const cleSecrete = process.env.CINETPAY_SECRET_KEY;
  if (cleSecrete && !jetonNotificationValide(formulaire, requete.headers.get("x-token") ?? "", cleSecrete)) {
    console.error("Notification CinetPay refusée : x-token invalide.");
    return new NextResponse("Signature invalide", { status: 401 });
  }

  if (String(formulaire.get("cpm_site_id") ?? "") !== process.env.CINETPAY_SITE_ID) {
    return new NextResponse("Site inconnu", { status: 400 });
  }

  const commandeId = depuisTransactionId(String(formulaire.get("cpm_trans_id") ?? ""));
  if (commandeId) {
    try {
      await confirmerPaiement(commandeId);
    } catch (e) {
      console.error("Erreur lors de la confirmation du paiement :", e);
      // Toute réponse autre que 200 est considérée comme un échec par CinetPay.
      return new NextResponse("Erreur", { status: 500 });
    }
  }

  // CinetPay attend une réponse 200 OK.
  return new NextResponse("OK");
}
