import type { Langue } from '@/domain/types';
import { en } from './en';
import { fr } from './fr';

// Tous les textes visibles passent par ici. Le français fait référence :
// une clé absente de en.ts provoque une erreur TypeScript.

export type CleTraduction = keyof typeof fr;
export type Dictionnaire = Record<CleTraduction, string>;
export type Traduire = (cle: CleTraduction, params?: Record<string, string | number>) => string;

const DICTIONNAIRES: Record<Langue, Dictionnaire> = { fr, en };

export const LANGUES: Langue[] = ['fr', 'en'];

export function estLangue(valeur: unknown): valeur is Langue {
  return valeur === 'fr' || valeur === 'en';
}

export function creerTraducteur(langue: Langue): Traduire {
  const dico = DICTIONNAIRES[langue];
  return (cle, params) => {
    const modele = dico[cle] ?? fr[cle] ?? cle;
    if (!params) return modele;
    return modele.replace(/\{(\w+)\}/g, (tout, nom: string) => (nom in params ? String(params[nom]) : tout));
  };
}

/** Pour un message d'erreur venant d'un schéma (chaîne) : traduit si c'est une clé connue. */
export function traduireSiCle(t: Traduire, texte: string): string {
  return texte in fr ? t(texte as CleTraduction) : texte;
}
