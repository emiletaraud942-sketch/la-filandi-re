-- Planification quotidienne (Supabase uniquement : pg_cron n'existe pas sur le Postgres de test).
-- 03:00 UTC = 04:00 ou 05:00 à Paris selon la saison.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('generate-daily-tasks', '0 3 * * *', $$select public.generate_daily_tasks()$$);
