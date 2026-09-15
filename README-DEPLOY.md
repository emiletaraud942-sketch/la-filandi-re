# Mise en service — Phases 1, 2 & 3

Ce dépôt contient maintenant une vraie application (Next.js + Postgres) et
non plus une simple page statique. L'écran "Planning Service Technique"
(`public/app.html`) est protégé par une connexion réelle et lit/écrit ses
données (équipe, congés, statut des tâches, propreté des zones) dans
Postgres au lieu de les regénérer à chaque rechargement. Les étapes
ci-dessous sont à faire une seule fois.

## 1. Créer la base de données

1. Dans le tableau de bord Vercel, ouvrez le projet `la-filandiere`.
2. Onglet **Storage** → choisissez un fournisseur du Marketplace : **Neon**
   (Serverless Postgres) — Vercel n'a plus de "Postgres" natif.
3. Choisissez une région **Europe** (Frankfurt) si proposée — pour la RGPD.
4. Une fois créée, Vercel injecte automatiquement les variables de connexion
   dans le projet. **Important** : contrairement à l'ancien "Vercel
   Postgres", Neon (via le Marketplace) nomme sa variable principale
   `DATABASE_URL` et non `POSTGRES_URL`. Le code (`lib/db.ts`) accepte les
   deux noms (ainsi que `POSTGRES_URL_NO_SSL`/`POSTGRES_URL_NON_POOLING`),
   donc rien à renommer à la main — assurez-vous juste qu'au moins une de
   ces variables existe (Settings → Environment Variables).

## 2. Définir le secret de session

1. Générez une valeur aléatoire, par exemple avec `openssl rand -base64 32`
   (ou demandez-la-moi, je peux la générer).
2. Projet Vercel → **Settings** → **Environment Variables** → ajoutez une
   variable nommée **exactement** `SESSION_SECRET` (tout en majuscules —
   les noms de variables sont sensibles à la casse ; `session_secret` en
   minuscules ne sera pas reconnu par le code) avec cette valeur, pour
   l'environnement **Production** (et Preview si vous voulez tester avant).
3. Vérifiez aussi **Settings → General → Build & Development Settings →
   Framework Preset** : doit être **Next.js** (pas "Other") — sinon les
   redirections et l'API ne fonctionnent pas et le site renvoie une 404.
4. Redéployez le projet (**Deployments** → dernier déploiement → **⋯** →
   **Redeploy**) pour que ces changements soient pris en compte : ajouter
   une variable d'environnement ou changer le Framework Preset ne redéploie
   jamais automatiquement.

## 3. Initialiser la base

