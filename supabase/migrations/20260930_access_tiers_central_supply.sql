-- Access tiers, Phase 3 · Central Supply. RESTRICTIVE policies + guard triggers
-- that only bite when the caller's community is on access_model = 'tiered'.
--
-- Who's who (food purchasing runs through the same tables from Dietary's Order
-- Guide, so the Dietary Manager counts as a supply manager for it):
--   supply staff      = anyone in the Central Supply or Dietary department
--   supply supervisor = Central Supply Supervisor+ (or the Dietary Manager)
--   supply manager    = Central Supply Manager (or the Dietary Manager)
-- org_admin / super_admin pass; the NHA passes the policies so nha_write_guard
-- and supply_po_guard can answer with a clear message.
--
-- Unit costs are hidden from Employees/Supervisors in the screens for now;
-- database-level column masking comes with the budget layer's views.
--
-- Purchase-order approval: an order whose total (lines + shipping) is over
-- organizations.approval_po_threshold can't be submitted until the Administrator
-- (or an Org Admin) approves it. New status: awaiting_approval.

create or replace function public.supply_is_staff()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select has_department_access('central_supply', 'employee') or has_department_access('dietary', 'employee')
      or my_access_tier('central_supply') in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
$function$;
create or replace function public.supply_is_supervisor()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select my_access_tier('central_supply') in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
      or my_access_tier('dietary') = 'manager'
$function$;
create or replace function public.supply_is_manager()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select my_access_tier('central_supply') in ('manager', 'administrator', 'org_admin', 'super_admin')
      or my_access_tier('dietary') = 'manager'
$function$;
revoke all on function public.supply_is_staff(), public.supply_is_supervisor(), public.supply_is_manager() from public, anon;
grant execute on function public.supply_is_staff(), public.supply_is_supervisor(), public.supply_is_manager() to authenticated, service_role;

create or replace function public.po_total(p_po uuid)
returns numeric language sql stable security definer set search_path to 'public' as $function$
  select coalesce((select sum(coalesce(quantity_ordered, 0) * coalesce(unit_cost, 0))
                     from supply_po_line_items where po_id = p_po), 0)
       + coalesce((select shipping_cost from supply_purchase_orders where id = p_po), 0)
$function$;

alter table supply_purchase_orders add column if not exists approved_by uuid references profiles(id);
alter table supply_purchase_orders add column if not exists approved_at timestamptz;

-- ── Items ────────────────────────────────────────────────────────────────────
drop policy if exists tier_si_insert on supply_items;
create policy tier_si_insert on supply_items as restrictive for insert
  with check (not (select my_org_tiered()) or (select supply_is_manager()));
drop policy if exists tier_si_update on supply_items;
create policy tier_si_update on supply_items as restrictive for update
  using (not (select my_org_tiered()) or (select supply_is_staff()));
drop policy if exists tier_si_delete on supply_items;
create policy tier_si_delete on supply_items as restrictive for delete
  using (not (select my_org_tiered()) or (select supply_is_manager()));

-- Below Manager, only stock counts move (issuing, receiving, cash sales); prices,
-- par levels, and vendors are the Manager's.
create or replace function public.supply_item_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if coalesce(auth.role(), '') <> 'authenticated' or not my_org_tiered() or supply_is_manager() then
    return new;
  end if;
  if (to_jsonb(new) - 'quantity_on_hand' - 'updated_at') <> (to_jsonb(old) - 'quantity_on_hand' - 'updated_at') then
    raise exception 'Only a Central Supply Manager can change item details, prices, or par levels.'
      using errcode = '42501', hint = 'tier_supply_item';
  end if;
  return new;
end;
$function$;
drop trigger if exists trg_supply_item_guard on supply_items;
create trigger trg_supply_item_guard before update on supply_items
  for each row execute function supply_item_guard();

-- ── Transactions: a ledger — add rows, never edit or delete them ─────────────
drop policy if exists tier_st_select on supply_transactions;
create policy tier_st_select on supply_transactions as restrictive for select using (
  not (select my_org_tiered()) or (select supply_is_supervisor()) or performed_by = auth.uid());
