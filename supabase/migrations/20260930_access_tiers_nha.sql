-- Access tiers, Phase 2: the Nursing Home Administrator (role key `ceo`) becomes
-- view + approve in communities on access_model = 'tiered'. Legacy communities
-- are untouched. Design: https://claude.ai/artifact/L8E4t6v4EB6BksyrEfkjD2
--
-- Rather than rewriting the ~54 policies that list `ceo` next to org_admin (and
-- the staff-wide policies an NHA also passes), one guard trigger sits in front of
-- writes. The NHA keeps every READ policy it has today.

-- ── 1. Approval thresholds (used by approval workflows in phases 3–4) ────────
alter table organizations add column if not exists approval_po_threshold numeric(10,2) not null default 1000;
alter table organizations add column if not exists approval_overtime_hours numeric(5,2) not null default 8;
comment on column organizations.approval_po_threshold is
  'Purchase orders and vendor jobs above this amount (USD) need the Administrator''s approval.';
comment on column organizations.approval_overtime_hours is
  'Weekly overtime hours per employee above which the Administrator must approve.';

-- ── 2. Emergency Edit ("break glass") ────────────────────────────────────────
create table if not exists access_overrides (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id      uuid not null references profiles(id) on delete cascade,
  reason          text not null check (length(trim(reason)) >= 10),
  started_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '24 hours',
  ended_at        timestamptz
);
create index if not exists access_overrides_active on access_overrides (profile_id, expires_at);
alter table access_overrides enable row level security;
-- Readable by the person and their community's admins; written only by the RPCs below.
drop policy if exists access_overrides_read on access_overrides;
create policy access_overrides_read on access_overrides for select using (
  profile_id = auth.uid()
  or (organization_id = get_my_org_id() and get_my_role() in ('org_admin', 'ceo'))
  or get_my_role() = 'super_admin'
);

create or replace function public.has_emergency_edit()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from access_overrides
                  where profile_id = auth.uid() and ended_at is null and expires_at > now())
$function$;

create or replace function public.start_emergency_edit(p_reason text)
returns timestamptz language plpgsql security definer set search_path to 'public' as $function$
declare
  v_role text; v_org uuid; v_name text; v_expires timestamptz;
begin
  select role::text, organization_id, trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
    into v_role, v_org, v_name from profiles where id = auth.uid();
  if v_role is distinct from 'ceo' then
    raise exception 'Emergency Edit is only for Administrators' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 10 then
    raise exception 'Describe why you need Emergency Edit (at least 10 characters)' using errcode = '22023';
  end if;
  if has_emergency_edit() then
    select max(expires_at) into v_expires from access_overrides
     where profile_id = auth.uid() and ended_at is null and expires_at > now();
    return v_expires;
  end if;

  insert into access_overrides (organization_id, profile_id, reason)
  values (v_org, auth.uid(), trim(p_reason))
  returning expires_at into v_expires;

  perform log_audit_event('EMERGENCY_EDIT_START', 'access_overrides', null, null,
    jsonb_build_object('expires_at', v_expires), trim(p_reason));

  -- Alert every Org Admin (and Platform-Admin NHA) in the community via the in-app bell
  insert into push_notifications (org_id, recipient_id, title, body, category, link)
  select v_org, p.id,
         'Emergency Edit started',
         coalesce(nullif(v_name, ''), 'An Administrator') || ' turned on Emergency Edit for 24 hours: ' || left(trim(p_reason), 200),
         'urgent', '/app/admin?tab=users'
    from profiles p
   where p.organization_id = v_org and p.is_active is not false and p.id <> auth.uid()
     and (p.role::text = 'org_admin' or (p.role::text = 'ceo' and p.is_platform_admin));

  return v_expires;
end;
$function$;

create or replace function public.end_emergency_edit()
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  update access_overrides set ended_at = now()
   where profile_id = auth.uid() and ended_at is null and expires_at > now();
  if found then
    perform log_audit_event('EMERGENCY_EDIT_END', 'access_overrides', null, null, null, 'Ended early');
  end if;
end;
$function$;

