// ai-assist — server-side entry point for every ElderLoop AI feature.
//
// The Anthropic key lives only in this function's secrets (ANTHROPIC_API_KEY);
// the browser never calls Claude directly. Each request is:
//   1. authenticated (Supabase JWT from the caller),
//   2. gated on the org having the `ai_assist` module (the paid AI Add-on),
//   3. checked against the org's per-section settings (ai_settings: on/off + model),
//   4. dispatched by `task` to a handler that returns a *suggestion* only —
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
//   ss_care_conference — organize raw care conference notes into summary,
//               goals reviewed, new goals, and follow-up items. CLINICAL (same gate).
//   ss_goal_suggest — suggest 3 care-plan goals for a resident from their Social
//               Services records (read server-side, org-checked, name never sent).
//               CLINICAL (same gate).
//   mk_email_draft — write or improve a marketing email (subject + plain-text body
//               with merge tags) from a staff brief + audience filters. No lead
//               data is sent — only the brief, filters, and community name/city.
//   comm_draft — write, improve, or translate a broadcast message or announcement
//               (title/subject, body, suggested category), adapted to the audience
//               type and SMS length. No recipient names are sent.
//
// Deploy: supabase functions deploy ai-assist
// Secrets: ANTHROPIC_API_KEY (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are built in)

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Each org picks a model per section in Admin Panel → AI Add-on (ai_settings table).
// Only these are accepted — must match the ai_settings.model check constraint and
// AI_MODELS in src/pages/admin/AiSettingsTab.jsx.
const ALLOWED_MODELS = ['claude-haiku-4-5-20251001', 'claude-sonnet-5', 'claude-opus-5']
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'
// Which Admin Panel section each task belongs to (ai_settings.section)
const TASK_SECTIONS: Record<string, string> = {
  wo_triage: 'maintenance',
  ss_case_note: 'social_services', ss_care_conference: 'social_services', ss_goal_suggest: 'social_services',
  mk_email_draft: 'marketing',
  comm_draft: 'communication',
}
const DAILY_LIMIT = 200 // Claude calls per org per rolling 24h
// Tasks that handle resident health information (see header)
const CLINICAL_TASKS = ['ss_case_note', 'ss_care_conference', 'ss_goal_suggest']

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

  // ── Per-section settings (no row = on, default model) ─────────
  const section = TASK_SECTIONS[body.task as string]
  if (!section) return json({ error: 'Unknown task' }, 400)
  const { data: setting } = await admin
    .from('ai_settings').select('enabled, model')
    .eq('organization_id', orgId).eq('section', section).maybeSingle()
  if (setting?.enabled === false) return json({ error: 'AI is turned off for this section' }, 403)
  const model = ALLOWED_MODELS.includes(setting?.model) ? setting!.model : DEFAULT_MODEL

  try {
    switch (body.task) {
      case 'wo_triage':    return json(await woTriage(orgId, user.id, model, body))
      case 'ss_case_note': return json(await ssCaseNote(orgId, user.id, model, body))
      case 'ss_care_conference': return json(await ssCareConference(orgId, user.id, model, body))
      case 'ss_goal_suggest':    return json(await ssGoalSuggest(orgId, user.id, model, body))
      case 'mk_email_draft':     return json(await mkEmailDraft(orgId, user.id, model, body))
      case 'comm_draft':         return json(await commDraft(orgId, user.id, model, body))
      default:             return json({ error: 'Unknown task' }, 400)
    }
  } catch (err) {
    console.error('ai-assist error:', err)
    return json({ error: 'AI suggestion failed. Please fill the fields in manually.' }, 502)
  }
})

