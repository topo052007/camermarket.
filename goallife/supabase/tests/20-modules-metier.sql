-- Tests du module candidatures et des nouvelles unités. S'exécute après 10-*.sql
-- (réutilise le schéma tst ; Alice a été supprimée, Bob existe encore).

\set bob '''22222222-2222-2222-2222-222222222222'''
\set carine '''33333333-3333-3333-3333-333333333333'''

insert into auth.users (id, email) values (:carine, 'carine@test.local');

set role authenticated;
select tst.en_tant_que(:carine);

-- Nouvelles unités acceptées
insert into public.objectifs (titre, categorie, type, date_debut, date_echeance, valeur_cible, unite)
values ('Boire de l''eau', 'sante', 'quantitatif', current_date, current_date + 6, 56, 'verres');
select tst.echoue('insert into public.objectifs (titre, categorie, type, date_debut, date_echeance, valeur_cible, unite) values (''x'', ''autre'', ''quantitatif'', current_date, current_date, 1, ''litres'')',
  'objectifs_unite_check', 'unité inconnue refusée');
delete from public.objectifs where unite = 'verres';

-- Objectif : 5 candidatures
insert into public.objectifs (titre, categorie, type, date_debut, date_echeance, valeur_cible, unite)
values ('Envoyer 5 candidatures', 'carriere', 'quantitatif', current_date, current_date + 13, 5, 'candidatures')
returning id as obj_c \gset

insert into public.candidatures (objectif_id, entreprise, poste) values (:'obj_c', 'Brasseries du Cameroun', 'Comptable')
returning id as cand_1 \gset
select tst.ok(not exists (select 1 from public.evenements_progression), 'une candidature à envoyer ne compte pas');

update public.candidatures set statut = 'envoyee', envoyee_le = current_date where id = :'cand_1';
select tst.ok((select sum(valeur) from public.evenements_progression where objectif_id = :'obj_c') = 1, 'candidature envoyée = +1');
update public.candidatures set statut = 'entretien' where id = :'cand_1';
select tst.ok((select count(*) from public.evenements_progression where candidature_id = :'cand_1') = 1, 'pas de double comptage (entretien)');
update public.candidatures set statut = 'a_envoyer' where id = :'cand_1';
select tst.ok(not exists (select 1 from public.evenements_progression where candidature_id = :'cand_1'), 'retour à « à envoyer » : contribution retirée');
update public.candidatures set statut = 'envoyee' where id = :'cand_1';

-- La contribution liée n'est pas supprimable à la main
delete from public.evenements_progression where candidature_id = :'cand_1';
select tst.ok(exists (select 1 from public.evenements_progression where candidature_id = :'cand_1'), 'contribution de candidature protégée');
select tst.echoue(format('insert into public.evenements_progression (objectif_id, candidature_id, type, valeur, date_evenement) values (%L, %L, %L, 1, current_date)',
  :'obj_c', :'cand_1', 'contribution'), 'row-level security', 'impossible de forger une contribution de candidature');

-- Candidature sans objectif : acceptée, ne compte nulle part
insert into public.candidatures (entreprise, statut) values ('Orange Cameroun', 'envoyee');
select tst.ok((select count(*) from public.evenements_progression where objectif_id = :'obj_c') = 1, 'candidature libre sans effet sur la progression');

-- Supprimer l'objectif garde les candidatures
delete from public.objectifs where id = :'obj_c';
select tst.ok((select count(*) from public.candidatures) = 2, 'candidatures conservées après suppression de l''objectif');
select tst.ok((select objectif_id from public.candidatures where id = :'cand_1') is null, 'lien vers l''objectif supprimé effacé');

-- Bob ne voit pas les candidatures de Carine (privées par défaut)
select tst.en_tant_que(:bob);
select tst.ok((select count(*) from public.candidatures) = 0, 'candidatures privées');
update public.candidatures set entreprise = 'Piraté';
select tst.echoue(format('insert into public.candidatures (user_id, entreprise) values (%L, %L)', :carine, 'Intrus'),
  'row-level security', 'Bob ne crée pas de candidature pour Carine');
reset role;
select tst.ok(not exists (select 1 from public.candidatures where entreprise = 'Piraté'), 'candidatures de Carine intactes');

-- Suppression du compte : candidatures effacées
delete from auth.users where id = :carine;
select tst.ok(not exists (select 1 from public.candidatures where user_id = :carine), 'candidatures supprimées avec le compte');

\echo '   tests des modules métier passés'