revoke all on function public.has_emergency_edit(), public.start_emergency_edit(text), public.end_emergency_edit() from public, anon;
grant execute on function public.has_emergency_edit(), public.start_emergency_edit(text), public.end_emergency_edit() to authenticated;

-- ── 3. The guard ─────────────────────────────────────────────────────────────
-- tg_argv[0]:
--   'records'    NHA may not insert/update/delete (department-owned records)
--   'records_ud' NHA may insert (report a problem like any staff member) but not update/delete
--   'platform'   settings/users/modules: NHA needs the Platform Admin switch
-- Emergency Edit lifts 'records' / 'records_ud' only — never 'platform'.
create or replace function public.nha_write_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  v_role text; v_plat boolean; v_model text;
begin
  if coalesce(auth.role(), '') <> 'authenticated' then return coalesce(new, old); end if;

  select p.role::text, p.is_platform_admin, o.access_model
    into v_role, v_plat, v_model
    from profiles p left join organizations o on o.id = p.organization_id
   where p.id = auth.uid();

  if v_role is distinct from 'ceo' or coalesce(v_model, 'legacy') <> 'tiered' then
    return coalesce(new, old);
  end if;

  if tg_argv[0] = 'platform' then
    -- Everyone may edit their own profile (name, phone, preferences)
    if tg_table_name = 'profiles' and tg_op = 'UPDATE' and old.id = auth.uid() then return new; end if;
    if v_plat then return coalesce(new, old); end if;
    raise exception 'Only a Platform Admin can change settings, users, or modules. Ask your Org Admin, or have them turn on Platform Admin for your account.'
      using errcode = '42501', hint = 'nha_platform_only';
  end if;

  if tg_argv[0] = 'records_ud' and tg_op = 'INSERT' then return new; end if;
  if has_emergency_edit() then return coalesce(new, old); end if;

  raise exception 'Administrators have view and approval access here. To change this record, start Emergency Edit (24 hours, reason required).'
    using errcode = '42501', hint = 'nha_view_only';
end;
$function$;

-- Attach it. Tables left out on purpose (the NHA writes them per the matrix):
-- incident_reports, announcements, broadcast_messages, messages, resident_updates,
-- family_resident_links, residents (admissions/discharges), surveys + questions,
-- ss_grievances, supply_purchase_orders, compliance_inspections(+results),
-- ltc_inspections(+results), il_deposits (approvals, tightened to approval-only
-- columns in phases 3–4), and personal tables (time_punches, shift_swaps,
-- push_subscriptions, push_notifications, activity_rsvps, audit_log, ai_usage).
do $$
declare
  t text; kind text;
  guarded jsonb := jsonb_build_object(
    'records', jsonb_build_array(
      -- maintenance (incl. its configuration, which belongs to the Maintenance Manager)
      'wo_activity','wo_photos','work_order_attachments','pm_schedules','maintenance_assets',
      'wo_categories','wo_sla_rules','wo_auto_assign_rules','compliance_categories','compliance_checklist_items',
      -- dietary
      'cycle_menus','cycle_menu_days','cycle_menu_meals','menu_items','meal_courses','course_alternates',
      'recipe_ingredients','resident_dietary_profiles','physician_diet_orders','meal_delivery_orders',
      'food_waste_logs','dining_rooms','dining_tables','dining_seat_assignments','dietary_service_requests',
      'resident_meal_preferences','dietary_settings',
      -- housekeeping
      'inspection_areas','inspection_checklist_items','il_cleaning_requests',
      -- central supply
      'supply_items','supply_transactions','supply_po_line_items','supply_vendors','resident_supply_profiles',
      -- social services
      'ss_case_notes','ss_care_conferences','ss_goals','ss_mood_logs','ss_referrals','ss_discharge_plans',
      'ss_social_profiles','ss_resources',
      -- nursing
      'care_notes','resident_vitals','resident_medications',
      -- activities / chapel / transportation
      'activities','activity_attendance','chapel_services','trips','vehicles',
      -- security
      'security_rounds','security_checkins','security_checkpoints','security_schedules','security_reports',
      -- IT, meters
      'it_assets','it_licenses','meters','meter_readings','utility_types',
      -- property
      'il_units','il_leases','il_lease_tenants','il_tenants','il_rent_ledger','il_keys','il_walkthroughs',
      'il_walkthrough_items','il_notices',
      -- scheduling, staff
      'scheduled_shifts','shift_templates','staff_certifications',
      -- marketing
      'leads','lead_activities','marketing_campaigns','email_templates','nurture_sequences',
      'nurture_sequence_steps','lead_sequence_enrollments','referral_sources','landing_pages','campaign_leads',
      -- directory contacts
      'resident_emergency_contacts','resident_medical_contacts'),
    'records_ud', jsonb_build_array('work_orders','it_tickets'),
    'platform', jsonb_build_array(
      'organizations','organization_modules','role_module_visibility','user_module_permissions',
      'user_permission_overrides','staff_department_roles','profiles','invitations','ai_settings',
      'org_dropdown_items','geofence_settings','certification_types','locations','message_templates'));
