import { notFound } from "next/navigation";
import BoutonAchat from "@/components/BoutonAchat";
import { lireDevise, lirePays } from "@/lib/devise-serveur";
import PrixProduit from "@/components/PrixProduit";
import Visuel from "@/components/Visuel";
import { dictionnaires, estLangue } from "@/lib/i18n";
import { optionsPays, paysActifs } from "@/lib/pays";
import { trouverProduit } from "@/lib/produits";

export default async function PageProduit({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!estLangue(lang)) notFound();

  const produit = await trouverProduit(slug);
  if (!produit) notFound();

  const dict = dictionnaires[lang];
  const devise = await lireDevise(lang);
  const paysChoisi = await lirePays();

  // Pays où ce produit est vendu : les pays ouverts, et pour un produit physique
  // seulement ceux où l'on livre.
  const physique = produit.type === "physique";
  const actifs: string[] = paysActifs();
  const codes = physique && produit.paysLivraison ? produit.paysLivraison.filter((c) => actifs.includes(c)) : actifs;
  const options = optionsPays(codes, lang);
  const paysParDefaut = codes.includes(paysChoisi) ? paysChoisi : (codes[0] ?? "");

  const note = `${physique ? dict.produit.livraisonPays : dict.produit.disponible} ${options.map((o) => o.nom).join(", ")}`;

  return (
    <div className="conteneur">
      <div className="detail">
        <Visuel produit={produit} lang={lang} className="grand-visuel" />
        <div>
          <span className={`etiquette ${produit.type}`}>{dict.types[produit.type]}</span>
          <h1>{produit.nom[lang]}</h1>
          <p>{produit.description[lang]}</p>
          <PrixProduit
            produit={produit}
            devise={devise}
            lang={lang}
            libelleIndisponible={dict.produit.prixIndisponible}
          />
          {/* Pas de bouton tant que le prix n'est pas saisi dans la devise du pays choisi. */}
          {options.length > 0 && produit.prix[devise] !== undefined && (
            <BoutonAchat
              slug={produit.slug}
              lang={lang}
              physique={physique}
              pays={options}
              paysParDefaut={paysParDefaut}
              libelleAcheter={dict.produit.acheter}
              textes={dict.achat}
            />
          )}
          {options.length > 0 && <p className="livraison">{note}</p>}
          <ul>
            {produit.points[lang].map((pt) => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
