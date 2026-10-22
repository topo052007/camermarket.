import type { CleTraduction } from '@/i18n';
import type { CodeCategorie, TypeObjectif, Unite } from './types';

// Catalogue de modèles d'objectifs par domaine. Un modèle ne fait que PRÉ-REMPLIR le
// formulaire : l'utilisateur modifie tout avant de voir son plan. Les modèles spirituels
// ne sont proposés que si l'utilisateur a activé le module, sans privilégier de religion.

export type ModeleObjectif = {
  id: string;
  categorie: CodeCategorie;
  type: TypeObjectif;
  unite: Unite | null;
  cible?: number;
  dureeJours: number | null;
  jours: number[];
  minutes?: number;
  quantiteSeance?: number;
};

const TOUS = [1, 2, 3, 4, 5, 6, 7];
const SEMAINE = [1, 2, 3, 4, 5];

export const MODELES: ModeleObjectif[] = [
  { id: 'epargne_rentree', categorie: 'finances', type: 'quantitatif', unite: 'argent', cible: 100000, dureeJours: 90, jours: TOUS },
  { id: 'epargne_urgence', categorie: 'finances', type: 'quantitatif', unite: 'argent', cible: 50000, dureeJours: 60, jours: TOUS },
  { id: 'sport', categorie: 'sante', type: 'recurrent', unite: null, dureeJours: 30, jours: [1, 3, 5], minutes: 30 },
  { id: 'marche', categorie: 'sante', type: 'recurrent', unite: null, dureeJours: 30, jours: TOUS, minutes: 20 },
  { id: 'eau', categorie: 'sante', type: 'recurrent', unite: 'verres', dureeJours: 30, jours: TOUS, quantiteSeance: 8 },
  { id: 'sommeil', categorie: 'sante', type: 'recurrent', unite: 'heures', dureeJours: 30, jours: TOUS, quantiteSeance: 7 },
  { id: 'livre', categorie: 'lecture', type: 'quantitatif', unite: 'pages', cible: 300, dureeJours: 30, jours: TOUS },
  { id: 'lecture_quotidienne', categorie: 'lecture', type: 'recurrent', unite: 'pages', dureeJours: 30, jours: TOUS, quantiteSeance: 10 },
  { id: 'langue', categorie: 'etudes', type: 'recurrent', unite: null, dureeJours: 60, jours: TOUS, minutes: 15 },
  { id: 'examen', categorie: 'etudes', type: 'echeance', unite: null, dureeJours: 30, jours: [1, 2, 3, 4, 5, 6], minutes: 60 },
  { id: 'candidatures', categorie: 'carriere', type: 'quantitatif', unite: 'candidatures', cible: 20, dureeJours: 28, jours: SEMAINE },
  { id: 'emploi', categorie: 'carriere', type: 'echeance', unite: null, dureeJours: 60, jours: SEMAINE, minutes: 45 },
  { id: 'activite', categorie: 'activite', type: 'echeance', unite: null, dureeJours: 90, jours: [1, 3, 5], minutes: 60 },
  { id: 'ventes', categorie: 'activite', type: 'quantitatif', unite: 'argent', cible: 200000, dureeJours: 30, jours: [1, 2, 3, 4, 5, 6] },
  { id: 'bible', categorie: 'spiritualite', type: 'recurrent', unite: 'chapitres', dureeJours: 30, jours: TOUS, quantiteSeance: 1 },
  { id: 'priere_chretienne', categorie: 'spiritualite', type: 'recurrent', unite: null, dureeJours: 30, jours: TOUS, minutes: 10 },
  { id: 'coran', categorie: 'spiritualite', type: 'recurrent', unite: 'pages', dureeJours: 30, jours: TOUS, quantiteSeance: 2 },
  { id: 'salat', categorie: 'spiritualite', type: 'recurrent', unite: 'fois', dureeJours: 30, jours: TOUS, quantiteSeance: 5 },
  { id: 'gratitude', categorie: 'habitudes', type: 'recurrent', unite: 'fois', dureeJours: 21, jours: TOUS, quantiteSeance: 3 },
  { id: 'reseaux', categorie: 'habitudes', type: 'recurrent', unite: null, dureeJours: 21, jours: TOUS, minutes: 60 },
  { id: 'routine_matin', categorie: 'habitudes', type: 'recurrent', unite: null, dureeJours: 21, jours: TOUS, minutes: 20 },
  { id: 'menage', categorie: 'maison', type: 'recurrent', unite: null, dureeJours: null, jours: [6], minutes: 60 },
  { id: 'famille', categorie: 'maison', type: 'recurrent', unite: null, dureeJours: null, jours: [7], minutes: 60 },
];

export function cleTitreModele(m: ModeleObjectif): CleTraduction {
  return `modele_obj.${m.id}` as CleTraduction;
}

/** Modèles proposés : la spiritualité seulement si le module est activé. */
export function modelesDisponibles(moduleSpiritualite: boolean, categorie?: CodeCategorie): ModeleObjectif[] {
  return MODELES.filter((m) => (moduleSpiritualite || m.categorie !== 'spiritualite') && (!categorie || m.categorie === categorie));
}
