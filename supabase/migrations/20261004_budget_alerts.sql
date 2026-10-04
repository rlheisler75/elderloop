-- Budget layer, Phase 3 · Alerts (design: https://claude.ai/artifact/N3er5vW3dj2RerraUypNvG).
--
-- A daily check (pg_cron 'budget-alerts', 12:00 UTC = early morning US) compares
-- each department's month-to-date spend with its budget and sends each alert once
-- per department per month:
--   pace   projected month-end > 100% (from the 5th, while under 80% spent)  Manager  bell + email
--   pct80  80% spent                                                        Manager  bell
--   pct90  90% spent                                                        Manager  bell + email
--   pct100 100% spent                                                       Manager + Administrator  bell + email
-- A department with no Manager sends its alerts to the Administrator and Org Admins.
-- When spend jumps past several lines at once, only the highest is sent; the lower
-- ones are logged as suppressed so they never fire later in the month.
-- Bells are push_notifications rows (category 'budget', or 'urgent' at 100%). Email
-- goes out through the send-budget-alerts Edge Function (Resend), called right after
-- the check; it claims each alert's email before sending so a retry never doubles it.
--
-- Over budget → every purchase order for that department needs the Administrator's
-- approval, whatever its total (supply_po_guard; tiered communities, like the
-- existing threshold rule). Departments an order charges follow the spend ledger:
-- each line's item budget_department, else the order's department, else Central Supply.
--
-- Corporate sees the alerts on the portfolio overview (corporate_budget_alerts).

create table if not exists budget_alerts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  department       text not null check (department in ('dietary', 'housekeeping', 'central_supply', 'maintenance')),
  month            date not null check (extract(day from month) = 1),
  kind             text not null check (kind in ('pace', 'pct80', 'pct90', 'pct100')),
  budget           numeric(12, 2),
  spent            numeric(12, 2),
  projected        numeric(12, 2),
  pct_used         numeric,
  projected_pct    numeric,
  suppressed       boolean not null default false,
  recipients       uuid[] not null default '{}',
  email_wanted     boolean not null default false,
  email_claimed_at timestamptz,
  emailed_at       timestamptz,
  email_error      text,
  created_at       timestamptz not null default now(),
  unique (organization_id, department, month, kind)
);
alter table budget_alerts enable row level security;
drop policy if exists budget_alerts_read on budget_alerts;
create policy budget_alerts_read on budget_alerts for select to authenticated
  using ((select can_see_budget(organization_id, department)));
-- Written only by check_budget_alerts() and the send-budget-alerts function (service role)

-- Month totals for every budget department, no caller check: internal to the alert
-- check and the purchase-order guard. Same numbers as budget_status().
create or replace function public.budget_month_totals(p_org uuid, p_month date)
returns table (department text, budget numeric, spent numeric)
language sql stable security definer set search_path to 'public' as $function$
  select d.d,
    (select b.amount from budgets b where b.organization_id = p_org and b.department = d.d
        and b.category is null and b.month = date_trunc('month', p_month)::date),
    coalesce((select sum(l.amount) from spend_ledger l where l.organization_id = p_org and l.department = d.d
        and l.spend_date >= date_trunc('month', p_month)::date
        and l.spend_date < date_trunc('month', p_month)::date + interval '1 month'), 0)
  from (values ('dietary'), ('housekeeping'), ('central_supply'), ('maintenance')) d(d)
$function$;
revoke all on function public.budget_month_totals(uuid, date) from public, anon, authenticated;

create or replace function public.budget_money(p numeric)
returns text language sql immutable as $function$
  select '$' || to_char(round(coalesce(p, 0)), 'FM999,999,990')
$function$;

-- The daily check. p_today lets a test replay any day.
create or replace function public.check_budget_alerts(p_today date default null)
returns int language plpgsql security definer set search_path to 'public' as $function$
declare
  v_today date := coalesce(p_today, (now() at time zone 'America/Chicago')::date);
  v_month date := date_trunc('month', v_today)::date;
  v_dim   int  := extract(day from (v_month + interval '1 month' - interval '1 day'))::int;
  v_day   int  := extract(day from v_today)::int;
  v_mname text := to_char(v_month, 'FMMonth');
  o record; t record;
  v_kind text; v_pct numeric; v_proj numeric; v_proj_pct numeric; v_left int;
  v_managers uuid[]; v_recip uuid[]; v_label text; v_title text; v_body text; v_id uuid;
  n int := 0;
