-- Grievances: Missouri RSMo 198.088.3 workflow, plus a Social Services access fix.
--
-- RSMo 198.088.3: one full-time staff member is the designee who receives every
-- grievance; a resident raises it within 14 days of the occurrence; within 3 days
-- the designee gives the complainant a written explanation of findings and
-- proposed remedies, with an oral explanation when the resident's condition calls
-- for it; the facility keeps a complete record. Residents never have to use the
-- facility process before complaining to DHSS (198.088.6) or anyone outside the
-- facility (19 CSR 30-88.010(20)).
--
-- grievance_settings holds the designee and the day counts per community. When
-- a community has no row (or a null count) the defaults follow compliance_state:
-- MO = 3-day response, 14-day filing window; elsewhere no fixed deadline.
-- Late filings are only flagged, never refused.

-- ── Access fix ──────────────────────────────────────────────
-- is_social_services_writer() checked only the old account roles, so a staff
-- account holding a Social Services job role (e.g. an SS Supervisor) could not
-- read or write grievances, case notes, goals, and the other ss_* tables. Anyone
-- with Social Services create permission now counts; the tier policies still
-- narrow what each level may do.
create or replace function public.is_social_services_writer()
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from profiles where id = auth.uid()
      and role in ('social_services','supervisor','manager','org_admin','ceo','super_admin')
  ) or coalesce(can('social_services', 'create'), false);
$$;

-- ── Settings ────────────────────────────────────────────────
create table if not exists public.grievance_settings (
  organization_id     uuid primary key references public.organizations(id) on delete cascade,
  designee_id         uuid references public.profiles(id) on delete set null,
  response_days       int check (response_days between 1 and 60),
  filing_window_days  int check (filing_window_days between 1 and 365),
  dhss_phone          text,
  ombudsman_phone     text,
  updated_by          uuid references public.profiles(id) on delete set null,
  updated_at          timestamptz not null default now()
);

alter table public.grievance_settings enable row level security;

-- Every staff member of the community may read it (the File Grievance form says
-- who the designee is); Social Services Managers, the Administrator and Org Admins change it.
create or replace function public.grievance_settings_can_write(p_org uuid)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select coalesce(
    (p_org = get_my_org_id() and (
       get_my_role() in ('org_admin', 'ceo')
       or my_access_tier('social_services') in ('manager', 'administrator', 'org_admin', 'super_admin')))
    or get_my_role() = 'super_admin', false);
$$;

drop policy if exists grievance_settings_read on public.grievance_settings;
create policy grievance_settings_read on public.grievance_settings
  for select to authenticated
  using (organization_id = get_my_org_id() or get_my_role() = 'super_admin');
drop policy if exists grievance_settings_write on public.grievance_settings;
create policy grievance_settings_write on public.grievance_settings
  for all to authenticated
  using ((select grievance_settings_can_write(organization_id)))
  with check ((select grievance_settings_can_write(organization_id)));
drop policy if exists mfa_gate on public.grievance_settings;
create policy mfa_gate on public.grievance_settings
  as restrictive for all to authenticated
  using ((select mfa_ok())) with check ((select mfa_ok()));
drop policy if exists staff_only_no_portal on public.grievance_settings;
create policy staff_only_no_portal on public.grievance_settings
  as restrictive for all to authenticated
  using (not (select is_portal_user())) with check (not (select is_portal_user()));
grant select, insert, update, delete on public.grievance_settings to authenticated;

-- Effective rules for a community (settings row, else state defaults)
create or replace function public.grievance_rules(p_org uuid)
returns table (designee_id uuid, response_days int, filing_window_days int)
language sql stable security definer
set search_path to 'public'
as $$
  select s.designee_id,
         coalesce(s.response_days,      case when o.compliance_state = 'MO' then 3  end),
         coalesce(s.filing_window_days, case when o.compliance_state = 'MO' then 14 end)
    from organizations o
    left join grievance_settings s on s.organization_id = o.id
   where o.id = p_org;
$$;
grant execute on function public.grievance_rules(uuid) to authenticated;

-- ── Grievance columns ───────────────────────────────────────
alter table public.ss_grievances
  add column if not exists incident_date            date,
  add column if not exists received_at              timestamptz,
  add column if not exists written_response_due     timestamptz,
  add column if not exists filed_late               boolean not null default false,
  add column if not exists findings                 text,
  add column if not exists proposed_remedies        text,
  add column if not exists written_response_at      timestamptz,
  add column if not exists written_response_by      uuid references public.profiles(id) on delete set null,
  add column if not exists oral_explanation_needed  boolean not null default false,
  add column if not exists oral_explanation_at      timestamptz,
  add column if not exists outside_rights_given     boolean not null default false;

update public.ss_grievances set received_at = coalesce(filed_at, created_at) where received_at is null;

