-- Pick which screens an announcement or activity appears on. Empty = every
-- screen (and the community's default address); otherwise only the listed
-- signage_screens. Screens filter on their own id, which signage_resolve()
-- now returns.
alter table public.announcements
  add column if not exists signage_screen_ids uuid[] not null default '{}';
alter table public.activities
  add column if not exists signage_screen_ids uuid[] not null default '{}';

drop function if exists public.signage_resolve(integer, text);
create function public.signage_resolve(p_number integer, p_url_name text)
 returns table(org_slug text, display text, screen_name text, screen_id uuid)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select o.slug,
         coalesce(s.display, 'signage'),
         s.name,
         s.id
    from organizations o
    left join signage_screens s
      on s.organization_id = o.id and s.is_active and s.url_name = lower(btrim(coalesce(p_url_name, '')))
   where o.facility_number = p_number and o.is_active
     and (coalesce(p_url_name, '') = '' or s.id is not null)
$function$;

grant execute on function public.signage_resolve(integer, text) to anon, authenticated;