begin
  for kind in select jsonb_object_keys(guarded) loop
    for t in select jsonb_array_elements_text(guarded -> kind) loop
      if to_regclass('public.' || t) is null then
        raise notice 'nha_write_guard: table % not found, skipped', t;
        continue;
      end if;
      execute format('drop trigger if exists trg_nha_write_guard on public.%I', t);
      execute format(
        'create trigger trg_nha_write_guard before insert or update or delete on public.%I
           for each row execute function nha_write_guard(%L)', t, kind);
    end loop;
  end loop;
end $$;

-- ── 4. Profiles: in tiered communities an NHA changes other users' roles/access
--       only with the Platform Admin switch (Phase 1 trigger, updated) ──────────
create or replace function public.protect_profile_privileges()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  v_role  text;
  v_org   uuid;
  v_admin boolean;
begin
  if coalesce(auth.role(), '') <> 'authenticated' then
    return coalesce(new, old);
  end if;
  select p.role::text, p.organization_id,
         p.role::text = 'org_admin'
           or (p.role::text = 'ceo' and (coalesce(o.access_model, 'legacy') = 'legacy' or p.is_platform_admin))
    into v_role, v_org, v_admin
    from profiles p left join organizations o on o.id = p.organization_id
   where p.id = auth.uid();
  if v_role = 'super_admin' then return coalesce(new, old); end if;

  if tg_op = 'DELETE' then
    if v_admin and old.organization_id = v_org and old.role::text not in ('super_admin', 'sales_rep') then
      return old;
    end if;
    raise exception 'Only an Org Admin can remove a user' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if v_admin and new.organization_id = v_org and new.role::text not in ('super_admin', 'sales_rep') then
      return new;
    end if;
    raise exception 'Profiles can only be created through ElderLoop account setup' using errcode = '42501';
  end if;

  if (new.role, new.organization_id, new.is_active, new.is_platform_admin, new.email)
     is not distinct from
     (old.role, old.organization_id, old.is_active, old.is_platform_admin, old.email) then
    return new;
  end if;

  if v_admin
     and old.organization_id = v_org and new.organization_id = v_org
     and new.role::text not in ('super_admin', 'sales_rep')
     and old.role::text not in ('super_admin', 'sales_rep') then
    return new;
  end if;

  raise exception 'Only an Org Admin can change a user''s role, access, email, or community'
    using errcode = '42501';
end;
$function$;

-- ── 5. Fix: user_permission_overrides let any community's Org Admin manage every
--       community's overrides (no organization check). Scope to the admin's own
--       community via the target user. ──────────────────────────────────────────
drop policy if exists org_admins_manage_overrides on user_permission_overrides;
create policy org_admins_manage_overrides on user_permission_overrides for all
  using (
    get_my_role() = 'super_admin'
    or (get_my_role() in ('org_admin', 'ceo')
        and exists (select 1 from profiles t where t.id = user_permission_overrides.user_id
                                              and t.organization_id = get_my_org_id()))
  )
  with check (
    get_my_role() = 'super_admin'
    or (get_my_role() in ('org_admin', 'ceo')
        and exists (select 1 from profiles t where t.id = user_permission_overrides.user_id
                                              and t.organization_id = get_my_org_id()))
  );
