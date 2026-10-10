-- Un compte créé (inscription ou ajout dans le tableau de bord Supabase) reste inactif tant qu'un administrateur
-- ne l'a pas activé dans la page « Utilisateurs » : il n'a alors aucun rôle, donc aucun droit d'écriture.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, active)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)), false);
  return new;
end
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