// ── Shared Claude call ────────────────────────────────────────────
// Returns parsed JSON matching `schema`, or null if the model declined.
async function askClaude(orgId: string, userId: string, model: string, task: string, system: string, prompt: string, schema: object) {
  const response = await anthropic.beta.messages.create({
    model,
    max_tokens: 2000,
    // Haiku 4.5 rejects `effort`; Sonnet 5 / Opus 5 take it (low keeps these
    // routine drafting tasks fast and cheap)
    output_config: model.startsWith('claude-haiku')
      ? { format: { type: 'json_schema', schema } }
      : { effort: 'low', format: { type: 'json_schema', schema } },
    // Opus: if a safety classifier declines, Anthropic re-runs the request on
    // its recommended fallback model instead of failing
    ...(model.startsWith('claude-opus')
      ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }
      : {}),
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
async function woTriage(orgId: string, userId: string, model: string, body: Record<string, unknown>) {
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

  const result = await askClaude(orgId, userId, model, 'wo_triage', system,
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

async function ssCaseNote(orgId: string, userId: string, model: string, body: Record<string, unknown>) {
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

  const result = await askClaude(orgId, userId, model, 'ss_case_note', system,
    `Contact type: ${contact}\nRough notes:\n${notes}`, schema)
  return { suggestion: result }
}

// ── ss_care_conference (CLINICAL) ─────────────────────────────────
async function ssCareConference(orgId: string, userId: string, model: string, body: Record<string, unknown>) {
  const field = (k: string) => String(body[k] || '').slice(0, 6000).trim()
  const sections = [
    ['Meeting notes', field('summary')],
    ['Goals reviewed (already entered)', field('goals_reviewed')],
    ['New goals (already entered)', field('new_goals')],
    ['Follow-up items (already entered)', field('follow_up_items')],
  ].filter(([, v]) => v)
  if (!sections.length) throw new Error('Nothing to organize')

  const schema = {
    type: 'object',
    properties: {
      summary:         { type: 'string' },
      goals_reviewed:  { type: 'string' },
      new_goals:       { type: 'string' },
      follow_up_items: { type: 'string' },
    },
    required: ['summary', 'goals_reviewed', 'new_goals', 'follow_up_items'],
    additionalProperties: false,
  }

  const system = `You help social workers in a senior living community document interdisciplinary care conferences.
Organize the notes into four sections for the care conference record:
- "summary": a concise narrative of the discussion — resident and family concerns, updates from each discipline, decisions made. Short paragraphs.
- "goals_reviewed": previous goals discussed and their status (met / progressing / not met / discontinued), one per line starting with "- ".
- "new_goals": new or revised goals, one per line starting with "- ", worded as measurable resident-centered goals when the notes support it.
- "follow_up_items": action items, one per line starting with "- ", with the responsible role and target date in parentheses when given, e.g. "- Schedule hearing evaluation (Social Services, by 10/15)".

Rules:
- Use ONLY information in the notes. Never add goals, diagnoses, decisions, owners, or dates that aren't there. If a section has nothing, return "".
- Keep content already entered in a section; merge in anything new from the notes without duplicating.
- Refer to the person as "the resident" (no names). Refer to other people by role (e.g. "the resident's son", "DON"), not by name.
- Objective, respectful, person-centered language. Keep safety concerns clearly visible.`

  const result = await askClaude(orgId, userId, model, 'ss_care_conference', system,
    sections.map(([label, v]) => `${label}:\n${v}`).join('\n\n'), schema)
  return { suggestion: result }
}

// ── ss_goal_suggest (CLINICAL) ────────────────────────────────────
// Keys must match GOAL_CATEGORIES in src/pages/social/Goals.jsx
const GOAL_CATEGORY_KEYS = ['social_engagement', 'emotional_wellbeing', 'family_relationships', 'independence_adl', 'cognitive_behavioral', 'other']

async function ssGoalSuggest(orgId: string, userId: string, model: string, body: Record<string, unknown>) {
  const residentId = String(body.resident_id || '')
  if (!/^[0-9a-f-]{36}$/i.test(residentId)) throw new Error('Bad resident id')

  // The resident must belong to the caller's org (service role bypasses RLS)
  const { data: resident } = await admin.from('residents').select('id')
    .eq('id', residentId).eq('organization_id', orgId).maybeSingle()
  if (!resident) throw new Error('Resident not in organization')

  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString()
  const [{ data: profile }, { data: notes }, { data: moods }, { data: conf }, { data: goals }] = await Promise.all([
    // Goal-relevant profile fields only — no guardian names/phones
    admin.from('ss_social_profiles')
      .select('cognitive_level, cognitive_notes, hobbies_interests, spiritual_religious, personality_notes, support_system, strengths, goals')
      .eq('resident_id', residentId).eq('organization_id', orgId).maybeSingle(),
    admin.from('ss_case_notes').select('contact_date, summary')
      .eq('resident_id', residentId).eq('organization_id', orgId)
      .gte('contact_date', daysAgo(90).slice(0, 10)).order('contact_date', { ascending: false }).limit(10),
    admin.from('ss_mood_logs').select('logged_at, mood, mood_score, behavioral_concerns, triggers, interventions, intervention_effective')
      .eq('resident_id', residentId).eq('organization_id', orgId)
      .gte('logged_at', daysAgo(30)).order('logged_at', { ascending: false }).limit(20),
    admin.from('ss_care_conferences').select('completed_date, summary, new_goals, follow_up_items')
      .eq('resident_id', residentId).eq('organization_id', orgId).eq('status', 'completed')
      .order('completed_date', { ascending: false }).limit(1).maybeSingle(),
    admin.from('ss_goals').select('category, title, status')
      .eq('resident_id', residentId).eq('organization_id', orgId),
  ])

  const clip = (s: unknown, n = 800) => String(s ?? '').slice(0, n)
  const parts: string[] = []
  if (profile) {
    const p = Object.entries(profile).filter(([, v]) => v).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${clip(v, 500)}`)
    if (p.length) parts.push(`Social profile:\n${p.join('\n')}`)
  }
  if (notes?.length)  parts.push(`Recent case notes (last 90 days):\n${notes.map(n => `- ${n.contact_date}: ${clip(n.summary)}`).join('\n')}`)
  if (moods?.length)  parts.push(`Mood/behavior logs (last 30 days):\n${moods.map(m =>
    `- ${String(m.logged_at).slice(0, 10)}: mood ${m.mood ?? '?'}${m.mood_score != null ? ` (${m.mood_score})` : ''}` +
    `${m.behavioral_concerns ? ', behavioral concerns' : ''}${m.triggers ? `; triggers: ${clip(m.triggers, 200)}` : ''}` +
    `${m.interventions ? `; interventions: ${clip(m.interventions, 200)}${m.intervention_effective === false ? ' (not effective)' : m.intervention_effective ? ' (effective)' : ''}` : ''}`).join('\n')}`)
  if (conf) parts.push(`Most recent care conference (${conf.completed_date ?? 'date unknown'}):\n${[conf.summary, conf.new_goals && `New goals: ${conf.new_goals}`, conf.follow_up_items && `Follow-ups: ${conf.follow_up_items}`].filter(Boolean).map(s => clip(s, 1500)).join('\n')}`)
  if (goals?.length)  parts.push(`Existing goals (do not duplicate):\n${goals.map(g => `- [${g.status}] ${g.title}`).join('\n')}`)
  const hint = clip(body.hint, 1000).trim()
  if (hint) parts.push(`Social worker's focus for this goal:\n${hint}`)
  if (!parts.length) return { suggestion: null, reason: 'no_records' }

  const schema = {
    type: 'object',
    properties: {
      goals: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category:           { type: 'string', enum: GOAL_CATEGORY_KEYS },
            title:              { type: 'string' },
            description:        { type: 'string' },
            target_days:        { type: 'integer', enum: [30, 60, 90] },
            based_on:           { type: 'string' },
          },
          required: ['category', 'title', 'description', 'target_days', 'based_on'],
          additionalProperties: false,
        },
      },
    },
    required: ['goals'],
    additionalProperties: false,
  }

  const system = `You help social workers in a senior living community write psychosocial care-plan goals.
Suggest exactly 3 goals for this resident based on their records. For each:
- "category": the best-fitting category key.
- "title": one measurable, resident-centered goal (who does what, how often/how much), e.g. "Resident will attend at least 2 group activities per week." Under 20 words.
- "description": 1-3 sentences of approaches/interventions staff will use to support the goal.
- "target_days": 30, 60, or 90 — a realistic review period.
- "based_on": one short sentence citing what in the records supports this goal.

Rules:
- Base every goal on something actually in the records; build on stated strengths and interests. Never invent diagnoses, history, or preferences.
- Don't duplicate an existing goal that is not_started or in_progress; you may suggest a next step after a met goal.
- If the social worker gave a focus, at least 2 of the 3 goals should address it.
- Refer to the person as "Resident" (no names); refer to others by role. Respectful, person-centered language.
- Goals are suggestions for the care team's review, not clinical orders.`

  const result = await askClaude(orgId, userId, model, 'ss_goal_suggest', system, parts.join('\n\n'), schema)
  return { suggestion: result }
}

// ── mk_email_draft ────────────────────────────────────────────────
const TONES: Record<string, string> = {
  warm:         'Warm and personal, like a caring staff member writing to a family.',
  professional: 'Polished and professional, still friendly.',
  short:        'Short and direct — 3 to 5 sentences, one clear ask.',
}
const LABEL = (s: string) => s.replace(/_/g, ' ')

async function mkEmailDraft(orgId: string, userId: string, model: string, body: Record<string, unknown>) {
  const brief = String(body.brief || '').slice(0, 2000).trim()
  const curSubject = String(body.subject || '').slice(0, 300).trim()
  const curBody = String(body.body || '').slice(0, 6000).trim()
  const improve = body.mode === 'improve' && (curSubject || curBody)
  if (!brief && !improve) throw new Error('Nothing to write from')

  // Community name/city only — no lead data
  const { data: org } = await admin.from('organizations').select('name, city, state').eq('id', orgId).single()
  const list = (v: unknown) => Array.isArray(v) ? v.slice(0, 20).map(x => LABEL(String(x))).join(', ') : ''
  const statuses = list(body.statuses)
  const careLevels = list(body.care_levels)

  const schema = {
    type: 'object',
    properties: { subject: { type: 'string' }, body: { type: 'string' } },
    required: ['subject', 'body'],
    additionalProperties: false,
  }

  const system = `You write marketing emails for a senior living community, sent to people who inquired about it (usually adult children or spouses of a prospective resident, sometimes the prospective resident).
Community: ${org?.name ?? 'the community'}${org?.city ? `, ${org.city}${org.state ? `, ${org.state}` : ''}` : ''}.

Output a "subject" (under 70 characters, no emoji, not clickbait) and a plain-text "body".
Body rules:
- Plain text only: no HTML, no markdown, no bullet symbols other than "- ". Short paragraphs separated by blank lines.
- Open with "Hi {{first_name}}," — {{first_name}} is the person who inquired. Use {{prospect_first_name}} only when referring to the prospective resident (e.g. "we'd love for {{prospect_first_name}} to join us"). Use no other merge tags and never invent names.
- Use ONLY facts from the brief (dates, times, prices, amenities, offers). If a needed detail is missing, write a clear placeholder in square brackets like [DATE], [TIME], [PHONE], [STAFF NAME] for staff to fill in. Never invent specifics.
- One clear call to action (schedule a tour, RSVP, call us).
- Sign off with "Warm regards," then "[STAFF NAME]" and "${org?.name ?? '[COMMUNITY NAME]'}".
- Do NOT add an unsubscribe line or footer — the system adds it.
- Respectful, never pushy: no false urgency, no guilt about family decisions, no promises about health outcomes or care results.
- Fair-housing safe: never express preference for or against anyone based on race, color, religion, sex, disability, familial status, national origin, or age beyond the community's stated senior living focus.`

  const parts: string[] = []
  if (brief) parts.push(`Brief from staff:\n${brief}`)
  if (statuses || careLevels) parts.push(`Audience: leads${statuses ? ` in stage(s): ${statuses}` : ''}${careLevels ? `${statuses ? ';' : ''} interested in: ${careLevels}` : ''}. Tailor the message to where they are.`)
  parts.push(`Tone: ${TONES[String(body.tone)] || TONES.warm}`)
  if (improve) parts.push(`Improve this existing draft — keep its facts and intent, fix clarity, tone, and structure, and apply the rules above:\nSubject: ${curSubject}\nBody:\n${curBody}`)

  const result = await askClaude(orgId, userId, model, 'mk_email_draft', system, parts.join('\n\n'), schema)
  return { suggestion: result }
}

// ── comm_draft ────────────────────────────────────────────────────
// Keys must match CATEGORIES in Communication.jsx / ComposeModal.jsx
const COMM_CATEGORIES = ['general', 'urgent', 'reminder', 'activity', 'meal', 'health']
const COMM_AUDIENCES: Record<string, string> = {
  all:           'everyone in the community — residents, families, and staff',
  all_staff:     'staff members',
  all_residents: 'residents (older adults; some have vision, hearing, or memory challenges)',
  all_family:    'family members of residents',
  department:    'staff in one department',
  individual:    'a few selected people',
  board:         'residents, families, and staff reading the community announcement board / signage',
}
const LANGUAGES = ['Spanish', 'Chinese (Simplified)', 'Vietnamese', 'Tagalog', 'Korean', 'Russian']

async function commDraft(orgId: string, userId: string, model: string, body: Record<string, unknown>) {
  const mode = ['write', 'improve', 'translate'].includes(String(body.mode)) ? String(body.mode) : 'write'
  const brief = String(body.brief || '').slice(0, 2000).trim()
  const curTitle = String(body.title || '').slice(0, 300).trim()
  const curBody = String(body.body || '').slice(0, 4000).trim()
  if (mode === 'write' && !brief) throw new Error('Nothing to write from')
  if (mode !== 'write' && !curTitle && !curBody) throw new Error('Nothing to improve or translate')
  const language = LANGUAGES.includes(String(body.language)) ? String(body.language) : 'Spanish'

  const kind = body.kind === 'announcement' ? 'announcement' : 'broadcast'
  const audience = COMM_AUDIENCES[String(body.audience)] || COMM_AUDIENCES.all
  const sms = Array.isArray(body.channels) && body.channels.includes('sms')
  const { data: org } = await admin.from('organizations').select('name').eq('id', orgId).single()

  const schema = {
    type: 'object',
    properties: {
      title:    { type: 'string' },
      body:     { type: 'string' },
      category: { type: 'string', enum: COMM_CATEGORIES },
    },
    required: ['title', 'body', 'category'],
    additionalProperties: false,
  }

  const system = `You write internal communications for ${org?.name ?? 'a senior living community'}.
This is ${kind === 'announcement' ? 'an announcement for the community board and digital signage' : 'a broadcast message sent by in-app notification, email, and/or text'}.
Audience: ${audience}.

Output:
- "title": ${kind === 'announcement' ? 'a short headline, under 60 characters' : 'a short subject line, under 60 characters'}. No emoji.
- "body": the message in plain text (no markdown or HTML).${sms ? ' SMS is one of the channels, so the body MUST be 150 characters or fewer (count carefully).' : ` Keep it brief — ${kind === 'announcement' ? '1 to 3 short sentences' : '2 to 5 short sentences'}.`}
- "category": the best fit — urgent (safety, emergencies, service outages), reminder, activity, meal, health, or general.

Rules:
- Use ONLY facts given. For missing specifics write a bracketed placeholder like [TIME], [LOCATION], [CONTACT] — never invent dates, times, places, names, or phone numbers.
- Write for the audience: for residents use plain, warm, large-idea sentences and avoid jargon and abbreviations; for families be reassuring and clear; for staff be direct and actionable.
- Urgent messages: calm, lead with what to do, no alarmist language.
- No resident health details or names beyond what the brief states; never guess anyone's condition.`

  const parts: string[] = []
  if (mode === 'write') parts.push(`Write a new message from this brief:\n${brief}`)
  if (mode === 'improve') parts.push(`Improve this draft — keep its facts and intent, make it clearer and better suited to the audience, and apply the rules:\nTitle: ${curTitle}\nBody:\n${curBody}${brief ? `\n\nExtra guidance from staff: ${brief}` : ''}`)
  if (mode === 'translate') parts.push(`Translate this message into ${language}. Keep the meaning, tone, and any [PLACEHOLDERS] exactly as they are (placeholders stay in English). Keep the same category. Return the translated title and body:\nTitle: ${curTitle}\nBody:\n${curBody}`)

  let result = await askClaude(orgId, userId, model, 'comm_draft', system, parts.join('\n\n'), schema)

  // Models can't count characters reliably — one retry if an SMS body runs over 160
  if (sms && result?.body && result.body.length > 160) {
    const shorter = await askClaude(orgId, userId, model, 'comm_draft', system,
      `This message is ${result.body.length} characters; it must be 150 or fewer for SMS. Shorten the body, keeping every essential fact and any [PLACEHOLDERS]${mode === 'translate' ? ` and keeping it in ${language}` : ''}:\nTitle: ${result.title}\nBody:\n${result.body}`, schema)
    if (shorter?.body && shorter.body.length < result.body.length) result = shorter
  }
  return { suggestion: result }
}
