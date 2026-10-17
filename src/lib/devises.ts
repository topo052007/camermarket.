// Devises acceptées et formatage des prix. Ce fichier ne dépend pas du serveur :
// il peut être utilisé par les composants serveur et client.
//
// Les deux francs CFA (XAF en Afrique centrale, XOF en Afrique de l'Ouest) ont la même valeur
// et s'écrivent tous deux « FCFA ». On garde pourtant deux devises distinctes, car CinetPay
// exige la devise du pays du compte marchand.

import type { Lang } from "./i18n";

export const devises = ["XAF", "XOF"] as const;
export type Devise = (typeof devises)[number];

export function formaterPrix(montant: number, _devise: Devise, lang: Lang): string {
  const nombre = new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", {
    maximumFractionDigits: 0,
  }).format(montant);
  return `${nombre} FCFA`;
}
