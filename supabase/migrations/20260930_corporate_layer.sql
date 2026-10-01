-- Access tiers, Phase 5 · Corporate layer.
--
-- A corporation owns several communities (organizations.corporation_id). A
-- Corporate Executive (role 'corporate', profiles.corporation_id, no organization)
-- gets NO direct table access to any community — every RLS policy keys on
-- get_my_org_id(), which is null for them. Instead they see only what these
-- security-definer functions return: per-community counts and totals. No resident,
-- staff, or prospect names, no notes or free text (decision: no resident names in
-- corporate drill-down). Their one write is a chain-wide announcement.

-- ── Data model ───────────────────────────────────────────────────────────────
create table if not exists corporations (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  fiscal_year_start_month int not null default 1 check (fiscal_year_start_month between 1 and 12),
  created_at             timestamptz not null default now()
);
alter table corporations enable row level security;

alter table organizations add column if not exists corporation_id uuid references corporations(id) on delete set null;
alter table profiles      add column if not exists corporation_id uuid references corporations(id) on delete set null;
create index if not exists organizations_corporation_id on organizations (corporation_id);

create or replace function public.my_corporation_id()
returns uuid language sql stable security definer set search_path to 'public' as $function$
  select corporation_id from profiles where id = auth.uid() and role::text = 'corporate' and is_active is not false
$function$;
revoke all on function public.my_corporation_id() from public, anon;
grant execute on function public.my_corporation_id() to authenticated;

drop policy if exists corporations_read on corporations;
create policy corporations_read on corporations for select using (
  id = (select my_corporation_id())
  or id = (select corporation_id from organizations where id = get_my_org_id())
  or get_my_role() = 'super_admin');
drop policy if exists corporations_super_admin on corporations;
create policy corporations_super_admin on corporations for all
  using (get_my_role() = 'super_admin') with check (get_my_role() = 'super_admin');

-- Corporate role in the tier lookup
create or replace function public.my_access_tier(p_module text)
returns text language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_role text;
  v_dept text := module_department(p_module);
  v_lvl  int;
begin
  select role::text into v_role from profiles where id = auth.uid();
  if v_role is null or v_role in ('family', 'resident', 'sales_rep') then return 'none'; end if;
  if v_role = 'super_admin' then return 'super_admin'; end if;
  if v_role = 'org_admin'   then return 'org_admin'; end if;
  if v_role = 'ceo'         then return 'administrator'; end if;
  if v_role = 'corporate'   then return 'corporate'; end if;

  select max(case level when 'manager' then 2 when 'supervisor' then 1 else 0 end)
    into v_lvl
    from staff_department_roles
   where profile_id = auth.uid()
     and (v_dept is null or department = v_dept);

  if v_lvl = 2 then return 'manager'; end if;
  if v_lvl = 1 then return 'supervisor'; end if;
  if v_lvl = 0 then return 'employee'; end if;

  if not exists (select 1 from staff_department_roles where profile_id = auth.uid()) then
    if v_role = 'manager'    then return 'manager'; end if;
    if v_role = 'supervisor' then return 'supervisor'; end if;
  end if;
  return 'employee';
end;
$function$;

-- Only ElderLoop links communities and corporate logins to a corporation
create or replace function public.protect_org_billing_fields()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  if coalesce(auth.role(), '') <> 'authenticated' or get_my_role() = 'super_admin' then
    return new;
  end if;

  if (new.plan, new.plan_price, new.billing_status, new.billing_note, new.is_active,
      new.subscription_status, new.stripe_customer_id, new.stripe_subscription_id, new.stripe_price_id,
      new.current_period_start, new.current_period_end, new.trial_end, new.cancel_at_period_end,
      new.resident_limit, new.staff_limit, new.rep_id, new.rep_code, new.signup_promo_code,
      new.ai_monthly_budget, new.access_model, new.corporation_id)
     is distinct from
     (old.plan, old.plan_price, old.billing_status, old.billing_note, old.is_active,
      old.subscription_status, old.stripe_customer_id, old.stripe_subscription_id, old.stripe_price_id,
      old.current_period_start, old.current_period_end, old.trial_end, old.cancel_at_period_end,
      old.resident_limit, old.staff_limit, old.rep_id, old.rep_code, old.signup_promo_code,
      old.ai_monthly_budget, old.access_model, old.corporation_id)
  then
    raise exception 'Plan, billing, and subscription settings can only be changed by ElderLoop'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

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
    if v_admin and old.organization_id = v_org and old.role::text not in ('super_admin', 'sales_rep', 'corporate') then
      return old;
    end if;
    raise exception 'Only an Org Admin can remove a user' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if v_admin and new.organization_id = v_org and new.role::text not in ('super_admin', 'sales_rep', 'corporate')
       and new.corporation_id is null then
      return new;
    end if;
    raise exception 'Profiles can only be created through ElderLoop account setup' using errcode = '42501';
  end if;

  if (new.role, new.organization_id, new.is_active, new.is_platform_admin, new.email, new.corporation_id)
     is not distinct from
     (old.role, old.organization_id, old.is_active, old.is_platform_admin, old.email, old.corporation_id) then
    return new;
  end if;

  if v_admin
     and old.organization_id = v_org and new.organization_id = v_org
     and new.corporation_id is not distinct from old.corporation_id
     and new.role::text not in ('super_admin', 'sales_rep', 'corporate')
     and old.role::text not in ('super_admin', 'sales_rep', 'corporate') then
    return new;
  end if;

  raise exception 'Only an Org Admin can change a user''s role, access, email, or community'
    using errcode = '42501';
