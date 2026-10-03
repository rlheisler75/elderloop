-- Budget layer, Phase 1 · Foundation (design: https://claude.ai/artifact/N3er5vW3dj2RerraUypNvG).
--
-- Daily census, monthly department budgets, budget change requests (chain
-- communities), off-system purchases, spend attribution on supply items and
-- purchase orders, one spend ledger, and the functions every budget screen uses.
--
-- Costs never reach Employees or Supervisors: the ledger view is not readable by
-- any app role, and spend is only returned through security-definer functions
-- that check can_see_budget() (department Manager, NHA, Org Admin, the community's
-- Corporate users, super admin). Budgets are written only through set_budget_year()
-- / decide_budget_change(): by Corporate when the community belongs to a
-- corporation, otherwise by the NHA or Org Admin.
--
-- Departments with budgets: dietary, housekeeping, central_supply, maintenance.
-- Spend attribution (no organization-wide total is ever shown, so the two views of
-- central stock never get added together):
--   * purchase-order lines count when the order is submitted, toward the item's
--     budget_department (default central_supply), else the order's department;
--   * central stock issued to a department counts toward the receiving department;
--   * off-system purchases (grocery runs, card purchases) count as entered.
-- Work-order costs join the ledger in budget Phase 4.

-- ── Module: Budgets add-on (Professional/Enterprise included, $79 add-on otherwise)
insert into modules (key, label, description, is_active)
values ('budgets', 'Budgets', 'Monthly department budgets, spend tracking, and per-resident-day costs', false)
on conflict do nothing;

-- Like the AI modules, only ElderLoop turns Budgets on or off (billing decides)
drop policy if exists ai_modules_super_admin_insert on organization_modules;
drop policy if exists ai_modules_super_admin_update on organization_modules;
drop policy if exists ai_modules_super_admin_delete on organization_modules;
create policy ai_modules_super_admin_insert on organization_modules as restrictive for insert
  with check ((module_key <> all (array['ai_assist', 'ai_assist_clinical', 'budgets'])) or (get_my_role() = 'super_admin'));
create policy ai_modules_super_admin_update on organization_modules as restrictive for update
  using ((module_key <> all (array['ai_assist', 'ai_assist_clinical', 'budgets'])) or (get_my_role() = 'super_admin'))
  with check ((module_key <> all (array['ai_assist', 'ai_assist_clinical', 'budgets'])) or (get_my_role() = 'super_admin'));
create policy ai_modules_super_admin_delete on organization_modules as restrictive for delete
  using ((module_key <> all (array['ai_assist', 'ai_assist_clinical', 'budgets'])) or (get_my_role() = 'super_admin'));

create or replace function public.org_has_budgets(p_org uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from organization_modules where organization_id = p_org and module_key = 'budgets' and is_enabled)
$function$;

-- ── Spend attribution on supply items and purchase orders ─────────────────────
alter table supply_items add column if not exists budget_department text;
alter table supply_items add column if not exists spend_category text;
alter table supply_items drop constraint if exists supply_items_spend_category_check;
alter table supply_items add constraint supply_items_spend_category_check check (spend_category is null or spend_category in
  ('food', 'linen', 'chemicals', 'paper', 'medical', 'incontinence', 'personal_care', 'office', 'maintenance_parts', 'other'));
alter table supply_items drop constraint if exists supply_items_budget_department_check;
alter table supply_items add constraint supply_items_budget_department_check check (budget_department is null or budget_department in
  ('dietary', 'housekeeping', 'central_supply', 'maintenance'));
alter table supply_purchase_orders add column if not exists department text;
alter table supply_purchase_orders drop constraint if exists supply_purchase_orders_department_check;
alter table supply_purchase_orders add constraint supply_purchase_orders_department_check check (department is null or department in
  ('dietary', 'housekeeping', 'central_supply', 'maintenance'));

-- Existing food items (Order Guide items or the "Food" category) belong to Dietary
update supply_items set budget_department = 'dietary', spend_category = coalesce(spend_category, 'food')
 where budget_department is null and (menu_item_id is not null or lower(category) = 'food');

-- "Central Supply" / "Nursing / Medical" style labels → department keys
create or replace function public.department_key(p_label text)
returns text language sql immutable as $function$
  select nullif(trim(both '_' from lower(regexp_replace(coalesce(p_label, ''), '[^a-zA-Z]+', '_', 'g'))), '')
$function$;

-- ── Daily census ──────────────────────────────────────────────────────────────
create table if not exists census_daily (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  census_date      date not null,
  resident_count   int not null check (resident_count >= 0),
  occupied_rooms   int not null check (occupied_rooms >= 0),
  by_care_level    jsonb not null default '{}',
  source           text not null default 'auto' check (source in ('auto', 'corrected')),
  corrected_by     uuid references profiles(id) on delete set null,
  corrected_at     timestamptz,
  note             text,
  created_at       timestamptz not null default now(),
  unique (organization_id, census_date)
);
alter table census_daily enable row level security;
drop policy if exists census_read on census_daily;
create policy census_read on census_daily for select to authenticated using (
  (organization_id = (select get_my_org_id()) and (select get_my_role()) not in ('family', 'resident'))
  or (select get_my_role()) = 'super_admin');
-- Writes only through snapshot_census() / correct_census()

-- Records today's census for every active community. Runs nightly (pg_cron, 04:30 UTC
-- = late evening in US time zones, so the date recorded is the US calendar day).
-- Corrected days are never overwritten.
create or replace function public.snapshot_census(p_date date default ((now() at time zone 'America/Chicago')::date))
returns int language plpgsql security definer set search_path to 'public' as $function$
declare n int;
begin
  insert into census_daily (organization_id, census_date, resident_count, occupied_rooms, by_care_level)
  select o.id, p_date,
    (select count(*) from residents r where r.organization_id = o.id and r.is_active is not false),
    (select count(distinct coalesce(nullif(trim(r.building), ''), '-') || '|' || coalesce(nullif(trim(r.room), ''), nullif(trim(r.unit), ''), r.id::text))
       from residents r where r.organization_id = o.id and r.is_active is not false),
    coalesce((select jsonb_object_agg(k, c) from (
       select coalesce(r.care_level, 'unspecified') k, count(*) c from residents r
        where r.organization_id = o.id and r.is_active is not false group by 1) x), '{}')
  from organizations o where o.is_active is not false
  on conflict (organization_id, census_date) do update
    set resident_count = excluded.resident_count, occupied_rooms = excluded.occupied_rooms,
        by_care_level = excluded.by_care_level
    where census_daily.source = 'auto';
  get diagnostics n = row_count;
  return n;
