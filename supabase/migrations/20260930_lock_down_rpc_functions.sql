-- Lock down two SECURITY DEFINER RPCs flagged by the Supabase security advisor.
-- Applied to the hosted project via the Supabase MCP (2026-09-30).

-- get_ss_caseload: was callable by anyone (incl. signed-out) for ANY org id,
-- returning that org's Social Services staff names + caseload counts.
-- Now: signed-in only, and only for the caller's own org (super admins: any).
create or replace function public.get_ss_caseload(p_org_id uuid)
returns table(worker_id uuid, first_name text, last_name text, role text, assigned bigint, open_grievances bigint, open_conferences bigint)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- get_my_role(), not is_super_admin(): the latter reads the legacy, empty super_admins table
  if p_org_id is distinct from get_my_org_id() and get_my_role() is distinct from 'super_admin' then
    raise exception 'Not authorized for this organization' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.first_name,
    p.last_name,
    p.role::text,
    count(distinct sp.id)  as assigned,
    count(distinct g.id)   as open_grievances,
    count(distinct cc.id)  as open_conferences
  from profiles p
  left join ss_social_profiles sp on sp.assigned_to = p.id and sp.organization_id = p_org_id
  left join ss_grievances g       on g.assigned_to  = p.id and g.organization_id  = p_org_id and g.status in ('open','investigating') and g.is_active = true
  left join ss_care_conferences cc on cc.facilitated_by = p.id and cc.organization_id = p_org_id and cc.status = 'scheduled'
  where p.organization_id = p_org_id
    and p.is_active = true
    and p.role in ('social_services','supervisor','manager','org_admin','ceo')
  group by p.id, p.first_name, p.last_name, p.role
  order by assigned desc, p.last_name;
end;
$function$;

revoke execute on function public.get_ss_caseload(uuid) from public, anon;
grant  execute on function public.get_ss_caseload(uuid) to authenticated;

-- increment_promo_redemption: only the Stripe webhook (service role) calls it;
-- anyone could previously inflate a rep promo code's redemption count.
alter function public.increment_promo_redemption(text) set search_path to 'public';
revoke execute on function public.increment_promo_redemption(text) from public, anon, authenticated;
grant  execute on function public.increment_promo_redemption(text) to service_role;
