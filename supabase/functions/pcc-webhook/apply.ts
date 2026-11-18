// Brings one ElderLoop resident in line with PointClickCare (used by pcc-webhook).
// Kept in its own file so it can be tested without Deno or a live database.
// Keep the matching rules in step with sync-pcc-residents.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export type PccPatient = {
  patientId: number | string
  firstName?: string; middleName?: string; lastName?: string
  birthDate?: string; roomDesc?: string; bedDesc?: string; unitDesc?: string
  admissionDate?: string; patientStatus?: string
}

export const clean = (v: unknown) => { const s = String(v ?? '').trim(); return s || null }
const isoDate = (v: unknown) => { const s = clean(v); return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null }
const lower = (v: unknown) => String(v ?? '').trim().toLowerCase()

function pccToResident(p: PccPatient) {
  const room = clean(p.roomDesc)
  const bed = clean(p.bedDesc)
  return {
    pcc_patient_id: String(p.patientId),
    first_name: clean(p.firstName),
    middle_name: clean(p.middleName),
    last_name: clean(p.lastName),
    date_of_birth: isoDate(p.birthDate),
    room: room && bed ? `${room}-${bed}` : room,
    unit: clean(p.unitDesc),
    admission_date: isoDate(p.admissionDate),
  }
}

function changedFields(existing: Record<string, unknown>, incoming: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(incoming)) {
    if (v == null) continue
    if (existing[k] !== v) out[k] = v
  }
  return out
}

const RES_COLS = 'id, pcc_patient_id, first_name, middle_name, last_name, date_of_birth, room, unit, admission_date, is_active'
export type Outcome = { status: 'processed' | 'ignored' | 'review', result: string }

// Bring one ElderLoop resident in line with PointClickCare's current record.
// The same logic serves every ADT event, cancels included: whatever happened,
// PointClickCare's record now says where the patient stands.
export async function applyPatient(admin: SupabaseClient, orgId: string, p: PccPatient): Promise<Outcome> {
  const incoming = pccToResident(p)
  const status = lower(p.patientStatus)
  const inHouse = status === 'current' || status === 'new'

  // 1. Already linked by PointClickCare's patientId
  const { data: linked, error: e1 } = await admin.from('residents').select(RES_COLS)
    .eq('organization_id', orgId).eq('pcc_patient_id', incoming.pcc_patient_id).limit(2)
  if (e1) throw new Error(e1.message)
  let match = linked?.[0] ?? null
  let how = 'updated'

  // 2. Not linked: same name + birth date. Linked residents count too, because
  //    PointClickCare issues a new patientId when someone moves to another of
  //    the organization's facilities. Name alone only for unlinked residents.
  if (!match) {
    if (!inHouse) return { status: 'ignored', result: 'Not an ElderLoop resident and not in the building; nothing to do' }
    if (!incoming.first_name || !incoming.last_name) return { status: 'ignored', result: 'PointClickCare record has no name' }
    const { data: sameName, error: e2 } = await admin.from('residents').select(RES_COLS)
      .eq('organization_id', orgId).ilike('first_name', incoming.first_name).ilike('last_name', incoming.last_name)
    if (e2) throw new Error(e2.message)
    const named = (sameName ?? []).filter(r => lower(r.first_name) === lower(incoming.first_name) && lower(r.last_name) === lower(incoming.last_name))
    const byDob = incoming.date_of_birth ? named.filter(r => r.date_of_birth === incoming.date_of_birth) : []
    if (byDob.length > 1) return { status: 'review', result: 'More than one ElderLoop resident has this name and birth date' }
    if (byDob.length === 1) match = byDob[0]
    else {
      const unlinked = named.filter(r => !r.pcc_patient_id)
      if (unlinked.length > 1) return { status: 'review', result: 'More than one ElderLoop resident has this name' }
      if (unlinked.length === 1 && (!incoming.date_of_birth || !unlinked[0].date_of_birth)) match = unlinked[0]
    }
    how = match ? 'linked' : 'created'
  }

  if (!match) {
    const { error } = await admin.from('residents').insert({
      ...incoming,
      organization_id: orgId,
      care_level: 'skilled_nursing', // PointClickCare has no ElderLoop care level; staff adjust it
      is_active: true,
    })
    if (error) throw new Error(error.message)
    return { status: 'processed', result: 'Resident added' }
  }

  const changes = changedFields(match, incoming)
  if (inHouse && match.is_active === false) { changes.is_active = true; how = 'readmitted' }
  if (status === 'discharged' && match.is_active !== false) { changes.is_active = false; how = 'discharged' }
  if (!Object.keys(changes).length) return { status: 'processed', result: 'Resident already up to date' }
  const { error } = await admin.from('residents').update(changes).eq('id', match.id)
  if (error) throw new Error(error.message)
  const label: Record<string, string> = {
    updated: 'Resident updated', linked: 'Resident linked to PointClickCare',
    readmitted: 'Resident readmitted (active again)', discharged: 'Resident discharged (marked inactive)',
  }
  return { status: 'processed', result: label[how] ?? 'Resident updated' }
}
