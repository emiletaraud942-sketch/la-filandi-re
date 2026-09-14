# Mise en service — Phase 1 (socle technique)

Ce dépôt contient maintenant une vraie application (Next.js + Postgres) et
non plus une simple page statique. L'écran "Planning Service Technique"
(`public/app.html`) est protégé par une connexion réelle et lit/écrit ses
données (équipe, congés, statut des tâches, propreté des zones) dans
Postgres au lieu de les regénérer à chaque rechargement. Les étapes
ci-dessous sont à faire une seule fois.

## 1. Créer la base de données

1. Dans le tableau de bord Vercel, ouvrez le projet `la-filandi-re`.
2. Onglet **Storage** → **Create Database** → **Postgres**.
3. Choisissez une région **Europe** (Frankfurt) — obligatoire pour la RGPD.
4. Une fois créée, Vercel relie automatiquement la base au projet et injecte
   la variable `POSTGRES_URL` — rien à copier à la main.

## 2. Définir le secret de session

1. Générez une valeur aléatoire, par exemple avec `openssl rand -base64 32`
   (ou demandez-la-moi, je peux la générer).
2. Projet Vercel → **Settings** → **Environment Variables** → ajoutez
   `SESSION_SECRET` avec cette valeur, pour l'environnement **Production**
   (et Preview si vous voulez tester avant mise en production).
3. Redéployez le projet pour que la variable soit prise en compte.

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

## Ce qui n'est pas encore fait (Phases 2 et 3 du cahier des charges)

Le module "Chantiers et propreté" affiche encore des chantiers de
démonstration statiques (la table `projects` existe déjà en base pour une
mise en service future de cet onglet). Messagerie d'équipe, mode hors-ligne
/PWA, notifications email/SMS, export PDF réglementaire, panneau
d'administration complet (sites/corps de métier configurables),
intégrations externes. Voir le document "Cahier des Charges" pour le détail
et l'ordre recommandé.
