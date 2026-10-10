-- Visites : formulaire public des familles (sans compte), créneaux, file de courriers à envoyer.
-- Les familles n'ont aucun accès direct aux tables : elles passent par deux fonctions contrôlées.

create table public.outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  body text not null,
  kind text not null check (kind in ('visit_received', 'visit_confirmed', 'visit_refused')),
  request_id uuid references public.visit_requests (id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  error text
);
create index outbox_unsent_idx on public.outbox (created_at) where sent_at is null;
create index outbox_request_idx on public.outbox (request_id);
alter table public.outbox enable row level security;
create policy outbox_read on public.outbox for select to authenticated using ((select private.can_manage_visits()));
create policy outbox_update on public.outbox for update to authenticated using ((select private.can_manage_visits())) with check ((select private.can_manage_visits()));

-- Date en français : « jeudi 15 octobre ».
create function private.fr_date(d date)
returns text
language sql immutable set search_path = ''
as $$
  select (array['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'])[extract(dow from d)::int + 1]
         || ' ' || extract(day from d)::int || ' '
         || (array['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'])[extract(month from d)::int]
$$;

create function private.fr_time(m integer)
returns text
language sql immutable set search_path = ''
as $$ select lpad((m / 60)::text, 2, '0') || ':' || lpad((m % 60)::text, 2, '0') $$;

-- Un courrier est mis en file à chaque création et à chaque décision.
create function public.visit_requests_outbox()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare s record; first_name text; when_txt text;
begin
  select day, start_min into s from public.visit_slots where id = new.slot_id;
  first_name := split_part(new.visitor_name, ' (', 1);
  when_txt := private.fr_date(s.day) || ' à ' || private.fr_time(s.start_min);
  if tg_op = 'INSERT' then
    insert into public.outbox (to_email, subject, body, kind, request_id) values (
      new.visitor_email, 'Nous avons bien reçu votre demande de visite', 'visit_received'::text || '', 'visit_received', new.id);
    update public.outbox set body = 'Bonjour ' || first_name || E',\n\nVotre demande pour le ' || when_txt || ' est en cours d''examen. Vous recevrez une réponse par e-mail sous 24 heures.\n\nL''équipe d''accueil de La Filandière'
      where request_id = new.id and kind = 'visit_received';
  elsif new.status is distinct from old.status and new.status = 'confirmed' then
    insert into public.outbox (to_email, subject, body, kind, request_id) values (
      new.visitor_email, 'Votre visite du ' || private.fr_date(s.day) || ' est confirmée',
      'Bonjour ' || first_name || E',\n\nNous vous confirmons votre visite le ' || when_txt || ' pour ' || new.persons || ' personne' || case when new.persons > 1 then 's' else '' end
      || E'.\n\nMerci de vous présenter à l''accueil quelques minutes avant, avec cet e-mail. Rappel de la charte : lavage des mains, port du masque si demandé.\n\nL''équipe d''accueil de La Filandière',
      'visit_confirmed', new.id);
  elsif new.status is distinct from old.status and new.status = 'refused' then
    insert into public.outbox (to_email, subject, body, kind, request_id) values (
      new.visitor_email, 'Votre demande de visite : créneau indisponible',
      'Bonjour ' || first_name || E',\n\nNous ne pouvons pas accepter la visite du ' || when_txt || E'. D''autres horaires sont possibles : n''hésitez pas à refaire une demande sur un autre créneau.\n\nL''équipe d''accueil de La Filandière',
      'visit_refused', new.id);
  end if;
  return new;
end
$$;
revoke execute on function public.visit_requests_outbox() from public, anon, authenticated;
create trigger visit_requests_outbox after insert or update of status on public.visit_requests
  for each row execute function public.visit_requests_outbox();

-- Créneaux à venir, avec les places restantes : aucune donnée personnelle.
create function public.public_visit_slots()
returns table (slot_id uuid, day date, start_min smallint, remaining integer)
language sql stable security definer set search_path = ''
as $$
  select s.id, s.day, s.start_min,
         s.capacity - coalesce((select sum(r.persons) from public.visit_requests r where r.slot_id = s.id and r.status = 'confirmed'), 0)::integer
  from public.visit_slots s
  where (s.day > private.paris_today() or (s.day = private.paris_today() and s.start_min > private.paris_now_min()))
    and s.day <= private.paris_today() + 14
  order by s.day, s.start_min
$$;
revoke execute on function public.public_visit_slots() from public;
grant execute on function public.public_visit_slots() to anon, authenticated;

-- Demande de visite d'une famille. Contrôles : charte, 1 à 2 personnes, e-mail, créneau futur avec places, 5 demandes par jour et par adresse.
create function public.request_visit(p_slot uuid, p_name text, p_email text, p_resident text, p_persons integer, p_charter boolean)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare s record; remaining integer; new_id uuid;
begin
  if not coalesce(p_charter, false) then raise exception 'Vous devez accepter la charte de visite.'; end if;
  if p_persons is null or p_persons not between 1 and 2 then raise exception 'Une visite accueille une ou deux personnes.'; end if;
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 120 then raise exception 'Adresse e-mail invalide.'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 or length(p_name) > 80 then raise exception 'Indiquez votre nom.'; end if;
  if length(trim(coalesce(p_resident, ''))) < 2 or length(p_resident) > 80 then raise exception 'Indiquez le nom du résident.'; end if;
  select * into s from public.visit_slots where id = p_slot;
  if not found or s.day < private.paris_today() or (s.day = private.paris_today() and s.start_min <= private.paris_now_min()) then
    raise exception 'Ce créneau n''est plus disponible.';
  end if;
  select s.capacity - coalesce(sum(r.persons), 0) into remaining from public.visit_requests r where r.slot_id = p_slot and r.status = 'confirmed';
  remaining := coalesce(remaining, s.capacity);
  if remaining < p_persons then raise exception 'Il ne reste pas assez de places sur ce créneau.'; end if;
  if (select count(*) from public.visit_requests r where lower(r.visitor_email) = lower(p_email) and r.created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Trop de demandes pour cette adresse aujourd''hui. Merci de contacter l''accueil.';
  end if;
  insert into public.visit_requests (slot_id, visitor_name, visitor_email, resident_label, persons, charter_accepted)
  values (p_slot, trim(p_name), trim(p_email), trim(p_resident), p_persons, true) returning id into new_id;
  return new_id;
end
$$;
revoke execute on function public.request_visit(uuid, text, text, text, integer, boolean) from public;
grant execute on function public.request_visit(uuid, text, text, text, integer, boolean) to anon, authenticated;

-- Ouvre les créneaux standard (10 h, 11 h, 14 h, 15 h, 16 h, 17 h) pour les prochains jours. Sans doublon.
create function public.generate_visit_slots(p_from date default null, p_days integer default 7)
returns integer
language plpgsql security invoker set search_path = ''
as $$
declare n integer;
begin
  if not ((select private.can_manage_visits()) or current_user in ('postgres', 'service_role')) then
    raise exception 'Réservé à l''accueil et aux responsables';
  end if;
  insert into public.visit_slots (day, start_min, capacity)
  select d::date, m, 12
  from generate_series(coalesce(p_from, private.paris_today()), coalesce(p_from, private.paris_today()) + greatest(p_days, 1) - 1, interval '1 day') d,
       unnest(array[600, 660, 840, 900, 960, 1020]) m
  on conflict (day, start_min) do nothing;
  get diagnostics n = row_count;
  return n;
end
$$;
revoke execute on function public.generate_visit_slots(date, integer) from public, anon;
grant execute on function public.generate_visit_slots(date, integer) to authenticated;
