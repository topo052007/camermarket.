import { ajouterJours, ecartJours, jourSemaine } from './dates';
import type { DateLocale } from './types';

/** Jours proposés par défaut pour N séances par semaine (1 = lundi). */
export function joursParDefaut(foisParSemaine: number): number[] {
  const n = Math.min(7, Math.max(1, Math.round(foisParSemaine)));
  const table: Record<number, number[]> = {
    1: [6],
    2: [2, 5],
    3: [1, 3, 5],
    4: [1, 2, 4, 6],
    5: [1, 2, 3, 4, 5],
    6: [1, 2, 3, 4, 5, 6],
    7: [1, 2, 3, 4, 5, 6, 7],
  };
  return table[n] ?? [1, 2, 3, 4, 5, 6, 7];
}

export function normaliserJours(jours: number[]): number[] {
  return [...new Set(jours.filter((j) => Number.isInteger(j) && j >= 1 && j <= 7))].sort((a, b) => a - b);
}

/**
 * Dates des occurrences entre `debut` et `fin` (incluses) pour les jours donnés.
 * Même règle que la fonction SQL `generer_actions_jusqu_au` : les deux doivent rester alignées.
 */
export function datesOccurrences(jours: number[], debut: DateLocale, fin: DateLocale): DateLocale[] {
  const choisis = new Set(normaliserJours(jours));
  if (choisis.size === 0) return [];
  const n = ecartJours(debut, fin);
  const dates: DateLocale[] = [];
  for (let i = 0; i <= n; i++) {
    const d = ajouterJours(debut, i);
    if (choisis.has(jourSemaine(d))) dates.push(d);
  }
  return dates;
}
