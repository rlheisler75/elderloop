import { supabase } from './supabase'

// Residents' birth date and admission date can't be read with a plain select:
// the database grants SELECT only on RESIDENT_COLS
// (20261111_resident_private_dates.sql). Selecting '*' or one of those columns
// fails. They come from resident_private_fields(): Nursing (any level), the
// people who see emergency contacts, Property, and portal logins for their own
// resident. Everyone else gets nothing back.
export const RESIDENT_COLS = [
  'id', 'organization_id', 'first_name', 'last_name', 'unit', 'building', 'phone', 'is_active',
  'created_at', 'middle_name', 'room', 'photo_url', 'care_level', 'show_in_directory',
  'profile_id', 'barcode', 'pcc_patient_id', 'sms_opt_in', 'sms_opt_in_at', 'sms_opt_in_by', 'location_id',
].join(',')

// Adds date_of_birth / admission_date the caller may see to each resident row (by id).
export async function withResidentDates(rows) {
  if (!rows?.length) return rows || []
  const { data, error } = await supabase.rpc('resident_private_fields', { p_ids: rows.map(r => r.id) })
  if (error) { console.error('resident_private_fields', error); return rows }
  const byId = new Map((data || []).map(d => [d.id, d]))
  return rows.map(r => ({ ...r, ...(byId.get(r.id) || {}) }))
}