end;
$function$;
revoke all on function public.snapshot_census(date) from public, anon, authenticated;

-- NHA / Org Admin correction (e.g. a day the nightly run missed, or a discharge
-- entered late). Logged.
create or replace function public.correct_census(p_date date, p_residents int, p_rooms int, p_note text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_org uuid := get_my_org_id();
begin
  if get_my_role() not in ('ceo', 'org_admin', 'super_admin') or v_org is null then
    raise exception 'Only the Administrator or an Org Admin can correct the census' using errcode = '42501';
  end if;
  if p_date > (now() at time zone 'America/Chicago')::date then
    raise exception 'The census can''t be recorded for a future date' using errcode = '22023';
  end if;
  if p_residents < 0 or p_rooms < 0 then
    raise exception 'Counts can''t be negative' using errcode = '22023';
  end if;
  insert into census_daily (organization_id, census_date, resident_count, occupied_rooms, source, corrected_by, corrected_at, note)
  values (v_org, p_date, p_residents, p_rooms, 'corrected', auth.uid(), now(), nullif(trim(p_note), ''))
  on conflict (organization_id, census_date) do update
    set resident_count = excluded.resident_count, occupied_rooms = excluded.occupied_rooms, source = 'corrected',
        corrected_by = auth.uid(), corrected_at = now(), note = excluded.note;
  perform log_audit_event('CENSUS_CORRECTED', 'census_daily', p_date::text, null,
    jsonb_build_object('residents', p_residents, 'rooms', p_rooms, 'note', p_note), null);
end;
$function$;

-- ── Budgets ──────────────────────────────────────────────────────────────────
create table if not exists budgets (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  department       text not null check (department in ('dietary', 'housekeeping', 'central_supply', 'maintenance')),
  category         text,
  month            date not null check (extract(day from month) = 1),
  amount           numeric(12, 2) not null check (amount >= 0),
  set_by           uuid references profiles(id) on delete set null,
  set_at           timestamptz not null default now()
);
create unique index if not exists budgets_unique on budgets (organization_id, department, coalesce(category, ''), month);
alter table budgets enable row level security;

-- Who may see a department's budget and spend
create or replace function public.can_see_budget(p_org uuid, p_department text)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select get_my_role() = 'super_admin'
    or (my_corporation_id() is not null
        and my_corporation_id() = (select corporation_id from organizations where id = p_org))
    or (p_org = get_my_org_id() and (
          get_my_role() in ('org_admin', 'ceo')
          or exists (select 1 from staff_department_roles d
                      where d.profile_id = auth.uid() and d.department = p_department and d.level = 'manager')))
$function$;

-- Who may set them: Corporate for a chain community, otherwise the NHA or Org Admin
create or replace function public.can_set_budget(p_org uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select get_my_role() = 'super_admin'
    or (select case when o.corporation_id is not null then o.corporation_id = my_corporation_id()
                    else p_org = get_my_org_id() and get_my_role() in ('org_admin', 'ceo') end
          from organizations o where o.id = p_org)
$function$;

drop policy if exists budgets_read on budgets;
create policy budgets_read on budgets for select to authenticated using ((select can_see_budget(organization_id, department)));
drop policy if exists budgets_super_admin on budgets;
create policy budgets_super_admin on budgets for all to authenticated
  using ((select get_my_role()) = 'super_admin') with check ((select get_my_role()) = 'super_admin');

-- ── Off-system purchases (grocery runs, card purchases) ──────────────────────
create table if not exists budget_manual_spend (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  department       text not null check (department in ('dietary', 'housekeeping', 'central_supply', 'maintenance')),
  category         text not null default 'other',
  spend_date       date not null,
  amount           numeric(12, 2) not null check (amount > 0),
  vendor           text,
  description      text not null,
  entered_by       uuid references profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);
alter table budget_manual_spend enable row level security;
drop policy if exists manual_spend_read on budget_manual_spend;
create policy manual_spend_read on budget_manual_spend for select to authenticated
  using ((select can_see_budget(organization_id, department)));
-- The department's Manager or an Org Admin records purchases (not the NHA in a
-- tiered community: department records belong to the department)
drop policy if exists manual_spend_write on budget_manual_spend;
create policy manual_spend_write on budget_manual_spend for all to authenticated
  using (organization_id = (select get_my_org_id()) and (
    (select get_my_role()) in ('org_admin', 'super_admin')
    or ((select get_my_role()) = 'ceo' and not (select my_org_tiered()))
    or exists (select 1 from staff_department_roles d where d.profile_id = auth.uid()
                and d.department = budget_manual_spend.department and d.level = 'manager')))
  with check (organization_id = (select get_my_org_id()) and (
    (select get_my_role()) in ('org_admin', 'super_admin')
    or ((select get_my_role()) = 'ceo' and not (select my_org_tiered()))
    or exists (select 1 from staff_department_roles d where d.profile_id = auth.uid()
                and d.department = budget_manual_spend.department and d.level = 'manager')));

-- ── Budget change requests (communities in a corporation) ────────────────────
create table if not exists budget_change_requests (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  department        text not null check (department in ('dietary', 'housekeeping', 'central_supply', 'maintenance')),
  month             date not null check (extract(day from month) = 1),
  current_amount    numeric(12, 2),
  requested_amount  numeric(12, 2) not null check (requested_amount >= 0),
  reason            text not null check (length(trim(reason)) >= 10),
  status            text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'withdrawn')),
  requested_by      uuid references profiles(id) on delete set null,
  requested_at      timestamptz not null default now(),
  decided_by        uuid references profiles(id) on delete set null,
  decided_at        timestamptz,
  decision_note     text
);
alter table budget_change_requests enable row level security;
drop policy if exists bcr_read on budget_change_requests;
create policy bcr_read on budget_change_requests for select to authenticated using (
  (organization_id = (select get_my_org_id()) and (select get_my_role()) in ('ceo', 'org_admin'))
  or (select get_my_role()) = 'super_admin');
