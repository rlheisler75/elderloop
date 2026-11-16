-- Health-information view logging (HIPAA audit controls, 45 CFR 164.312(b)).
-- Changes to health tables are already logged by audit_ephi_changes triggers;
-- this adds an audit_log row (action 'VIEW') when staff open a screen or a
-- resident's record that shows health information. Only the area, the record id,
-- and a row count are stored, never the health information itself.
--
-- Areas:
--   resident-level  (p_record_id = residents.id): nursing_chart, resident_contacts, social_profile
--   diet profile    (p_record_id = resident_dietary_profiles.id): dietary_profile
--   incident-level  (p_record_id = incident_reports.id): incident_report
--   list screens    (p_record_id null): nursing, incidents, dietary_profiles,
--                    physician_orders, social_<tab>
--
-- Repeat opens of the same thing by the same person within 10 minutes are
-- collapsed into one row so the log stays readable.

create index if not exists audit_log_view_dedupe_idx
  on public.audit_log (user_id, table_name, record_id, created_at desc)
  where action = 'VIEW';

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
end;
$$;

revoke all on function public.log_phi_view(text, uuid, int) from public, anon;
grant execute on function public.log_phi_view(text, uuid, int) to authenticated;
