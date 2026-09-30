-- Access tiers, Phase 3 · Maintenance. Applies ONLY to communities on
-- access_model = 'tiered': every policy here is RESTRICTIVE and passes outright
-- for legacy communities, so it can only narrow access, never widen it.
--
-- Tier lookup: my_access_tier('work_orders') (maintenance department level;
-- org_admin / administrator (NHA) / super_admin pass through here — the NHA's
-- writes are stopped by nha_write_guard with a clear message).
--
-- Deviation from the matrix, agreed in review: a Maintenance *employee* sees
-- jobs assigned to them, jobs they submitted, AND the unassigned open queue (so
-- small buildings without a supervisor handing out work still function) — but
-- never other technicians' assigned jobs.

create or replace function public.my_org_tiered()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce((select o.access_model = 'tiered'
                     from profiles p join organizations o on o.id = p.organization_id
                    where p.id = auth.uid()), false)
$function$;
revoke all on function public.my_org_tiered() from public, anon;
grant execute on function public.my_org_tiered() to authenticated, service_role;

-- ── work_orders ──────────────────────────────────────────────────────────────
drop policy if exists tier_wo_select on work_orders;
create policy tier_wo_select on work_orders as restrictive for select using (
  not (select my_org_tiered())
  or (select my_access_tier('work_orders')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or submitted_by = auth.uid()
  or assigned_to = auth.uid()
  or ((select has_department_access('maintenance', 'employee'))
      and assigned_to is null and status::text not in ('closed', 'cancelled'))
);

-- Employees update their own jobs and may claim an unassigned one (only to themselves)
drop policy if exists tier_wo_update on work_orders;
create policy tier_wo_update on work_orders as restrictive for update
  using (
    not (select my_org_tiered())
    or (select my_access_tier('work_orders')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
    or assigned_to = auth.uid()
    or ((select has_department_access('maintenance', 'employee')) and assigned_to is null)
  )
  with check (
    not (select my_org_tiered())
    or (select my_access_tier('work_orders')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
    or assigned_to = auth.uid()
    or ((select has_department_access('maintenance', 'employee')) and assigned_to is null)
  );

drop policy if exists tier_wo_delete on work_orders;
create policy tier_wo_delete on work_orders as restrictive for delete using (
  not (select my_org_tiered())
  or (select my_access_tier('work_orders')) in ('manager', 'administrator', 'org_admin', 'super_admin')
);

-- Employees can't re-prioritize, re-date, or re-point a job at an asset/vendor —
-- that's the supervisor's call. (Row policies can't see which columns changed.)
create or replace function public.wo_employee_field_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if coalesce(auth.role(), '') <> 'authenticated' or not my_org_tiered()
     or my_access_tier('work_orders') <> 'employee' then
    return new;
  end if;
  if (new.priority, new.due_date, new.category, new.subcategory, new.vendor_name, new.sla_completion_due)
     is distinct from
     (old.priority, old.due_date, old.category, old.subcategory, old.vendor_name, old.sla_completion_due) then
    raise exception 'Priority, due date, category, and vendor are set by a Maintenance Supervisor or Manager.'
      using errcode = '42501', hint = 'tier_employee_fields';
  end if;
  return new;
end;
$function$;
drop trigger if exists trg_wo_employee_field_guard on work_orders;
create trigger trg_wo_employee_field_guard before update on work_orders
  for each row execute function wo_employee_field_guard();

-- ── Work-order children follow the parent's visibility ───────────────────────
-- The EXISTS runs under the caller's RLS, so it inherits tier_wo_select.
drop policy if exists tier_wo_activity_select on wo_activity;
create policy tier_wo_activity_select on wo_activity as restrictive for select
  using (not (select my_org_tiered()) or exists (select 1 from work_orders w where w.id = wo_activity.work_order_id));
drop policy if exists tier_wo_activity_insert on wo_activity;
create policy tier_wo_activity_insert on wo_activity as restrictive for insert
  with check (not (select my_org_tiered()) or exists (select 1 from work_orders w where w.id = wo_activity.work_order_id));

drop policy if exists tier_wo_photos_all on wo_photos;
create policy tier_wo_photos_all on wo_photos as restrictive for all
  using (not (select my_org_tiered()) or exists (select 1 from work_orders w where w.id = wo_photos.work_order_id))
  with check (not (select my_org_tiered()) or exists (select 1 from work_orders w where w.id = wo_photos.work_order_id));

drop policy if exists tier_wo_attach_select on work_order_attachments;
create policy tier_wo_attach_select on work_order_attachments as restrictive for select
  using (not (select my_org_tiered()) or exists (select 1 from work_orders w where w.id = work_order_attachments.work_order_id));
drop policy if exists tier_wo_attach_insert on work_order_attachments;
create policy tier_wo_attach_insert on work_order_attachments as restrictive for insert
  with check (not (select my_org_tiered()) or exists (select 1 from work_orders w where w.id = work_order_attachments.work_order_id));

-- ── Department configuration: Maintenance Manager (and admins) only ──────────
do $$
declare t text;
begin
  foreach t in array array['maintenance_assets', 'wo_sla_rules', 'wo_auto_assign_rules', 'wo_categories',
                           'compliance_categories', 'compliance_checklist_items'] loop
    execute format('drop policy if exists tier_mgr_insert on public.%I', t);
    execute format('drop policy if exists tier_mgr_update on public.%I', t);
    execute format('drop policy if exists tier_mgr_delete on public.%I', t);
    execute format($p$create policy tier_mgr_insert on public.%I as restrictive for insert with check (
      not (select my_org_tiered())
      or (select my_access_tier('work_orders')) in ('manager', 'administrator', 'org_admin', 'super_admin'))$p$, t);
    execute format($p$create policy tier_mgr_update on public.%I as restrictive for update using (
      not (select my_org_tiered())
      or (select my_access_tier('work_orders')) in ('manager', 'administrator', 'org_admin', 'super_admin'))$p$, t);
    execute format($p$create policy tier_mgr_delete on public.%I as restrictive for delete using (
      not (select my_org_tiered())
      or (select my_access_tier('work_orders')) in ('manager', 'administrator', 'org_admin', 'super_admin'))$p$, t);
  end loop;
end $$;

-- PM schedules: the Manager creates/removes them; anyone in Maintenance may update
-- (generating the next job advances last_generated / next_due).
drop policy if exists tier_pm_insert on pm_schedules;
create policy tier_pm_insert on pm_schedules as restrictive for insert with check (
  not (select my_org_tiered())
  or (select my_access_tier('work_orders')) in ('manager', 'administrator', 'org_admin', 'super_admin'));
drop policy if exists tier_pm_update on pm_schedules;
create policy tier_pm_update on pm_schedules as restrictive for update using (
  not (select my_org_tiered())
  or (select my_access_tier('work_orders')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or (select has_department_access('maintenance', 'employee')));
drop policy if exists tier_pm_delete on pm_schedules;
create policy tier_pm_delete on pm_schedules as restrictive for delete using (
  not (select my_org_tiered())
  or (select my_access_tier('work_orders')) in ('manager', 'administrator', 'org_admin', 'super_admin'));

-- Life Safety inspections: performed by the Maintenance department; the NHA
-- signs off (not guarded). Everyone else keeps read access.
do $$
declare t text;
begin
  foreach t in array array['compliance_inspections', 'compliance_inspection_results'] loop
    execute format('drop policy if exists tier_ls_write on public.%I', t);
    execute format('drop policy if exists tier_ls_update on public.%I', t);
    execute format('drop policy if exists tier_ls_delete on public.%I', t);
    execute format($p$create policy tier_ls_write on public.%I as restrictive for insert with check (
      not (select my_org_tiered())
      or (select my_access_tier('work_orders')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
      or (select has_department_access('maintenance', 'employee')))$p$, t);
    execute format($p$create policy tier_ls_update on public.%I as restrictive for update using (
      not (select my_org_tiered())
      or (select my_access_tier('work_orders')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
      or (select has_department_access('maintenance', 'employee')))$p$, t);
    execute format($p$create policy tier_ls_delete on public.%I as restrictive for delete using (
      not (select my_org_tiered())
      or (select my_access_tier('work_orders')) in ('manager', 'administrator', 'org_admin', 'super_admin'))$p$, t);
  end loop;
end $$;