-- Writes only through request_budget_change() / decide_budget_change()

-- ── The spend ledger ─────────────────────────────────────────────────────────
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
    from budget_manual_spend m;
-- Read only by the functions below (they run as the owner)
revoke all on public.spend_ledger from public, anon, authenticated;

-- ── Budget status: what every budget screen shows ────────────────────────────
-- One row per budget department the caller may see, for one month. Pace is
-- spent ÷ days elapsed × days in month (current month only).
create or replace function public.budget_status(p_month date default null, p_org uuid default null)
returns table (
  department text, budget numeric, spent numeric, pct_used numeric, projected numeric, projected_pct numeric,
  daily_to_land numeric, days_elapsed int, days_in_month int, resident_days bigint, occupied_room_days bigint,
  spend_ppd numeric, census_days_recorded int
) language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_org   uuid := coalesce(p_org, get_my_org_id());
  v_month date := date_trunc('month', coalesce(p_month, (now() at time zone 'America/Chicago')::date))::date;
  v_end   date := (v_month + interval '1 month' - interval '1 day')::date;
  v_today date := (now() at time zone 'America/Chicago')::date;
  v_dim   int  := extract(day from v_end)::int;
  v_days  int;
begin
  if v_org is null or not org_has_budgets(v_org) then return; end if;
  v_days := case when v_today > v_end then v_dim when v_today < v_month then 0
                 else extract(day from v_today)::int end;
  return query
  with depts(d) as (values ('dietary'), ('housekeeping'), ('central_supply'), ('maintenance')),
  cen as (select coalesce(sum(c.resident_count), 0)::bigint rd, coalesce(sum(c.occupied_rooms), 0)::bigint ord, count(*)::int n
            from census_daily c where c.organization_id = v_org and c.census_date between v_month and least(v_end, v_today))
  select x.d, x.b, x.s,
    case when x.b > 0 then round(x.s / x.b * 100, 1) end,
    case when v_days between 1 and v_dim - 1 then round(x.s / v_days * v_dim, 2) else x.s end,
    case when x.b > 0 then round((case when v_days between 1 and v_dim - 1 then x.s / v_days * v_dim else x.s end) / x.b * 100, 1) end,
    case when x.b is not null and v_days < v_dim then round(greatest(x.b - x.s, 0) / (v_dim - greatest(v_days, 0)), 2) end,
    v_days, v_dim, cen.rd, cen.ord,
    case when cen.rd > 0 then round(x.s / cen.rd, 2) end,
    cen.n
  from (
    select dp.d,
      (select b.amount from budgets b where b.organization_id = v_org and b.department = dp.d
          and b.category is null and b.month = v_month) b,
      coalesce((select sum(l.amount) from spend_ledger l where l.organization_id = v_org and l.department = dp.d
          and l.spend_date between v_month and v_end), 0) s
    from depts dp where can_see_budget(v_org, dp.d)
  ) x cross join cen;
