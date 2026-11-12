-- Tests de sécurité (RLS, droits) et de logique métier (RPC, triggers).
-- Exécutés par scripts/test-db.sh sur une base jetable. Chaque échec arrête le script.

create schema tst;
grant usage on schema tst to anon, authenticated, service_role;

create function tst.ok(condition boolean, message text) returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'ÉCHEC : %', message;
  end if;
end $$;

create function tst.en_tant_que(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, false);
$$;

-- Vérifie qu'une requête échoue (et que le message contient le texte attendu).
create function tst.echoue(requete text, attendu text, message text) returns void language plpgsql as $$
begin
  begin
    execute requete;
  exception when others then
    if attendu is null or sqlerrm ilike '%' || attendu || '%' then
      return;
    end if;
    raise exception 'ÉCHEC : % (erreur inattendue : %)', message, sqlerrm;
  end;
  raise exception 'ÉCHEC : % (la requête aurait dû échouer)', message;
end $$;

grant execute on all functions in schema tst to anon, authenticated, service_role;

\set alice '''11111111-1111-1111-1111-111111111111'''
\set bob '''22222222-2222-2222-2222-222222222222'''

-- ---------------------------------------------------------------------------
-- Inscription : profil, préférences et offre gratuite créés automatiquement
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  (:alice, 'alice@test.local', '{"langue":"fr"}'),
  (:bob, 'bob@test.local', '{"langue":"en"}');

select tst.ok((select count(*) from public.profils) = 2, 'un profil par utilisateur');
select tst.ok((select langue from public.profils where id = :bob) = 'en', 'langue reprise de l''inscription');
select tst.ok((select count(*) from public.preferences_notifications) = 2, 'préférences créées');
select tst.ok((select count(*) from public.abonnements where offre = 'gratuit') = 2, 'offre gratuite par défaut');

-- ---------------------------------------------------------------------------
-- Anonyme : aucun accès
-- ---------------------------------------------------------------------------
set role anon;
select tst.echoue('select * from public.objectifs', 'permission denied', 'anonyme ne lit pas les objectifs');
select tst.echoue('select * from public.profils', 'permission denied', 'anonyme ne lit pas les profils');
reset role;

-- ---------------------------------------------------------------------------
-- Alice crée « Économiser 50 000 FCFA en 60 jours » avec un plan quotidien
-- ---------------------------------------------------------------------------
set role authenticated;
select tst.en_tant_que(:alice);

select public.creer_objectif_avec_plan(
  jsonb_build_object(
    'titre', 'Économiser 50 000 FCFA', 'categorie', 'finances', 'type', 'quantitatif',
    'date_debut', public.aujourdhui_utilisateur(), 'date_echeance', public.aujourdhui_utilisateur() + 59,
    'valeur_cible', 50000, 'unite', 'argent'),
  jsonb_build_array(
    jsonb_build_object('titre', 'Atteindre 12 500', 'valeur_cible', 12500),
    jsonb_build_object('titre', 'Atteindre 50 000', 'valeur_cible', 50000)),
  jsonb_build_array(jsonb_build_object(
    'titre', 'Mettre de l''argent de côté', 'jours_semaine', jsonb_build_array(1,2,3,4,5,6,7),
    'quantite', 834, 'date_debut', public.aujourdhui_utilisateur(),
    'date_fin', public.aujourdhui_utilisateur() + 59)),
  public.aujourdhui_utilisateur() + 14
) as obj_a \gset

select tst.ok((select count(*) from public.objectifs) = 1, 'Alice voit son objectif');
select tst.ok((select count(*) from public.actions) = 15, 'actions créées pour 15 jours (aujourd''hui + 14)');
select tst.ok(public.generer_actions_jusqu_au(public.aujourdhui_utilisateur() + 14) = 0, 'génération idempotente');
select tst.ok(public.generer_actions_jusqu_au(public.aujourdhui_utilisateur() + 20) = 6, 'extension de l''horizon');
select tst.ok(public.generer_actions_jusqu_au(public.aujourdhui_utilisateur() + 500) = 39, 'horizon plafonné à l''échéance');
select tst.ok((select count(*) from public.historique_actions) = 60, 'historique de création des actions');

