-- PointClickCare outbound queue: everything ElderLoop will write into PCC waits
-- here for staff approval (PCC Marketplace agreement, Appendix A: "Every outbound
-- write is started by an authorized staff member, or approved by one before it
-- posts. Each write is tied to that user and logged. ElderLoop never overwrites or
-- deletes existing PCC data.").
--
-- Kinds and who approves them (Robert, 2026-11-16):
--   progress_note   Social Services case notes and discharge plans, posted as PCC
--                   progress notes. Approver: Social Services Supervisor or Manager
--                   (Director), or an Org Admin. A Supervisor+ may approve their own.
--   charge          Utility meter charges, posted as ancillary charges. Approver:
--                   whoever may bill meters (meter_can_bill(): Org Admin or Meters
--                   "costs" permission = the business office).
--   contact_update  A resident's emergency contacts. Approver: Social Services
--                   Supervisor+, the Administrator, or an Org Admin.
--
-- Items are created only through the pcc_queue_* functions, which build the
-- payload server-side from the source records and freeze it, so what was approved
-- is exactly what is sent. Approve / cancel / retry go through pcc_outbound_decide().
-- The send-pcc-outbound Edge Function (service role) moves approved items to
-- sending -> sent | failed; until PCC credentials exist it sends nothing.
-- Nothing here works unless the community has health data on (phi_allowed), a PCC
-- Facility ID, and the resident is linked (residents.pcc_patient_id).

create table if not exists public.pcc_outbound (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  resident_id       uuid references public.residents(id) on delete set null,
  kind              text not null check (kind in ('progress_note', 'charge', 'contact_update')),
  source_table      text not null,
  source_id         uuid,
  source_ids        uuid[],
  source_updated_at timestamptz,
  summary           text not null,
  payload           jsonb not null,
  status            text not null default 'pending'
                    check (status in ('pending', 'approved', 'sending', 'sent', 'failed', 'cancelled')),
  created_by        uuid references public.profiles(id) on delete set null,
  created_by_name   text,
  created_at        timestamptz not null default now(),
  decided_by        uuid references public.profiles(id) on delete set null,
  decided_by_name   text,
  decided_at        timestamptz,
  cancel_reason     text,
  sent_at           timestamptz,
  pcc_ref           text,
  error             text,
  attempts          int not null default 0,
  updated_at        timestamptz not null default now()
);

create index if not exists pcc_outbound_org_status_idx on public.pcc_outbound (organization_id, status, created_at desc);
create index if not exists pcc_outbound_source_idx on public.pcc_outbound (source_table, source_id);
-- A note goes to PCC once; a resident has at most one open contact update.
create unique index if not exists pcc_outbound_one_note
  on public.pcc_outbound (source_table, source_id)
  where kind = 'progress_note' and status in ('pending', 'approved', 'sending', 'sent');
create unique index if not exists pcc_outbound_one_open_contacts
  on public.pcc_outbound (resident_id)
  where kind = 'contact_update' and status in ('pending', 'approved', 'sending');

-- ── Permissions ─────────────────────────────────────────────────
create or replace function public.pcc_can_approve(p_kind text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(case p_kind
    when 'progress_note'  then get_my_role() in ('org_admin', 'super_admin')
                               or my_access_tier('social_services') in ('supervisor', 'manager')
    when 'contact_update' then get_my_role() in ('org_admin', 'ceo', 'super_admin')
                               or my_access_tier('social_services') in ('supervisor', 'manager', 'administrator')
    when 'charge'         then meter_can_bill()
    else false end, false)
$$;

create or replace function public.pcc_can_queue(p_kind text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(case p_kind
    when 'progress_note'  then is_social_services_writer()
    when 'contact_update' then can_see_resident_contacts()
    when 'charge'         then meter_can_bill()
    else false end, false)
$$;

-- What the signed-in person may do, for the screens.
create or replace function public.pcc_my_permissions()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'approve', coalesce((select jsonb_agg(k) from unnest(array['progress_note', 'charge', 'contact_update']) k where pcc_can_approve(k)), '[]'::jsonb),
    'queue',   coalesce((select jsonb_agg(k) from unnest(array['progress_note', 'charge', 'contact_update']) k where pcc_can_queue(k)), '[]'::jsonb))
$$;

-- Internal: community and resident must be ready for PCC. Returns the PCC patient id.
create or replace function public._pcc_ready(p_org uuid, p_resident uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare v_pid text;
begin
  if not public.phi_allowed_for(p_org) then
    raise exception 'Health information isn''t turned on for this community yet.' using errcode = '42501';
  end if;
  if (select nullif(trim(pcc_facility_id), '') from organizations where id = p_org) is null then
    raise exception 'PointClickCare isn''t connected for this community yet (Admin Panel, Org Settings, PCC Facility ID).' using errcode = 'P0001';
  end if;
  if p_resident is null then return null; end if;
  select nullif(trim(pcc_patient_id), '') into v_pid from residents where id = p_resident and organization_id = p_org;
  if v_pid is null then
    raise exception 'This resident isn''t linked to PointClickCare yet. Run Sync Now on Import Residents first.' using errcode = 'P0001';
  end if;
  return v_pid;
end;
$$;
revoke all on function public._pcc_ready(uuid, uuid) from public, anon, authenticated;

create or replace function public._pcc_my_name()
returns text language sql stable security definer set search_path = public as $$
  select nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '') from profiles where id = auth.uid()
$$;
revoke all on function public._pcc_my_name() from public, anon, authenticated;

-- ── Queue: Social Services note -> PCC progress note ───────────
create or replace function public.pcc_queue_note(p_table text, p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb; v_org uuid; v_res uuid; v_pid text; v_text text; v_summary text; v_date date;
  v_author text; v_id uuid; v_updated timestamptz; v_needs text;
begin
  if auth.uid() is null or not mfa_ok() then raise exception 'Not allowed' using errcode = '42501'; end if;

  if p_table = 'ss_case_notes' then
    select to_jsonb(n) into v_row from ss_case_notes n where n.id = p_id;
  elsif p_table = 'ss_discharge_plans' then
    select to_jsonb(d) into v_row from ss_discharge_plans d where d.id = p_id;
  else
    raise exception 'Only case notes and discharge plans can be sent as progress notes.';
  end if;
  if v_row is null then raise exception 'Note not found.'; end if;

  v_org := (v_row->>'organization_id')::uuid;
  v_res := (v_row->>'resident_id')::uuid;
  v_updated := coalesce((v_row->>'updated_at')::timestamptz, (v_row->>'created_at')::timestamptz);
  if v_org is distinct from get_my_org_id() and get_my_role() <> 'super_admin' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if not (is_social_services_writer() and (not my_org_tiered() or ss_can_write_resident(v_res))) then
    raise exception 'You can''t send notes for this resident.' using errcode = '42501';
  end if;
  if coalesce((v_row->>'entered_in_error')::boolean, false) then
    raise exception 'This note was marked entered in error, so it can''t be sent.';
  end if;
  v_pid := public._pcc_ready(v_org, v_res);
  select nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '') into v_author
    from profiles where id = (v_row->>'created_by')::uuid;

  if p_table = 'ss_case_notes' then
    v_date := (v_row->>'contact_date')::date;
    v_text := 'Social Services: ' || initcap(replace(coalesce(v_row->>'contact_type', 'contact'), '_', ' '))
      || coalesce(' (' || (v_row->>'duration_minutes') || ' min)', '')
      || E'\n\n' || coalesce(v_row->>'summary', '')
      || case when coalesce((v_row->>'follow_up_needed')::boolean, false)
              then E'\n\nFollow-up planned' || coalesce(' for ' || to_char((v_row->>'follow_up_date')::date, 'FMMonth FMDD, YYYY'), '') || '.'
              else '' end;
    v_summary := 'Case note · ' || coalesce(to_char(v_date, 'Mon FMDD'), '') || ' · '
      || initcap(replace(coalesce(v_row->>'contact_type', 'contact'), '_', ' '));
  else
    v_date := current_date;
    select string_agg(x, ', ') into v_needs from jsonb_array_elements_text(coalesce(v_row->'post_acute_needs', '[]'::jsonb)) x;
    v_text := array_to_string(array_remove(array[
      'Discharge planning. Status: ' || initcap(replace(coalesce(v_row->>'status', 'planning'), '_', ' ')) || '.',
      'Anticipated discharge: ' || to_char((v_row->>'anticipated_discharge_date')::date, 'FMMonth FMDD, YYYY'),
      'Actual discharge: '      || to_char((v_row->>'actual_discharge_date')::date, 'FMMonth FMDD, YYYY'),
      'Destination: '           || initcap(replace(v_row->>'discharge_destination', '_', ' '))
                                || coalesce(' (' || nullif(v_row->>'discharge_destination_details', '') || ')', ''),
      'Post-acute needs: '      || nullif(v_needs, ''),
      'Barriers: '              || nullif(v_row->>'barriers', ''),
      'Family involvement: '    || nullif(v_row->>'family_involvement', ''),
      'Resources arranged: '    || nullif(v_row->>'resources_arranged', ''),
      'Summary: '               || nullif(v_row->>'discharge_summary', '')
    ], null), E'\n');
    v_summary := 'Discharge plan · ' || initcap(replace(coalesce(v_row->>'status', 'planning'), '_', ' '));
  end if;

  if exists (select 1 from pcc_outbound o where o.source_table = p_table and o.source_id = p_id
              and o.kind = 'progress_note' and o.status in ('pending', 'approved', 'sending', 'sent')) then
    raise exception 'This note is already queued or sent to PointClickCare.';
  end if;

  insert into pcc_outbound (organization_id, resident_id, kind, source_table, source_id, source_updated_at,
                            summary, payload, created_by, created_by_name)
  values (v_org, v_res, 'progress_note', p_table, p_id, v_updated, v_summary,
          jsonb_build_object(
            'pcc_patient_id', v_pid,
            'note_type',      case when p_table = 'ss_case_notes' then 'Social Services' else 'Discharge Planning' end,
            'effective_date', v_date,
            'text',           v_text,
            'author_name',    v_author,
            'source',         case when p_table = 'ss_case_notes' then 'ElderLoop case note' else 'ElderLoop discharge plan' end),
          auth.uid(), public._pcc_my_name())
  returning id into v_id;
  return v_id;
end;
$$;

-- ── Queue: a resident's emergency contacts -> PCC contacts ──────
create or replace function public.pcc_queue_contacts(p_resident uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_pid text; v_contacts jsonb; v_n int; v_primary text; v_id uuid;
begin
  if auth.uid() is null or not mfa_ok() then raise exception 'Not allowed' using errcode = '42501'; end if;
  select organization_id into v_org from residents where id = p_resident;
  if v_org is null then raise exception 'Resident not found.'; end if;
  if v_org is distinct from get_my_org_id() and get_my_role() <> 'super_admin' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if not can_see_resident_contacts() then raise exception 'You can''t send contacts for residents.' using errcode = '42501'; end if;
  v_pid := public._pcc_ready(v_org, p_resident);

  select jsonb_agg(jsonb_build_object('name', c.name, 'relationship', c.relationship, 'phone', c.phone,
                                      'alt_phone', c.alt_phone, 'email', c.email, 'is_primary', c.is_primary)
                   order by c.is_primary desc nulls last, c.sort_order nulls last, c.name),
         count(*), max(c.name) filter (where c.is_primary)
    into v_contacts, v_n, v_primary
    from resident_emergency_contacts c where c.resident_id = p_resident;
  if coalesce(v_n, 0) = 0 then raise exception 'This resident has no emergency contacts to send.'; end if;

  if exists (select 1 from pcc_outbound o where o.resident_id = p_resident and o.kind = 'contact_update'
              and o.status in ('pending', 'approved', 'sending')) then
    raise exception 'This resident''s contacts are already waiting to go to PointClickCare.';
  end if;

  insert into pcc_outbound (organization_id, resident_id, kind, source_table, summary, payload, created_by, created_by_name)
  values (v_org, p_resident, 'contact_update', 'resident_emergency_contacts',
          v_n || ' emergency contact' || case when v_n = 1 then '' else 's' end || coalesce(' · primary ' || v_primary, ''),
          jsonb_build_object('pcc_patient_id', v_pid, 'contacts', v_contacts,
                             'note', 'Adds or updates these contacts in PCC; never deletes contacts in PCC.'),
          auth.uid(), public._pcc_my_name())
  returning id into v_id;
  return v_id;
end;
$$;

-- ── Queue: unbilled meter readings -> PCC ancillary charges (one item per resident) ──
create or replace function public.pcc_queue_charges(p_reading_ids uuid[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := get_my_org_id(); r record; v_pid text; v_queued int := 0; v_unlinked text[] := '{}';
  v_no_resident int := 0; v_skipped int := 0;
begin
  if auth.uid() is null or not mfa_ok() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if not meter_can_bill() then raise exception 'You can''t bill meter charges.' using errcode = '42501'; end if;
  perform public._pcc_ready(v_org, null);

  -- readings of this community, not already billed, not already in an open/sent charge item
  drop table if exists pg_temp._pcc_lines;
  create temp table _pcc_lines on commit drop as
    select mr.id, mr.reading_date, mr.usage, mr.rate_per_unit, mr.estimated_cost,
           m.resident_id, m.meter_number, m.unit, ut.name as utility, ut.unit as usage_unit
      from meter_readings mr
      join meters m on m.id = mr.meter_id
      left join utility_types ut on ut.id = m.utility_type_id
     where mr.id = any(p_reading_ids) and mr.organization_id = v_org and mr.billed_at is null
       and not exists (select 1 from pcc_outbound o where o.kind = 'charge'
                         and o.status in ('pending', 'approved', 'sending', 'sent') and mr.id = any(o.source_ids));
  v_skipped := coalesce(array_length(p_reading_ids, 1), 0) - (select count(*) from _pcc_lines);
  select count(*) into v_no_resident from _pcc_lines where resident_id is null;

  for r in
    select l.resident_id, res.pcc_patient_id, trim(coalesce(res.first_name, '') || ' ' || coalesce(res.last_name, '')) as res_name,
           array_agg(l.id) as ids, sum(coalesce(l.estimated_cost, 0)) as total,
           jsonb_agg(jsonb_build_object('reading_id', l.id, 'reading_date', l.reading_date, 'utility', l.utility,
                       'meter_number', l.meter_number, 'unit', l.unit, 'usage', l.usage, 'usage_unit', l.usage_unit,
                       'rate', l.rate_per_unit, 'amount', l.estimated_cost) order by l.reading_date) as lines,
           string_agg(distinct coalesce(l.utility, 'Utility'), ', ') as utilities
      from _pcc_lines l join residents res on res.id = l.resident_id
     group by l.resident_id, res.pcc_patient_id, res.first_name, res.last_name
  loop
    if nullif(trim(r.pcc_patient_id), '') is null then
      v_unlinked := v_unlinked || r.res_name;
      continue;
    end if;
    insert into pcc_outbound (organization_id, resident_id, kind, source_table, source_ids, summary, payload, created_by, created_by_name)
    values (v_org, r.resident_id, 'charge', 'meter_readings', r.ids,
            r.utilities || ' · $' || to_char(r.total, 'FM999,990.00'),
            jsonb_build_object('pcc_patient_id', r.pcc_patient_id, 'lines', r.lines, 'total', r.total,
                               'description', r.utilities || ' usage'),
            auth.uid(), public._pcc_my_name());
    v_queued := v_queued + 1;
  end loop;

  return jsonb_build_object('queued', v_queued, 'unlinked_residents', to_jsonb(v_unlinked),
                            'no_resident_readings', v_no_resident, 'skipped_readings', v_skipped);
end;
$$;

-- ── Approve / cancel / retry ────────────────────────────────────
create or replace function public.pcc_outbound_decide(p_id uuid, p_decision text, p_reason text default null)
returns text language plpgsql security definer set search_path = public as $$
declare o pcc_outbound%rowtype; v_now_updated timestamptz; v_eie boolean;
begin
  if auth.uid() is null or not mfa_ok() then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into o from pcc_outbound where id = p_id for update;
  if o.id is null then raise exception 'Item not found.'; end if;
  if o.organization_id is distinct from get_my_org_id() and get_my_role() <> 'super_admin' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  if p_decision = 'approve' then
    if o.status <> 'pending' then raise exception 'Only items waiting for approval can be approved.'; end if;
    if not pcc_can_approve(o.kind) then raise exception 'You can''t approve this kind of item.' using errcode = '42501'; end if;
    if o.kind = 'progress_note' then
      if o.source_table = 'ss_case_notes' then
        select coalesce(updated_at, created_at), coalesce(entered_in_error, false) into v_now_updated, v_eie from ss_case_notes where id = o.source_id;
      else
        select coalesce(updated_at, created_at), false into v_now_updated, v_eie from ss_discharge_plans where id = o.source_id;
      end if;
      if v_now_updated is null then raise exception 'The note no longer exists. Cancel this item.'; end if;
      if v_eie then raise exception 'The note was marked entered in error. Cancel this item.'; end if;
      if v_now_updated > o.source_updated_at + interval '1 second' then
        raise exception 'The note was changed after it was queued. Cancel this item and send the note again so PointClickCare gets the current text.';
      end if;
    end if;
    update pcc_outbound set status = 'approved', decided_by = auth.uid(), decided_by_name = public._pcc_my_name(),
           decided_at = now(), updated_at = now() where id = p_id;
    return 'approved';

  elsif p_decision = 'cancel' then
    if o.status not in ('pending', 'approved', 'failed') then raise exception 'This item can''t be cancelled now.'; end if;
    if not (pcc_can_approve(o.kind) or (o.created_by = auth.uid() and o.status = 'pending')) then
      raise exception 'You can''t cancel this item.' using errcode = '42501';
    end if;
    update pcc_outbound set status = 'cancelled', decided_by = auth.uid(), decided_by_name = public._pcc_my_name(),
           decided_at = now(), cancel_reason = nullif(left(trim(coalesce(p_reason, '')), 300), ''), updated_at = now()
     where id = p_id;
    return 'cancelled';

  elsif p_decision = 'retry' then
    if o.status <> 'failed' then raise exception 'Only failed items can be retried.'; end if;
    if not pcc_can_approve(o.kind) then raise exception 'You can''t retry this kind of item.' using errcode = '42501'; end if;
    update pcc_outbound set status = 'approved', error = null, decided_by = auth.uid(), decided_by_name = public._pcc_my_name(),
           decided_at = now(), updated_at = now() where id = p_id;
    return 'approved';
  end if;
  raise exception 'Unknown decision %', p_decision;
end;
$$;

-- ── Row security: reads only; every write goes through the functions above ──
alter table public.pcc_outbound enable row level security;
revoke insert, update, delete on public.pcc_outbound from anon, authenticated;
grant select on public.pcc_outbound to authenticated;

drop policy if exists pcc_outbound_read on public.pcc_outbound;
create policy pcc_outbound_read on public.pcc_outbound for select to authenticated using (
  get_my_role() = 'super_admin'
  or (organization_id = get_my_org_id()
      and (created_by = auth.uid() or pcc_can_approve(kind) or pcc_can_queue(kind))
      and (kind <> 'progress_note' or not (select my_org_tiered()) or ss_can_see_resident(resident_id)))
);
drop policy if exists mfa_gate on public.pcc_outbound;
create policy mfa_gate on public.pcc_outbound as restrictive for all to authenticated
  using ((select mfa_ok())) with check ((select mfa_ok()));
drop policy if exists staff_only_no_portal on public.pcc_outbound;
create policy staff_only_no_portal on public.pcc_outbound as restrictive for all to authenticated
  using (not (select is_portal_user())) with check (not (select is_portal_user()));

drop trigger if exists trg_audit_ephi on public.pcc_outbound;
create trigger trg_audit_ephi after insert or update or delete on public.pcc_outbound
  for each row execute function public.audit_ephi_changes();
drop trigger if exists trg_phi_write_guard on public.pcc_outbound;
create trigger trg_phi_write_guard before insert or update on public.pcc_outbound
  for each row execute function public.phi_write_guard();

revoke all on function public.pcc_queue_note(text, uuid), public.pcc_queue_contacts(uuid),
                       public.pcc_queue_charges(uuid[]), public.pcc_outbound_decide(uuid, text, text),
                       public.pcc_my_permissions(), public.pcc_can_approve(text), public.pcc_can_queue(text)
  from public, anon;
grant execute on function public.pcc_queue_note(text, uuid), public.pcc_queue_contacts(uuid),
                          public.pcc_queue_charges(uuid[]), public.pcc_outbound_decide(uuid, text, text),
                          public.pcc_my_permissions(), public.pcc_can_approve(text), public.pcc_can_queue(text)
  to authenticated;
