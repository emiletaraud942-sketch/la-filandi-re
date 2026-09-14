# Mise en service — Phase 1 (socle technique)

Ce dépôt contient maintenant une vraie application (Next.js + Postgres) et
non plus une simple page statique. Le fichier `public/app.html` (l'outil
lui-même) et `index.html` (l'ancien prototype, conservé pour mémoire mais
plus utilisé) coexistent. Les étapes ci-dessous sont à faire une seule fois.

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
| `rt` | `RT-2026-Init!` | Responsable technique |
| `julien` | `Julien-2026!` | Agent — Plomberie |
| `karim` | `Karim-2026!` | Agent — Électricité |
| `nicolas` | `Nicolas-2026!` | Agent — Chauffage / CVC |
| `marc` | `Marc-2026!` | Agent — Agent polyvalent |

## 5. Vérifier

- Ouvrir l'URL du site → doit rediriger vers `/login.html`.
- Se connecter avec `rt` / `RT-2026-Init!` → doit demander un nouveau mot
  de passe, puis afficher l'espace responsable complet.
- Se connecter avec un compte agent → doit afficher directement ses tâches
  du jour.
- Créer un nouveau compte depuis l'onglet **Équipe → Comptes de connexion**
  pour vérifier que la gestion minimale des comptes fonctionne (utile le
  jour où un 6ᵉ agent rejoint l'équipe).

## Ce qui n'est pas encore fait (Phases 2 et 3 du cahier des charges)

Messagerie d'équipe, mode hors-ligne/PWA, notifications email/SMS, export
PDF réglementaire, panneau d'administration complet (sites/corps de métier
configurables), intégrations externes. Voir le document "Cahier des
Charges" pour le détail et l'ordre recommandé.