drop policy if exists tier_st_insert on supply_transactions;
create policy tier_st_insert on supply_transactions as restrictive for insert with check (
  not (select my_org_tiered())
  or (select supply_is_supervisor())
  or ((select supply_is_staff()) and performed_by = auth.uid()));
drop policy if exists tier_st_update on supply_transactions;
create policy tier_st_update on supply_transactions as restrictive for update using (
  not (select my_org_tiered()) or (select get_my_role()) = 'super_admin');
drop policy if exists tier_st_delete on supply_transactions;
create policy tier_st_delete on supply_transactions as restrictive for delete using (
  not (select my_org_tiered()) or (select get_my_role()) = 'super_admin');

-- ── Vendors and resident supply profiles ────────────────────────────────────
drop policy if exists tier_sv_write on supply_vendors;
drop policy if exists tier_sv_insert on supply_vendors;
drop policy if exists tier_sv_update on supply_vendors;
drop policy if exists tier_sv_delete on supply_vendors;
create policy tier_sv_insert on supply_vendors as restrictive for insert
  with check (not (select my_org_tiered()) or (select supply_is_manager()));
create policy tier_sv_update on supply_vendors as restrictive for update
  using (not (select my_org_tiered()) or (select supply_is_manager()));
create policy tier_sv_delete on supply_vendors as restrictive for delete
  using (not (select my_org_tiered()) or (select supply_is_manager()));

drop policy if exists tier_rsp_insert on resident_supply_profiles;
drop policy if exists tier_rsp_update on resident_supply_profiles;
drop policy if exists tier_rsp_delete on resident_supply_profiles;
create policy tier_rsp_insert on resident_supply_profiles as restrictive for insert
  with check (not (select my_org_tiered()) or (select supply_is_supervisor()));
create policy tier_rsp_update on resident_supply_profiles as restrictive for update
  using (not (select my_org_tiered()) or (select supply_is_supervisor()));
create policy tier_rsp_delete on resident_supply_profiles as restrictive for delete
  using (not (select my_org_tiered()) or (select supply_is_supervisor()));

-- ── Purchase orders ──────────────────────────────────────────────────────────
drop policy if exists tier_po_select on supply_purchase_orders;
create policy tier_po_select on supply_purchase_orders as restrictive for select using (
  not (select my_org_tiered()) or (select supply_is_staff()) or ordered_by = auth.uid()
  or (select my_access_tier('central_supply')) in ('administrator', 'org_admin', 'super_admin'));
drop policy if exists tier_po_insert on supply_purchase_orders;
create policy tier_po_insert on supply_purchase_orders as restrictive for insert
  with check (not (select my_org_tiered()) or (select supply_is_manager()));
drop policy if exists tier_po_update on supply_purchase_orders;
create policy tier_po_update on supply_purchase_orders as restrictive for update using (
  not (select my_org_tiered()) or (select supply_is_staff())
  or (select my_access_tier('central_supply')) in ('administrator', 'org_admin', 'super_admin'));
drop policy if exists tier_po_delete on supply_purchase_orders;
create policy tier_po_delete on supply_purchase_orders as restrictive for delete
  using (not (select my_org_tiered()) or ((select supply_is_manager()) and status in ('draft', 'awaiting_approval')));

