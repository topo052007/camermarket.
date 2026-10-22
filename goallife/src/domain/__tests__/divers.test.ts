import { conseilsSansIa } from '../coach-regles';
import { formaterMontant } from '../monnaie';
import { LIMITES, offreEffective, peutCreerObjectif } from '../offres';
import { horsPeriodeSilencieuse, planifierRappels, versJourExpo } from '../rappels';
import type { PreferencesNotifications } from '../types';
import { lireNombre, schemaObjectif } from '../validation';
import { t } from './outils';

describe('monnaie', () => {
  it('FCFA sans décimales, espace insécable', () => {
    expect(formaterMontant(50000, 'XAF', 'fr')).toBe('50 000 FCFA');
    expect(formaterMontant(834, 'XOF', 'en')).toBe('834 FCFA');
    expect(formaterMontant(1234.5, 'EUR', 'fr')).toBe('1 234,50 €');
    expect(formaterMontant(3, 'USD', 'en')).toBe('$3');
  });
  it('lit les nombres saisis', () => {
    expect(lireNombre('50 000')).toBe(50000);
    expect(lireNombre('12,5')).toBe(12.5);
    expect(lireNombre('abc')).toBeNull();
    expect(lireNombre('')).toBeNull();
  });
});

describe('offres', () => {
  it('Premium expiré ou annulé = gratuit', () => {
    const maintenant = new Date('2026-11-10T00:00:00Z');
    expect(offreEffective(null)).toBe('gratuit');
    expect(offreEffective({ offre: 'premium', statut: 'actif', expire_le: '2026-12-01T00:00:00Z' }, maintenant)).toBe('premium');
    expect(offreEffective({ offre: 'premium', statut: 'actif', expire_le: '2026-11-01T00:00:00Z' }, maintenant)).toBe('gratuit');
    expect(offreEffective({ offre: 'premium', statut: 'annule', expire_le: null }, maintenant)).toBe('gratuit');
    expect(offreEffective({ offre: 'premium', statut: 'annule', expire_le: '2026-12-01T00:00:00Z' }, maintenant)).toBe('premium');
    expect(offreEffective({ offre: 'premium', statut: 'expire', expire_le: '2026-12-01T00:00:00Z' }, maintenant)).toBe('gratuit');
  });
  it('limite d’objectifs actifs', () => {
    expect(peutCreerObjectif('gratuit', LIMITES.gratuit.maxObjectifsActifs - 1)).toBe(true);
    expect(peutCreerObjectif('gratuit', LIMITES.gratuit.maxObjectifsActifs)).toBe(false);
    expect(peutCreerObjectif('premium', LIMITES.gratuit.maxObjectifsActifs)).toBe(true);
  });
});

describe('rappels', () => {
  const prefs: PreferencesNotifications = {
    user_id: 'u',
    actives: true,
    heure_resume: '07:00',
    jours: [1, 2, 3, 4, 5],
    silence_debut: '22:00',
    silence_fin: '06:00',
    discretes: false,
    bilan_hebdomadaire: true,
  };
  const objectif = { id: 'o1', titre: 'Prière du matin', categorie: 'spiritualite' as const, statut: 'actif' as const, rappel_actif: true, rappel_heure: '05:30', jours: [1, 7] };

  it('désactivés = aucun rappel', () => {
    expect(planifierRappels({ ...prefs, actives: false }, [objectif], t)).toEqual([]);
  });

  it('période silencieuse, discrétion des catégories sensibles', () => {
    const r = planifierRappels(prefs, [objectif, { ...objectif, id: 'o2', titre: 'Lire', categorie: 'lecture', rappel_heure: '20:00', jours: [3] }], t);
    expect(r.filter((x) => x.cle.startsWith('resume'))).toHaveLength(5);
    expect(r.find((x) => x.cle === 'bilan')).toMatchObject({ jourIso: 7, heure: 18, minute: 0 });
    const priere = r.find((x) => x.cle === 'obj-o1-1');
    // 5 h 30 tombe dans la période silencieuse : décalé à 6 h, titre masqué
    expect(priere).toMatchObject({ heure: 6, minute: 0, titre: 'Rappel' });
    expect(r.find((x) => x.cle === 'obj-o2-3')).toMatchObject({ titre: 'Lire', heure: 20 });
  });

  it('période silencieuse dans la journée et conversion des jours', () => {
    expect(horsPeriodeSilencieuse(13 * 60, '12:00', '14:00')).toBe(14 * 60);
    expect(horsPeriodeSilencieuse(23 * 60, '22:00', '06:00')).toBe(6 * 60);
    expect(horsPeriodeSilencieuse(10 * 60, '22:00', '06:00')).toBe(10 * 60);
    expect(versJourExpo(7)).toBe(1);
    expect(versJourExpo(1)).toBe(2);
  });
});

describe('validation et coach sans IA', () => {
  it('un objectif quantitatif exige cible, échéance et unité', () => {
    const r = schemaObjectif.safeParse({
      titre: 'Épargne', description: null, categorie: 'finances', type: 'quantitatif', priorite: 2,
      dateDebut: '2026-11-02', dateEcheance: null, valeurCible: null, valeurInitiale: 0, unite: null,
      jours: [1], minutesParSeance: null, quantiteParSeance: null, rappelActif: false, rappelHeure: null,
    });
    expect(r.success).toBe(false);
    const messages = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(messages).toEqual(expect.arrayContaining(['validation.cible_requise', 'validation.echeance_requise', 'validation.unite_requise']));
  });

  it('le coach sans IA ne parle que des données réelles', () => {
    expect(conseilsSansIa([], 0, t)).toEqual([t('coach.regle_aucun_objectif')]);
    const conseils = conseilsSansIa(
      [{ titre: 'Épargne', progression: { mode: 'quantite', pourcentage: 20, atteint: 10, cible: 50, reste: 40 }, retard: { manquees: 0, joursDepuisDerniereActivite: 1, enRetard: false, options: [] }, tempsEcoule: 50 }],
      2,
      t,
    );
    expect(conseils[0]).toContain('2 action');
    expect(conseils[1]).toContain('20 %');
  });
});
