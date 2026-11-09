// Pulls a community's current residents from PointClickCare into `residents`
// (read-only toward PCC). Called by Sync Now on the Import Residents screen.
//
// Who may: Org Admins for their own community, super admins for any, after
// passing two-factor sign-in where it's required (mfa_ok()). The
// community needs a PCC Facility ID and Org UUID (Admin Panel → Org Settings)
// and must be cleared for health data (phi_allowed), since PCC records are PHI.
//
// Matching, in order: residents.pcc_patient_id; then an unlinked resident with
// the same first + last name and date of birth (or the same name alone when
// exactly one unlinked resident has it and either side lacks a birth date).
// More than one name match is left alone and returned under needs_review, so
// a sync never creates a duplicate or links the wrong person.
//
// Discharges: a linked resident who is no longer in PCC's current census is
// marked inactive, but only after every page came back and the census wasn't
// empty, so a failed or partial PCC response can't deactivate a whole building.
// Residents never linked to PCC (e.g. Independent Living) are never touched.
//
// Updates never blank a field: a value missing from PCC keeps what ElderLoop
// has. care_level, building, location_id, photos and consent are ElderLoop's.
//
// PCC credentials are Edge Function secrets: PCC_CLIENT_ID, PCC_CLIENT_SECRET,
// and optionally PCC_API_BASE. The endpoint paths and field names below follow
// PCC's published API shape; check them against the developer portal once
// PointClickCare grants access (everything PCC-specific is in this block).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

// ── PointClickCare API ──────────────────────────────────────────
const PCC_BASE = (Deno.env.get('PCC_API_BASE') ?? 'https://connect.pointclickcare.com').replace(/\/$/, '')
const PAGE_SIZE = 200
const MAX_PAGES = 50 // 10,000 residents; stops a runaway paging loop

type PccPatient = {
  patientId: number | string
  firstName?: string
  middleName?: string
  lastName?: string
  birthDate?: string
  roomDesc?: string
  bedDesc?: string
  unitDesc?: string
  admissionDate?: string
  patientStatus?: string
}

async function pccToken(): Promise<string> {
  const id = Deno.env.get('PCC_CLIENT_ID') ?? ''
  const secret = Deno.env.get('PCC_CLIENT_SECRET') ?? ''
  const res = await fetch(`${PCC_BASE}/auth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${id}:${secret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`PointClickCare sign-in failed (${res.status})`)
  const body = await res.json()
  if (!body?.access_token) throw new Error('PointClickCare sign-in returned no token')
  return body.access_token
}

// Every current resident in the facility, or an error. Never a partial list.
async function pccCurrentPatients(token: string, orgUuid: string, facId: string): Promise<PccPatient[]> {
  const all: PccPatient[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const qs = new URLSearchParams({ facId, patientStatus: 'Current', page: String(page), pageSize: String(PAGE_SIZE) })
    const res = await fetch(`${PCC_BASE}/api/public/preview1/orgs/${encodeURIComponent(orgUuid)}/patients?${qs}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) throw new Error(`PointClickCare residents request failed (${res.status}, page ${page})`)
    const body = await res.json()
    const rows: PccPatient[] = Array.isArray(body?.data) ? body.data : []
    all.push(...rows)
    const hasMore = body?.paging?.hasMore ?? rows.length === PAGE_SIZE
    if (!hasMore) return all
  }
  throw new Error(`PointClickCare returned more than ${MAX_PAGES} pages; stopped without changing anything`)
}

// ── Mapping ─────────────────────────────────────────────────────
const clean = (v: unknown) => {
  const s = String(v ?? '').trim()
  return s || null
}
const isoDate = (v: unknown) => {
  const s = clean(v)
  return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null
}
const nameKey = (first: unknown, last: unknown) =>
  `${String(first ?? '').trim().toLowerCase()}|${String(last ?? '').trim().toLowerCase()}`

// Room and bed together as "103-1", the form residentPlace() and the resident form use
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

