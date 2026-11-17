-- Health data access report (Admin Panel -> Health Data Access).
-- HIPAA audit controls (45 CFR 164.312(b)) expect the community to be able to
-- review who viewed and changed residents' health information. This reads the
-- existing audit_log rows:
--   VIEW rows from log_phi_view() (20261116_phi_view_logging.sql), and
--   INSERT / UPDATE / DELETE rows from the audit_ephi_changes triggers on the
--   resident health tables (work_orders and profiles are excluded: they carry
--   that trigger too but are not resident health information).
-- Who may run it: an Org Admin or Platform Admin of that community, or a super
-- admin, with two-factor satisfied (mfa_ok()). It returns names and record
-- labels only, never the old/new values themselves.

create index if not exists audit_log_org_created_idx
  on public.audit_log (organization_id, created_at desc);

create or replace function public.phi_access_report(
  p_from     timestamptz,
  p_to       timestamptz,
  p_org      uuid default null,     -- super admins only; everyone else gets their own community
  p_user     uuid default null,
  p_resident uuid default null,
  p_kind     text default 'all',    -- all | viewed | changed
  p_limit    int  default 500
) returns table (
  created_at    timestamptz,
  user_id       uuid,
  user_name     text,
  user_email    text,
  user_role     text,
  action        text,
  area          text,
  record_id     text,
  resident_id   uuid,
  resident_name text,
  detail        text,
  total_count   bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_me  public.profiles%rowtype;
  v_org uuid;
  v_uuid_re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  select * into v_me from public.profiles where id = auth.uid();
  if v_me.id is null or not public.mfa_ok() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  if v_me.role::text = 'super_admin' then
    v_org := coalesce(p_org, v_me.organization_id);
  elsif v_me.is_active is not false
        and (v_me.role::text = 'org_admin' or coalesce(v_me.is_platform_admin, false)) then
    v_org := v_me.organization_id;
  else
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_org is null then return; end if;

  return query
  with base as (
    select a.created_at, a.user_id, a.user_email, a.user_role, a.action, a.table_name, a.record_id,
           a.old_values, a.new_values
      from public.audit_log a
     where a.organization_id = v_org
       and a.created_at >= p_from and a.created_at < p_to
       and (p_user is null or a.user_id = p_user)
       and (
         (a.action = 'VIEW')
         or (a.action in ('INSERT', 'UPDATE', 'DELETE') and a.table_name in (
               'residents', 'resident_emergency_contacts', 'resident_medical_contacts',
               'resident_medications', 'resident_vitals', 'resident_dietary_profiles',
               'care_notes', 'incident_reports', 'resident_updates',
               'ss_care_conferences', 'ss_case_notes', 'ss_discharge_plans', 'ss_goals',
               'ss_grievances', 'ss_mood_logs', 'ss_referrals', 'ss_social_profiles'))
       )
       and (p_kind = 'all'
            or (p_kind = 'viewed'  and a.action = 'VIEW')
            or (p_kind = 'changed' and a.action <> 'VIEW'))
  ),
  resolved as (
    select b.*,
      case
        when b.table_name in ('nursing_chart', 'resident_contacts', 'social_profile', 'residents')
             and b.record_id ~ v_uuid_re then b.record_id::uuid
        when b.table_name = 'dietary_profile' and b.record_id ~ v_uuid_re then
             (select d.resident_id from public.resident_dietary_profiles d where d.id = b.record_id::uuid)
        when coalesce(b.new_values->>'resident_id', b.old_values->>'resident_id') ~ v_uuid_re then
             coalesce(b.new_values->>'resident_id', b.old_values->>'resident_id')::uuid
      end as res_id
      from base b
  ),
  filtered as (
    select r.* from resolved r where p_resident is null or r.res_id = p_resident
  )
  select f.created_at,
         f.user_id,
         nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
         f.user_email,
         f.user_role,
         f.action,
         f.table_name,
         f.record_id,
         f.res_id,
         coalesce(
           nullif(trim(coalesce(rs.first_name, '') || ' ' || coalesce(rs.last_name, '')), ''),
           -- deleted resident / diet profile: the name is in the logged row itself
           case when f.table_name in ('residents', 'resident_dietary_profiles') then
             nullif(trim(coalesce(coalesce(f.new_values, f.old_values)->>'first_name', '') || ' ' ||
                         coalesce(coalesce(f.new_values, f.old_values)->>'last_name', '')), '')
           end
         ),
         case
           when f.table_name in ('incident_report', 'incident_reports') and f.record_id ~ v_uuid_re then
             (select '#' || i.report_number::text || coalesce(' · ' || nullif(i.resident_name, ''), '')
                from public.incident_reports i where i.id = f.record_id::uuid)
           when f.table_name = 'dietary_profile' and f.res_id is null and f.record_id ~ v_uuid_re then
             (select 'Diet profile: ' || trim(coalesce(d.first_name, '') || ' ' || coalesce(d.last_name, ''))
                from public.resident_dietary_profiles d where d.id = f.record_id::uuid)
         end,
         count(*) over ()
    from filtered f
    left join public.profiles  p  on p.id  = f.user_id
    left join public.residents rs on rs.id = f.res_id
   order by f.created_at desc
   limit greatest(1, least(coalesce(p_limit, 500), 5000));
end;
$$;

revoke all on function public.phi_access_report(timestamptz, timestamptz, uuid, uuid, uuid, text, int) from public, anon;
grant execute on function public.phi_access_report(timestamptz, timestamptz, uuid, uuid, uuid, text, int) to authenticated;
