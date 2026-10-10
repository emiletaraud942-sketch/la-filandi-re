-- La Filandière : fondations (phase 1)
-- Données V1 : aucune donnée de santé. Résidents pseudonymisés (civilité + initiales).

-- ───────────────────────── Types ─────────────────────────
create type public.app_role as enum ('admin', 'direction', 'cadre', 'soignant', 'animation', 'accueil', 'technique');

-- ───────────────────────── Référentiels ─────────────────────────
create table public.floors (
  id smallint primary key,
  name text not null,
  short text not null,
  note text
);

create table public.job_roles (
  code text primary key,
  label text not null,
  sort smallint not null,
  min_morning smallint not null default 0,
  min_evening smallint not null default 0,
  min_night smallint not null default 0
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  floor_id smallint not null references public.floors (id),
  number text not null unique,
  wing text not null check (wing in ('N', 'S'))
);
create index rooms_floor_id_idx on public.rooms (floor_id);

-- ───────────────────────── Personnes ─────────────────────────
create table public.residents (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id),
  display_name text not null,            -- ex. « Mme H. H. » : jamais de nom complet en V1
  away boolean not null default false,   -- en sortie
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index residents_room_id_idx on public.residents (room_id);
create unique index residents_one_active_per_room on public.residents (room_id) where active;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'soignant',
  job_code text references public.job_roles (code),
  floor_id smallint references public.floors (id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index profiles_job_code_idx on public.profiles (job_code);
create index profiles_floor_id_idx on public.profiles (floor_id);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  job_code text not null references public.job_roles (code),
  floor_id smallint references public.floors (id),
  profile_id uuid unique references public.profiles (id) on delete set null,
  active boolean not null default true
);
create index staff_job_code_idx on public.staff (job_code);
create index staff_floor_id_idx on public.staff (floor_id);

-- ───────────────────────── Journal d'audit ─────────────────────────
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  table_name text not null,
  row_id text,
  old_data jsonb,
  new_data jsonb
);
create index audit_log_at_idx on public.audit_log (at desc);

-- ───────────────────────── Fonctions ─────────────────────────
-- Les aides aux politiques RLS vivent dans le schéma « private » : il n'est pas exposé par l'API REST.
create schema if not exists private;
grant usage on schema private to authenticated;

create function private.current_app_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.active
$$;

create function private.is_manager()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select private.current_app_role()) in ('admin', 'direction', 'cadre'), false)
$$;

create function private.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select private.current_app_role()) = 'admin', false)
$$;

create function public.audit_row()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.audit_log (actor, action, table_name, row_id, old_data)
    values (auth.uid(), tg_op, tg_table_name, to_jsonb(old) ->> 'id', to_jsonb(old));
    return old;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log (actor, action, table_name, row_id, old_data, new_data)
    values (auth.uid(), tg_op, tg_table_name, to_jsonb(new) ->> 'id', to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.audit_log (actor, action, table_name, row_id, new_data)
    values (auth.uid(), tg_op, tg_table_name, to_jsonb(new) ->> 'id', to_jsonb(new));
    return new;
  end if;
end
$$;

create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)));
  return new;
end
$$;

-- Ces fonctions ne sont appelées que par des déclencheurs ou par les politiques RLS.
revoke execute on function public.audit_row() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function private.current_app_role() from public, anon;
revoke execute on function private.is_manager() from public, anon;
revoke execute on function private.is_admin() from public, anon;
grant execute on function private.current_app_role() to authenticated;
grant execute on function private.is_manager() to authenticated;
grant execute on function private.is_admin() to authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger audit_rooms after insert or update or delete on public.rooms
  for each row execute function public.audit_row();
create trigger audit_residents after insert or update or delete on public.residents
  for each row execute function public.audit_row();
create trigger audit_staff after insert or update or delete on public.staff
  for each row execute function public.audit_row();
create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function public.audit_row();

-- ───────────────────────── Sécurité par ligne (RLS) ─────────────────────────
alter table public.floors enable row level security;
alter table public.job_roles enable row level security;
alter table public.rooms enable row level security;
alter table public.residents enable row level security;
alter table public.profiles enable row level security;
alter table public.staff enable row level security;
alter table public.audit_log enable row level security;

-- Lecture : tout utilisateur connecté. Aucune lecture anonyme.
create policy floors_read on public.floors for select to authenticated using (true);
create policy job_roles_read on public.job_roles for select to authenticated using (true);
create policy rooms_read on public.rooms for select to authenticated using (true);
create policy residents_read on public.residents for select to authenticated using (true);
create policy staff_read on public.staff for select to authenticated using (true);

-- Écriture : admin, direction et cadre.
create policy floors_write on public.floors for all to authenticated
  using ((select private.is_manager())) with check ((select private.is_manager()));
create policy job_roles_write on public.job_roles for all to authenticated
  using ((select private.is_manager())) with check ((select private.is_manager()));
create policy rooms_write on public.rooms for all to authenticated
  using ((select private.is_manager())) with check ((select private.is_manager()));
create policy residents_write on public.residents for all to authenticated
  using ((select private.is_manager())) with check ((select private.is_manager()));
create policy staff_write on public.staff for all to authenticated
  using ((select private.is_manager())) with check ((select private.is_manager()));

-- Profils : chacun voit le sien, les responsables voient tout, seul l'admin modifie (pas d'auto-promotion).
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_manager()));
create policy profiles_update on public.profiles for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Journal : lecture admin et direction uniquement. Les écritures passent par le déclencheur.
create policy audit_read on public.audit_log for select to authenticated
  using ((select private.current_app_role()) in ('admin', 'direction'));

-- ───────────────────────── Vue : occupation des chambres ─────────────────────────
create view public.rooms_overview with (security_invoker = true) as
select r.id, r.number, r.wing, r.floor_id,
       res.id as resident_id, res.display_name as resident_name,
       case when res.id is null then 'free' when res.away then 'away' else 'occupied' end as state
from public.rooms r
left join public.residents res on res.room_id = r.id and res.active;

-- ───────────────────────── Données de référence (non sensibles) ─────────────────────────
insert into public.floors (id, name, short, note) values
  (0, 'Rez-de-chaussée', 'RDC', 'Unité protégée'),
  (1, '1er étage', '1er', null),
  (2, '2e étage', '2e', null),
  (3, '3e étage', '3e', null);

insert into public.job_roles (code, label, sort, min_morning, min_evening, min_night) values
  ('IDE', 'Infirmiers', 1, 2, 2, 1),
  ('AS', 'Aides-soignants', 2, 5, 4, 2),
  ('AES', 'AES / AMP', 3, 2, 1, 1),
  ('ASHQ', 'Agents de service', 4, 3, 2, 0),
  ('ANI', 'Animation', 5, 1, 0, 0),
  ('TECH', 'Services techniques', 6, 1, 0, 0),
  ('ACC', 'Accueil et administratif', 7, 2, 1, 0);

-- 31 chambres par étage (plan illustratif, à remplacer par le plan réel).
insert into public.rooms (floor_id, number, wing)
select f, lpad((f * 100 + n)::text, 3, '0'), case when n <= 16 then 'N' else 'S' end
from generate_series(0, 3) f, generate_series(1, 31) n;

-- Remarque : les 124 insertions de chambres ci-dessus laissent 124 lignes « INSERT rooms » dans audit_log.
