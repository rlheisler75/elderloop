-- Education: attending a makeup session clears the makeup on its own.
-- Present at a session of type 'makeup' whose makeup_for is set, and Absent or
-- Excused at that missed session, records an edu_makeups row (method
-- makeup_session). Clearing the Present mark removes that row again. Works in
-- either order: marking the original Absent after the makeup class also counts.

create or replace function public.edu_makeup_from_attendance()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  r  edu_attendance := coalesce(new, old);
  s  edu_sessions;
begin
  select * into s from edu_sessions where id = r.session_id;

  -- A mark on a makeup session
  if s.session_type = 'makeup' and s.makeup_for is not null then
    if tg_op <> 'DELETE' and new.status = 'present' then
      insert into edu_makeups (organization_id, session_id, profile_id, completed_on, method, makeup_session_id, notes)
      select s.organization_id, s.makeup_for, new.profile_id, s.session_date, 'makeup_session', s.id, 'Attended the makeup session'
        from edu_attendance o
       where o.session_id = s.makeup_for and o.profile_id = new.profile_id and o.status in ('absent', 'excused')
      on conflict (session_id, profile_id) do nothing;
    else
      delete from edu_makeups
       where session_id = s.makeup_for and profile_id = r.profile_id
         and method = 'makeup_session' and makeup_session_id = s.id;
    end if;

  -- Absent or Excused on a missed session after already attending its makeup
  elsif tg_op <> 'DELETE' and new.status in ('absent', 'excused') then
    insert into edu_makeups (organization_id, session_id, profile_id, completed_on, method, makeup_session_id, notes)
    select m.organization_id, s.id, new.profile_id, m.session_date, 'makeup_session', m.id, 'Attended the makeup session'
      from edu_sessions m
      join edu_attendance a on a.session_id = m.id and a.profile_id = new.profile_id and a.status = 'present'
     where m.makeup_for = s.id and m.session_type = 'makeup' and m.is_active
     order by m.session_date
     limit 1
    on conflict (session_id, profile_id) do nothing;
  end if;

  return null;
end $$;

drop trigger if exists trg_edu_makeup_from_attendance on public.edu_attendance;
create trigger trg_edu_makeup_from_attendance after insert or update or delete on public.edu_attendance
  for each row execute function edu_makeup_from_attendance();

revoke all on function public.edu_makeup_from_attendance() from public, anon, authenticated;
