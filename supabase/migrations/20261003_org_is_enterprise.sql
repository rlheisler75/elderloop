-- Enterprise check for the Billing tab: is this community in a corporation with
-- 3+ active communities? Same rule as isEnterpriseCommunity() in api/webhook.js and
-- ENTERPRISE_MIN_COMMUNITIES in create-checkout. Callers may ask only about their
-- own community (super admins about any). Always returns a strict boolean.
create or replace function public.org_is_enterprise(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select count(*) >= 3
    from organizations o
    join organizations me on me.corporation_id = o.corporation_id
    where me.id = p_org
      and me.corporation_id is not null
      and o.is_active <> false
      and (p_org = get_my_org_id() or is_super_admin())
  ), false)
$$;

revoke all on function public.org_is_enterprise(uuid) from public, anon;
grant execute on function public.org_is_enterprise(uuid) to authenticated;