// Only fields PCC actually sent, and only those that differ
function changedFields(existing: Record<string, unknown>, incoming: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(incoming)) {
    if (v == null) continue
    if (existing[k] !== v) out[k] = v
  }
  return out
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const authHeader = req.headers.get('Authorization') ?? ''
    const { organization_id } = await req.json()
    if (!organization_id) return json({ success: false, error: 'organization_id is required' })

    const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: { user } } = await asCaller.auth.getUser()
    if (!user) return json({ success: false, error: 'Not signed in' }, 401)
    // PCC records are health data: the caller must have passed two-factor if they're required to
    const { data: mfaOk } = await asCaller.rpc('mfa_ok')
    if (mfaOk !== true) return json({ success: false, error: 'Finish two-factor sign-in before syncing from PointClickCare' }, 403)

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: caller } = await admin.from('profiles')
      .select('email, role, organization_id').eq('id', user.id).single()
    const isSuperAdmin = caller?.role === 'super_admin'
    if (!caller || !(isSuperAdmin || (caller.role === 'org_admin' && caller.organization_id === organization_id))) {
      return json({ success: false, error: 'Only an Org Admin of this community can sync from PointClickCare' }, 403)
    }

    const { data: org } = await admin.from('organizations')
      .select('pcc_facility_id, pcc_org_uuid, phi_allowed').eq('id', organization_id).single()
    if (!org?.pcc_facility_id || !org?.pcc_org_uuid) {
      return json({ success: false, error: 'Set both the PointClickCare Facility ID and Org UUID in Admin Panel → Org Settings first' })
    }
    if (!org.phi_allowed) {
      return json({ success: false, error: 'This community is not yet cleared for health data (BAA), so PointClickCare sync is off' })
    }
    if (!Deno.env.get('PCC_CLIENT_ID') || !Deno.env.get('PCC_CLIENT_SECRET')) {
      return json({ success: false, error: "PointClickCare API access isn't set up for ElderLoop yet" })
    }

    // Fetch everything from PCC before writing anything
    const token = await pccToken()
    const patients = (await pccCurrentPatients(token, org.pcc_org_uuid, org.pcc_facility_id))
      .filter(p => p.patientId != null && clean(p.firstName) && clean(p.lastName))

    const { data: existingRows, error: exErr } = await admin.from('residents')
      .select('id, pcc_patient_id, first_name, middle_name, last_name, date_of_birth, room, unit, admission_date, is_active')
      .eq('organization_id', organization_id)
    if (exErr) return json({ success: false, error: exErr.message }, 500)
    const existing = existingRows ?? []

    const byPccId = new Map(existing.filter(r => r.pcc_patient_id).map(r => [r.pcc_patient_id, r]))
    const unlinkedByName = new Map<string, typeof existing>()
    for (const r of existing.filter(r => !r.pcc_patient_id)) {
      const k = nameKey(r.first_name, r.last_name)
      unlinkedByName.set(k, [...(unlinkedByName.get(k) ?? []), r])
    }

    let created = 0, updated = 0, linked = 0, unchanged = 0, failed = 0
    const errors: string[] = []
    const needs_review: { pcc_patient_id: string, name: string, reason: string }[] = []
    const seen = new Set<string>()

    for (const p of patients) {
      const incoming = pccToResident(p)
      seen.add(incoming.pcc_patient_id)
      const label = `${incoming.first_name} ${incoming.last_name}`

      let match = byPccId.get(incoming.pcc_patient_id)
      let linking = false
      if (!match) {
        const candidates = (unlinkedByName.get(nameKey(incoming.first_name, incoming.last_name)) ?? [])
        const dobMatches = incoming.date_of_birth ? candidates.filter(r => r.date_of_birth === incoming.date_of_birth) : []
        if (dobMatches.length === 1) match = dobMatches[0]
        else if (dobMatches.length > 1) {
          needs_review.push({ pcc_patient_id: incoming.pcc_patient_id, name: label, reason: 'More than one ElderLoop resident has this name and birth date' })
          continue
        } else if (candidates.length === 1 && (!incoming.date_of_birth || !candidates[0].date_of_birth)) {
          match = candidates[0]
        } else if (candidates.length > 1) {
          needs_review.push({ pcc_patient_id: incoming.pcc_patient_id, name: label, reason: 'More than one ElderLoop resident has this name' })
          continue
        }
        // A same-name resident with a different birth date is someone else: falls through to create
        if (match) {
          linking = true
          unlinkedByName.set(nameKey(match.first_name, match.last_name),
            (unlinkedByName.get(nameKey(match.first_name, match.last_name)) ?? []).filter(r => r.id !== match!.id))
        }
      }

      if (match) {
        const changes = changedFields(match, incoming)
        if (match.is_active === false) changes.is_active = true // readmitted
        if (!Object.keys(changes).length) { unchanged++; continue }
        const { error } = await admin.from('residents').update(changes).eq('id', match.id)
        if (error) { failed++; errors.push(`${label}: ${error.message}`); continue }
        if (linking) linked++; else updated++
      } else {
        const { error } = await admin.from('residents').insert({
          ...incoming,
          organization_id,
          // PCC has no ElderLoop care level; staff adjust it on the resident form
          care_level: 'skilled_nursing',
          is_active: true,
        })
        if (error) { failed++; errors.push(`${label}: ${error.message}`); continue }
        created++
      }
    }

    // Discharged: linked, still active here, missing from PCC's full current census
    let deactivated = 0
    if (patients.length > 0) {
      const gone = existing.filter(r => r.pcc_patient_id && r.is_active !== false && !seen.has(r.pcc_patient_id))
      if (gone.length) {
        const { error } = await admin.from('residents').update({ is_active: false }).in('id', gone.map(r => r.id))
        if (error) errors.push(`Marking discharged residents inactive: ${error.message}`)
        else deactivated = gone.length
      }
    }

    await admin.from('organizations').update({ pcc_last_synced_at: new Date().toISOString() }).eq('id', organization_id)

    // Counts only; no resident names or details in the log
    const summary = { pcc_current: patients.length, created, updated, linked, unchanged, deactivated, failed, needs_review: needs_review.length }
    const { error: auditErr } = await admin.from('audit_log').insert({
      organization_id,
      user_id: user.id,
      user_email: caller.email ?? user.email,
      user_role: caller.role,
      action: 'PCC_SYNC',
      table_name: 'residents',
      new_values: summary,
      notes: 'Residents synced from PointClickCare',
    })
    if (auditErr) console.error('PCC sync audit insert failed:', auditErr.message)

    return json({ success: true, synced: created + updated + linked, ...summary, errors, needs_review })
  } catch (err) {
    console.error('sync-pcc-residents error:', err instanceof Error ? err.message : String(err))
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
