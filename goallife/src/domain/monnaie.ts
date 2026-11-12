import type { Devise, Langue } from './types';

const SYMBOLES: Record<Devise, string> = { XAF: 'FCFA', XOF: 'FCFA', EUR: '€', USD: '$' };
const DECIMALES: Record<Devise, number> = { XAF: 0, XOF: 0, EUR: 2, USD: 2 };

/** Groupe les milliers sans dépendre d'Intl (rendu identique sur tous les Android). */
export function grouperMilliers(valeur: number, langue: Langue, decimales = 0): string {
  const fixe = Math.abs(valeur).toFixed(decimales);
  const [entier = '0', dec] = fixe.split('.');
  const separateur = langue === 'fr' ? ' ' : ',';
  const groupe = entier.replace(/\B(?=(\d{3})+(?!\d))/g, separateur);
  const signe = valeur < 0 ? '-' : '';
  const virgule = langue === 'fr' ? ',' : '.';
  return dec && Number(dec) !== 0 ? `${signe}${groupe}${virgule}${dec}` : `${signe}${groupe}`;
}

export function formaterMontant(valeur: number, devise: Devise, langue: Langue): string {
  const nombre = grouperMilliers(valeur, langue, DECIMALES[devise]);
  if (devise === 'USD' && langue === 'en') return `$${nombre}`;
  return `${nombre} ${SYMBOLES[devise]}`;
}
