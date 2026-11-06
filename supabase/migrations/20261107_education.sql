-- Education: in-service sessions, attendance (P / A / E), makeups, yearly
-- requirements, and QR self check-in. Module key 'education', on every plan.
--
-- Who:
--   * Staff Development (job role with Education edit, e.g. the in-service
--     coordinator), Org Admins: everything.
--   * The Administrator: sees everything (Education view, from the '*' default).
--   * A department Manager: sees and marks attendance and makeups for people
--     in their own department(s) (edu_manages_profile).
--   * Everyone: sees the session list and their own attendance, and checks in
--     to a session with its QR code (edu_checkin, only around the session time).
-- Who must attend a session: active staff whose hire date (if any) is on or
-- before the session and whose employment end date (if any) is on or after it,
-- in the session's departments when it isn't for everyone (edu_session_roster).
-- Absent or Excused on a required session = owes a makeup (edu_makeups).

-- ── Staff field ─────────────────────────────────────────────
alter table public.profiles add column if not exists employment_end_date date;

-- ── Module, on every plan ───────────────────────────────────
insert into public.modules (key, label, description, is_active)
values ('education', 'Education', 'In-service sessions, attendance, makeups, and yearly training requirements', true)
on conflict (key) do nothing;

create or replace function public.plan_allows_module(p_org_id uuid, p_module text)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select case coalesce(o.plan, 'pilot')
    when 'starter' then p_module = any (array['directory', 'staff', 'communication', 'family', 'education'])
    else true
  end
  from organizations o where o.id = p_org_id
$$;

insert into public.organization_modules (organization_id, module_key, is_enabled)
select id, 'education', true from public.organizations
on conflict (organization_id, module_key) do nothing;

-- ── Job roles: Administrator views; a ready-made Staff Development role ──
insert into public.job_role_permissions (job_role_id, module_key, action)
select r.id, 'education', 'view' from public.job_roles r where r.source = 'administrator'
on conflict do nothing;

insert into public.job_roles (organization_id, name, description, source)
select id, 'Staff Development', 'Runs in-services: sessions, attendance for everyone, makeups, requirements, and reports.', 'custom'
  from public.organizations
on conflict (organization_id, name) do nothing;

insert into public.job_role_permissions (job_role_id, module_key, action)
select r.id, 'education', a
  from public.job_roles r cross join unnest(array['view', 'create', 'edit', 'delete', 'settings']) a
 where r.name = 'Staff Development' and r.source = 'custom'
on conflict do nothing;

-- ── Tables ──────────────────────────────────────────────────
create table if not exists public.edu_sessions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  title                 text not null check (length(btrim(title)) between 1 and 200),
  session_type          text not null default 'mandatory'
                          check (session_type in ('mandatory', 'department', 'educational', 'orientation', 'makeup')),
  -- requirement topics this session counts toward, e.g. {dementia, abuse}
  topics                text[] not null default '{}',
  session_date          date not null,
  start_time            time,
  hours                 numeric(4,2) not null default 1 check (hours > 0 and hours <= 24),
  instructor            text,
  location              text,
  notes                 text,
  -- 'all' = everyone employed that day; 'departments' = only audience_departments
  audience              text not null default 'all' check (audience in ('all', 'departments')),
  audience_departments  text[] not null default '{}',
  makeup_for            uuid references public.edu_sessions(id) on delete set null,
  is_active             boolean not null default true,
  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists edu_sessions_org_date_idx on public.edu_sessions (organization_id, session_date desc);

-- Check-in codes live apart so ordinary staff never read them (a code only
-- works around the session time anyway)
create table if not exists public.edu_checkin_tokens (
  session_id  uuid primary key references public.edu_sessions(id) on delete cascade,
  token       text not null unique default replace(gen_random_uuid()::text, '-', '')
);

create table if not exists public.edu_attendance (
  session_id       uuid not null references public.edu_sessions(id) on delete cascade,
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  status           text not null check (status in ('present', 'absent', 'excused')),
  method           text not null default 'manual' check (method in ('manual', 'qr', 'import')),
  marked_by        uuid references public.profiles(id) on delete set null,
  marked_at        timestamptz not null default now(),
  primary key (session_id, profile_id)
);
create index if not exists edu_attendance_profile_idx on public.edu_attendance (profile_id);

