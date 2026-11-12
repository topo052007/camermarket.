import type { CleTraduction, Traduire } from '@/i18n';
import { ajouterJours, ecartJours } from './dates';
import { datesOccurrences, normaliserJours } from './recurrence';
import type { CodeCategorie, DateLocale, TypeObjectif, Unite } from './types';

// Génération DÉTERMINISTE d'un plan d'action (sans IA).
// Les règles de calcul sont documentées dans docs/progression-et-plans.md.

export type EntreePlan = {
  titre: string;
  categorie: CodeCategorie;
  type: TypeObjectif;
  dateDebut: DateLocale;
  dateEcheance: DateLocale | null;
  valeurCible: number | null;
  valeurInitiale: number;
  unite: Unite | null;
  /** Jours de séance, 1 = lundi … 7 = dimanche. */
  jours: number[];
  minutesParSeance: number | null;
  /** Objectif « récurrent » : quantité fixe à chaque séance (ex. 10 pages). */
  quantiteParSeance: number | null;
};

export type EtapeProposee = {
  titre: string;
  dateCible: DateLocale | null;
  valeurCible: number | null;
};

export type RecurrenceProposee = {
  titre: string;
  joursSemaine: number[];
  quantite: number | null;
  minutes: number | null;
  dateDebut: DateLocale;
  dateFin: DateLocale | null;
};

export type Explication =
  | { cle: CleTraduction; quantite?: number; unite?: Unite | null; nombre?: number }
  /** Texte libre : uniquement pour un plan réellement proposé par l'IA. */
  | { texte: string };

export type PlanPropose = {
  source: 'regles' | 'ia';
  etapes: EtapeProposee[];
  recurrences: RecurrenceProposee[];
  explications: Explication[];
};

export type ResultatPlan = { ok: true; plan: PlanPropose } | { ok: false; erreur: CleTraduction };

export type OutilsTexte = {
  t: Traduire;
  /** Formate une quantité avec son unité (ex. « 834 FCFA », « 10 pages »). */
  quantite: (valeur: number, unite: Unite | null) => string;
};

export function genererPlan(entree: EntreePlan, outils: OutilsTexte): ResultatPlan {
  const jours = normaliserJours(entree.jours);
  if (jours.length === 0) return { ok: false, erreur: 'plan.erreur_jours' };
  if (entree.dateEcheance && ecartJours(entree.dateDebut, entree.dateEcheance) < 0) {
    return { ok: false, erreur: 'plan.erreur_echeance' };
  }
  const e = { ...entree, jours };
  switch (e.type) {
    case 'quantitatif':
      return planQuantitatif(e, outils);
    case 'recurrent':
      return planRecurrent(e, outils);
    case 'echeance':
      return planEcheance(e, outils);
  }
}

/** Arrondi au supérieur, sans erreur de virgule flottante (834,0000001 -> 835 évité). */
function plafond(valeur: number): number {
  return Math.ceil(Math.round(valeur * 1e6) / 1e6);
}

// Le titre ne contient pas la quantité : elle est affichée à part (quantite_prevue),
// ce qui permet d'ajuster le rythme sans renommer les actions.
function titreSeance(e: EntreePlan, t: Traduire): string {
  if (e.unite === 'argent') return t('plan.titre_epargne');
  if (e.unite === 'pages') return t('plan.titre_lecture');
  return e.titre;
}

function planQuantitatif(e: EntreePlan, outils: OutilsTexte): ResultatPlan {
  if (!e.dateEcheance) return { ok: false, erreur: 'plan.erreur_echeance_requise' };
  if (e.valeurCible == null || e.valeurCible <= 0) return { ok: false, erreur: 'plan.erreur_cible' };
  const reste = e.valeurCible - e.valeurInitiale;
  if (reste <= 0) return { ok: false, erreur: 'plan.erreur_deja_atteint' };

  const nbJours = ecartJours(e.dateDebut, e.dateEcheance) + 1;
  const seances = datesOccurrences(e.jours, e.dateDebut, e.dateEcheance);
  if (seances.length === 0) return { ok: false, erreur: 'plan.erreur_aucune_seance' };

  const parJour = plafond(reste / nbJours);
  const parSemaine = plafond((reste * 7) / nbJours);
  const parSeance = plafond(reste / seances.length);

  const explications: Explication[] = [{ cle: 'plan.expl_moyenne_jour', quantite: parJour, unite: e.unite }];
  if (nbJours >= 7) explications.push({ cle: 'plan.expl_moyenne_semaine', quantite: parSemaine, unite: e.unite });
  explications.push({ cle: 'plan.expl_par_seance', quantite: parSeance, unite: e.unite, nombre: seances.length });
  explications.push({ cle: 'plan.expl_souple' });

  const etapes: EtapeProposee[] = [];
  const paliers = nbJours >= 14 ? [0.25, 0.5, 0.75, 1] : [1];
  for (const p of paliers) {
    const valeur = p === 1 ? e.valeurCible : Math.round(e.valeurInitiale + reste * p);
    const date = p === 1 ? e.dateEcheance : ajouterJours(e.dateDebut, Math.round((nbJours - 1) * p));
    etapes.push({
      titre: outils.t('plan.jalon', { quantite: outils.quantite(valeur, e.unite) }),
      dateCible: date,
      valeurCible: valeur,
    });
  }

  return {
    ok: true,
    plan: {
      source: 'regles',
      etapes,
      recurrences: [
        {
          titre: titreSeance(e, outils.t),
          joursSemaine: e.jours,
          quantite: parSeance,
          minutes: e.minutesParSeance,
          dateDebut: e.dateDebut,
          dateFin: e.dateEcheance,
        },
      ],
      explications,
    },
  };
}

