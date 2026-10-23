-- Bells for the Administrator's approval and state-reporting work.
--   Purchase orders: Awaiting Approval -> the Administrator and Org Admins; approved or
--     sent back -> whoever placed the order.
--   Incidents (42 CFR 483.12): a newly submitted incident -> the Administrator and Org
--     Admins (start the reportability decision); then pg_cron every 10 minutes reminds
--     them while it is undecided after an hour, before the initial report is due, when it
--     is overdue, and before / after the 5-working-day investigation deadline.
-- Bodies are de-identified (report number, type, severity; never a resident's name),
-- because bells can also reach a phone's lock screen.
-- ASCII only in this file: the hosted SQL tool rejects some non-ASCII characters.

create or replace function public.org_approver_ids(p_org uuid)
returns setof uuid language sql stable security definer set search_path to 'public' as $function$
  select id from profiles
   where organization_id = p_org and is_active and role::text in ('ceo', 'org_admin')
$function$;
revoke all on function public.org_approver_ids(uuid) from public, anon, authenticated;

-- Purchase orders
create or replace function public.po_approval_notify()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  v_total numeric;
  v_label text;
begin
  if new.status is not distinct from old.status then return new; end if;
  v_label := 'PO ' || coalesce(new.po_number, '') ||
    coalesce(' - ' || (select name from supply_vendors where id = new.vendor_id), ' - ' || new.vendor_name_free, '');

  if new.status = 'awaiting_approval' then
    select coalesce(sum(quantity_ordered * coalesce(unit_cost, 0)), 0) + coalesce(new.shipping_cost, 0)
      into v_total from supply_po_line_items where po_id = new.id;
    insert into push_notifications (org_id, recipient_id, title, body, category, link)
    select new.organization_id, a, 'Order needs your approval',
           v_label || ' - $' || to_char(v_total, 'FM999,999,990.00'), 'approval', '/app/central-supply'
      from org_approver_ids(new.organization_id) a
     where a is distinct from auth.uid();
  elsif old.status = 'awaiting_approval' and new.ordered_by is not null
        and new.ordered_by is distinct from auth.uid() then
    insert into push_notifications (org_id, recipient_id, title, body, category, link)
    values (new.organization_id, new.ordered_by,
            case when new.status = 'draft' then 'Order sent back' else 'Order approved' end,
            v_label || case when new.status = 'draft' then ' - returned to draft for changes' else ' - sent on' end,
            'approval', '/app/central-supply');
  end if;
  return new;
end;
$function$;
drop trigger if exists trg_po_approval_notify on public.supply_purchase_orders;
create trigger trg_po_approval_notify after update of status on public.supply_purchase_orders
  for each row execute function public.po_approval_notify();

-- Incidents: one row per incident per reminder kind, so each fires once
create table if not exists public.incident_report_alerts (
  incident_id uuid not null references public.incident_reports(id) on delete cascade,
  kind        text not null check (kind in ('submitted', 'undecided', 'initial_soon', 'initial_overdue', 'investigation_soon', 'investigation_overdue')),
  created_at  timestamptz not null default now(),
  primary key (incident_id, kind)
);
alter table public.incident_report_alerts enable row level security;  -- server-side only, no policies

create or replace function public.incident_bell(p_incident public.incident_reports, p_kind text, p_title text, p_body text)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  insert into incident_report_alerts (incident_id, kind) values (p_incident.id, p_kind)
    on conflict do nothing;
  if not found then return; end if;
  insert into push_notifications (org_id, recipient_id, title, body, category, link)
  select p_incident.organization_id, a, p_title,
         'Incident #' || p_incident.report_number || ' (' || replace(p_incident.incident_type::text, '_', ' ')
           || ', ' || p_incident.severity::text || ') - ' || p_body,
         case when p_kind in ('initial_soon', 'initial_overdue', 'investigation_overdue') then 'urgent' else 'incident' end,
         '/app/incidents'
    from org_approver_ids(p_incident.organization_id) a;
end;
$function$;
revoke all on function public.incident_bell(public.incident_reports, text, text, text) from public, anon, authenticated;

create or replace function public.incident_submitted_notify()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status = 'draft') then
    perform incident_bell(new, 'submitted', 'New incident report',
      'decide whether it must be reported to the state (2 hours for abuse or serious injury).');
  end if;
  return new;
end;
$function$;
drop trigger if exists trg_incident_submitted_notify on public.incident_reports;
create trigger trg_incident_submitted_notify after insert or update of status on public.incident_reports
  for each row execute function public.incident_submitted_notify();

-- n weekdays after a date, end of that day (weekends skipped, holidays not), matching
-- addWorkingDays() in IncidentReports.jsx. Dates are taken in UTC, so the reminder can
-- be a few hours early or late against the community's own clock.
create or replace function public.add_working_days(p_start timestamptz, p_days int)
returns timestamptz language plpgsql immutable as $function$
declare d date := (p_start at time zone 'UTC')::date; n int := 0;
begin
  while n < p_days loop
    d := d + 1;
    if extract(isodow from d) < 6 then n := n + 1; end if;
  end loop;
  return (d + time '23:59:59') at time zone 'UTC';
end;
$function$;

create or replace function public.check_incident_report_alerts()
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  r incident_reports;
  v_initial timestamptz;
  v_invest timestamptz;
begin
  for r in select * from incident_reports
            where status in ('submitted', 'under_review') and coalesce(is_active, true) loop
    -- still undecided an hour after it became known (or was filed)
    if r.is_state_reportable is null
       and coalesce(r.allegation_known_at, r.created_at) < now() - interval '1 hour' then
      perform incident_bell(r, 'undecided', 'State reporting not decided',
        'record whether this incident is reportable.');
    end if;

    if r.is_state_reportable and r.allegation_known_at is not null then
      v_initial := r.allegation_known_at
        + case when r.reportable_level = 'two_hour' then interval '2 hours' else interval '24 hours' end;
      if r.state_reported_at is null then
        if now() > v_initial then
          perform incident_bell(r, 'initial_overdue', 'State report overdue',
            'the initial report to the state was due ' || to_char(v_initial at time zone 'UTC', 'Mon DD HH24:MI') || ' UTC.');
        elsif now() > v_initial - (case when r.reportable_level = 'two_hour' then interval '30 minutes' else interval '4 hours' end) then
          perform incident_bell(r, 'initial_soon', 'State report due soon',
            'the initial report to the state is due within ' ||
            case when r.reportable_level = 'two_hour' then '30 minutes.' else '4 hours.' end);
        end if;
      end if;

      v_invest := add_working_days(r.allegation_known_at, 5);
      if r.investigation_reported_at is null then
        if now() > v_invest then
          perform incident_bell(r, 'investigation_overdue', 'Investigation results overdue',
            'the 5-working-day report to the state is past due.');
        elsif now() > v_invest - interval '24 hours' then
          perform incident_bell(r, 'investigation_soon', 'Investigation results due tomorrow',
            'send the 5-working-day investigation results to the state.');
        end if;
      end if;
    end if;
  end loop;
end;
$function$;
revoke all on function public.check_incident_report_alerts() from public, anon, authenticated;

-- Incidents already open when this ships don't get a burst of catch-up bells
insert into public.incident_report_alerts (incident_id, kind)
select i.id, k from public.incident_reports i
 cross join unnest(array['submitted', 'undecided', 'initial_soon', 'initial_overdue', 'investigation_soon', 'investigation_overdue']) k
 where i.status in ('submitted', 'under_review')
on conflict do nothing;

select cron.schedule('incident-state-report-alerts', '*/10 * * * *', $$select public.check_incident_report_alerts()$$);
