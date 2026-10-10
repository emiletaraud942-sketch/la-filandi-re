-- Une feuille d'émargement clôturée est une pièce de présence : elle ne se supprime plus.
create function public.sessions_delete_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.closed_at is not null then
    raise exception 'Feuille clôturée';
  end if;
  return old;
end
$$;
revoke execute on function public.sessions_delete_guard() from public, anon, authenticated;
create trigger sessions_delete_guard before delete on public.sessions
  for each row execute function public.sessions_delete_guard();
