-- Budget layer, Phase 4 · Maintenance and Housekeeping (design: https://claude.ai/artifact/N3er5vW3dj2RerraUypNvG).
--
-- Maintenance: every work order records labor hours (existing actual_hours), parts
-- bought for the job, vendor cost, and planned / routine / emergency. Parts and
-- vendor cost on a closed work order join the spend ledger (Maintenance) on the day
-- it closes. Parts taken from Central Supply stock are not entered here: they
-- already count when issued to Maintenance. Labor isn't in budgets (payroll lives
-- outside ElderLoop), so hours are tracked but never priced.
-- Assets: purchase cost, replacement cost, expected life, salvage value. Lifetime
-- repairs = parts + vendor cost on the asset's closed work orders. Repair-or-replace
-- flag at lifetime repairs ≥ 50% of replacement cost. Straight-line depreciation is
-- an estimate for capital planning, never the books of record.
--
-- Housekeeping: linen discard log (any Housekeeping staff), linen in circulation
-- (set by the Housekeeping Manager), linen $ per occupied room day, chemical units
-- per occupied room day, linen loss rate.

-- ── Work-order costs ──────────────────────────────────────────────────────────
alter table work_orders add column if not exists parts_cost numeric(10, 2);
alter table work_orders add column if not exists vendor_cost numeric(10, 2);
alter table work_orders add column if not exists work_type text;
alter table work_orders drop constraint if exists work_orders_costs_check;
alter table work_orders add constraint work_orders_costs_check
  check (coalesce(parts_cost, 0) >= 0 and coalesce(vendor_cost, 0) >= 0 and coalesce(actual_hours, 0) >= 0);
alter table work_orders drop constraint if exists work_orders_work_type_check;
alter table work_orders add constraint work_orders_work_type_check
  check (work_type is null or work_type in ('planned', 'routine', 'emergency'));

-- Default type: PM jobs are planned, urgent jobs emergency, everything else routine.
-- The technician can change it at close-out.
create or replace function public.wo_default_work_type()
returns trigger language plpgsql as $function$
begin
  if new.work_type is null then
    new.work_type := case when new.title like '[PM]%' then 'planned'
                          when new.priority::text = 'urgent' then 'emergency' else 'routine' end;
  end if;
  return new;
end;
$function$;
drop trigger if exists trg_wo_default_work_type on work_orders;
create trigger trg_wo_default_work_type before insert on work_orders
  for each row execute function wo_default_work_type();
update work_orders set work_type = case when title like '[PM]%' then 'planned'
                                        when priority::text = 'urgent' then 'emergency' else 'routine' end
 where work_type is null;

-- ── Asset cost and life ───────────────────────────────────────────────────────
alter table maintenance_assets add column if not exists purchase_cost numeric(12, 2);
alter table maintenance_assets add column if not exists replacement_cost numeric(12, 2);
alter table maintenance_assets add column if not exists expected_life_years numeric(5, 1);
alter table maintenance_assets add column if not exists salvage_value numeric(12, 2);
alter table maintenance_assets drop constraint if exists maintenance_assets_costs_check;
alter table maintenance_assets add constraint maintenance_assets_costs_check
  check (coalesce(purchase_cost, 0) >= 0 and coalesce(replacement_cost, 0) >= 0
         and coalesce(salvage_value, 0) >= 0 and (expected_life_years is null or expected_life_years > 0));

