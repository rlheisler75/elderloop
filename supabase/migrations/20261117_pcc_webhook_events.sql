-- PointClickCare webhook notifications (Step 1, read-only integration).
-- The pcc-webhook Edge Function writes every notification here first (so it can
-- reply 202 right away and never processes the same message twice), then works
-- it: admissions, discharges, transfers and resident-info changes fetch the
-- patient and update `residents`; contact, allergy and diet-order events are kept
-- as 'deferred' until their mapping is built.
--
-- A notification carries only IDs (event type, PointClickCare org/facility/
-- patient IDs, dates), never names or health details. `result` holds a short
-- outcome without PHI ("resident updated", "no ElderLoop community").
-- Rows are written only by the Edge Function (service role). Super admins can
-- read them for troubleshooting; no one else can see or change them.

create table if not exists public.pcc_webhook_events (
  id               uuid primary key default gen_random_uuid(),
  message_id       text not null unique,
  event_type       text not null,
  org_uuid         text,
  fac_id           text,
  pcc_patient_id   text,
  organization_id  uuid references public.organizations(id) on delete set null,
  payload          jsonb not null,
  received_at      timestamptz not null default now(),
  status           text not null default 'received'
                   check (status in ('received', 'processed', 'ignored', 'deferred', 'review', 'failed')),
  attempts         int not null default 0,
  result           text,
  error            text,
  processed_at     timestamptz
);

create index if not exists pcc_webhook_events_status_idx on public.pcc_webhook_events (status, received_at);
create index if not exists pcc_webhook_events_org_idx    on public.pcc_webhook_events (organization_id, received_at desc);

alter table public.pcc_webhook_events enable row level security;

drop policy if exists pcc_webhook_events_super_read on public.pcc_webhook_events;
create policy pcc_webhook_events_super_read on public.pcc_webhook_events
  for select to authenticated using ((select get_my_role()) = 'super_admin');
drop policy if exists mfa_gate on public.pcc_webhook_events;
create policy mfa_gate on public.pcc_webhook_events as restrictive for all to authenticated
  using ((select mfa_ok())) with check ((select mfa_ok()));
drop policy if exists staff_only_no_portal on public.pcc_webhook_events;
create policy staff_only_no_portal on public.pcc_webhook_events as restrictive for all to authenticated
  using (not (select is_portal_user())) with check (not (select is_portal_user()));

revoke all on public.pcc_webhook_events from anon;
revoke insert, update, delete on public.pcc_webhook_events from authenticated;
