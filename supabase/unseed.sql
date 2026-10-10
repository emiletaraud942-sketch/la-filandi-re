-- Retire les données de démonstration (supabase/seed.sql). À lancer avec prudence : vide ces tables.
truncate public.resident_events, public.tasks, public.shifts, public.session_attendees, public.sessions,
         public.time_clock, public.visit_requests, public.visit_slots restart identity cascade;
delete from public.staff;
delete from public.residents;
