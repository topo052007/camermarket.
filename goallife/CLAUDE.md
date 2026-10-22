# GoalLife (nom provisoire)

Application mobile de réalisation d'objectifs personnels, pensée d'abord pour le Cameroun puis l'Afrique.
Propriétaire débutant en programmation : **répondre en français, expliquer simplement**.
Projet indépendant de la boutique CamerMarket (dossier parent) : ne pas mélanger les deux.
Lire aussi `AGENTS.md` (règles Expo : vérifier la doc de la version SDK utilisée, `npx expo install`).

## Stack
- Expo SDK 58, React Native 0.88, React 19, TypeScript strict, Expo Router (`src/app/`)
- Supabase : Auth, PostgreSQL + RLS, Edge Functions (Deno) ; client avec la clé PUBLIQUE uniquement
- TanStack Query (cache persistant AsyncStorage, file d'attente hors ligne), zod
- expo-notifications (rappels LOCAUX), expo-localization
- IA : Edge Function `coach`, SDK `@anthropic-ai/sdk`, fournisseur remplaçable (`_shared/ia/`)

## Choix à respecter
- Noms de fichiers, variables, tables en français (comme le code existant).
- Aucun texte visible en dur : tout passe par `src/i18n/fr.ts` (référence) et `en.ts` (TypeScript vérifie que les clés existent).
- Logique métier PURE dans `src/domain/` (testée par Jest) ; accès serveur uniquement dans `src/data/`.
- Sécurité côté serveur : RLS sur toutes les tables, clés étrangères composites `(objectif_id, user_id)`,
  le statut d'une action ne change que par la fonction `changer_statut_action`,
  Premium écrit uniquement par `webhook-abonnement`, quotas IA par `consommer_quota_ia`.
- Toute fonction SQL `security definer` a `set search_path = public` et vérifie `auth.uid()`.
- Limites des offres : la table `parametres_offres` fait foi ; `src/domain/offres.ts` en est une copie d'affichage (garder les deux alignées).
- Ne jamais inventer de progression, de réponse IA ou de paiement. Sans clé IA, le dire honnêtement.
- Ne jamais culpabiliser l'utilisateur (textes de retard et de reprise bienveillants).
- Spiritualité : module facultatif, jamais présumé ; catégories `spiritualite` et `sante` discrètes dans les notifications.
- Règles de calcul documentées dans `docs/progression-et-plans.md` (à mettre à jour si elles changent).

## Commandes
- `npm run verifier` : typecheck + lint + Jest + tests SQL (`scripts/test-db.sh` lance un PostgreSQL jetable avec `supabase/tests/00-supabase-simule.sql`)
- Fonctions serveur : `cd supabase/functions && deno check */index.ts && deno test --allow-env _shared/`
- Bundle : `npx expo export --platform android`

## État (22/10/2026)
- MVP codé : auth e-mail (PKCE), onboarding, objectifs (3 types), plan déterministe + plan IA facultatif, actions
  (faire/reporter/ignorer/annuler), progression, reprise après retard, rappels locaux, coach (règles + IA),
  historique, calendrier, paramètres, export et suppression de compte, offres gratuit/Premium (sans paiement).
- Vérifié : typecheck, lint, 33 tests Jest, 61 vérifications SQL, 6 tests Deno, bundle Android, démarrage web (Playwright).
- JAMAIS testé avec un vrai Supabase, une vraie clé IA, ni sur un vrai téléphone.

## Prochaines étapes
1. Créer le projet Supabase, appliquer la migration, remplir `.env`, tester le parcours complet sur un Android.
2. Choisir le modèle IA (`IA_MODELE`) selon le budget, ajouter la clé, tester le coach.
3. Paiement : RevenueCat + `react-native-purchases` (voir README §7).
4. Enrichir les modules métier (budgets, candidatures, routines…) sans toucher au moteur d'objectifs.
5. Connexion Google / téléphone, notifications push serveur, partage familial.
