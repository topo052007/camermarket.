# Fonctionnement hors connexion

Ce que l'application fait réellement (rien de plus) :

| Situation | Comportement |
|---|---|
| Ouvrir l'application sans réseau | Les données chargées les 7 derniers jours s'affichent (cache TanStack Query persisté dans AsyncStorage). Un bandeau « Hors connexion » est visible. |
| Cocher / décocher / reporter / ignorer une action | Affiché immédiatement, mis en file d'attente et **conservé même si l'application est fermée**. Envoyé au retour du réseau. Le bandeau indique le nombre de modifications en attente. |
| Créer, modifier ou supprimer un objectif, ajouter une contribution | Demande une connexion (opérations atomiques côté serveur). Un message clair s'affiche sinon. |
| Coach IA | Demande une connexion. L'analyse automatique (sans IA) reste disponible. |
| Rappels | Programmés sur le téléphone : ils fonctionnent sans réseau. |

## Conflits

- Le serveur fait foi.
- Le changement de statut est **idempotent** : valider deux fois (deux téléphones, ou une
  modification hors ligne rejouée) ne compte qu'une contribution.
- Si l'action a été supprimée entre-temps, la modification en attente échoue et est abandonnée ;
  la liste est rechargée.
- Si deux appareils changent le statut de la même action, le dernier envoyé gagne (l'historique
  garde les deux changements).
- À la déconnexion, tout le cache local est effacé (aucune donnée d'un compte ne reste pour le suivant).

Code : `src/offline/client-requetes.ts`, `src/hooks/donnees.ts` (`useChangerStatutAction`).
