-- Données de démarrage — à exécuter UNE SEULE FOIS après db/schema.sql.
-- Crée les 5 comptes (responsable technique + 4 agents) avec des mots de
-- passe temporaires, et reprend les données actuelles du prototype comme
-- point de départ réel. Chaque compte devra changer son mot de passe à la
-- première connexion (must_change_password = true, déjà la valeur par défaut).
--
-- Mots de passe temporaires à transmettre à la main à l'équipe :
--   rt        / RT-2026-Init!
--   julien    / Julien-2026!
--   karim     / Karim-2026!
--   nicolas   / Nicolas-2026!
--   marc      / Marc-2026!

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Équipe (les 2 sites, 15 personnes — reprend le planning actuel) ----------
INSERT INTO team (id, name, trade, site, phone, active) VALUES
  (1, 'Julien Marchand', 'Chef d''équipe', 'CLF', '06 14 82 35 09', true),
  (2, 'Camille Roussel', 'Chef d''équipe', 'BMT', '06 27 91 44 58', true),
  (3, 'Karim Haddad', 'Agent technique', 'CLF', '06 33 05 78 12', true),
  (4, 'Nicolas Fournier', 'Agent technique', 'CLF', '06 50 22 18 44', true),
  (5, 'Sophie Berthier', 'Agent technique', 'CLF', '06 12 34 56 78', true),
  (6, 'Antoine Lefort', 'Agent technique', 'CLF', '06 12 34 56 79', true),
  (7, 'Claire Dumont', 'Agent technique', 'CLF', '06 12 34 56 80', true),
  (8, 'Mathieu Girard', 'Agent technique', 'CLF', '06 12 34 56 81', true),
  (9, 'Marc Delaunay', 'Agent technique', 'BMT', '06 12 34 56 82', true),
  (10, 'Émilie Charpentier', 'Agent technique', 'BMT', '06 12 34 56 83', true),
  (11, 'Rachid Benali', 'Agent technique', 'BMT', '06 12 34 56 84', true),
  (12, 'Isabelle Faure', 'Agent technique', 'BMT', '06 12 34 56 85', true),
  (13, 'Vincent Picard', 'Agent technique', 'BMT', '06 12 34 56 86', true),
  (14, 'Laura Simon', 'Agent technique', 'BMT', '06 12 34 56 87', true),
  (15, 'Thomas Bertin', 'Agent technique', 'BMT', '06 12 34 56 88', true)
ON CONFLICT (id) DO NOTHING;
SELECT setval('team_id_seq', (SELECT max(id) FROM team));

-- ---------- Comptes utilisateurs ----------
-- (un compte de démo par profil ; les 11 autres membres de l'équipe n'ont
-- pas encore de compte — à créer via l'écran d'administration des comptes)
INSERT INTO users (username, password_hash, role, team_member_id, must_change_password) VALUES
  ('rt', crypt('RT-2026-Init!', gen_salt('bf', 12)), 'manager', NULL, true),
  ('julien', crypt('Julien-2026!', gen_salt('bf', 12)), 'manager', 1, true),
  ('karim', crypt('Karim-2026!', gen_salt('bf', 12)), 'agent', 3, true),
  ('nicolas', crypt('Nicolas-2026!', gen_salt('bf', 12)), 'agent', 4, true),
  ('marc', crypt('Marc-2026!', gen_salt('bf', 12)), 'agent', 9, true)
ON CONFLICT (username) DO NOTHING;

-- ---------- Congés ----------
INSERT INTO leaves (member_id, start_date, end_date, reason) VALUES
  (4, CURRENT_DATE + 2, CURRENT_DATE + 9, 'Congés payés'),
  (11, CURRENT_DATE - 1, CURRENT_DATE + 4, 'Arrêt maladie'),
  (8, CURRENT_DATE + 15, CURRENT_DATE + 22, 'Congés payés'),
  (13, CURRENT_DATE + 6, CURRENT_DATE + 7, 'Formation'),
  (6, CURRENT_DATE + 3, CURRENT_DATE + 3, 'Récupération')
ON CONFLICT DO NOTHING;

