import { supabase } from './supabase'

// Personal contact fields on profiles (personal phone, cell phone, emergency
// contact, HR notes) can't be read with a plain select: the database grants
// SELECT only on PROFILE_COLS (20261111_profile_private_fields.sql). Selecting
// '*' or one of these columns fails. They come from profile_private_fields(),
// which returns them only for yourself, or to Supervisor+, HR, and admins in
// your community. Staff-level employees get nothing for anyone else.
export const PROFILE_PRIVATE_FIELDS = ['phone', 'cell_phone', 'emergency_contact_name', 'emergency_contact_phone', 'notes']

export const PROFILE_COLS = [
  'id', 'organization_id', 'role', 'first_name', 'last_name', 'avatar_url', 'is_active',
  'created_at', 'updated_at', 'department', 'hire_date', 'job_title', 'status', 'email',
  'work_phone', 'office_location', 'bio', 'directory_public', 'accent_color', 'notify_email',
  'notify_push', 'theme_mode', 'must_change_password', 'is_platform_admin', 'corporation_id',
  'sms_opt_in', 'sms_opt_in_at', 'employment_end_date',
].join(',')

// Adds the private fields the caller may see to each profile row (by id).
// Rows the caller may not see privately are returned unchanged.
export async function withPrivateFields(rows) {
  if (!rows?.length) return rows || []
  const { data, error } = await supabase.rpc('profile_private_fields', { p_ids: rows.map(r => r.id) })
  if (error) { console.error('profile_private_fields', error); return rows }
  const byId = new Map((data || []).map(d => [d.id, d]))
  return rows.map(r => ({ ...r, ...(byId.get(r.id) || {}) }))
}

export async function withPrivateField(row) {
  if (!row) return row
  return (await withPrivateFields([row]))[0]
}
