-- Modules métier : nouvelles unités et suivi des candidatures (emploi et carrière).
-- Tout s'appuie sur le moteur existant (objectifs, actions, événements de progression).

-- =========================================================================
-- Unités supplémentaires : verres (hydratation), heures (sommeil, étude)
-- =========================================================================

alter table public.objectifs drop constraint objectifs_unite_check;
alter table public.objectifs add constraint objectifs_unite_check
  check (unite in ('argent', 'pages', 'minutes', 'seances', 'candidatures', 'chapitres', 'fois', 'verres', 'heures'));

-- =========================================================================
-- Candidatures (privées : visibles uniquement par leur propriétaire)
-- =========================================================================

create table public.candidatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profils (id) on delete cascade,
  -- Objectif de recherche d'emploi associé (facultatif). Supprimer l'objectif garde la candidature.
  objectif_id uuid,
  entreprise text not null check (char_length(btrim(entreprise)) between 1 and 120),
  poste text check (char_length(poste) <= 120),
  statut text not null default 'a_envoyer'
    check (statut in ('a_envoyer', 'envoyee', 'entretien', 'offre', 'refusee', 'abandonnee')),
  envoyee_le date,
  relance_le date,
  lien text check (char_length(lien) <= 500),
  notes text check (char_length(notes) <= 1000),
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  foreign key (objectif_id, user_id) references public.objectifs (id, user_id) on delete set null (objectif_id)
);
create index candidatures_user on public.candidatures (user_id, statut, modifie_le desc);
create index candidatures_objectif on public.candidatures (objectif_id);

create trigger candidatures_modifie before update on public.candidatures
  for each row execute function public.maj_modifie_le();

alter table public.candidatures enable row level security;
create policy candidatures_proprietaire on public.candidatures for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.candidatures from anon;

-- Une candidature envoyée compte comme une contribution de l'objectif associé
-- (si c'est un objectif chiffré en « candidatures »). Une seule fois par candidature.
alter table public.evenements_progression
  add column candidature_id uuid references public.candidatures (id) on delete cascade;
create unique index evenements_une_contribution_par_candidature
  on public.evenements_progression (candidature_id) where candidature_id is not null;

-- Les contributions saisies à la main restent les seules modifiables par le client.
drop policy evenements_contribution on public.evenements_progression;
drop policy evenements_suppression on public.evenements_progression;
create policy evenements_contribution on public.evenements_progression for insert to authenticated
  with check (user_id = (select auth.uid()) and type = 'contribution' and action_id is null and candidature_id is null);
create policy evenements_suppression on public.evenements_progression for delete to authenticated
  using (user_id = (select auth.uid()) and type = 'contribution' and action_id is null and candidature_id is null);

create or replace function public.synchroniser_contribution_candidature() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_compte boolean;
begin
  if tg_op = 'DELETE' then
    return old; -- la contribution disparaît par cascade
  end if;
  v_compte := new.statut in ('envoyee', 'entretien', 'offre', 'refusee')
    and new.objectif_id is not null
    and exists (
      select 1 from public.objectifs o
      where o.id = new.objectif_id and o.user_id = new.user_id
        and o.type = 'quantitatif' and o.unite = 'candidatures'
    );
  if not v_compte or (tg_op = 'UPDATE' and new.objectif_id is distinct from old.objectif_id) then
    delete from public.evenements_progression where candidature_id = new.id;
  end if;
  if v_compte then
    insert into public.evenements_progression (user_id, objectif_id, candidature_id, type, valeur, date_evenement)
    values (new.user_id, new.objectif_id, new.id, 'contribution', 1, coalesce(new.envoyee_le, public.aujourdhui_utilisateur()))
    on conflict do nothing;
  end if;
  return new;
end $$;
revoke execute on function public.synchroniser_contribution_candidature() from public, anon, authenticated;

create trigger candidatures_contribution after insert or update on public.candidatures
  for each row execute function public.synchroniser_contribution_candidature();
