-- Automatic PM work order generation.
-- generate_pm_work_order() creates one work order from a schedule and steps
-- next_due forward by the schedule's own interval (calendar months/years, so a
-- "1st of the month" schedule stays on the 1st). Missed cycles are skipped so a
-- long-idle schedule produces one work order, not a backlog.
-- generate_due_pm_work_orders() runs daily from pg_cron for every active
-- schedule whose next_due minus advance_days has arrived (demo orgs skipped).

create or replace function public.pm_next_due(p_due date, p_type text, p_days int)
returns date
language sql
immutable
as $$
  select case p_type
    when 'weekly'    then p_due + 7
    when 'monthly'   then (p_due + interval '1 month')::date
    when 'quarterly' then (p_due + interval '3 months')::date
    when 'annual'    then (p_due + interval '1 year')::date
    else p_due + greatest(coalesce(p_days, 30), 1)
  end
$$;

-- Security invoker: from the app this runs as the signed-in user, so RLS on
-- work_orders / pm_schedules still applies. From cron it runs as postgres.
create or replace function public.generate_pm_work_order(p_schedule_id uuid, p_user uuid default null)
returns uuid
language plpgsql
set search_path to 'public'
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

grant execute on function public.generate_pm_work_order(uuid, uuid) to authenticated;

create or replace function public.generate_due_pm_work_orders()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select p.id
      from pm_schedules p
      join organizations o on o.id = p.organization_id
     where p.is_active
       and not coalesce(o.is_demo, false)
       and p.next_due - coalesce(p.advance_days, 7) <= current_date
     for update of p skip locked
  loop
    begin
      perform generate_pm_work_order(r.id, null);
      n := n + 1;
    exception when others then
      raise warning 'PM auto-generate failed for schedule %: %', r.id, sqlerrm;
    end;
  end loop;
  return n;
end;
$$;

revoke execute on function public.generate_due_pm_work_orders() from public, anon, authenticated;

-- 11:00 UTC = 5-6 AM Central, before the maintenance shift starts.
select cron.unschedule('pm-auto-generate') where exists (select 1 from cron.job where jobname = 'pm-auto-generate');
select cron.schedule('pm-auto-generate', '0 11 * * *', 'select public.generate_due_pm_work_orders()');
