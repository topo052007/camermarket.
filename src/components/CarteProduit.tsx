import Link from "next/link";
import PrixProduit from "@/components/PrixProduit";
import Visuel from "@/components/Visuel";
import type { Devise } from "@/lib/devises";
import type { Produit } from "@/lib/produits";
import type { Lang } from "@/lib/i18n";

type Props = {
  produit: Produit;
  lang: Lang;
  devise: Devise;
  libelleType: string;
  libellePrixIndisponible: string;
};

export default function CarteProduit({ produit, lang, devise, libelleType, libellePrixIndisponible }: Props) {
  return (
    <Link href={`/${lang}/produits/${produit.slug}`} className="carte">
      <Visuel produit={produit} lang={lang} className="visuel" />
      <div className="contenu">
        <span className={`etiquette ${produit.type}`}>{libelleType}</span>
        <h3>{produit.nom[lang]}</h3>
        <PrixProduit produit={produit} devise={devise} lang={lang} libelleIndisponible={libellePrixIndisponible} />
      </div>
    </Link>
  );
}
