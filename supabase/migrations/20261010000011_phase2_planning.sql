-- Phase 2 : tâches par chambre, plannings d'équipe, journée du résident.
create type public.task_status as enum ('todo', 'wip', 'done');
create type public.shift_kind as enum ('m', 's', 'n', 'off', 'leave', 'abs');
create type public.event_kind as enum ('meal', 'ani', 'vis', 'coif', 'out');

create table public.task_types (
  code text primary key,
  label text not null,
  job_code text references public.job_roles (code),
  default_start_min smallint not null,
  duration_min smallint not null
);
create index task_types_job_code_idx on public.task_types (job_code);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id),
  type_code text references public.task_types (code),
  label text not null,
  day date not null default private.paris_today(),
  start_min smallint not null check (start_min between 0 and 1439),
  end_min smallint not null check (end_min between 1 and 1440 and end_min > start_min),
  status public.task_status not null default 'todo',
  assigned_to uuid references public.staff (id),
  done_at timestamptz,
  done_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index tasks_day_room_idx on public.tasks (day, room_id);
create index tasks_assigned_day_idx on public.tasks (assigned_to, day);
create index tasks_room_id_idx on public.tasks (room_id);
create index tasks_type_code_idx on public.tasks (type_code);
create index tasks_done_by_idx on public.tasks (done_by);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  day date not null,
  kind public.shift_kind not null,
  pause_start_min smallint,
  unique (staff_id, day)
);
create index shifts_day_idx on public.shifts (day);

create table public.resident_events (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.residents (id) on delete cascade,
  day date not null,
  start_min smallint not null check (start_min between 0 and 1439),
  label text not null,
  place text,
  kind public.event_kind not null
);
create index resident_events_resident_day_idx on public.resident_events (resident_id, day);

-- Statut calculé de chaque tâche : en retard si non faite et terminée depuis, en cours si commencée.
create view public.task_progress with (security_invoker = true) as
select t.*,
  case
    when t.status = 'done' then 'done'
    when t.day < private.paris_today() or (t.day = private.paris_today() and t.end_min < private.paris_now_min()) then 'late'
    when t.status = 'wip' or (t.day = private.paris_today() and t.start_min <= private.paris_now_min()) then 'wip'
    else 'todo'
  end as effective_status
from public.tasks t;

-- Pastille de chaque chambre : rouge (retard) > orange (en cours) > vert (à jour) > gris.
create view public.room_status with (security_invoker = true) as
select r.id as room_id, r.number, r.floor_id, p.day,
  case
    when bool_or(p.effective_status = 'late') then 'late'
    when bool_or(p.effective_status = 'wip') then 'wip'
    when bool_or(p.effective_status = 'done') then 'ok'
    else 'none'
  end as dot
from public.rooms r
join public.task_progress p on p.room_id = r.id
group by r.id, r.number, r.floor_id, p.day;

-- Un soignant ne peut changer que l'avancement de ses propres tâches.
create function public.tasks_guard()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if (select private.is_manager()) then
    return new;
  end if;
  if new.room_id is distinct from old.room_id or new.label is distinct from old.label or new.day is distinct from old.day
     or new.start_min is distinct from old.start_min or new.end_min is distinct from old.end_min
     or new.assigned_to is distinct from old.assigned_to or new.type_code is distinct from old.type_code then
    raise exception 'Seul l''avancement d''une tâche peut être modifié';
  end if;
  if new.status = 'done' and old.status <> 'done' then
    new.done_at := now();
    new.done_by := auth.uid();
  elsif new.status <> 'done' then
    new.done_at := null;
    new.done_by := null;
  end if;
  return new;
end
$$;
revoke execute on function public.tasks_guard() from public, anon, authenticated;
create trigger tasks_guard before update on public.tasks for each row execute function public.tasks_guard();

create trigger audit_tasks after insert or update or delete on public.tasks
  for each row execute function public.audit_row();

alter table public.task_types enable row level security;
alter table public.tasks enable row level security;
alter table public.shifts enable row level security;
alter table public.resident_events enable row level security;

create policy task_types_read on public.task_types for select to authenticated using (true);
create policy tasks_read on public.tasks for select to authenticated using (true);
create policy shifts_read on public.shifts for select to authenticated using (true);
create policy resident_events_read on public.resident_events for select to authenticated using (true);

create policy task_types_insert on public.task_types for insert to authenticated with check ((select private.is_manager()));
create policy task_types_update on public.task_types for update to authenticated using ((select private.is_manager())) with check ((select private.is_manager()));
create policy task_types_delete on public.task_types for delete to authenticated using ((select private.is_manager()));

create policy tasks_insert on public.tasks for insert to authenticated with check ((select private.is_manager()));
create policy tasks_update on public.tasks for update to authenticated
  using ((select private.is_manager()) or assigned_to = (select private.my_staff_id()))
  with check ((select private.is_manager()) or assigned_to = (select private.my_staff_id()));
create policy tasks_delete on public.tasks for delete to authenticated using ((select private.is_manager()));

create policy shifts_insert on public.shifts for insert to authenticated with check ((select private.is_manager()));
create policy shifts_update on public.shifts for update to authenticated using ((select private.is_manager())) with check ((select private.is_manager()));
create policy shifts_delete on public.shifts for delete to authenticated using ((select private.is_manager()));

create policy resident_events_insert on public.resident_events for insert to authenticated with check ((select private.can_edit_planning()));
create policy resident_events_update on public.resident_events for update to authenticated using ((select private.can_edit_planning())) with check ((select private.can_edit_planning()));
create policy resident_events_delete on public.resident_events for delete to authenticated using ((select private.can_edit_planning()));

-- Types de tâches de référence.
insert into public.task_types (code, label, job_code, default_start_min, duration_min) values
  ('pdj', 'Petit-déjeuner', 'AS', 450, 40),
  ('lit', 'Réfection du lit', 'AS', 540, 15),
  ('men', 'Ménage de la chambre', 'ASHQ', 570, 30),
  ('lin', 'Linge de toilette', 'ASHQ', 600, 15),
  ('tec', 'Contrôle du bouton d’appel', 'TECH', 660, 10),
  ('dej', 'Plateau déjeuner', 'AS', 720, 45),
  ('vis', 'Visite de la famille', 'ACC', 870, 60),
  ('ani', 'Accompagnement à l’animation', 'AES', 900, 60),
  ('gou', 'Goûter', 'AS', 960, 30),
  ('din', 'Plateau dîner', 'AS', 1110, 45),
  ('prep', 'Préparer la chambre pour une arrivée', 'ASHQ', 660, 40);
