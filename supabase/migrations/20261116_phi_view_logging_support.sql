-- Log ElderLoop support (super admin) views of a community's health information.
-- Super admin logins belong to no community, so log_phi_view() returned before
-- logging anything for them: support access to residents' records was invisible
-- to the community. Loopware is the business associate, and the PointClickCare
-- agreement (Appendix A) says access to resident health records is logged.
-- Now a super admin's view is logged in the community it belongs to:
--   record-level areas  -> the record's community
--   list screens        -> p_org, the community the support login is viewing
--                          (AuthContext organization while impersonating)
-- Staff logins are unchanged: p_org is ignored for them and records must be in
-- their own community. The rows show as "ElderLoop support" in Health Data
-- Access, the unusual-access rules apply to them (bells say "An ElderLoop
-- support login", never a name), and nobody, super admins included, may review
-- an alert about themselves.

-- ── log_phi_view gains p_org (drop first: a second overload would make the
--    named-argument calls from the app ambiguous) ──────────────────────────────
drop function if exists public.log_phi_view(text, uuid, int);

create or replace function public.log_phi_view(
  p_area      text,
  p_record_id uuid default null,
  p_count     int  default null,
  p_org       uuid default null   -- used only for ElderLoop support list views
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_role    text;
  v_email   text;
  v_org     uuid;
  v_rec_org uuid;
  v_support boolean;
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

  -- Portal, rep and corporate logins are not logged here
  if v_role is null or v_role in ('family', 'resident', 'sales_rep', 'corporate') then return; end if;
  v_support := v_role = 'super_admin';
  if v_org is null and not v_support then return; end if;

  if p_area in ('nursing_chart', 'resident_contacts', 'social_profile', 'dietary_profile', 'incident_report') then
    if p_record_id is null then raise exception 'log_phi_view: % needs a record', p_area; end if;
    if p_area = 'dietary_profile' then
      select d.organization_id into v_rec_org from public.resident_dietary_profiles d where d.id = p_record_id;
    elsif p_area = 'incident_report' then
      select i.organization_id into v_rec_org from public.incident_reports i where i.id = p_record_id;
    else
      select r.organization_id into v_rec_org from public.residents r where r.id = p_record_id;
    end if;
    if v_rec_org is null then return; end if;
    if v_support then
      v_org := v_rec_org;                       -- logged in the record's community
    elsif v_rec_org <> v_org then
      return;                                   -- staff: own community only
    end if;
  else
    if p_record_id is not null then
      raise exception 'log_phi_view: % is a list view and takes no record', p_area;
    end if;
    if v_support then
      v_org := coalesce(p_org, v_org);
      if v_org is null or not exists (select 1 from public.organizations o where o.id = v_org) then return; end if;
    end if;
  end if;

  -- Same person, area, record and community within 10 minutes counts once
  if exists (
    select 1 from public.audit_log a
     where a.action = 'VIEW'
       and a.user_id = v_uid
       and a.table_name = p_area
       and a.record_id is not distinct from p_record_id::text
       and a.organization_id = v_org
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

revoke all on function public.log_phi_view(text, uuid, int, uuid) from public, anon;
grant execute on function public.log_phi_view(text, uuid, int, uuid) to authenticated;

-- ── Rules: bulk counted per community; support wording in bells ──────────────
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
  v_who      text;
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

  select nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), employment_end_date,
         case when role::text = 'super_admin' then 'An ElderLoop support login' else 'A staff member' end
    into v_name, v_end_date, v_who
    from public.profiles where id = p_user;
  v_who := coalesce(v_who, 'A staff member');

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
      v_who || ' opened health information after their employment end date.',
      c.notify_ids);
  end if;

  -- 2. Quiet hours, by someone who is rarely signed in then (any community)
  if c.night_on and (case when c.night_start > c.night_end
                          then v_hour >= c.night_start or v_hour < c.night_end
                          else v_hour >= c.night_start and v_hour < c.night_end end) then
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
        v_who || ' opened health information at ' || to_char(v_local, 'FMHH12:MI AM')
          || ', outside the hours they usually work.',
        c.notify_ids);
    end if;
  end if;

  if not (p_area = any (v_res_level)) then return; end if;

  -- 3. Many different residents of this community in a short time
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
       and a.organization_id = p_org
       and a.action = 'VIEW'
       and a.table_name = any (v_res_level)
       and a.created_at >  p_at - make_interval(mins => c.bulk_minutes)
       and a.created_at <= p_at;
    if v_n >= c.bulk_count then
      perform public._phi_raise_alert(p_org, p_user, v_name, 'bulk', null, v_day, p_at, v_n,
        'Opened health records for ' || v_n || ' different residents within ' || c.bulk_minutes || ' minutes.',
        v_who || ' opened health records for ' || v_n || ' residents within ' || c.bulk_minutes || ' minutes.',
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
      if v_left is null or v_left < p_at - make_interval(days => c.inactive_days) then
        perform public._phi_raise_alert(p_org, p_user, v_name, 'inactive_resident', v_res, v_day, p_at, null,
          case when v_left is null then 'Opened the record of a resident who is no longer active.'
               else 'Opened the record of a resident who has been inactive since '
                    || to_char(v_left at time zone c.timezone, 'Mon FMDD, YYYY') || '.' end,
          v_who || ' opened the record of a resident who is no longer active.',
          c.notify_ids);
      end if;
    end if;
  end if;
end;
$$;

revoke all on function public._phi_check_unusual(uuid, uuid, text, uuid, timestamptz) from public, anon, authenticated;

-- ── Nobody reviews an alert about themselves (super admins included) ─────────
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
  if v_a.user_id = v_me.id then
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

-- ── phi_alerts_list says when the person is ElderLoop support ────────────────
drop function if exists public.phi_alerts_list(uuid, text, int);

create or replace function public.phi_alerts_list(
  p_org    uuid default null,
  p_status text default 'open',   -- open | closed (reviewed + dismissed) | all
  p_limit  int  default 200
) returns table (
  id               uuid,
  kind             text,
  user_id          uuid,
  user_name        text,
  is_support       boolean,
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
         coalesce(p.role::text = 'super_admin', false),
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

revoke all on function public.phi_alerts_list(uuid, text, int) from public, anon;
grant execute on function public.phi_alerts_list(uuid, text, int) to authenticated;
