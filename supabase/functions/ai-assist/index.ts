// ai-assist — server-side entry point for every ElderLoop AI feature.
//
// The Anthropic key lives only in this function's secrets (ANTHROPIC_API_KEY);
// the browser never calls Claude directly. Each request is:
//   1. authenticated (Supabase JWT from the caller),
//   2. gated on the org having the `ai_assist` module enabled,
//   3. dispatched by `task` to a handler that returns a *suggestion* only —
//      the UI always lets a person review before anything is saved.
//
// Tasks:
//   wo_triage — suggest category / subcategory / priority and a cleaned-up
//               description for a new work order from its title + description.
//               No resident health data involved.
//   ss_case_note — turn a social worker's rough notes into a structured DAP
//               case note + follow-up suggestion. CLINICAL: resident health
//               information, so it also requires the org's `ai_assist_clinical`
//               module, which stays off for real customers until a HIPAA BAA
//               with Anthropic is signed. The resident's name is never sent.
//
// Deploy: supabase functions deploy ai-assist
// Secrets: ANTHROPIC_API_KEY (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are built in)

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js@2'

// To switch models, change this one line. Haiku is ~5x cheaper than Opus 5;
// the options below adapt automatically (Haiku 4.5 rejects `effort` and has no
// server-side refusal fallback).
const MODEL = 'claude-haiku-4-5-20251001'
const IS_HAIKU = MODEL.startsWith('claude-haiku')
const DAILY_LIMIT = 200 // Claude calls per org per rolling 24h
// Tasks that handle resident health information (see header)
const CLINICAL_TASKS = ['ss_case_note']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // ── Verify caller ─────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return json({ error: 'Missing Authorization header' }, 401)

  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid or expired session' }, 401)

  const { data: profile } = await admin
    .from('profiles').select('id, role, organization_id').eq('id', user.id).single()

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  // Super admins have no org of their own; they pass the impersonated org explicitly
  const orgId = profile?.role === 'super_admin'
    ? (body.organization_id as string) || profile?.organization_id
    : profile?.organization_id
  if (!orgId || !/^[0-9a-f-]{36}$/i.test(orgId)) return json({ error: 'No organization' }, 403)

  // ── Org must have AI Assist switched on ───────────────────────
  const { data: mod } = await admin
    .from('organization_modules').select('is_enabled')
    .eq('organization_id', orgId).eq('module_key', 'ai_assist').maybeSingle()
  if (!mod || mod.is_enabled === false) return json({ error: 'AI Assist is not enabled for this organization' }, 403)

  // ── Daily per-org cap ─────────────────────────────────────────
  // Bounds spend — the public demo logins (Sunrise Gardens) can reach this too.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('ai_usage').select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId).gte('created_at', since)
  if ((count ?? 0) >= DAILY_LIMIT) return json({ error: 'Daily AI limit reached for this organization. Please try again tomorrow.' }, 429)

  // ── Clinical tasks need the separate clinical switch ──────────
  if (CLINICAL_TASKS.includes(body.task as string)) {
    const { data: clin } = await admin
      .from('organization_modules').select('is_enabled')
      .eq('organization_id', orgId).eq('module_key', 'ai_assist_clinical').maybeSingle()
    if (!clin || clin.is_enabled === false) return json({ error: 'Clinical AI is not enabled for this organization' }, 403)
  }

  try {
    switch (body.task) {
      case 'wo_triage':    return json(await woTriage(orgId, user.id, body))
      case 'ss_case_note': return json(await ssCaseNote(orgId, user.id, body))
      default:             return json({ error: 'Unknown task' }, 400)
    }
  } catch (err) {
    console.error('ai-assist error:', err)
    return json({ error: 'AI suggestion failed. Please fill the fields in manually.' }, 502)
  }
})

// ── Shared Claude call ────────────────────────────────────────────
// Returns parsed JSON matching `schema`, or null if the model declined.
async function askClaude(orgId: string, userId: string, task: string, system: string, prompt: string, schema: object) {
  const response = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: 2000,
    ...(IS_HAIKU
      ? { output_config: { format: { type: 'json_schema', schema } } }
      : {
          // Server-side fallback: if a safety classifier declines, Anthropic re-runs
          // the request on its recommended fallback model instead of failing.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          // Routine classification — low effort keeps it fast and cheap
          output_config: { effort: 'low', format: { type: 'json_schema', schema } },
        }),
    system,
    messages: [{ role: 'user', content: prompt }],
  // deno-lint-ignore no-explicit-any
  } as any)

  // Usage log for per-org cost tracking; a failed insert never fails the request
  const { error: usageError } = await admin.from('ai_usage').insert({
    organization_id: orgId,
    user_id:         userId,
    task,
    model:           response.model,
    input_tokens:    response.usage?.input_tokens ?? 0,
    output_tokens:   response.usage?.output_tokens ?? 0,
  })
  if (usageError) console.error('ai_usage insert failed:', usageError.message)

  if (response.stop_reason === 'refusal') return null
  const text = response.content.find((b: { type: string }) => b.type === 'text') as { text: string } | undefined
  return text ? JSON.parse(text.text) : null
}

