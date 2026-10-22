import { ecartJours } from './dates';
import type { Action, DateLocale, Etape, EvenementProgression, Objectif } from './types';

// Règles de calcul de la progression (documentées dans docs/progression-et-plans.md).
//
// - quantitatif : (valeur initiale + somme des contributions) / valeur cible.
// - récurrent   : PAS de pourcentage d'avancement. On affiche la régularité :
//                 actions terminées / actions prévues dont la date est passée ou aujourd'hui.
// - échéance    : étapes terminées / étapes totales (s'il y a des étapes).
// Les actions annulées ne comptent jamais. Les actions reportées comptent à leur nouvelle date
// (le report crée une nouvelle action), l'ancienne ne compte plus.

export type Progression =
  | { mode: 'quantite'; pourcentage: number; atteint: number; cible: number; reste: number }
  | { mode: 'regularite'; pourcentage: number | null; terminees: number; prevues: number }
  | { mode: 'etapes'; pourcentage: number; terminees: number; total: number }
  | { mode: 'aucun' };

function borner(p: number): number {
  return Math.max(0, Math.min(100, Math.round(p)));
}

export function sommeContributions(evenements: Pick<EvenementProgression, 'type' | 'valeur'>[]): number {
  return evenements.reduce((s, e) => (e.type === 'contribution' && e.valeur != null ? s + e.valeur : s), 0);
}

/** Actions qui comptent dans la régularité : prévues jusqu'à aujourd'hui, ni annulées ni reportées. */
export function actionsComptees<T extends Pick<Action, 'statut' | 'date_prevue'>>(actions: T[], aujourdHui: DateLocale): T[] {
  return actions.filter(
    (a) => a.statut !== 'annulee' && a.statut !== 'reportee' && ecartJours(a.date_prevue, aujourdHui) >= 0,
  );
}

export function calculerProgression(
  objectif: Pick<Objectif, 'type' | 'valeur_cible' | 'valeur_initiale'>,
  donnees: {
    actions: Pick<Action, 'statut' | 'date_prevue'>[];
    etapes: Pick<Etape, 'terminee_le'>[];
    evenements: Pick<EvenementProgression, 'type' | 'valeur'>[];
  },
  aujourdHui: DateLocale,
): Progression {
  if (objectif.type === 'quantitatif' && objectif.valeur_cible && objectif.valeur_cible > 0) {
    const atteint = objectif.valeur_initiale + sommeContributions(donnees.evenements);
    return {
      mode: 'quantite',
      pourcentage: borner((atteint / objectif.valeur_cible) * 100),
      atteint,
      cible: objectif.valeur_cible,
      reste: Math.max(0, objectif.valeur_cible - atteint),
    };
  }
  if (objectif.type === 'echeance' && donnees.etapes.length > 0) {
    const terminees = donnees.etapes.filter((e) => e.terminee_le).length;
    return {
      mode: 'etapes',
      pourcentage: borner((terminees / donnees.etapes.length) * 100),
      terminees,
      total: donnees.etapes.length,
    };
  }
  const comptees = actionsComptees(donnees.actions, aujourdHui);
  if (objectif.type === 'recurrent' || comptees.length > 0) {
    const terminees = comptees.filter((a) => a.statut === 'terminee').length;
    return {
      mode: 'regularite',
      pourcentage: comptees.length > 0 ? borner((terminees / comptees.length) * 100) : null,
      terminees,
      prevues: comptees.length,
    };
  }
  return { mode: 'aucun' };
}

/**
 * Effort restant pour un objectif quantitatif : quantité moyenne par jour restant
 * (aujourd'hui compris) pour atteindre la cible à l'échéance. null si non applicable.
 */
export function effortRestantParJour(
  reste: number,
  aujourdHui: DateLocale,
  echeance: DateLocale | null,
): { parJour: number; joursRestants: number } | null {
  if (!echeance || reste <= 0) return null;
  const joursRestants = ecartJours(aujourdHui, echeance) + 1;
  if (joursRestants <= 0) return null;
  return { parJour: Math.ceil(reste / joursRestants), joursRestants };
}

/**
 * Série de jours consécutifs avec au moins une action terminée, en remontant depuis
 * aujourd'hui (ou hier si rien n'est encore fait aujourd'hui : la journée n'est pas finie).
 */
export function serieActuelle(joursAvecActivite: Set<DateLocale>, aujourdHui: DateLocale, veille: (d: DateLocale) => DateLocale): number {
  let jour = joursAvecActivite.has(aujourdHui) ? aujourdHui : veille(aujourdHui);
  let serie = 0;
  while (joursAvecActivite.has(jour)) {
    serie++;
    jour = veille(jour);
  }
  return serie;
}

/** Tendance par semaine : actions terminées / prévues pour chacune des N dernières semaines. */
export function tendanceHebdomadaire(
  actions: Pick<Action, 'statut' | 'date_prevue'>[],
  debutsSemaines: DateLocale[],
  aujourdHui: DateLocale,
): { semaine: DateLocale; terminees: number; prevues: number }[] {
  const comptees = actionsComptees(actions, aujourdHui);
  return debutsSemaines.map((semaine) => {
    const dans = comptees.filter((a) => {
      const ecart = ecartJours(semaine, a.date_prevue);
      return ecart >= 0 && ecart < 7;
    });
    return { semaine, terminees: dans.filter((a) => a.statut === 'terminee').length, prevues: dans.length };
  });
}
