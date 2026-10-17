// Image du produit, ou un emoji selon le type tant qu'aucune image n'est ajoutée.

import { emojiParType, Produit } from "@/lib/produits";
import type { Lang } from "@/lib/i18n";

type Props = { produit: Produit; lang: Lang; className: string };

export default function Visuel({ produit, lang, className }: Props) {
  return (
    <div className={className}>
      {produit.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={produit.imageUrl} alt={produit.nom[lang]} />
      ) : (
        emojiParType[produit.type]
      )}
    </div>
  );
}