end;
$function$;

-- ── Which corporation a caller may look at ───────────────────────────────────
-- Corporate users: their own. Super admins: any (they pass p_corporation).
create or replace function public.corporate_scope(p_corporation uuid default null)
returns uuid language plpgsql stable security definer set search_path to 'public' as $function$
declare v_corp uuid;
begin
  if get_my_role() = 'super_admin' then
    return p_corporation;
  end if;
  v_corp := my_corporation_id();
  if v_corp is null then
    raise exception 'Corporate access only' using errcode = '42501';
  end if;
  return v_corp;
end;
$function$;

-- ── Portfolio: one row per community, counts only ───────────────────────────
create or replace function public.corporate_portfolio(p_corporation uuid default null)
returns table (
  organization_id uuid, name text, city text, state text, plan text,
  census int, staff int, il_units int, il_occupied int,
  open_work_orders int, urgent_work_orders int, overdue_pm int, overdue_life_safety int,
  incidents_30d int, serious_incidents_30d int, state_reports_overdue int, state_reports_pending int,
  open_grievances int, certs_expired int, certs_expiring_30d int,
  survey_responses_30d int, new_leads_30d int, supply_ordered_30d numeric
) language plpgsql stable security definer set search_path to 'public' as $function$
declare v_corp uuid := corporate_scope(p_corporation);
begin
  return query
  select o.id, o.name, o.city, o.state, o.plan,
    (select count(*) from residents r where r.organization_id = o.id and r.is_active is not false)::int,
    (select count(*) from profiles p where p.organization_id = o.id and p.is_active is not false
       and p.role::text not in ('family', 'resident'))::int,
    (select count(*) from il_units u where u.organization_id = o.id and u.is_active is not false)::int,
    (select count(*) from il_units u where u.organization_id = o.id and u.is_active is not false and u.status = 'occupied')::int,
    (select count(*) from work_orders w where w.organization_id = o.id and w.status::text not in ('closed', 'cancelled'))::int,
    (select count(*) from work_orders w where w.organization_id = o.id and w.status::text not in ('closed', 'cancelled') and w.priority::text = 'urgent')::int,
    (select count(*) from pm_schedules m where m.organization_id = o.id and m.is_active and m.next_due < current_date)::int,
    (select count(*) from compliance_inspections c where c.organization_id = o.id and c.next_due_date < current_date)::int,
    (select count(*) from incident_reports i where i.organization_id = o.id and i.is_active and i.created_at > now() - interval '30 days')::int,
    (select count(*) from incident_reports i where i.organization_id = o.id and i.is_active and i.created_at > now() - interval '30 days'
       and i.severity::text in ('serious', 'critical'))::int,
    (select count(*) from incident_reports i where i.organization_id = o.id and i.is_active and i.is_state_reportable
       and i.state_reported_at is null
       and i.allegation_known_at + case when i.reportable_level = 'two_hour' then interval '2 hours' else interval '24 hours' end < now())::int,
    (select count(*) from incident_reports i where i.organization_id = o.id and i.is_active and i.is_state_reportable
       and i.state_reported_at is null)::int,
    (select count(*) from ss_grievances g where g.organization_id = o.id and g.is_active and g.status not in ('resolved', 'withdrawn'))::int,
    (select count(*) from staff_certifications sc where sc.organization_id = o.id and sc.expiry_date < current_date)::int,
    (select count(*) from staff_certifications sc where sc.organization_id = o.id and sc.expiry_date between current_date and current_date + 30)::int,
    (select count(*) from survey_responses sr where sr.organization_id = o.id and sr.submitted_at > now() - interval '30 days')::int,
    (select count(*) from leads l where l.organization_id = o.id and l.created_at > now() - interval '30 days')::int,
    (select coalesce(sum(coalesce(li.quantity_ordered, 0) * coalesce(li.unit_cost, 0)), 0)
       from supply_po_line_items li join supply_purchase_orders po on po.id = li.po_id
      where po.organization_id = o.id and po.status::text not in ('draft', 'cancelled')
        and po.ordered_date > current_date - 30)
  from organizations o
  where o.corporation_id = v_corp and o.is_active is not false
  order by o.name;
end;
$function$;

