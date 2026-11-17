-- Two-factor sign-in: add the Dietary department to the people who must use it
-- (in communities with organizations.require_mfa). Dietary staff read vitals
-- (weights), allergies and diet/texture orders, and after the PointClickCare sync
-- they will see allergies and diet orders from the clinical record, so they count
-- as "staff with access to health information" (PCC Marketplace agreement, Appendix A).
-- Enforcement is unchanged: the mfa_gate policies and MfaGate read mfa_required().

create or replace function public.mfa_required(p_user uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select coalesce((
    select case
      when coalesce(o.is_demo, false) then false
      when p.role::text = 'super_admin' then true
      when coalesce(o.require_mfa, false) and p.is_active is not false and (
             p.role::text in ('org_admin', 'ceo')
          or coalesce(p.is_platform_admin, false)
          or exists (select 1 from staff_department_roles d
                      where d.profile_id = p.id and d.department in ('nursing', 'social_services', 'dietary'))
        ) then true
      else false
    end
    from profiles p left join organizations o on o.id = p.organization_id
    where p.id = p_user), false)
$function$;
