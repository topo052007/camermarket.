import { en } from '@/i18n/en';
import { fr } from '@/i18n/fr';
import { ajouterJours } from '../dates';
import { cleTitreModele, MODELES, modelesDisponibles } from '../modeles';
import { genererPlan } from '../plan';
import { prevoirAtteinte } from '../prevision';
import { outils, t } from './outils';

describe('catalogue de modèles', () => {
  it.each(MODELES.map((m) => [m.id, m] as const))('« %s » a un titre traduit et produit un plan valide', (_id, m) => {
    const cle = cleTitreModele(m);
    expect(fr).toHaveProperty([cle]);
    expect(en).toHaveProperty([cle]);
    const debut = '2026-11-02';
    const r = genererPlan(
      {
        titre: t(cle),
        categorie: m.categorie,
        type: m.type,
        dateDebut: debut,
        dateEcheance: m.dureeJours ? ajouterJours(debut, m.dureeJours - 1) : null,
        valeurCible: m.cible ?? null,
        valeurInitiale: 0,
        unite: m.unite,
        jours: m.jours,
        minutesParSeance: m.minutes ?? null,
        quantiteParSeance: m.quantiteSeance ?? null,
      },
      outils,
    );
    expect(r.ok).toBe(true);
  });

  it('la spiritualité n’est proposée que si le module est activé, sans privilégier de religion', () => {
    expect(modelesDisponibles(false).some((m) => m.categorie === 'spiritualite')).toBe(false);
    const spirituels = modelesDisponibles(true, 'spiritualite').map((m) => m.id);
    expect(spirituels).toEqual(expect.arrayContaining(['bible', 'priere_chretienne', 'coran', 'salat']));
  });
});

describe('prévision', () => {
  const objectif = { valeur_cible: 50000, valeur_initiale: 0, date_debut: '2026-11-01', date_echeance: '2026-12-30' };
  const contribution = (date_evenement: string, valeur: number) => ({ type: 'contribution' as const, valeur, date_evenement });

  it('estime la date d’atteinte au rythme des 14 derniers jours', () => {
    // 14 000 en 14 jours = 1 000 / jour ; reste 36 000 -> 36 jours
    const p = prevoirAtteinte(objectif, [contribution('2026-11-03', 6000), contribution('2026-11-10', 8000)], '2026-11-14');
    expect(p).toEqual({ etat: 'estimee', rythmeParJour: 1000, dateEstimee: '2026-12-20', avance: 10 });
  });

  it('ne compte pas les contributions plus anciennes que la fenêtre', () => {
    const p = prevoirAtteinte({ ...objectif, date_debut: '2026-10-01' }, [contribution('2026-10-05', 30000)], '2026-11-14');
    expect(p).toEqual({ etat: 'pas_assez_de_donnees' });
  });

  it('pas d’estimation inventée au tout début', () => {
    expect(prevoirAtteinte(objectif, [contribution('2026-11-01', 5000)], '2026-11-02')).toEqual({ etat: 'pas_assez_de_donnees' });
  });

  it('cible atteinte', () => {
    expect(prevoirAtteinte(objectif, [contribution('2026-11-03', 50000)], '2026-11-14')).toEqual({ etat: 'atteint' });
  });

  it('en retard : avance négative', () => {
    const p = prevoirAtteinte(objectif, [contribution('2026-11-10', 1400)], '2026-11-14');
    expect(p.etat === 'estimee' && p.avance! < 0).toBe(true);
  });
});