-- ── Drill-down: one community, grouped counts only ───────────────────────────
create or replace function public.corporate_community_detail(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_corp uuid; v_org_corp uuid;
begin
  select corporation_id into v_org_corp from organizations where id = p_org;
  v_corp := corporate_scope(v_org_corp);
  if v_org_corp is null or v_org_corp is distinct from v_corp then
    raise exception 'That community is not part of your corporation' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'census_by_care_level', (select coalesce(jsonb_object_agg(k, n), '{}') from (
        select coalesce(care_level::text, 'unspecified') k, count(*) n from residents
         where organization_id = p_org and is_active is not false group by 1) x),
    'staff_by_department', (select coalesce(jsonb_object_agg(k, n), '{}') from (
        select coalesce(department, 'unassigned') k, count(*) n from profiles
         where organization_id = p_org and is_active is not false and role::text not in ('family', 'resident') group by 1) x),
    'open_work_orders_by_priority', (select coalesce(jsonb_object_agg(k, n), '{}') from (
        select priority::text k, count(*) n from work_orders
         where organization_id = p_org and status::text not in ('closed', 'cancelled') group by 1) x),
    'open_work_orders_by_category', (select coalesce(jsonb_object_agg(k, n), '{}') from (
        select coalesce(category, 'other') k, count(*) n from work_orders
         where organization_id = p_org and status::text not in ('closed', 'cancelled') group by 1) x),
    'incidents_90d_by_type', (select coalesce(jsonb_object_agg(k, n), '{}') from (
        select incident_type::text k, count(*) n from incident_reports
         where organization_id = p_org and is_active and created_at > now() - interval '90 days' group by 1) x),
    'incidents_90d_by_severity', (select coalesce(jsonb_object_agg(k, n), '{}') from (
        select severity::text k, count(*) n from incident_reports
         where organization_id = p_org and is_active and created_at > now() - interval '90 days' group by 1) x),
    -- De-identified: report number, type, severity, dates — never names or narrative
    'state_reportable_open', (select coalesce(jsonb_agg(jsonb_build_object(
        'report_number', report_number, 'incident_type', incident_type, 'severity', severity,
        'allegation_known_at', allegation_known_at, 'reportable_level', reportable_level,
        'initial_due', allegation_known_at + case when reportable_level = 'two_hour' then interval '2 hours' else interval '24 hours' end,
        'state_reported_at', state_reported_at, 'investigation_reported_at', investigation_reported_at)
        order by allegation_known_at), '[]') from incident_reports
         where organization_id = p_org and is_active and is_state_reportable
           and (state_reported_at is null or investigation_reported_at is null)),
    'open_grievances_by_category', (select coalesce(jsonb_object_agg(k, n), '{}') from (
        select category k, count(*) n from ss_grievances
         where organization_id = p_org and is_active and status not in ('resolved', 'withdrawn') group by 1) x),
    'leads_by_status', (select coalesce(jsonb_object_agg(k, n), '{}') from (
        select status::text k, count(*) n from leads where organization_id = p_org group by 1) x),
    'il_units_by_status', (select coalesce(jsonb_object_agg(k, n), '{}') from (
        select status::text k, count(*) n from il_units where organization_id = p_org and is_active is not false group by 1) x),
    'certs', jsonb_build_object(
        'expired', (select count(*) from staff_certifications where organization_id = p_org and expiry_date < current_date),
        'expiring_30d', (select count(*) from staff_certifications where organization_id = p_org and expiry_date between current_date and current_date + 30)),
    'maintenance', jsonb_build_object(
        'overdue_pm', (select count(*) from pm_schedules where organization_id = p_org and is_active and next_due < current_date),
        'overdue_life_safety', (select count(*) from compliance_inspections where organization_id = p_org and next_due_date < current_date))
  );
end;
$function$;

-- ── Chain-wide announcement: the corporate role's one write ─────────────────
create or replace function public.corporate_post_announcement(
  p_title text, p_body text, p_category text default 'general', p_expires_at timestamptz default null,
  p_corporation uuid default null)
returns int language plpgsql security definer set search_path to 'public' as $function$
declare v_corp uuid := corporate_scope(p_corporation); v_corp_name text; n int;
begin
  if length(trim(coalesce(p_title, ''))) = 0 then
    raise exception 'A title is required' using errcode = '22023';
  end if;
  select name into v_corp_name from corporations where id = v_corp;
  insert into announcements (organization_id, title, body, category, is_active, expires_at, created_by)
  select o.id, trim(p_title),
         trim(coalesce(p_body, '')) || E'\n\n— ' || coalesce(v_corp_name, 'Corporate'),
         coalesce(p_category, 'general')::announcement_category, true, p_expires_at, auth.uid()
    from organizations o where o.corporation_id = v_corp and o.is_active is not false;
  get diagnostics n = row_count;
  perform log_audit_event('CORPORATE_ANNOUNCEMENT', 'announcements', null, null,
    jsonb_build_object('communities', n, 'title', trim(p_title)), null);
  return n;
end;
$function$;

revoke all on function public.corporate_scope(uuid), public.corporate_portfolio(uuid),
  public.corporate_community_detail(uuid), public.corporate_post_announcement(text, text, text, timestamptz, uuid)
  from public, anon;
grant execute on function public.corporate_portfolio(uuid), public.corporate_community_detail(uuid),
  public.corporate_post_announcement(text, text, text, timestamptz, uuid) to authenticated;
