-- Add the Marketing section to the AI Add-on settings. Applied via the Supabase MCP (2026-09-30).
-- Keep in sync with TASK_SECTIONS (ai-assist Edge Function) and SECTIONS (AiSettingsTab.jsx).
alter table ai_settings drop constraint ai_settings_section_check;
alter table ai_settings add constraint ai_settings_section_check
  check (section in ('maintenance', 'social_services', 'marketing'));
