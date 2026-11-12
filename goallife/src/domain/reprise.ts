import { ajouterJours, ecartJours } from './dates';
import type { Action, DateLocale } from './types';

// Détection d'un retard et options de reprise, sans culpabiliser.
// Une action « manquée » = encore à faire alors que sa date est passée.

export const SEUIL_RETARD = 2; // à partir de 2 actions manquées, on propose une reprise
export const FENETRE_JOURS = 14; // on ne regarde que les 14 derniers jours

export type OptionReprise = 'action_minimale' | 'reduire_effort' | 'decaler_echeance' | 'nouveau_planning';

export type AnalyseRetard = {
  manquees: number;
  joursDepuisDerniereActivite: number | null;
  enRetard: boolean;
  options: OptionReprise[];
};

export function actionsManquees<T extends Pick<Action, 'statut' | 'date_prevue'>>(actions: T[], aujourdHui: DateLocale): T[] {
  const limite = ajouterJours(aujourdHui, -FENETRE_JOURS);
  return actions.filter(
    (a) => a.statut === 'a_faire' && ecartJours(a.date_prevue, aujourdHui) > 0 && ecartJours(limite, a.date_prevue) >= 0,
  );
}

export function analyserRetard(
  actions: Pick<Action, 'statut' | 'date_prevue' | 'terminee_le'>[],
  aujourdHui: DateLocale,
  aUneEcheance: boolean,
): AnalyseRetard {
  const manquees = actionsManquees(actions, aujourdHui).length;
  const dernieres = actions
    .filter((a) => a.statut === 'terminee')
    .map((a) => a.date_prevue)
    .sort();
  const derniere = dernieres[dernieres.length - 1];
  const joursDepuisDerniereActivite = derniere ? ecartJours(derniere, aujourdHui) : null;
  const enRetard = manquees >= SEUIL_RETARD;
  const options: OptionReprise[] = enRetard ? ['action_minimale', 'reduire_effort', 'nouveau_planning'] : [];
  if (enRetard && aUneEcheance) options.push('decaler_echeance');
  return { manquees, joursDepuisDerniereActivite, enRetard, options };
}
