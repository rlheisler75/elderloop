-- Work orders: "Permission to enter the home". Anyone opening a work order (staff form,
-- resident portal, family portal) can tick it; Maintenance sees it on the work order
-- and as an "OK to enter" badge in the list. Defaults to false, so existing rows and
-- inserts that don't send it are unchanged.
alter table public.work_orders
  add column if not exists permission_to_enter boolean not null default false;

comment on column public.work_orders.permission_to_enter is
  'Maintenance may enter the home if no one is there. Set by whoever opens the work order.';
