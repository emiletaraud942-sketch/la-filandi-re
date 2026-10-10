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

Plan des chambres, tâches, espace soignant, équipes, résidents, visites, stock, véhicules, émargement, frais invisibles, plus « Mon compte » et « Utilisateurs » (administrateur). Avec `DEMO_MODE=1`, aucune connexion n'est demandée et les pages affichent un jeu fictif (`lib/demo/*`) : rien n'est enregistré. Sans `DEMO_MODE`, **tous les écrans lisent et écrivent dans Supabase** avec les droits de la personne connectée (la base refuse ce qui n'est pas permis).

Gestes enregistrés en base : avancement, création, réattribution et suppression de tâches (génération quotidienne à 4 h par `pg_cron`) ; planning de la semaine et pointage (arrivée, départ) ; sortie, arrivée et départ de résidents, animations de leur journée ; stock (consommation, livraison, inventaire, commande, articles) ; véhicules (réservation, annulation, carnet de bord, garage, ajout) ; visites (créneaux, formulaire public des familles sur `/visite`, confirmation ou refus, file d'e-mails) ; émargement (séances, participants, signature, absent ou excusé, clôture) ; frais (saisie, correction, suppression, repères mensuels, choix du mois) ; comptes (mot de passe, activation, rôle, lien avec la fiche du personnel).

Les écrans se rafraîchissent seuls (Supabase Realtime, repli toutes les 15 s).

**E-mails des visites** : chaque demande et chaque décision met un courrier dans la table `outbox`. L'envoi réel part du bouton « Envoyer maintenant » dès que les variables `RESEND_API_KEY` et `MAIL_FROM` sont renseignées (compte Resend, expéditeur vérifié).

**Nouveaux comptes** : ajouter la personne dans Supabase (Authentication > Users > Add user) ; son compte reste **inactif et sans droits** jusqu'à son activation dans la page « Utilisateurs » (rôle, fiche du personnel). Désactiver les inscriptions libres dans Supabase (Authentication > Sign In / Providers) est recommandé. Lien « mot de passe oublié » : ajouter l'adresse du site dans Authentication > URL Configuration (Site URL et Redirect URLs `https://…/**`).

**Tâches du jour de la démo, en une commande** (éditeur SQL de Supabase, ou compte admin) : `select public.demo_seed_today();` — recrée plannings, tâches et journées des résidents pour la date du jour, sans doublon si on la relance. À retirer avant l'usage réel : `drop function public.demo_seed_today();`.

Les données de démonstration se chargent avec `supabase/seed.sql` (et se retirent avec `supabase/unseed.sql`) ; sans cela, les pages affichent des états vides.

## Base de données (Supabase uniquement)

Les migrations sont dans `supabase/migrations/` et s'appliquent dans l'ordre. `supabase/seed.sql` contient des résidents fictifs pour l'essai : ne jamais l'utiliser avec de vraies données.

État : les migrations de fondations et de phase 2 sont appliquées sur le projet `la-filandiere` (tables, sécurité, helpers dans le schéma `private`, étages, postes, 124 chambres). `20261010000002_split_write_policies.sql` est en attente : elle supprime des politiques, donc l'application demande une confirmation.

**Premier administrateur** : créer l'utilisateur dans Supabase (Authentication > Users > Add user), puis, dans le SQL Editor :
`update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'VOTRE_EMAIL');`

Rôles applicatifs : `admin`, `direction`, `cadre`, `soignant`, `animation`, `accueil`, `technique`. Un nouveau compte est créé inactif ; seul un `admin` l'active et change les rôles (page « Utilisateurs »).

## Tests

`npm run test:db` rejoue toutes les migrations sur Postgres local (PGlite) et vérifie les droits par rôle. `npm run typecheck` et `npm run build` complètent la vérification ; le tout tourne sur GitHub à chaque envoi (`.github/workflows/ci.yml`).

## Phases

0. Cadrage · **1. Fondations (en cours)** · 2. Plan et tâches · 3. Équipes et résidents · 4. Logistique · 5. Pilotage · 6. Pilote terrain
