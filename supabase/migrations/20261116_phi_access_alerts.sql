-- Unusual health-record access alerts (Admin Panel -> Health Data Access).
-- HIPAA expects the community to review information system activity
-- (45 CFR 164.308(a)(1)(ii)(D)). Nobody reads the whole access log every day,
-- so this flags the patterns worth a look. Checked as each view is logged by
-- log_phi_view() (20261116_phi_view_logging.sql):
--   bulk               one person opens the health records of many different
--                      residents in a short time (default 25 within 60 minutes)
--   after_hours        a person opens health information during quiet hours
--                      (default 10 PM - 5 AM community time) and has rarely been
--                      signed in at those hours (fewer than 3 of the prior 30 days),
--                      so night-shift staff aren't flagged every night
--   inactive_resident  a person opens the record of a resident who has been
--                      inactive (moved out, discharged, deceased) for 30+ days
--   after_end_date     a person opens health information after their
--                      employment end date (profiles.employment_end_date)
-- One alert per person, rule and day (per night for after_hours, per resident
-- for inactive_resident); later views update the same alert. A new alert rings
-- a bell (category 'security', de-identified: no staff or resident names) for
-- the community's Org Admins and Platform Admins, or only the people picked in
-- the settings. The person the alert is about never gets the bell and can't
-- review their own alert.
-- Who reviews and changes the settings: the same people as phi_access_report
-- (Org Admin / Platform Admin of the community, super admin), with mfa_ok().
-- Reviews and settings changes are written to audit_log.

-- ── Settings (no row = the defaults) ─────────────────────────────────────────
create table if not exists public.phi_alert_settings (
  organization_id  uuid primary key references public.organizations(id) on delete cascade,
  bulk_on          boolean not null default true,
  bulk_count       int     not null default 25 check (bulk_count between 5 and 500),
  bulk_minutes     int     not null default 60 check (bulk_minutes between 5 and 1440),
  night_on         boolean not null default true,
  night_start      int     not null default 22 check (night_start between 0 and 23),
  night_end        int     not null default 5  check (night_end between 0 and 23),
  night_usual_days int     not null default 3  check (night_usual_days between 1 and 30),
  inactive_on      boolean not null default true,
  inactive_days    int     not null default 30 check (inactive_days between 1 and 3650),
  end_date_on      boolean not null default true,
  timezone         text    not null default 'America/Chicago' check (timezone in (
                     'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix',
                     'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu')),
  notify_ids       uuid[]  not null default '{}',   -- empty = every Org Admin / Platform Admin
  updated_by       uuid references public.profiles(id) on delete set null,
  updated_by_name  text,
  updated_at       timestamptz not null default now(),
  check (night_start <> night_end)
);

-- ── Alerts ───────────────────────────────────────────────────────────────────
create table if not exists public.phi_access_alerts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  user_id          uuid references public.profiles(id) on delete set null,
  user_name        text,
  kind             text not null check (kind in ('bulk', 'after_hours', 'inactive_resident', 'after_end_date')),
  resident_id      uuid references public.residents(id) on delete set null,
  alert_day        date not null,          -- community date (after_hours: the night it started)
  first_at         timestamptz not null default now(),
  last_at          timestamptz not null default now(),
  view_count       int  not null default 1,   -- logged views that matched the rule
  peak_count       int,                       -- bulk: most different residents inside one window
  detail           text,                      -- no resident names
  status           text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  review_note      text check (review_note is null or length(review_note) <= 2000),
  reviewed_by      uuid references public.profiles(id) on delete set null,
  reviewed_by_name text,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now()
);

