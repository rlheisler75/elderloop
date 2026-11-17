// Sends APPROVED items from the PointClickCare outbound queue (pcc_outbound,
// 20261116_pcc_outbound_queue.sql) into PCC. Called by "Send approved now" in the
// queue screen; can also be run on a schedule later.
//
// Safety: nothing is sent unless BOTH are true:
//   - PCC credentials exist (Edge Function secrets PCC_CLIENT_ID / PCC_CLIENT_SECRET,
//     optional PCC_API_BASE), and
//   - PCC_WRITES_ENABLED = 'true'. Leave it unset until the endpoint paths and field
//     names below are checked against the PCC developer portal and tested in the
//     sandbox. Until then the function only reports how many items are waiting.
//
// Who may call it: a signed-in staff member who can approve at least one kind of
// item (pcc_my_permissions().approve), after two-factor (mfa_ok()). It only sends
// that person's community's items, and only kinds they may approve.
//
// Each item: approved -> sending (attempts + 1) -> sent (pcc_ref, sent_at) | failed (error).
// Items stuck in sending longer than STUCK_MINUTES are marked failed at the start of each run
// (never re-sent automatically, since they may already be in PCC).
// After a progress note is sent, the source note gets documented_in_emr = true and
// pcc_document_id = PCC's id. After charges are sent, those meter readings are marked
// billed with reference "PCC <id>" (unless someone already billed them).
// ElderLoop only ever creates records in PCC: it never updates or deletes PCC data.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

// ── PointClickCare API (UNVERIFIED: check against the developer portal) ──
const PCC_BASE = (Deno.env.get('PCC_API_BASE') ?? 'https://connect.pointclickcare.com').replace(/\/$/, '')
const MAX_PER_RUN = 50
const STUCK_MINUTES = 15 // an item still 'sending' after this was interrupted

async function pccToken(): Promise<string> {
  const id = Deno.env.get('PCC_CLIENT_ID') ?? ''
  const secret = Deno.env.get('PCC_CLIENT_SECRET') ?? ''
  const res = await fetch(`${PCC_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${btoa(`${id}:${secret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`PointClickCare sign-in failed (${res.status})`)
  const body = await res.json()
  if (!body?.access_token) throw new Error('PointClickCare sign-in returned no token')
  return body.access_token
}

async function pccPost(token: string, path: string, body: unknown): Promise<string> {
  const res = await fetch(`${PCC_BASE}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`PointClickCare returned ${res.status}: ${text.slice(0, 300)}`)
  let parsed: any = null
  try { parsed = JSON.parse(text) } catch { /* some endpoints return no body */ }
  return String(parsed?.id ?? parsed?.progressNoteId ?? parsed?.chargeId ?? parsed?.contactId ?? res.headers.get('location') ?? 'created')
}

type Item = {
  id: string; kind: 'progress_note' | 'charge' | 'contact_update'; source_table: string; source_id: string | null
  source_ids: string[] | null; payload: any; attempts: number
}

// Several records per item (charge lines, contacts): if one fails after others were
// added, say so, so nobody retries blindly and adds the earlier ones twice.
async function postEach<T>(rows: T[], post: (r: T) => Promise<string>): Promise<string> {
  const ids: string[] = []
  for (const r of rows) {
    try { ids.push(await post(r)) } catch (e) {
      const msg = String((e as Error).message ?? e)
      if (!ids.length) throw e
      throw new Error(`Stopped after ${ids.length} of ${rows.length} were added to PointClickCare (PCC ${ids.join(', ')}). ${msg} Check PointClickCare before retrying so those aren't added twice.`)
    }
  }
  return ids.join(',')
}

