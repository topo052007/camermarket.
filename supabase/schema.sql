-- CamerMarket : schéma de base de données (Supabase / PostgreSQL)
-- À exécuter dans l'éditeur SQL de Supabase.
--
-- Marché africain : chaque produit a un prix par devise (table prix_produits) et des textes
-- en français et en anglais. Devises : XAF (FCFA d'Afrique centrale) et XOF (FCFA d'Afrique de
-- l'Ouest). Pour une autre devise africaine (GNF, CDF...), l'ajouter dans les deux contrôles
-- "devise in (...)" ci-dessous, dans src/lib/devises.ts et dans src/lib/pays.ts.
--
-- Pas de comptes clients : le client donne son e-mail (et son numéro WhatsApp) au moment
-- du paiement, et reçoit un lien d'accès personnel (commandes.jeton_acces). Ce lien est lu
-- par le serveur du site (clé "service role"), jamais directement par le navigateur.
-- Seul le propriétaire a un compte (administration) : voir la fin du fichier.

create extension if not exists "pgcrypto";

-- ============ PRODUITS ============
create type type_produit as enum ('physique', 'digital', 'formation');
create type statut_commande as enum ('en_attente', 'payee', 'en_preparation', 'expediee', 'livree', 'annulee', 'remboursee');

create table produits (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nom_fr text not null,
  nom_en text not null,
  description_fr text,
  description_en text,
  -- points forts affichés en liste sur la fiche produit
  points_fr text[] not null default '{}',
  points_en text[] not null default '{}',
  type type_produit not null,
  image_url text,
  actif boolean not null default true,
  -- produit physique
  stock integer check (stock is null or stock >= 0),
  poids_grammes integer,
  -- pays où l'on livre (codes ISO : 'CM', 'FR'...). NULL = monde entier.
  -- Pour le digital et les formations, laisser NULL.
  pays_livraison text[],
  -- produit digital : nom du fichier dans le stockage privé "produits-digitaux"
  fichier_chemin text,
  cree_le timestamptz not null default now()
);

-- Un prix par produit et par devise. En francs CFA : montant entier et multiple de 5
-- (règle de CinetPay).
create table prix_produits (
  produit_id uuid not null references produits(id) on delete cascade,
  devise text not null check (devise in ('XAF', 'XOF')),
  montant numeric(12, 2) not null check (montant > 0 and montant = trunc(montant) and mod(montant, 5) = 0),
  primary key (produit_id, devise)
);

-- ============ FORMATIONS ============
create table modules (
  id uuid primary key default gen_random_uuid(),
  produit_id uuid not null references produits(id) on delete cascade,
  titre_fr text not null,
  titre_en text not null,
  position integer not null default 0
);

create table lecons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  titre_fr text not null,
  titre_en text not null,
  video_url text,
  contenu_fr text,
  contenu_en text,
  position integer not null default 0
);

-- ============ ADMINISTRATION ============
-- Seul le propriétaire se connecte. Après avoir créé son compte dans Supabase
-- (Authentication > Users), le passer administrateur avec :
--   update profils set est_admin = true where id = 'IDENTIFIANT-DU-COMPTE';
-- Ensuite, désactiver les inscriptions publiques (Authentication > Providers > Email).
create table profils (
  id uuid primary key references auth.users(id) on delete cascade,
  nom_complet text,
  est_admin boolean not null default false,
  cree_le timestamptz not null default now()
);

-- ============ COMMANDES ============
create table commandes (
  id uuid primary key default gen_random_uuid(),
  statut statut_commande not null default 'en_attente',
  devise text not null check (devise in ('XAF', 'XOF')),
  total numeric(12, 2) not null check (total >= 0),
  -- pays du client (code ISO, par exemple 'CM') : détermine la devise
  pays_client text not null,
  lang text not null default 'fr' check (lang in ('fr', 'en')),
  -- coordonnées saisies au paiement : la livraison se fait par e-mail
  email_client text not null,
  nom_client text,
  whatsapp_client text,
  -- lien d'accès personnel : 64 caractères aléatoires, impossible à deviner
  jeton_acces text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  -- rempli quand l'e-mail de livraison est parti (évite les doubles envois)
  livraison_envoyee_le timestamptz,
  pays_livraison text,
  adresse_livraison text,
  telephone_livraison text,
  reference_paiement text,
  cree_le timestamptz not null default now()
);

