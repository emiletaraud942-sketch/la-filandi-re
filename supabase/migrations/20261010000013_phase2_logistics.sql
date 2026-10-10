-- Phase 2 : stock et véhicules (saisie manuelle, aucune géolocalisation).
create table public.stock_locations (
  code text primary key,
  label text not null,
  level text not null
);

create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('hyg', 'lin', 'ent', 'res', 'tec')),
  location_code text not null references public.stock_locations (code),
  qty integer not null default 0 check (qty >= 0),
  min_qty integer not null default 0 check (min_qty >= 0),
  max_qty integer not null check (max_qty > 0),
  weekly_use integer not null default 0 check (weekly_use >= 0),
  unit text not null,
  ordered_at timestamptz
);
create index stock_items_location_idx on public.stock_items (location_code);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.stock_items (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text,
  by_user uuid references public.profiles (id) default auth.uid(),
  at timestamptz not null default now()
);
create index stock_movements_item_idx on public.stock_movements (item_id, at desc);
create index stock_movements_by_user_idx on public.stock_movements (by_user);

-- Chaque mouvement met la quantité à jour (consommation = négatif, livraison = positif).
create function public.stock_apply_movement()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.stock_items set qty = qty + new.delta, ordered_at = case when new.delta > 0 then null else ordered_at end
  where id = new.item_id;
  return new;
end
$$;
revoke execute on function public.stock_apply_movement() from public, anon, authenticated;
create trigger stock_apply_movement after insert on public.stock_movements
  for each row execute function public.stock_apply_movement();

create view public.stock_status with (security_invoker = true) as
select i.*,
  case when i.qty = 0 then 'late' when i.qty <= i.min_qty then 'wip' else 'ok' end as level,
  case when i.weekly_use > 0 then round(i.qty::numeric / i.weekly_use * 7) end as days_left
from public.stock_items i;

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  model text not null,
  plate text not null unique,
  odometer integer not null check (odometer >= 0),
  next_service_km integer not null,
  ct_due date,
  insurance_due date,
  in_garage boolean not null default false
);

create type public.booking_period as enum ('m', 'a', 'j');

create table public.vehicle_bookings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  day date not null,
  period public.booking_period not null,
  motif text not null,
  driver_id uuid references public.staff (id),
  created_by uuid references public.profiles (id) default auth.uid()
);
create index vehicle_bookings_vehicle_day_idx on public.vehicle_bookings (vehicle_id, day);
create index vehicle_bookings_driver_idx on public.vehicle_bookings (driver_id);
create index vehicle_bookings_created_by_idx on public.vehicle_bookings (created_by);

-- Deux réservations d'un même véhicule ne peuvent pas se chevaucher (« journée » couvre matin et après-midi).
create function public.vehicle_bookings_check()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (
    select 1 from public.vehicle_bookings b
    where b.vehicle_id = new.vehicle_id and b.day = new.day and b.id <> new.id
      and (b.period = 'j' or new.period = 'j' or b.period = new.period)
  ) then
    raise exception 'Véhicule déjà réservé sur ce créneau';
  end if;
  if (select in_garage from public.vehicles where id = new.vehicle_id) then
    raise exception 'Véhicule au garage';
  end if;
  return new;
end
$$;
revoke execute on function public.vehicle_bookings_check() from public, anon, authenticated;
create trigger vehicle_bookings_check before insert or update on public.vehicle_bookings
  for each row execute function public.vehicle_bookings_check();

create table public.vehicle_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  day date not null default private.paris_today(),
  kind text not null check (kind in ('trip', 'fuel', 'maint')),
  label text not null,
  km integer not null default 0 check (km >= 0),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  driver_id uuid references public.staff (id),
  created_by uuid references public.profiles (id) default auth.uid()
);
create index vehicle_logs_vehicle_day_idx on public.vehicle_logs (vehicle_id, day desc);
create index vehicle_logs_driver_idx on public.vehicle_logs (driver_id);
create index vehicle_logs_created_by_idx on public.vehicle_logs (created_by);

-- Un trajet fait avancer le compteur du véhicule.
create function public.vehicle_logs_apply()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.kind = 'trip' and new.km > 0 then
    update public.vehicles set odometer = odometer + new.km where id = new.vehicle_id;
  end if;
  return new;
end
$$;
revoke execute on function public.vehicle_logs_apply() from public, anon, authenticated;
create trigger vehicle_logs_apply after insert on public.vehicle_logs
  for each row execute function public.vehicle_logs_apply();

alter table public.stock_locations enable row level security;
alter table public.stock_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_bookings enable row level security;
alter table public.vehicle_logs enable row level security;

create policy stock_locations_read on public.stock_locations for select to authenticated using (true);
create policy stock_items_read on public.stock_items for select to authenticated using (true);
create policy stock_movements_read on public.stock_movements for select to authenticated using (true);
create policy vehicles_read on public.vehicles for select to authenticated using (true);
create policy vehicle_bookings_read on public.vehicle_bookings for select to authenticated using (true);
create policy vehicle_logs_read on public.vehicle_logs for select to authenticated using (true);

create policy stock_locations_insert on public.stock_locations for insert to authenticated with check ((select private.can_manage_logistics()));
create policy stock_locations_update on public.stock_locations for update to authenticated using ((select private.can_manage_logistics())) with check ((select private.can_manage_logistics()));
create policy stock_locations_delete on public.stock_locations for delete to authenticated using ((select private.can_manage_logistics()));
create policy stock_items_insert on public.stock_items for insert to authenticated with check ((select private.can_manage_logistics()));
create policy stock_items_update on public.stock_items for update to authenticated using ((select private.can_manage_logistics())) with check ((select private.can_manage_logistics()));
create policy stock_items_delete on public.stock_items for delete to authenticated using ((select private.can_manage_logistics()));
-- Tout le personnel connecté peut enregistrer une consommation ou une livraison.
create policy stock_movements_insert on public.stock_movements for insert to authenticated with check (by_user = (select auth.uid()));

create policy vehicles_insert on public.vehicles for insert to authenticated with check ((select private.can_manage_logistics()));
create policy vehicles_update on public.vehicles for update to authenticated using ((select private.can_manage_logistics())) with check ((select private.can_manage_logistics()));
create policy vehicles_delete on public.vehicles for delete to authenticated using ((select private.can_manage_logistics()));
create policy vehicle_bookings_insert on public.vehicle_bookings for insert to authenticated with check (created_by = (select auth.uid()));
create policy vehicle_bookings_update on public.vehicle_bookings for update to authenticated using (created_by = (select auth.uid()) or (select private.can_manage_logistics())) with check (created_by = (select auth.uid()) or (select private.can_manage_logistics()));
create policy vehicle_bookings_delete on public.vehicle_bookings for delete to authenticated using (created_by = (select auth.uid()) or (select private.can_manage_logistics()));
create policy vehicle_logs_insert on public.vehicle_logs for insert to authenticated with check (created_by = (select auth.uid()));
create policy vehicle_logs_update on public.vehicle_logs for update to authenticated using ((select private.can_manage_logistics())) with check ((select private.can_manage_logistics()));
create policy vehicle_logs_delete on public.vehicle_logs for delete to authenticated using ((select private.can_manage_logistics()));

insert into public.stock_locations (code, label, level) values
  ('res', 'Réserve centrale', 'RDC'), ('lin', 'Lingerie', 'RDC'), ('off', 'Office cuisine', 'RDC'),
  ('tec', 'Atelier technique', 'Sous-sol'), ('m1', 'Local ménage 1er', '1er'), ('m2', 'Local ménage 2e', '2e'), ('m3', 'Local ménage 3e', '3e');
