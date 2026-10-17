"use client";

// Page affichée quand un produit ou une adresse n'existe pas.
// Composant client : Next.js ne transmet pas la langue aux pages « introuvable ».

import Link from "next/link";
import { useParams } from "next/navigation";
import { dictionnaires, estLangue, langueParDefaut } from "@/lib/i18n";

export default function Introuvable() {
  const { lang: valeur } = useParams<{ lang: string }>();
  const lang = estLangue(valeur) ? valeur : langueParDefaut;
  const dict = dictionnaires[lang];

  return (
    <section className="section">
      <div className="conteneur">
        <h2>{dict.introuvable.titre}</h2>
        <p>{dict.introuvable.texte}</p>
        <Link href={`/${lang}`} className="bouton">
          {dict.introuvable.retour}
        </Link>
      </div>
    </section>
  );
}
