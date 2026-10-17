// Pays africains proposés et monnaie de chacun. Tous utilisent le franc CFA :
// XAF en Afrique centrale (CEMAC), XOF en Afrique de l'Ouest (UEMOA).
//
// Pour ouvrir un pays : (1) l'ajouter dans PAYS_ACTIFS (.env.local), (2) vérifier avec
// CinetPay que la devise de ce pays est activée sur votre compte (un compte camerounais
// n'encaisse en général que le XAF). Pour ajouter un pays qui n'est pas en franc CFA (Guinée,
// RDC...), il faut aussi ajouter sa devise dans devises.ts, schema.sql et les prix.

import type { Devise } from "./devises";
import type { Lang } from "./i18n";

export const paysAfricains = {
  // Afrique centrale (CEMAC) : XAF
  CM: "XAF",
  GA: "XAF",
  CG: "XAF",
  TD: "XAF",
  CF: "XAF",
  GQ: "XAF",
  // Afrique de l'Ouest (UEMOA) : XOF
  CI: "XOF",
  SN: "XOF",
  BF: "XOF",
  ML: "XOF",
  TG: "XOF",
  BJ: "XOF",
  NE: "XOF",
  GW: "XOF",
} as const satisfies Record<string, Devise>;

export type CodePays = keyof typeof paysAfricains;

export const nomCookiePays = "cm_pays";
export const paysParDefaut: CodePays = "CM";

export function estCodePays(valeur: string | undefined): valeur is CodePays {
  return !!valeur && Object.prototype.hasOwnProperty.call(paysAfricains, valeur);
}

export function deviseDuPays(code: CodePays): Devise {
  return paysAfricains[code];
}

// Pays réellement ouverts à la vente (variable PAYS_ACTIFS, par exemple "CM,CI,SN").
// Sans réglage, seul le Cameroun est ouvert. À utiliser côté serveur.
export function paysActifs(): CodePays[] {
  const brut = process.env.PAYS_ACTIFS;
  const liste = (brut ? brut.split(",") : [paysParDefaut])
    .map((c) => c.trim().toUpperCase())
    .filter(estCodePays);
  return liste.length > 0 ? liste : [paysParDefaut];
}

export function nomDuPays(code: string, lang: Lang): string {
  return new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? code;
}

export function optionsPays(codes: readonly string[], lang: Lang): { code: string; nom: string }[] {
  return codes.map((code) => ({ code, nom: nomDuPays(code, lang) }));
}
