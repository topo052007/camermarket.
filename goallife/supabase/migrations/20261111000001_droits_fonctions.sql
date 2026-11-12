-- Droits d'exécution des fonctions : sur Supabase, chaque fonction est exécutable par PUBLIC
-- par défaut. Retirer le droit au seul rôle anon ne suffit donc pas : on le retire à PUBLIC,
-- puis on le rend uniquement aux utilisateurs connectés pour les fonctions appelées par l'application.
-- (Corrige les alertes « Public Can Execute SECURITY DEFINER Function » du conseiller Supabase.)

-- Fonctions de trigger : jamais appelées directement (les triggers fonctionnent sans ce droit).
revoke execute on function public.maj_modifie_le() from public, anon, authenticated;
revoke execute on function public.verifier_fuseau() from public, anon, authenticated;
revoke execute on function public.verifier_limite_objectifs() from public, anon, authenticated;
revoke execute on function public.journaliser_action() from public, anon, authenticated;
revoke execute on function public.apres_contribution() from public, anon, authenticated;

-- Fonctions appelées par l'application : utilisateurs connectés uniquement.
revoke execute on function public.aujourdhui_utilisateur() from public, anon;
revoke execute on function public.generer_actions_jusqu_au(date, uuid) from public, anon;
revoke execute on function public.creer_objectif_avec_plan(jsonb, jsonb, jsonb, date) from public, anon;
revoke execute on function public.changer_statut_action(uuid, text, numeric, text, date) from public, anon;
revoke execute on function public.reprendre_objectif(uuid, text, text, int, numeric) from public, anon;
revoke execute on function public.modifier_rythme(uuid, int[], numeric, int, date) from public, anon;
grant execute on function public.aujourdhui_utilisateur() to authenticated;
grant execute on function public.generer_actions_jusqu_au(date, uuid) to authenticated;
grant execute on function public.creer_objectif_avec_plan(jsonb, jsonb, jsonb, date) to authenticated;
grant execute on function public.changer_statut_action(uuid, text, numeric, text, date) to authenticated;
grant execute on function public.reprendre_objectif(uuid, text, text, int, numeric) to authenticated;
grant execute on function public.modifier_rythme(uuid, int[], numeric, int, date) to authenticated;
