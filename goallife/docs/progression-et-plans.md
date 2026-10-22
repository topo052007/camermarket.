# Règles de calcul : plans et progression

Toutes les règles ci-dessous sont implémentées dans `src/domain/` (fonctions pures, testées par
`npm test`) et, pour ce qui touche la base, dans `supabase/migrations/` (testé par `npm run test:db`).

## Dates

- Les dates « du calendrier » (date prévue d'une action, échéance) sont des `date` SQL / chaînes
  `AAAA-MM-JJ` dans le **fuseau horaire de l'utilisateur** (`profils.fuseau_horaire`).
- « Aujourd'hui » côté serveur = `aujourdhui_utilisateur()` ; côté application = `dateLocale(fuseau)`.
- Une durée de N jours à partir du début D donne l'échéance D + N − 1 (le jour de début compte).

## Plan déterministe (sans IA) — `src/domain/plan.ts`

### Objectif quantitatif (« atteindre un chiffre »)
- `reste = cible − déjà atteint`
- `par jour = ⌈reste / nombre de jours⌉` ; `par semaine = ⌈reste × 7 / nombre de jours⌉`
- `par séance = ⌈reste / nombre de séances⌉` (séances = jours choisis entre début et échéance)
- Exemple : 50 000 FCFA en 60 jours → 834 FCFA/jour, 5 834 FCFA/semaine.
- Jalons à 25, 50, 75 et 100 % si la durée dépasse 14 jours (sinon seulement 100 %).
  Ils sont cochés **automatiquement** par la base quand le cumul les atteint, et décochés si
  une contribution est annulée (`recalculer_jalons`).
- Il est expliqué à l'utilisateur que c'est une moyenne, pas une obligation.

### Habitude (« récurrent »)
- Une séance par jour choisi, avec une durée et/ou une quantité fixe.
- Avec une date de fin : bilan à mi-parcours (si ≥ 28 jours) et bilan final.

### Projet (« échéance »)
- 4 étapes selon le domaine (carrière, activité, études, ou modèle général), réparties
  régulièrement jusqu'à l'échéance (ou une par semaine sans échéance) + un créneau de travail régulier.

### Plan proposé par l'IA
- Seulement si une clé IA est configurée, à la demande de l'utilisateur, et marqué « proposé par l'IA ».
- Toutes les valeurs sont bornées côté serveur (`convertirPlanIa`) puis revalidées dans l'application.
- Rien n'est activé sans validation : l'utilisateur voit et modifie le plan avant « Activer ce plan ».

## Actions

- Les récurrences génèrent les actions **14 jours à l'avance** (`generer_actions_jusqu_au`,
  idempotent, jamais dans le passé, jamais plus de 60 jours).
- États : `a_faire`, `terminee`, `reportee`, `ignoree`, `annulee`. Le statut ne change que par
  `changer_statut_action` (le client n'a pas le droit de modifier la colonne directement).
- Valider deux fois = une seule contribution (index unique par action).
- Reporter = l'action d'origine passe « reportée » et une nouvelle action est créée à la nouvelle date.
- Chaque changement est historisé automatiquement (`historique_actions`).

## Progression — `src/domain/progression.ts`

| Type d'objectif | Ce qui est affiché | Calcul |
|---|---|---|
| Quantitatif | % d'avancement | (déjà atteint + somme des contributions) / cible, borné à 100 % |
| Projet avec étapes | % d'étapes | étapes terminées / étapes |
| Habitude | **Régularité** (pas un avancement) | actions faites / actions prévues jusqu'à aujourd'hui |

- Les actions annulées et reportées ne comptent jamais ; les actions futures non plus.
- Sans aucune action passée, aucun pourcentage n'est affiché (« pas encore de données »).
- **Effort restant** (quantitatif) : ⌈reste / jours restants (aujourd'hui compris)⌉.
- **Série** : jours consécutifs avec au moins une action faite ; aujourd'hui ne casse pas la série
  tant que la journée n'est pas finie. Le texte rappelle qu'une pause n'efface pas les progrès.

## Retard et reprise — `src/domain/reprise.ts`

- Une action est « manquée » si elle est encore à faire et que sa date est passée (14 derniers jours).
- À partir de **2** actions manquées, l'application propose de reprendre (jamais imposé) :
  - **Action minimale** : une action de 5 minutes aujourd'hui ;
  - **Réduire l'effort** : quantités et durées des 7 prochains jours divisées par deux ;
  - **Repousser l'échéance** de 14 jours ;
  - **Recalculer le rythme** : ce qui reste est réparti sur les séances restantes.
- Dans tous les cas, les actions manquées passent « ignorées » (raison : reprise).

## Estimation de la date d'atteinte — `src/domain/prevision.ts`

Pour un objectif chiffré actif :
- rythme = somme des contributions des 14 derniers jours / 14 (ou / nombre de jours depuis le
  début si l'objectif a moins de 14 jours) ;
- date estimée = aujourd'hui + ⌈reste / rythme⌉, comparée à l'échéance (avance ou retard en jours) ;
- aucune estimation avant 3 jours ou sans contribution récente (« pas encore assez de données ») ;
- toujours affichée comme une **estimation**, jamais comme une promesse.

## Modules métier

- **Modèles d'objectifs** (`src/domain/modeles.ts`) : 23 exemples par domaine (épargne, sport,
  hydratation, sommeil, lecture, langue, examen, candidatures, emploi, activité, ventes, routines,
  maison, famille, gratitude, spiritualité). Un modèle pré-remplit seulement le formulaire.
  Les modèles spirituels (chrétiens et musulmans, côte à côte) n'apparaissent que si le module
  spiritualité est activé. Chaque modèle est testé : il doit produire un plan valide.
- **Candidatures** (table `candidatures`, privée) : entreprise, poste, statut (à envoyer, envoyée,
  entretien, offre, refusée, abandonnée), relance, lien, notes. Une candidature liée à un objectif
  chiffré en « candidatures » compte **+1 automatiquement** dès qu'elle est envoyée (une seule fois,
  retirée si elle revient « à envoyer ») — trigger `synchroniser_contribution_candidature`.
- Nouvelles unités : `verres` (hydratation) et `heures` (sommeil, étude).
