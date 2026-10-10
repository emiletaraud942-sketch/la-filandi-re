-- Données de démonstration FICTIVES (pseudonymes aléatoires). À lancer uniquement en essai :
-- ne jamais l'exécuter avec de vrais résidents, et ne pas le joindre aux migrations.
insert into public.residents (room_id, display_name, away)
select id,
       (array['Mme', 'Mme', 'M.'])[1 + floor(random() * 3)::int]
         || ' ' || chr(65 + floor(random() * 26)::int) || '. ' || chr(65 + floor(random() * 26)::int) || '.',
       random() < 0.05
from public.rooms
where random() < 0.9
  and not exists (select 1 from public.residents r where r.room_id = rooms.id and r.active);
