# La Filandière

Logiciel de pilotage d'un EHPAD (Déville-lès-Rouen) : plan des chambres, tâches, équipes, résidents, visites, stock, véhicules, émargement, frais invisibles. Next.js (App Router) + Supabase (Auth, Postgres, RLS, Realtime) + Vercel. Style retenu : variante A « Calme » (sauge/ivoire, Newsreader + Karla) — à respecter sur toute nouvelle maquette.

## À ne jamais perdre de vue

C'est un vrai établissement avec de vrais résidents âgés dépendants et de vrais salariés — pas une démo. V1 ne porte volontairement **aucune donnée de santé** (résidents pseudonymisés : civilité + initiales). Toute fonctionnalité qui commencerait à stocker de la vraie donnée de santé ou l'identité complète des résidents est un changement de périmètre à valider explicitement, jamais une évolution anodine. Rôles applicatifs réels : `admin`, `direction`, `cadre`, `soignant`, `animation`, `accueil`, `technique`.

## Sous-agents du projet (`.claude/agents/`)

- **`frontend`** — pages/composants (style « Calme » à respecter, compatibilité `DEMO_MODE=1`).
- **`backend`** — Supabase, pg_cron (tâches 4h), emails via le pattern outbox (jamais d'envoi direct), activation des comptes.
- **`data-security`** — RLS/migrations (toute migration qui supprime/restreint une politique = confirmation explicite requise), isolement des données de démo, formulaire public `/visite` traité comme non fiable.
- **`qa`** — reproduit exactement la CI (`typecheck`, `test:db`, `build` en DEMO_MODE) avant de considérer un changement fini.
- **`rh`** — planning/pointage/émargement du personnel, onboarding — flique tout ce qui touche au vrai droit du travail sans jamais l'affirmer conforme.
- **`compta`** — module frais/stock — conseille, ne remplace jamais une vraie comptabilité/tarification EHPAD.
- **`marketing`** — communication aux familles (`/visite`, emails de visite) — ton de care, jamais commercial.

Flux recommandé : `frontend`/`backend` implémentent → `qa` vérifie (CI locale) → `data-security` relit systématiquement si RLS/données/emails touchés → `rh`/`compta`/`marketing` donnent leur avis métier si pertinent → l'utilisateur valide avant merge.

## Git

Chaque changement part sur une branche, est poussé, puis une Pull Request est ouverte vers `main`. **Ne jamais merger sans que l'utilisateur l'ait explicitement demandé.**
