-- EN ATTENTE (non appliqué) : sépare les politiques d'écriture « for all » en insert/update/delete
-- pour supprimer l'alerte « multiple permissive policies » du linter Supabase.
-- Nécessite des « drop policy », que le connecteur MCP soumet à confirmation.
do $$
declare t text;
begin
  foreach t in array array['floors', 'job_roles', 'rooms', 'residents', 'staff'] loop
    execute format('drop policy %I on public.%I', t || '_write', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.is_manager()))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.is_manager())) with check ((select private.is_manager()))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.is_manager()))', t || '_delete', t);
  end loop;
end $$;
