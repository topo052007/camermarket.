// Prix dans la devise choisie, ou un message si ce prix n'a pas encore été saisi.

import { Devise, formaterPrix } from "@/lib/devises";
import type { Lang } from "@/lib/i18n";
import type { Produit } from "@/lib/produits";

type Props = { produit: Produit; devise: Devise; lang: Lang; libelleIndisponible: string };

export default function PrixProduit({ produit, devise, lang, libelleIndisponible }: Props) {
  const montant = produit.prix[devise];
  if (montant === undefined) return <span className="prix indisponible">{libelleIndisponible}</span>;
  return <span className="prix">{formaterPrix(montant, devise, lang)}</span>;
}
