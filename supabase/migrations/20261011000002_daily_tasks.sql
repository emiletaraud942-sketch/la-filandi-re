-- Génération automatique des tâches du jour à partir des types de tâches et des résidents présents.
alter table public.task_types
  add column auto boolean not null default false,
  add column every_days smallint not null default 1 check (every_days > 0);

update public.task_types set auto = true where code in ('pdj', 'dej', 'gou', 'din', 'men');
update public.task_types set auto = true, every_days = 2 where code = 'lin';

-- Crée, pour chaque résident présent (pas en sortie), les tâches automatiques du jour qui n'existent pas encore.
-- Attribution : personnel du bon poste, de préférence du même étage, présent ce jour-là, réparti à tour de rôle.
-- Sans doublon : peut être relancée à tout moment. Réservée aux responsables et à la planification (pg_cron).
create function public.generate_daily_tasks(p_day date default null)
returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  v_day date := coalesce(p_day, private.paris_today());
  n integer;
begin
  if not ((select private.is_manager()) or current_user in ('postgres', 'service_role')) then
    raise exception 'Réservé aux responsables';
  end if;

  insert into public.tasks (room_id, type_code, label, day, start_min, end_min, assigned_to)
  select x.room_id, x.code, x.label, v_day, x.start_min, x.start_min + x.duration_min,
         case when cardinality(x.pool) > 0 then x.pool[((x.rn - 1) % cardinality(x.pool)) + 1] end
  from (
    select r.id as room_id, tt.code, tt.label, tt.default_start_min as start_min, tt.duration_min,
           row_number() over (partition by tt.code, r.floor_id order by r.number) as rn,
           coalesce(
             (select array_agg(s.id order by s.display_name) from public.staff s
               where s.active and s.job_code = tt.job_code and s.floor_id = r.floor_id
                 and not exists (select 1 from public.shifts sh where sh.staff_id = s.id and sh.day = v_day and sh.kind in ('off', 'leave', 'abs', 'n'))),
             (select array_agg(s.id order by s.display_name) from public.staff s
               where s.active and s.job_code = tt.job_code
                 and not exists (select 1 from public.shifts sh where sh.staff_id = s.id and sh.day = v_day and sh.kind in ('off', 'leave', 'abs', 'n')))
           ) as pool
    from public.rooms r
    join public.residents res on res.room_id = r.id and res.active and not res.away
    join public.task_types tt on tt.auto and ((v_day - date '2026-01-01') % tt.every_days = 0)
    where not exists (select 1 from public.tasks t where t.room_id = r.id and t.type_code = tt.code and t.day = v_day)
  ) x;
  get diagnostics n = row_count;
  return n;
end
$$;

revoke execute on function public.generate_daily_tasks(date) from public, anon;
grant execute on function public.generate_daily_tasks(date) to authenticated;
