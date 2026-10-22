-- GoalLife : schéma initial.
-- Principes : chaque donnée personnelle appartient à un utilisateur (user_id), RLS partout,
-- clés étrangères composites (objectif_id, user_id) pour qu'aucune ligne ne puisse être
-- rattachée à l'objectif d'un autre utilisateur, opérations critiques dans des fonctions
-- (une fonction = une transaction). Toutes les fonctions security definer fixent search_path.

-- =========================================================================
-- Tables de référence
-- =========================================================================

create table public.categories (
  code text primary key,
  sensible boolean not null default false,
  ordre int not null
);

insert into public.categories (code, sensible, ordre) values
  ('finances', false, 1), ('sante', true, 2), ('lecture', false, 3), ('etudes', false, 4),
  ('carriere', false, 5), ('activite', false, 6), ('spiritualite', true, 7), ('maison', false, 8),
  ('habitudes', false, 9), ('autre', false, 10);

-- Limites des offres : SOURCE DE VÉRITÉ (src/domain/offres.ts n'en est qu'une copie d'affichage).
create table public.parametres_offres (
  offre text primary key check (offre in ('gratuit', 'premium')),
  max_objectifs_actifs int not null check (max_objectifs_actifs >= 0),
  quota_ia_mensuel int not null check (quota_ia_mensuel >= 0)
);

insert into public.parametres_offres values ('gratuit', 3, 5), ('premium', 30, 150);

-- =========================================================================
-- Profils et préférences
-- =========================================================================

create table public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  prenom text check (char_length(prenom) <= 60),
  langue text not null default 'fr' check (langue in ('fr', 'en')),
  fuseau_horaire text not null default 'Africa/Douala' check (char_length(fuseau_horaire) between 1 and 64),
  devise text not null default 'XAF' check (devise in ('XAF', 'XOF', 'EUR', 'USD')),
  minutes_par_jour int check (minutes_par_jour between 1 and 1440),
  domaines text[] not null default '{}',
  module_spiritualite boolean not null default false,
  -- L'utilisateur peut refuser que ses objectifs soient envoyés au coach IA.
  partage_objectifs_ia boolean not null default true,
  onboarding_termine_le timestamptz,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);

create table public.preferences_notifications (
  user_id uuid primary key references public.profils (id) on delete cascade,
  actives boolean not null default false,
  heure_resume time,
  jours int[] not null default '{1,2,3,4,5,6,7}' check (jours <@ '{1,2,3,4,5,6,7}'::int[]),
  silence_debut time default '22:00',
  silence_fin time default '06:00',
  discretes boolean not null default false,
  bilan_hebdomadaire boolean not null default true,
  modifie_le timestamptz not null default now()
);

create table public.abonnements (
  user_id uuid primary key references public.profils (id) on delete cascade,
  offre text not null default 'gratuit' check (offre in ('gratuit', 'premium')),
  statut text not null default 'actif' check (statut in ('actif', 'essai', 'expire', 'annule')),
  plateforme text not null default 'aucune' check (plateforme in ('aucune', 'google_play', 'app_store', 'manuel')),
  expire_le timestamptz,
  reference_externe text,
  modifie_le timestamptz not null default now()
);

-- =========================================================================
-- Moteur d'objectifs
-- =========================================================================

create table public.objectifs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profils (id) on delete cascade,
  titre text not null check (char_length(btrim(titre)) between 1 and 120),
  description text check (char_length(description) <= 1000),
  categorie text not null references public.categories (code),
  type text not null check (type in ('quantitatif', 'recurrent', 'echeance')),
  statut text not null default 'actif' check (statut in ('actif', 'en_pause', 'termine', 'abandonne')),
  priorite smallint not null default 2 check (priorite between 1 and 3),
  date_debut date not null,
  date_echeance date,
  valeur_cible numeric check (valeur_cible > 0),
  valeur_initiale numeric not null default 0 check (valeur_initiale >= 0),
  unite text check (unite in ('argent', 'pages', 'minutes', 'seances', 'candidatures', 'chapitres', 'fois')),
  minutes_par_seance int check (minutes_par_seance between 1 and 600),
  rappel_actif boolean not null default false,
  rappel_heure time,
  source_plan text not null default 'regles' check (source_plan in ('regles', 'ia', 'manuel')),
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  unique (id, user_id),
  check (date_echeance is null or date_echeance >= date_debut),
  check (type <> 'quantitatif' or (valeur_cible is not null and date_echeance is not null and unite is not null)),
  check (not rappel_actif or rappel_heure is not null)
);
create index objectifs_user_statut on public.objectifs (user_id, statut);

