import type { Traduire } from '@/i18n';
import { grouperMilliers, formaterMontant } from './monnaie';
import type { Devise, Langue, Unite } from './types';

/** « 834 FCFA », « 10 pages », « 30 min ». */
export function formaterQuantite(valeur: number, unite: Unite | null, devise: Devise, langue: Langue, t: Traduire): string {
  if (unite === 'argent') return formaterMontant(valeur, devise, langue);
  const nombre = grouperMilliers(valeur, langue, Number.isInteger(valeur) ? 0 : 1);
  if (unite === 'minutes') return t('unite.minutes_court', { nombre });
  if (!unite) return nombre;
  return `${nombre} ${t(`unite.${unite}`)}`;
}

/** Date AAAA-MM-JJ lisible (« lun. 3 nov. »), sans dépendre du fuseau de l'appareil. */
export function formaterDate(date: string, langue: Langue, options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  const d = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat(langue === 'fr' ? 'fr-FR' : 'en-GB', { ...options, timeZone: 'UTC' }).format(d);
}
