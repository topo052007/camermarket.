-- Données de départ : les 3 produits de démonstration (prix de test).
-- À exécuter dans l'éditeur SQL de Supabase APRÈS schema.sql (peut être relancé sans doublon).
--
-- Pour tester le téléchargement : envoyez un PDF nommé guide-vendre-sur-facebook.pdf
-- dans Storage > produits-digitaux.

insert into produits (slug, nom_fr, nom_en, description_fr, description_en, points_fr, points_en, type, stock, pays_livraison, fichier_chemin) values
  ('sac-cuir-artisanal',
   'Sac en cuir artisanal', 'Handmade leather bag',
   'Sac fait main par un artisan local, solide et élégant.', 'Bag handmade by a local craftsman, sturdy and elegant.',
   array['Livraison en Afrique centrale', 'Paiement par Mobile Money', 'Fait main'],
   array['Shipping across Central Africa', 'Pay with Mobile Money', 'Handmade'],
   'physique', 20, array['CM','GA','CG','TD','CF','GQ'], null),
  ('guide-vendre-sur-facebook',
   'Guide : vendre sur Facebook', 'Guide: selling on Facebook',
   'Un guide PDF pas à pas pour trouver vos premiers clients avec Facebook.', 'A step-by-step PDF guide to find your first customers with Facebook.',
   array['Téléchargement immédiat', 'PDF de 60 pages', 'Modèles de publications inclus'],
   array['Instant download', '60-page PDF', 'Post templates included'],
   'digital', null, null, 'guide-vendre-sur-facebook.pdf'),
  ('formation-business-en-ligne',
   'Formation : lancer son business en ligne', 'Course: launch your online business',
   'Une formation vidéo complète, des premières idées jusqu''aux premières ventes.', 'A complete video course, from first ideas to first sales.',
   array['Accès à vie', 'Leçons vidéo en ligne', 'Accessible sur téléphone'],
   array['Lifetime access', 'Online video lessons', 'Works on your phone'],
   'formation', null, null, null)
on conflict (slug) do nothing;

insert into prix_produits (produit_id, devise, montant)
select p.id, v.devise, v.montant
from (values
  ('sac-cuir-artisanal', 'XAF', 25000),
  ('sac-cuir-artisanal', 'XOF', 25000),
  ('guide-vendre-sur-facebook', 'XAF', 5000),
  ('guide-vendre-sur-facebook', 'XOF', 5000),
  ('formation-business-en-ligne', 'XAF', 30000),
  ('formation-business-en-ligne', 'XOF', 30000)
) as v(slug, devise, montant)
join produits p on p.slug = v.slug
on conflict (produit_id, devise) do nothing;

-- Un module et deux leçons d'exemple pour la formation (à remplacer par vos vraies leçons).
-- video_url : adresse https d'une vidéo hébergée (Vimeo, Bunny Stream...), ou laissez vide.
insert into modules (produit_id, titre_fr, titre_en, position)
select p.id, 'Module 1 : les bases', 'Module 1: the basics', 1
from produits p
where p.slug = 'formation-business-en-ligne'
  and not exists (select 1 from modules m where m.produit_id = p.id);

insert into lecons (module_id, titre_fr, titre_en, contenu_fr, contenu_en, position)
select m.id, v.titre_fr, v.titre_en, v.contenu_fr, v.contenu_en, v.position
from modules m
join produits p on p.id = m.produit_id and p.slug = 'formation-business-en-ligne'
cross join (values
  ('Leçon 1 : trouver une idée', 'Lesson 1: finding an idea',
   'Contenu de démonstration de la leçon 1.', 'Demo content for lesson 1.', 1),
  ('Leçon 2 : premiers clients', 'Lesson 2: first customers',
   'Contenu de démonstration de la leçon 2.', 'Demo content for lesson 2.', 2)
) as v(titre_fr, titre_en, contenu_fr, contenu_en, position)
where not exists (select 1 from lecons l where l.module_id = m.id);
