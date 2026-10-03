-- Budget layer: permission checks must be strictly true/false. A caller with no
-- corporation (or no community) made the corporation comparisons NULL, and
-- "if not NULL" doesn't raise, so in testing an NHA and a department Manager could
-- set a chain community's budget. Caught by the rolled-back test before any screen
-- used these functions.
create or replace function public.can_see_budget(p_org uuid, p_department text)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce(
    get_my_role() = 'super_admin'
    or (my_corporation_id() is not null
        and my_corporation_id() = (select corporation_id from organizations where id = p_org))
    or (get_my_org_id() is not null and p_org = get_my_org_id() and (
          get_my_role() in ('org_admin', 'ceo')
          or exists (select 1 from staff_department_roles d
                      where d.profile_id = auth.uid() and d.department = p_department and d.level = 'manager'))),
    false)
$function$;

create or replace function public.can_set_budget(p_org uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce(
    get_my_role() = 'super_admin'
    or (select case when o.corporation_id is not null
                    then my_corporation_id() is not null and o.corporation_id = my_corporation_id()
                    else get_my_org_id() is not null and p_org = get_my_org_id() and get_my_role() in ('org_admin', 'ceo') end
          from organizations o where o.id = p_org),
    false)
$function$;

create or replace function public.decide_budget_change(p_request uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare r budget_change_requests;
begin
  select * into r from budget_change_requests where id = p_request for update;
  if r.id is null then raise exception 'Request not found' using errcode = '22023'; end if;
  if not coalesce(get_my_role() = 'super_admin'
          or (my_corporation_id() is not null
              and (select corporation_id from organizations where id = r.organization_id) = my_corporation_id()), false) then
    raise exception 'Only the corporate office decides budget requests' using errcode = '42501';
  end if;
  if r.status <> 'pending' then raise exception 'This request was already %', r.status using errcode = '22023'; end if;
  update budget_change_requests
     set status = case when p_approve then 'approved' else 'declined' end,
         decided_by = auth.uid(), decided_at = now(), decision_note = nullif(trim(p_note), '')
   where id = r.id;
  if p_approve then
    insert into budgets (organization_id, department, category, month, amount, set_by, set_at)
    values (r.organization_id, r.department, null, r.month, r.requested_amount, auth.uid(), now())
    on conflict (organization_id, department, coalesce(category, ''), month) do update
      set amount = excluded.amount, set_by = excluded.set_by, set_at = excluded.set_at;
  end if;
  perform log_audit_event(case when p_approve then 'BUDGET_REQUEST_APPROVED' else 'BUDGET_REQUEST_DECLINED' end,
    'budget_change_requests', r.id::text, null, jsonb_build_object('note', p_note), null);
end;
$function$;

create or replace function public.request_budget_change(p_department text, p_month date, p_amount numeric, p_reason text)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare v_org uuid := get_my_org_id(); v_id uuid; v_month date := date_trunc('month', p_month)::date;
begin
  if v_org is null or coalesce(get_my_role(), '') not in ('ceo', 'org_admin') then
    raise exception 'Only the Administrator or an Org Admin can request a budget change' using errcode = '42501';
  end if;
  if (select corporation_id from organizations where id = v_org) is null then
    raise exception 'Your community sets its own budgets; change it directly' using errcode = '22023';
  end if;
  if p_department not in ('dietary', 'housekeeping', 'central_supply', 'maintenance') then
    raise exception 'Unknown budget department %', p_department using errcode = '22023';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 10 then
    raise exception 'Give a reason (at least 10 characters)' using errcode = '22023';
  end if;
  insert into budget_change_requests (organization_id, department, month, current_amount, requested_amount, reason, requested_by)
  values (v_org, p_department, v_month,
          (select amount from budgets where organization_id = v_org and department = p_department and category is null and month = v_month),
          round(p_amount, 2), trim(p_reason), auth.uid())
  returning id into v_id;
  return v_id;
end;
$function$;

create or replace function public.correct_census(p_date date, p_residents int, p_rooms int, p_note text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_org uuid := get_my_org_id();
begin
  if v_org is null or coalesce(get_my_role(), '') not in ('ceo', 'org_admin', 'super_admin') then
    raise exception 'Only the Administrator or an Org Admin can correct the census' using errcode = '42501';
  end if;
  if p_date > (now() at time zone 'America/Chicago')::date then
    raise exception 'The census can''t be recorded for a future date' using errcode = '22023';
  end if;
  if p_residents < 0 or p_rooms < 0 then
    raise exception 'Counts can''t be negative' using errcode = '22023';
  end if;
  insert into census_daily (organization_id, census_date, resident_count, occupied_rooms, source, corrected_by, corrected_at, note)
  values (v_org, p_date, p_residents, p_rooms, 'corrected', auth.uid(), now(), nullif(trim(p_note), ''))
  on conflict (organization_id, census_date) do update
    set resident_count = excluded.resident_count, occupied_rooms = excluded.occupied_rooms, source = 'corrected',
        corrected_by = auth.uid(), corrected_at = now(), note = excluded.note;
  perform log_audit_event('CENSUS_CORRECTED', 'census_daily', p_date::text, null,
    jsonb_build_object('residents', p_residents, 'rooms', p_rooms, 'note', p_note), null);
end;
$function$;
