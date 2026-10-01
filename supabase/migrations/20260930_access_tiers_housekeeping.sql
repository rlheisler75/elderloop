-- Access tiers, Phase 3 · Housekeeping. RESTRICTIVE policies that only bite when
-- the caller's community is on access_model = 'tiered' (legacy unchanged).
-- Tier = my_access_tier('housekeeping'): the caller's Housekeeping level.

-- ── Inspection setup (areas, checklist): the Housekeeping Manager ───────────
do $$
declare t text;
begin
  foreach t in array array['inspection_areas', 'inspection_checklist_items'] loop
    execute format('drop policy if exists tier_hk_insert on public.%I', t);
    execute format('drop policy if exists tier_hk_update on public.%I', t);
    execute format('drop policy if exists tier_hk_delete on public.%I', t);
    execute format($p$create policy tier_hk_insert on public.%I as restrictive for insert with check (
      not (select my_org_tiered())
      or (select my_access_tier('housekeeping')) in ('manager', 'administrator', 'org_admin', 'super_admin'))$p$, t);
    execute format($p$create policy tier_hk_update on public.%I as restrictive for update using (
      not (select my_org_tiered())
      or (select my_access_tier('housekeeping')) in ('manager', 'administrator', 'org_admin', 'super_admin'))$p$, t);
    execute format($p$create policy tier_hk_delete on public.%I as restrictive for delete using (
      not (select my_org_tiered())
      or (select my_access_tier('housekeeping')) in ('manager', 'administrator', 'org_admin', 'super_admin'))$p$, t);
  end loop;
end $$;

-- ── Room inspections ────────────────────────────────────────────────────────
-- Housekeeping staff see every inspection (area pass/fail status shows on each
-- area card); other staff only ones they did. Housekeepers record their own;
-- Supervisor+ can correct or redo any; only the Manager deletes.
drop policy if exists tier_hk_insp_select on ltc_inspections;
create policy tier_hk_insp_select on ltc_inspections as restrictive for select using (
  not (select my_org_tiered())
  or (select my_access_tier('housekeeping')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or (select has_department_access('housekeeping', 'employee'))
  or inspected_by = auth.uid());
drop policy if exists tier_hk_insp_insert on ltc_inspections;
create policy tier_hk_insp_insert on ltc_inspections as restrictive for insert with check (
  not (select my_org_tiered())
  or (select my_access_tier('housekeeping')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or ((select has_department_access('housekeeping', 'employee')) and inspected_by = auth.uid()));
drop policy if exists tier_hk_insp_update on ltc_inspections;
create policy tier_hk_insp_update on ltc_inspections as restrictive for update using (
  not (select my_org_tiered())
  or (select my_access_tier('housekeeping')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or inspected_by = auth.uid());
drop policy if exists tier_hk_insp_delete on ltc_inspections;
create policy tier_hk_insp_delete on ltc_inspections as restrictive for delete using (
  not (select my_org_tiered())
  or (select my_access_tier('housekeeping')) in ('manager', 'administrator', 'org_admin', 'super_admin'));

-- Checklist results follow their inspection: readable when the inspection is,
-- written by whoever may write that inspection.
drop policy if exists tier_hk_res_select on ltc_inspection_results;
create policy tier_hk_res_select on ltc_inspection_results as restrictive for select using (
  not (select my_org_tiered())
  or exists (select 1 from ltc_inspections li where li.id = ltc_inspection_results.inspection_id));
drop policy if exists tier_hk_res_insert on ltc_inspection_results;
create policy tier_hk_res_insert on ltc_inspection_results as restrictive for insert with check (
  not (select my_org_tiered())
  or (select my_access_tier('housekeeping')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or exists (select 1 from ltc_inspections li
              where li.id = ltc_inspection_results.inspection_id and li.inspected_by = auth.uid()));
drop policy if exists tier_hk_res_update on ltc_inspection_results;
create policy tier_hk_res_update on ltc_inspection_results as restrictive for update using (
  not (select my_org_tiered())
  or (select my_access_tier('housekeeping')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or exists (select 1 from ltc_inspections li
              where li.id = ltc_inspection_results.inspection_id and li.inspected_by = auth.uid()));
drop policy if exists tier_hk_res_delete on ltc_inspection_results;
create policy tier_hk_res_delete on ltc_inspection_results as restrictive for delete using (
  not (select my_org_tiered())
  or (select my_access_tier('housekeeping')) in ('manager', 'administrator', 'org_admin', 'super_admin'));

-- ── Independent Living cleaning requests ────────────────────────────────────
-- Anyone may submit one (unchanged). Housekeeping works them; staff who submitted
-- one can follow it; residents/family keep their own policies. Only Supervisor+
-- marks a visit billed, and only the Manager deletes.
drop policy if exists tier_il_select on il_cleaning_requests;
create policy tier_il_select on il_cleaning_requests as restrictive for select using (
  not (select my_org_tiered())
  or (select my_access_tier('housekeeping')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or (select has_department_access('housekeeping', 'employee'))
  or requested_by = auth.uid());
drop policy if exists tier_il_update on il_cleaning_requests;
create policy tier_il_update on il_cleaning_requests as restrictive for update using (
  not (select my_org_tiered())
  or (select my_access_tier('housekeeping')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or (select has_department_access('housekeeping', 'employee')));
drop policy if exists tier_il_delete on il_cleaning_requests;
create policy tier_il_delete on il_cleaning_requests as restrictive for delete using (
  not (select my_org_tiered())
  or (select my_access_tier('housekeeping')) in ('manager', 'administrator', 'org_admin', 'super_admin'));

create or replace function public.il_cleaning_billing_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if coalesce(auth.role(), '') <> 'authenticated' or not my_org_tiered()
     or my_access_tier('housekeeping') in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin') then
    return new;
  end if;
  if (new.billed, new.billed_at) is distinct from (old.billed, old.billed_at) then
    raise exception 'Only a Housekeeping Supervisor or Manager can mark a cleaning visit as billed.'
      using errcode = '42501', hint = 'tier_billing';
  end if;
  return new;
end;
$function$;
drop trigger if exists trg_il_cleaning_billing_guard on il_cleaning_requests;
create trigger trg_il_cleaning_billing_guard before update on il_cleaning_requests
  for each row execute function il_cleaning_billing_guard();
