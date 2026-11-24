-- Meters are either billed to the resident (revenue: the community re-bills the usage,
-- e.g. apartment electric) or a community expense (common areas, buildings). Dashboards
-- show the two separately and Billing Export only lists revenue meters.

alter table public.meters
  add column billing_type text not null default 'expense'
  check (billing_type in ('revenue', 'expense'));
comment on column public.meters.billing_type is
  'revenue = billed to the resident (Billing Export); expense = paid by the community.';

-- Same access as the other meter columns (harmless if the table-level grant already covers it).
grant select, insert, update (billing_type) on public.meters to authenticated;

-- Maranatha bills residents for the electric in their apartments: every meter is revenue.
update public.meters m set billing_type = 'revenue'
  from public.organizations o
 where o.id = m.organization_id and o.name = 'Maranatha Village';