select id as action_a from public.actions where date_prevue = public.aujourdhui_utilisateur() \gset
select id as action_demain from public.actions where date_prevue = public.aujourdhui_utilisateur() + 1 \gset

-- Valider deux fois ne compte qu'une contribution
select public.changer_statut_action(:'action_a', 'terminee');
select tst.ok((public.changer_statut_action(:'action_a', 'terminee') ->> 'inchange')::boolean, 'double validation sans effet');
select tst.ok((select sum(valeur) from public.evenements_progression where type = 'contribution') = 834, 'une seule contribution');

-- Le statut ne se modifie pas directement
select tst.echoue(format('update public.actions set statut = %L where id = %L', 'terminee', :'action_demain'),
  'permission denied', 'statut non modifiable sans la fonction');
select tst.echoue(format('insert into public.actions (objectif_id, titre, date_prevue, statut, terminee_le) values (%L, %L, current_date, %L, now())',
  :'obj_a', 'Triche', 'terminee'), 'row-level security', 'impossible de créer une action déjà terminée');
-- Mais le titre et la date oui
update public.actions set titre = 'Épargne du jour' where id = :'action_demain';

-- Annuler la validation retire la contribution
select public.changer_statut_action(:'action_a', 'a_faire');
select tst.ok(not exists (select 1 from public.evenements_progression where type = 'contribution'), 'contribution retirée');
select public.changer_statut_action(:'action_a', 'terminee', 1000);
select tst.ok((select sum(valeur) from public.evenements_progression where type = 'contribution') = 1000, 'quantité réelle saisie');

-- Jalons recalculés automatiquement
insert into public.evenements_progression (objectif_id, type, valeur, date_evenement)
values (:'obj_a', 'contribution', 11500, public.aujourdhui_utilisateur());
select tst.ok((select terminee_le is not null from public.etapes where valeur_cible = 12500), 'jalon 12 500 atteint');
select tst.ok((select terminee_le is null from public.etapes where valeur_cible = 50000), 'jalon 50 000 non atteint');
delete from public.evenements_progression where type = 'contribution' and action_id is null;
select tst.ok((select terminee_le is null from public.etapes where valeur_cible = 12500), 'jalon annulé avec la contribution');
select tst.echoue(format('insert into public.evenements_progression (objectif_id, type, date_evenement) values (%L, %L, current_date)',
  :'obj_a', 'jalon_atteint'), 'row-level security', 'seules les contributions sont saisies à la main');

-- Report : l'action d'origine est « reportée », une nouvelle est créée
select public.changer_statut_action(:'action_demain', 'reportee', null, 'Pas le temps', public.aujourdhui_utilisateur() + 3) as report \gset
select tst.ok((select statut from public.actions where id = :'action_demain') = 'reportee', 'action reportée');
select tst.ok((select count(*) from public.actions where reportee_depuis = :'action_demain' and date_prevue = public.aujourdhui_utilisateur() + 3) = 1, 'nouvelle action créée');
select tst.echoue(format('select public.changer_statut_action(%L, %L, null, null, current_date - 5)', :'action_a', 'reportee'),
  null, 'report dans le passé refusé');

-- Reprise après retard : actions manquées ignorées et rythme recalculé
insert into public.actions (objectif_id, titre, date_prevue, quantite_prevue)
select :'obj_a', 'Ancienne', public.aujourdhui_utilisateur() - g, 834 from generate_series(1, 3) g;
select public.reprendre_objectif(:'obj_a', 'nouveau_planning') as reprise \gset
select tst.ok((:'reprise'::jsonb ->> 'manquees_ignorees')::int = 3, 'trois actions manquées ignorées');
select tst.ok((select quantite from public.recurrences where objectif_id = :'obj_a') = ceil(49000 / 60.0), 'rythme recalculé sur les séances restantes');
select tst.ok(exists (select 1 from public.evenements_progression where type = 'reprise'), 'reprise tracée');