end;
$function$;

-- Spend by category for one department and month (for the department drill-down)
create or replace function public.budget_spend_breakdown(p_department text, p_month date default null, p_org uuid default null)
returns table (category text, source text, amount numeric, entries bigint)
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_org   uuid := coalesce(p_org, get_my_org_id());
  v_month date := date_trunc('month', coalesce(p_month, (now() at time zone 'America/Chicago')::date))::date;
begin
  if v_org is null or not org_has_budgets(v_org) or not can_see_budget(v_org, p_department) then return; end if;
  return query
  select l.category, l.source, sum(l.amount), count(*)
    from spend_ledger l
   where l.organization_id = v_org and l.department = p_department
     and l.spend_date between v_month and (v_month + interval '1 month' - interval '1 day')::date
   group by 1, 2 order by 3 desc;
end;
$function$;

-- Monthly actual spend for a year (for "start from last year's actuals")
create or replace function public.budget_actuals_by_month(p_department text, p_year int, p_org uuid default null)
returns numeric[] language plpgsql stable security definer set search_path to 'public' as $function$
declare v_org uuid := coalesce(p_org, get_my_org_id()); out numeric[] := array[]::numeric[]; i int;
begin
  if v_org is null or not can_see_budget(v_org, p_department) then
    raise exception 'You can''t see this department''s spending' using errcode = '42501';
  end if;
  for i in 1..12 loop
    out := out || coalesce((select sum(l.amount) from spend_ledger l
      where l.organization_id = v_org and l.department = p_department
        and l.spend_date >= make_date(p_year, i, 1) and l.spend_date < make_date(p_year, i, 1) + interval '1 month'), 0);
  end loop;
  return out;
