-- Super Admin replies to Help & Feedback messages. Written only by the
-- reply-feedback Edge Function (service role), which also emails the sender and
-- rings their bell. The sender reads replies to their own messages in the
-- Help & Feedback window (FeedbackModal), so portal users are allowed (no
-- staff_only_no_portal); mfa_gate like every table.

create table if not exists public.platform_feedback_replies (
  id           uuid primary key default gen_random_uuid(),
  feedback_id  uuid not null references public.platform_feedback(id) on delete cascade,
  author_id    uuid references public.profiles(id) on delete set null,
  message      text not null check (length(btrim(message)) between 1 and 5000),
  created_at   timestamptz not null default now(),
  emailed_at   timestamptz,
  email_error  text,
  pushed       boolean not null default false
);
create index if not exists platform_feedback_replies_feedback_idx
  on public.platform_feedback_replies (feedback_id, created_at);

alter table public.platform_feedback_replies enable row level security;

drop policy if exists feedback_replies_select on public.platform_feedback_replies;
create policy feedback_replies_select on public.platform_feedback_replies
  for select to authenticated
  using (
    (select get_my_role()) = 'super_admin'
    or exists (select 1 from public.platform_feedback f
                where f.id = feedback_id and f.user_id = (select auth.uid()))
  );

drop policy if exists mfa_gate on public.platform_feedback_replies;
create policy mfa_gate on public.platform_feedback_replies
  as restrictive for all to authenticated
  using ((select mfa_ok())) with check ((select mfa_ok()));

revoke insert, update, delete on public.platform_feedback_replies from anon, authenticated;
grant select on public.platform_feedback_replies to authenticated;