// ── wo_triage ─────────────────────────────────────────────────────
async function woTriage(orgId: string, userId: string, body: Record<string, unknown>) {
  const title = String(body.title || '').slice(0, 300)
  const description = String(body.description || '').slice(0, 4000)
  if (!title.trim() && !description.trim()) throw new Error('Nothing to triage')

  // The org's active categories (global starters + their own)
  const { data: cats } = await admin
    .from('wo_categories').select('id, key, label, parent_id')
    .or(`organization_id.is.null,organization_id.eq.${orgId}`)
    .eq('is_active', true)
  const top = (cats || []).filter(c => !c.parent_id)
  const subs = (cats || []).filter(c => c.parent_id)
  const catKeys = top.map(c => c.key)
  const subKeys = [...new Set(subs.map(c => c.key))]

  const catalog = top.map(c => {
    const children = subs.filter(s => s.parent_id === c.id)
    return `- ${c.key} (${c.label})` +
      (children.length ? `\n  subcategories: ${children.map(s => `${s.key} (${s.label})`).join(', ')}` : '')
  }).join('\n')

  const schema = {
    type: 'object',
    properties: {
      category:    { type: 'string', enum: catKeys.length ? catKeys : ['other'] },
      subcategory: { type: 'string', enum: ['', ...subKeys] },
      priority:    { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
      reason:      { type: 'string' },
      description: { type: 'string' },
    },
    required: ['category', 'subcategory', 'priority', 'reason', 'description'],
    additionalProperties: false,
  }

  const system = `You triage maintenance work orders for a senior living community.
Pick the single best category (and a subcategory only if one clearly fits and belongs to that category; otherwise "").
If a "safety" category is listed, use it when the main issue is a hazard to residents (loose handrail, broken glass, trip hazard) rather than routine repair — that's how this app's own templates file them.
Priority guide — residents are older adults, so weigh fall, fire, water, and temperature risks heavily:
- urgent: immediate danger or major damage — fall/trip hazard, gas smell, sparking/burning, flooding, no heat in cold weather or no cooling in heat, broken exterior door/lock, fire/life-safety equipment
- high: important function lost or getting worse — outlet dead, toilet unusable, appliance a resident depends on, pests
- normal: needs fixing but no risk — drips, sticking doors, minor damage
- low: cosmetic or routine — paint, bulbs, filter changes, cleanup
"reason" is one short sentence staff will see explaining the priority.
"description" is a clear work order description for the technician, 2-4 short sentences in plain language:
what the problem is, where it is, and what was observed. For urgent hazards, add one line on keeping residents
safe until it's fixed (e.g. block off the area). Use ONLY facts from the title and description — never invent
room numbers, causes, or details. If the input is vague, keep the description short rather than guessing.

Categories:
${catalog}`

  const result = await askClaude(orgId, userId, 'wo_triage', system,
    `Title: ${title}\nDescription: ${description || '(none)'}`, schema)
  if (!result) return { suggestion: null }

  // Drop a subcategory that doesn't belong to the chosen category
  const parent = top.find(c => c.key === result.category)
  const validSub = subs.some(s => s.key === result.subcategory && s.parent_id === parent?.id)
  return { suggestion: { ...result, subcategory: validSub ? result.subcategory : '' } }
}

// ── ss_case_note (CLINICAL) ───────────────────────────────────────
const CONTACT_LABELS: Record<string, string> = {
  in_person: 'In person', phone_call: 'Phone call', family_meeting: 'Family meeting', email: 'Email', other: 'Other',
}

async function ssCaseNote(orgId: string, userId: string, body: Record<string, unknown>) {
  const notes = String(body.notes || '').slice(0, 6000)
  if (!notes.trim()) throw new Error('Nothing to polish')
  const contact = CONTACT_LABELS[String(body.contact_type)] || 'Other'

  const schema = {
    type: 'object',
    properties: {
      note:             { type: 'string' },
      follow_up_needed: { type: 'boolean' },
      follow_up_reason: { type: 'string' },
    },
    required: ['note', 'follow_up_needed', 'follow_up_reason'],
    additionalProperties: false,
  }

  const system = `You help social workers in a senior living community write case notes.
Rewrite the social worker's rough notes as a professional case note in DAP format, using exactly these three labeled sections:
Data: what was observed, reported, or discussed — the facts, including direct quotes when the notes contain them.
Assessment: the social worker's professional impression as stated or clearly implied in the notes (mood, coping, needs, risks).
Plan: next steps, referrals, and follow-up as given in the notes.

Rules:
- Use ONLY information in the notes. Never add diagnoses, causes, events, names, or plans that aren't there. If a section has nothing to go on, write "None noted."
- Refer to the person as "the resident" (no names). Keep other people's roles as written (e.g. "the resident's daughter").
- Objective, respectful, person-centered language; no slang or judgmental wording. Plain sentences, concise.
- Keep any safety concern (falls, self-harm statements, abuse/neglect, wandering) clearly visible in Data and Plan.

"follow_up_needed" is true if the notes describe anything that needs a later action or check-in.
"follow_up_reason" is one short sentence saying why (or "" when false).`

  const result = await askClaude(orgId, userId, 'ss_case_note', system,
    `Contact type: ${contact}\nRough notes:\n${notes}`, schema)
  return { suggestion: result }
}
