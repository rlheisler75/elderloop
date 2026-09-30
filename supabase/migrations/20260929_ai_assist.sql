-- AI Assist: per-org toggle + usage log for the ai-assist Edge Function.
-- Applied to the hosted project via the Supabase MCP (2026-09-29).

-- Module row. Being is_active, the Stripe webhook's enableModulesForPlan()
-- turns it on automatically for Professional orgs; enable it by hand for others.
insert into modules (key, label, description, is_active)
values ('ai_assist', 'AI Assist', 'AI suggestions that help staff fill out forms faster — staff always review before saving', true)
on conflict (key) do nothing;

-- (The pilot org was enabled separately as a one-off data change, not here.)

-- One row per Claude call, written only by the Edge Function (service role).
-- Holds token counts for cost tracking — never the prompt or response text.
create table if not exists ai_usage (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid references profiles(id) on delete set null,
  task            text not null,
  model           text not null,
  input_tokens    integer not null default 0,
  output_tokens   integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists ai_usage_org_created_idx on ai_usage (organization_id, created_at desc);

alter table ai_usage enable row level security;

-- Org admins/CEOs read their own org's usage; super admins read all.
-- No insert/update/delete policies: only the service role writes.
create policy ai_usage_org_admin_select on ai_usage for select
  using (
    (organization_id = get_my_org_id() and get_my_role() = any (array['org_admin', 'ceo']))
    or get_my_role() = 'super_admin'
  );
