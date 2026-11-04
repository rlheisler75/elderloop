-- Work order import (Maintenance -> Settings -> Import): keep the work order
-- number from the old system when the import supplies one; everything else
-- still gets the next number from the sequence. Only people who manage Work
-- Orders settings (or server code) may supply a number.
create or replace function public.set_wo_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.wo_number is null
     or (coalesce(auth.role(), '') = 'authenticated' and not can('work_orders', 'settings')) then
    new.wo_number := nextval('wo_number_seq');
  end if;
  return new;
end;
$$;

-- The Work Orders list and Reports filter by community and sort by date; an
-- imported history (thousands of rows) needs these.
create index if not exists work_orders_org_created_idx on public.work_orders (organization_id, created_at desc);
create index if not exists work_orders_org_wo_number_idx on public.work_orders (organization_id, wo_number);
