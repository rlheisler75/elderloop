-- Work order numbers are counted per community, so one community's numbers
-- never skip because another community filed a work order. Each counter starts
-- at that community's highest existing number (Maranatha: 77555, the last
-- imported Work Hub WO #). A brand-new community's first work order is #1001.
-- Imported numbers (set_wo_number keeps a supplied number for callers with
-- work_orders settings permission) push the counter up so they never collide.

create table if not exists public.wo_number_counters (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  last_number     integer not null
);

-- Only the trigger below touches this table.
alter table public.wo_number_counters enable row level security;
revoke all on public.wo_number_counters from anon, authenticated;

insert into public.wo_number_counters (organization_id, last_number)
select organization_id, max(wo_number)
  from public.work_orders
 where wo_number is not null
 group by organization_id
on conflict (organization_id) do update
  set last_number = greatest(wo_number_counters.last_number, excluded.last_number);

create or replace function public.set_wo_number()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if new.wo_number is null
     or (coalesce(auth.role(), '') = 'authenticated' and not can('work_orders', 'settings')) then
    insert into wo_number_counters (organization_id, last_number)
    values (new.organization_id, 1001)
    on conflict (organization_id) do update
      set last_number = wo_number_counters.last_number + 1
    returning last_number into new.wo_number;
  else
    -- Supplied number (imports): keep the counter ahead of it
    insert into wo_number_counters (organization_id, last_number)
    values (new.organization_id, new.wo_number)
    on conflict (organization_id) do update
      set last_number = greatest(wo_number_counters.last_number, excluded.last_number);
  end if;
  return new;
end;
$function$;
