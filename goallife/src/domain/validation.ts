import { z } from 'zod';
import { estDateValide } from './dates';
import { CATEGORIES, UNITES } from './types';

// Schémas de validation côté application. La base revalide tout (contraintes SQL + RLS).
// Les messages sont des clés de traduction.

const date = z.string().refine(estDateValide, 'validation.date');
const heure = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'validation.heure');

export const schemaEmail = z.string().trim().toLowerCase().email('validation.email');
export const schemaMotDePasse = z.string().min(8, 'validation.mot_de_passe');

export const schemaObjectif = z
  .object({
    titre: z.string().trim().min(3, 'validation.titre_court').max(120, 'validation.titre_long'),
    description: z.string().trim().max(1000, 'validation.trop_long').nullable(),
    categorie: z.enum(CATEGORIES),
    type: z.enum(['quantitatif', 'recurrent', 'echeance']),
    priorite: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    dateDebut: date,
    dateEcheance: date.nullable(),
    valeurCible: z.number().positive('validation.positif').max(1e12).nullable(),
    valeurInitiale: z.number().min(0, 'validation.positif').max(1e12),
    unite: z.enum(UNITES).nullable(),
    jours: z.array(z.number().int().min(1).max(7)).min(1, 'validation.jours'),
    minutesParSeance: z.number().int().min(1).max(600).nullable(),
    quantiteParSeance: z.number().positive().max(1e9).nullable(),
    rappelActif: z.boolean(),
    rappelHeure: heure.nullable(),
  })
  .superRefine((o, ctx) => {
    if (o.dateEcheance && o.dateEcheance < o.dateDebut) {
      ctx.addIssue({ code: 'custom', path: ['dateEcheance'], message: 'validation.echeance_avant_debut' });
    }
    if (o.type === 'quantitatif') {
      if (o.valeurCible == null) ctx.addIssue({ code: 'custom', path: ['valeurCible'], message: 'validation.cible_requise' });
      if (!o.dateEcheance) ctx.addIssue({ code: 'custom', path: ['dateEcheance'], message: 'validation.echeance_requise' });
      if (!o.unite) ctx.addIssue({ code: 'custom', path: ['unite'], message: 'validation.unite_requise' });
      if (o.valeurCible != null && o.valeurInitiale >= o.valeurCible) {
        ctx.addIssue({ code: 'custom', path: ['valeurInitiale'], message: 'validation.deja_atteint' });
      }
    }
    if (o.type === 'recurrent' && !o.quantiteParSeance && !o.minutesParSeance) {
      ctx.addIssue({ code: 'custom', path: ['minutesParSeance'], message: 'validation.mesure_seance' });
    }
    if (o.rappelActif && !o.rappelHeure) {
      ctx.addIssue({ code: 'custom', path: ['rappelHeure'], message: 'validation.heure' });
    }
  });

export type SaisieObjectif = z.infer<typeof schemaObjectif>;

/** Lit un nombre saisi au clavier : « 50 000 », « 50000 », « 12,5 ». */
export function lireNombre(texte: string): number | null {
  const propre = texte.replace(/[\s  ]/g, '').replace(',', '.');
  if (propre === '') return null;
  const n = Number(propre);
  return Number.isFinite(n) ? n : null;
}

/** Premier message d'erreur par champ, pour l'affichage sous chaque champ. */
export function erreursParChamp(erreur: z.ZodError): Record<string, string> {
  const resultat: Record<string, string> = {};
  for (const issue of erreur.issues) {
    const champ = String(issue.path[0] ?? '_');
    if (!resultat[champ]) resultat[champ] = issue.message;
  }
  return resultat;
}

/** Plan renvoyé par le serveur (IA) : revalidé avant affichage. */
export const schemaPlanPropose = z.object({
  source: z.literal('ia'),
  etapes: z
    .array(z.object({ titre: z.string().trim().min(1).max(160), dateCible: date.nullable(), valeurCible: z.number().positive().nullable() }))
    .max(12),
  recurrences: z
    .array(
      z.object({
        titre: z.string().trim().min(1).max(160),
        joursSemaine: z.array(z.number().int().min(1).max(7)).min(1),
        quantite: z.number().positive().nullable(),
        minutes: z.number().int().min(1).max(600).nullable(),
        dateDebut: date,
        dateFin: date.nullable(),
      }),
    )
    .min(1)
    .max(3),
  explications: z.array(z.object({ texte: z.string().max(500) })).max(6),
});
