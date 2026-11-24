// PointClickCare webhook listener (Step 1 of the integration: read-only).
//
// PointClickCare POSTs a small notification (IDs only) whenever something we
// subscribed to changes: ADT01 (admit, readmit, discharge, transfer, resident
// info, and their cancels), ADT05 (contacts), ALL01/02 (allergies), NUT01/02
// (diet orders). PointClickCare's rules for the listener:
//   - HTTPS with basic auth. The username/password are ours, given to
//     PointClickCare in POST /webhook-subscriptions; here they are the Edge
//     Function secrets PCC_WEBHOOK_USER / PCC_WEBHOOK_PASSWORD. Until both are
//     set this function answers 503 and stores nothing.
//   - Reply 200/201/202/204 with an EMPTY body. 4xx/5xx makes PointClickCare
//     resend after 90 seconds, then every 5 minutes.
//   - Port 443 works for the sandbox and production. The docs list 3443 or
//     30440-30443 for the sandbox, but PointClickCare support confirmed 443 on
//     2026-11-18, so the sandbox subscribes straight to this URL (no relay).
//
// Flow: check auth -> store the message in pcc_webhook_events (message_id is
// unique, so a resend is ignored) -> reply 202 -> process it in the background.
// Processing fetches only the changed record from PointClickCare (2-legged,
// connect2) and updates ElderLoop. Contact, allergy and diet-order events are
// stored as 'deferred' until their mapping is built. Each run also retries a few
// earlier events that failed or never finished, so nothing is lost if a run dies.
//
// verify_jwt is OFF for this function: PointClickCare can't send a Supabase JWT.
// The basic-auth check below is the only way in.
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { applyPatient, clean, type PccPatient } from './apply.ts'

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined

const PCC_BASE = (Deno.env.get('PCC_API_BASE') ?? 'https://connect2.pointclickcare.com').replace(/\/$/, '')
const RETRY_BATCH = 5          // earlier unfinished events retried per incoming message
const MAX_ATTEMPTS = 5
const empty = (status: number) => new Response(null, { status })

// ── Auth ────────────────────────────────────────────────────────
function sameText(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a)
  const eb = new TextEncoder().encode(b)
  let diff = ea.length ^ eb.length
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0)
  return diff === 0
}

// Basic auth: base64 of "username:password" (UTF-8). Returns whether the username
// matched too, so a refused login can be diagnosed without logging the password.
function checkLogin(req: Request, user: string, pass: string): { ok: boolean, userMatched: boolean } {
  const h = req.headers.get('Authorization') ?? ''
  if (!h.startsWith('Basic ')) return { ok: false, userMatched: false }
  let decoded = ''
  try {
    const bin = atob(h.slice(6).trim())
    decoded = new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)))
  } catch { return { ok: false, userMatched: false } }
  const i = decoded.indexOf(':')
  const gotUser = i < 0 ? decoded : decoded.slice(0, i)
  const gotPass = i < 0 ? '' : decoded.slice(i + 1)
  const userMatched = sameText(gotUser.trim(), user)
  const passMatched = sameText(gotPass.trim(), pass)
  return { ok: userMatched && passMatched, userMatched }
}

// ── PointClickCare API ──────────────────────────────────────────