create table public.etapes (
  id uuid primary key default gen_random_uuid(),
  objectif_id uuid not null,
  user_id uuid not null default auth.uid(),
  titre text not null check (char_length(btrim(titre)) between 1 and 160),
  ordre int not null default 0,
  date_cible date,
  valeur_cible numeric check (valeur_cible > 0),
  terminee_le timestamptz,
  cree_le timestamptz not null default now(),
  foreign key (objectif_id, user_id) references public.objectifs (id, user_id) on delete cascade
);
create index etapes_objectif on public.etapes (objectif_id, ordre);

create table public.recurrences (
  id uuid primary key default gen_random_uuid(),
  objectif_id uuid not null,
  user_id uuid not null default auth.uid(),
  titre text not null check (char_length(btrim(titre)) between 1 and 160),
  jours_semaine int[] not null check (cardinality(jours_semaine) >= 1 and jours_semaine <@ '{1,2,3,4,5,6,7}'::int[]),
  quantite numeric check (quantite > 0),
  minutes int check (minutes between 1 and 600),
  date_debut date not null,
  date_fin date,
  active boolean not null default true,
  -- Dernière date pour laquelle les actions ont été créées (évite de recréer le passé).
  genere_jusqu_au date,
  cree_le timestamptz not null default now(),
  unique (id, user_id),
  check (date_fin is null or date_fin >= date_debut),
  foreign key (objectif_id, user_id) references public.objectifs (id, user_id) on delete cascade
);
create index recurrences_objectif on public.recurrences (objectif_id);

create table public.actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  objectif_id uuid not null,
  etape_id uuid references public.etapes (id) on delete set null,
  recurrence_id uuid references public.recurrences (id) on delete set null,
  reportee_depuis uuid references public.actions (id) on delete set null,
  titre text not null check (char_length(btrim(titre)) between 1 and 160),
  date_prevue date not null,
  quantite_prevue numeric check (quantite_prevue > 0),
  minutes_prevues int check (minutes_prevues between 1 and 600),
  statut text not null default 'a_faire' check (statut in ('a_faire', 'terminee', 'reportee', 'ignoree', 'annulee')),
  quantite_realisee numeric check (quantite_realisee >= 0),
  terminee_le timestamptz,
  raison text check (char_length(raison) <= 300),
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  -- Une occurrence de récurrence n'existe qu'une fois par jour : génération idempotente.
  unique (recurrence_id, date_prevue),
  check ((statut = 'terminee') = (terminee_le is not null)),
  foreign key (objectif_id, user_id) references public.objectifs (id, user_id) on delete cascade
);
create index actions_user_date on public.actions (user_id, date_prevue);
create index actions_objectif on public.actions (objectif_id, date_prevue);

-- Historique des changements d'état : rempli uniquement par trigger.
create table public.historique_actions (
  id bigint generated always as identity primary key,
  action_id uuid not null references public.actions (id) on delete cascade,
  user_id uuid not null references public.profils (id) on delete cascade,
  ancien_statut text,
  nouveau_statut text not null,
  details jsonb not null default '{}',
  cree_le timestamptz not null default now()
);
create index historique_user_date on public.historique_actions (user_id, cree_le desc);

create table public.evenements_progression (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  objectif_id uuid not null,
  action_id uuid references public.actions (id) on delete cascade,
  type text not null check (type in ('contribution', 'jalon_atteint', 'plan_ajuste', 'reprise')),
  valeur numeric,
  note text check (char_length(note) <= 300),
  date_evenement date not null,
  cree_le timestamptz not null default now(),
  check (type <> 'contribution' or valeur is not null),
  foreign key (objectif_id, user_id) references public.objectifs (id, user_id) on delete cascade
);
create index evenements_objectif on public.evenements_progression (objectif_id, date_evenement);
create index evenements_user_date on public.evenements_progression (user_id, cree_le desc);
-- Une action terminée ne compte qu'une fois (protège contre la double validation).
create unique index evenements_une_contribution_par_action
  on public.evenements_progression (action_id) where type = 'contribution' and action_id is not null;

