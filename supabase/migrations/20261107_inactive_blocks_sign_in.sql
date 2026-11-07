-- Marking someone inactive now blocks their sign-in. Before this, an inactive
-- profile lost its job-role permissions (can_user() returns false) but could
-- still sign in and read everything keyed only on the community (announcements,
-- directory, activities). Turning is_active off bans the auth user and ends
-- their sessions; turning it back on lifts the ban. Works for every caller
-- (Admin Panel, Staff, imports), since it's a trigger on profiles.

create or replace function public.sync_sign_in_with_active()
returns trigger language plpgsql security definer set search_path to 'public', 'auth'
as $$
begin
  if new.is_active is not distinct from old.is_active then
    return new;
  end if;
  if new.is_active = false then
    update auth.users set banned_until = '2999-12-31', updated_at = now() where id = new.id;
    delete from auth.refresh_tokens where user_id = new.id::text;
    delete from auth.sessions where user_id = new.id;
  else
    update auth.users set banned_until = null, updated_at = now() where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_sign_in_with_active on public.profiles;
create trigger trg_sync_sign_in_with_active after update of is_active on public.profiles
  for each row execute function sync_sign_in_with_active();
revoke all on function public.sync_sign_in_with_active() from public, anon, authenticated;

-- Accounts already inactive
update auth.users u set banned_until = '2999-12-31', updated_at = now()
  from public.profiles p
 where p.id = u.id and p.is_active = false and u.banned_until is null;
delete from auth.refresh_tokens t using public.profiles p where p.is_active = false and t.user_id = p.id::text;
delete from auth.sessions s using public.profiles p where p.is_active = false and s.user_id = p.id;