let cachedToken: { value: string, until: number } | null = null
async function pccToken(): Promise<string> {
  if (cachedToken && cachedToken.until > Date.now()) return cachedToken.value
  const id = Deno.env.get('PCC_CLIENT_ID') ?? ''
  const secret = Deno.env.get('PCC_CLIENT_SECRET') ?? ''
  if (!id || !secret) throw new Error('PointClickCare API access is not set up (PCC_CLIENT_ID / PCC_CLIENT_SECRET)')
  const res = await fetch(`${PCC_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${btoa(`${id}:${secret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`PointClickCare sign-in failed (${res.status})`)
  const body = await res.json()
  if (!body?.access_token) throw new Error('PointClickCare sign-in returned no token')
  const life = Number(body.expires_in) > 120 ? Number(body.expires_in) - 60 : 300
  cachedToken = { value: body.access_token, until: Date.now() + life * 1000 }
  return cachedToken.value
}

async function pccGetPatient(token: string, orgUuid: string, patientId: string): Promise<PccPatient | null> {
  const res = await fetch(`${PCC_BASE}/api/public/preview1/orgs/${encodeURIComponent(orgUuid)}/patients/${encodeURIComponent(patientId)}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    signal: AbortSignal.timeout(30000),
  })
  if (res.status === 404) return null
  if (res.status === 429) throw new Error('PointClickCare rate limit reached; will retry')
  if (!res.ok) throw new Error(`PointClickCare patient request failed (${res.status})`)
  return await res.json()
}

// ── Processing one stored event ─────────────────────────────────
const DEFERRED_PREFIXES = ['allergy.', 'nutritionOrder.']
const DEFERRED_EVENTS = ['patient.updateContactInfo']

async function processEvent(admin: SupabaseClient, id: string) {
  const { data: ev } = await admin.from('pcc_webhook_events').select('*').eq('id', id).single()
  if (!ev || ev.status !== 'received') return
  // Claim it (attempts + 1, only if nobody else did) so two runs never work the same event
  const { data: claimed } = await admin.from('pcc_webhook_events').update({ attempts: ev.attempts + 1 })
    .eq('id', id).eq('status', 'received').eq('attempts', ev.attempts).select('id')
  if (!claimed?.length) return
  const attempts = ev.attempts + 1
  const finish = (status: string, result: string | null, error: string | null = null, orgId: string | null = ev.organization_id) =>
    admin.from('pcc_webhook_events').update({
      status, result, error, organization_id: orgId, processed_at: new Date().toISOString(),
    }).eq('id', id)

  try {
    // Which ElderLoop community this facility belongs to
    const { data: orgs } = await admin.from('organizations')
      .select('id, phi_allowed, pcc_facility_id').eq('pcc_org_uuid', ev.org_uuid ?? '')
    const org = (orgs ?? []).find(o => String(o.pcc_facility_id ?? '').trim() === String(ev.fac_id ?? '').trim())
    if (!org) return await finish('ignored', 'No ElderLoop community has this PointClickCare facility', null, null)
    if (!org.phi_allowed) return await finish('ignored', 'Community is not cleared for health data', null, org.id)

    const type = String(ev.event_type)
    if (DEFERRED_EVENTS.includes(type) || DEFERRED_PREFIXES.some(p => type.startsWith(p))) {
      return await finish('deferred', 'Kept for later: contacts, allergies and diet orders are not mapped yet', null, org.id)
    }
    if (!type.startsWith('patient.')) return await finish('ignored', 'Event type not used by ElderLoop', null, org.id)
    if (!ev.pcc_patient_id) return await finish('ignored', 'No patient in the message', null, org.id)

    const token = await pccToken()
    const patient = await pccGetPatient(token, ev.org_uuid, ev.pcc_patient_id)
    if (!patient) return await finish('ignored', 'PointClickCare no longer has this patient', null, org.id)
    const out = await applyPatient(admin, org.id, patient)
    await finish(out.status, out.result, null, org.id)
  } catch (e) {
    const msg = String((e as Error).message ?? e).slice(0, 500)
    await finish(attempts >= MAX_ATTEMPTS ? 'failed' : 'received', null, msg)
  }
}

// Earlier events that failed partway or never got processed (oldest first)
async function retryEarlier(admin: SupabaseClient, skipId: string) {
  const before = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  const { data } = await admin.from('pcc_webhook_events').select('id')
    .eq('status', 'received').lt('attempts', MAX_ATTEMPTS).lt('received_at', before).neq('id', skipId)
    .order('received_at').limit(RETRY_BATCH)
  for (const r of data ?? []) await processEvent(admin, r.id)
}

// ── Listener ────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return empty(405)
  // Spaces or a line break pasted around a secret are ignored (on both sides)
  const rawUser = Deno.env.get('PCC_WEBHOOK_USER') ?? ''
  const rawPass = Deno.env.get('PCC_WEBHOOK_PASSWORD') ?? ''
  const user = rawUser.trim()
  const pass = rawPass.trim()
  if (!user || !pass) return empty(503)
  const login = checkLogin(req, user, pass)
  if (!login.ok) {
    console.warn(`pcc-webhook: login refused (username ${login.userMatched ? 'matched; password did not' : 'did not match'}${rawUser !== user || rawPass !== pass ? '; a saved secret had spaces around it, which are ignored' : ''})`)
    return empty(401)
  }

  let msg: Record<string, unknown>
  try { msg = await req.json() } catch { return empty(400) }
  const messageId = clean(msg?.messageId)
  const eventType = clean(msg?.eventType)
  if (!messageId || !eventType) return empty(400)

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: row, error } = await admin.from('pcc_webhook_events').upsert({
    message_id: messageId.slice(0, 200),
    event_type: eventType.slice(0, 100),
    org_uuid: clean(msg.orgUuid),
    fac_id: msg.facId == null ? null : String(msg.facId),
    pcc_patient_id: msg.patientId == null ? null : String(msg.patientId),
    payload: msg,
  }, { onConflict: 'message_id', ignoreDuplicates: true }).select('id').maybeSingle()
  if (error) {
    console.error('pcc-webhook: could not store message', error.message)
    return empty(500) // PointClickCare will resend
  }

  // A resend of a message we already have comes back with no row: just acknowledge it.
  const work = (async () => {
    if (row?.id) await processEvent(admin, row.id)
    await retryEarlier(admin, row?.id ?? '')
  })().catch(e => console.error('pcc-webhook: processing error', String((e as Error)?.message ?? e)))
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(work)
  else await work

  return empty(202)
})
