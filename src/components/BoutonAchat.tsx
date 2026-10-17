"use client";

import { useState } from "react";
import type { Dictionnaire, Lang } from "@/lib/i18n";

type Props = {
  slug: string;
  lang: Lang;
  physique: boolean;
  // Pays où ce produit est vendu (déjà filtrés côté serveur), et pays présélectionné.
  pays: { code: string; nom: string }[];
  paysParDefaut: string;
  libelleAcheter: string;
  textes: Dictionnaire["achat"];
};

export default function BoutonAchat({ slug, lang, physique, pays, paysParDefaut, libelleAcheter, textes }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState("");

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setEnCours(true);

    const champs = Object.fromEntries(new FormData(e.currentTarget).entries());

    try {
      // Le serveur déduit la devise du pays et relit le prix dans la base.
      const reponse = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...champs, slug, lang }),
      });
      const json = await reponse.json().catch(() => null);

      if (reponse.ok && typeof json?.lien === "string") {
        window.location.href = json.lien; // page de paiement CinetPay
        return;
      }
      setMessage(json?.erreur === "pays_non_livre" ? textes.erreurPays : textes.erreur);
    } catch {
      setMessage(textes.erreur);
    }
    setEnCours(false);
  }

  if (!ouvert) {
    return (
      <button className="bouton" type="button" onClick={() => setOuvert(true)}>
        {libelleAcheter}
      </button>
    );
  }

  return (
    <form className="formulaire-achat" onSubmit={envoyer}>
      <label>
        {textes.nom}
        <input name="nom" type="text" required maxLength={120} autoComplete="name" />
      </label>
      <label>
        {textes.email}
        <input name="email" type="email" required maxLength={200} autoComplete="email" />
      </label>
      <label>
        {textes.pays}
        <select name="pays" required defaultValue={paysParDefaut}>
          {pays.map((p) => (
            <option key={p.code} value={p.code}>
              {p.nom}
            </option>
          ))}
        </select>
      </label>
      <label>
        {textes.telephone}
        <input name="telephone" type="tel" required={physique} maxLength={30} autoComplete="tel" />
      </label>

      {physique && (
        <label>
          {textes.adresse}
          <textarea name="adresse" required maxLength={300} rows={3} />
        </label>
      )}

      {message && (
        <p className="erreur-achat" role="alert">
          {message}
        </p>
      )}

      <div className="actions-achat">
        <button className="bouton" type="submit" disabled={enCours}>
          {enCours ? textes.enCours : textes.payer}
        </button>
        <button className="lien-annuler" type="button" onClick={() => setOuvert(false)} disabled={enCours}>
          {textes.annuler}
        </button>
      </div>
    </form>
  );
}