begin
  for o in select org.id, org.access_model from organizations org
            where org.is_active is not false and org_has_budgets(org.id) loop
    for t in select * from budget_month_totals(o.id, v_month) x where x.budget > 0 loop
      v_pct      := round(t.spent / t.budget * 100, 1);
      v_proj     := case when v_day < v_dim then t.spent / v_day * v_dim else t.spent end;
      v_proj_pct := round(v_proj / t.budget * 100, 1);
      v_kind := case when v_pct >= 100 then 'pct100' when v_pct >= 90 then 'pct90' when v_pct >= 80 then 'pct80'
                     when v_day >= 5 and v_proj_pct > 100 then 'pace' end;
      continue when v_kind is null;
      continue when exists (select 1 from budget_alerts a where a.organization_id = o.id and a.department = t.department
                              and a.month = v_month and a.kind = v_kind);

      -- Lower lines crossed at the same time: logged, never sent
      insert into budget_alerts (organization_id, department, month, kind, budget, spent, projected, pct_used, projected_pct, suppressed)
      select o.id, t.department, v_month, k, t.budget, t.spent, round(v_proj, 2), v_pct, v_proj_pct, true
        from unnest(case v_kind when 'pct100' then array['pace', 'pct80', 'pct90']
                                when 'pct90'  then array['pace', 'pct80']
                                when 'pct80'  then array['pace'] else array[]::text[] end) k
      on conflict (organization_id, department, month, kind) do nothing;

      v_managers := array(select p.id from staff_department_roles d join profiles p on p.id = d.profile_id
                           where d.department = t.department and d.level = 'manager'
                             and p.organization_id = o.id and p.is_active is not false);
      v_recip := v_managers;
      if v_kind = 'pct100' or cardinality(v_managers) = 0 then
        v_recip := v_recip || array(select p.id from profiles p where p.organization_id = o.id
                                      and p.is_active is not false and p.role::text = 'ceo');
      end if;
      if cardinality(v_managers) = 0 then
        v_recip := v_recip || array(select p.id from profiles p where p.organization_id = o.id
                                      and p.is_active is not false and p.role::text = 'org_admin');
      end if;
      v_recip := array(select distinct unnest(v_recip));

      v_label := initcap(replace(t.department, '_', ' '));
      v_left  := v_dim - v_day;
      if v_kind = 'pace' then
        v_title := v_label || ' is on pace to go over budget';
        v_body  := format('%s spent of %s (%s%%) so far in %s. At this pace the month ends near %s (%s%%). About %s a day for the rest of the month lands on budget.',
                          budget_money(t.spent), budget_money(t.budget), v_pct, v_mname, budget_money(v_proj), round(v_proj_pct),
                          budget_money(greatest(t.budget - t.spent, 0) / greatest(v_left, 1)));
      elsif v_kind in ('pct80', 'pct90') then
        v_title := format('%s has used %s%% of its %s budget', v_label, substr(v_kind, 4), v_mname);
        v_body  := format('%s spent of %s (%s%%), with %s day%s left in the month. %s remains.',
                          budget_money(t.spent), budget_money(t.budget), v_pct, v_left, case when v_left = 1 then '' else 's' end,
                          budget_money(greatest(t.budget - t.spent, 0)));
      else
        v_title := format('%s is over its %s budget', v_label, v_mname);
        v_body  := format('%s spent of %s (%s%%).%s', budget_money(t.spent), budget_money(t.budget), v_pct,
                          case when o.access_model = 'tiered'
                               then format(' New %s purchase orders now need the Administrator''s approval for the rest of %s.', v_label, v_mname)
                               else '' end);
      end if;

      insert into budget_alerts (organization_id, department, month, kind, budget, spent, projected, pct_used, projected_pct,
                                 recipients, email_wanted)
      values (o.id, t.department, v_month, v_kind, t.budget, t.spent, round(v_proj, 2), v_pct, v_proj_pct,
              v_recip, v_kind <> 'pct80')
      returning id into v_id;

      insert into push_notifications (org_id, recipient_id, title, body, category, link)
      select o.id, r, v_title, v_body, case when v_kind = 'pct100' then 'urgent' else 'budget' end, '/app/budgets'
        from unnest(v_recip) r;
      n := n + 1;
    end loop;
  end loop;
  return n;
end;
$function$;
revoke all on function public.check_budget_alerts(date) from public, anon, authenticated;

-- Alerts sent this month for one community (the Budgets page and status cards)
-- are read straight from budget_alerts (RLS: can_see_budget).

-- Corporate: alerts sent this month across the chain (totals only, no names)
create or replace function public.corporate_budget_alerts(p_month date default null, p_corporation uuid default null)
returns table (organization_id uuid, department text, kind text, pct_used numeric, created_at timestamptz)
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_corp  uuid := corporate_scope(p_corporation);
  v_month date := date_trunc('month', coalesce(p_month, (now() at time zone 'America/Chicago')::date))::date;
begin
  return query
  select a.organization_id, a.department, a.kind, a.pct_used, a.created_at
    from budget_alerts a join organizations o on o.id = a.organization_id
   where o.corporation_id = v_corp and a.month = v_month and not a.suppressed
   order by a.created_at;
end;
$function$;
revoke all on function public.corporate_budget_alerts(date, uuid) from public, anon;
grant execute on function public.corporate_budget_alerts(date, uuid) to authenticated;

