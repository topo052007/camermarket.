import type { Traduire } from '@/i18n';
import type { Progression } from './progression';
import type { AnalyseRetard } from './reprise';

// « Analyse automatique » du coach quand l'IA n'est pas configurée ou plus disponible.
// Uniquement des règles simples sur les données enregistrées : rien n'est inventé.

export type ResumeObjectif = {
  titre: string;
  progression: Progression;
  retard: AnalyseRetard;
  /** Pourcentage du temps écoulé entre le début et l'échéance (null sans échéance). */
  tempsEcoule: number | null;
};

export function conseilsSansIa(objectifs: ResumeObjectif[], actionsAujourdhui: number, t: Traduire): string[] {
  if (objectifs.length === 0) return [t('coach.regle_aucun_objectif')];
  const conseils: string[] = [];
  if (actionsAujourdhui > 0) conseils.push(t('coach.regle_aujourdhui', { nombre: actionsAujourdhui }));
  for (const o of objectifs) {
    if (o.retard.enRetard) {
      conseils.push(t('coach.regle_retard', { titre: o.titre, nombre: o.retard.manquees }));
      continue;
    }
    const p = o.progression;
    if (p.mode === 'quantite' && o.tempsEcoule != null && p.pourcentage + 10 < o.tempsEcoule) {
      conseils.push(t('coach.regle_rythme', { titre: o.titre, nombre: p.pourcentage, temps: o.tempsEcoule }));
    } else if (p.mode === 'regularite' && p.pourcentage != null && p.prevues >= 3 && p.pourcentage >= 80) {
      conseils.push(t('coach.regle_bravo', { titre: o.titre, nombre: p.pourcentage }));
    }
  }
  if (conseils.length === 0) conseils.push(t('coach.regle_continuer'));
  return conseils;
}