create table if not exists public.edu_makeups (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  session_id         uuid not null references public.edu_sessions(id) on delete cascade,
  profile_id         uuid not null references public.profiles(id) on delete cascade,
  completed_on       date not null,
  method             text not null default 'read_and_sign' check (method in ('makeup_session', 'read_and_sign', 'other')),
  makeup_session_id  uuid references public.edu_sessions(id) on delete set null,
  notes              text,
  recorded_by        uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  unique (session_id, profile_id)
);

create table if not exists public.edu_requirements (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null check (length(btrim(name)) between 1 and 120),
  -- empty = everyone
  departments      text[] not null default '{}',
  required_hours   numeric(5,2) check (required_hours is null or required_hours > 0),
  required_topics  text[] not null default '{}',
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ── Permission helpers ──────────────────────────────────────
create or replace function public.edu_is_admin()
returns boolean language sql stable security definer set search_path to 'public'
as $$ select coalesce(can('education', 'edit'), false) $$;

create or replace function public.edu_can_view_all()
returns boolean language sql stable security definer set search_path to 'public'
as $$ select coalesce(can('education', 'view'), false) $$;

-- The caller is a Manager of a department this person works in
create or replace function public.edu_manages_profile(p_profile uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select coalesce(exists (
    select 1 from staff_department_roles me
     where me.profile_id = auth.uid() and me.level = 'manager'
       and (me.department in (select s.department from staff_department_roles s where s.profile_id = p_profile)
            or me.department = (select p.department from profiles p where p.id = p_profile))
  ), false)
$$;

-- Departments the caller manages (for screens)
create or replace function public.edu_my_managed_departments()
returns text[] language sql stable security definer set search_path to 'public'
as $$
  select coalesce(array_agg(distinct department), '{}') from staff_department_roles
   where profile_id = auth.uid() and level = 'manager'
$$;

-- People who must attend a session
create or replace function public.edu_session_roster(p_session uuid)
returns table (profile_id uuid, first_name text, last_name text, department text, departments text[], job_title text, is_active boolean)
language sql stable security definer set search_path to 'public'
as $$
  select p.id, p.first_name, p.last_name, p.department,
         array(select s.department from staff_department_roles s where s.profile_id = p.id order by 1),
         p.job_title, p.is_active
    from edu_sessions e
    join profiles p on p.organization_id = e.organization_id
   where e.id = p_session
     and e.organization_id = get_my_org_id()
     and p.role::text not in ('family', 'resident', 'sales_rep', 'corporate', 'super_admin')
     and (p.is_active or p.employment_end_date is not null)
     and (p.hire_date is null or p.hire_date <= e.session_date)
     and (p.employment_end_date is null or p.employment_end_date >= e.session_date)
     and (e.audience = 'all'
          or p.department = any (e.audience_departments)
          or exists (select 1 from staff_department_roles s where s.profile_id = p.id and s.department = any (e.audience_departments)))
   order by p.last_name, p.first_name
$$;

-- ── RLS ─────────────────────────────────────────────────────
alter table public.edu_sessions       enable row level security;
alter table public.edu_checkin_tokens enable row level security;
alter table public.edu_attendance     enable row level security;
alter table public.edu_makeups        enable row level security;
alter table public.edu_requirements   enable row level security;

-- Sessions and requirements: every staff member reads; Staff Development writes
drop policy if exists edu_sessions_read on public.edu_sessions;
create policy edu_sessions_read on public.edu_sessions for select to authenticated
  using (organization_id = get_my_org_id() or get_my_role() = 'super_admin');
drop policy if exists edu_sessions_write on public.edu_sessions;
create policy edu_sessions_write on public.edu_sessions for all to authenticated
  using ((organization_id = get_my_org_id() and (select edu_is_admin())) or get_my_role() = 'super_admin')
  with check ((organization_id = get_my_org_id() and (select edu_is_admin())) or get_my_role() = 'super_admin');

drop policy if exists edu_requirements_read on public.edu_requirements;
create policy edu_requirements_read on public.edu_requirements for select to authenticated
  using (organization_id = get_my_org_id() or get_my_role() = 'super_admin');
drop policy if exists edu_requirements_write on public.edu_requirements;
create policy edu_requirements_write on public.edu_requirements for all to authenticated
  using ((organization_id = get_my_org_id() and coalesce(can('education', 'settings'), false)) or get_my_role() = 'super_admin')
  with check ((organization_id = get_my_org_id() and coalesce(can('education', 'settings'), false)) or get_my_role() = 'super_admin');

-- Tokens: Staff Development only (to print the QR poster)
drop policy if exists edu_tokens_admin on public.edu_checkin_tokens;
create policy edu_tokens_admin on public.edu_checkin_tokens for all to authenticated
  using (exists (select 1 from edu_sessions e where e.id = session_id
                  and ((e.organization_id = get_my_org_id() and (select edu_is_admin())) or get_my_role() = 'super_admin')))
  with check (exists (select 1 from edu_sessions e where e.id = session_id
                  and ((e.organization_id = get_my_org_id() and (select edu_is_admin())) or get_my_role() = 'super_admin')));

-- Attendance and makeups: own rows; everyone's for Education view; Managers
-- for their departments. Writes: Staff Development, or a Manager for their people.
drop policy if exists edu_attendance_read on public.edu_attendance;
create policy edu_attendance_read on public.edu_attendance for select to authenticated
  using (get_my_role() = 'super_admin' or (organization_id = get_my_org_id()
         and (profile_id = auth.uid() or (select edu_can_view_all()) or edu_manages_profile(profile_id))));
drop policy if exists edu_attendance_write on public.edu_attendance;
create policy edu_attendance_write on public.edu_attendance for all to authenticated
  using (get_my_role() = 'super_admin' or (organization_id = get_my_org_id()
         and ((select edu_is_admin()) or edu_manages_profile(profile_id))))
  with check (get_my_role() = 'super_admin' or (organization_id = get_my_org_id()
         and ((select edu_is_admin()) or edu_manages_profile(profile_id))));

drop policy if exists edu_makeups_read on public.edu_makeups;
create policy edu_makeups_read on public.edu_makeups for select to authenticated
  using (get_my_role() = 'super_admin' or (organization_id = get_my_org_id()
         and (profile_id = auth.uid() or (select edu_can_view_all()) or edu_manages_profile(profile_id))));
drop policy if exists edu_makeups_write on public.edu_makeups;
create policy edu_makeups_write on public.edu_makeups for all to authenticated
  using (get_my_role() = 'super_admin' or (organization_id = get_my_org_id()
         and ((select edu_is_admin()) or edu_manages_profile(profile_id))))
  with check (get_my_role() = 'super_admin' or (organization_id = get_my_org_id()
         and ((select edu_is_admin()) or edu_manages_profile(profile_id))));

-- Every table: 2FA gate and no portal logins
do $$
declare t text;
begin
  foreach t in array array['edu_sessions', 'edu_checkin_tokens', 'edu_attendance', 'edu_makeups', 'edu_requirements'] loop
    execute format('drop policy if exists mfa_gate on public.%I', t);
    execute format('create policy mfa_gate on public.%I as restrictive for all to authenticated using ((select mfa_ok())) with check ((select mfa_ok()))', t);
    execute format('drop policy if exists staff_only_no_portal on public.%I', t);
    execute format('create policy staff_only_no_portal on public.%I as restrictive for all to authenticated using (not (select is_portal_user())) with check (not (select is_portal_user()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ── Triggers: stamps and a token for each session ───────────
create or replace function public.edu_session_defaults()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_edu_session_defaults on public.edu_sessions;
create trigger trg_edu_session_defaults before insert or update on public.edu_sessions
  for each row execute function edu_session_defaults();

create or replace function public.edu_session_token()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  insert into edu_checkin_tokens (session_id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists trg_edu_session_token on public.edu_sessions;
create trigger trg_edu_session_token after insert on public.edu_sessions
  for each row execute function edu_session_token();

create or replace function public.edu_mark_defaults()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if auth.uid() is not null and new.method <> 'qr' then
    new.marked_by := auth.uid();
  end if;
  new.marked_at := now();
  return new;
end $$;
drop trigger if exists trg_edu_mark_defaults on public.edu_attendance;
create trigger trg_edu_mark_defaults before insert or update on public.edu_attendance
  for each row execute function edu_mark_defaults();

create or replace function public.edu_makeup_defaults()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if auth.uid() is not null then new.recorded_by := auth.uid(); end if;
  return new;
end $$;
drop trigger if exists trg_edu_makeup_defaults on public.edu_makeups;
create trigger trg_edu_makeup_defaults before insert or update on public.edu_makeups
  for each row execute function edu_makeup_defaults();

-- ── QR self check-in ────────────────────────────────────────
-- Open from 30 minutes before the start to 60 minutes after it (all day when
-- the session has no start time). Times are Central, like the rest of the app.
create or replace function public.edu_checkin(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  e        edu_sessions;
  v_me     profiles;
  v_now    timestamp := (now() at time zone 'America/Chicago');
  v_start  timestamp;
begin
  select s.* into e from edu_checkin_tokens t join edu_sessions s on s.id = t.session_id
   where t.token = p_token and s.is_active;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'This check-in code was not found.');
  end if;
  select * into v_me from profiles where id = auth.uid();
  if v_me.id is null or v_me.organization_id is distinct from e.organization_id
     or v_me.role::text in ('family', 'resident', 'sales_rep', 'corporate') then
    return jsonb_build_object('ok', false, 'error', 'This check-in is for staff of the community that holds the class.');
  end if;
  if e.start_time is null then
    if v_now::date <> e.session_date then
      return jsonb_build_object('ok', false, 'error', 'Check-in is only open on the day of the class.', 'title', e.title);
    end if;
  else
    v_start := e.session_date + e.start_time;
    if v_now < v_start - interval '30 minutes' or v_now > v_start + interval '60 minutes' then
      return jsonb_build_object('ok', false, 'title', e.title,
        'error', 'Check-in is open from 30 minutes before the class to 1 hour after it starts.');
    end if;
  end if;
  insert into edu_attendance (session_id, profile_id, organization_id, status, method)
  values (e.id, v_me.id, e.organization_id, 'present', 'qr')
  on conflict (session_id, profile_id) do update set status = 'present', method = 'qr';
  return jsonb_build_object('ok', true, 'title', e.title, 'session_date', e.session_date,
                            'name', trim(coalesce(v_me.first_name, '') || ' ' || coalesce(v_me.last_name, '')));
end $$;

revoke all on function public.edu_checkin(text) from public, anon;
grant execute on function public.edu_checkin(text) to authenticated;
grant execute on function public.edu_session_roster(uuid) to authenticated;
grant execute on function public.edu_my_managed_departments() to authenticated;
revoke all on function public.edu_session_defaults() from public, anon, authenticated;
revoke all on function public.edu_session_token() from public, anon, authenticated;
revoke all on function public.edu_mark_defaults() from public, anon, authenticated;
revoke all on function public.edu_makeup_defaults() from public, anon, authenticated;

-- Applied separately as education_people: the staff list for Education screens
-- (profiles RLS hides most staff from non-supervisors, e.g. a Staff Development
-- coordinator with a staff account).
create or replace function public.edu_people()
returns table (profile_id uuid, first_name text, last_name text, department text, departments text[],
               job_title text, is_active boolean, hire_date date, employment_end_date date)
language sql stable security definer set search_path to 'public'
as $$
  select p.id, p.first_name, p.last_name, p.department,
         array(select s.department from staff_department_roles s where s.profile_id = p.id order by 1),
         p.job_title, p.is_active, p.hire_date, p.employment_end_date
    from profiles p
   where p.organization_id = get_my_org_id()
     and p.role::text not in ('family', 'resident', 'sales_rep', 'corporate', 'super_admin')
     and (p.is_active or p.employment_end_date is not null)
     and (edu_can_view_all() or edu_is_admin() or p.id = auth.uid() or edu_manages_profile(p.id))
   order by p.last_name, p.first_name
$$;
revoke all on function public.edu_people() from public, anon;
grant execute on function public.edu_people() to authenticated;