end;
$function$;

-- Set a department's budget for each month of a year (null = leave that month alone)
create or replace function public.set_budget_year(p_org uuid, p_department text, p_year int, p_amounts numeric[])
returns int language plpgsql security definer set search_path to 'public' as $function$
declare i int; n int := 0;
begin
  if not can_set_budget(p_org) then
    raise exception 'Budgets for this community are set by %',
      case when (select corporation_id from organizations where id = p_org) is not null
           then 'your corporate office. Use Request a change.' else 'the Administrator or an Org Admin.' end
      using errcode = '42501';
  end if;
  if not org_has_budgets(p_org) then
    raise exception 'The Budgets add-on is not turned on for this community' using errcode = '42501';
  end if;
  if p_department not in ('dietary', 'housekeeping', 'central_supply', 'maintenance') then
    raise exception 'Unknown budget department %', p_department using errcode = '22023';
  end if;
  if coalesce(array_length(p_amounts, 1), 0) <> 12 then
    raise exception 'Provide 12 monthly amounts' using errcode = '22023';
  end if;
  for i in 1..12 loop
    continue when p_amounts[i] is null;
    if p_amounts[i] < 0 then raise exception 'Budgets can''t be negative' using errcode = '22023'; end if;
    insert into budgets (organization_id, department, category, month, amount, set_by, set_at)
    values (p_org, p_department, null, make_date(p_year, i, 1), round(p_amounts[i], 2), auth.uid(), now())
    on conflict (organization_id, department, coalesce(category, ''), month) do update
      set amount = excluded.amount, set_by = excluded.set_by, set_at = excluded.set_at;
    n := n + 1;
  end loop;
  perform log_audit_event('BUDGET_SET', 'budgets', p_org::text, null,
    jsonb_build_object('organization_id', p_org, 'department', p_department, 'year', p_year, 'amounts', to_jsonb(p_amounts)), null);
  return n;
end;
$function$;

-- The NHA (or Org Admin) of a chain community asks Corporate for a different budget
create or replace function public.request_budget_change(p_department text, p_month date, p_amount numeric, p_reason text)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare v_org uuid := get_my_org_id(); v_id uuid; v_month date := date_trunc('month', p_month)::date;
begin
  if get_my_role() not in ('ceo', 'org_admin') or v_org is null then
    raise exception 'Only the Administrator or an Org Admin can request a budget change' using errcode = '42501';
  end if;
  if (select corporation_id from organizations where id = v_org) is null then
    raise exception 'Your community sets its own budgets; change it directly' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 10 then
    raise exception 'Give a reason (at least 10 characters)' using errcode = '22023';
  end if;
  insert into budget_change_requests (organization_id, department, month, current_amount, requested_amount, reason, requested_by)
  values (v_org, p_department, v_month,
          (select amount from budgets where organization_id = v_org and department = p_department and category is null and month = v_month),
          round(p_amount, 2), trim(p_reason), auth.uid())
  returning id into v_id;
  return v_id;
end;
$function$;

