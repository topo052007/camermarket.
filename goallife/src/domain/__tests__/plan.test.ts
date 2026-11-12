import { ajouterJours } from '../dates';
import { genererPlan, type EntreePlan } from '../plan';
import { outils } from './outils';

const base: EntreePlan = {
  titre: 'Économiser',
  categorie: 'finances',
  type: 'quantitatif',
  dateDebut: '2026-11-02', // lundi
  dateEcheance: ajouterJours('2026-11-02', 59), // 60 jours
  valeurCible: 50000,
  valeurInitiale: 0,
  unite: 'argent',
  jours: [1, 2, 3, 4, 5, 6, 7],
  minutesParSeance: null,
  quantiteParSeance: null,
};

describe('plan quantitatif', () => {
  it('50 000 FCFA en 60 jours : 834 par jour, 5 834 par semaine', () => {
    const r = genererPlan(base, outils);
    if (!r.ok) throw new Error(r.erreur);
    const jour = r.plan.explications.find((e) => 'cle' in e && e.cle === 'plan.expl_moyenne_jour');
    const semaine = r.plan.explications.find((e) => 'cle' in e && e.cle === 'plan.expl_moyenne_semaine');
    expect(jour && 'quantite' in jour && jour.quantite).toBe(834);
    expect(semaine && 'quantite' in semaine && semaine.quantite).toBe(5834);
    expect(r.plan.recurrences[0]?.quantite).toBe(834);
    expect(r.plan.source).toBe('regles');
  });

  it('jalons à 25, 50, 75 et 100 %', () => {
    const r = genererPlan(base, outils);
    if (!r.ok) throw new Error(r.erreur);
    expect(r.plan.etapes.map((e) => e.valeurCible)).toEqual([12500, 25000, 37500, 50000]);
    expect(r.plan.etapes[3]?.dateCible).toBe(base.dateEcheance);
    expect(r.plan.etapes[0]?.titre).toBe('Atteindre 12 500 FCFA');
  });

  it('300 pages en 30 jours : 10 pages par jour', () => {
    const r = genererPlan(
      { ...base, titre: 'Lire un livre', categorie: 'lecture', unite: 'pages', valeurCible: 300, dateEcheance: ajouterJours(base.dateDebut, 29) },
      outils,
    );
    if (!r.ok) throw new Error(r.erreur);
    expect(r.plan.recurrences[0]?.quantite).toBe(10);
    expect(r.plan.recurrences[0]?.titre).toBe('Lire');
  });

  it('avec des jours de repos, la quantité par séance augmente', () => {
    // 3 séances par semaine sur 4 semaines = 12 séances
    const r = genererPlan({ ...base, valeurCible: 300, unite: 'pages', jours: [1, 3, 5], dateEcheance: ajouterJours(base.dateDebut, 27) }, outils);
    if (!r.ok) throw new Error(r.erreur);
    expect(r.plan.recurrences[0]?.quantite).toBe(25);
  });

  it('tient compte de ce qui est déjà atteint', () => {
    const r = genererPlan({ ...base, valeurInitiale: 20000 }, outils);
    if (!r.ok) throw new Error(r.erreur);
    expect(r.plan.recurrences[0]?.quantite).toBe(500);
  });

  it('refuse les cas impossibles avec un message clair', () => {
    expect(genererPlan({ ...base, dateEcheance: null }, outils)).toEqual({ ok: false, erreur: 'plan.erreur_echeance_requise' });
    expect(genererPlan({ ...base, valeurInitiale: 60000 }, outils)).toEqual({ ok: false, erreur: 'plan.erreur_deja_atteint' });
    expect(genererPlan({ ...base, jours: [] }, outils)).toEqual({ ok: false, erreur: 'plan.erreur_jours' });
    expect(genererPlan({ ...base, dateEcheance: '2026-11-01' }, outils)).toEqual({ ok: false, erreur: 'plan.erreur_echeance' });
    // Un seul jour (mardi 3 nov.) sans séance le lundi
    expect(genererPlan({ ...base, dateEcheance: '2026-11-02', jours: [2] }, outils)).toEqual({ ok: false, erreur: 'plan.erreur_aucune_seance' });
  });
});

describe('plan récurrent', () => {
  it('sport 3 fois par semaine, 45 min', () => {
    const r = genererPlan(
      { ...base, type: 'recurrent', titre: 'Faire du sport', categorie: 'sante', unite: null, valeurCible: null, dateEcheance: null, jours: [1, 3, 5], minutesParSeance: 45 },
      outils,
    );
    if (!r.ok) throw new Error(r.erreur);
    expect(r.plan.recurrences[0]).toMatchObject({ titre: 'Faire du sport', joursSemaine: [1, 3, 5], minutes: 45, quantite: null, dateFin: null });
    expect(r.plan.etapes).toEqual([]);
  });

  it('exige une durée ou une quantité', () => {
    const r = genererPlan({ ...base, type: 'recurrent', minutesParSeance: null, quantiteParSeance: null }, outils);
    expect(r).toEqual({ ok: false, erreur: 'plan.erreur_mesure_seance' });
  });
});

describe('plan par étapes', () => {
  it('recherche d’emploi : étapes du modèle carrière réparties jusqu’à l’échéance', () => {
    const r = genererPlan(
      { ...base, type: 'echeance', titre: 'Trouver un emploi', categorie: 'carriere', unite: null, valeurCible: null, dateEcheance: ajouterJours(base.dateDebut, 40), jours: [2, 4] },
      outils,
    );
    if (!r.ok) throw new Error(r.erreur);
    expect(r.plan.etapes.map((e) => e.titre)).toEqual([
      'Mettre à jour mon CV',
      'Lister les entreprises et offres visées',
      'Envoyer mes candidatures',
      'Préparer les entretiens',
    ]);
    expect(r.plan.etapes[3]?.dateCible).toBe(ajouterJours(base.dateDebut, 40));
    expect(r.plan.recurrences[0]?.titre).toBe('Avancer sur : Trouver un emploi');
  });
});