-- ---------- Zones (propreté) ----------
INSERT INTO zones (id, site, name, base_status) VALUES
  ('z1', 'CLF', 'Hall et couloirs', 'ok'),
  ('z2', 'CLF', 'Salle à manger', 'soon'),
  ('z3', 'CLF', 'Sanitaires 2e étage', 'urgent'),
  ('z4', 'BMT', 'Hall et couloirs', 'ok'),
  ('z5', 'BMT', 'Cuisine', 'soon'),
  ('z6', 'BMT', 'Local déchets', 'urgent')
ON CONFLICT (id) DO NOTHING;

-- ---------- Prestataires ----------
INSERT INTO providers (id, name, specialty, contact, phone, email, notes) VALUES
  (1, 'Sanitaire Pro', 'Plomberie / Sanitaires', 'Mme Bataille', '02 35 08 41 27', 'contact@sanitaire-pro.fr', 'Fournisseur habituel pour les rénovations de salles de bain.'),
  (2, 'CarreloNorm', 'Revêtements sol / mur', 'M. Duval', '02 35 08 55 63', 'commandes@carrelonorm.fr', NULL),
  (3, 'Normandie Sécurité Incendie', 'Désenfumage / Sécurité incendie', 'M. Petit', '02 35 12 09 84', 'contact@nsi-securite.fr', 'Intervient aussi pour les exercices d''évacuation.'),
  (4, 'ThermoNormandie', 'Chauffage / CVC', 'Mme Lefebvre', '02 35 44 21 06', 'contact@thermonormandie.fr', NULL),
  (5, 'Ascenseurs Services Plus', 'Ascenseurs', 'M. Girard', '02 35 60 17 92', 'sav@ascenseurs-services-plus.fr', 'Contrat de maintenance semestriel.')
ON CONFLICT (id) DO NOTHING;
SELECT setval('providers_id_seq', (SELECT max(id) FROM providers));

-- ---------- Interventions (tickets) ----------
INSERT INTO tickets (id, title, site, location, requester, priority, status, description, date_souhaitee, created_at, completed_at) VALUES
  (1, 'Lit médicalisé bloqué', 'Clairefontaine', 'Chambre 12 – L''Étang', 'Équipe soignante', 'urgente', 'Nouveau', 'Le bouton de réglage de hauteur ne répond plus, résidente à mobilité réduite.', CURRENT_DATE + 1, CURRENT_DATE - 3, NULL),
  (2, 'Fuite robinetterie salle de bain', 'Clairefontaine', 'Chambre 45 – Le Moulin', 'ASH', 'normale', 'En cours', 'Fuite légère sous le lavabo, seau posé en attendant l''intervention.', CURRENT_DATE + 3, CURRENT_DATE - 6, NULL),
  (3, 'Volet roulant bloqué', 'Clairefontaine', 'Salon – La Clairière', 'Équipe animation', 'basse', 'Nouveau', NULL, NULL, CURRENT_DATE - 4, NULL),
  (4, 'Contrôle chauffage avant hiver', 'Beaumont', 'Aile Petite Maison', 'Direction', 'normale', 'Terminé', 'Vérification annuelle demandée en amont de la saison froide.', NULL, CURRENT_DATE - 20, CURRENT_DATE - 18)
ON CONFLICT (id) DO NOTHING;
SELECT setval('tickets_id_seq', (SELECT max(id) FROM tickets));

