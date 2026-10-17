import Link from "next/link";
import { notFound } from "next/navigation";
import CarteProduit from "@/components/CarteProduit";
import { lireDevise } from "@/lib/devise-serveur";
import { dictionnaires, estLangue } from "@/lib/i18n";
import { listerProduits } from "@/lib/produits";

export default async function Accueil({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!estLangue(lang)) notFound();

  const dict = dictionnaires[lang];
  const devise = await lireDevise(lang);
  const produits = await listerProduits();

  return (
    <>
      <section className="hero">
        <div className="conteneur">
          <h1>{dict.hero.titre}</h1>
          <p>{dict.hero.texte}</p>
          <Link href={`/${lang}/produits`} className="bouton">
            {dict.hero.bouton}
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="conteneur">
          <h2>{dict.accueil.nosProduits}</h2>
          <div className="grille">
            {produits.map((p) => (
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
    </>
  );
}
