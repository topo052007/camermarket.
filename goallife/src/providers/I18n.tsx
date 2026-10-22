import { getCalendars, getLocales } from 'expo-localization';
import { useMemo } from 'react';
import { ajouterJours, dateLocale } from '@/domain/dates';
import { formaterDate, formaterQuantite } from '@/domain/format';
import type { Devise, Langue, Unite } from '@/domain/types';
import { creerTraducteur, estLangue } from '@/i18n';
import { useProfil } from '@/hooks/donnees';

export function langueAppareil(): Langue {
  const code = getLocales()[0]?.languageCode;
  return estLangue(code) ? code : 'fr';
}

export function fuseauAppareil(): string {
  return getCalendars()[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Africa/Douala';
}

/** Langue, devise, fuseau de l'utilisateur et fonctions de formatage associées. */
export function useI18n() {
  const { data: profil } = useProfil();
  const langue: Langue = profil?.langue ?? langueAppareil();
  const devise: Devise = profil?.devise ?? 'XAF';
  const fuseau = profil?.fuseau_horaire ?? fuseauAppareil();
  return useMemo(() => {
    const t = creerTraducteur(langue);
    return {
      t,
      langue,
      devise,
      fuseau,
      aujourdhui: () => dateLocale(fuseau),
      demain: () => ajouterJours(dateLocale(fuseau), 1),
      quantite: (valeur: number, unite: Unite | null) => formaterQuantite(valeur, unite, devise, langue, t),
      date: (d: string, options?: Intl.DateTimeFormatOptions) => formaterDate(d, langue, options),
    };
  }, [langue, devise, fuseau]);
}
