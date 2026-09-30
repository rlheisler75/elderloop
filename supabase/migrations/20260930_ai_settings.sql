-- AI Add-on settings: per-org, per-section on/off + model choice, read by the
-- ai-assist Edge Function on every call. Applied via the Supabase MCP (2026-09-30).

create table if not exists ai_settings (
  organization_id uuid not null references organizations(id) on delete cascade,
  section         text not null check (section in ('maintenance', 'social_services')),
  enabled         boolean not null default true,
  -- Whitelisted again in the Edge Function; unknown values fall back to the default
  model           text not null default 'claude-haiku-4-5-20251001'
                  check (model in ('claude-haiku-4-5-20251001', 'claude-sonnet-5', 'claude-opus-5')),
  updated_by      uuid references profiles(id) on delete set null,
  updated_at      timestamptz not null default now(),
  primary key (organization_id, section)
);

alter table ai_settings enable row level security;

-- Everyone in the org can read (forms hide AI buttons for disabled sections)
create policy ai_settings_org_select on ai_settings for select
  using (organization_id = get_my_org_id() or get_my_role() = 'super_admin');

-- Org admins / CEOs manage their own org; super admins any org
create policy ai_settings_admin_write on ai_settings for all
  using (
    (organization_id = get_my_org_id() and get_my_role() = any (array['org_admin', 'ceo']))
    or get_my_role() = 'super_admin'
  )
  with check (
    (organization_id = get_my_org_id() and get_my_role() = any (array['org_admin', 'ceo']))
    or get_my_role() = 'super_admin'
  );

-- AI is a paid add-on, not part of Professional: keep the Stripe webhook's
-- enableModulesForPlan() (which enables every *active* module for Professional)
-- from turning it on. Enable ai_assist per org by hand when they buy the add-on.
update modules set is_active = false where key = 'ai_assist';
