-- Last step of removing the Legacy / Tiered switch (20261123_remove_legacy_access_model.sql).
-- Applied only after the app that no longer reads organizations.access_model is live.
alter table public.organizations drop column access_model;