Dans l'onglet **Storage** de la base Postgres créée à l'étape 1, ouvrez
**Query** (l'éditeur SQL intégré) et exécutez, dans l'ordre :

1. Le contenu de `db/schema.sql` (crée les tables).
2. Le contenu de `db/seed.sql` (crée les 5 comptes et les données de départ).

## 4. Transmettre les accès à l'équipe

Les 5 comptes créés par `db/seed.sql` (identifiants et mots de passe
temporaires) sont listés en commentaire en haut de ce fichier. Chacun devra
changer son mot de passe à la première connexion — c'est automatique,
l'application les redirige vers cet écran.

| Identifiant | Mot de passe temporaire | Rôle |
|---|---|---|
| `rt` | `RT-2026-Init!` | Responsable technique (vue complète) |
| `julien` | `Julien-2026!` | Chef d'équipe — Clairefontaine |
| `karim` | `Karim-2026!` | Agent technique — Clairefontaine |
| `nicolas` | `Nicolas-2026!` | Agent technique — Clairefontaine |
| `marc` | `Marc-2026!` | Agent technique — Beaumont |

Les 15 membres de l'équipe existent dans la base (`db/seed.sql`) mais seuls
ces 5 ont un compte de connexion pour l'instant ; les autres sont créés via
**Admin → Comptes** (`/api/admin/users`, à réserver au responsable) le jour
où ils doivent se connecter eux-mêmes.

## 5. Vérifier

- Ouvrir l'URL du site → doit rediriger vers `/login.html`.
- Se connecter avec `rt` / `RT-2026-Init!` → doit demander un nouveau mot
  de passe, puis afficher la vue "Chef d'équipe" (avec bascule Chef/Employé).
- Se connecter avec `karim` / `Karim-2026!` → doit afficher directement
  "Ma journée" pour Karim Haddad, sans bascule de rôle.
- Cocher le statut d'une tâche, recharger la page → le statut doit être
  conservé (persistance en base, plus seulement en mémoire).
- Depuis un compte "Chef d'équipe", ajouter une tâche ou faire évoluer la
  propreté d'une zone, recharger → doit persister également.
- Vérifier qu'un agent ne peut pas changer le statut de la tâche d'un
  collègue (403 attendu si on force l'appel API avec un autre id).

## Phase 2 — l'usage quotidien (lots 03, 04, 05 partiels)

Ajoutée par-dessus la Phase 1, sans rien casser de ce qui précède :

- **Messagerie d'équipe** (lot 04) : bouton 💬 en bas à droite, visible sur
  tous les rôles. Canal unique pour toute l'équipe (pas encore de fil par
  chantier/ticket — ces entités ne sont pas branchées sur l'écran actuel).
  Un badge indique les messages non lus (vérifié toutes les 8 secondes).
- **Mise à jour en direct** (lot 03) : le statut des tâches et la propreté
  des zones se resynchronisent automatiquement toutes les 20 secondes, pour
  qu'un changement fait par un collègue apparaisse sans recharger la page.
  Implémenté en polling léger (pas de websocket) — largement suffisant à ce
  volume d'utilisateurs.
- **PWA installable** (lot 05, partiel) : `manifest.json` + `sw.js` rendent
  l'app installable sur l'écran d'accueil d'un téléphone (icône, plein
  écran, sans barre d'adresse), et gardent le dernier planning chargé
  consultable hors connexion (lecture seule — une action nécessite toujours
  une connexion).

### Vérifier la Phase 2

- Ouvrir l'app sur deux appareils/comptes différents, envoyer un message
  depuis l'un → doit apparaître (badge puis contenu) sur l'autre en
  quelques secondes.
- Cocher une tâche depuis un compte, l'observer changer sur un autre
  compte connecté simultanément sans recharger.
- Sur mobile (Chrome/Safari) : proposition "Ajouter à l'écran d'accueil"
  doit apparaître ; une fois installée, l'icône ouvre l'app en plein écran.
- Couper le réseau après un premier chargement réussi → le planning du jour
  doit rester affichable (données mises en cache par le service worker).

### Ce qui reste explicitement hors de cette passe

- **Pièces jointes** (lot 06 — photos sur ticket/chantier/équipement) :
  demande de choisir et provisionner un stockage de fichiers (ex. Vercel
  Blob) — décision à prendre avec vous avant de le construire.
- **Notifications email/SMS** (lot 07) : demande une clé d'API d'un
  fournisseur externe (ex. Resend, Twilio) que je n'ai pas ; le centre de
  notifications actuel se limite au badge de messages non lus.
- **Notifications push téléphone**, **synchronisation des écritures faites
  hors-ligne**, **indicateur de présence en ligne** : non implémentés dans
  cette passe.
- Le module "Chantiers et propreté" affiche encore des chantiers de
  démonstration statiques (la table `projects` existe déjà en base pour une
  mise en service future de cet onglet).

## Phase 3 — conformité & maturité (lots 08, 09, 10 partiels)

- **Panneau d'administration** (lot 09) : bouton ⚙ dans l'en-tête, visible
  uniquement pour les comptes "Chef d'équipe/Responsable". Trois onglets :
  - *Comptes* : créer un compte (identifiant, mot de passe temporaire, rôle,
    membre d'équipe lié), réinitialiser un mot de passe, supprimer un compte.
  - *Équipe* : ajouter une personne, la désactiver (disparaît du planning
    sans perdre son historique) ou la **supprimer définitivement** (droit à
    l'effacement RGPD — supprime aussi ses congés et tâches ajoutées).
  - *Journal d'audit* : liste des actions sensibles horodatées.
- **Journal d'audit complet** (lot 08) : chaque connexion sensible (compte
  créé/supprimé, mot de passe réinitialisé, membre désactivé/supprimé,
  congé ajouté/supprimé, tâche terminée, zone nettoyée) est tracée avec
  l'auteur, la date et le détail — table `audit_log`, consultable dans le
  panneau d'administration.
- **Export .ics du planning** (lot 10) : chaque agent peut exporter son
  planning des 4 prochaines semaines (bouton dans "Ma journée" → "Ma
  semaine") vers Outlook/Google Agenda ; un chef d'équipe peut l'exporter
  pour n'importe quel membre depuis l'onglet Équipe du panneau d'admin.

### Vérifier la Phase 3

- Se connecter avec `rt` → ouvrir le panneau ⚙ → créer un compte de test
  pour un membre de l'équipe sans compte, vérifier qu'il peut se connecter.
- Désactiver un membre → il doit disparaître du planning immédiatement
  (chef comme employé) sans que ses tâches passées ne disparaissent.
- Vérifier que les actions ci-dessus apparaissent dans l'onglet "Journal
  d'audit", avec le bon auteur et la bonne date.
- Depuis un compte agent, cliquer "Exporter mon planning (.ics)" et
  l'importer dans Google Agenda / Outlook pour vérifier le format.

### Ce qui reste hors de cette passe (voir aussi le reliquat de Phase 2)

- **Registre RGPD formel** (liste des données conservées et durées) : le
  mécanisme de suppression existe (droit à l'effacement), le document de
  registre lui-même reste à rédiger avec vous.
- **Export PDF horodaté des contrôles réglementaires** : le module
  "contrôles" (légionellose, ascenseurs, désenfumage…) n'est pas encore
  branché sur l'écran actuel (voir "Chantiers et propreté" en Phase 2) —
  l'export PDF n'a de sens qu'une fois ce module réel.
- **Seuils configurables**, **gestion des sites/corps de métier** : pas
  encore de terrain nécessitant ces réglages avec seulement 2 sites fixes.
- **Email de commande fournisseur automatique**, **connexion à un logiciel
  RH** : nécessitent des décisions/accès externes (lot 10, non prioritaire).

Voir le document "Cahier des Charges" pour le détail complet et l'ordre
recommandé.

## Suite à froid — module Stock

Suite à l'audit organisationnel, le module **Stock** (consommables, pièces
détachées) est maintenant branché sur l'écran — bouton 📦 dans l'en-tête,
visible pour tous les rôles :

- Tout compte connecté peut ajuster une quantité (+1/−1) — un agent qui
  utilise une pièce la décompte lui-même.
- Seul le responsable/chef d'équipe peut ajouter un article ou le
  supprimer.
- Un badge sur le bouton 📦 indique le nombre d'articles sous leur seuil
  d'alerte (déjà configuré dans les données de départ).

Les données existent déjà en base si `db/seed.sql` a été exécuté (8
articles de démonstration) — rien à réinitialiser.