function planRecurrent(e: EntreePlan, outils: OutilsTexte): ResultatPlan {
  const quantite = e.quantiteParSeance && e.quantiteParSeance > 0 ? e.quantiteParSeance : null;
  if (!quantite && !e.minutesParSeance) return { ok: false, erreur: 'plan.erreur_mesure_seance' };

  const titre = titreSeance(e, outils.t);

  const explications: Explication[] = [{ cle: 'plan.expl_recurrent', nombre: e.jours.length }];
  const etapes: EtapeProposee[] = [];
  if (e.dateEcheance) {
    const total = datesOccurrences(e.jours, e.dateDebut, e.dateEcheance).length;
    explications.push({ cle: 'plan.expl_total_seances', nombre: total });
    const duree = ecartJours(e.dateDebut, e.dateEcheance);
    if (duree >= 28) {
      etapes.push({ titre: outils.t('plan.bilan_mi_parcours'), dateCible: ajouterJours(e.dateDebut, Math.round(duree / 2)), valeurCible: null });
    }
    etapes.push({ titre: outils.t('plan.bilan_final'), dateCible: e.dateEcheance, valeurCible: null });
  }
  explications.push({ cle: 'plan.expl_repos' });

  return {
    ok: true,
    plan: {
      source: 'regles',
      etapes,
      recurrences: [
        {
          titre,
          joursSemaine: e.jours,
          quantite,
          minutes: e.minutesParSeance,
          dateDebut: e.dateDebut,
          dateFin: e.dateEcheance,
        },
      ],
      explications,
    },
  };
}

const MODELES_ETAPES: Partial<Record<CodeCategorie, CleTraduction[]>> = {
  carriere: ['modele.carriere_1', 'modele.carriere_2', 'modele.carriere_3', 'modele.carriere_4'],
  activite: ['modele.activite_1', 'modele.activite_2', 'modele.activite_3', 'modele.activite_4'],
  etudes: ['modele.etudes_1', 'modele.etudes_2', 'modele.etudes_3', 'modele.etudes_4'],
};
const MODELE_DEFAUT: CleTraduction[] = ['modele.defaut_1', 'modele.defaut_2', 'modele.defaut_3', 'modele.defaut_4'];

function planEcheance(e: EntreePlan, outils: OutilsTexte): ResultatPlan {
  const modele = MODELES_ETAPES[e.categorie] ?? MODELE_DEFAUT;
  // Sans échéance, on propose une étape par semaine.
  const duree = e.dateEcheance ? ecartJours(e.dateDebut, e.dateEcheance) : modele.length * 7;
  const etapes = modele.map((cle, i) => ({
    titre: outils.t(cle),
    dateCible: ajouterJours(e.dateDebut, Math.round((duree * (i + 1)) / modele.length)),
    valeurCible: null,
  }));
  const minutes = e.minutesParSeance ?? 30;
  return {
    ok: true,
    plan: {
      source: 'regles',
      etapes,
      recurrences: [
        {
          titre: outils.t('plan.titre_avancer', { titre: e.titre }),
          joursSemaine: e.jours,
          quantite: null,
          minutes,
          dateDebut: e.dateDebut,
          dateFin: e.dateEcheance,
        },
      ],
      explications: [{ cle: 'plan.expl_etapes', nombre: etapes.length }, { cle: 'plan.expl_modifiable' }],
    },
  };
}
