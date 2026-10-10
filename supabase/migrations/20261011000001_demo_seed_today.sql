-- DÉMONSTRATION : recrée pour la date du jour les plannings, les tâches et les journées des résidents (7 jours glissants).
-- Une commande : select public.demo_seed_today();
-- Réservée aux administrateurs et au propriétaire de la base (éditeur SQL de Supabase). Elle s'exécute avec les droits de l'appelant.
-- Sans doublon : relancée le même jour, elle n'ajoute rien. À retirer avant l'usage réel : drop function public.demo_seed_today();
create function public.demo_seed_today()
returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  d date := private.paris_today();
  n_shifts integer := 0;
  n_tasks integer := 0;
  n_events integer := 0;
begin
  if not ((select private.is_admin()) or current_user in ('postgres', 'service_role')) then
    raise exception 'Réservé aux administrateurs';
  end if;

  insert into public.shifts (staff_id, day, kind, pause_start_min)
  select s.id, d,
         case when s.job_code in ('ANI', 'TECH', 'ACC')
              then (case when s.r < 0.8 then 'm' when s.r < 0.9 then 's' else 'leave' end)::public.shift_kind
              else (case when s.r < 0.34 then 'm' when s.r < 0.58 then 's' when s.r < 0.74 then 'n'
                         when s.r < 0.88 then 'off' when s.r < 0.95 then 'leave' else 'abs' end)::public.shift_kind end,
         615 + (row_number() over ())::integer % 4 * 15
  from (select st.id, st.job_code, random() as r from public.staff st where st.active) s
  where not exists (select 1 from public.shifts x where x.staff_id = s.id and x.day = d);
  get diagnostics n_shifts = row_count;

  if not exists (select 1 from public.tasks t where t.day = d) then
    insert into public.tasks (room_id, type_code, label, day, start_min, end_min, status, assigned_to)
    select x.room_id, x.code, x.label, d, x.start_min, x.start_min + x.duration_min,
           (case when x.start_min + x.duration_min <= private.paris_now_min() then (case when random() < 0.96 then 'done' else 'todo' end)
                 when x.start_min <= private.paris_now_min() then 'wip' else 'todo' end)::public.task_status,
           (select s.id from public.staff s where s.job_code = x.job_code and s.active order by random() limit 1)
    from (
      select r.id as room_id, tt.code, tt.label, tt.job_code, tt.duration_min,
             tt.default_start_min + floor(random() * 3)::integer * 5 as start_min
      from public.rooms r
      join public.residents res on res.room_id = r.id and res.active
      join public.task_types tt on tt.code <> 'prep'
      where (tt.code in ('pdj', 'dej', 'gou', 'din') and not res.away)
         or (tt.code in ('men', 'lin') and random() < 0.7)
         or (tt.code in ('lit', 'tec') and random() < 0.25)
         or (tt.code in ('vis', 'ani') and not res.away and random() < 0.25)
      union all
      select r.id, tt.code, tt.label, tt.job_code, tt.duration_min, tt.default_start_min
      from public.rooms r
      join public.task_types tt on tt.code = 'prep'
      where not exists (select 1 from public.residents res where res.room_id = r.id and res.active) and random() < 0.55
    ) x;
    get diagnostics n_tasks = row_count;
  end if;

  insert into public.resident_events (resident_id, day, start_min, label, place, kind)
  select res.id, d + g.n, e.start_min, e.label, e.place, e.kind::public.event_kind
  from public.residents res
  cross join generate_series(0, 6) as g(n)
  cross join lateral (
    values (480, 'Petit-déjeuner', 'Chambre', 'meal', 1.0), (720, 'Déjeuner', 'Salle à manger', 'meal', 1.0),
           (960, 'Goûter', 'Salon', 'meal', 1.0), (1110, 'Dîner', 'Salle à manger', 'meal', 1.0),
           (630, 'Loto', 'Salon d’animation', 'ani', 0.65), (900, 'Chorale', 'Salon d’animation', 'ani', 0.55),
           (870, 'Visite de la famille', 'Chambre', 'vis', 0.4), (660, 'Coiffeuse', 'Salon de coiffure', 'coif', 0.2)
  ) as e(start_min, label, place, kind, p)
  where res.active and random() < e.p
    and not exists (select 1 from public.resident_events ev where ev.resident_id = res.id and ev.day = d + g.n);
  get diagnostics n_events = row_count;

  return jsonb_build_object('jour', d, 'plannings', n_shifts, 'taches', n_tasks, 'evenements', n_events);
end
$$;

revoke execute on function public.demo_seed_today() from public, anon;
grant execute on function public.demo_seed_today() to authenticated;
