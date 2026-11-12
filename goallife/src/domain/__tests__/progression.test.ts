import { ajouterJours } from '../dates';
import { calculerProgression, effortRestantParJour, serieActuelle, tendanceHebdomadaire } from '../progression';
import { analyserRetard } from '../reprise';
import type { StatutAction } from '../types';

const action = (date_prevue: string, statut: StatutAction) => ({ date_prevue, statut, terminee_le: statut === 'terminee' ? 'x' : null });
const veille = (d: string) => ajouterJours(d, -1);

describe('progression', () => {
  it('quantitatif : initiale + contributions / cible', () => {
    const p = calculerProgression(
      { type: 'quantitatif', valeur_cible: 50000, valeur_initiale: 5000 },
      { actions: [], etapes: [], evenements: [{ type: 'contribution', valeur: 10000 }, { type: 'reprise', valeur: null }] },
      '2026-11-10',
    );
    expect(p).toEqual({ mode: 'quantite', pourcentage: 30, atteint: 15000, cible: 50000, reste: 35000 });
  });

  it('quantitatif : plafonné à 100 %', () => {
    const p = calculerProgression({ type: 'quantitatif', valeur_cible: 100, valeur_initiale: 0 }, { actions: [], etapes: [], evenements: [{ type: 'contribution', valeur: 150 }] }, '2026-11-10');
    expect(p).toMatchObject({ pourcentage: 100, reste: 0 });
  });

  it('récurrent : régularité, sans compter le futur, les annulées ni les reportées', () => {
    const p = calculerProgression(
      { type: 'recurrent', valeur_cible: null, valeur_initiale: 0 },
      {
        actions: [
          action('2026-11-08', 'terminee'),
          action('2026-11-09', 'ignoree'),
          action('2026-11-09', 'reportee'),
          action('2026-11-10', 'a_faire'),
          action('2026-11-10', 'annulee'),
          action('2026-11-11', 'a_faire'),
        ],
        etapes: [],
        evenements: [],
      },
      '2026-11-10',
    );
    expect(p).toEqual({ mode: 'regularite', pourcentage: 33, terminees: 1, prevues: 3 });
  });

  it('récurrent sans aucune action passée : pas de pourcentage inventé', () => {
    const p = calculerProgression({ type: 'recurrent', valeur_cible: null, valeur_initiale: 0 }, { actions: [], etapes: [], evenements: [] }, '2026-11-10');
    expect(p).toEqual({ mode: 'regularite', pourcentage: null, terminees: 0, prevues: 0 });
  });

  it('projet : étapes terminées / total', () => {
    const p = calculerProgression(
      { type: 'echeance', valeur_cible: null, valeur_initiale: 0 },
      { actions: [], etapes: [{ terminee_le: 'x' }, { terminee_le: null }, { terminee_le: null }, { terminee_le: 'y' }], evenements: [] },
      '2026-11-10',
    );
    expect(p).toEqual({ mode: 'etapes', pourcentage: 50, terminees: 2, total: 4 });
  });

  it('effort restant par jour', () => {
    expect(effortRestantParJour(10000, '2026-11-10', '2026-11-19')).toEqual({ parJour: 1000, joursRestants: 10 });
    expect(effortRestantParJour(0, '2026-11-10', '2026-11-19')).toBeNull();
    expect(effortRestantParJour(100, '2026-11-20', '2026-11-19')).toBeNull();
  });

  it('série : la journée en cours n’est pas encore perdue', () => {
    const jours = new Set(['2026-11-07', '2026-11-08', '2026-11-09']);
    expect(serieActuelle(jours, '2026-11-10', veille)).toBe(3);
    expect(serieActuelle(new Set([...jours, '2026-11-10']), '2026-11-10', veille)).toBe(4);
    expect(serieActuelle(new Set(['2026-11-05']), '2026-11-10', veille)).toBe(0);
  });

  it('tendance hebdomadaire', () => {
    const t = tendanceHebdomadaire(
      [action('2026-11-02', 'terminee'), action('2026-11-03', 'a_faire'), action('2026-11-09', 'terminee')],
      ['2026-11-02', '2026-11-09'],
      '2026-11-10',
    );
    expect(t).toEqual([
      { semaine: '2026-11-02', terminees: 1, prevues: 2 },
      { semaine: '2026-11-09', terminees: 1, prevues: 1 },
    ]);
  });
});

describe('retard et reprise', () => {
  it('propose une reprise après 2 actions manquées', () => {
    const a = analyserRetard([action('2026-11-07', 'a_faire'), action('2026-11-08', 'a_faire'), action('2026-11-06', 'terminee')], '2026-11-10', true);
    expect(a).toEqual({
      manquees: 2,
      joursDepuisDerniereActivite: 4,
      enRetard: true,
      options: ['action_minimale', 'reduire_effort', 'nouveau_planning', 'decaler_echeance'],
    });
  });

  it('une seule action manquée ou une action du jour ne déclenche rien', () => {
    const a = analyserRetard([action('2026-11-09', 'a_faire'), action('2026-11-10', 'a_faire')], '2026-11-10', false);
    expect(a.enRetard).toBe(false);
    expect(a.options).toEqual([]);
  });

  it('les actions trop anciennes (plus de 14 jours) ne comptent pas', () => {
    const a = analyserRetard([action('2026-10-01', 'a_faire'), action('2026-10-02', 'a_faire')], '2026-11-10', false);
    expect(a.manquees).toBe(0);
  });
});
