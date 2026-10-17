// Page où le client arrive après le paiement (via /api/paiement/retour, qui y redirige).
// L'adresse contient ?ref=<identifiant de la commande> : on ne se fie à rien d'autre, on
// revérifie le paiement auprès de CinetPay avant d'afficher le résultat.

import Link from "next/link";
import { notFound } from "next/navigation";
import { jetonDeLaCommande } from "@/lib/acces";
import { dictionnaires, estLangue } from "@/lib/i18n";
import { confirmerPaiement } from "@/lib/paiement";

export default async function RetourPaiement({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const { lang } = await params;
  if (!estLangue(lang)) notFound();

  const { ref } = await searchParams;
  const reference = typeof ref === "string" ? ref : "";
  if (!reference) notFound();

  const textes = dictionnaires[lang].retour;
  const resultat = await confirmerPaiement(reference);
  if (resultat === "introuvable") notFound();

  const [titre, texte] =
    resultat === "payee"
      ? [textes.titreOk, textes.texteOk]
      : resultat === "en_attente"
        ? [textes.titreAttente, textes.texteAttente]
        : [textes.titreEchec, textes.texteEchec];

  // Paiement confirmé : on propose l'accès tout de suite, au cas où l'e-mail tarde ou n'arrive pas.
  const jeton = resultat === "payee" ? await jetonDeLaCommande(reference) : null;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const lienAcces = jeton ? `${site}/${lang}/acces/${jeton}` : null;

  return (
    <section className="section">
      <div className="conteneur retour">
        <h1>{titre}</h1>
        <p>{texte}</p>

        {jeton && lienAcces ? (
          <div className="actions-retour">
            <Link href={`/${lang}/acces/${jeton}`} className="bouton">
              {textes.voirAchat}
            </Link>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(lienAcces)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bouton secondaire"
            >
              {textes.whatsapp}
            </a>
          </div>
        ) : (
          <Link href={`/${lang}/produits`} className="bouton">
            {textes.versBoutique}
          </Link>
        )}
      </div>
    </section>
  );
}
