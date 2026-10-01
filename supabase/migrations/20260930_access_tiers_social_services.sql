-- Access tiers, Phase 3 · Social Services. Clinical (resident psychosocial) data.
-- RESTRICTIVE policies that only bite when the caller's community is on
-- access_model = 'tiered' (legacy unchanged), plus two changes for everyone:
-- an audit trail on every Social Services clinical table, and "entered in error"
-- on case notes (they're never deleted).
--
-- Who sees a resident's Social Services records (tiered):
--   Social Services Supervisor+ and administrators — every resident
--   a social worker (employee) — their assigned caseload (ss_social_profiles.
--     assigned_to) plus unassigned residents, so a building without a director
--     handing out caseloads still works (same compromise as Maintenance's queue)
--   Nursing Supervisor+ (DON level) — read, for interdisciplinary care
--   any nurse — mood/behavior logs and care conferences (read; nurses also log moods)
-- Nobody else. Previously any non-family staff member could read profiles,
-- discharge plans, mood logs, referrals, and conferences.

create or replace function public.ss_can_see_resident(p_resident uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select my_access_tier('social_services') in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
      or has_department_access('nursing', 'supervisor')
      or (has_department_access('social_services', 'employee')
          and not exists (select 1 from ss_social_profiles sp
                           where sp.resident_id = p_resident and sp.assigned_to is not null
                             and sp.assigned_to <> auth.uid()))
$function$;
-- Writing (on top of the existing is_social_services_writer policies): never Nursing.
create or replace function public.ss_can_write_resident(p_resident uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select my_access_tier('social_services') in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
      or (has_department_access('social_services', 'employee')
          and not exists (select 1 from ss_social_profiles sp
                           where sp.resident_id = p_resident and sp.assigned_to is not null
                             and sp.assigned_to <> auth.uid()))
$function$;
revoke all on function public.ss_can_see_resident(uuid), public.ss_can_write_resident(uuid) from public, anon;
grant execute on function public.ss_can_see_resident(uuid), public.ss_can_write_resident(uuid) to authenticated, service_role;

-- ── Caseload records: profiles, case notes, goals, discharge plans, referrals ──
do $$
declare t text;
begin
  foreach t in array array['ss_social_profiles', 'ss_case_notes', 'ss_goals', 'ss_discharge_plans', 'ss_referrals'] loop
    execute format('drop policy if exists tier_ss_select on public.%I', t);
    execute format('drop policy if exists tier_ss_insert on public.%I', t);
    execute format('drop policy if exists tier_ss_update on public.%I', t);
    execute format('drop policy if exists tier_ss_delete on public.%I', t);
    execute format($p$create policy tier_ss_select on public.%I as restrictive for select using (
      not (select my_org_tiered()) or ss_can_see_resident(resident_id))$p$, t);
    execute format($p$create policy tier_ss_insert on public.%I as restrictive for insert with check (
      not (select my_org_tiered()) or ss_can_write_resident(resident_id))$p$, t);
    execute format($p$create policy tier_ss_update on public.%I as restrictive for update using (
      not (select my_org_tiered()) or ss_can_write_resident(resident_id))$p$, t);
    -- Clinical records are never deleted (case notes are marked entered in error)
    execute format($p$create policy tier_ss_delete on public.%I as restrictive for delete using (
      not (select my_org_tiered()) or (select get_my_role()) = 'super_admin')$p$, t);
  end loop;
end $$;

-- A case note is edited by its author or a Social Services Supervisor+ (co-sign)
drop policy if exists tier_ss_note_author on ss_case_notes;
create policy tier_ss_note_author on ss_case_notes as restrictive for update using (
  not (select my_org_tiered())
  or created_by = auth.uid()
  or (select my_access_tier('social_services')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin'));

-- Caseload assignment (assigned_to) is a Supervisor+ decision
create or replace function public.ss_profile_assignment_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if coalesce(auth.role(), '') <> 'authenticated' or not my_org_tiered()
     or my_access_tier('social_services') in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin') then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.assigned_to is distinct from old.assigned_to then
    raise exception 'Caseload assignments are made by a Social Services Supervisor or Director.'
      using errcode = '42501', hint = 'tier_ss_assignment';
  end if;
  if tg_op = 'INSERT' and new.assigned_to is not null and new.assigned_to <> auth.uid() then
    raise exception 'Caseload assignments are made by a Social Services Supervisor or Director.'
      using errcode = '42501', hint = 'tier_ss_assignment';
  end if;
  return new;
end;
$function$;
drop trigger if exists trg_ss_profile_assignment_guard on ss_social_profiles;
create trigger trg_ss_profile_assignment_guard before insert or update on ss_social_profiles
  for each row execute function ss_profile_assignment_guard();

-- ── Interdisciplinary: mood/behavior logs and care conferences ──────────────
do $$
declare t text;
begin
  foreach t in array array['ss_mood_logs', 'ss_care_conferences'] loop
    execute format('drop policy if exists tier_ss_select on public.%I', t);
    execute format('drop policy if exists tier_ss_insert on public.%I', t);
    execute format('drop policy if exists tier_ss_update on public.%I', t);
    execute format('drop policy if exists tier_ss_delete on public.%I', t);
    execute format($p$create policy tier_ss_select on public.%I as restrictive for select using (
      not (select my_org_tiered()) or ss_can_see_resident(resident_id)
      or (select has_department_access('nursing', 'employee')))$p$, t);
    execute format($p$create policy tier_ss_insert on public.%I as restrictive for insert with check (
      not (select my_org_tiered()) or ss_can_write_resident(resident_id) %s)$p$, t,
      case when t = 'ss_mood_logs' then 'or (select has_department_access(''nursing'', ''employee''))' else '' end);
    execute format($p$create policy tier_ss_update on public.%I as restrictive for update using (
      not (select my_org_tiered()) or ss_can_write_resident(resident_id) %s)$p$, t,
      case when t = 'ss_mood_logs' then 'or logged_by = auth.uid()' else '' end);
    execute format($p$create policy tier_ss_delete on public.%I as restrictive for delete using (
      not (select my_org_tiered()) or (select get_my_role()) = 'super_admin')$p$, t);
  end loop;
end $$;

-- ── Community resources directory (not PHI): the Director curates it ────────
drop policy if exists tier_ss_res_write on ss_resources;
drop policy if exists tier_ss_res_insert on ss_resources;
drop policy if exists tier_ss_res_update on ss_resources;
drop policy if exists tier_ss_res_delete on ss_resources;
create policy tier_ss_res_insert on ss_resources as restrictive for insert with check (
  not (select my_org_tiered())
  or (select my_access_tier('social_services')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or (select has_department_access('social_services', 'employee')));
create policy tier_ss_res_update on ss_resources as restrictive for update using (
  not (select my_org_tiered())
  or (select my_access_tier('social_services')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or (select has_department_access('social_services', 'employee')));
create policy tier_ss_res_delete on ss_resources as restrictive for delete using (
  not (select my_org_tiered())
  or (select my_access_tier('social_services')) in ('manager', 'administrator', 'org_admin', 'super_admin'));

-- ── Grievances: closing one and the state-reporting fields belong to the
--    Social Services Director, the Administrator (grievance official), or an Org Admin
create or replace function public.ss_grievance_close_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if coalesce(auth.role(), '') <> 'authenticated' or not my_org_tiered()
     or my_access_tier('social_services') in ('manager', 'administrator', 'org_admin', 'super_admin') then
    return new;
  end if;
  if (new.status = 'resolved' and old.status is distinct from 'resolved')
     or (new.resolved_by, new.resolved_at) is distinct from (old.resolved_by, old.resolved_at)
     or (new.regulatory_report_required, new.regulatory_report_date, new.regulatory_agency)
        is distinct from (old.regulatory_report_required, old.regulatory_report_date, old.regulatory_agency) then
    raise exception 'Resolving a grievance and state reporting are done by the Social Services Director or the Administrator.'
      using errcode = '42501', hint = 'tier_ss_grievance';
  end if;
  return new;
end;
$function$;
drop trigger if exists trg_ss_grievance_close_guard on ss_grievances;
create trigger trg_ss_grievance_close_guard before update on ss_grievances
  for each row execute function ss_grievance_close_guard();

drop policy if exists tier_ss_griev_delete on ss_grievances;
create policy tier_ss_griev_delete on ss_grievances as restrictive for delete using (
  not (select my_org_tiered()) or (select get_my_role()) = 'super_admin');

-- ── For everyone: audit trail and "entered in error" ────────────────────────
do $$
declare t text;
begin
  foreach t in array array['ss_social_profiles', 'ss_case_notes', 'ss_goals', 'ss_discharge_plans', 'ss_referrals',
                           'ss_mood_logs', 'ss_care_conferences', 'ss_grievances'] loop
    execute format('drop trigger if exists audit_%s on public.%I', t, t);
    execute format('create trigger audit_%s after insert or update or delete on public.%I
                      for each row execute function audit_ephi_changes()', t, t);
  end loop;
end $$;

alter table ss_case_notes add column if not exists entered_in_error boolean not null default false;
alter table ss_case_notes add column if not exists entered_in_error_reason text;
alter table ss_case_notes add column if not exists entered_in_error_by uuid references profiles(id);
alter table ss_case_notes add column if not exists entered_in_error_at timestamptz;
