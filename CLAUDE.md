# CamerMarket

> Le dossier `goallife/` est un **projet séparé** (application mobile d'objectifs personnels) avec son propre `goallife/CLAUDE.md`. Les règles ci-dessous concernent uniquement la boutique.

Boutique en ligne personnelle (une seule boutique, pas une place de marché) qui vend trois types de produits : physiques, digitaux (téléchargement) et formations (leçons protégées). Propriétaire : débutant en programmation, basé au Cameroun. **Marché limité à l'Afrique**, payé en Mobile Money via CinetPay. Répondre en français, expliquer simplement.

**Pas de comptes clients.** Le client donne son e-mail, son pays et son téléphone/WhatsApp dans le formulaire de paiement. Après le paiement, il reçoit par e-mail un lien d'accès personnel (`/[lang]/acces/<jeton>`) où il télécharge ses produits digitaux et suit sa formation. Seul le propriétaire aura un compte (espace admin).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Supabase (PostgreSQL et stockage privé de fichiers) : branché (`@supabase/supabase-js`). La boutique lit les produits avec la clé publique (RLS), le paiement et les accès avec la clé service role.
- Paiement : CinetPay (checkout v2, page de paiement hébergée, Mobile Money). Documentation : https://docs.cinetpay.com. L'argent arrive sur le solde CinetPay du propriétaire, qui le retire ensuite (voir « Retraits »). Pas de portefeuille à construire.
- E-mails de livraison : Resend (simple appel HTTP, voir `src/lib/livraison.ts`)
- Hébergement prévu : Vercel

## Structure

- `src/middleware.ts` : redirige les adresses sans langue vers `/fr` ou `/en` selon le navigateur
- `src/app/[lang]/` : pages, toutes sous `/fr` ou `/en` : layout, accueil, `produits`, `produits/[slug]`, `paiement/retour`, `acces/[jeton]`
- `src/app/[lang]/not-found.tsx` + `[...reste]/page.tsx` : page « introuvable » traduite
- `src/app/api/checkout/route.ts` : crée la commande (pays -> devise, prix relu dans la base) puis le lien CinetPay
- `src/app/api/webhooks/cinetpay/route.ts` : notification CinetPay (GET et POST, signature `x-token` facultative)
- `src/app/api/paiement/retour/route.ts` : `return_url` de CinetPay (GET ou POST), redirige en 303 vers la page de retour
- `src/app/api/telechargement/[jeton]/[slug]/route.ts` : vérifie le jeton puis redirige vers un lien temporaire du fichier privé
- `src/components/` : `CarteProduit.tsx`, `PrixProduit.tsx` (prix ou « bientôt disponible »), `Visuel.tsx` (image ou emoji selon le type), `Selecteurs.tsx` (langue et pays, client), `BoutonAchat.tsx` (formulaire d'achat, client)
- `src/lib/i18n.ts` : langues et tous les textes de l'interface (fr/en)
- `src/lib/pays.ts` : pays africains et leur devise ; `paysActifs()` lit `PAYS_ACTIFS`
- `src/lib/devises.ts` : devises XAF et XOF, affichage « FCFA »
- `src/lib/devise-serveur.ts` : lit le pays choisi (cookie `cm_pays`) et en déduit la devise
- `src/lib/produits.ts` : lecture des produits et des prix dans Supabase (`listerProduits`, `trouverProduit`)
- `src/lib/supabase-public.ts` : client Supabase avec la clé publique (RLS appliquée) pour la boutique
- `src/lib/supabase-admin.ts` : client Supabase "service role" (serveur uniquement)
- `src/lib/cinetpay.ts` : création du paiement, vérification (`/payment/check`), vérification du jeton `x-token`
- `src/lib/paiement.ts` : `confirmerPaiement(commandeId)`, appelée par la notification ET la page de retour (idempotente)
- `src/lib/livraison.ts` : `livrerCommande`, envoie l'e-mail avec le lien d'accès (une seule fois par commande)
- `src/lib/acces.ts` : lit ce qu'un jeton donne accès (`chargerAcces`, `jetonDeLaCommande`)
- `supabase/schema.sql` : schéma complet, sécurité (RLS), automatismes, espace de stockage privé `produits-digitaux`
- `supabase/seed.sql` : les 3 produits de démonstration, leurs prix et une formation d'exemple (à exécuter après schema.sql, peut être relancé sans doublon)
- `.env.example` : variables à copier dans `.env.local`

## Choix de conception à respecter

- Noms de variables, fichiers et tables en français (comme dans le code existant).
- Textes toujours en deux langues (fr, en) ; aucun texte visible en dur dans les composants.
- Le client choisit son PAYS ; le serveur en déduit la devise (XAF en Afrique centrale, XOF en Afrique de l'Ouest). Le navigateur n'envoie jamais ni devise ni prix.
- Un prix par devise et par produit (table `prix_produits`). Règle CinetPay pour le franc CFA : montant entier et multiple de 5 (contrôlé dans le SQL et dans `/api/checkout`).
- Seuls les pays de `PAYS_ACTIFS` peuvent acheter. Un produit physique n'est vendu que dans ses `pays_livraison`.
- Le jeton d'accès (`commandes.jeton_acces`, 64 caractères hexadécimaux) est le seul secret du client : ne jamais le journaliser, ne jamais l'indexer (la page d'accès est en `noindex`).
- Les commandes, les leçons et les fichiers ne sont lisibles que par le serveur (clé service role) ou l'admin ; jamais par le navigateur directement (RLS + stockage privé).
- Toutes les fonctions SQL `security definer` ont `set search_path = public` (sinon la création du compte propriétaire échoue sur Supabase : « Database error saving new user »).
- Pas de prix dans la devise du pays choisi = pas de bouton d'achat (« Prix bientôt disponible »).
- Les fichiers digitaux ne sont jamais servis par un lien permanent : uniquement un lien temporaire de 60 secondes créé après vérification du jeton.
- On ne croit jamais la notification ni le navigateur : le statut d'un paiement vient toujours de `verifierPaiement` (appel à CinetPay), avec contrôle du montant et de la devise.

## CinetPay : points d'attention (tirés de la documentation)

- `transaction_id` = identifiant de commande (uuid) SANS les tirets (`versTransactionId` / `depuisTransactionId`).
- Requêtes JSON avec en-tête `User-Agent` obligatoire (sinon erreur 1010) ; erreur 608 si la devise n'est pas activée sur le compte : un compte camerounais n'encaisse en général que le XAF. Pour vendre en XOF, demander à CinetPay d'activer les pays concernés, puis les ajouter dans `PAYS_ACTIFS`.
- `notify_url` et `return_url` ne peuvent PAS être en localhost : en test, utiliser un tunnel public (ngrok) comme `NEXT_PUBLIC_SITE_URL`.
- La notification (POST formulaire) ne contient pas le statut : on lit `cpm_trans_id` puis on appelle `/payment/check`. Statuts : `ACCEPTED`, `REFUSED`, `WAITING_FOR_CUSTOMER` (pas un échec). La réponse à la notification doit être 200.
- Le jeton `x-token` (HMAC-SHA256 des champs `cpm_*` concaténés, avec la clé secrète) est vérifié seulement si `CINETPAY_SECRET_KEY` est renseignée. À tester avec une vraie notification : si l'ordre ou le format des champs diffère, la notification légitime serait refusée (la page de retour confirme quand même le paiement).
- Canaux : `MOBILE_MONEY` par défaut. Les cartes (`CREDIT_CARD`, `ALL`) exigent adresse, ville et code postal du client : à ajouter au formulaire avant de les activer.
- Le client est redirigé vers `/api/paiement/retour?lang=..&ref=<commande>` qui répond par une redirection 303 vers la page de retour.

## Retraits (argent du propriétaire)

D'après la documentation CinetPay : virement bancaire depuis le back-office (Transférer des fonds) pour les fonds encaissés par carte ; le retrait Mobile Money n'est possible que dans le pays où l'argent est encaissé, via le compte de transfert. Le propriétaire veut retirer vers Orange Money et MTN MoMo : à CONFIRMER auprès de CinetPay pour le Cameroun (opérateurs, frais, plafonds, délais). Il existe aussi une API de transfert (contacts puis envoi), non utilisée pour l'instant : les retraits se font à la main dans le back-office.

## État actuel

- Compile (`npm run build`) et testé de bout en bout le 17/10/2026 avec un Postgres local + PostgREST imitant Supabase, un faux CinetPay (paiement, notification signée x-token, retour en POST, `/payment/check`) et un faux Resend : achat digital (e-mail, page d'accès, téléchargement par lien temporaire), formation en anglais depuis la Côte d'Ivoire (XOF), physique vers le Gabon (stock baissé) ; paiements refusé / montant insuffisant / annulé refusés, « en attente » bien affiché ; fausse notification refusée (401) ; pays non ouvert ou non livré refusé ; prix et devise envoyés par le navigateur ignorés ; panne de Resend puis renvoi de l'e-mail une seule fois ; jeton inventé ou produit non acheté : 404.
- Jamais testé avec le VRAI CinetPay, Resend ni Supabase. Le calcul du x-token n'a été testé que contre notre propre faux CinetPay : à vérifier avec une vraie notification.
- La page de retour affiche le lien d'accès à quiconque connaît l'identifiant de commande (`?ref=`), qui est aussi le `transaction_id` CinetPay (visible sur le reçu du client). Amélioration possible : cookie posé au checkout et lien affiché seulement s'il correspond (sinon « consultez votre e-mail »).
- Flux d'achat : formulaire (nom, e-mail, pays, téléphone, adresse si physique) -> `/api/checkout` (commande `en_attente` + lien CinetPay) -> paiement Mobile Money chez CinetPay -> retour (`/api/paiement/retour` puis `/[lang]/paiement/retour`) et notification -> `confirmerPaiement` interroge CinetPay (statut, montant, devise) -> commande `payee` (trigger SQL : stock baissé) -> `livrerCommande` envoie l'e-mail avec le lien d'accès. La page de retour affiche aussi le lien d'accès et un bouton « Envoyer le lien sur WhatsApp » (lien `wa.me`, sans API).
- E-mail : si l'envoi échoue, le paiement reste confirmé, l'erreur est journalisée et l'envoi est retenté à la prochaine confirmation (la colonne `livraison_envoyee_le` reste vide).
- WhatsApp : le numéro saisi est enregistré (`whatsapp_client`) mais AUCUN message n'est envoyé automatiquement. L'envoi automatique demande l'API WhatsApp Business (compte vérifié, messages modèles approuvés, facturation) : étape ultérieure.
- Le formulaire demande l'e-mail obligatoirement ; le téléphone/WhatsApp est obligatoire seulement pour un produit physique.
- Par défaut seul le Cameroun est ouvert (`PAYS_ACTIFS=CM`).
- Il n'y a pas encore d'espace admin. Le propriétaire doit créer son compte dans Supabase (Authentication > Users) puis exécuter `update profils set est_admin = true where id = '...'`, puis désactiver les inscriptions publiques.
- Pas de limitation du nombre de requêtes sur `/api/checkout` (à ajouter avant la mise en ligne).

## Prochaines étapes

1. ~~Lancer et corriger le site.~~ (fait)
2. Créer le projet Supabase, exécuter `schema.sql` puis `seed.sql`, envoyer un PDF `guide-vendre-sur-facebook.pdf` dans Storage > `produits-digitaux`, remplir `.env.local` à partir de `.env.example` (CinetPay, Resend, tunnel ngrok pour `NEXT_PUBLIC_SITE_URL`), et tester un achat complet de bout en bout : digital d'abord (paiement, e-mail, page d'accès, téléchargement), puis formation, puis physique.
3. ~~Remplacer `produits.ts` par la lecture dans Supabase.~~ (fait)
4. Page « Retrouver mon achat » : le client saisit son e-mail et reçoit à nouveau ses liens (avec limitation du nombre de demandes).
5. Espace admin : produits, prix, commandes, renvoi d'un e-mail de livraison, ventes par devise.
6. Cartes bancaires : ajouter adresse, ville et code postal au formulaire, puis `CINETPAY_CHANNELS=ALL`.
7. Envoi automatique par WhatsApp (API WhatsApp Business), si le besoin se confirme.
8. Pixel Meta (Facebook) et bouton WhatsApp de contact pour le trafic.
