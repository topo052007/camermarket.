// Toute adresse sans /fr ou /en est redirigée vers la langue préférée du navigateur.

import { NextRequest, NextResponse } from "next/server";
import { Lang, estLangue, langueParDefaut, langues } from "@/lib/i18n";

function langueDuNavigateur(requete: NextRequest): Lang {
  const entete = requete.headers.get("accept-language") ?? "";
  for (const partie of entete.split(",")) {
    const code = partie.trim().slice(0, 2).toLowerCase();
    if (estLangue(code)) return code;
  }
  return langueParDefaut;
}

export function middleware(requete: NextRequest) {
  const { pathname } = requete.nextUrl;
  const aUneLangue = langues.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  if (aUneLangue) return NextResponse.next();

  const url = requete.nextUrl.clone();
  url.pathname = `/${langueDuNavigateur(requete)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Ignore les fichiers internes de Next.js et les fichiers statiques (avec extension).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
