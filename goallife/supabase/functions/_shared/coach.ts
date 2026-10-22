import { z } from 'zod';

// Logique du coach, sans accès réseau (testée dans coach_test.ts).

export type Langue = 'fr' | 'en';

export type ObjectifContexte = {
  titre: string;
  categorie: string;
  type: string;
  statut: string;
  valeur_cible: number | null;
  valeur_initiale: number;
  unite: string | null;
  date_debut: string;
  date_echeance: string | null;
  contributions: number;
  actions_faites_14j: number;
  actions_prevues_14j: number;
};

export function promptSysteme(langue: Langue): string {
  const commun = `Tu es « Mon Coach », coach d'organisation personnelle dans une application mobile utilisée surtout en Afrique (Cameroun d'abord).
Règles :
- Réponds en ${langue === 'fr' ? 'français' : 'anglais'}, en 120 mots maximum, avec des phrases simples.
- Sois respectueux, encourageant, jamais culpabilisant. Pas de honte, pas de pression excessive.
- Distingue clairement : ce qui est ENREGISTRÉ (les chiffres fournis), tes ESTIMATIONS, et tes SUGGESTIONS.
- N'invente jamais de progrès ni de données. Si une information manque, dis-le.
- Ne garantis jamais qu'un objectif sera atteint.
- Pas de diagnostic médical, pas de changement de traitement, pas de conseil financier réglementé (placements, crédits). Oriente vers un professionnel si besoin.
- Ne propose pas d'appliquer toi-même des changements : l'utilisateur garde le contrôle et les applique dans l'application.
- Ne présume jamais de la religion de l'utilisateur.`;
  return commun;
}

/** Contexte minimal : pas de nom, pas d'e-mail, pas de description libre. */
export function construireContexte(objectifs: ObjectifContexte[], aujourdhui: string, partage: boolean): string {
  if (!partage) return `Date du jour : ${aujourdhui}. L'utilisateur a choisi de ne pas partager ses objectifs : réponds de façon générale.`;
  if (objectifs.length === 0) return `Date du jour : ${aujourdhui}. Aucun objectif enregistré pour l'instant.`;
  const lignes = objectifs.slice(0, 10).map((o) => {
    const parts = [`- « ${o.titre} » (${o.categorie}, ${o.type}, ${o.statut})`];
    if (o.type === 'quantitatif' && o.valeur_cible) {
      parts.push(`atteint enregistré : ${o.valeur_initiale + o.contributions} / ${o.valeur_cible} ${o.unite ?? ''}`.trim());
    }
    parts.push(`du ${o.date_debut}${o.date_echeance ? ` au ${o.date_echeance}` : ' (sans fin)'}`);
    parts.push(`actions des 14 derniers jours : ${o.actions_faites_14j} faites sur ${o.actions_prevues_14j} prévues`);
    return parts.join(' ; ');
  });
  return `Date du jour : ${aujourdhui}.\nDonnées ENREGISTRÉES par l'utilisateur :\n${lignes.join('\n')}`;
}

// ---------------------------------------------------------------------------
// Plan proposé par l'IA
// ---------------------------------------------------------------------------

export const schemaPlanIa = z.object({
  etapes: z.array(z.object({ titre: z.string(), jours_apres_debut: z.number() })),
  seances: z.array(
    z.object({
      titre: z.string(),
      jours_semaine: z.array(z.number()),
      quantite: z.number().nullable(),
      minutes: z.number().nullable(),
    }),
  ),
  explications: z.array(z.string()),
});
export type PlanIaBrut = z.infer<typeof schemaPlanIa>;

export const schemaSaisieObjectif = z.object({
  titre: z.string().min(1).max(120),
  description: z.string().max(1000).nullable(),
  categorie: z.string().max(30),
  type: z.enum(['quantitatif', 'recurrent', 'echeance']),
  dateDebut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateEcheance: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  valeurCible: z.number().nullable(),
  valeurInitiale: z.number(),
  unite: z.string().max(20).nullable(),
  jours: z.array(z.number().int().min(1).max(7)),
  minutesParSeance: z.number().nullable(),
  quantiteParSeance: z.number().nullable(),
});
export type SaisieObjectif = z.infer<typeof schemaSaisieObjectif>;

export function promptPlan(saisie: SaisieObjectif, minutesParJour: number | null): string {
  return `Propose un plan d'action réaliste pour cet objectif.
Objectif : « ${saisie.titre} » (domaine : ${saisie.categorie}, type : ${saisie.type}).
${saisie.description ? `Motivation : ${saisie.description}\n` : ''}Début : ${saisie.dateDebut}. Fin : ${saisie.dateEcheance ?? 'aucune'}.
${saisie.valeurCible ? `Chiffre à atteindre : ${saisie.valeurCible} ${saisie.unite ?? ''} (déjà : ${saisie.valeurInitiale}).\n` : ''}Jours disponibles (1 = lundi … 7 = dimanche) : ${saisie.jours.join(', ')}.
Temps disponible par jour : ${minutesParJour ?? saisie.minutesParSeance ?? 'non précisé'} minutes.
Contraintes : 2 à 6 étapes ; 1 à 2 séances récurrentes (jours entre 1 et 7) ; quantité par séance seulement pour un chiffre à atteindre ;
minutes entre 5 et 180 ; 2 à 4 explications courtes et honnêtes (pas de promesse de réussite).`;
}

function ajouterJours(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function ecart(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000);
}

/**
 * Transforme la réponse de l'IA en plan applicable, en BORNANT chaque valeur :
 * on ne fait jamais confiance aveuglément au modèle. Renvoie null si inutilisable.
 */
export function convertirPlanIa(brut: PlanIaBrut, saisie: SaisieObjectif) {
  const duree = saisie.dateEcheance ? Math.max(0, ecart(saisie.dateDebut, saisie.dateEcheance)) : 90;
  const texte = (s: string, max: number) => s.replace(/\s+/g, ' ').trim().slice(0, max);
  const etapes = brut.etapes
    .filter((e) => texte(e.titre, 160).length > 0)
    .slice(0, 6)
    .map((e) => ({
      titre: texte(e.titre, 160),
      dateCible: ajouterJours(saisie.dateDebut, Math.min(duree, Math.max(0, Math.round(e.jours_apres_debut)))),
      valeurCible: null,
    }));
  const recurrences = brut.seances
    .map((s) => {
      const jours = [...new Set(s.jours_semaine.map((j) => Math.round(j)).filter((j) => j >= 1 && j <= 7))].sort((a, b) => a - b);
      const minutes = s.minutes == null ? null : Math.min(180, Math.max(5, Math.round(s.minutes)));
      const quantite = saisie.type === 'quantitatif' && s.quantite != null && s.quantite > 0 ? Math.ceil(s.quantite) : null;
      return {
        titre: texte(s.titre, 160),
        joursSemaine: jours,
        quantite,
        minutes: quantite == null && minutes == null ? 30 : minutes,
        dateDebut: saisie.dateDebut,
        dateFin: saisie.dateEcheance,
      };
    })
    .filter((r) => r.titre.length > 0 && r.joursSemaine.length > 0)
    .slice(0, 2);
  if (recurrences.length === 0) return null;
  return {
    source: 'ia' as const,
    etapes,
    recurrences,
    explications: brut.explications.slice(0, 4).map((e) => ({ texte: texte(e, 500) })).filter((e) => e.texte.length > 0),
  };
}
