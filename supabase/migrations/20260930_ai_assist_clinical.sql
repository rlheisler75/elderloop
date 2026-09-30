-- Clinical AI switch: gates ai-assist tasks that handle resident health
-- information (currently ss_case_note). Applied via the Supabase MCP (2026-09-30).
--
-- is_active = false on purpose: the Stripe webhook's enableModulesForPlan()
-- turns on every *active* module for Professional orgs, and this must stay off
-- for real customers until a HIPAA BAA with Anthropic is signed. Enable it per
-- org by hand (the demo org Sunrise Gardens was enabled as a one-off change).
insert into modules (key, label, description, is_active)
values ('ai_assist_clinical', 'AI Assist — Clinical',
        'AI help with resident-health documentation (Social Services case notes). Requires a HIPAA BAA before enabling for real customers.',
        false)
on conflict (key) do nothing;
