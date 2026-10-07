-- Failed sign-ins were logged by a direct insert from the browser, allowed by the
-- audit_log_anon_login_failed policy. That policy only checked action = 'LOGIN_FAILED',
-- so anyone could write a row with any organization_id, user_id, notes, or values and
-- have it show up in a community's audit log as genuine.
--
-- Now the browser calls log_failed_login(email). The server decides every field:
--   - user / community / role are looked up from the email (unknown email → none)
--   - notes are fixed; the caller's IP and user agent come from the request headers
--   - at most 20 rows per email per 10 minutes and 300 per minute overall, so the log
--     can't be flooded (Supabase Auth rate-limits the sign-in attempts themselves)
-- Anyone can still record a failed attempt against an email, but that's no more than
-- typing a wrong password on the sign-in page, which is exactly what this logs.

drop policy if exists audit_log_anon_login_failed on public.audit_log;

create index if not exists audit_log_login_failed_idx
  on public.audit_log (user_email, created_at)
  where action = 'LOGIN_FAILED';

create or replace function public.log_failed_login(p_email text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_email   text := left(lower(trim(coalesce(p_email, ''))), 254);
  v_headers json;
  v_user    uuid;
  v_org     uuid;
  v_role    text;
begin
  if v_email = '' then
    return;
  end if;

  if (select count(*) from audit_log
       where action = 'LOGIN_FAILED' and created_at > now() - interval '1 minute') >= 300
     or (select count(*) from audit_log
          where action = 'LOGIN_FAILED' and user_email = v_email
            and created_at > now() - interval '10 minutes') >= 20 then
    return;
  end if;

  begin
    v_headers := current_setting('request.headers', true)::json;
  exception when others then
    v_headers := null;
  end;

  select p.id, p.organization_id, p.role::text
    into v_user, v_org, v_role
    from profiles p
   where lower(p.email) = v_email
   limit 1;

  insert into audit_log (organization_id, user_id, user_email, user_role, action, new_values, notes)
  values (
    v_org, v_user, v_email, v_role, 'LOGIN_FAILED',
    jsonb_strip_nulls(jsonb_build_object(
      'ip',         left(split_part(v_headers ->> 'x-forwarded-for', ',', 1), 64),
      'user_agent', left(v_headers ->> 'user-agent', 300)
    )),
    'Failed login attempt'
  );
end;
$$;

revoke execute on function public.log_failed_login(text) from public;
grant execute on function public.log_failed_login(text) to anon, authenticated, service_role;