-- Corporate (or ElderLoop) approves or declines a request; approval sets the budget
create or replace function public.decide_budget_change(p_request uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare r budget_change_requests;
begin
  select * into r from budget_change_requests where id = p_request for update;
  if r.id is null then raise exception 'Request not found' using errcode = '22023'; end if;
  if not (get_my_role() = 'super_admin'
          or (select corporation_id from organizations where id = r.organization_id) = my_corporation_id()) then
    raise exception 'Only the corporate office decides budget requests' using errcode = '42501';
  end if;
  if r.status <> 'pending' then raise exception 'This request was already %', r.status using errcode = '22023'; end if;
  update budget_change_requests
     set status = case when p_approve then 'approved' else 'declined' end,
         decided_by = auth.uid(), decided_at = now(), decision_note = nullif(trim(p_note), '')
   where id = r.id;
  if p_approve then
    insert into budgets (organization_id, department, category, month, amount, set_by, set_at)
    values (r.organization_id, r.department, null, r.month, r.requested_amount, auth.uid(), now())
    on conflict (organization_id, department, coalesce(category, ''), month) do update
      set amount = excluded.amount, set_by = excluded.set_by, set_at = excluded.set_at;
  end if;
  perform log_audit_event(case when p_approve then 'BUDGET_REQUEST_APPROVED' else 'BUDGET_REQUEST_DECLINED' end,
    'budget_change_requests', r.id::text, null, jsonb_build_object('note', p_note), null);
end;
$function$;

-- Corporate: every community's budget status for a month, plus pending requests
create or replace function public.corporate_budget_overview(p_month date default null, p_corporation uuid default null)
returns table (organization_id uuid, name text, department text, budget numeric, spent numeric,
               pct_used numeric, projected_pct numeric, spend_ppd numeric)
language plpgsql stable security definer set search_path to 'public' as $function$
declare v_corp uuid := corporate_scope(p_corporation); o record;
begin
  for o in select org.id, org.name as oname from organizations org
            where org.corporation_id = v_corp and org.is_active is not false and org_has_budgets(org.id) order by 2 loop
    return query select o.id, o.oname, s.department, s.budget, s.spent, s.pct_used, s.projected_pct, s.spend_ppd
                   from budget_status(p_month, o.id) s;
  end loop;
end;
$function$;

create or replace function public.corporate_budget_requests(p_corporation uuid default null)
returns table (id uuid, organization_id uuid, community text, department text, month date, current_amount numeric,
               requested_amount numeric, reason text, status text, requested_at timestamptz, decided_at timestamptz, decision_note text)
language plpgsql stable security definer set search_path to 'public' as $function$
declare v_corp uuid := corporate_scope(p_corporation);
begin
  return query
  select r.id, r.organization_id, o.name, r.department, r.month, r.current_amount, r.requested_amount, r.reason,
         r.status, r.requested_at, r.decided_at, r.decision_note
    from budget_change_requests r join organizations o on o.id = r.organization_id
   where o.corporation_id = v_corp
   order by (r.status = 'pending') desc, r.requested_at desc
   limit 200;
end;
$function$;

-- Budgets for a year (corporate users can't read the budgets table directly)
create or replace function public.budget_year(p_org uuid, p_year int)
returns table (department text, month int, amount numeric)
language plpgsql stable security definer set search_path to 'public' as $function$
begin
  return query
  select b.department, extract(month from b.month)::int, b.amount
    from budgets b
   where b.organization_id = p_org and b.category is null and extract(year from b.month) = p_year
     and can_see_budget(p_org, b.department);
end;
$function$;

revoke all on function public.can_see_budget(uuid, text), public.can_set_budget(uuid), public.org_has_budgets(uuid),
  public.budget_status(date, uuid), public.budget_spend_breakdown(text, date, uuid), public.budget_actuals_by_month(text, int, uuid),
  public.set_budget_year(uuid, text, int, numeric[]), public.request_budget_change(text, date, numeric, text),
  public.decide_budget_change(uuid, boolean, text), public.corporate_budget_overview(date, uuid),
  public.corporate_budget_requests(uuid), public.budget_year(uuid, int), public.correct_census(date, int, int, text)
  from public, anon;
grant execute on function public.can_see_budget(uuid, text), public.can_set_budget(uuid), public.org_has_budgets(uuid),
  public.budget_status(date, uuid), public.budget_spend_breakdown(text, date, uuid), public.budget_actuals_by_month(text, int, uuid),
  public.set_budget_year(uuid, text, int, numeric[]), public.request_budget_change(text, date, numeric, text),
  public.decide_budget_change(uuid, boolean, text), public.corporate_budget_overview(date, uuid),
  public.corporate_budget_requests(uuid), public.budget_year(uuid, int), public.correct_census(date, int, int, text)
  to authenticated;

-- ── Nightly census + first snapshot ──────────────────────────────────────────
select cron.unschedule('census-daily-snapshot') where exists (select 1 from cron.job where jobname = 'census-daily-snapshot');
select cron.schedule('census-daily-snapshot', '30 4 * * *', $$select public.snapshot_census()$$);
select public.snapshot_census();
