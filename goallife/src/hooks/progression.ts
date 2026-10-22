import type { ObjectifResume } from '@/data/objectifs';
import { ecartJours } from '@/domain/dates';
import { calculerProgression, type Progression } from '@/domain/progression';
import { analyserRetard } from '@/domain/reprise';

/** Progression, retard et part du temps écoulé d'un objectif (calculés sur les données réelles). */
export function resumeObjectif(o: ObjectifResume, aujourdHui: string) {
  const progression: Progression = calculerProgression(
    o,
    { actions: o.actions, etapes: o.etapes, evenements: o.evenements_progression },
    aujourdHui,
  );
  const retard = analyserRetard(o.actions, aujourdHui, Boolean(o.date_echeance));
  let tempsEcoule: number | null = null;
  if (o.date_echeance) {
    const total = ecartJours(o.date_debut, o.date_echeance) + 1;
    const ecoule = Math.min(total, Math.max(0, ecartJours(o.date_debut, aujourdHui) + 1));
    tempsEcoule = Math.round((ecoule / total) * 100);
  }
  return { progression, retard, tempsEcoule };
}