-- ---------- Contrôles réglementaires ----------
INSERT INTO controls (id, name, site, freq_months, last_done, next_due) VALUES
  (1, 'Contrôle légionellose – balnéothérapie', 'Clairefontaine', 1, CURRENT_DATE - 30, CURRENT_DATE),
  (2, 'Contrôle légionellose – réseau eau chaude', 'Les deux sites', 1, CURRENT_DATE - 10, CURRENT_DATE + 20),
  (3, 'Vérification ascenseurs', 'Clairefontaine', 6, CURRENT_DATE - 150, CURRENT_DATE + 30),
  (4, 'Vérification installation électrique', 'Les deux sites', 12, CURRENT_DATE - 300, CURRENT_DATE + 65),
  (5, 'Vérification désenfumage', 'Clairefontaine', 12, CURRENT_DATE - 380, CURRENT_DATE - 15),
  (6, 'Vérification extincteurs', 'Beaumont', 12, CURRENT_DATE - 220, CURRENT_DATE + 145),
  (7, 'Vérification groupe électrogène', 'Clairefontaine', 3, CURRENT_DATE - 80, CURRENT_DATE + 10),
  (8, 'Vérification portes coupe-feu', 'Les deux sites', 12, CURRENT_DATE - 335, CURRENT_DATE + 30),
  (9, 'VGP lève-personnes et lits médicalisés', 'Beaumont', 12, CURRENT_DATE - 400, CURRENT_DATE - 35),
  (10, 'Exercice évacuation incendie', 'Clairefontaine', 6, CURRENT_DATE - 195, CURRENT_DATE - 15)
ON CONFLICT (id) DO NOTHING;
SELECT setval('controls_id_seq', (SELECT max(id) FROM controls));

-- ---------- Chantiers ----------
INSERT INTO projects (id, name, site, status, start_date, end_date, description, teams) VALUES
  (1, 'Rénovation salles de bain – Le Moulin', 'Clairefontaine', 'En cours', CURRENT_DATE - 60, CURRENT_DATE + 45, 'Remise aux normes PMR des salles de bain de l''aile Le Moulin : sanitaires, robinetterie et revêtements.', ARRAY['Plomberie','Électricité','Prestataire externe']),
  (2, 'Mise aux normes désenfumage – La Clairière', 'Clairefontaine', 'À venir', CURRENT_DATE + 15, CURRENT_DATE + 90, 'Installation d''exutoires conformes suite au dernier rapport de la commission de sécurité.', ARRAY['Prestataire externe','Direction / achats']),
  (3, 'Remplacement chaudière collective', 'Beaumont', 'En pause', CURRENT_DATE - 90, CURRENT_DATE + 150, 'Remplacement de la chaudière collective en fin de vie par un modèle à condensation.', ARRAY['Chauffage / CVC','Prestataire externe','Direction / achats'])
ON CONFLICT (id) DO NOTHING;
SELECT setval('projects_id_seq', (SELECT max(id) FROM projects));

INSERT INTO project_steps (project_id, label, date, done) VALUES
  (1, 'Diagnostic technique', CURRENT_DATE - 55, true),
  (1, 'Commande des matériaux', CURRENT_DATE - 40, true),
  (1, 'Dépose des anciens équipements', CURRENT_DATE - 5, false),
  (1, 'Pose des sanitaires et faïence', CURRENT_DATE + 15, false),
  (1, 'Réception des travaux', CURRENT_DATE + 45, false),
  (2, 'Devis prestataire', CURRENT_DATE - 5, true),
  (2, 'Validation budget direction', CURRENT_DATE + 10, false),
  (2, 'Intervention prestataire', CURRENT_DATE + 40, false),
  (2, 'Contrôle de conformité', CURRENT_DATE + 90, false),
  (3, 'Étude de dimensionnement', CURRENT_DATE - 85, true),
  (3, 'Choix du prestataire', CURRENT_DATE - 70, true),
  (3, 'Validation budget (en attente d''arbitrage)', CURRENT_DATE + 20, false),
  (3, 'Dépose de l''ancienne chaudière', CURRENT_DATE + 90, false),
  (3, 'Installation de la nouvelle chaudière', CURRENT_DATE + 120, false);

INSERT INTO project_materials (project_id, name, qty, unit, status, supplier_id, unit_cost) VALUES
  (1, 'Sanitaires PMR', 6, 'unité', 'Commandé', 1, 420),
  (1, 'Robinetterie thermostatique', 6, 'unité', 'À commander', 1, 180),
  (1, 'Carrelage sol antidérapant', 45, 'm²', 'Reçu', 2, 32),
  (1, 'Faïence murale', 60, 'm²', 'À commander', 2, 28),
  (2, 'Exutoires de désenfumage', 4, 'unité', 'À commander', 3, 1150),
  (2, 'Coffret de commande manuelle', 1, 'unité', 'À commander', 3, 850),
  (3, 'Chaudière collective gaz condensation 150kW', 1, 'unité', 'À commander', 4, 18500),
  (3, 'Kit de raccordement hydraulique', 1, 'unité', 'À commander', 4, 620);