create or replace function public.supply_po_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  v_role text := get_my_role();
  v_threshold numeric;
  v_total numeric;
  v_nha boolean;
  v_approver boolean;
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

  -- Approval stamp: only the Administrator or an Org Admin, only on an order awaiting approval
  if (new.approved_by, new.approved_at) is distinct from (old.approved_by, old.approved_at) then
    if not v_approver then
      raise exception 'Only the Administrator can approve a purchase order.' using errcode = '42501', hint = 'po_approval';
    end if;
    if new.approved_at is not null and old.status <> 'awaiting_approval' then
      raise exception 'Only an order awaiting approval can be approved.' using errcode = '42501', hint = 'po_approval';
    end if;
  end if;

  -- The NHA approves or sends back; they don't otherwise edit orders
  if v_nha then
    if (to_jsonb(new) - 'approved_by' - 'approved_at' - 'status' - 'updated_at')
       <> (to_jsonb(old) - 'approved_by' - 'approved_at' - 'status' - 'updated_at')
       or not (old.status = 'awaiting_approval' and new.status in ('submitted', 'draft', 'awaiting_approval')) then
      raise exception 'Administrators approve or send back purchase orders but don''t edit them.'
        using errcode = '42501', hint = 'nha_view_only';
    end if;
  end if;

  -- Below Manager (and not an approver): receiving only
  if not supply_is_manager() and not v_approver then
    if (to_jsonb(new) - 'status' - 'received_date' - 'received_by' - 'updated_at')
       <> (to_jsonb(old) - 'status' - 'received_date' - 'received_by' - 'updated_at')
       or (new.status is distinct from old.status and new.status not in ('partially_received', 'received')) then
      raise exception 'Only a Central Supply Manager can change a purchase order. You can record what was received.'
        using errcode = '42501', hint = 'tier_supply_po';
    end if;
  end if;

  -- Submitting: over the threshold needs approval first
  if new.status = 'submitted' and old.status in ('draft', 'awaiting_approval') then
    select approval_po_threshold into v_threshold from organizations where id = new.organization_id;
    v_total := coalesce((select sum(coalesce(quantity_ordered, 0) * coalesce(unit_cost, 0))
                           from supply_po_line_items where po_id = new.id), 0) + coalesce(new.shipping_cost, 0);
    if v_threshold is not null and v_total > v_threshold and new.approved_at is null then
      raise exception 'This order totals $% — over your $% approval limit. Send it to the Administrator for approval.',
        to_char(v_total, 'FM999,999,990.00'), to_char(v_threshold, 'FM999,999,990.00')
        using errcode = '42501', hint = 'po_needs_approval';
    end if;
  end if;

  -- Sent back to draft: any earlier approval no longer counts
  if new.status = 'draft' and old.status <> 'draft' then
    new.approved_by := null; new.approved_at := null;
  end if;
  return new;
end;
$function$;
drop trigger if exists trg_supply_po_guard on supply_purchase_orders;
create trigger trg_supply_po_guard before insert or update on supply_purchase_orders
  for each row execute function supply_po_guard();

-- ── PO lines: follow the order; edited only while it's a draft ──────────────
drop policy if exists tier_pol_select on supply_po_line_items;
create policy tier_pol_select on supply_po_line_items as restrictive for select using (
  not (select my_org_tiered())
  or exists (select 1 from supply_purchase_orders p where p.id = supply_po_line_items.po_id));
drop policy if exists tier_pol_insert on supply_po_line_items;
create policy tier_pol_insert on supply_po_line_items as restrictive for insert
  with check (not (select my_org_tiered()) or (select supply_is_manager()));
drop policy if exists tier_pol_update on supply_po_line_items;
create policy tier_pol_update on supply_po_line_items as restrictive for update
  using (not (select my_org_tiered()) or (select supply_is_staff()));
drop policy if exists tier_pol_delete on supply_po_line_items;
create policy tier_pol_delete on supply_po_line_items as restrictive for delete
  using (not (select my_org_tiered()) or (select supply_is_manager()));

create or replace function public.supply_po_line_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  v_status text;
  v_line   supply_po_line_items := coalesce(new, old);
begin
  if coalesce(auth.role(), '') <> 'authenticated' or not my_org_tiered() or get_my_role() = 'super_admin' then
    return coalesce(new, old);
  end if;
  select status into v_status from supply_purchase_orders where id = v_line.po_id;

  -- Receiving fields may be recorded on any open order by supply staff
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - 'quantity_received' - 'is_received' - 'received_at')
         = (to_jsonb(old) - 'quantity_received' - 'is_received' - 'received_at') then
    return new;
  end if;

  if v_status is distinct from 'draft' then
    raise exception 'Line items can only be changed while the purchase order is a draft.'
      using errcode = '42501', hint = 'tier_supply_po_line';
  end if;
  if not supply_is_manager() then
    raise exception 'Only a Central Supply Manager can change purchase order lines.'
      using errcode = '42501', hint = 'tier_supply_po_line';
  end if;
  return coalesce(new, old);
end;
$function$;
drop trigger if exists trg_supply_po_line_guard on supply_po_line_items;
create trigger trg_supply_po_line_guard before insert or update or delete on supply_po_line_items
  for each row execute function supply_po_line_guard();