-- ── Spend ledger: + closed work orders ───────────────────────────────────────
create or replace view public.spend_ledger as
  select po.organization_id, coalesce(po.ordered_date, po.created_at::date) as spend_date,
         coalesce(si.budget_department, po.department, 'central_supply') as department,
         coalesce(si.spend_category, 'other') as category,
         'purchase'::text as source, li.id as source_id,
         round(coalesce(li.quantity_ordered, 0) * coalesce(li.unit_cost, 0), 2) as amount
    from supply_po_line_items li
    join supply_purchase_orders po on po.id = li.po_id
    left join supply_items si on si.id = li.supply_item_id
   where po.status in ('submitted', 'partially_received', 'received')
  union all
  select po.organization_id, coalesce(po.ordered_date, po.created_at::date),
         coalesce(po.department, 'central_supply'), 'shipping', 'shipping', po.id,
         round(po.shipping_cost, 2)
    from supply_purchase_orders po
   where po.status in ('submitted', 'partially_received', 'received') and coalesce(po.shipping_cost, 0) > 0
  union all
  select t.organization_id, (t.created_at at time zone 'America/Chicago')::date,
         department_key(t.department), coalesce(si.spend_category, 'other'), 'issue', t.id,
         round(abs(t.quantity) * coalesce(t.unit_cost, si.cost_per_unit, 0), 2)
    from supply_transactions t
    left join supply_items si on si.id = t.supply_item_id
   where t.transaction_type = 'issue_dept'
     and coalesce(si.budget_department, 'central_supply') = 'central_supply'
     and department_key(t.department) in ('dietary', 'housekeeping', 'maintenance')
  union all
  select m.organization_id, m.spend_date, m.department, m.category, 'manual', m.id, m.amount
    from budget_manual_spend m
  union all
  select w.organization_id, (w.completed_at at time zone 'America/Chicago')::date, 'maintenance',
         'maintenance_parts', 'work_order', w.id, round(w.parts_cost, 2)
    from work_orders w
   where w.status = 'closed' and w.completed_at is not null and coalesce(w.parts_cost, 0) > 0
  union all
  select w.organization_id, (w.completed_at at time zone 'America/Chicago')::date, 'maintenance',
         'vendor_services', 'work_order', w.id, round(w.vendor_cost, 2)
    from work_orders w
   where w.status = 'closed' and w.completed_at is not null and coalesce(w.vendor_cost, 0) > 0;
revoke all on public.spend_ledger from public, anon, authenticated;

-- ── Maintenance report ───────────────────────────────────────────────────────
-- One row per month ending at p_month. Costs are parts + vendor on work orders
-- closed that month. PM completion = planned jobs due that month (not cancelled)
-- that are closed.
create or replace function public.maintenance_cost_report(p_month date default null, p_months int default 6, p_org uuid default null)
returns table (month date, closed_jobs bigint, labor_hours numeric, parts_cost numeric, vendor_cost numeric,
               emergency_vendor_cost numeric, planned_cost numeric, routine_cost numeric, emergency_cost numeric,
               reactive_pct numeric, pm_due bigint, pm_done bigint, pm_completion_pct numeric)
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_org  uuid := coalesce(p_org, get_my_org_id());
  v_last date := date_trunc('month', coalesce(p_month, (now() at time zone 'America/Chicago')::date))::date;
  v_n    int  := least(greatest(coalesce(p_months, 6), 1), 24);
begin
  if v_org is null or not org_has_budgets(v_org) or not can_see_budget(v_org, 'maintenance') then return; end if;
  return query
  with months as (select (v_last - make_interval(months => g))::date m from generate_series(0, v_n - 1) g),
  closed as (
    select date_trunc('month', (w.completed_at at time zone 'America/Chicago'))::date m, w.work_type,
           coalesce(w.actual_hours, 0) hrs, coalesce(w.parts_cost, 0) parts, coalesce(w.vendor_cost, 0) vendor
      from work_orders w
     where w.organization_id = v_org and w.status = 'closed' and w.completed_at is not null
       and (w.completed_at at time zone 'America/Chicago')::date >= (v_last - make_interval(months => v_n - 1))::date
  ),
  pm as (
    select date_trunc('month', w.due_date)::date m, (w.status = 'closed') done
      from work_orders w
     where w.organization_id = v_org and w.work_type = 'planned' and w.status <> 'cancelled' and w.due_date is not null
       and w.due_date >= (v_last - make_interval(months => v_n - 1))::date
  )
  select mo.m,
    (select count(*) from closed c where c.m = mo.m),
    (select coalesce(sum(c.hrs), 0) from closed c where c.m = mo.m),
    (select coalesce(sum(c.parts), 0) from closed c where c.m = mo.m),
    (select coalesce(sum(c.vendor), 0) from closed c where c.m = mo.m),
    (select coalesce(sum(c.vendor), 0) from closed c where c.m = mo.m and c.work_type = 'emergency'),
    (select coalesce(sum(c.parts + c.vendor), 0) from closed c where c.m = mo.m and c.work_type = 'planned'),
    (select coalesce(sum(c.parts + c.vendor), 0) from closed c where c.m = mo.m and c.work_type = 'routine'),
    (select coalesce(sum(c.parts + c.vendor), 0) from closed c where c.m = mo.m and c.work_type = 'emergency'),
    (select case when sum(c.parts + c.vendor) > 0
                 then round(sum(c.parts + c.vendor) filter (where c.work_type <> 'planned') / sum(c.parts + c.vendor) * 100, 1) end
       from closed c where c.m = mo.m),
    (select count(*) from pm where pm.m = mo.m),
    (select count(*) filter (where pm.done) from pm where pm.m = mo.m),
    (select case when count(*) > 0 then round(count(*) filter (where pm.done)::numeric / count(*) * 100, 1) end
       from pm where pm.m = mo.m)
  from months mo order by mo.m;
