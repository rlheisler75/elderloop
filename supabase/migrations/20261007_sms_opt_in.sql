-- Text-message consent for broadcast SMS (Twilio). Carriers and the TCPA require that
-- people agree before a business texts them, and the toll-free verification describes
-- this opt-in. Off until the person turns it on.
--
--   profiles.sms_opt_in   staff, family, and resident portal logins. Only the person can
--                         change their own (set_my_sms_opt_in, or a self-update), or
--                         server code (send-broadcast turns it off when Twilio reports
--                         the number replied STOP).
--   residents.sms_opt_in  residents who receive texts at residents.phone. Staff who can
--                         edit the resident record it (e.g. from move-in paperwork); a
--                         resident portal login's own choice is copied here too.
-- *_sms_opt_in_at is stamped by trigger (and residents.sms_opt_in_by), never by the client.
-- No health information is sent by text (decided 2026-10-06).

alter table public.profiles  add column if not exists sms_opt_in boolean not null default false;
alter table public.profiles  add column if not exists sms_opt_in_at timestamptz;
alter table public.residents add column if not exists sms_opt_in boolean not null default false;
alter table public.residents add column if not exists sms_opt_in_at timestamptz;
alter table public.residents add column if not exists sms_opt_in_by uuid references public.profiles(id) on delete set null;

create or replace function public.profiles_sms_opt_in_guard()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.sms_opt_in is distinct from old.sms_opt_in then
    if coalesce(auth.role(), '') = 'authenticated' and auth.uid() is distinct from new.id then
      raise exception 'Only the person can change their own text-message consent' using errcode = '42501';
    end if;
    new.sms_opt_in_at := case when new.sms_opt_in then now() else null end;
  elsif new.sms_opt_in_at is distinct from old.sms_opt_in_at then
    new.sms_opt_in_at := old.sms_opt_in_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sms_opt_in_guard on public.profiles;
create trigger profiles_sms_opt_in_guard before update on public.profiles
  for each row execute function public.profiles_sms_opt_in_guard();

create or replace function public.residents_sms_opt_in_stamp()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT' then
    if new.sms_opt_in then
      new.sms_opt_in_at := now();
      new.sms_opt_in_by := auth.uid();
    else
      new.sms_opt_in_at := null;
      new.sms_opt_in_by := null;
    end if;
  elsif new.sms_opt_in is distinct from old.sms_opt_in then
    new.sms_opt_in_at := case when new.sms_opt_in then now() else null end;
    new.sms_opt_in_by := auth.uid();
  else
    new.sms_opt_in_at := old.sms_opt_in_at;
    new.sms_opt_in_by := old.sms_opt_in_by;
  end if;
  return new;
end;
$$;

drop trigger if exists residents_sms_opt_in_stamp on public.residents;
create trigger residents_sms_opt_in_stamp before insert or update on public.residents
  for each row execute function public.residents_sms_opt_in_stamp();

revoke execute on function public.profiles_sms_opt_in_guard(), public.residents_sms_opt_in_stamp()
  from public, anon, authenticated;

-- The person's own choice, from Settings or a portal's My Profile. A resident portal
-- login's choice also applies to their resident record (texts to residents use it).
create or replace function public.set_my_sms_opt_in(p_on boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null or not public.mfa_ok() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update profiles set sms_opt_in = coalesce(p_on, false) where id = auth.uid();
  update residents set sms_opt_in = coalesce(p_on, false) where profile_id = auth.uid();
  perform public.log_audit_event(
    case when p_on then 'SMS_OPT_IN' else 'SMS_OPT_OUT' end, 'profiles', auth.uid()::text,
    null, null, case when p_on then 'Agreed to receive text messages' else 'Stopped text messages' end);
end;
$$;

revoke execute on function public.set_my_sms_opt_in(boolean) from public, anon;
grant execute on function public.set_my_sms_opt_in(boolean) to authenticated, service_role;