-- Is this department over its budget this month? (purchase-order guard)
create or replace function public.budget_is_over(p_org uuid, p_department text)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce((select t.budget > 0 and t.spent >= t.budget
                     from budget_month_totals(p_org, (now() at time zone 'America/Chicago')::date) t
                    where t.department = p_department), false)
     and org_has_budgets(p_org)
$function$;
revoke all on function public.budget_is_over(uuid, text) from public, anon, authenticated;

-- supply_po_guard: unchanged except the over-budget block before the threshold check
create or replace function public.supply_po_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  v_role text := get_my_role();
  v_threshold numeric;
  v_total numeric;
  v_nha boolean;
  v_approver boolean;
  v_over text;
begin
  if coalesce(auth.role(), '') <> 'authenticated' or not my_org_tiered() or v_role = 'super_admin' then
    return new;
  end if;
  v_nha      := v_role = 'ceo' and not has_emergency_edit();
  v_approver := v_role in ('ceo', 'org_admin');

  if tg_op = 'INSERT' then
    if v_nha then
      raise exception 'Administrators approve purchase orders; Central Supply or Dietary creates them.'
        using errcode = '42501', hint = 'nha_view_only';
    end if;
    if new.status <> 'draft' then
      raise exception 'Save a new purchase order as a draft first, then submit it.' using errcode = '42501';
    end if;
    if new.approved_by is not null or new.approved_at is not null then
      raise exception 'A new purchase order can''t start out approved.' using errcode = '42501';
    end if;
    return new;
  end if;

  if (new.approved_by, new.approved_at) is distinct from (old.approved_by, old.approved_at) then
    if not v_approver then
      raise exception 'Only the Administrator can approve a purchase order.' using errcode = '42501', hint = 'po_approval';
    end if;
    if new.approved_at is not null and old.status <> 'awaiting_approval' then
      raise exception 'Only an order awaiting approval can be approved.' using errcode = '42501', hint = 'po_approval';
    end if;
  end if;

  if v_nha then
    if (to_jsonb(new) - 'approved_by' - 'approved_at' - 'status' - 'updated_at')
       <> (to_jsonb(old) - 'approved_by' - 'approved_at' - 'status' - 'updated_at')
       or not (old.status = 'awaiting_approval' and new.status in ('submitted', 'draft', 'awaiting_approval')) then
      raise exception 'Administrators approve or send back purchase orders but don''t edit them.'
        using errcode = '42501', hint = 'nha_view_only';
    end if;
  end if;

  if not supply_is_manager() and not v_approver then
    if (to_jsonb(new) - 'status' - 'received_date' - 'received_by' - 'updated_at')
       <> (to_jsonb(old) - 'status' - 'received_date' - 'received_by' - 'updated_at')
       or (new.status is distinct from old.status and new.status not in ('partially_received', 'received')) then
      raise exception 'Only a Central Supply Manager can change a purchase order. You can record what was received.'
        using errcode = '42501', hint = 'tier_supply_po';
    end if;
  end if;

  if new.status = 'submitted' and old.status in ('draft', 'awaiting_approval') and new.approved_at is null then
    -- Over budget: every order charging that department needs approval
    select string_agg(initcap(replace(d, '_', ' ')), ' and ' order by d) into v_over
      from (select distinct coalesce(si.budget_department, new.department, 'central_supply') d
              from supply_po_line_items li left join supply_items si on si.id = li.supply_item_id
             where li.po_id = new.id
            union
            select coalesce(new.department, 'central_supply') where coalesce(new.shipping_cost, 0) > 0) x
     where budget_is_over(new.organization_id, d);
    if v_over is not null then
      raise exception '% has spent its whole budget for this month, so every order now goes to the Administrator for approval.', v_over
        using errcode = '42501', hint = 'po_needs_approval';
    end if;

    select approval_po_threshold into v_threshold from organizations where id = new.organization_id;
    v_total := coalesce((select sum(coalesce(quantity_ordered, 0) * coalesce(unit_cost, 0))
                           from supply_po_line_items where po_id = new.id), 0) + coalesce(new.shipping_cost, 0);
    if v_threshold is not null and v_total > v_threshold then
      raise exception 'This order totals $% — over your $% approval limit. Send it to the Administrator for approval.',
        to_char(v_total, 'FM999,999,990.00'), to_char(v_threshold, 'FM999,999,990.00')
        using errcode = '42501', hint = 'po_needs_approval';
    end if;
  end if;

  if new.status = 'draft' and old.status <> 'draft' then
    new.approved_by := null; new.approved_at := null;
  end if;
  return new;
end;
$function$;

-- ── Daily schedule: check, then email ─────────────────────────────────────────
select cron.unschedule('budget-alerts') where exists (select 1 from cron.job where jobname = 'budget-alerts');
select cron.schedule('budget-alerts', '0 12 * * *', $cron$
  select public.check_budget_alerts();
  select net.http_post(
    url := 'https://zrijcrzlyndnudflhbls.supabase.co/functions/v1/send-budget-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_anon_key'),
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_anon_key')
    ),
    body := '{}'::jsonb
  );
$cron$);
