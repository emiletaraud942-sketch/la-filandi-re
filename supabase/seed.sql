-- Données de démonstration FICTIVES (pseudonymes aléatoires). À lancer uniquement en essai :
-- ne jamais l'exécuter avec de vrais résidents, et ne pas le joindre aux migrations.
-- Pour tout retirer ensuite : supabase/unseed.sql.

-- Résidents (≈ 90 % des chambres, quelques-uns en sortie).
insert into public.residents (room_id, display_name, away)
select id,
       (array['Mme', 'Mme', 'M.'])[1 + floor(random() * 3)::int]
         || ' ' || chr(65 + floor(random() * 26)::int) || '. ' || chr(65 + floor(random() * 26)::int) || '.',
       random() < 0.05
from public.rooms
where random() < 0.9
  and not exists (select 1 from public.residents r where r.room_id = rooms.id and r.active);

-- Personnel fictif : 42 personnes réparties par poste.
with roles(code, n) as (values ('IDE', 6), ('AS', 16), ('AES', 5), ('ASHQ', 8), ('ANI', 2), ('TECH', 2), ('ACC', 3)),
     expanded as (select code, generate_series(1, n) as i from roles),
     numbered as (select code, row_number() over (order by code, i) as rn from expanded)
insert into public.staff (display_name, job_code, floor_id)
select (array['Camille', 'Yanis', 'Inès', 'Lucas', 'Salomé', 'Théo', 'Nadia', 'Pierre', 'Amélie', 'Léa', 'Hugo', 'Marc', 'Sophie', 'Jade',
              'Noé', 'Clara', 'Malik', 'Lola', 'Eliott', 'Maya', 'Samir', 'Zoé', 'Basile', 'Anaïs', 'Ethan', 'Margaux', 'Rayan', 'Élodie',
              'Tom', 'Louise', 'Karim', 'Océane', 'Adrien', 'Manon', 'Bilal', 'Chloé', 'Axel', 'Lina', 'Victor', 'Emma', 'Gaël', 'Ruben'])[((rn - 1) % 42)::int + 1]
         || ' ' || chr(65 + floor(random() * 26)::int) || '.',
       code,
       case when code in ('IDE', 'AS', 'AES', 'ASHQ') then floor(random() * 4)::smallint end
from numbered;

-- Plannings du jour.
insert into public.shifts (staff_id, day, kind, pause_start_min)
select s.id, private.paris_today(),
       case when s.job_code in ('ANI', 'TECH', 'ACC')
            then (case when r < 0.8 then 'm' when r < 0.9 then 's' else 'leave' end)::public.shift_kind
            else (case when r < 0.34 then 'm' when r < 0.58 then 's' when r < 0.74 then 'n'
                       when r < 0.88 then 'off' when r < 0.95 then 'leave' else 'abs' end)::public.shift_kind end,
       615 + (row_number() over ())::int % 4 * 15
from (select st.*, random() as r from public.staff st) s;

-- Tâches du jour pour chaque chambre occupée (et préparation des chambres libres).
insert into public.tasks (room_id, type_code, label, day, start_min, end_min, status, assigned_to)
select x.room_id, x.code, x.label, private.paris_today(), x.start_min, x.start_min + x.duration_min,
       (case when x.start_min + x.duration_min <= private.paris_now_min() then (case when random() < 0.96 then 'done' else 'todo' end)
             when x.start_min <= private.paris_now_min() then 'wip' else 'todo' end)::public.task_status,
       (select s.id from public.staff s where s.job_code = x.job_code order by random() limit 1)
from (
  select r.id as room_id, tt.code, tt.label, tt.job_code, tt.duration_min,
         tt.default_start_min + floor(random() * 3)::int * 5 as start_min
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

-- Journée des résidents sur 7 jours : repas, animations, visites, coiffeuse.
insert into public.resident_events (resident_id, day, start_min, label, place, kind)
select res.id, private.paris_today() + d, e.start_min, e.label, e.place, e.kind::public.event_kind
from public.residents res
cross join generate_series(0, 6) d
cross join lateral (
  values (480, 'Petit-déjeuner', 'Chambre', 'meal', 1.0), (720, 'Déjeuner', 'Salle à manger', 'meal', 1.0),
         (960, 'Goûter', 'Salon', 'meal', 1.0), (1110, 'Dîner', 'Salle à manger', 'meal', 1.0),
         (630, 'Loto', 'Salon d’animation', 'ani', 0.65), (900, 'Chorale', 'Salon d’animation', 'ani', 0.55),
         (870, 'Visite de la famille', 'Chambre', 'vis', 0.4), (660, 'Coiffeuse', 'Salon de coiffure', 'coif', 0.2)
) as e(start_min, label, place, kind, p)
where res.active and random() < e.p;
