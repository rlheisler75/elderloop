-- Work order Assign dropdown: everyone in this community who can work work
-- orders (Work Orders edit permission), including Org Admins. The screen used to
-- filter profiles by the old role keys (maintenance/supervisor/manager), so techs
-- created since Job Roles (role 'staff') never appeared.
create or replace function public.wo_assign_targets()
returns table(id uuid, first_name text, last_name text)
language sql
stable security definer
set search_path to 'public'
as $$
  select p.id, p.first_name, p.last_name
    from profiles p
   where p.organization_id = get_my_org_id()
     and p.is_active
     and p.role::text not in ('ceo', 'super_admin', 'corporate', 'family', 'resident', 'sales_rep')
     and can_user(p.id, 'work_orders', 'edit')
   order by p.first_name, p.last_name
$$;

revoke all on function public.wo_assign_targets() from public, anon;
grant execute on function public.wo_assign_targets() to authenticated;