end;
$function$;

-- Assets with their cost picture, flagged first. Repairs = parts + vendor cost on
-- the asset's closed work orders (labor isn't priced).
create or replace function public.maintenance_asset_costs(p_org uuid default null)
returns table (asset_id uuid, asset_number text, name text, category text, location text, purchase_date date,
               age_years numeric, purchase_cost numeric, replacement_cost numeric, expected_life_years numeric,
               salvage_value numeric, lifetime_repairs numeric, repair_jobs bigint, repair_pct numeric, replace_flag boolean,
               annual_depreciation numeric, est_book_value numeric, life_used_pct numeric)
language plpgsql stable security definer set search_path to 'public' as $function$
declare v_org uuid := coalesce(p_org, get_my_org_id()); v_today date := (now() at time zone 'America/Chicago')::date;
begin
  if v_org is null or not org_has_budgets(v_org) or not can_see_budget(v_org, 'maintenance') then return; end if;
  return query
  select a.id, a.asset_number, a.name, a.category, coalesce(nullif(concat_ws(' · ', a.building, a.location), ''), null),
         a.purchase_date,
         case when a.purchase_date is not null then round((v_today - a.purchase_date) / 365.25, 1) end,
         a.purchase_cost, a.replacement_cost, a.expected_life_years, a.salvage_value,
         r.total, r.jobs,
         case when a.replacement_cost > 0 then round(r.total / a.replacement_cost * 100, 1) end,
         coalesce(a.replacement_cost > 0 and r.total >= a.replacement_cost * 0.5, false),
         case when a.purchase_cost is not null and a.expected_life_years > 0
              then round((a.purchase_cost - coalesce(a.salvage_value, 0)) / a.expected_life_years, 2) end,
         case when a.purchase_cost is not null and a.expected_life_years > 0 and a.purchase_date is not null
              then round(greatest(a.purchase_cost - (a.purchase_cost - coalesce(a.salvage_value, 0))
                                   / a.expected_life_years * ((v_today - a.purchase_date) / 365.25),
                                  coalesce(a.salvage_value, 0)), 2) end,
         case when a.expected_life_years > 0 and a.purchase_date is not null
              then round(((v_today - a.purchase_date) / 365.25) / a.expected_life_years * 100, 0) end
    from maintenance_assets a
    cross join lateral (
      select coalesce(sum(coalesce(w.parts_cost, 0) + coalesce(w.vendor_cost, 0)), 0) total,
             count(*) filter (where coalesce(w.parts_cost, 0) + coalesce(w.vendor_cost, 0) > 0) jobs
        from work_orders w where w.asset_id = a.id and w.status = 'closed') r
   where a.organization_id = v_org and a.is_active is not false
   order by 15 desc, 14 desc nulls last, a.name;
end;
$function$;

