-- Access tiers, Phase 4 · Nursing and Incident Reports. RESTRICTIVE policies and
-- guards that only bite when the caller's community is on access_model = 'tiered'
-- (plus two tiered-only PERMISSIVE incident policies, noted below), and new columns
-- every community gets.

-- ── Nursing ─────────────────────────────────────────────────────────────────
-- Previously one "anyone in the community" policy per table let any staff member
-- read, change, or delete care notes, vitals, and medication lists.
--   read:  Nursing (any level) and administrators; Dietary also reads vitals
--          (resident weights drive its malnutrition alerts)
--   write: notes/vitals by Nursing staff under their own name; edits by the author
--          or Nursing Supervisor+; medication lists by the DON (Nursing Manager)
--   never deleted: notes and vitals are marked entered in error; medications are
--          discontinued (is_active = false)
alter table care_notes      add column if not exists entered_in_error boolean not null default false;
alter table care_notes      add column if not exists entered_in_error_reason text;
alter table care_notes      add column if not exists entered_in_error_by uuid references profiles(id);
alter table care_notes      add column if not exists entered_in_error_at timestamptz;
alter table resident_vitals add column if not exists entered_in_error boolean not null default false;
alter table resident_vitals add column if not exists entered_in_error_reason text;
alter table resident_vitals add column if not exists entered_in_error_by uuid references profiles(id);
alter table resident_vitals add column if not exists entered_in_error_at timestamptz;

create or replace function public.nursing_is_supervisor()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select my_access_tier('nursing') in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
$function$;
create or replace function public.nursing_is_staff()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select nursing_is_supervisor() or has_department_access('nursing', 'employee')
$function$;
revoke all on function public.nursing_is_supervisor(), public.nursing_is_staff() from public, anon;
grant execute on function public.nursing_is_supervisor(), public.nursing_is_staff() to authenticated, service_role;

drop policy if exists tier_nurse_select on care_notes;
create policy tier_nurse_select on care_notes as restrictive for select
  using (not (select my_org_tiered()) or (select nursing_is_staff()));
drop policy if exists tier_nurse_insert on care_notes;
create policy tier_nurse_insert on care_notes as restrictive for insert with check (
  not (select my_org_tiered())
  or (select nursing_is_supervisor())
  or ((select nursing_is_staff()) and authored_by = auth.uid()));
drop policy if exists tier_nurse_update on care_notes;
create policy tier_nurse_update on care_notes as restrictive for update using (
  not (select my_org_tiered()) or (select nursing_is_supervisor())
  or ((select nursing_is_staff()) and authored_by = auth.uid()));
drop policy if exists tier_nurse_delete on care_notes;
create policy tier_nurse_delete on care_notes as restrictive for delete
  using (not (select my_org_tiered()) or (select get_my_role()) = 'super_admin');

drop policy if exists tier_nurse_select on resident_vitals;
create policy tier_nurse_select on resident_vitals as restrictive for select using (
  not (select my_org_tiered()) or (select nursing_is_staff())
  or (select has_department_access('dietary', 'employee')));
drop policy if exists tier_nurse_insert on resident_vitals;
create policy tier_nurse_insert on resident_vitals as restrictive for insert with check (
  not (select my_org_tiered())
  or (select nursing_is_supervisor())
  or ((select nursing_is_staff()) and recorded_by = auth.uid()));
drop policy if exists tier_nurse_update on resident_vitals;
create policy tier_nurse_update on resident_vitals as restrictive for update using (
  not (select my_org_tiered()) or (select nursing_is_supervisor())
  or ((select nursing_is_staff()) and recorded_by = auth.uid()));
drop policy if exists tier_nurse_delete on resident_vitals;
create policy tier_nurse_delete on resident_vitals as restrictive for delete
  using (not (select my_org_tiered()) or (select get_my_role()) = 'super_admin');

drop policy if exists tier_nurse_select on resident_medications;
create policy tier_nurse_select on resident_medications as restrictive for select
  using (not (select my_org_tiered()) or (select nursing_is_staff()));
drop policy if exists tier_nurse_insert on resident_medications;
create policy tier_nurse_insert on resident_medications as restrictive for insert with check (
  not (select my_org_tiered())
  or (select my_access_tier('nursing')) in ('manager', 'administrator', 'org_admin', 'super_admin'));
drop policy if exists tier_nurse_update on resident_medications;
create policy tier_nurse_update on resident_medications as restrictive for update using (
  not (select my_org_tiered())
  or (select my_access_tier('nursing')) in ('manager', 'administrator', 'org_admin', 'super_admin'));
drop policy if exists tier_nurse_delete on resident_medications;
create policy tier_nurse_delete on resident_medications as restrictive for delete
  using (not (select my_org_tiered()) or (select get_my_role()) = 'super_admin');

