-- Phase 2 : réservation de visite. La famille n'a pas de compte : le formulaire public passe par une
-- route serveur (clé de service), jamais par un accès direct anonyme à ces tables.
create type public.visit_status as enum ('pending', 'confirmed', 'refused');

create table public.visit_slots (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  start_min smallint not null check (start_min between 0 and 1439),
  capacity smallint not null default 12 check (capacity > 0),
  unique (day, start_min)
);

create table public.visit_requests (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.visit_slots (id),
  visitor_name text not null,
  visitor_email text not null check (position('@' in visitor_email) > 1),
  resident_label text not null,
  resident_id uuid references public.residents (id),
  persons smallint not null check (persons between 1 and 2),
  charter_accepted boolean not null check (charter_accepted),
  status public.visit_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id),
  decided_at timestamptz
);
create index visit_requests_slot_idx on public.visit_requests (slot_id);
create index visit_requests_status_idx on public.visit_requests (status);
create index visit_requests_resident_idx on public.visit_requests (resident_id);
create index visit_requests_decided_by_idx on public.visit_requests (decided_by);

-- Places restantes par créneau (personnes confirmées uniquement).
create view public.slot_availability with (security_invoker = true) as
select s.id as slot_id, s.day, s.start_min, s.capacity,
  coalesce(sum(r.persons) filter (where r.status = 'confirmed'), 0)::integer as booked,
  s.capacity - coalesce(sum(r.persons) filter (where r.status = 'confirmed'), 0)::integer as remaining
from public.visit_slots s
left join public.visit_requests r on r.slot_id = s.id
group by s.id;

-- Une confirmation ne peut pas dépasser la jauge du créneau.
create function public.visit_requests_check()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare cap integer; taken integer;
begin
  if new.status = 'confirmed' and (tg_op = 'INSERT' or old.status is distinct from 'confirmed') then
    select capacity into cap from public.visit_slots where id = new.slot_id for update;
    select coalesce(sum(persons), 0) into taken from public.visit_requests
      where slot_id = new.slot_id and status = 'confirmed' and id <> new.id;
    if taken + new.persons > cap then
      raise exception 'Jauge du créneau dépassée';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.decided_by := auth.uid();
    new.decided_at := now();
  end if;
  return new;
end
$$;
revoke execute on function public.visit_requests_check() from public, anon, authenticated;
create trigger visit_requests_check before insert or update on public.visit_requests
  for each row execute function public.visit_requests_check();
create trigger audit_visit_requests after insert or update or delete on public.visit_requests
  for each row execute function public.audit_row();

alter table public.visit_slots enable row level security;
alter table public.visit_requests enable row level security;

create policy visit_slots_read on public.visit_slots for select to authenticated using (true);
create policy visit_slots_insert on public.visit_slots for insert to authenticated with check ((select private.can_manage_visits()));
create policy visit_slots_update on public.visit_slots for update to authenticated using ((select private.can_manage_visits())) with check ((select private.can_manage_visits()));
create policy visit_slots_delete on public.visit_slots for delete to authenticated using ((select private.can_manage_visits()));

-- Les e-mails de familles ne sont visibles que de l'accueil et des responsables.
create policy visit_requests_read on public.visit_requests for select to authenticated using ((select private.can_manage_visits()));
create policy visit_requests_insert on public.visit_requests for insert to authenticated with check ((select private.can_manage_visits()));
create policy visit_requests_update on public.visit_requests for update to authenticated using ((select private.can_manage_visits())) with check ((select private.can_manage_visits()));
create policy visit_requests_delete on public.visit_requests for delete to authenticated using ((select private.can_manage_visits()));
