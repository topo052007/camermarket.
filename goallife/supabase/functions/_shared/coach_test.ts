import { assert, assertEquals } from 'jsr:@std/assert@1';
import { construireContexte, convertirPlanIa, type SaisieObjectif } from './coach.ts';
import { choisirFournisseur } from './ia/index.ts';

const saisie: SaisieObjectif = {
  titre: 'Trouver un emploi',
  description: null,
  categorie: 'carriere',
  type: 'echeance',
  dateDebut: '2026-11-02',
  dateEcheance: '2026-12-01',
  valeurCible: null,
  valeurInitiale: 0,
  unite: null,
  jours: [2, 4],
  minutesParSeance: 30,
  quantiteParSeance: null,
};

Deno.test('sans clé IA : aucun fournisseur (le coach est déclaré non configuré)', () => {
  assertEquals(choisirFournisseur(() => undefined), null);
});

Deno.test('fournisseur simulé refusé hors environnement de test', () => {
  assertEquals(choisirFournisseur((n) => ({ IA_FOURNISSEUR: 'simule', ENVIRONNEMENT: 'production' })[n]), null);
  assertEquals(choisirFournisseur((n) => ({ IA_FOURNISSEUR: 'simule', ENVIRONNEMENT: 'test' })[n])?.nom, 'simule');
});

Deno.test('fournisseur Anthropic choisi seulement avec une clé', () => {
  assertEquals(choisirFournisseur((n) => ({ ANTHROPIC_API_KEY: 'sk-test' })[n])?.nom, 'anthropic');
});

Deno.test('le contexte envoyé à l’IA ne contient que les données utiles', () => {
  const ctx = construireContexte(
    [{
      titre: 'Épargne', categorie: 'finances', type: 'quantitatif', statut: 'actif', valeur_cible: 50000, valeur_initiale: 0,
      unite: 'argent', date_debut: '2026-11-01', date_echeance: '2026-12-30', contributions: 10000, actions_faites_14j: 5, actions_prevues_14j: 7,
    }],
    '2026-11-10',
    true,
  );
  assert(ctx.includes('10000 / 50000'));
  assert(ctx.includes('5 faites sur 7'));
  assert(!construireContexte([], '2026-11-10', false).includes('Épargne'));
});

Deno.test('un plan IA est borné avant d’être proposé', () => {
  const plan = convertirPlanIa(
    {
      etapes: [{ titre: '  Mettre à jour le CV ', jours_apres_debut: 400 }, { titre: '', jours_apres_debut: 3 }],
      seances: [
        { titre: 'Candidatures', jours_semaine: [2, 4, 9, 4], quantite: 12, minutes: 999 },
        { titre: 'Invalide', jours_semaine: [0, 8], quantite: null, minutes: 20 },
      ],
      explications: ['Rythme réaliste.'],
    },
    saisie,
  );
  assert(plan);
  assertEquals(plan.etapes, [{ titre: 'Mettre à jour le CV', dateCible: '2026-12-01', valeurCible: null }]);
  assertEquals(plan.recurrences.length, 1);
  assertEquals(plan.recurrences[0]!.joursSemaine, [2, 4]);
  assertEquals(plan.recurrences[0]!.minutes, 180);
  assertEquals(plan.recurrences[0]!.quantite, null); // pas de quantité pour un projet par étapes
  assertEquals(plan.source, 'ia');
});

Deno.test('un plan IA sans séance utilisable est rejeté', () => {
  assertEquals(convertirPlanIa({ etapes: [], seances: [{ titre: 'x', jours_semaine: [], quantite: null, minutes: null }], explications: [] }, saisie), null);
});
