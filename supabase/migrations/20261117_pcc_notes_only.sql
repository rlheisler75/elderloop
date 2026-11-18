-- PointClickCare outbound queue: progress notes only (2026-11-17).
-- The developer portal shows PointClickCare's API has no endpoint for writing
-- contacts and no charges endpoint at all, so the 'charge' and 'contact_update'
-- kinds are removed (Robert, 2026-11-17). None were ever queued.
-- Progress notes stay, waiting for Step 2 (PointClickCare approval of the
-- "Add new Progress Note" API plus Sign In With PointClickCare).

do $$ begin
  if exists (select 1 from public.pcc_outbound where kind <> 'progress_note') then
    raise exception 'pcc_outbound has charge or contact items. Cancel and remove them first.';
  end if;
end $$;

drop function if exists public.pcc_queue_charges(uuid[]);
drop function if exists public.pcc_queue_contacts(uuid);
drop index if exists public.pcc_outbound_one_open_contacts;

alter table public.pcc_outbound drop constraint if exists pcc_outbound_kind_check;
alter table public.pcc_outbound add constraint pcc_outbound_kind_check check (kind = 'progress_note');

-- Approval rule: progress notes only (Social Services Supervisor or Manager, or Org Admin).
create or replace function public.pcc_user_can_approve(p_user uuid, p_kind text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_role text; v_active boolean; t module_access_thresholds;
begin
  if p_kind is distinct from 'progress_note' then return false; end if;
  select role::text, coalesce(is_active, true) into v_role, v_active from profiles where id = p_user;
  if v_role is null or not v_active or v_role in ('family', 'resident', 'sales_rep', 'corporate') then return false; end if;
  if v_role in ('super_admin', 'org_admin') then return true; end if;
  if v_role = 'ceo' then return false; end if;

  select * into t from module_access_thresholds where module_key = 'social_services';
  if not found then return false; end if;
  return coalesce(can_user(p_user, 'social_services', t.supervisor_action), false)
      or coalesce(can_user(p_user, 'social_services', t.manager_action), false);
end;
$$;
revoke all on function public.pcc_user_can_approve(uuid, text) from public, anon, authenticated;

create or replace function public.pcc_can_queue(p_kind text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(p_kind = 'progress_note' and is_social_services_writer(), false)
$$;

create or replace function public.pcc_my_permissions()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'approve', case when pcc_can_approve('progress_note') then '["progress_note"]'::jsonb else '[]'::jsonb end,
    'queue',   case when pcc_can_queue('progress_note')   then '["progress_note"]'::jsonb else '[]'::jsonb end)
$$;

-- Bells: only progress notes now, all of which link to Social Services.
create or replace function public.pcc_outbound_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_kind text := 'Progress note';
  v_link text := '/app/social';
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      insert into push_notifications (org_id, recipient_id, title, body, category, link)
      select new.organization_id, p.id, 'PointClickCare: approval needed',
             v_kind || ' queued by ' || coalesce(new.created_by_name, 'a staff member') || ' is waiting for your approval.',
             'approval', v_link
        from profiles p
       where p.organization_id = new.organization_id
         and p.id is distinct from new.created_by
         and public.pcc_user_can_approve(p.id, new.kind);
    end if;
    return new;
  end if;

  if new.status is not distinct from old.status then return new; end if;

  if new.status in ('approved', 'cancelled') and new.created_by is not null
     and new.created_by is distinct from new.decided_by then
    insert into push_notifications (org_id, recipient_id, title, body, category, link)
    values (new.organization_id, new.created_by,
            case new.status when 'approved' then 'PointClickCare: approved' else 'PointClickCare: cancelled' end,
            v_kind || case new.status
              when 'approved' then ' you queued was approved by ' || coalesce(new.decided_by_name, 'an approver') || '.'
              else ' you queued was cancelled by ' || coalesce(new.decided_by_name, 'an approver')
                   || coalesce('. Reason: ' || new.cancel_reason, '') || '.' end,
            'approval', v_link);
  elsif new.status = 'sent' and new.created_by is not null then
    insert into push_notifications (org_id, recipient_id, title, body, category, link)
    values (new.organization_id, new.created_by, 'Sent to PointClickCare',
            v_kind || ' you queued is now in PointClickCare.', 'approval', v_link);
  elsif new.status = 'failed' then
    insert into push_notifications (org_id, recipient_id, title, body, category, link)
    select new.organization_id, r, 'PointClickCare: sending failed',
           v_kind || ' could not be sent. Open the queue to see the error and retry.', 'approval', v_link
      from (select distinct unnest(array[new.decided_by, new.created_by]) r) x
     where r is not null;
  end if;
  return new;
end;
$$;
revoke all on function public.pcc_outbound_notify() from public, anon, authenticated;
