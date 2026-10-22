import type { DateLocale } from './types';

// Toutes les dates « du calendrier » (date prévue d'une action, échéance…) sont des
// chaînes AAAA-MM-JJ exprimées dans le fuseau horaire de l'utilisateur.
// Les calculs se font en UTC pour éviter les décalages d'heure d'été.

const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function estDateValide(valeur: string): boolean {
  if (!FORMAT_DATE.test(valeur)) return false;
  const d = new Date(`${valeur}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valeur;
}

function versUtc(date: DateLocale): Date {
  if (!estDateValide(date)) throw new Error(`Date invalide : ${date}`);
  return new Date(`${date}T00:00:00Z`);
}

function depuisUtc(d: Date): DateLocale {
  return d.toISOString().slice(0, 10);
}

/** Date du jour (AAAA-MM-JJ) dans le fuseau donné, à l'instant donné. */
export function dateLocale(fuseau: string, instant: Date = new Date()): DateLocale {
  const parties = new Intl.DateTimeFormat('en-US', {
    timeZone: fuseau,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const valeur = (type: string) => parties.find((p) => p.type === type)?.value ?? '';
  return `${valeur('year')}-${valeur('month')}-${valeur('day')}`;
}

/** Heure et minute locales dans le fuseau donné. */
export function heureLocale(fuseau: string, instant: Date = new Date()): { heure: number; minute: number } {
  const parties = new Intl.DateTimeFormat('en-US', {
    timeZone: fuseau,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const valeur = (type: string) => Number(parties.find((p) => p.type === type)?.value ?? 0);
  return { heure: valeur('hour') % 24, minute: valeur('minute') };
}

export function ajouterJours(date: DateLocale, jours: number): DateLocale {
  const d = versUtc(date);
  d.setUTCDate(d.getUTCDate() + jours);
  return depuisUtc(d);
}

/** Nombre de jours de `debut` à `fin` (fin - debut). */
export function ecartJours(debut: DateLocale, fin: DateLocale): number {
  return Math.round((versUtc(fin).getTime() - versUtc(debut).getTime()) / 86_400_000);
}

/** Jour de la semaine ISO : 1 = lundi … 7 = dimanche. */
export function jourSemaine(date: DateLocale): number {
  const j = versUtc(date).getUTCDay();
  return j === 0 ? 7 : j;
}

/** Lundi de la semaine contenant `date`. */
export function debutSemaine(date: DateLocale): DateLocale {
  return ajouterJours(date, 1 - jourSemaine(date));
}

/** Liste des dates de `debut` à `fin` incluses. */
export function plageDates(debut: DateLocale, fin: DateLocale): DateLocale[] {
  const n = ecartJours(debut, fin);
  const dates: DateLocale[] = [];
  for (let i = 0; i <= n; i++) dates.push(ajouterJours(debut, i));
  return dates;
}

/** "HH:MM" -> minutes depuis minuit ; null si le format est invalide. */
export function minutesDepuisMinuit(heure: string | null | undefined): number | null {
  if (!heure) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(heure);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function formaterHeure(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