-- =========================================================================
-- Coach, IA, appareils, journal
-- =========================================================================

create table public.usage_ia (
  user_id uuid not null references public.profils (id) on delete cascade,
  mois date not null,
  requetes int not null default 0 check (requetes >= 0),
  primary key (user_id, mois)
);

create table public.messages_coach (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profils (id) on delete cascade,
  role text not null check (role in ('utilisateur', 'coach')),
  contenu text not null check (char_length(contenu) between 1 and 4000),
  source text not null check (source in ('ia', 'regles')),
  cree_le timestamptz not null default now()
);
create index messages_coach_user on public.messages_coach (user_id, cree_le desc);

create table public.jetons_push (
  user_id uuid not null default auth.uid() references public.profils (id) on delete cascade,
  jeton text not null check (char_length(jeton) <= 300),
  plateforme text not null check (plateforme in ('android', 'ios')),
  cree_le timestamptz not null default now(),
  primary key (user_id, jeton)
);

-- Journal des opérations sensibles. Pas de données personnelles en clair, aucun accès client.
create table public.journal_securite (
  id bigint generated always as identity primary key,
  user_id uuid,
  type text not null,
  details jsonb not null default '{}',
  cree_le timestamptz not null default now()
);

-- =========================================================================
-- Fonctions utilitaires et triggers
-- =========================================================================

create or replace function public.maj_modifie_le() returns trigger
language plpgsql set search_path = public as $$
begin
  new.modifie_le := now();
  return new;
end $$;

create trigger profils_modifie before update on public.profils for each row execute function public.maj_modifie_le();
create trigger prefs_modifie before update on public.preferences_notifications for each row execute function public.maj_modifie_le();
create trigger objectifs_modifie before update on public.objectifs for each row execute function public.maj_modifie_le();
create trigger actions_modifie before update on public.actions for each row execute function public.maj_modifie_le();
create trigger abonnements_modifie before update on public.abonnements for each row execute function public.maj_modifie_le();

-- Refuse un fuseau horaire inconnu de PostgreSQL.
create or replace function public.verifier_fuseau() returns trigger
language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from pg_timezone_names where name = new.fuseau_horaire) then
    raise exception 'fuseau_invalide' using errcode = '22023';
  end if;
  return new;
end $$;

create trigger profils_fuseau before insert or update of fuseau_horaire on public.profils
  for each row execute function public.verifier_fuseau();

-- Création automatique du profil, des préférences et de l'offre gratuite à l'inscription.
create or replace function public.creer_profil_utilisateur() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_langue text := new.raw_user_meta_data ->> 'langue';
begin
  insert into public.profils (id, langue)
  values (new.id, case when v_langue in ('fr', 'en') then v_langue else 'fr' end);
  insert into public.preferences_notifications (user_id) values (new.id);
  insert into public.abonnements (user_id) values (new.id);
  return new;
end $$;

create trigger utilisateur_cree after insert on auth.users
  for each row execute function public.creer_profil_utilisateur();

