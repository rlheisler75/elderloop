-- Customizable checklists for Maintenance work orders (Maranatha, 2026-11-20).
--
-- A community builds checklists in Maintenance -> Settings -> Checklists
-- (e.g. "Generator Inspection", 29 steps from WorxHub). A PM schedule can
-- carry one; every work order it generates gets its own copy of the steps,
-- so editing a checklist later never changes past work orders. A checklist
-- can also be added to any open work order by the Maintenance team.
--
-- Step types: check (check off), pass_fail, number (with a unit such as
-- "Volts" or "F"), text. Every step can also be marked N/A and carry a note.
-- Unanswered steps only warn when the job is closed (Robert's choice).
--
--   wo_checklists              the community's checklists
--   wo_checklist_items         their steps
--   work_order_checklist_items one work order's copy of the steps + answers
--   pm_schedules.checklist_id  the checklist each generated work order gets
--
-- Who:
--   * Checklists and steps: same people as work order categories
--     (wo_categories): Org Admin / Administrator / super admin or a
--     Maintenance Manager, narrowed in tiered communities to Work Orders
--     tier manager+ (the NHA then meets nha_write_guard).
--   * Answers: whoever may update the work order itself (wo_can_work()
--     mirrors tier_wo_update). Steps are only ever created by
--     attach_wo_checklist() and removed (while unanswered) by
--     remove_wo_checklist(); the app has no insert/delete on them.
--   * Reads follow the work order (restrictive exists() on work_orders).

-- ── Checklists ──────────────────────────────────────────────────────────────
create table public.wo_checklists (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (length(btrim(name)) between 1 and 120),
  description     text check (description is null or length(description) <= 1000),
  is_active       boolean not null default true,
  created_by      uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index wo_checklists_org_idx on public.wo_checklists (organization_id);

create table public.wo_checklist_items (
  id              uuid primary key default gen_random_uuid(),
  checklist_id    uuid not null references public.wo_checklists(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sort_order      integer not null default 0,
  label           text not null check (length(btrim(label)) between 1 and 300),
  item_type       text not null default 'check' check (item_type in ('check', 'pass_fail', 'number', 'text')),
  unit            text check (unit is null or length(unit) <= 20),
  created_at      timestamptz not null default now()
);
create index wo_checklist_items_list_idx on public.wo_checklist_items (checklist_id, sort_order);

-- A step always belongs to its checklist's community.
create or replace function public.wo_checklist_item_org()
returns trigger language plpgsql set search_path = public as $$
begin
  select c.organization_id into new.organization_id from wo_checklists c where c.id = new.checklist_id;
  if new.organization_id is null then
    raise exception 'Checklist not found';
  end if;
  return new;
end;
$$;
create trigger trg_wo_checklist_item_org
  before insert or update of checklist_id, organization_id on public.wo_checklist_items
  for each row execute function public.wo_checklist_item_org();

-- ── A work order's copy of the steps, with the answers ─────────────────────
create table public.work_order_checklist_items (
  id              uuid primary key default gen_random_uuid(),
  work_order_id   uuid not null references public.work_orders(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  checklist_id    uuid references public.wo_checklists(id) on delete set null,
  checklist_name  text not null,
  source_item_id  uuid references public.wo_checklist_items(id) on delete set null,
  sort_order      integer not null default 0,
  label           text not null,
  item_type       text not null check (item_type in ('check', 'pass_fail', 'number', 'text')),
  unit            text,
  status          text check (status in ('done', 'pass', 'fail', 'na')),
  value_number    numeric,
  value_text      text check (value_text is null or length(value_text) <= 500),
  note            text check (note is null or length(note) <= 1000),
  answered_by     uuid references public.profiles(id) on delete set null,
  answered_at     timestamptz,
  -- A failed step can open one follow-up work order (button on the step).
  follow_up_work_order_id uuid references public.work_orders(id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint wo_checklist_answer_fits check (
    status is null
    or status = 'na'
    or (item_type = 'check'     and status = 'done')
    or (item_type = 'pass_fail' and status in ('pass', 'fail'))
    or (item_type = 'number'    and status = 'done' and value_number is not null)
    or (item_type = 'text'      and status = 'done' and nullif(btrim(value_text), '') is not null)
  )
);
create index work_order_checklist_items_wo_idx on public.work_order_checklist_items (work_order_id, sort_order);

-- Only the answer, the note and the follow-up link change after a step is
-- copied; who answered and when are stamped here, never taken from the app.
create or replace function public.wo_checklist_answer_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.work_order_id   is distinct from old.work_order_id
     or new.organization_id is distinct from old.organization_id
     -- these two may only be cleared (their checklist or step was deleted)
     or (new.checklist_id   is distinct from old.checklist_id   and new.checklist_id   is not null)
     or new.checklist_name  is distinct from old.checklist_name
     or (new.source_item_id is distinct from old.source_item_id and new.source_item_id is not null)
     or new.sort_order      is distinct from old.sort_order
     or new.label           is distinct from old.label
     or new.item_type       is distinct from old.item_type
     or new.unit            is distinct from old.unit
     or new.created_at      is distinct from old.created_at then
    raise exception 'Only a checklist step''s answer and note can change';
  end if;

  -- Cleared is fine (the follow-up work order was deleted: on delete set null).
  if new.follow_up_work_order_id is distinct from old.follow_up_work_order_id
     and new.follow_up_work_order_id is not null then
    if old.follow_up_work_order_id is not null
       or not exists (select 1 from work_orders w
                       where w.id = new.follow_up_work_order_id and w.organization_id = new.organization_id) then
      raise exception 'This step already has a follow-up work order';
    end if;
  end if;

  if new.status is distinct from old.status
     or new.value_number is distinct from old.value_number
     or new.value_text is distinct from old.value_text then
    new.answered_by := case when new.status is null then null else auth.uid() end;
    new.answered_at := case when new.status is null then null else now() end;
  else
    new.answered_by := old.answered_by;
    new.answered_at := old.answered_at;
  end if;
  return new;
end;
$$;
create trigger trg_wo_checklist_answer_guard
  before update on public.work_order_checklist_items
  for each row execute function public.wo_checklist_answer_guard();

-- ── PM schedules carry a checklist ─────────────────────────────────────────
alter table public.pm_schedules
  add column if not exists checklist_id uuid references public.wo_checklists(id) on delete set null;

-- ── Permission helper ──────────────────────────────────────────────────────
-- May the caller update this work order? Same rule as tier_wo_update on
-- work_orders (plus the community check from org_members_update_wo).
create or replace function public.wo_can_work(p_work_order uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select (w.organization_id = get_my_org_id() or get_my_role() = 'super_admin')
       and (
         not my_org_tiered()
         or my_access_tier('work_orders') in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
         or w.assigned_to = auth.uid()
         or auth.uid() = any (coalesce(w.additional_assignees, '{}'))
         or (has_department_access('maintenance', 'employee') and w.assigned_to is null)
       )
    from work_orders w
    where w.id = p_work_order
  ), false);
$$;
revoke all on function public.wo_can_work(uuid) from public, anon;
grant execute on function public.wo_can_work(uuid) to authenticated;

-- May the caller add or remove a checklist on this work order? Anyone who
-- may update it, plus the whole Maintenance team and Work Orders
-- supervisors (so generating a PM job assigned to someone else still gets
-- its checklist). Server-side callers (the nightly PM job) have no user.
create or replace function public.wo_can_set_checklist(p_work_order uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is null or coalesce((
    select (w.organization_id = get_my_org_id() or get_my_role() = 'super_admin')
       and (
         wo_can_work(w.id)
         or has_department_access('maintenance', 'employee')
         or my_access_tier('work_orders') in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
       )
    from work_orders w
    where w.id = p_work_order
  ), false);
$$;
revoke all on function public.wo_can_set_checklist(uuid) from public, anon;
grant execute on function public.wo_can_set_checklist(uuid) to authenticated;

-- ── Add / remove a checklist on a work order ───────────────────────────────
create or replace function public.attach_wo_checklist(p_work_order uuid, p_checklist uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_org  uuid;
  v_name text;
  v_n    integer;
begin
  select organization_id into v_org from work_orders where id = p_work_order;
  if v_org is null then
    raise exception 'Work order not found';
  end if;
  if not wo_can_set_checklist(p_work_order) then
    raise exception 'You can''t change this work order' using errcode = '42501';
  end if;

  select name into v_name from wo_checklists
   where id = p_checklist and organization_id = v_org and is_active;
  if v_name is null then
    raise exception 'Checklist not found';
  end if;
  if exists (select 1 from work_order_checklist_items where work_order_id = p_work_order) then
    raise exception 'This work order already has a checklist';
  end if;

  insert into work_order_checklist_items
    (work_order_id, organization_id, checklist_id, checklist_name, source_item_id, sort_order, label, item_type, unit)
  select p_work_order, v_org, p_checklist, v_name, i.id,
         row_number() over (order by i.sort_order, i.created_at, i.id),
         i.label, i.item_type, nullif(btrim(i.unit), '')
    from wo_checklist_items i
   where i.checklist_id = p_checklist;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'That checklist has no steps yet';
  end if;

  insert into wo_activity (work_order_id, user_id, action, action_type)
  values (p_work_order, auth.uid(), 'Checklist added: ' || v_name || ' (' || v_n || ' steps)', 'checklist');

  return v_n;
end;
$$;
revoke all on function public.attach_wo_checklist(uuid, uuid) from public, anon;
grant execute on function public.attach_wo_checklist(uuid, uuid) to authenticated;

create or replace function public.remove_wo_checklist(p_work_order uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_name text;
begin
  if not exists (select 1 from work_orders where id = p_work_order) then
    raise exception 'Work order not found';
  end if;
  if not wo_can_set_checklist(p_work_order) then
    raise exception 'You can''t change this work order' using errcode = '42501';
  end if;
  if exists (select 1 from work_order_checklist_items
              where work_order_id = p_work_order
                and (status is not null or nullif(btrim(note), '') is not null)) then
    raise exception 'Steps on this checklist were already answered, so it stays on the work order';
  end if;

  select checklist_name into v_name from work_order_checklist_items where work_order_id = p_work_order limit 1;
  delete from work_order_checklist_items where work_order_id = p_work_order;
  if v_name is not null then
    insert into wo_activity (work_order_id, user_id, action, action_type)
    values (p_work_order, auth.uid(), 'Checklist removed: ' || v_name, 'checklist');
  end if;
end;
$$;
revoke all on function public.remove_wo_checklist(uuid) from public, anon;
grant execute on function public.remove_wo_checklist(uuid) to authenticated;

-- ── PM generation copies the schedule's checklist ──────────────────────────
-- Same as before, plus the checklist step. An inactive or empty checklist is
-- skipped rather than failing the whole PM job.
create or replace function public.generate_pm_work_order(p_schedule_id uuid, p_user uuid default null)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  s     pm_schedules%rowtype;
  v_loc text;
  v_wo  uuid;
  v_next date;
begin
  select * into s from pm_schedules where id = p_schedule_id for update;
  if not found then
    raise exception 'PM schedule not found';
  end if;

  if s.asset_id is not null then
    select location into v_loc from maintenance_assets where id = s.asset_id;
  end if;

  insert into work_orders (
    organization_id, title, description, category, priority, status,
    asset_id, assigned_to, due_date, estimated_hours, submitted_by,
    source, work_type, location_path
  ) values (
    s.organization_id, '[PM] ' || s.title,
    coalesce(nullif(s.description, ''), 'Preventive maintenance task: ' || s.title),
    coalesce(s.category, 'other'), 'normal', 'open',
    s.asset_id, s.assign_to, s.next_due, s.estimated_hours, p_user,
    'staff', 'planned', v_loc
  ) returning id into v_wo;

  insert into wo_activity (work_order_id, user_id, action, action_type)
  values (v_wo, p_user,
          case when p_user is null
               then 'Work order generated automatically from PM schedule: ' || s.title
               else 'Work order generated from PM schedule: ' || s.title end,
          'created');

  if s.checklist_id is not null
     and exists (select 1 from wo_checklists c
                  where c.id = s.checklist_id and c.organization_id = s.organization_id and c.is_active)
     and exists (select 1 from wo_checklist_items i where i.checklist_id = s.checklist_id) then
    perform attach_wo_checklist(v_wo, s.checklist_id);
  end if;

  v_next := pm_next_due(s.next_due, s.frequency_type, s.frequency_days);
  while v_next <= current_date loop
    v_next := pm_next_due(v_next, s.frequency_type, s.frequency_days);
  end loop;

  update pm_schedules
     set last_generated = current_date,
         next_due       = v_next
   where id = s.id;

  return v_wo;
end;
$$;

-- ── Row level security ─────────────────────────────────────────────────────
alter table public.wo_checklists              enable row level security;
alter table public.wo_checklist_items         enable row level security;
alter table public.work_order_checklist_items enable row level security;

revoke all on public.wo_checklists, public.wo_checklist_items, public.work_order_checklist_items from anon;
grant select, insert, update, delete on public.wo_checklists, public.wo_checklist_items to authenticated;
revoke all on public.work_order_checklist_items from authenticated;
grant select, update on public.work_order_checklist_items to authenticated;

-- Checklists and their steps: read by the community, managed like categories.
do $$
declare t text;
begin
  foreach t in array array['wo_checklists', 'wo_checklist_items'] loop
    execute format($p$
      create policy %1$s_select on public.%1$I for select to authenticated
        using (organization_id = get_my_org_id() or get_my_role() = 'super_admin');
      create policy %1$s_insert on public.%1$I for insert to authenticated
        with check ((organization_id = get_my_org_id() and (get_my_role() = any (array['org_admin','ceo','super_admin']) or has_department_access('maintenance','manager')))
                    or get_my_role() = 'super_admin');
      create policy %1$s_update on public.%1$I for update to authenticated
        using ((organization_id = get_my_org_id() and (get_my_role() = any (array['org_admin','ceo','super_admin']) or has_department_access('maintenance','manager')))
               or get_my_role() = 'super_admin')
        with check ((organization_id = get_my_org_id() and (get_my_role() = any (array['org_admin','ceo','super_admin']) or has_department_access('maintenance','manager')))
                    or get_my_role() = 'super_admin');
      create policy %1$s_delete on public.%1$I for delete to authenticated
        using ((organization_id = get_my_org_id() and (get_my_role() = any (array['org_admin','ceo','super_admin']) or has_department_access('maintenance','manager')))
               or get_my_role() = 'super_admin');
      create policy tier_mgr_insert on public.%1$I as restrictive for insert to authenticated
        with check (not (select my_org_tiered()) or (select my_access_tier('work_orders')) = any (array['manager','administrator','org_admin','super_admin']));
      create policy tier_mgr_update on public.%1$I as restrictive for update to authenticated
        using (not (select my_org_tiered()) or (select my_access_tier('work_orders')) = any (array['manager','administrator','org_admin','super_admin']));
      create policy tier_mgr_delete on public.%1$I as restrictive for delete to authenticated
        using (not (select my_org_tiered()) or (select my_access_tier('work_orders')) = any (array['manager','administrator','org_admin','super_admin']));
    $p$, t);
  end loop;
end $$;

-- A work order's steps: read with the work order, answered by whoever may update it.
create policy work_order_checklist_items_select on public.work_order_checklist_items
  for select to authenticated
  using (organization_id = get_my_org_id() or get_my_role() = 'super_admin');
create policy work_order_checklist_items_follow_wo on public.work_order_checklist_items
  as restrictive for select to authenticated
  using (exists (select 1 from public.work_orders w where w.id = work_order_checklist_items.work_order_id));
create policy work_order_checklist_items_update on public.work_order_checklist_items
  for update to authenticated
  using (organization_id = get_my_org_id() or get_my_role() = 'super_admin')
  with check (organization_id = get_my_org_id() or get_my_role() = 'super_admin');
create policy work_order_checklist_items_can_work on public.work_order_checklist_items
  as restrictive for update to authenticated
  using ((select wo_can_work(work_order_checklist_items.work_order_id)))
  with check ((select wo_can_work(work_order_checklist_items.work_order_id)));

-- Same standard gates and guards as every Maintenance table.
do $$
declare t text;
begin
  foreach t in array array['wo_checklists', 'wo_checklist_items', 'work_order_checklist_items'] loop
    execute format('create policy staff_only_no_portal on public.%I as restrictive for all to authenticated
                      using (not (select is_portal_user())) with check (not (select is_portal_user()))', t);
    execute format('create policy mfa_gate on public.%I as restrictive for all to authenticated
                      using ((select mfa_ok())) with check ((select mfa_ok()))', t);
    execute format('create trigger trg_nha_write_guard before insert or update or delete on public.%I
                      for each row execute function nha_write_guard(''records'')', t);
    execute format('create trigger trg_role_view_only before insert or update or delete on public.%I
                      for each row execute function role_view_only_guard(''work_orders'')', t);
  end loop;
end $$;
