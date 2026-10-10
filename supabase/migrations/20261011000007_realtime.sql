-- Rafraîchissement en direct : les écrans reçoivent les changements de ces tables (les droits de lecture restent ceux de la RLS).
do $$
declare t text;
begin
  foreach t in array array['tasks', 'shifts', 'residents', 'resident_events', 'stock_items', 'stock_movements', 'vehicles', 'vehicle_bookings',
                           'visit_requests', 'visit_slots', 'sessions', 'session_attendees', 'time_clock', 'expenses'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;