-- Modifier le rythme : 3 jours par semaine, 2 000 par séance
select id as rec_a from public.recurrences where objectif_id = :'obj_a' \gset
select public.modifier_rythme(:'rec_a', '{1,3,5}', 2000, null, public.aujourdhui_utilisateur() + 14);
select tst.ok(not exists (
  select 1 from public.actions where recurrence_id = :'rec_a' and statut = 'a_faire' and date_prevue >= public.aujourdhui_utilisateur()
    and (extract(isodow from date_prevue)::int <> all ('{1,3,5}') or quantite_prevue <> 2000)), 'actions futures recréées au nouveau rythme');
select tst.ok(exists (select 1 from public.actions where recurrence_id = :'rec_a' and date_prevue >= public.aujourdhui_utilisateur()), 'nouvelles actions créées');
select tst.ok((select statut from public.actions where id = :'action_a') = 'terminee', 'les actions faites ne bougent pas');

-- L'abonnement n'est pas modifiable par le client
select tst.echoue(format('update public.abonnements set offre = %L', 'premium'), 'permission denied', 'Premium non modifiable par le client');
select tst.echoue(format('select public.consommer_quota_ia(%L)', :alice), 'permission denied', 'quota IA réservé au serveur');
select tst.echoue(format('select public.offre_effective(%L)', :bob), 'permission denied', 'pas de lecture de l''offre d''un autre');
select tst.echoue(format('insert into public.messages_coach (user_id, role, contenu, source) values (%L, %L, %L, %L)',
  :alice, 'coach', 'faux', 'ia'), 'permission denied', 'le client ne peut pas écrire un message du coach');
select tst.echoue('update public.profils set fuseau_horaire = ''Mars/Olympus''', 'fuseau_invalide', 'fuseau inconnu refusé');
update public.profils set prenom = 'Alice', fuseau_horaire = 'Africa/Abidjan';

-- Limite gratuite : 3 objectifs actifs
insert into public.objectifs (titre, categorie, type, date_debut) values
  ('Lire', 'lecture', 'recurrent', current_date), ('Sport', 'sante', 'recurrent', current_date);
select tst.echoue('insert into public.objectifs (titre, categorie, type, date_debut) values (''Quatrième'', ''autre'', ''recurrent'', current_date)',
  'limite_objectifs', 'limite de l''offre gratuite appliquée côté serveur');
-- Un objectif en pause libère une place
update public.objectifs set statut = 'en_pause' where titre = 'Sport';
insert into public.objectifs (titre, categorie, type, date_debut) values ('Quatrième', 'autre', 'recurrent', current_date);
select tst.echoue('update public.objectifs set statut = ''actif'' where titre = ''Sport''', 'limite_objectifs', 'réactivation limitée');

-- ---------------------------------------------------------------------------
-- Bob ne voit ni ne modifie rien d'Alice
-- ---------------------------------------------------------------------------
select tst.en_tant_que(:bob);
select tst.ok((select count(*) from public.objectifs) = 0, 'Bob ne voit pas les objectifs d''Alice');
select tst.ok((select count(*) from public.actions) = 0, 'Bob ne voit pas les actions d''Alice');
select tst.ok((select count(*) from public.etapes) = 0, 'Bob ne voit pas les étapes d''Alice');
select tst.ok((select count(*) from public.historique_actions) = 0, 'Bob ne voit pas l''historique d''Alice');
select tst.ok((select count(*) from public.evenements_progression) = 0, 'Bob ne voit pas les contributions d''Alice');
select tst.ok((select count(*) from public.profils) = 1, 'Bob ne voit que son profil');
select tst.ok((select count(*) from public.abonnements) = 1, 'Bob ne voit que son abonnement');