-- Offre réellement active (un Premium expiré redevient gratuit).
create or replace function public.offre_effective(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((
    select 'premium' from public.abonnements a
    where a.user_id = p_user and a.offre = 'premium'
      and (
        (a.statut in ('actif', 'essai') and (a.expire_le is null or a.expire_le > now()))
        -- Renouvellement arrêté : l'accès reste valable jusqu'à la fin de la période payée.
        or (a.statut = 'annule' and a.expire_le > now())
      )
  ), 'gratuit');
$$;

-- Limite d'objectifs actifs vérifiée CÔTÉ SERVEUR.
create or replace function public.verifier_limite_objectifs() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_max int;
  v_actifs int;
begin
  if new.statut <> 'actif' or (tg_op = 'UPDATE' and old.statut = 'actif') then
    return new;
  end if;
  -- Ligne d'un autre utilisateur : on laisse la RLS la refuser, sans rien révéler de ses objectifs.
  if auth.uid() is not null and new.user_id is distinct from auth.uid() then
    return new;
  end if;
  select max_objectifs_actifs into v_max from public.parametres_offres
  where offre = public.offre_effective(new.user_id);
  select count(*) into v_actifs from public.objectifs
  where user_id = new.user_id and statut = 'actif' and id <> new.id;
  if v_actifs >= v_max then
    raise exception 'limite_objectifs' using errcode = 'P0001', hint = v_max::text;
  end if;
  return new;
end $$;

create trigger objectifs_limite before insert or update of statut on public.objectifs
  for each row execute function public.verifier_limite_objectifs();

-- Historique automatique de chaque création / changement d'état d'action.
create or replace function public.journaliser_action() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.statut is distinct from old.statut or new.date_prevue is distinct from old.date_prevue then
    insert into public.historique_actions (action_id, user_id, ancien_statut, nouveau_statut, details)
    values (
      new.id, new.user_id,
      case when tg_op = 'UPDATE' then old.statut end,
      new.statut,
      jsonb_strip_nulls(jsonb_build_object(
        'raison', new.raison,
        'quantite', new.quantite_realisee,
        'ancienne_date', case when tg_op = 'UPDATE' and new.date_prevue <> old.date_prevue then old.date_prevue end,
        'reportee_depuis', new.reportee_depuis
      ))
    );
  end if;
  return new;
end $$;

create trigger actions_historique after insert or update on public.actions
  for each row execute function public.journaliser_action();

-- Jalons : une étape avec valeur_cible est atteinte dès que le cumul la dépasse
-- (et redevient non atteinte si une contribution est annulée).
create or replace function public.recalculer_jalons(p_objectif uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_total numeric;
begin
  select o.valeur_initiale + coalesce(sum(e.valeur), 0) into v_total
  from public.objectifs o
  left join public.evenements_progression e on e.objectif_id = o.id and e.type = 'contribution'
  where o.id = p_objectif
  group by o.valeur_initiale;

  update public.etapes set terminee_le = now()
  where objectif_id = p_objectif and terminee_le is null and valeur_cible is not null and valeur_cible <= v_total;
  update public.etapes set terminee_le = null
  where objectif_id = p_objectif and terminee_le is not null and valeur_cible is not null and valeur_cible > v_total;
end $$;
revoke execute on function public.recalculer_jalons(uuid) from public, anon, authenticated;

create or replace function public.apres_contribution() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.recalculer_jalons(coalesce(new.objectif_id, old.objectif_id));
  return null;
end $$;

create trigger contributions_jalons after insert or update or delete on public.evenements_progression
  for each row execute function public.apres_contribution();

-- Date du jour dans le fuseau de l'utilisateur connecté.
create or replace function public.aujourdhui_utilisateur() returns date
language sql stable set search_path = public as $$
  select (now() at time zone coalesce(
    (select fuseau_horaire from public.profils where id = auth.uid()), 'UTC'))::date;
$$;

-- =========================================================================
-- Opérations métier (RPC appelées par l'application)
-- =========================================================================

-- Crée les actions des récurrences actives jusqu'à une date (au plus 60 jours devant).
-- Idempotente : on peut l'appeler à chaque ouverture de l'application.
create or replace function public.generer_actions_jusqu_au(p_jusqu_au date, p_objectif uuid default null)
returns int
language plpgsql set search_path = public as $$
declare
  v_aujourdhui date := public.aujourdhui_utilisateur();
  v_limite date := least(p_jusqu_au, v_aujourdhui + 60);
  v_crees int;
begin
  with a_creer as (
    select r.id as recurrence_id, r.objectif_id, r.user_id, r.titre, r.quantite, r.minutes, d::date as jour
    from public.recurrences r
    join public.objectifs o on o.id = r.objectif_id and o.statut = 'actif'
    cross join lateral generate_series(
      greatest(r.date_debut, coalesce(r.genere_jusqu_au + 1, r.date_debut), v_aujourdhui),
      least(coalesce(r.date_fin, v_limite), v_limite),
      interval '1 day') as d
    where r.user_id = auth.uid() and r.active
      and (p_objectif is null or r.objectif_id = p_objectif)
      and extract(isodow from d)::int = any (r.jours_semaine)
  ), inserees as (
    insert into public.actions (user_id, objectif_id, recurrence_id, titre, date_prevue, quantite_prevue, minutes_prevues)
    select user_id, objectif_id, recurrence_id, titre, jour, quantite, minutes from a_creer
    on conflict (recurrence_id, date_prevue) do nothing
    returning 1
  )
  select count(*) into v_crees from inserees;

  update public.recurrences r
  set genere_jusqu_au = greatest(coalesce(r.genere_jusqu_au, v_limite), least(coalesce(r.date_fin, v_limite), v_limite))
  from public.objectifs o
  where o.id = r.objectif_id and o.statut = 'actif' and r.user_id = auth.uid() and r.active
    and (p_objectif is null or r.objectif_id = p_objectif);

  return v_crees;
end $$;

-- Crée un objectif et son plan (étapes + récurrences) en une seule transaction.
create or replace function public.creer_objectif_avec_plan(
  p_objectif jsonb, p_etapes jsonb, p_recurrences jsonb, p_horizon date
) returns uuid
language plpgsql set search_path = public as $$
declare
  v_id uuid;
  v_etape jsonb;
  v_rec jsonb;
  v_ordre int := 0;
begin
  if auth.uid() is null then
    raise exception 'non_connecte' using errcode = '42501';
  end if;

  insert into public.objectifs (
    titre, description, categorie, type, priorite, date_debut, date_echeance,
    valeur_cible, valeur_initiale, unite, minutes_par_seance, rappel_actif, rappel_heure, source_plan
  ) values (
    p_objectif ->> 'titre', nullif(p_objectif ->> 'description', ''), p_objectif ->> 'categorie',
    p_objectif ->> 'type', coalesce((p_objectif ->> 'priorite')::smallint, 2),
    (p_objectif ->> 'date_debut')::date, (p_objectif ->> 'date_echeance')::date,
    (p_objectif ->> 'valeur_cible')::numeric, coalesce((p_objectif ->> 'valeur_initiale')::numeric, 0),
    p_objectif ->> 'unite', (p_objectif ->> 'minutes_par_seance')::int,
    coalesce((p_objectif ->> 'rappel_actif')::boolean, false), (p_objectif ->> 'rappel_heure')::time,
    coalesce(p_objectif ->> 'source_plan', 'regles')
  ) returning id into v_id;

  for v_etape in select * from jsonb_array_elements(coalesce(p_etapes, '[]'::jsonb)) loop
    v_ordre := v_ordre + 1;
    insert into public.etapes (objectif_id, titre, ordre, date_cible, valeur_cible)
    values (v_id, v_etape ->> 'titre', v_ordre, (v_etape ->> 'date_cible')::date, (v_etape ->> 'valeur_cible')::numeric);
  end loop;

  for v_rec in select * from jsonb_array_elements(coalesce(p_recurrences, '[]'::jsonb)) loop
    insert into public.recurrences (objectif_id, titre, jours_semaine, quantite, minutes, date_debut, date_fin)
    values (
      v_id, v_rec ->> 'titre',
      array(select jsonb_array_elements_text(v_rec -> 'jours_semaine')::int),
      (v_rec ->> 'quantite')::numeric, (v_rec ->> 'minutes')::int,
      (v_rec ->> 'date_debut')::date, (v_rec ->> 'date_fin')::date
    );
  end loop;

  perform public.generer_actions_jusqu_au(p_horizon, v_id);
  return v_id;
end $$;

-- Change l'état d'une action. Seul chemin pour modifier le statut (les colonnes de statut
-- ne sont pas modifiables directement par le client). Idempotente : valider deux fois une
-- action ne compte qu'une seule contribution.
create or replace function public.changer_statut_action(
  p_action uuid, p_statut text, p_quantite numeric default null,
  p_raison text default null, p_nouvelle_date date default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_action public.actions;
  v_objectif public.objectifs;
  v_aujourdhui date := public.aujourdhui_utilisateur();
  v_quantite numeric;
  v_nouvelle uuid;
begin
  if v_uid is null then
    raise exception 'non_connecte' using errcode = '42501';
  end if;
  select * into v_action from public.actions where id = p_action and user_id = v_uid for update;
  if not found then
    raise exception 'action_introuvable' using errcode = 'P0002';
  end if;
  if p_statut not in ('a_faire', 'terminee', 'reportee', 'ignoree', 'annulee') then
    raise exception 'statut_invalide' using errcode = '22023';
  end if;
  if v_action.statut = p_statut and p_statut <> 'reportee' then
    return jsonb_build_object('action', v_action.id, 'statut', v_action.statut, 'inchange', true);
  end if;
  if v_action.statut = 'reportee' then
    raise exception 'action_deja_reportee' using errcode = 'P0001';
  end if;
  select * into v_objectif from public.objectifs where id = v_action.objectif_id;

  -- Toute sortie de l'état « terminée » retire la contribution associée.
  if v_action.statut = 'terminee' then
    delete from public.evenements_progression where action_id = v_action.id and type = 'contribution';
  end if;

  if p_statut = 'terminee' then
    v_quantite := coalesce(p_quantite, v_action.quantite_prevue);
    if v_quantite is not null and v_quantite < 0 then
      raise exception 'quantite_invalide' using errcode = '22023';
    end if;
    update public.actions
    set statut = 'terminee', terminee_le = now(), quantite_realisee = v_quantite, raison = null
    where id = v_action.id;
    if v_objectif.type = 'quantitatif' and coalesce(v_quantite, 0) > 0 then
      insert into public.evenements_progression (user_id, objectif_id, action_id, type, valeur, date_evenement)
      values (v_uid, v_action.objectif_id, v_action.id, 'contribution', v_quantite, v_aujourdhui)
      on conflict do nothing;
    end if;

  elsif p_statut = 'reportee' then
    if p_nouvelle_date is null or p_nouvelle_date < v_aujourdhui then
      raise exception 'date_report_invalide' using errcode = '22023';
    end if;
    if v_action.statut = 'terminee' then
      raise exception 'action_deja_terminee' using errcode = 'P0001';
    end if;
    update public.actions set statut = 'reportee', terminee_le = null, quantite_realisee = null, raison = left(p_raison, 300)
    where id = v_action.id;
    insert into public.actions (user_id, objectif_id, etape_id, reportee_depuis, titre, date_prevue, quantite_prevue, minutes_prevues)
    values (v_uid, v_action.objectif_id, v_action.etape_id, v_action.id, v_action.titre, p_nouvelle_date,
            v_action.quantite_prevue, v_action.minutes_prevues)
    returning id into v_nouvelle;

  else -- a_faire, ignoree, annulee
    update public.actions
    set statut = p_statut, terminee_le = null, quantite_realisee = null,
        raison = case when p_statut = 'a_faire' then null else left(p_raison, 300) end
    where id = v_action.id;
  end if;

  return jsonb_strip_nulls(jsonb_build_object('action', v_action.id, 'statut', p_statut, 'nouvelle_action', v_nouvelle));
end $$;

-- Reprise après un retard. Les actions manquées des 14 derniers jours sont marquées
-- « ignorées » (raison : reprise) pour repartir proprement, puis l'option choisie s'applique.
create or replace function public.reprendre_objectif(
  p_objectif uuid, p_option text, p_titre_action text default null,
  p_jours int default 7, p_facteur numeric default 0.5
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_objectif public.objectifs;
  v_aujourdhui date := public.aujourdhui_utilisateur();
  v_manquees int;
  v_reste numeric;
  v_rec public.recurrences;
  v_seances int;
  v_quantite numeric;
begin
  select * into v_objectif from public.objectifs where id = p_objectif and user_id = v_uid for update;
  if not found then
    raise exception 'objectif_introuvable' using errcode = 'P0002';
  end if;
  if p_option not in ('action_minimale', 'reduire_effort', 'decaler_echeance', 'nouveau_planning') then
    raise exception 'option_invalide' using errcode = '22023';
  end if;
  if p_jours not between 1 and 90 or p_facteur <= 0 or p_facteur > 1 then
    raise exception 'parametre_invalide' using errcode = '22023';
  end if;

  update public.actions set statut = 'ignoree', raison = 'reprise'
  where objectif_id = p_objectif and statut = 'a_faire'
    and date_prevue < v_aujourdhui and date_prevue >= v_aujourdhui - 14;
  get diagnostics v_manquees = row_count;

  if p_option = 'action_minimale' then
    insert into public.actions (user_id, objectif_id, titre, date_prevue, minutes_prevues)
    values (v_uid, p_objectif, coalesce(nullif(btrim(p_titre_action), ''), v_objectif.titre), v_aujourdhui, 5);

  elsif p_option = 'reduire_effort' then
    -- Réduction TEMPORAIRE : seules les actions déjà créées des p_jours prochains jours changent.
    update public.actions
    set quantite_prevue = case when quantite_prevue is null then null else greatest(1, ceil(quantite_prevue * p_facteur)) end,
        minutes_prevues = case when minutes_prevues is null then null else greatest(1, ceil(minutes_prevues * p_facteur))::int end
    where objectif_id = p_objectif and statut = 'a_faire'
      and date_prevue between v_aujourdhui and v_aujourdhui + p_jours;

  elsif p_option = 'decaler_echeance' then
    if v_objectif.date_echeance is null then
      raise exception 'pas_d_echeance' using errcode = 'P0001';
    end if;
    update public.recurrences set date_fin = date_fin + p_jours
    where objectif_id = p_objectif and date_fin = v_objectif.date_echeance;
    update public.objectifs set date_echeance = date_echeance + p_jours where id = p_objectif;

  elsif p_option = 'nouveau_planning' and v_objectif.type = 'quantitatif' then
    -- Répartit ce qui reste sur les séances restantes jusqu'à l'échéance.
    select greatest(0, v_objectif.valeur_cible - v_objectif.valeur_initiale - coalesce(sum(valeur), 0))
    into v_reste from public.evenements_progression where objectif_id = p_objectif and type = 'contribution';
    for v_rec in select * from public.recurrences where objectif_id = p_objectif and active loop
      select count(*) into v_seances
      from generate_series(greatest(v_aujourdhui, v_rec.date_debut), coalesce(v_rec.date_fin, v_objectif.date_echeance), interval '1 day') d
      where extract(isodow from d)::int = any (v_rec.jours_semaine);
      if v_seances > 0 and v_reste > 0 then
        v_quantite := ceil(v_reste / v_seances);
        update public.recurrences set quantite = v_quantite where id = v_rec.id;
        update public.actions set quantite_prevue = v_quantite
        where recurrence_id = v_rec.id and statut = 'a_faire' and date_prevue >= v_aujourdhui;
      end if;
    end loop;
  end if;

  insert into public.evenements_progression (user_id, objectif_id, type, note, date_evenement)
  values (v_uid, p_objectif, 'reprise', p_option, v_aujourdhui);

  return jsonb_build_object('manquees_ignorees', v_manquees, 'option', p_option);
end $$;

-- Modifie le rythme d'une récurrence : les actions futures non faites sont recréées
-- selon les nouveaux jours et la nouvelle quantité. Le passé et les actions faites ne changent pas.
create or replace function public.modifier_rythme(
  p_recurrence uuid, p_jours int[], p_quantite numeric, p_minutes int, p_horizon date
) returns int
language plpgsql set search_path = public as $$
declare
  v_aujourdhui date := public.aujourdhui_utilisateur();
  v_rec public.recurrences;
begin
  select * into v_rec from public.recurrences where id = p_recurrence and user_id = auth.uid() for update;
  if not found then
    raise exception 'recurrence_introuvable' using errcode = 'P0002';
  end if;
  update public.recurrences
  set jours_semaine = p_jours, quantite = p_quantite, minutes = p_minutes, genere_jusqu_au = v_aujourdhui - 1
  where id = p_recurrence;
  delete from public.actions
  where recurrence_id = p_recurrence and statut = 'a_faire' and date_prevue >= v_aujourdhui;
  return public.generer_actions_jusqu_au(p_horizon, v_rec.objectif_id);
end $$;

-- Quota IA : appelé UNIQUEMENT par la fonction serveur (clé service role).
create or replace function public.consommer_quota_ia(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_mois date := date_trunc('month', now())::date;
  v_quota int;
  v_utilise int;
begin
  select quota_ia_mensuel into v_quota from public.parametres_offres where offre = public.offre_effective(p_user);
  insert into public.usage_ia (user_id, mois, requetes) values (p_user, v_mois, 0)
  on conflict (user_id, mois) do nothing;
  select requetes into v_utilise from public.usage_ia where user_id = p_user and mois = v_mois for update;
  if v_utilise >= v_quota then
    return jsonb_build_object('autorise', false, 'utilise', v_utilise, 'quota', v_quota);
  end if;
  update public.usage_ia set requetes = requetes + 1 where user_id = p_user and mois = v_mois;
  return jsonb_build_object('autorise', true, 'utilise', v_utilise + 1, 'quota', v_quota);
end $$;

-- =========================================================================
-- Droits et Row Level Security
-- =========================================================================

alter table public.categories enable row level security;
alter table public.parametres_offres enable row level security;
alter table public.profils enable row level security;
alter table public.preferences_notifications enable row level security;
alter table public.abonnements enable row level security;
alter table public.objectifs enable row level security;
alter table public.etapes enable row level security;
alter table public.recurrences enable row level security;
alter table public.actions enable row level security;
alter table public.historique_actions enable row level security;
alter table public.evenements_progression enable row level security;
alter table public.usage_ia enable row level security;
alter table public.messages_coach enable row level security;
alter table public.jetons_push enable row level security;
alter table public.journal_securite enable row level security;

-- Aucun accès anonyme aux données.
revoke all on all tables in schema public from anon;

-- Lecture seule des références.
create policy categories_lecture on public.categories for select to authenticated using (true);
create policy offres_lecture on public.parametres_offres for select to authenticated using (true);

-- Profil : lecture et modification de SON profil (création par trigger, suppression via le compte).
create policy profils_lecture on public.profils for select to authenticated using (id = (select auth.uid()));
create policy profils_modif on public.profils for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke insert, update, delete on public.profils from authenticated;
grant update (prenom, langue, fuseau_horaire, devise, minutes_par_jour, domaines, module_spiritualite,
  partage_objectifs_ia, onboarding_termine_le) on public.profils to authenticated;

create policy prefs_lecture on public.preferences_notifications for select to authenticated using (user_id = (select auth.uid()));
create policy prefs_modif on public.preferences_notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke insert, update, delete on public.preferences_notifications from authenticated;
grant update (actives, heure_resume, jours, silence_debut, silence_fin, discretes, bilan_hebdomadaire)
  on public.preferences_notifications to authenticated;

-- Abonnement : lecture seule. Seul le serveur (webhook des boutiques) le modifie.
create policy abonnements_lecture on public.abonnements for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.abonnements from authenticated;

-- Objectifs, étapes, récurrences : tout sur ses propres lignes.
create policy objectifs_proprietaire on public.objectifs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy etapes_proprietaire on public.etapes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy recurrences_proprietaire on public.recurrences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Actions : création en « à faire » seulement ; le statut ne change que par changer_statut_action.
create policy actions_lecture on public.actions for select to authenticated using (user_id = (select auth.uid()));
create policy actions_creation on public.actions for insert to authenticated
  with check (user_id = (select auth.uid()) and statut = 'a_faire' and terminee_le is null and quantite_realisee is null);
create policy actions_modif on public.actions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy actions_suppression on public.actions for delete to authenticated using (user_id = (select auth.uid()));
revoke update on public.actions from authenticated;
grant update (titre, date_prevue, quantite_prevue, minutes_prevues) on public.actions to authenticated;

create policy historique_lecture on public.historique_actions for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.historique_actions from authenticated;

-- Événements : lecture ; ajout / suppression manuels uniquement pour les contributions libres.
create policy evenements_lecture on public.evenements_progression for select to authenticated using (user_id = (select auth.uid()));
create policy evenements_contribution on public.evenements_progression for insert to authenticated
  with check (user_id = (select auth.uid()) and type = 'contribution' and action_id is null);
create policy evenements_suppression on public.evenements_progression for delete to authenticated
  using (user_id = (select auth.uid()) and type = 'contribution' and action_id is null);
revoke update on public.evenements_progression from authenticated;

create policy usage_ia_lecture on public.usage_ia for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.usage_ia from authenticated;

create policy messages_lecture on public.messages_coach for select to authenticated using (user_id = (select auth.uid()));
create policy messages_suppression on public.messages_coach for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update on public.messages_coach from authenticated;

create policy jetons_proprietaire on public.jetons_push for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- journal_securite : aucune policy => aucun accès client.
revoke all on public.journal_securite from authenticated;

-- Fonctions réservées au serveur.
revoke execute on function public.consommer_quota_ia(uuid) from public, anon, authenticated;
revoke execute on function public.offre_effective(uuid) from public, anon, authenticated;
revoke execute on function public.creer_profil_utilisateur() from public, anon, authenticated;
revoke execute on function public.generer_actions_jusqu_au(date, uuid) from anon;
revoke execute on function public.creer_objectif_avec_plan(jsonb, jsonb, jsonb, date) from anon;
revoke execute on function public.changer_statut_action(uuid, text, numeric, text, date) from anon;
revoke execute on function public.reprendre_objectif(uuid, text, text, int, numeric) from anon;
revoke execute on function public.modifier_rythme(uuid, int[], numeric, int, date) from anon;
