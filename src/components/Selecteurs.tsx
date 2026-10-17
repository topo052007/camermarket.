"use client";

import { usePathname, useRouter } from "next/navigation";
import { Lang, langues } from "@/lib/i18n";
import { nomCookiePays } from "@/lib/pays";

type Props = {
  lang: Lang;
  pays: string;
  optionsPays: { code: string; nom: string }[];
  libelleLangue: string;
  libellePays: string;
};

export default function Selecteurs({ lang, pays, optionsPays, libelleLangue, libellePays }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  function changerLangue(nouvelle: Lang) {
    if (nouvelle === lang) return;
    // Remplace le /fr ou /en au début de l'adresse et garde les filtres éventuels.
    const chemin = pathname.replace(/^\/(fr|en)(?=\/|$)/, `/${nouvelle}`);
    router.push(chemin + window.location.search);
  }

  function changerPays(nouveau: string) {
    document.cookie = `${nomCookiePays}=${nouveau}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="selecteurs">
      <div className="langues" role="group" aria-label={libelleLangue}>
        {langues.map((l) => (
          <button key={l} type="button" aria-pressed={l === lang} onClick={() => changerLangue(l)}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      {optionsPays.length > 1 && (
        <select aria-label={libellePays} value={pays} onChange={(e) => changerPays(e.target.value)}>
          {optionsPays.map((p) => (
            <option key={p.code} value={p.code}>
              {p.nom}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
