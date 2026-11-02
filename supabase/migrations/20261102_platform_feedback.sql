-- Help requests and improvement suggestions sent to the ElderLoop team (Super Admin
-- inbox). Anyone signed in can send one: staff, family, and residents. The sender,
-- community, and role are stamped from the profile, never trusted from the client.

create table if not exists public.platform_feedback (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  role            text,
  kind            text not null check (kind in ('help', 'suggestion')),
  subject         text not null check (char_length(subject) between 3 and 150),
  message         text not null check (char_length(message) between 3 and 5000),
  page            text,
  status          text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  admin_note      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists platform_feedback_status_idx on public.platform_feedback (status, created_at desc);
create index if not exists platform_feedback_user_idx on public.platform_feedback (user_id);

create or replace function public.platform_feedback_stamp()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    select p.organization_id, p.role::text into new.organization_id, new.role
      from profiles p where p.id = auth.uid();
    new.status := 'new';
    new.admin_note := null;
  end if;
  new.updated_at := now();
  return new;
end;
$function$;
revoke all on function public.platform_feedback_stamp() from public, anon, authenticated;

drop trigger if exists platform_feedback_stamp on public.platform_feedback;
create trigger platform_feedback_stamp before insert or update on public.platform_feedback
  for each row execute function public.platform_feedback_stamp();

alter table public.platform_feedback enable row level security;

drop policy if exists feedback_insert_own on public.platform_feedback;
create policy feedback_insert_own on public.platform_feedback for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists feedback_select on public.platform_feedback;
create policy feedback_select on public.platform_feedback for select to authenticated
  using (user_id = (select auth.uid()) or (select get_my_role()) = 'super_admin');

drop policy if exists feedback_update_admin on public.platform_feedback;
create policy feedback_update_admin on public.platform_feedback for update to authenticated
  using ((select get_my_role()) = 'super_admin')
  with check ((select get_my_role()) = 'super_admin');

drop policy if exists feedback_delete_admin on public.platform_feedback;
create policy feedback_delete_admin on public.platform_feedback for delete to authenticated
  using ((select get_my_role()) = 'super_admin');

grant select, insert, update, delete on public.platform_feedback to authenticated;

-- On the portal allowlist (no staff_only_no_portal): family and residents send these too.
drop policy if exists mfa_gate on public.platform_feedback;
create policy mfa_gate on public.platform_feedback as restrictive for all to authenticated
  using ((select mfa_ok())) with check ((select mfa_ok()));
