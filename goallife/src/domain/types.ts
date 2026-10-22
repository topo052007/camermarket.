// Types métier partagés. Ils reflètent les tables de supabase/migrations.

export const CATEGORIES = [
  'finances',
  'sante',
  'lecture',
  'etudes',
  'carriere',
  'activite',
  'spiritualite',
  'maison',
  'habitudes',
  'autre',
] as const;
export type CodeCategorie = (typeof CATEGORIES)[number];

// Catégories dont le contenu ne doit pas apparaître sur l'écran verrouillé par défaut.
export const CATEGORIES_SENSIBLES: readonly CodeCategorie[] = ['spiritualite', 'sante'];

export const UNITES = ['argent', 'pages', 'minutes', 'seances', 'candidatures', 'chapitres', 'fois'] as const;
export type Unite = (typeof UNITES)[number];

export type TypeObjectif = 'quantitatif' | 'recurrent' | 'echeance';
export type StatutObjectif = 'actif' | 'en_pause' | 'termine' | 'abandonne';
export type StatutAction = 'a_faire' | 'terminee' | 'reportee' | 'ignoree' | 'annulee';
export type SourcePlan = 'regles' | 'ia' | 'manuel';
export type Langue = 'fr' | 'en';
export type Devise = 'XAF' | 'XOF' | 'EUR' | 'USD';
export type Offre = 'gratuit' | 'premium';

/** Date du calendrier de l'utilisateur, au format AAAA-MM-JJ (sans heure). */
export type DateLocale = string;

export type Objectif = {
  id: string;
  user_id: string;
  titre: string;
  description: string | null;
  categorie: CodeCategorie;
  type: TypeObjectif;
  statut: StatutObjectif;
  priorite: 1 | 2 | 3;
  date_debut: DateLocale;
  date_echeance: DateLocale | null;
  valeur_cible: number | null;
  valeur_initiale: number;
  unite: Unite | null;
  minutes_par_seance: number | null;
  rappel_actif: boolean;
  rappel_heure: string | null; // HH:MM
  source_plan: SourcePlan;
  cree_le: string;
  modifie_le: string;
};

export type Etape = {
  id: string;
  objectif_id: string;
  titre: string;
  ordre: number;
  date_cible: DateLocale | null;
  valeur_cible: number | null;
  terminee_le: string | null;
};

export type Recurrence = {
  id: string;
  objectif_id: string;
  titre: string;
  jours_semaine: number[]; // 1 = lundi … 7 = dimanche
  quantite: number | null;
  minutes: number | null;
  date_debut: DateLocale;
  date_fin: DateLocale | null;
  active: boolean;
};

export type Action = {
  id: string;
  user_id: string;
  objectif_id: string;
  etape_id: string | null;
  recurrence_id: string | null;
  titre: string;
  date_prevue: DateLocale;
  quantite_prevue: number | null;
  minutes_prevues: number | null;
  statut: StatutAction;
  quantite_realisee: number | null;
  terminee_le: string | null;
  raison: string | null;
  modifie_le: string;
};

export type EvenementProgression = {
  id: string;
  objectif_id: string;
  action_id: string | null;
  type: 'contribution' | 'jalon_atteint' | 'plan_ajuste' | 'reprise';
  valeur: number | null;
  note: string | null;
  date_evenement: DateLocale;
  cree_le: string;
};

export type Profil = {
  id: string;
  prenom: string | null;
  langue: Langue;
  fuseau_horaire: string;
  devise: Devise;
  minutes_par_jour: number | null;
  domaines: CodeCategorie[];
  module_spiritualite: boolean;
  onboarding_termine_le: string | null;
};

export type PreferencesNotifications = {
  user_id: string;
  actives: boolean;
  heure_resume: string | null; // HH:MM, rappel quotidien général
  jours: number[]; // jours où le rappel général est envoyé
  silence_debut: string | null; // HH:MM
  silence_fin: string | null; // HH:MM
  discretes: boolean; // masque le contenu de toutes les notifications
  bilan_hebdomadaire: boolean;
};

export type Abonnement = {
  user_id: string;
  offre: Offre;
  statut: 'actif' | 'essai' | 'expire' | 'annule';
  plateforme: 'aucune' | 'google_play' | 'app_store' | 'manuel';
  expire_le: string | null;
};
