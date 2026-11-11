-- Optional message for a celebration, shown on the Dashboard banner under
-- "Happy <name>!" (Admin Panel → Celebrations). Empty = the standard line.
alter table public.org_celebrations
  add column if not exists message text check (message is null or length(message) <= 200);