create table lignes_commande (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references commandes(id) on delete cascade,
  produit_id uuid not null references produits(id),
  quantite integer not null check (quantite > 0),
  prix_unitaire numeric(12, 2) not null check (prix_unitaire >= 0) -- dans la devise de la commande
);

-- ============ SÉCURITÉ (Row Level Security) ============
alter table produits enable row level security;
alter table prix_produits enable row level security;
alter table modules enable row level security;
alter table lecons enable row level security;
alter table profils enable row level security;
alter table commandes enable row level security;
alter table lignes_commande enable row level security;

create or replace function est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select est_admin from profils where id = auth.uid()), false);
$$;

-- Produits et prix : visibles par tous (produits actifs) ; modifiables par l'admin
create policy "produits_lecture" on produits for select using (actif or est_admin());
create policy "produits_admin" on produits for all using (est_admin()) with check (est_admin());
create policy "prix_lecture" on prix_produits for select using (true);
create policy "prix_admin" on prix_produits for all using (est_admin()) with check (est_admin());

-- Modules : les titres sont publics ; les leçons (vidéos, contenu) ne sont visibles que
-- par l'admin. Les clients les voient via la page d'accès, lue par le serveur.
create policy "modules_lecture" on modules for select using (true);
create policy "modules_admin" on modules for all using (est_admin()) with check (est_admin());
create policy "lecons_admin" on lecons for all using (est_admin()) with check (est_admin());

-- Profils : chacun voit le sien ; personne ne peut se rendre administrateur soi-même
create policy "profils_soi" on profils for select using (id = auth.uid() or est_admin());
create policy "profils_maj" on profils for update using (id = auth.uid())
  with check (id = auth.uid() and est_admin = est_admin());

-- Commandes : réservées à l'admin (le site les écrit avec la clé "service role")
create policy "commandes_admin" on commandes for all using (est_admin()) with check (est_admin());
create policy "lignes_admin" on lignes_commande for all using (est_admin()) with check (est_admin());

-- ============ AUTOMATISMES ============
-- Paiement confirmé => le stock des produits physiques baisse (sans passer sous zéro)
create or replace function apres_paiement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.statut = 'payee' and old.statut is distinct from 'payee' then
    update produits p
    set stock = greatest(p.stock - l.quantite, 0)
    from lignes_commande l
    where l.commande_id = new.id and l.produit_id = p.id
      and p.type = 'physique' and p.stock is not null;
  end if;
  return new;
end;
$$;

create trigger trg_apres_paiement
after update of statut on commandes
for each row execute function apres_paiement();

-- Création automatique du profil à l'inscription du propriétaire.
-- "set search_path = public" est indispensable sur toutes les fonctions "security definer" :
-- sans lui, Supabase ne trouve pas la table profils ("Database error saving new user").
create or replace function creer_profil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profils (id, nom_complet) values (new.id, new.raw_user_meta_data->>'nom_complet');
  return new;
end;
$$;

create trigger trg_creer_profil
after insert on auth.users
for each row execute function creer_profil();

-- ============ STOCKAGE DES FICHIERS DIGITAUX ============
-- Espace PRIVÉ : aucun accès depuis le navigateur. Le serveur crée des liens temporaires
-- (60 secondes) après avoir vérifié que la commande est payée.
-- Envoyez vos fichiers (PDF...) dans Storage > produits-digitaux, puis indiquez leur nom
-- dans produits.fichier_chemin.
insert into storage.buckets (id, name, public)
values ('produits-digitaux', 'produits-digitaux', false)
on conflict (id) do nothing;