-- Due date, late-filing flag, designee as default assignee, who gave the response
create or replace function public.ss_grievance_deadlines()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_rules record;
begin
  select * into v_rules from grievance_rules(new.organization_id);
  new.received_at := coalesce(new.received_at, new.filed_at, now());
  new.written_response_due := case when v_rules.response_days is not null
    then new.received_at + make_interval(days => v_rules.response_days) end;
  new.filed_late := v_rules.filing_window_days is not null and new.incident_date is not null
    and new.received_at::date > new.incident_date + v_rules.filing_window_days;
  if tg_op = 'INSERT' and new.assigned_to is null then
    new.assigned_to := v_rules.designee_id;
  end if;
  if new.written_response_at is not null
     and (tg_op = 'INSERT' or old.written_response_at is null) then
    new.written_response_by := coalesce(new.written_response_by, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ss_grievance_deadlines on public.ss_grievances;
create trigger trg_ss_grievance_deadlines before insert or update on public.ss_grievances
  for each row execute function ss_grievance_deadlines();

-- ── Bells (de-identified: number, category and dates only) ──
create table if not exists public.grievance_alerts (
  grievance_id uuid not null references public.ss_grievances(id) on delete cascade,
  kind         text not null,
  created_at   timestamptz not null default now(),
  primary key (grievance_id, kind)
);
alter table public.grievance_alerts enable row level security;
revoke all on public.grievance_alerts from anon, authenticated;
drop policy if exists mfa_gate on public.grievance_alerts;
create policy mfa_gate on public.grievance_alerts
  as restrictive for all to authenticated
  using ((select mfa_ok())) with check ((select mfa_ok()));
drop policy if exists staff_only_no_portal on public.grievance_alerts;
create policy staff_only_no_portal on public.grievance_alerts
  as restrictive for all to authenticated
  using (not (select is_portal_user())) with check (not (select is_portal_user()));

-- p_escalate also bells the Administrator and Org Admins
create or replace function public.grievance_bell(p_g ss_grievances, p_kind text, p_title text, p_body text, p_escalate boolean)
returns void
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_designee uuid;
begin
  insert into grievance_alerts (grievance_id, kind) values (p_g.id, p_kind) on conflict do nothing;
  if not found then return; end if;
  select designee_id into v_designee from grievance_rules(p_g.organization_id);
  insert into push_notifications (org_id, recipient_id, title, body, category, link)
  select distinct p_g.organization_id, x, p_title,
         'Grievance ' || p_g.grievance_number || ' (' || replace(coalesce(p_g.category, 'other'), '_', ' ') || ') - ' || p_body,
         case when p_kind = 'overdue' then 'urgent' else 'general' end,
         '/app/social-services'
    from unnest(array[v_designee, p_g.assigned_to]
                || case when p_escalate then array(select org_approver_ids(p_g.organization_id)) else '{}'::uuid[] end) x
   where x is not null;
end;
$$;

create or replace function public.ss_grievance_notify()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
begin
  perform grievance_bell(new, 'received', 'New grievance received',
    case when new.written_response_due is not null
      then 'written response due ' || to_char(new.written_response_due at time zone 'America/Chicago', 'Mon DD') || '.'
      else 'please review.' end,
    false);
  return new;
end;
$$;

drop trigger if exists trg_ss_grievance_notify on public.ss_grievances;
create trigger trg_ss_grievance_notify after insert on public.ss_grievances
  for each row execute function ss_grievance_notify();

create or replace function public.check_grievance_response_alerts()
returns void
language plpgsql security definer
set search_path to 'public'
as $$
declare
  g ss_grievances;
begin
  for g in select * from ss_grievances
            where coalesce(is_active, true)
              and written_response_at is null
              and written_response_due is not null
              and status not in ('resolved', 'withdrawn') loop
    if now() > g.written_response_due then
      perform grievance_bell(g, 'overdue', 'Grievance response overdue',
        'the written response was due ' || to_char(g.written_response_due at time zone 'America/Chicago', 'Mon DD') || '.', true);
    elsif now() > g.written_response_due - interval '24 hours' then
      perform grievance_bell(g, 'due_soon', 'Grievance response due tomorrow',
        'give the written explanation of findings and proposed remedies.', false);
    end if;
  end loop;
end;
$$;

revoke all on function public.grievance_bell(ss_grievances, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.check_grievance_response_alerts() from public, anon, authenticated;
revoke all on function public.ss_grievance_notify() from public, anon, authenticated;
revoke all on function public.ss_grievance_deadlines() from public, anon, authenticated;

select cron.unschedule('grievance-response-alerts') where exists (select 1 from cron.job where jobname = 'grievance-response-alerts');
select cron.schedule('grievance-response-alerts', '5 * * * *', 'select public.check_grievance_response_alerts()');

-- Existing rows: compute due dates now (the trigger runs on update)
update public.ss_grievances set received_at = received_at;

-- Follow-up (applied as grievance_received_follows_filed): when filed_at moves
-- (e.g. the weekly demo date reset) and received_at was just the filing time,
-- received_at moves with it. See the function body in the database.