-- ---------- Stock ----------
INSERT INTO stock (id, name, category, site, qty, threshold, unit, unit_cost, location) VALUES
  (1, 'Ampoules LED E27', 'Consommable', 'Les deux sites', 34, 20, 'unité', 2.5, 'Atelier technique Clairefontaine'),
  (2, 'Piles LR6 (AA)', 'Consommable', 'Les deux sites', 12, 15, 'unité', 0.8, 'Atelier technique Clairefontaine'),
  (3, 'Joints robinetterie (assortiment)', 'Plomberie', 'Clairefontaine', 8, 10, 'lot', 4, 'Atelier technique Clairefontaine'),
  (4, 'Disjoncteurs 16A', 'Électrique', 'Les deux sites', 6, 4, 'unité', 12, 'Atelier technique Clairefontaine'),
  (5, 'Visserie assortiment', 'Visserie', 'Les deux sites', 3, 5, 'boîte', 18, 'Atelier technique Clairefontaine'),
  (6, 'Filtres VMC', 'Consommable', 'Beaumont', 18, 10, 'unité', 15, 'Local technique Beaumont'),
  (7, 'Gants de protection', 'Consommable', 'Les deux sites', 25, 15, 'paire', 3, 'Atelier technique Clairefontaine'),
  (8, 'Tube PVC évacuation Ø100', 'Plomberie', 'Clairefontaine', 4, 3, 'ml', 6, 'Atelier technique Clairefontaine')
ON CONFLICT (id) DO NOTHING;
SELECT setval('stock_id_seq', (SELECT max(id) FROM stock));

-- ---------- Équipements ----------
INSERT INTO equipment (id, name, category, site, location, brand, model, serial_number, purchase_date, warranty_end, supplier_id, notes) VALUES
  (1, 'Chaudière collective', 'Chauffage / CVC', 'Beaumont', 'Chaufferie principale', 'De Dietrich', 'Innovens Pro', 'DD-2012-887', '2012-03-10', '2015-03-10', 4, NULL),
  (2, 'Ascenseur bâtiment principal', 'Ascenseur', 'Clairefontaine', 'Hall principal', 'Otis', 'Gen2', 'OT-2016-441', '2016-06-01', '2018-06-01', 5, NULL),
  (3, 'Groupe électrogène', 'Électrique', 'Clairefontaine', 'Local technique extérieur', 'SDMO', 'V440K2', 'SD-2018-1102', '2018-09-15', '2020-09-15', NULL, NULL),
  (4, 'Système de désenfumage — La Clairière', 'Sécurité incendie', 'Clairefontaine', 'Bâtiment La Clairière', 'Normandie Sécurité Incendie', 'Exutoires série E4', 'NSI-2015-330', '2015-01-20', '2017-01-20', 3, 'Mise aux normes en cours (voir chantier associé).'),
  (5, 'Lève-personne mobile', 'Mobilier médical', 'Clairefontaine', 'Aile Le Moulin', 'Arjo', 'Maxi Move', 'ARJ-2019-556', '2019-05-12', '2021-05-12', 1, NULL),
  (6, 'Adoucisseur d''eau', 'Plomberie', 'Beaumont', 'Local technique', 'Culligan', 'Aquaset SF', 'CUL-2020-771', '2020-02-28', '2022-02-28', 4, NULL)
ON CONFLICT (id) DO NOTHING;
SELECT setval('equipment_id_seq', (SELECT max(id) FROM equipment));

-- Remarque : la table `assignments` (et le reste du planning détaillé
-- chantiers/tickets ci-dessus) n'est pas encore utilisée par l'écran
-- "Planning Service Technique" actuel, qui calcule son propre planning du
-- jour à la volée (voir task_status / extra_tasks plus haut). Elle est
-- conservée pour une phase ultérieure (module chantiers complet).
