-- Central Supply access, 2026-11-11:
--  1. Central Supply Employees and Supervisors get full access, the same as the
--     Central Supply Manager (items, prices, vendors, purchase orders, costs,
--     resident charges). Their job roles get the Manager's permissions, which also
--     makes my_access_tier('central_supply') = 'manager' for them, so every
--     supply_is_* helper and supply screen treats them as managers.
--  2. Everyone else on staff (employees, supervisors, managers of any department)
--     may scan supplies out to their own department or to a resident, and nothing
--     else in Central Supply. All issues go through supply_issue() (security
--     definer): it checks the department, updates stock, and records the issue
--     with the item's cost and sale price at that moment.

-- 1. Job roles ---------------------------------------------------------------
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.job_role_default_permissions()'::regprocedure);
  n := replace(d,
    $q$('department', 'central_supply', 'employee',   'central_supply', array['view', 'create'])$q$,
    $q$('department', 'central_supply', 'employee',   'central_supply', array['view', 'create', 'edit', 'delete', 'settings', 'costs'])$q$);
  n := replace(n,
    $q$('department', 'central_supply', 'supervisor', 'central_supply', array['view', 'create'])$q$,
    $q$('department', 'central_supply', 'supervisor', 'central_supply', array['view', 'create', 'edit', 'delete', 'settings', 'costs'])$q$);
  if n = d or n not like '%''supervisor'', ''central_supply'', array[''view'', ''create'', ''edit''%' then
    raise exception 'job_role_default_permissions() did not match';
  end if;
  execute n;
end $$;

insert into job_role_permissions (job_role_id, module_key, action)
select r.id, 'central_supply', a
  from job_roles r cross join unnest(array['edit', 'delete', 'settings', 'costs']) a
 where r.source = 'department' and r.department = 'central_supply' and r.level in ('employee', 'supervisor')
on conflict do nothing;

-- 2. Scan out ----------------------------------------------------------------
-- The label a department is recorded under (supply_transactions.department)
create or replace function public.org_department_label(p_org uuid, p_key text)
returns text language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select d->>'label' from organizations o, jsonb_array_elements(o.departments) d
      where o.id = p_org and d->>'key' = p_key limit 1),
    case when length(p_key) <= 2 then upper(p_key) else initcap(replace(p_key, '_', ' ')) end)
$$;

-- Departments the caller belongs to (staff_department_roles + profiles.department)
create or replace function public.my_department_keys()
returns setof text language sql stable security definer set search_path = public
as $$
  select department from staff_department_roles where profile_id = auth.uid()
  union
  select department from profiles where id = auth.uid() and department is not null
$$;

create or replace function public.supply_issue(
  p_lines jsonb, p_department text default null, p_resident uuid default null, p_notes text default null)
returns integer language plpgsql security definer set search_path = public
as $$
declare
  v_org uuid := get_my_org_id();
  v_full boolean;
  l jsonb;
  v_item supply_items%rowtype;
  v_qty numeric;
  v_after numeric;
  n integer := 0;
begin
  if auth.uid() is null or v_org is null or is_portal_user() or not (select mfa_ok())
     or get_my_role() in ('family', 'resident', 'sales_rep', 'corporate') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if (p_department is null) = (p_resident is null) then
    raise exception 'Pick a department or a resident.' using errcode = '22023';
  end if;
  if not exists (select 1 from organization_modules
                  where organization_id = v_org and module_key = 'central_supply' and is_enabled is not false) then
    raise exception 'Central Supply is not turned on for this community.' using errcode = '42501';
  end if;

  -- Central Supply staff (and, as before, Dietary staff and administrators) issue
  -- anywhere; everyone else only to their own departments
  v_full := not my_org_tiered() or supply_is_staff();
  if p_department is not null and not v_full and not exists (
       select 1 from my_department_keys() k where org_department_label(v_org, k) = p_department) then
    raise exception 'You can scan supplies out only to your own department.'
      using errcode = '42501', hint = 'supply_own_department';
  end if;
  if p_resident is not null and not exists (
       select 1 from residents where id = p_resident and organization_id = v_org and is_active) then
    raise exception 'Resident not found.' using errcode = '22023';
  end if;

  -- role_view_only_guard lets this function's writes through (see below)
  perform set_config('elderloop.supply_issue', 'on', true);

  for l in select * from jsonb_array_elements(p_lines) loop
    v_qty := nullif(l->>'quantity', '')::numeric;
    continue when v_qty is null or v_qty <= 0;
    select * into v_item from supply_items
     where id = (l->>'supply_item_id')::uuid and organization_id = v_org and is_active
       for update;
    if not found then raise exception 'Item not found.' using errcode = '22023'; end if;
    if p_resident is not null and not v_item.is_resident_chargeable then
      raise exception '% can''t be charged to a resident.', v_item.name using errcode = '22023';
    end if;
    v_after := greatest(0, coalesce(v_item.quantity_on_hand, 0) - v_qty);
    update supply_items set quantity_on_hand = v_after where id = v_item.id;
    insert into supply_transactions (organization_id, supply_item_id, transaction_type, quantity,
      quantity_before, quantity_after, department, resident_id, performed_by, unit_cost, sale_price, notes)
    values (v_org, v_item.id,
      case when p_resident is null then 'issue_dept' else 'issue_resident' end::supply_transaction_type,
      -v_qty, coalesce(v_item.quantity_on_hand, 0), v_after, p_department, p_resident, auth.uid(),
      v_item.cost_per_unit, v_item.sale_price, nullif(btrim(p_notes), ''));
    n := n + 1;
  end loop;

  perform set_config('elderloop.supply_issue', '', true);
  return n;
end;
$$;

revoke all on function public.supply_issue(jsonb, text, uuid, text) from public, anon;
grant execute on function public.supply_issue(jsonb, text, uuid, text) to authenticated;
revoke all on function public.my_department_keys() from public, anon;
grant execute on function public.my_department_keys() to authenticated;
revoke all on function public.org_department_label(uuid, text) from public, anon;
grant execute on function public.org_department_label(uuid, text) to authenticated;

-- People with no Central Supply permission would be stopped by the view-only
-- guard on supply_items / supply_transactions; supply_issue() sets a
-- transaction-local flag that lets its own writes through. Clients can't set it:
-- set_config isn't exposed through the API.
create or replace function public.role_view_only_guard()
returns trigger language plpgsql security definer set search_path = public
as $$
declare m text := tg_argv[0];
begin
  if coalesce(auth.role(), '') <> 'authenticated' then return coalesce(new, old); end if;
  if is_portal_user() then return coalesce(new, old); end if;
  if m = 'central_supply' and current_setting('elderloop.supply_issue', true) = 'on' then return coalesce(new, old); end if;
  if tg_nargs > 1 and tg_argv[1] = 'requests' and tg_op = 'INSERT' then return new; end if;
  if tg_nargs > 1 and tg_argv[1] = 'maintenance' and il_maintenance_access() then return coalesce(new, old); end if;
  if not (can(m, 'create') or can(m, 'edit') or can(m, 'approve') or can(m, 'delete') or can(m, 'settings') or can(m, 'costs')) then
    raise exception 'You have view-only access to this module. Ask your Org Admin if you need to make changes.'
      using errcode = '42501', hint = 'role_view_only';
  end if;
  return coalesce(new, old);
end;
$$;
