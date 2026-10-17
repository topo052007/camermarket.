// Adresse où CinetPay renvoie le client après le paiement (return_url).
// Selon le cas, CinetPay peut y revenir en GET ou en POST ; une page Next.js n'accepte que le
// GET. Cette route accepte les deux et redirige (303) vers la vraie page de retour, en GET.

import { NextResponse } from "next/server";
import { adresseDuSite } from "@/lib/cinetpay";
import { estLangue, langueParDefaut } from "@/lib/i18n";

export const runtime = "nodejs";

const regexUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function rediriger(requete: Request) {
  const { searchParams } = new URL(requete.url);
  const lang = searchParams.get("lang") ?? "";
  const ref = searchParams.get("ref") ?? "";

  const cible = new URL(`${adresseDuSite()}/${estLangue(lang) ? lang : langueParDefaut}/paiement/retour`);
  if (regexUuid.test(ref)) cible.searchParams.set("ref", ref);

  return NextResponse.redirect(cible, 303);
}

export const GET = rediriger;
export const POST = rediriger;
