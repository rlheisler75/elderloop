-- Education: an in-service can stop tracking makeups. Used for history
-- imported from a system that had no makeups (e.g. Maranatha's Nebula
-- attendance tracker), so months of old absences don't flood the Makeups
-- list. Absences still show in reports and each person's history.
-- Makeups owed are worked out in the app (Education.jsx), which skips these.
alter table public.edu_sessions add column if not exists track_makeups boolean not null default true;

comment on column public.edu_sessions.track_makeups is
  'false = Absent/Excused on this session never owes a makeup (e.g. history imported from a system without makeups)';