update public.objectifs set titre = 'Piraté' where id = :'obj_a';
delete from public.objectifs where id = :'obj_a';
update public.profils set prenom = 'Piraté' where id = :alice;
select tst.echoue(format('select public.changer_statut_action(%L, %L)', :'action_a', 'annulee'), 'action_introuvable', 'Bob ne change pas une action d''Alice');
select tst.echoue(format('select public.reprendre_objectif(%L, %L)', :'obj_a', 'action_minimale'), 'objectif_introuvable', 'Bob ne reprend pas un objectif d''Alice');
select tst.echoue(format('insert into public.objectifs (user_id, titre, categorie, type, date_debut) values (%L, %L, %L, %L, current_date)',
  :alice, 'Intrus', 'autre', 'recurrent'), 'row-level security', 'Bob ne crée pas d''objectif pour Alice');
select tst.echoue(format('insert into public.etapes (objectif_id, titre) values (%L, %L)', :'obj_a', 'Intrus'),
  'foreign key', 'Bob ne rattache pas d''étape à l''objectif d''Alice');
select tst.echoue(format('insert into public.evenements_progression (objectif_id, type, valeur, date_evenement) values (%L, %L, 1, current_date)',
  :'obj_a', 'contribution'), 'foreign key', 'Bob ne contribue pas à l''objectif d''Alice');

reset role;
select tst.ok((select titre from public.objectifs where id = :'obj_a') = 'Économiser 50 000 FCFA', 'objectif d''Alice intact');
select tst.ok((select prenom from public.profils where id = :alice) = 'Alice', 'profil d''Alice intact');

-- ---------------------------------------------------------------------------
-- Premium (écrit par le serveur) et quota IA
-- ---------------------------------------------------------------------------
set role service_role;
update public.abonnements set offre = 'premium', statut = 'actif', plateforme = 'manuel', expire_le = now() + interval '30 days'
where user_id = :alice;
select tst.ok((public.consommer_quota_ia(:bob) ->> 'quota')::int = 5, 'quota gratuit');
select public.consommer_quota_ia(:bob) from generate_series(1, 4);
select tst.ok(not (public.consommer_quota_ia(:bob) ->> 'autorise')::boolean, 'quota gratuit épuisé');
select tst.ok((public.consommer_quota_ia(:alice) ->> 'quota')::int = 150, 'quota Premium');
reset role;

set role authenticated;
select tst.en_tant_que(:alice);
update public.objectifs set statut = 'actif' where titre = 'Sport';
select tst.ok((select count(*) from public.objectifs where statut = 'actif') = 4, 'Premium : plus de 3 objectifs actifs');
reset role;

set role service_role;
update public.abonnements set statut = 'annule' where user_id = :alice;
select tst.ok(public.offre_effective(:alice) = 'premium', 'renouvellement arrêté : Premium jusqu''à expiration');
update public.abonnements set expire_le = now() - interval '1 day' where user_id = :alice;
select tst.ok(public.offre_effective(:alice) = 'gratuit', 'période payée terminée : gratuit');
reset role;
set role authenticated;
select tst.en_tant_que(:alice);
select tst.echoue('insert into public.objectifs (titre, categorie, type, date_debut) values (''Cinquième'', ''autre'', ''recurrent'', current_date)',
  'limite_objectifs', 'Premium expiré : retour aux limites gratuites');
reset role;

-- ---------------------------------------------------------------------------
-- Suppression du compte : toutes les données d'Alice disparaissent
-- ---------------------------------------------------------------------------
delete from auth.users where id = :alice;
select tst.ok(
  (select count(*) from public.profils where id = :alice)
  + (select count(*) from public.objectifs where user_id = :alice)
  + (select count(*) from public.actions where user_id = :alice)
  + (select count(*) from public.etapes where user_id = :alice)
  + (select count(*) from public.recurrences where user_id = :alice)
  + (select count(*) from public.evenements_progression where user_id = :alice)
  + (select count(*) from public.historique_actions where user_id = :alice)
  + (select count(*) from public.usage_ia where user_id = :alice)
  + (select count(*) from public.abonnements where user_id = :alice)
  + (select count(*) from public.preferences_notifications where user_id = :alice) = 0,
  'toutes les données d''Alice supprimées');
select tst.ok((select count(*) from public.profils) = 1, 'le compte de Bob reste intact');

\echo '   tous les tests SQL sont passés'
