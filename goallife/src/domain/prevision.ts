import { ajouterJours, ecartJours } from './dates';
import type { DateLocale, EvenementProgression } from './types';

// Prévision pour un objectif chiffré : au rythme des contributions récentes, quand la cible
// serait-elle atteinte ? C'est une ESTIMATION, affichée comme telle, jamais une promesse.

export const FENETRE_PREVISION = 14;

export type Prevision =
  | { etat: 'pas_assez_de_donnees' }
  | { etat: 'atteint' }
  | { etat: 'estimee'; rythmeParJour: number; dateEstimee: DateLocale; avance: number | null };

export function prevoirAtteinte(
  objectif: { valeur_cible: number; valeur_initiale: number; date_debut: DateLocale; date_echeance: DateLocale | null },
  evenements: Pick<EvenementProgression, 'type' | 'valeur' | 'date_evenement'>[],
  aujourdHui: DateLocale,
): Prevision {
  const contributions = evenements.filter((e) => e.type === 'contribution' && e.valeur != null);
  const atteint = objectif.valeur_initiale + contributions.reduce((s, e) => s + (e.valeur ?? 0), 0);
  const reste = objectif.valeur_cible - atteint;
  if (reste <= 0) return { etat: 'atteint' };

  // Fenêtre : les 14 derniers jours, ou depuis le début si l'objectif est plus récent.
  const jours = Math.min(FENETRE_PREVISION, ecartJours(objectif.date_debut, aujourdHui) + 1);
  if (jours < 3) return { etat: 'pas_assez_de_donnees' };
  const debutFenetre = ajouterJours(aujourdHui, -(jours - 1));
  const recentes = contributions.filter((e) => ecartJours(debutFenetre, e.date_evenement) >= 0 && ecartJours(e.date_evenement, aujourdHui) >= 0);
  const somme = recentes.reduce((s, e) => s + (e.valeur ?? 0), 0);
  if (somme <= 0) return { etat: 'pas_assez_de_donnees' };

  const rythmeParJour = somme / jours;
  const dateEstimee = ajouterJours(aujourdHui, Math.ceil(reste / rythmeParJour));
  // Positif : en avance de N jours sur l'échéance ; négatif : en retard.
  const avance = objectif.date_echeance ? ecartJours(dateEstimee, objectif.date_echeance) : null;
  return { etat: 'estimee', rythmeParJour, dateEstimee, avance };
}
