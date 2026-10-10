-- Phase 2 : aides communes (schéma private, non exposé par l'API REST).
create function private.can_edit_planning()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select private.current_app_role()) in ('admin', 'direction', 'cadre', 'animation'), false)
$$;

create function private.can_manage_visits()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select private.current_app_role()) in ('admin', 'direction', 'cadre', 'accueil'), false)
$$;

create function private.can_manage_logistics()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select private.current_app_role()) in ('admin', 'direction', 'cadre', 'technique'), false)
$$;

-- Heure et jour courants à Paris (l'établissement est en Normandie).
create function private.paris_now_min()
returns integer
language sql stable set search_path = ''
as $$
  select (extract(hour from now() at time zone 'Europe/Paris') * 60 + extract(minute from now() at time zone 'Europe/Paris'))::integer
$$;

create function private.paris_today()
returns date
language sql stable set search_path = ''
as $$
  select (now() at time zone 'Europe/Paris')::date
$$;

-- Le membre du personnel lié au compte connecté.
create function private.my_staff_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select s.id from public.staff s where s.profile_id = auth.uid() and s.active limit 1
$$;

revoke execute on function private.can_edit_planning() from public, anon;
revoke execute on function private.can_manage_visits() from public, anon;
revoke execute on function private.can_manage_logistics() from public, anon;
revoke execute on function private.paris_now_min() from public, anon;
revoke execute on function private.paris_today() from public, anon;
revoke execute on function private.my_staff_id() from public, anon;
grant execute on function private.can_edit_planning() to authenticated;
grant execute on function private.can_manage_visits() to authenticated;
grant execute on function private.can_manage_logistics() to authenticated;
grant execute on function private.paris_now_min() to authenticated;
grant execute on function private.paris_today() to authenticated;
grant execute on function private.my_staff_id() to authenticated;
