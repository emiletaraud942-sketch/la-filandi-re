-- Schéma de base — Résidence Les Cerisiers, Service Technique
-- Exécuter une seule fois sur la base Postgres Vercel (onglet "Query"),
-- puis exécuter db/seed.sql pour créer les comptes et les données de démarrage.

CREATE TABLE IF NOT EXISTS team (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  trade     TEXT NOT NULL,
  site      TEXT NOT NULL,
  phone     TEXT,
  active    BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS users (
  id                     SERIAL PRIMARY KEY,
  username               TEXT NOT NULL UNIQUE,
  password_hash          TEXT NOT NULL,
  role                   TEXT NOT NULL CHECK (role IN ('manager', 'agent')),
  team_member_id         INTEGER REFERENCES team(id) ON DELETE SET NULL,
  must_change_password   BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at          TIMESTAMPTZ,
  last_read_message_id   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id            BIGSERIAL PRIMARY KEY,
  username      TEXT NOT NULL,
  ip            TEXT,
  success       BOOLEAN NOT NULL,
  attempted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_username_time ON login_attempts (username, attempted_at);

CREATE TABLE IF NOT EXISTS leaves (
  id          SERIAL PRIMARY KEY,
  member_id   INTEGER NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      TEXT
);

CREATE TABLE IF NOT EXISTS providers (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  specialty  TEXT,
  contact    TEXT,
  phone      TEXT,
  email      TEXT,
  notes      TEXT
);

CREATE TABLE IF NOT EXISTS tickets (
  id                    SERIAL PRIMARY KEY,
  title                 TEXT NOT NULL,
  site                  TEXT NOT NULL,
  location              TEXT,
  requester             TEXT,
  priority              TEXT NOT NULL CHECK (priority IN ('urgente', 'normale', 'basse')),
  status                TEXT NOT NULL CHECK (status IN ('Nouveau', 'En cours', 'Terminé')),
  description           TEXT,
  date_souhaitee        DATE,
  created_at            DATE NOT NULL DEFAULT CURRENT_DATE,
  converted_project_id  INTEGER,
  completed_at          DATE
);

CREATE TABLE IF NOT EXISTS controls (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  site         TEXT NOT NULL,
  freq_months  INTEGER NOT NULL,
  last_done    DATE,
  next_due     DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  site        TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('À venir', 'En cours', 'En pause', 'Terminé')),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  description TEXT,
  teams       TEXT[] NOT NULL DEFAULT '{}'
);

ALTER TABLE tickets
  ADD CONSTRAINT fk_tickets_converted_project
  FOREIGN KEY (converted_project_id) REFERENCES projects(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS project_steps (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  date        DATE NOT NULL,
  done        BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS project_materials (
  id           SERIAL PRIMARY KEY,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  qty          NUMERIC NOT NULL DEFAULT 1,
  unit         TEXT NOT NULL DEFAULT 'unité',
  status       TEXT NOT NULL CHECK (status IN ('À commander', 'Commandé', 'Reçu')),
  supplier_id  INTEGER REFERENCES providers(id) ON DELETE SET NULL,
  unit_cost    NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stock (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL,
  site       TEXT NOT NULL,
  qty        NUMERIC NOT NULL DEFAULT 0,
  threshold  NUMERIC NOT NULL DEFAULT 0,
  unit       TEXT NOT NULL DEFAULT 'unité',
  unit_cost  NUMERIC NOT NULL DEFAULT 0,
  location   TEXT
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id             SERIAL PRIMARY KEY,
  stock_item_id  INTEGER NOT NULL REFERENCES stock(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('Entrée', 'Sortie')),
  qty            NUMERIC NOT NULL,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  note           TEXT
);

CREATE TABLE IF NOT EXISTS equipment (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL,
  site           TEXT NOT NULL,
  location       TEXT,
  brand          TEXT,
  model          TEXT,
  serial_number  TEXT,
  purchase_date  DATE,
  warranty_end   DATE,
  supplier_id    INTEGER REFERENCES providers(id) ON DELETE SET NULL,
  notes          TEXT
);

CREATE TABLE IF NOT EXISTS assignments (
  id                    SERIAL PRIMARY KEY,
  date                  DATE NOT NULL,
  member_id             INTEGER REFERENCES team(id) ON DELETE SET NULL,
  external_member_name  TEXT,
  team_label            TEXT NOT NULL,
  site                  TEXT NOT NULL,
  horaire_start         TEXT NOT NULL,
  horaire_end           TEXT NOT NULL,
  phone                 TEXT,
  task                  TEXT NOT NULL,
  linked_project_id     INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  linked_ticket_id      INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
  status                TEXT NOT NULL CHECK (status IN ('À faire', 'En cours', 'Terminé')),
  CONSTRAINT chk_assignment_has_member CHECK (member_id IS NOT NULL OR external_member_name IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS history (
  id                 SERIAL PRIMARY KEY,
  member_id          INTEGER REFERENCES team(id) ON DELETE SET NULL,
  member_label       TEXT NOT NULL,
  team_label         TEXT NOT NULL,
  task               TEXT NOT NULL,
  date               DATE NOT NULL,
  linked_project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  linked_ticket_id   INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
  completed_at       DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_assignments_date ON assignments (date);
CREATE INDEX IF NOT EXISTS idx_leaves_member ON leaves (member_id);
CREATE INDEX IF NOT EXISTS idx_project_steps_project ON project_steps (project_id);
CREATE INDEX IF NOT EXISTS idx_project_materials_project ON project_materials (project_id);

-- ---------- Données du tableau "Planning Service Technique" (design actuel) ----------
-- Le statut d'une tâche (todo/doing/done), qu'elle soit générée par le
-- planning du jour ou ajoutée à la main, est identifié par un id texte
-- stable (ex. "2026-9-14|3" ou "2026-9-14|x0|3"), dont le dernier segment
-- après le dernier "|" est toujours l'id du membre concerné (team.id) —
-- utilisé pour vérifier qu'un agent ne modifie que ses propres tâches.
CREATE TABLE IF NOT EXISTS task_status (
  task_id     TEXT PRIMARY KEY,
  status      TEXT NOT NULL CHECK (status IN ('todo', 'doing', 'done')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS extra_tasks (
  id          SERIAL PRIMARY KEY,
  day         DATE NOT NULL,
  title       TEXT NOT NULL,
  urgent      BOOLEAN NOT NULL DEFAULT false,
  member_id   INTEGER NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  site        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_extra_tasks_day ON extra_tasks (day);

CREATE TABLE IF NOT EXISTS zones (
  id           TEXT PRIMARY KEY,
  site         TEXT NOT NULL,
  name         TEXT NOT NULL,
  base_status  TEXT NOT NULL CHECK (base_status IN ('ok', 'soon', 'urgent'))
);

CREATE TABLE IF NOT EXISTS zone_status (
  zone_id     TEXT PRIMARY KEY REFERENCES zones(id) ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('ok', 'soon', 'urgent')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Messagerie d'équipe (Phase 2, lot 04) ----------
CREATE TABLE IF NOT EXISTS messages (
  id              SERIAL PRIMARY KEY,
  author_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name     TEXT NOT NULL,
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (id);

-- ---------- Journal d'audit (Phase 3, lot 08) ----------
CREATE TABLE IF NOT EXISTS audit_log (
  id             BIGSERIAL PRIMARY KEY,
  actor_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name     TEXT NOT NULL,
  action         TEXT NOT NULL,
  target         TEXT,
  details        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_id ON audit_log (id DESC);
