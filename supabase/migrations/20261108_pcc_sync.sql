-- PointClickCare resident sync (supabase/functions/sync-pcc-residents).
-- PCC's API addresses a customer by its Org UUID plus a Facility ID, so the org
-- needs both. pcc_last_synced_at is stamped after each sync for the Admin Panel.
-- One ElderLoop resident per PCC patient within a community.

alter table public.organizations
  add column if not exists pcc_org_uuid text,
  add column if not exists pcc_last_synced_at timestamptz;

create unique index if not exists residents_org_pcc_patient_id_key
  on public.residents (organization_id, pcc_patient_id)
  where pcc_patient_id is not null;