async function sendItem(token: string, orgUuid: string, facId: string, item: Item): Promise<string> {
  const p = item.payload
  const base = `/api/public/preview1/orgs/${encodeURIComponent(orgUuid)}`
  if (item.kind === 'progress_note') {
    return await pccPost(token, `${base}/progressnotes`, {
      facId: Number(facId) || facId,
      patientId: Number(p.pcc_patient_id) || p.pcc_patient_id,
      progressNoteType: p.note_type,
      effectiveDate: p.effective_date,
      sections: [{ name: 'Note', value: p.text }],
    })
  }
  if (item.kind === 'charge') {
    // One ancillary charge per line, so each reading is its own entry in PCC.
    return await postEach(p.lines ?? [], (l: any) =>
      pccPost(token, `${base}/patients/${encodeURIComponent(p.pcc_patient_id)}/charges`, {
        facId: Number(facId) || facId,
        effectiveDate: l.reading_date,
        description: `${l.utility ?? 'Utility'} ${l.meter_number ? `meter ${l.meter_number} ` : ''}usage ${l.usage ?? ''} ${l.usage_unit ?? ''}`.trim(),
        quantity: 1,
        amount: Number(l.amount ?? 0),
      }))
  }
  // contact_update: create each contact (PCC de-duplication rules to be confirmed in the sandbox)
  return await postEach(p.contacts ?? [], (c: any) =>
    pccPost(token, `${base}/patients/${encodeURIComponent(p.pcc_patient_id)}/contacts`, {
      facId: Number(facId) || facId,
      fullName: c.name, relationship: c.relationship, phone: c.phone, alternatePhone: c.alt_phone,
      email: c.email, isPrimaryContact: !!c.is_primary,
    }))
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const authHeader = req.headers.get('Authorization') ?? ''
    const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await asCaller.auth.getUser()
    if (!user) return json({ success: false, error: 'Not signed in' }, 401)
    const { data: mfaOk } = await asCaller.rpc('mfa_ok')
    if (!mfaOk) return json({ success: false, error: 'Two-factor sign-in required' }, 403)
    const { data: perms } = await asCaller.rpc('pcc_my_permissions')
    const kinds: string[] = perms?.approve ?? []
    if (!kinds.length) return json({ success: false, error: 'You can\'t send items to PointClickCare' }, 403)

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const { data: me } = await admin.from('profiles').select('organization_id').eq('id', user.id).single()
    const orgId = me?.organization_id
    if (!orgId) return json({ success: false, error: 'No community' }, 400)

    // Self-recovery: an item left in 'sending' (the function stopped mid-send) is marked
    // failed, never retried automatically, because it may already be in PCC. The failed
    // bell tells the approver to check PCC before pressing Retry.
    const stuckBefore = new Date(Date.now() - STUCK_MINUTES * 60 * 1000).toISOString()
    const { data: recovered } = await admin.from('pcc_outbound')
      .update({
        status: 'failed', updated_at: new Date().toISOString(),
        error: `Sending was interrupted. It may or may not have reached PointClickCare: check the resident's record in PointClickCare before pressing Retry, so it isn't added twice.`,
      })
      .eq('organization_id', orgId).eq('status', 'sending').in('kind', kinds).lt('updated_at', stuckBefore)
      .select('id')

    const { count: waiting } = await admin.from('pcc_outbound').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId).eq('status', 'approved').in('kind', kinds)

    const configured = !!(Deno.env.get('PCC_CLIENT_ID') && Deno.env.get('PCC_CLIENT_SECRET'))
    const writesOn = Deno.env.get('PCC_WRITES_ENABLED') === 'true'
    if (!configured || !writesOn) {
      return json({
        success: true, sent: 0, failed: 0, recovered: recovered?.length ?? 0, waiting: waiting ?? 0, configured, writes_enabled: writesOn,
        message: !configured
          ? 'PointClickCare isn\'t connected yet. Approved items will wait here and go out once the connection is set up.'
          : 'Sending to PointClickCare is switched off until the integration is verified in the sandbox. Approved items are waiting.',
      })
    }

    const { data: org } = await admin.from('organizations').select('pcc_facility_id, pcc_org_uuid, phi_allowed').eq('id', orgId).single()
    if (!org?.phi_allowed || !org?.pcc_facility_id || !org?.pcc_org_uuid) {
      return json({ success: false, error: 'This community needs health data on, a PCC Facility ID and a PCC Org UUID first.' }, 400)
    }

    const { data: items } = await admin.from('pcc_outbound')
      .select('id, kind, source_table, source_id, source_ids, payload, attempts')
      .eq('organization_id', orgId).eq('status', 'approved').in('kind', kinds)
      .order('created_at').limit(MAX_PER_RUN)

    const token = await pccToken()
    let sent = 0, failed = 0
    for (const item of (items ?? []) as Item[]) {
      // claim it so two runs never send the same item twice
      const { data: claimed } = await admin.from('pcc_outbound')
        .update({ status: 'sending', attempts: item.attempts + 1, updated_at: new Date().toISOString() })
        .eq('id', item.id).eq('status', 'approved').select('id')
      if (!claimed?.length) continue
      try {
        const ref = await sendItem(token, org.pcc_org_uuid, org.pcc_facility_id, item)
        const now = new Date().toISOString()
        await admin.from('pcc_outbound').update({ status: 'sent', pcc_ref: ref, sent_at: now, error: null, updated_at: now }).eq('id', item.id)
        if (item.kind === 'progress_note' && item.source_id && ['ss_case_notes', 'ss_discharge_plans'].includes(item.source_table)) {
          await admin.from(item.source_table).update({ documented_in_emr: true, pcc_document_id: ref }).eq('id', item.source_id)
        }
        if (item.kind === 'charge' && item.source_ids?.length) {
          await admin.from('meter_readings').update({ billed_at: now, billed_by: user.id, billing_reference: `PCC ${ref}`.slice(0, 200) })
            .in('id', item.source_ids).is('billed_at', null)
        }
        sent++
      } catch (e) {
        failed++
        await admin.from('pcc_outbound').update({ status: 'failed', error: String((e as Error).message ?? e).slice(0, 1000), updated_at: new Date().toISOString() }).eq('id', item.id)
      }
    }
    return json({ success: true, sent, failed, recovered: recovered?.length ?? 0, waiting: Math.max(0, (waiting ?? 0) - sent - failed), configured, writes_enabled: writesOn })
  } catch (e) {
    console.error('send-pcc-outbound', e)
    return json({ success: false, error: String((e as Error).message ?? e) }, 500)
  }
})
