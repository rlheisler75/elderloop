-- Meter billing. ElderLoop doesn't keep resident accounts: the business office
-- (at Maranatha, Randall in billing) bills utilities elsewhere (GP, PCC) from the
-- Billing Export on the Meters page, then marks the period's readings billed here,
-- like mark_supply_charges_billed for Central Supply.
alter table public.meter_readings
  add column if not exists billed_at timestamptz,
  add column if not exists billed_by uuid references public.profiles(id),
  add column if not exists billing_reference text;

create index if not exists meter_readings_org_date on public.meter_readings (organization_id, reading_date);

-- Who may bill: Org Admins, super admins, and anyone with Meters "costs" (the
-- Maintenance Manager by default). Strict boolean.
create or replace function public.meter_can_bill()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce(get_my_role() in ('org_admin', 'super_admin') or can('meters', 'costs'), false)
$$;

create or replace function public.mark_meter_readings_billed(p_ids uuid[], p_billed boolean default true, p_reference text default null)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare n int;
begin
  if not meter_can_bill() then
    raise exception 'Only an Org Admin or someone with Meters cost access can mark readings billed.'
      using errcode = '42501', hint = 'meter_billing';
  end if;
  update meter_readings r
     set billed_at = case when p_billed then now() end,
         billed_by = case when p_billed then auth.uid() end,
         billing_reference = case when p_billed then nullif(trim(p_reference), '') end
   where r.id = any(p_ids)
     and (r.billed_at is null) = coalesce(p_billed, true)
     and ((get_my_org_id() is not null and r.organization_id = get_my_org_id()) or get_my_role() = 'super_admin');
  get diagnostics n = row_count;
  perform log_audit_event(case when p_billed then 'METER_READINGS_BILLED' else 'METER_READINGS_UNBILLED' end,
    'meter_readings', null, null, jsonb_build_object('count', n, 'reference', p_reference), null);
  return n;
end; $$;

-- Billing stamps change only for billers, and a billed reading's numbers are frozen
-- (unmark it billed first) so a bill already sent can't drift from ElderLoop.
create or replace function public.meter_billing_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if coalesce(auth.role(), '') <> 'authenticated' then return new; end if;
  if tg_op = 'UPDATE' and old.billed_at is not null and new.billed_at is not null
     and (new.reading_value, new.previous_value, new.usage, new.rate_per_unit, new.estimated_cost, new.reading_date, new.meter_id)
         is distinct from (old.reading_value, old.previous_value, old.usage, old.rate_per_unit, old.estimated_cost, old.reading_date, old.meter_id) then
    raise exception 'This reading has been billed. Mark it unbilled before changing it.' using errcode = '42501', hint = 'meter_billed';
  end if;
  if (tg_op = 'INSERT' and (new.billed_at, new.billed_by, new.billing_reference) is not distinct from (null::timestamptz, null::uuid, null::text))
     or (tg_op = 'UPDATE' and (new.billed_at, new.billed_by, new.billing_reference)
                               is not distinct from (old.billed_at, old.billed_by, old.billing_reference)) then
    return new;
  end if;
  if not meter_can_bill() then
    raise exception 'Only an Org Admin or someone with Meters cost access can mark readings billed.'
      using errcode = '42501', hint = 'meter_billing';
  end if;
  return new;
end; $$;

drop trigger if exists trg_meter_billing_guard on public.meter_readings;
create trigger trg_meter_billing_guard before insert or update on public.meter_readings
  for each row execute function public.meter_billing_guard();

grant execute on function public.meter_can_bill() to authenticated;
grant execute on function public.mark_meter_readings_billed(uuid[], boolean, text) to authenticated;
