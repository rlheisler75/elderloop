-- Bells for the PointClickCare outbound queue (20261116_pcc_outbound_queue.sql).
--   queued (pending)      -> everyone who may approve that kind (not the person who queued it)
--   approved / cancelled  -> the person who queued it (unless they decided it themselves)
--   sent                  -> the person who queued it
--   failed                -> the approver and the person who queued it
-- Bells are de-identified (kind + who queued it, never the resident or note text),
-- like the grievance and incident bells. Category 'approval', linked to the screen
-- that holds the queue.
--
-- pcc_user_can_approve(user, kind) is the one approval rule; pcc_can_approve(kind)
-- now calls it for the signed-in person, so bells and Approve buttons can't drift.
-- Same thresholds my_access_tier() uses: Social Services Supervisor = the module's
-- supervisor_action, Manager = manager_action (module_access_thresholds).

create or replace function public.pcc_user_can_approve(p_user uuid, p_kind text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_role text; v_active boolean; t module_access_thresholds;
begin
  select role::text, coalesce(is_active, true) into v_role, v_active from profiles where id = p_user;
  if v_role is null or not v_active or v_role in ('family', 'resident', 'sales_rep', 'corporate') then return false; end if;
  if v_role in ('super_admin', 'org_admin') then return true; end if;

  if p_kind = 'charge' then
    return coalesce(can_user(p_user, 'meters', 'costs'), false);
  end if;
  if p_kind = 'contact_update' and v_role = 'ceo' then return true; end if;
  if p_kind not in ('progress_note', 'contact_update') or v_role = 'ceo' then return false; end if;

  select * into t from module_access_thresholds where module_key = 'social_services';
  if not found then return false; end if;
  return coalesce(can_user(p_user, 'social_services', t.supervisor_action), false)
      or coalesce(can_user(p_user, 'social_services', t.manager_action), false);
end;
$$;
revoke all on function public.pcc_user_can_approve(uuid, text) from public, anon, authenticated;

create or replace function public.pcc_can_approve(p_kind text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.pcc_user_can_approve(auth.uid(), p_kind), false)
$$;

create or replace function public.pcc_outbound_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_kind text := case new.kind when 'progress_note' then 'Progress note'
                               when 'charge' then 'Charges'
                               else 'Emergency contacts' end;
  v_link text := case when new.kind = 'charge' then '/app/meters' else '/app/social' end;
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

drop trigger if exists trg_pcc_outbound_notify on public.pcc_outbound;
create trigger trg_pcc_outbound_notify after insert or update on public.pcc_outbound
  for each row execute function public.pcc_outbound_notify();
