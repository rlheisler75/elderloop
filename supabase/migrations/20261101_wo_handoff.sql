-- Maintenance handoff. In tiered communities a Maintenance technician (employee
-- level) now sees every work order, not just their own plus the unassigned queue,
-- and can pass a job assigned to them to another Maintenance staff member with a
-- note. The new assignee and the Maintenance Supervisors/Managers get a bell.
-- Triage (priority, due date, category, vendor) stays Supervisor+
-- (wo_employee_field_guard), and technicians still can't update or reassign
-- other people's jobs: tier_wo_update is unchanged and the handoff goes through
-- handoff_work_order(), which only the assigned technician may call.
--
-- "Maintenance staff" = Work Orders 'edit' permission (module_access_thresholds
-- member_action); "Supervisor+" = 'approve' (supervisor_action). Platform roles
-- (org_admin, ceo, super_admin) pass can_user() for everything, so they're left
-- out of the handoff list and the bell.

-- ── 1. Read: any Maintenance member sees every work order ────────────────────
-- Children (wo_activity, wo_photos, work_order_attachments) follow the parent's
-- visibility, so technicians can also read and comment on each other's jobs.
drop policy if exists tier_wo_select on work_orders;
create policy tier_wo_select on work_orders as restrictive for select using (
  not (select my_org_tiered())
  or (select my_access_tier('work_orders')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or submitted_by = auth.uid()
  or assigned_to = auth.uid()
  or (select has_department_access('maintenance', 'employee'))
);

-- ── 2. Who a job can be handed to ────────────────────────────────────────────
create or replace function public.wo_handoff_targets()
returns table (id uuid, first_name text, last_name text, is_supervisor boolean)
language sql stable security definer set search_path to 'public' as $function$
  select p.id, p.first_name, p.last_name, can_user(p.id, 'work_orders', 'approve')
    from profiles p
   where p.organization_id = get_my_org_id()
     and p.is_active
     and p.id <> auth.uid()
     and p.role::text not in ('org_admin', 'ceo', 'super_admin', 'corporate', 'family', 'resident', 'sales_rep')
     and can_user(p.id, 'work_orders', 'edit')
   order by p.first_name, p.last_name
$function$;
revoke all on function public.wo_handoff_targets() from public, anon;
grant execute on function public.wo_handoff_targets() to authenticated, service_role;

-- ── 3. The handoff ───────────────────────────────────────────────────────────
create or replace function public.handoff_work_order(p_work_order uuid, p_to uuid, p_note text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_wo   work_orders;
  v_from text;
  v_to   text;
  v_note text := btrim(coalesce(p_note, ''));
  v_job  text;
begin
  select * into v_wo from work_orders
   where id = p_work_order and organization_id = get_my_org_id()
   for update;
  if not found then
    raise exception 'Work order not found.' using errcode = 'P0002';
  end if;
  if v_wo.assigned_to is distinct from auth.uid() then
    raise exception 'Only the technician assigned to this job can hand it off. Ask a Maintenance Supervisor to reassign it.'
      using errcode = '42501', hint = 'wo_handoff_not_assignee';
  end if;
  if v_wo.status::text in ('closed', 'cancelled') then
    raise exception 'Closed or cancelled jobs can''t be handed off.' using errcode = '22023';
  end if;
  if p_to is null or p_to = auth.uid() then
    raise exception 'Pick someone else to take the job.' using errcode = '22023';
  end if;
  if length(v_note) < 3 then
    raise exception 'Add a short note for the next technician.' using errcode = '22023', hint = 'wo_handoff_note';
  end if;
  if not exists (select 1 from wo_handoff_targets() t where t.id = p_to) then
    raise exception 'Pick someone in the Maintenance department.' using errcode = '22023';
  end if;

  select first_name || ' ' || last_name into v_from from profiles where id = auth.uid();
  select first_name || ' ' || last_name into v_to   from profiles where id = p_to;

  -- A job that was underway goes back to Assigned until the new tech starts it
  update work_orders
     set assigned_to = p_to,
         status = case when status::text in ('open', 'in_progress') then 'assigned' else status end,
         updated_at = now()
   where id = v_wo.id;

  insert into wo_activity (work_order_id, user_id, action, note, action_type)
  values (v_wo.id, auth.uid(), 'Handed off from ' || v_from || ' to ' || v_to, v_note, 'assigned');

  -- Bells name the job, never the resident
  v_job := coalesce('#' || v_wo.wo_number || ' ', '') || v_wo.title;
  insert into push_notifications (org_id, recipient_id, title, body, category, link)
  values (v_wo.organization_id, p_to, 'Work order handed to you',
          v_job || ' - from ' || v_from || ': ' || v_note, 'maintenance', '/app/maintenance');

  insert into push_notifications (org_id, recipient_id, title, body, category, link)
  select v_wo.organization_id, t.id, 'Work order handed off',
         v_job || ' - ' || v_from || ' to ' || v_to || ': ' || v_note, 'maintenance', '/app/maintenance'
    from wo_handoff_targets() t
   where t.is_supervisor and t.id <> p_to;
end;
$function$;
revoke all on function public.handoff_work_order(uuid, uuid, text) from public, anon;
grant execute on function public.handoff_work_order(uuid, uuid, text) to authenticated, service_role;
