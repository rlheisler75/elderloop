-- Budget layer, Phase 2 · Dietary and Central Supply (design: https://claude.ai/artifact/N3er5vW3dj2RerraUypNvG).
--
-- Dietary: food cost per resident day, waste share, and top items by spend, month by
-- month (dietary_cost_report / dietary_top_items). Same spend as the budget: the
-- spend_ledger rows for the dietary department, so the two never disagree.
--
-- Central Supply: billable leakage. A chargeable item leaks when it is
--   * issued to a department instead of a resident (never charged), or
--   * charged to a resident but never marked billed by the business side.
-- ElderLoop doesn't keep resident accounts, so "billed" is a mark on the
-- issue_resident transaction (billed_at / billed_by / billing_reference), set through
-- mark_supply_charges_billed() by the Central Supply Manager or an Org Admin (and the
-- Administrator in legacy communities; in tiered ones the NHA approves, not edits).
-- Issues now record the item's cost and sale price at the time (SupplyIssue.jsx), so
-- later price changes don't rewrite history; older issues fall back to today's price.
--
-- Every permission check returns a strict boolean (see 20261002_budget_foundation_null_checks.sql).

-- ── Billing marks on resident charges ────────────────────────────────────────
alter table supply_transactions add column if not exists billed_at timestamptz;
alter table supply_transactions add column if not exists billed_by uuid references profiles(id) on delete set null;
alter table supply_transactions add column if not exists billing_reference text;

create or replace function public.supply_can_bill()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce(
    get_my_role() in ('org_admin', 'super_admin')
    or (get_my_role() = 'ceo' and not my_org_tiered())
    or exists (select 1 from staff_department_roles d where d.profile_id = auth.uid()
                and d.department = 'central_supply' and d.level = 'manager'),
    false)
$function$;

-- Billing columns change only for resident charges, and only by someone who may bill
-- (legacy communities' policies otherwise let any staff member update a transaction)
create or replace function public.supply_billing_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if coalesce(auth.role(), '') <> 'authenticated' then return new; end if;
  if (tg_op = 'INSERT' and (new.billed_at, new.billed_by, new.billing_reference) is not distinct from (null::timestamptz, null::uuid, null::text))
     or (tg_op = 'UPDATE' and (new.billed_at, new.billed_by, new.billing_reference)
                               is not distinct from (old.billed_at, old.billed_by, old.billing_reference)) then
    return new;
  end if;
  if new.transaction_type <> 'issue_resident' then
    raise exception 'Only resident charges can be marked billed' using errcode = '22023';
  end if;
  if not supply_can_bill() then
    raise exception 'Only the Central Supply Manager or an Org Admin can mark resident charges billed.'
      using errcode = '42501', hint = 'supply_billing';
  end if;
  return new;
end;
$function$;
drop trigger if exists trg_supply_billing_guard on supply_transactions;
create trigger trg_supply_billing_guard before insert or update on supply_transactions
  for each row execute function supply_billing_guard();

create or replace function public.mark_supply_charges_billed(p_ids uuid[], p_billed boolean default true, p_reference text default null)
returns int language plpgsql security definer set search_path to 'public' as $function$
declare n int;
begin
  if not supply_can_bill() then
    raise exception 'Only the Central Supply Manager or an Org Admin can mark resident charges billed.'
      using errcode = '42501', hint = 'supply_billing';
  end if;
  update supply_transactions t
     set billed_at = case when p_billed then now() end,
         billed_by = case when p_billed then auth.uid() end,
         billing_reference = case when p_billed then nullif(trim(p_reference), '') end
   where t.id = any(p_ids) and t.transaction_type = 'issue_resident'
     and (t.billed_at is null) = coalesce(p_billed, true)
     and ((get_my_org_id() is not null and t.organization_id = get_my_org_id()) or get_my_role() = 'super_admin');
  get diagnostics n = row_count;
  perform log_audit_event(case when p_billed then 'SUPPLY_CHARGES_BILLED' else 'SUPPLY_CHARGES_UNBILLED' end,
    'supply_transactions', null, null, jsonb_build_object('count', n, 'reference', p_reference), null);
  return n;
end;
$function$;

-- Sale value of one issued line: the price recorded at issue time, else the item's
-- current price. NULL when neither is set (shown as "no price" rather than $0).
create or replace function public.supply_issue_value(p_qty numeric, p_tx_price numeric, p_item_price numeric)
returns numeric language sql immutable as $function$
  select round(abs(p_qty) * coalesce(nullif(p_tx_price, 0), nullif(p_item_price, 0)), 2)
$function$;

-- Resident charges for the billing list. Names stay inside the community: Corporate
-- never gets this list (unlike the leakage totals).
create or replace function public.supply_resident_charges(p_from date, p_to date, p_unbilled_only boolean default false, p_org uuid default null)
returns table (id uuid, charged_on date, resident_id uuid, resident_name text, room text, item text, quantity numeric,
               unit_price numeric, amount numeric, billed_at timestamptz, billing_reference text, issued_by text)
language plpgsql stable security definer set search_path to 'public' as $function$
declare v_org uuid := coalesce(p_org, get_my_org_id());
begin
  if v_org is null
     or not coalesce(get_my_role() = 'super_admin' or (get_my_org_id() is not null and v_org = get_my_org_id()), false)
     or not (supply_can_bill() or can_see_budget(v_org, 'central_supply')) then
    raise exception 'Only the Central Supply Manager, the Administrator, or an Org Admin can see resident charges'
      using errcode = '42501';
  end if;
  return query
  select t.id, (t.created_at at time zone 'America/Chicago')::date, r.id,
         nullif(trim(coalesce(r.last_name, '') || ', ' || coalesce(r.first_name, '')), ','),
         nullif(trim(concat_ws(' ', nullif(trim(r.building), ''), coalesce(nullif(trim(r.room), ''), nullif(trim(r.unit), '')))), ''),
         si.name, abs(t.quantity),
         coalesce(nullif(t.sale_price, 0), nullif(si.sale_price, 0)),
         supply_issue_value(t.quantity, t.sale_price, si.sale_price),
         t.billed_at, t.billing_reference, nullif(trim(concat_ws(' ', p.first_name, p.last_name)), '')
    from supply_transactions t
    left join supply_items si on si.id = t.supply_item_id
    left join residents r on r.id = t.resident_id
    left join profiles p on p.id = t.performed_by
   where t.organization_id = v_org and t.transaction_type = 'issue_resident'
     and (t.created_at at time zone 'America/Chicago')::date between p_from and p_to
     and (not p_unbilled_only or t.billed_at is null)
   order by t.created_at desc
   limit 2000;
end;
$function$;

-- Leakage for one month, by where chargeable items went. One row for resident
-- charges and one per receiving department. Totals only, so Corporate may see it.
create or replace function public.supply_leakage(p_month date default null, p_org uuid default null)
returns table (charged_to text, kind text, chargeable_value numeric, uncharged_value numeric,
               lines bigint, uncharged_lines bigint, lines_without_price bigint)
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_org   uuid := coalesce(p_org, get_my_org_id());
  v_month date := date_trunc('month', coalesce(p_month, (now() at time zone 'America/Chicago')::date))::date;
begin
  if v_org is null or not org_has_budgets(v_org) or not can_see_budget(v_org, 'central_supply') then return; end if;
  return query
  select x.charged_to, x.kind,
         coalesce(sum(x.value), 0),
         coalesce(sum(x.value) filter (where x.uncharged), 0),
         count(*), count(*) filter (where x.uncharged), count(*) filter (where x.value is null)
    from (
      select case when t.transaction_type = 'issue_resident' then 'Residents'
                  else coalesce(nullif(trim(t.department), ''), 'No department') end as charged_to,
             case when t.transaction_type = 'issue_resident' then 'resident' else 'department' end as kind,
             supply_issue_value(t.quantity, t.sale_price, si.sale_price) as value,
             (t.transaction_type = 'issue_dept' or t.billed_at is null) as uncharged
        from supply_transactions t
        join supply_items si on si.id = t.supply_item_id
       where t.organization_id = v_org and si.is_resident_chargeable
         and t.transaction_type in ('issue_resident', 'issue_dept')
         and (t.created_at at time zone 'America/Chicago')::date
             between v_month and (v_month + interval '1 month' - interval '1 day')::date
    ) x
   group by x.charged_to, x.kind
   order by (x.kind = 'resident') desc, 4 desc;
end;
$function$;

-- ── Dietary: food cost per resident day ─────────────────────────────────────
-- One row per month, ending at p_month (p_months back, 1–24). Spend is the dietary
-- department's spend_ledger rows (submitted purchase orders, stock issued to
-- Dietary, off-system purchases); food = spend category 'food'. Budget per resident
-- day = the department budget ÷ (average daily census × days in the month).
create or replace function public.dietary_cost_report(p_month date default null, p_months int default 6, p_org uuid default null)
returns table (month date, days_in_month int, food_spend numeric, other_spend numeric, waste_cost numeric,
               resident_days bigint, census_days int, food_ppd numeric, dietary_ppd numeric, waste_pct numeric,
               budget numeric, budget_ppd numeric)
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_org   uuid := coalesce(p_org, get_my_org_id());
  v_last  date := date_trunc('month', coalesce(p_month, (now() at time zone 'America/Chicago')::date))::date;
  v_today date := (now() at time zone 'America/Chicago')::date;
  v_n     int  := least(greatest(coalesce(p_months, 6), 1), 24);
begin
  if v_org is null or not org_has_budgets(v_org) or not can_see_budget(v_org, 'dietary') then return; end if;
  return query
  with months as (
    select (v_last - make_interval(months => g))::date as m from generate_series(0, v_n - 1) g
  ), base as (
    select mo.m,
      extract(day from (mo.m + interval '1 month' - interval '1 day'))::int as dim,
      coalesce((select sum(l.amount) from spend_ledger l where l.organization_id = v_org and l.department = 'dietary'
                  and l.category = 'food' and l.spend_date >= mo.m and l.spend_date < mo.m + interval '1 month'), 0) as food,
      coalesce((select sum(l.amount) from spend_ledger l where l.organization_id = v_org and l.department = 'dietary'
                  and l.category <> 'food' and l.spend_date >= mo.m and l.spend_date < mo.m + interval '1 month'), 0) as other,
      coalesce((select sum(w.estimated_cost) from food_waste_logs w where w.organization_id = v_org
                  and w.waste_date >= mo.m and w.waste_date < mo.m + interval '1 month'), 0) as waste,
      (select coalesce(sum(c.resident_count), 0)::bigint from census_daily c where c.organization_id = v_org
          and c.census_date >= mo.m and c.census_date < mo.m + interval '1 month' and c.census_date <= v_today) as rd,
      (select count(*)::int from census_daily c where c.organization_id = v_org
          and c.census_date >= mo.m and c.census_date < mo.m + interval '1 month' and c.census_date <= v_today) as cd,
      (select b.amount from budgets b where b.organization_id = v_org and b.department = 'dietary'
          and b.category is null and b.month = mo.m) as bud
    from months mo
  )
  select b.m, b.dim, round(b.food, 2), round(b.other, 2), round(b.waste, 2), b.rd, b.cd,
    case when b.rd > 0 then round(b.food / b.rd, 2) end,
    case when b.rd > 0 then round((b.food + b.other) / b.rd, 2) end,
    case when b.food > 0 then round(b.waste / b.food * 100, 1) end,
    b.bud,
    case when b.bud is not null and b.rd > 0 then round(b.bud / (b.rd::numeric / b.cd * b.dim), 2) end
  from base b order by b.m;
end;
$function$;

-- Top dietary items by spend for one month (purchase-order lines and stock issued to
-- Dietary by item; off-system purchases by description). Shipping is left out.
create or replace function public.dietary_top_items(p_month date default null, p_limit int default 10, p_org uuid default null)
returns table (item text, category text, quantity numeric, amount numeric)
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_org   uuid := coalesce(p_org, get_my_org_id());
  v_month date := date_trunc('month', coalesce(p_month, (now() at time zone 'America/Chicago')::date))::date;
begin
  if v_org is null or not org_has_budgets(v_org) or not can_see_budget(v_org, 'dietary') then return; end if;
  return query
  select coalesce(si.name, nullif(trim(li.description), ''), m.description, 'Unnamed item') as nm,
         min(l.category), sum(coalesce(li.quantity_ordered, abs(t.quantity))), sum(l.amount)
    from spend_ledger l
    left join supply_po_line_items li on l.source = 'purchase' and li.id = l.source_id
    left join supply_transactions t on l.source = 'issue' and t.id = l.source_id
    left join supply_items si on si.id = coalesce(li.supply_item_id, t.supply_item_id)
    left join budget_manual_spend m on l.source = 'manual' and m.id = l.source_id
   where l.organization_id = v_org and l.department = 'dietary' and l.source <> 'shipping'
     and l.spend_date >= v_month and l.spend_date < v_month + interval '1 month'
   group by 1
   order by 4 desc
   limit least(greatest(coalesce(p_limit, 10), 1), 50);
end;
$function$;

revoke all on function public.supply_can_bill(), public.mark_supply_charges_billed(uuid[], boolean, text),
  public.supply_resident_charges(date, date, boolean, uuid), public.supply_leakage(date, uuid),
  public.dietary_cost_report(date, int, uuid), public.dietary_top_items(date, int, uuid)
  from public, anon;
grant execute on function public.supply_can_bill(), public.mark_supply_charges_billed(uuid[], boolean, text),
  public.supply_resident_charges(date, date, boolean, uuid), public.supply_leakage(date, uuid),
  public.dietary_cost_report(date, int, uuid), public.dietary_top_items(date, int, uuid)
  to authenticated;
revoke all on function public.supply_billing_guard() from public, anon, authenticated;
