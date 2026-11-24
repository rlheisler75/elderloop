-- Help & Feedback: which build a message was sent from. The app stamps its build
-- version (src/lib/appVersion.js, e.g. "2026.11.24 (f42a0cd)") on every message, and
-- Super Admin → Help & Feedback shows it. Apply BEFORE deploying the app that sends it,
-- or sending feedback fails on the unknown column.
alter table public.platform_feedback
  add column if not exists app_version text
  constraint platform_feedback_app_version_len check (app_version is null or length(app_version) <= 60);