-- ── Housekeeping: linen ──────────────────────────────────────────────────────
create table if not exists linen_discards (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  discard_date     date not null default ((now() at time zone 'America/Chicago')::date),
  supply_item_id   uuid references supply_items(id) on delete set null,
  item_name        text not null,
  quantity         int not null check (quantity > 0),
  reason           text not null check (reason in ('torn', 'stained', 'worn', 'lost', 'other')),
  notes            text,
  logged_by        uuid references profiles(id) on delete set null default auth.uid(),
  entered_in_error boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists linen_discards_org_date on linen_discards (organization_id, discard_date);
alter table linen_discards enable row level security;
-- Housekeeping staff log and see discards (legacy communities: any staff member);
-- they fix their own entries, Supervisor+ fixes any; nobody deletes (mark entered in error)
drop policy if exists linen_discards_read on linen_discards;
create policy linen_discards_read on linen_discards for select to authenticated using (
  organization_id = (select get_my_org_id()) and ((not (select my_org_tiered())) or (select t_member('housekeeping'))));
drop policy if exists linen_discards_insert on linen_discards;
create policy linen_discards_insert on linen_discards for insert to authenticated with check (
  organization_id = (select get_my_org_id()) and logged_by = auth.uid()
  and ((not (select my_org_tiered())) or (select t_member('housekeeping'))));
drop policy if exists linen_discards_update on linen_discards;
create policy linen_discards_update on linen_discards for update to authenticated using (
  organization_id = (select get_my_org_id())
  and (logged_by = auth.uid() or (select t_at_least('housekeeping', 'supervisor')) or not (select my_org_tiered())));
-- Portal logins (family / resident) never see department records
drop policy if exists staff_only_no_portal on linen_discards;
create policy staff_only_no_portal on linen_discards as restrictive for all to authenticated
  using (not (select is_portal_user())) with check (not (select is_portal_user()));
drop trigger if exists trg_nha_write_guard on linen_discards;
create trigger trg_nha_write_guard before insert or update or delete on linen_discards
  for each row execute function nha_write_guard('records');

create table if not exists housekeeping_settings (
  organization_id      uuid primary key references organizations(id) on delete cascade,
  linen_in_circulation int check (linen_in_circulation is null or linen_in_circulation >= 0),
  updated_by           uuid references profiles(id) on delete set null,
  updated_at           timestamptz not null default now()
);
alter table housekeeping_settings enable row level security;
drop policy if exists housekeeping_settings_read on housekeeping_settings;
create policy housekeeping_settings_read on housekeeping_settings for select to authenticated using (
  organization_id = (select get_my_org_id()) and (select get_my_role()) not in ('family', 'resident'));
-- Written through set_linen_in_circulation()

create or replace function public.set_linen_in_circulation(p_count int)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_org uuid := get_my_org_id();
begin
  if v_org is null or not coalesce(get_my_role() = 'org_admin'
       or (get_my_role() = 'ceo' and not my_org_tiered())
       or exists (select 1 from staff_department_roles d where d.profile_id = auth.uid()
                   and d.department = 'housekeeping' and d.level = 'manager'), false) then
    raise exception 'Only the Housekeeping Manager or an Org Admin sets linen in circulation' using errcode = '42501';
  end if;
  if p_count is not null and p_count < 0 then raise exception 'Count can''t be negative' using errcode = '22023'; end if;
  insert into housekeeping_settings (organization_id, linen_in_circulation, updated_by, updated_at)
  values (v_org, p_count, auth.uid(), now())
  on conflict (organization_id) do update set linen_in_circulation = excluded.linen_in_circulation,
    updated_by = excluded.updated_by, updated_at = excluded.updated_at;
end;
$function$;

-- One row per month ending at p_month. Linen spend = Housekeeping ledger rows in the
-- linen category; chemical units = chemical items issued to Housekeeping plus
-- chemical items bought on Housekeeping orders; discards valued at the item's cost.
create or replace function public.housekeeping_cost_report(p_month date default null, p_months int default 6, p_org uuid default null)
returns table (month date, occupied_room_days bigint, census_days int, housekeeping_spend numeric, linen_spend numeric,
               linen_per_room_day numeric, chemical_units numeric, chemical_units_per_room_day numeric,
               linen_discarded int, linen_discard_cost numeric, linen_in_circulation int, linen_loss_pct numeric)
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_org   uuid := coalesce(p_org, get_my_org_id());
  v_last  date := date_trunc('month', coalesce(p_month, (now() at time zone 'America/Chicago')::date))::date;
  v_today date := (now() at time zone 'America/Chicago')::date;
  v_n     int  := least(greatest(coalesce(p_months, 6), 1), 24);
  v_circ  int;
begin
  if v_org is null or not org_has_budgets(v_org) or not can_see_budget(v_org, 'housekeeping') then return; end if;
  select s.linen_in_circulation into v_circ from housekeeping_settings s where s.organization_id = v_org;
  return query
  with months as (select (v_last - make_interval(months => g))::date m from generate_series(0, v_n - 1) g),
  base as (
    select mo.m,
      (select coalesce(sum(c.occupied_rooms), 0)::bigint from census_daily c where c.organization_id = v_org
          and c.census_date >= mo.m and c.census_date < mo.m + interval '1 month' and c.census_date <= v_today) ord,
      (select count(*)::int from census_daily c where c.organization_id = v_org
          and c.census_date >= mo.m and c.census_date < mo.m + interval '1 month' and c.census_date <= v_today) cd,
      coalesce((select sum(l.amount) from spend_ledger l where l.organization_id = v_org and l.department = 'housekeeping'
          and l.spend_date >= mo.m and l.spend_date < mo.m + interval '1 month'), 0) hk,
      coalesce((select sum(l.amount) from spend_ledger l where l.organization_id = v_org and l.department = 'housekeeping'
          and l.category = 'linen' and l.spend_date >= mo.m and l.spend_date < mo.m + interval '1 month'), 0) linen,
      coalesce((select sum(abs(t.quantity)) from supply_transactions t join supply_items si on si.id = t.supply_item_id
          where t.organization_id = v_org and t.transaction_type = 'issue_dept' and department_key(t.department) = 'housekeeping'
            and si.spend_category = 'chemicals'
            and (t.created_at at time zone 'America/Chicago')::date >= mo.m
            and (t.created_at at time zone 'America/Chicago')::date < mo.m + interval '1 month'), 0)
      + coalesce((select sum(li.quantity_ordered) from supply_po_line_items li
          join supply_purchase_orders po on po.id = li.po_id join supply_items si on si.id = li.supply_item_id
          where po.organization_id = v_org and po.status in ('submitted', 'partially_received', 'received')
            and si.spend_category = 'chemicals' and coalesce(si.budget_department, po.department) = 'housekeeping'
            and coalesce(po.ordered_date, po.created_at::date) >= mo.m
            and coalesce(po.ordered_date, po.created_at::date) < mo.m + interval '1 month'), 0) chem,
      (select coalesce(sum(d.quantity), 0)::int from linen_discards d where d.organization_id = v_org and not d.entered_in_error
          and d.discard_date >= mo.m and d.discard_date < mo.m + interval '1 month') disc,
      (select coalesce(sum(d.quantity * coalesce(si.cost_per_unit, 0)), 0) from linen_discards d
          left join supply_items si on si.id = d.supply_item_id
          where d.organization_id = v_org and not d.entered_in_error
            and d.discard_date >= mo.m and d.discard_date < mo.m + interval '1 month') disc_cost
    from months mo
  )
  select b.m, b.ord, b.cd, round(b.hk, 2), round(b.linen, 2),
    case when b.ord > 0 then round(b.linen / b.ord, 2) end,
    b.chem, case when b.ord > 0 then round(b.chem / b.ord, 3) end,
    b.disc, round(b.disc_cost, 2), v_circ,
    case when v_circ > 0 then round(b.disc::numeric / v_circ * 100, 1) end
  from base b order by b.m;
end;
$function$;

revoke all on function public.maintenance_cost_report(date, int, uuid), public.maintenance_asset_costs(uuid),
  public.housekeeping_cost_report(date, int, uuid), public.set_linen_in_circulation(int) from public, anon;
grant execute on function public.maintenance_cost_report(date, int, uuid), public.maintenance_asset_costs(uuid),
  public.housekeeping_cost_report(date, int, uuid), public.set_linen_in_circulation(int) to authenticated;
