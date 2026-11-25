-- Terminated blocks sign-in (Robert, 2026-11-25).
-- Marking someone Terminated (Staff → Profile → Status) now turns their account off. That blocks
-- sign-in and signs them out everywhere (sync_sign_in_with_active, 20261107_inactive_blocks_sign_in).
-- Changing the status back turns the account on again (the plan's staff limit still applies).
-- Their records and history stay with the community either way.
-- If another community on ElderLoop hires them, create-user gives that community a new login for
-- the same email and sets the old login's email aside, so nothing carries over between communities.

create or replace function public.status_sets_account_access()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_plan text; v_limit integer; v_count integer;
begin
  if new.status is not distinct from old.status then return new; end if;

  if new.status = 'terminated' then
    if new.id = auth.uid() then
      raise exception 'You can''t mark yourself Terminated.' using errcode = '42501';
    end if;
    new.is_active := false;

  elsif old.status = 'terminated' and new.is_active is false then
    -- Back from Terminated: turn the account on again, within the plan's staff limit
    if new.organization_id is not null and new.role::text not in ('resident', 'family') then
      select plan, staff_limit into v_plan, v_limit from organizations where id = new.organization_id for update;
      if v_plan in ('starter', 'essential', 'plus') and v_limit is not null then
        select count(*) into v_count from profiles
         where organization_id = new.organization_id and is_active is not false
           and role::text not in ('resident', 'family') and id <> new.id;
        if v_count >= v_limit then
          raise exception 'Staff limit reached: your % plan includes up to % staff accounts. Upgrade under Admin Panel → Billing to add more.', initcap(v_plan), v_limit
            using errcode = 'P0001', hint = 'plan_limit_staff';
        end if;
      end if;
    end if;
    new.is_active := true;
  end if;
  return new;
end $$;

-- Runs after trg_protect_profile_privileges (triggers fire in name order), so that check sees
-- the status change, not an is_active change, and the people allowed to set a status still can.
create trigger trg_status_sets_account_access before update of status on public.profiles
  for each row execute function public.status_sets_account_access();

-- The sign-in sync used to fire only when an UPDATE named is_active; a BEFORE trigger changing it
-- doesn't count for "UPDATE OF". It now runs on every update and still acts only when is_active changed.
drop trigger trg_sync_sign_in_with_active on public.profiles;
create trigger trg_sync_sign_in_with_active after update on public.profiles
  for each row execute function public.sync_sign_in_with_active();

-- Anyone already marked Terminated with the account still on (Lora Massey at Maranatha, resigned 2026-11-25)
update public.profiles set is_active = false where status = 'terminated' and is_active is not false;