create unique index if not exists phi_access_alerts_once
  on public.phi_access_alerts (organization_id, user_id, kind, alert_day,
                               coalesce(resident_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists phi_access_alerts_org_status_idx
  on public.phi_access_alerts (organization_id, status, last_at desc);

-- Lookups the checks run on every logged view
create index if not exists audit_log_user_created_idx
  on public.audit_log (user_id, created_at desc);
create index if not exists audit_log_residents_record_idx
  on public.audit_log (record_id, created_at desc) where table_name = 'residents';

-- ── Access ───────────────────────────────────────────────────────────────────
-- Strict boolean: may the caller review this community's alerts?
create or replace function public.phi_alerts_can_review(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.mfa_ok() and exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and (p.role::text = 'super_admin'
            or (p.organization_id = p_org and p.is_active is not false
                and (p.role::text = 'org_admin' or coalesce(p.is_platform_admin, false))))
  ), false)
$$;

-- The community the caller reviews (super admins may pass one), or raise.
create or replace function public._phi_review_org(p_org uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me public.profiles%rowtype;
begin
  select * into v_me from public.profiles where id = auth.uid();
  if v_me.id is null or not public.mfa_ok() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_me.role::text = 'super_admin' then
    return coalesce(p_org, v_me.organization_id);
  elsif v_me.is_active is not false
        and (v_me.role::text = 'org_admin' or coalesce(v_me.is_platform_admin, false)) then
    return v_me.organization_id;
  end if;
  raise exception 'Not allowed' using errcode = '42501';
end;
$$;

alter table public.phi_alert_settings enable row level security;
alter table public.phi_access_alerts  enable row level security;

drop policy if exists phi_alert_settings_read on public.phi_alert_settings;
create policy phi_alert_settings_read on public.phi_alert_settings
  for select to authenticated using (public.phi_alerts_can_review(organization_id));
drop policy if exists phi_access_alerts_read on public.phi_access_alerts;
create policy phi_access_alerts_read on public.phi_access_alerts
  for select to authenticated using (public.phi_alerts_can_review(organization_id));

drop policy if exists mfa_gate on public.phi_alert_settings;
create policy mfa_gate on public.phi_alert_settings as restrictive to authenticated using ((select public.mfa_ok()));
drop policy if exists mfa_gate on public.phi_access_alerts;
create policy mfa_gate on public.phi_access_alerts as restrictive to authenticated using ((select public.mfa_ok()));
drop policy if exists staff_only_no_portal on public.phi_alert_settings;
create policy staff_only_no_portal on public.phi_alert_settings as restrictive to authenticated using (not (select public.is_portal_user()));
drop policy if exists staff_only_no_portal on public.phi_access_alerts;
create policy staff_only_no_portal on public.phi_access_alerts as restrictive to authenticated using (not (select public.is_portal_user()));

-- Writes only through the functions below
revoke all on public.phi_alert_settings from anon, authenticated;
revoke all on public.phi_access_alerts  from anon, authenticated;
grant select on public.phi_alert_settings to authenticated;
grant select on public.phi_access_alerts  to authenticated;

-- ── Effective settings (keep in step with the column defaults) ───────────────
create or replace function public._phi_alert_cfg(p_org uuid)
returns public.phi_alert_settings
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.phi_alert_settings;
begin
  select * into s from public.phi_alert_settings where organization_id = p_org;
  if found then return s; end if;
  s.organization_id  := p_org;
  s.bulk_on          := true;  s.bulk_count := 25; s.bulk_minutes := 60;
  s.night_on         := true;  s.night_start := 22; s.night_end := 5; s.night_usual_days := 3;
  s.inactive_on      := true;  s.inactive_days := 30;
  s.end_date_on      := true;
  s.timezone         := 'America/Chicago';
  s.notify_ids       := '{}';
  return s;
end;
$$;

-- ── Create or update one alert; a new one rings the bell ─────────────────────
create or replace function public._phi_raise_alert(
  p_org     uuid,
  p_user    uuid,
  p_name    text,
  p_kind    text,
  p_res     uuid,
  p_day     date,
  p_at      timestamptz,
  p_peak    int,
  p_detail  text,
  p_bell    text,
  p_notify  uuid[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new boolean;
begin
  insert into public.phi_access_alerts as a
         (organization_id, user_id, user_name, kind, resident_id, alert_day,
          first_at, last_at, view_count, peak_count, detail)
  values (p_org, p_user, p_name, p_kind, p_res, p_day, p_at, p_at, 1, p_peak, p_detail)
  on conflict (organization_id, user_id, kind, alert_day,
               coalesce(resident_id, '00000000-0000-0000-0000-000000000000'::uuid))
  do update set
    last_at    = greatest(a.last_at, excluded.last_at),
    first_at   = least(a.first_at, excluded.first_at),
    view_count = a.view_count + 1,
    peak_count = greatest(a.peak_count, excluded.peak_count),
    detail     = case when coalesce(excluded.peak_count, 0) > coalesce(a.peak_count, 0)
                      then excluded.detail else a.detail end
  returning (xmax = 0) into v_new;

  if v_new then
    insert into public.push_notifications (org_id, recipient_id, title, body, category, link)
    select p_org, p.id, 'Unusual health-record access',
           p_bell || ' Review it in Admin Panel → Health Data Access.',
           'security', '/app/admin?tab=phi_access'
      from public.profiles p
     where p.organization_id = p_org
       and p.is_active
       and p.id is distinct from p_user
       and (p.role::text = 'org_admin' or coalesce(p.is_platform_admin, false))
       and (cardinality(p_notify) = 0 or p.id = any (p_notify));
  end if;
end;
$$;

-- ── The rules ────────────────────────────────────────────────────────────────
-- p_at is the time of the view (now() from log_phi_view; tests pass other times).
create or replace function public._phi_check_unusual(
  p_org    uuid,
  p_user   uuid,
  p_area   text,
  p_record uuid,
  p_at     timestamptz default now()
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c          public.phi_alert_settings;
  v_local    timestamp;
  v_hour     int;
  v_day      date;
  v_name     text;
  v_end_date date;
  v_res      uuid;
  v_res_level constant text[] := array['nursing_chart', 'resident_contacts', 'social_profile',
                                       'dietary_profile', 'incident_report'];
  v_n        int;
  v_left     timestamptz;
  v_active   boolean;
begin
  c       := public._phi_alert_cfg(p_org);
  v_local := p_at at time zone c.timezone;
  v_hour  := extract(hour from v_local)::int;
  v_day   := v_local::date;

  select nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), employment_end_date
    into v_name, v_end_date
    from public.profiles where id = p_user;

  -- The resident behind the record (incident reports carry only a typed name)
  if p_area in ('nursing_chart', 'resident_contacts', 'social_profile') then
    v_res := p_record;
  elsif p_area = 'dietary_profile' then
    select d.resident_id into v_res from public.resident_dietary_profiles d where d.id = p_record;
  end if;

  -- 1. After their employment end date (any health-information view)
  if c.end_date_on and v_end_date is not null and v_day > v_end_date then
    perform public._phi_raise_alert(p_org, p_user, v_name, 'after_end_date', null, v_day, p_at, null,
      'Opened health information after their employment end date (' || to_char(v_end_date, 'Mon FMDD, YYYY') || ').',
      'A staff member opened health information after their employment end date.',
      c.notify_ids);
  end if;

  -- 2. Quiet hours, by someone who is rarely signed in then
  if c.night_on and (case when c.night_start > c.night_end
                          then v_hour >= c.night_start or v_hour < c.night_end
                          else v_hour >= c.night_start and v_hour < c.night_end end) then
    -- nights (dated by the evening they started) with any activity in the
    -- previous 30 days, leaving out tonight
    select count(distinct ((a.created_at at time zone c.timezone) - make_interval(hours => c.night_end))::date)
      into v_n
      from public.audit_log a
     where a.user_id = p_user
       and a.created_at >= p_at - interval '30 days'
       and a.created_at <  p_at - interval '12 hours'
       and (case when c.night_start > c.night_end
                 then extract(hour from a.created_at at time zone c.timezone) >= c.night_start
                   or extract(hour from a.created_at at time zone c.timezone) <  c.night_end
                 else extract(hour from a.created_at at time zone c.timezone) >= c.night_start
                  and extract(hour from a.created_at at time zone c.timezone) <  c.night_end end);
    if v_n < c.night_usual_days then
      perform public._phi_raise_alert(p_org, p_user, v_name, 'after_hours', null,
        (v_local - make_interval(hours => c.night_end))::date, p_at, null,
        'Opened health information at ' || to_char(v_local, 'FMHH12:MI AM')
          || '. Signed in at that time of night on ' || v_n || ' of the previous 30 days.',
        'A staff member opened health information at ' || to_char(v_local, 'FMHH12:MI AM')
          || ', outside the hours they usually work.',
        c.notify_ids);
    end if;
  end if;

  if not (p_area = any (v_res_level)) then return; end if;

  -- 3. Many different residents in a short time
  if c.bulk_on then
    select count(distinct coalesce(
             case when a.table_name in ('nursing_chart', 'resident_contacts', 'social_profile') then a.record_id
                  when a.table_name = 'dietary_profile' then
                    (select d.resident_id::text from public.resident_dietary_profiles d where d.id = a.record_id::uuid)
             end,
             a.table_name || ':' || a.record_id))
      into v_n
      from public.audit_log a
     where a.user_id = p_user
       and a.action = 'VIEW'
       and a.table_name = any (v_res_level)
       and a.created_at >  p_at - make_interval(mins => c.bulk_minutes)
       and a.created_at <= p_at;
    if v_n >= c.bulk_count then
      perform public._phi_raise_alert(p_org, p_user, v_name, 'bulk', null, v_day, p_at, v_n,
        'Opened health records for ' || v_n || ' different residents within ' || c.bulk_minutes || ' minutes.',
        'A staff member opened health records for ' || v_n || ' residents within ' || c.bulk_minutes || ' minutes.',
        c.notify_ids);
    end if;
  end if;

  -- 4. A resident who left a while ago
  if c.inactive_on and v_res is not null then
    select r.is_active into v_active from public.residents r where r.id = v_res;
    if v_active is false then
      select max(a.created_at) into v_left
        from public.audit_log a
       where a.table_name = 'residents'
         and a.record_id = v_res::text
         and a.action = 'UPDATE'
         and a.new_values->>'is_active' = 'false'
         and coalesce(a.old_values->>'is_active', 'true') <> 'false';
      -- no record of the change (imported as inactive): treat it as long ago
      if v_left is null or v_left < p_at - make_interval(days => c.inactive_days) then
        perform public._phi_raise_alert(p_org, p_user, v_name, 'inactive_resident', v_res, v_day, p_at, null,
          case when v_left is null then 'Opened the record of a resident who is no longer active.'
               else 'Opened the record of a resident who has been inactive since '
                    || to_char(v_left at time zone c.timezone, 'Mon FMDD, YYYY') || '.' end,
          'A staff member opened the record of a resident who is no longer active.',
          c.notify_ids);
      end if;
    end if;
  end if;
end;
$$;

revoke all on function public._phi_alert_cfg(uuid) from public, anon, authenticated;
revoke all on function public._phi_raise_alert(uuid, uuid, text, text, uuid, date, timestamptz, int, text, text, uuid[]) from public, anon, authenticated;
revoke all on function public._phi_check_unusual(uuid, uuid, text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public._phi_review_org(uuid) from public, anon, authenticated;
revoke all on function public.phi_alerts_can_review(uuid) from public, anon;
grant execute on function public.phi_alerts_can_review(uuid) to authenticated;

-- ── log_phi_view: same as before, plus the checks after a new row ────────────
create or replace function public.log_phi_view(
  p_area      text,
  p_record_id uuid default null,
  p_count     int  default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_role  text;
  v_email text;
  v_org   uuid;
  v_ok    boolean;
begin
  if v_uid is null then return; end if;

  if not (
    p_area in ('nursing_chart', 'resident_contacts', 'social_profile', 'dietary_profile',
               'incident_report', 'nursing', 'incidents', 'dietary_profiles', 'physician_orders')
    or p_area ~ '^social_[a-z]{3,20}$'
  ) then
    raise exception 'log_phi_view: unknown area %', p_area;
  end if;

  select p.role::text, u.email, p.organization_id
    into v_role, v_email, v_org
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.id = v_uid;

  -- Staff of a community only (portal logins see just their own resident, not logged here)
  if v_org is null or v_role in ('family', 'resident', 'sales_rep', 'corporate') then return; end if;

  if p_area in ('nursing_chart', 'resident_contacts', 'social_profile') then
    if p_record_id is null then raise exception 'log_phi_view: % needs a resident', p_area; end if;
    select exists (select 1 from public.residents r where r.id = p_record_id and r.organization_id = v_org) into v_ok;
    if not v_ok then return; end if;
  elsif p_area = 'dietary_profile' then
    if p_record_id is null then raise exception 'log_phi_view: dietary_profile needs a diet profile'; end if;
    select exists (select 1 from public.resident_dietary_profiles d where d.id = p_record_id and d.organization_id = v_org) into v_ok;
    if not v_ok then return; end if;
  elsif p_area = 'incident_report' then
    if p_record_id is null then raise exception 'log_phi_view: incident_report needs an incident'; end if;
    select exists (select 1 from public.incident_reports i where i.id = p_record_id and i.organization_id = v_org) into v_ok;
    if not v_ok then return; end if;
  elsif p_record_id is not null then
    raise exception 'log_phi_view: % is a list view and takes no record', p_area;
  end if;

  if exists (
    select 1 from public.audit_log a
     where a.action = 'VIEW'
       and a.user_id = v_uid
       and a.table_name = p_area
       and a.record_id is not distinct from p_record_id::text
       and a.created_at > now() - interval '10 minutes'
  ) then
    return;
  end if;

  insert into public.audit_log (organization_id, user_id, user_email, user_role,
                                action, table_name, record_id, notes)
  values (v_org, v_uid, v_email, v_role,
          'VIEW', p_area, p_record_id::text,
          case when p_count is not null then greatest(p_count, 0)::text || ' records shown' end);

  -- Unusual-access alerts (20261116_phi_access_alerts.sql). A problem there must
  -- never stop the view from being logged.
  begin
    perform public._phi_check_unusual(v_org, v_uid, p_area, p_record_id, now());
  exception when others then
    raise warning 'log_phi_view: alert check failed: %', sqlerrm;
  end;
end;
$$;

revoke all on function public.log_phi_view(text, uuid, int) from public, anon;
grant execute on function public.log_phi_view(text, uuid, int) to authenticated;

-- ── Review screen ────────────────────────────────────────────────────────────
create or replace function public.phi_alerts_list(
  p_org    uuid default null,
  p_status text default 'open',   -- open | closed (reviewed + dismissed) | all
  p_limit  int  default 200
) returns table (
  id               uuid,
  kind             text,
  user_id          uuid,
  user_name        text,
  resident_id      uuid,
  resident_name    text,
  alert_day        date,
  first_at         timestamptz,
  last_at          timestamptz,
  view_count       int,
  peak_count       int,
  detail           text,
  status           text,
  review_note      text,
  reviewed_by_name text,
  reviewed_at      timestamptz,
  is_me            boolean,
  open_count       bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_org uuid := public._phi_review_org(p_org);
begin
  if v_org is null then return; end if;
  return query
  select a.id, a.kind, a.user_id,
         coalesce(nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''), a.user_name),
         a.resident_id,
         nullif(trim(coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, '')), ''),
         a.alert_day, a.first_at, a.last_at, a.view_count, a.peak_count, a.detail,
         a.status, a.review_note, a.reviewed_by_name, a.reviewed_at,
         a.user_id = auth.uid(),
         (select count(*) from public.phi_access_alerts o where o.organization_id = v_org and o.status = 'open')
    from public.phi_access_alerts a
    left join public.profiles  p on p.id = a.user_id
    left join public.residents r on r.id = a.resident_id
   where a.organization_id = v_org
     and (p_status = 'all'
          or (p_status = 'open'   and a.status = 'open')
          or (p_status = 'closed' and a.status <> 'open'))
   order by (a.status = 'open') desc, a.last_at desc
   limit greatest(1, least(coalesce(p_limit, 200), 1000));
end;
$$;

create or replace function public.phi_alert_decide(
  p_id     uuid,
  p_action text,                  -- reviewed | dismissed | reopen
  p_note   text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a    public.phi_access_alerts%rowtype;
  v_me   public.profiles%rowtype;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if p_action not in ('reviewed', 'dismissed', 'reopen') then
    raise exception 'Unknown action %', p_action;
  end if;
  select * into v_a from public.phi_access_alerts where id = p_id;
  if v_a.id is null or not public.phi_alerts_can_review(v_a.organization_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into v_me from public.profiles where id = auth.uid();
  if v_a.user_id = v_me.id and v_me.role::text <> 'super_admin' then
    raise exception 'Someone else needs to review an alert about you.' using errcode = '42501';
  end if;
  if length(v_note) > 2000 then raise exception 'The note is too long (2,000 characters at most).'; end if;

  if p_action = 'reopen' then
    update public.phi_access_alerts
       set status = 'open', review_note = null, reviewed_by = null, reviewed_by_name = null, reviewed_at = null
     where id = p_id;
  else
    update public.phi_access_alerts
       set status = p_action, review_note = v_note, reviewed_by = v_me.id,
           reviewed_by_name = nullif(trim(coalesce(v_me.first_name, '') || ' ' || coalesce(v_me.last_name, '')), ''),
           reviewed_at = now()
     where id = p_id;
  end if;

  insert into public.audit_log (organization_id, user_id, user_email, user_role, action, table_name, record_id, notes)
  values (v_a.organization_id, v_me.id, v_me.email, v_me.role::text,
          'PHI_ALERT_' || upper(p_action), 'phi_access_alerts', p_id::text,
          v_a.kind || coalesce(': ' || v_note, ''));
end;
$$;

create or replace function public.phi_alert_settings_get(p_org uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid := public._phi_review_org(p_org);
  c     public.phi_alert_settings;
begin
  if v_org is null then return null; end if;
  c := public._phi_alert_cfg(v_org);
  return (to_jsonb(c) - 'organization_id')
    || jsonb_build_object('admins', coalesce((
         select jsonb_agg(jsonb_build_object('id', p.id,
                  'name', trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')))
                  order by p.last_name, p.first_name)
           from public.profiles p
          where p.organization_id = v_org and p.is_active
            and (p.role::text = 'org_admin' or coalesce(p.is_platform_admin, false))), '[]'::jsonb));
end;
$$;

create or replace function public.phi_alert_settings_save(p_org uuid, p_settings jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public._phi_review_org(p_org);
  c     public.phi_alert_settings;
  v_me  public.profiles%rowtype;
  v_ids uuid[];
begin
  if v_org is null then raise exception 'No community'; end if;
  c := public._phi_alert_cfg(v_org);
  select * into v_me from public.profiles where id = auth.uid();

  -- only current Org Admins / Platform Admins can be picked for the bell
  select coalesce(array_agg(p.id), '{}') into v_ids
    from public.profiles p
   where p.organization_id = v_org and p.is_active
     and (p.role::text = 'org_admin' or coalesce(p.is_platform_admin, false))
     and p.id::text in (select jsonb_array_elements_text(coalesce(p_settings->'notify_ids', to_jsonb(c.notify_ids))));

  insert into public.phi_alert_settings as s (
    organization_id, bulk_on, bulk_count, bulk_minutes, night_on, night_start, night_end, night_usual_days,
    inactive_on, inactive_days, end_date_on, timezone, notify_ids, updated_by, updated_by_name, updated_at)
  values (
    v_org,
    coalesce((p_settings->>'bulk_on')::boolean, c.bulk_on),
    coalesce((p_settings->>'bulk_count')::int, c.bulk_count),
    coalesce((p_settings->>'bulk_minutes')::int, c.bulk_minutes),
    coalesce((p_settings->>'night_on')::boolean, c.night_on),
    coalesce((p_settings->>'night_start')::int, c.night_start),
    coalesce((p_settings->>'night_end')::int, c.night_end),
    coalesce((p_settings->>'night_usual_days')::int, c.night_usual_days),
    coalesce((p_settings->>'inactive_on')::boolean, c.inactive_on),
    coalesce((p_settings->>'inactive_days')::int, c.inactive_days),
    coalesce((p_settings->>'end_date_on')::boolean, c.end_date_on),
    coalesce(p_settings->>'timezone', c.timezone),
    v_ids,
    v_me.id,
    nullif(trim(coalesce(v_me.first_name, '') || ' ' || coalesce(v_me.last_name, '')), ''),
    now())
  on conflict (organization_id) do update set
    bulk_on = excluded.bulk_on, bulk_count = excluded.bulk_count, bulk_minutes = excluded.bulk_minutes,
    night_on = excluded.night_on, night_start = excluded.night_start, night_end = excluded.night_end,
    night_usual_days = excluded.night_usual_days, inactive_on = excluded.inactive_on,
    inactive_days = excluded.inactive_days, end_date_on = excluded.end_date_on, timezone = excluded.timezone,
    notify_ids = excluded.notify_ids, updated_by = excluded.updated_by,
    updated_by_name = excluded.updated_by_name, updated_at = excluded.updated_at;

  insert into public.audit_log (organization_id, user_id, user_email, user_role, action, table_name, record_id, new_values)
  values (v_org, v_me.id, v_me.email, v_me.role::text, 'PHI_ALERT_SETTINGS', 'phi_alert_settings', v_org::text,
          (select to_jsonb(s) - 'organization_id' from public.phi_alert_settings s where s.organization_id = v_org));
end;
$$;

revoke all on function public.phi_alerts_list(uuid, text, int) from public, anon;
revoke all on function public.phi_alert_decide(uuid, text, text) from public, anon;
revoke all on function public.phi_alert_settings_get(uuid) from public, anon;
revoke all on function public.phi_alert_settings_save(uuid, jsonb) from public, anon;
grant execute on function public.phi_alerts_list(uuid, text, int) to authenticated;
grant execute on function public.phi_alert_decide(uuid, text, text) to authenticated;
grant execute on function public.phi_alert_settings_get(uuid) to authenticated;
grant execute on function public.phi_alert_settings_save(uuid, jsonb) to authenticated;
