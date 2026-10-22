import { ajouterJours, dateLocale, debutSemaine, ecartJours, estDateValide, heureLocale, jourSemaine, minutesDepuisMinuit } from '../dates';
import { datesOccurrences, joursParDefaut } from '../recurrence';

describe('dates et fuseaux horaires', () => {
  // 23 h 30 UTC le 31 décembre
  const instant = new Date('2026-12-31T23:30:00Z');

  it('Douala (UTC+1) est déjà le 1er janvier', () => {
    expect(dateLocale('Africa/Douala', instant)).toBe('2027-01-01');
    expect(heureLocale('Africa/Douala', instant)).toEqual({ heure: 0, minute: 30 });
  });

  it('Abidjan (UTC+0) est encore le 31 décembre', () => {
    expect(dateLocale('Africa/Abidjan', instant)).toBe('2026-12-31');
  });

  it('calculs de calendrier', () => {
    expect(ajouterJours('2028-02-28', 1)).toBe('2028-02-29');
    expect(ajouterJours('2026-03-01', -1)).toBe('2026-02-28');
    expect(ecartJours('2026-11-02', '2026-12-31')).toBe(59);
    expect(jourSemaine('2026-11-02')).toBe(1); // lundi
    expect(jourSemaine('2026-11-08')).toBe(7); // dimanche
    expect(debutSemaine('2026-11-08')).toBe('2026-11-02');
    expect(estDateValide('2026-02-30')).toBe(false);
    expect(minutesDepuisMinuit('07:30:00')).toBe(450);
    expect(minutesDepuisMinuit('25:00')).toBeNull();
  });

  it('récurrences', () => {
    expect(datesOccurrences([1, 3, 5], '2026-11-02', '2026-11-08')).toEqual(['2026-11-02', '2026-11-04', '2026-11-06']);
    expect(datesOccurrences([], '2026-11-02', '2026-11-08')).toEqual([]);
    expect(joursParDefaut(3)).toEqual([1, 3, 5]);
    expect(joursParDefaut(12)).toHaveLength(7);
  });
});
