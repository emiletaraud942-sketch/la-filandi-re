-- Phase 2 : émargement (pointage, formations et réunions, activités) et frais invisibles.
create type public.session_kind as enum ('formation', 'reunion', 'activite');
create type public.attendance_status as enum ('present', 'absent', 'excused');
create type public.expense_category as enum ('pet', 'tps', 'cout');

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  kind public.session_kind not null,
  title text not null,
  day date not null,
  start_min smallint not null check (start_min between 0 and 1439),
  end_min smallint not null check (end_min between 1 and 1440 and end_min > start_min),
  place text,
  lead text,
  closed_at timestamptz,
  created_by uuid references public.profiles (id) default auth.uid()
);
create index sessions_day_idx on public.sessions (day);
create index sessions_created_by_idx on public.sessions (created_by);

create table public.session_attendees (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  staff_id uuid references public.staff (id),
  resident_id uuid references public.residents (id),
  status public.attendance_status,
  signed_at timestamptz,
  check ((staff_id is null) <> (resident_id is null))
);
create unique index session_attendees_staff_uq on public.session_attendees (session_id, staff_id) where staff_id is not null;
create unique index session_attendees_resident_uq on public.session_attendees (session_id, resident_id) where resident_id is not null;
create index session_attendees_staff_idx on public.session_attendees (staff_id);
create index session_attendees_resident_idx on public.session_attendees (resident_id);

-- Une feuille clôturée ne se modifie plus.
create function public.session_attendees_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select closed_at from public.sessions where id = coalesce(new.session_id, old.session_id)) is not null then
    raise exception 'Feuille clôturée';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if new.status = 'present' and new.signed_at is null then new.signed_at := now(); end if;
  return new;
end
$$;
revoke execute on function public.session_attendees_guard() from public, anon, authenticated;
create trigger session_attendees_guard before insert or update or delete on public.session_attendees
  for each row execute function public.session_attendees_guard();

create table public.time_clock (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  day date not null default private.paris_today(),
  in_at timestamptz not null default now(),
  out_at timestamptz,
  check (out_at is null or out_at > in_at)
);
create index time_clock_staff_day_idx on public.time_clock (staff_id, day);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  day date not null default private.paris_today(),
  category public.expense_category not null,
  subcategory text not null,
  floor_id smallint references public.floors (id),
  amount_cents integer not null check (amount_cents >= 0),
  hours numeric(5, 1) not null default 0 check (hours >= 0),
  note text,
  created_by uuid references public.profiles (id) default auth.uid()
);
create index expenses_day_idx on public.expenses (day);
create index expenses_floor_idx on public.expenses (floor_id);
create index expenses_created_by_idx on public.expenses (created_by);

create table public.expense_targets (
  category public.expense_category not null,
  month date not null check (extract(day from month) = 1),
  target_cents integer not null check (target_cents >= 0),
  primary key (category, month)
);

create trigger audit_sessions after insert or update or delete on public.sessions
  for each row execute function public.audit_row();
create trigger audit_expenses after insert or update or delete on public.expenses
  for each row execute function public.audit_row();

alter table public.sessions enable row level security;
alter table public.session_attendees enable row level security;
alter table public.time_clock enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_targets enable row level security;

create policy sessions_read on public.sessions for select to authenticated using (true);
create policy session_attendees_read on public.session_attendees for select to authenticated using (true);
create policy sessions_insert on public.sessions for insert to authenticated with check ((select private.can_edit_planning()));
create policy sessions_update on public.sessions for update to authenticated using ((select private.can_edit_planning())) with check ((select private.can_edit_planning()));
create policy sessions_delete on public.sessions for delete to authenticated using ((select private.can_edit_planning()));
create policy session_attendees_insert on public.session_attendees for insert to authenticated with check ((select private.can_edit_planning()));
create policy session_attendees_update on public.session_attendees for update to authenticated using ((select private.can_edit_planning()) or staff_id = (select private.my_staff_id())) with check ((select private.can_edit_planning()) or staff_id = (select private.my_staff_id()));
create policy session_attendees_delete on public.session_attendees for delete to authenticated using ((select private.can_edit_planning()));

-- Pointage : chacun voit et enregistre le sien ; les responsables voient tout.
create policy time_clock_read on public.time_clock for select to authenticated using (staff_id = (select private.my_staff_id()) or (select private.is_manager()));
create policy time_clock_insert on public.time_clock for insert to authenticated with check (staff_id = (select private.my_staff_id()) or (select private.is_manager()));
create policy time_clock_update on public.time_clock for update to authenticated using (staff_id = (select private.my_staff_id()) or (select private.is_manager())) with check (staff_id = (select private.my_staff_id()) or (select private.is_manager()));
create policy time_clock_delete on public.time_clock for delete to authenticated using ((select private.is_manager()));

-- Frais : saisie par tout le personnel, lecture et réglages réservés aux responsables.
create policy expenses_read on public.expenses for select to authenticated using ((select private.is_manager()));
create policy expenses_insert on public.expenses for insert to authenticated with check (created_by = (select auth.uid()));
create policy expenses_update on public.expenses for update to authenticated using ((select private.is_manager())) with check ((select private.is_manager()));
create policy expenses_delete on public.expenses for delete to authenticated using ((select private.is_manager()));
create policy expense_targets_read on public.expense_targets for select to authenticated using ((select private.is_manager()));
create policy expense_targets_insert on public.expense_targets for insert to authenticated with check ((select private.is_manager()));
create policy expense_targets_update on public.expense_targets for update to authenticated using ((select private.is_manager())) with check ((select private.is_manager()));
create policy expense_targets_delete on public.expense_targets for delete to authenticated using ((select private.is_manager()));
