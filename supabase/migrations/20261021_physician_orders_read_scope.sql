-- Physician diet orders are read only by the people who act on them (tiered
-- communities): Dietary Supervisor+ (apply orders to diet profiles), anyone in
-- Nursing (logs them) or Social Services (discharge planning), the Administrator,
-- Org Admins, super admins. Dietary employees (aides) and other departments no
-- longer see them; the resulting diet / texture / liquids / allergies stay on the
-- resident's diet profile for everyone, as before.
-- Previously any staff member in the community could read every order.
drop policy if exists pdo_read_scope on public.physician_diet_orders;
create policy pdo_read_scope on public.physician_diet_orders
  as restrictive for select to authenticated
  using (
    not (select my_org_tiered())
    or (select t_at_least('dietary', 'supervisor'))
    or (select has_department_access('nursing', 'employee'))
    or (select has_department_access('social_services', 'employee'))
  );

-- Every community runs on tiered access from now on (new signups included).
alter table public.organizations alter column access_model set default 'tiered';
