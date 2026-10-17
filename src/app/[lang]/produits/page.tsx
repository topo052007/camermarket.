import Link from "next/link";
import { notFound } from "next/navigation";
import CarteProduit from "@/components/CarteProduit";
import { lireDevise } from "@/lib/devise-serveur";
import { dictionnaires, estLangue } from "@/lib/i18n";
import { listerProduits, typesProduit as types } from "@/lib/produits";

export default async function Boutique({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { lang } = await params;
  if (!estLangue(lang)) notFound();

  const { type } = await searchParams;
  const filtre = types.find((t) => t === type);
  const liste = await listerProduits(filtre);

  const dict = dictionnaires[lang];
  const devise = await lireDevise(lang);

  return (
    <section className="section">
      <div className="conteneur">
        <h2>{dict.boutique.titre}</h2>
        <div className="filtres">
          <Link href={`/${lang}/produits`} className={!filtre ? "actif" : ""}>
            {dict.boutique.tout}
          </Link>
          {types.map((t) => (
            <Link key={t} href={`/${lang}/produits?type=${t}`} className={filtre === t ? "actif" : ""}>
              {dict.types[t]}
            </Link>
          ))}
        </div>
        <div className="grille">
          {liste.map((p) => (
            <CarteProduit
              key={p.slug}
              produit={p}
              lang={lang}
              devise={devise}
              libelleType={dict.types[p.type]}
              libellePrixIndisponible={dict.produit.prixIndisponible}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
