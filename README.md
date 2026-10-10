# La Filandière

Logiciel de pilotage d'un EHPAD (Déville-lès-Rouen) : plan des chambres, tâches, équipes, résidents, visites, stock, véhicules, émargement, frais invisibles.

- **Style retenu** : variante A « Calme » (sauge et ivoire, Newsreader + Karla) pour toutes les maquettes.
- **Pile** : Next.js (App Router) + Supabase (Auth, Postgres avec RLS) + Vercel.
- **Données V1** : aucune donnée de santé ; résidents pseudonymisés (civilité + initiales).

## Démarrer

```bash
cp .env.example .env.local   # renseigner la clé publique Supabase
npm install
npm run dev
```

## Pages (style A « Calme »)

Plan des chambres, tâches, espace soignant, équipes, résidents, visites, stock, véhicules, émargement, frais invisibles. Elles lisent pour l'instant un jeu de données fictif (`lib/demo/data.ts`, exposé par `lib/data.ts`) : les écrans fonctionnent, mais rien n'est enregistré. Avec `DEMO_MODE=1`, aucune connexion n'est demandée (aperçu).

Brancher Supabase = remplacer, page par page, les données fictives passées aux composants par des requêtes ; les composants clients ne changent pas.

## Base de données (Supabase uniquement)

Les migrations sont dans `supabase/migrations/` et s'appliquent dans l'ordre. `supabase/seed.sql` contient des résidents fictifs pour l'essai : ne jamais l'utiliser avec de vraies données.

État : les migrations 1 à 6 ci-dessous sont appliquées sur le projet `la-filandiere` (tables, sécurité, helpers dans le schéma `private`, étages, postes, 124 chambres). `20261010000002_split_write_policies.sql` est en attente : elle supprime des politiques, donc l'application demande une confirmation.

**Premier administrateur** : créer l'utilisateur dans Supabase (Authentication > Users > Add user), puis, dans le SQL Editor :
`update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'VOTRE_EMAIL');`

Rôles applicatifs : `admin`, `direction`, `cadre`, `soignant`, `animation`, `accueil`, `technique`. Un nouveau compte est créé en `soignant` ; seul un `admin` change les rôles.

## Tests

`npm run test:db` rejoue toutes les migrations sur Postgres local (PGlite) et vérifie les droits par rôle. `npm run typecheck` et `npm run build` complètent la vérification ; le tout tourne sur GitHub à chaque envoi (`.github/workflows/ci.yml`).

## Phases

0. Cadrage · **1. Fondations (en cours)** · 2. Plan et tâches · 3. Équipes et résidents · 4. Logistique · 5. Pilotage · 6. Pilote terrain