-- ── Incident reports ─────────────────────────────────────────────────────────
-- State-reportable tracking (42 CFR 483.12 for nursing homes): initial report to
-- the state within 2 hours of the allegation if it involves abuse or serious bodily
-- injury, otherwise 24 hours; investigation results within 5 working days.
-- The Administrator (or an Org Admin) makes the determination and closes reports.
alter table incident_reports add column if not exists allegation_known_at timestamptz;
alter table incident_reports add column if not exists is_state_reportable boolean;
alter table incident_reports add column if not exists reportable_level text;
alter table incident_reports add column if not exists reportable_determined_by uuid references profiles(id);
alter table incident_reports add column if not exists reportable_determined_at timestamptz;
alter table incident_reports add column if not exists state_reported_at timestamptz;
alter table incident_reports add column if not exists state_reported_by uuid references profiles(id);
alter table incident_reports add column if not exists investigation_reported_at timestamptz;
alter table incident_reports add column if not exists investigation_reported_by uuid references profiles(id);
do $$ begin
  alter table incident_reports add constraint incident_reports_reportable_level_check
    check (reportable_level is null or reportable_level in ('two_hour', 'twenty_four_hour'));
exception when duplicate_object then null; end $$;
comment on column incident_reports.allegation_known_at is
  'When the allegation/incident became known — the 483.12 reporting clock starts here (defaults to when the report was filed).';
update incident_reports set allegation_known_at = created_at where allegation_known_at is null;
alter table incident_reports alter column allegation_known_at set default now();

-- The legacy incident policies list roles (supervisor/manager/ceo/...). In tiered
-- communities supervisors are department levels, so these PERMISSIVE policies let a
-- department Supervisor+ see and work every incident — the only widening in the
-- access-tier rollout, matching what the legacy 'supervisor' role already had.
drop policy if exists tier_inc_view_supervisors on incident_reports;
create policy tier_inc_view_supervisors on incident_reports for select using (
  (select my_org_tiered()) and organization_id = (select get_my_org_id())
  and (select my_access_tier('incidents')) in ('supervisor', 'manager', 'administrator', 'org_admin'));
drop policy if exists tier_inc_update_supervisors on incident_reports;
create policy tier_inc_update_supervisors on incident_reports for update using (
  (select my_org_tiered()) and organization_id = (select get_my_org_id())
  and (select my_access_tier('incidents')) in ('supervisor', 'manager', 'administrator', 'org_admin'));

-- Restrict: below Supervisor, only your own draft; nobody deletes
drop policy if exists tier_inc_update on incident_reports;
create policy tier_inc_update on incident_reports as restrictive for update using (
  not (select my_org_tiered())
  or (select my_access_tier('incidents')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or (filed_by = auth.uid() and status = 'draft'));
drop policy if exists tier_inc_delete on incident_reports;
create policy tier_inc_delete on incident_reports as restrictive for delete
  using (not (select my_org_tiered()) or (select get_my_role()) = 'super_admin');

create or replace function public.incident_close_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_admin boolean;
begin
  if coalesce(auth.role(), '') <> 'authenticated' or not my_org_tiered() then
    return new;
  end if;
  v_admin := get_my_role() in ('ceo', 'org_admin', 'super_admin');
  if v_admin then
    -- Stamp who made the determination / filed with the state
    if (new.is_state_reportable, new.reportable_level) is distinct from (old.is_state_reportable, old.reportable_level) then
      new.reportable_determined_by := auth.uid(); new.reportable_determined_at := now();
    end if;
    if new.state_reported_at is not null and old.state_reported_at is null then new.state_reported_by := auth.uid(); end if;
    if new.investigation_reported_at is not null and old.investigation_reported_at is null then
      new.investigation_reported_by := auth.uid();
    end if;
    return new;
  end if;
  if (new.status = 'closed' and old.status is distinct from 'closed')
     or (new.is_state_reportable, new.reportable_level, new.state_reported_at, new.investigation_reported_at,
         new.reportable_determined_by, new.reportable_determined_at, new.state_reported_by, new.investigation_reported_by)
        is distinct from
        (old.is_state_reportable, old.reportable_level, old.state_reported_at, old.investigation_reported_at,
         old.reportable_determined_by, old.reportable_determined_at, old.state_reported_by, old.investigation_reported_by) then
    raise exception 'Closing an incident and state-reporting decisions are made by the Administrator.'
      using errcode = '42501', hint = 'tier_incident_close';
  end if;
  return new;
end;
$function$;
drop trigger if exists trg_incident_close_guard on incident_reports;
create trigger trg_incident_close_guard before update on incident_reports
  for each row execute function incident_close_guard();
