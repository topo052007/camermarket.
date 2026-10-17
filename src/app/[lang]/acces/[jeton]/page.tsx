// Page d'accès personnelle : le client y retrouve ses téléchargements et sa formation.
// L'adresse contient un jeton secret (reçu par e-mail) : pas besoin de compte.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { chargerAcces } from "@/lib/acces";
import { dictionnaires, estLangue } from "@/lib/i18n";

// Cette page ne doit jamais apparaître dans Google.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PageAcces({
  params,
}: {
  params: Promise<{ lang: string; jeton: string }>;
}) {
  const { lang, jeton } = await params;
  if (!estLangue(lang)) notFound();

  const acces = await chargerAcces(jeton);
  if (!acces) notFound();

  const t = dictionnaires[lang].acces;
  const choisir = (fr: string, en: string) => (lang === "fr" ? fr : en);

  return (
    <section className="section">
      <div className="conteneur acces">
        <h1>{t.titre}</h1>
        <p className="note-acces">{t.garder}</p>

        {acces.produits.map((produit) => (
          <article key={produit.slug} className="carte-acces">
            <h2>{choisir(produit.nom_fr, produit.nom_en)}</h2>

            {produit.type === "digital" && (
              <a className="bouton" href={`/api/telechargement/${jeton}/${produit.slug}`}>
                {t.telecharger}
              </a>
            )}

            {produit.type === "formation" && (
              <div className="formation">
                <h3>{t.formation}</h3>
                {produit.modules.map((module) => (
                  <div key={module.id} className="module">
                    <h4>{choisir(module.titre_fr, module.titre_en)}</h4>
                    <ul>
                      {module.lecons.map((lecon) => {
                        const contenu = choisir(lecon.contenu_fr ?? "", lecon.contenu_en ?? "");
                        return (
                          <li key={lecon.id} className="lecon">
                            <strong>{choisir(lecon.titre_fr, lecon.titre_en)}</strong>
                            {contenu && <p className="contenu-lecon">{contenu}</p>}
                            {lecon.video_url && /^https:\/\//.test(lecon.video_url) && (
                              <a
                                className="lien-lecon"
                                href={lecon.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {t.lecon}
                              </a>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {produit.type === "physique" && <p>{t.physique}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
