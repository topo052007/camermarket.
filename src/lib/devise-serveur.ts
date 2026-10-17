// Lit le pays choisi par le visiteur (cookie cm_pays) et en déduit la devise.
// À utiliser dans les composants serveur.

import { cookies } from "next/headers";
import type { Devise } from "./devises";
import type { Lang } from "./i18n";
import { CodePays, deviseDuPays, estCodePays, nomCookiePays, paysActifs, paysParDefaut } from "./pays";

export async function lirePays(): Promise<CodePays> {
  const actifs = paysActifs();
  const valeur = (await cookies()).get(nomCookiePays)?.value;
  if (estCodePays(valeur) && actifs.includes(valeur)) return valeur;
  return actifs.includes(paysParDefaut) ? paysParDefaut : actifs[0];
}

// Le paramètre lang n'est plus utilisé : il est conservé pour ne pas changer les pages.
export async function lireDevise(_lang?: Lang): Promise<Devise> {
  return deviseDuPays(await lirePays());
}
