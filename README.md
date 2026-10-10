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

## Base de données (Supabase uniquement)

Les migrations sont dans `supabase/migrations/` et s'appliquent dans l'ordre. `supabase/seed.sql` contient des résidents fictifs pour l'essai : ne jamais l'utiliser avec de vraies données.

Rôles applicatifs : `admin`, `direction`, `cadre`, `soignant`, `animation`, `accueil`, `technique`. Un nouveau compte est créé en `soignant` ; seul un `admin` change les rôles.

## Phases

0. Cadrage · **1. Fondations (en cours)** · 2. Plan et tâches · 3. Équipes et résidents · 4. Logistique · 5. Pilotage · 6. Pilote terrain
