// Budget alert emails (budget layer Phase 3). Called by the 'budget-alerts' pg_cron
// job right after check_budget_alerts(). Sends every alert that wants an email
// (pace, 90%, 100%) and hasn't been emailed yet, to its recipients who have email
// notifications on. Each alert is claimed before sending, so a second call (or a
// retry) never sends it twice. Safe to call any time: it only sends what's pending.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://elderloop.xyz'
const FROM = 'ElderLoop Support <info@elderloop.xyz>'

const respond = (data: object, status = 200) =>
  new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' }, status })

const money = (n: number | null) => `$${Math.round(Number(n ?? 0)).toLocaleString('en-US')}`
const deptLabel = (d: string) => d.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

type Alert = {
  id: string; organization_id: string; department: string; month: string; kind: string
  budget: number; spent: number; projected: number; pct_used: number; projected_pct: number; recipients: string[]
}

function compose(a: Alert, orgName: string) {
  const dept = deptLabel(a.department)
  const monthName = new Date(a.month + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })
  let subject: string, lead: string
  if (a.kind === 'pace') {
    subject = `${dept} is on pace to go over its ${monthName} budget`
    lead = `${dept} has spent ${money(a.spent)} of its ${money(a.budget)} budget (${a.pct_used}%). At this pace the month ends near ${money(a.projected)} (${Math.round(a.projected_pct)}%).`
  } else if (a.kind === 'pct90') {
    subject = `${dept} has used 90% of its ${monthName} budget`
    lead = `${dept} has spent ${money(a.spent)} of its ${money(a.budget)} budget (${a.pct_used}%).`
  } else {
    subject = `${dept} is over its ${monthName} budget`
    lead = `${dept} has spent ${money(a.spent)} of its ${money(a.budget)} budget (${a.pct_used}%). New ${dept} purchase orders need the Administrator's approval for the rest of the month.`
  }
  const link = `${SITE_URL}/app/budgets`
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#0c2340">
  <p style="font-size:13px;color:#5b6b79;margin:0 0 8px">${esc(orgName)} · Budget alert</p>
  <h2 style="font-size:20px;margin:0 0 12px">${esc(subject)}</h2>
  <p style="font-size:15px;line-height:1.5;margin:0 0 20px">${esc(lead)}</p>
  <a href="${link}" style="display:inline-block;background:#0c90e1;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Open Budgets</a>
  <p style="font-size:12px;color:#8b9bab;margin:24px 0 0">You get this because you manage this budget in ElderLoop. Turn off email notifications in your profile settings.</p>
</div>`
  const text = `${subject}\n\n${lead}\n\nOpen Budgets: ${link}`
  return { subject: `${orgName}: ${subject}`, html, text }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return respond({ error: 'POST only' }, 405)
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return respond({ error: 'RESEND_API_KEY not set' }, 500)

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } })

  const since = new Date(Date.now() - 3 * 86400000).toISOString()
  const { data: pending, error } = await admin.from('budget_alerts')
    .select('id, organization_id, department, month, kind, budget, spent, projected, pct_used, projected_pct, recipients')
    .eq('email_wanted', true).eq('suppressed', false).is('email_claimed_at', null).gte('created_at', since)
    .order('created_at').limit(100)
  if (error) return respond({ error: error.message }, 500)

  let sent = 0, failed = 0
  for (const a of (pending ?? []) as Alert[]) {
    // Claim it first; if another run got here, skip
    const { data: claimed } = await admin.from('budget_alerts').update({ email_claimed_at: new Date().toISOString() })
      .eq('id', a.id).is('email_claimed_at', null).select('id')
    if (!claimed?.length) continue

    const [{ data: org }, { data: people }] = await Promise.all([
      admin.from('organizations').select('name').eq('id', a.organization_id).single(),
      admin.from('profiles').select('email, notify_email, is_active').in('id', a.recipients?.length ? a.recipients : ['00000000-0000-0000-0000-000000000000']),
    ])
    const to = (people ?? []).filter(p => p.email && p.notify_email !== false && p.is_active !== false).map(p => p.email as string)
    if (to.length === 0) {
      await admin.from('budget_alerts').update({ emailed_at: new Date().toISOString(), email_error: 'No recipients with email on' }).eq('id', a.id)
      continue
    }

    const mail = compose(a, org?.name ?? 'ElderLoop')
    // One message per person, so recipients don't see each other's addresses
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(to.map(email => ({ from: FROM, to: [email], subject: mail.subject, html: mail.html, text: mail.text }))),
    })
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 500)
      console.error('send-budget-alerts: Resend rejected', res.status, detail)
      await admin.from('budget_alerts').update({ email_error: `Resend ${res.status}: ${detail}` }).eq('id', a.id)
      failed++
      continue
    }
    await admin.from('budget_alerts').update({ emailed_at: new Date().toISOString(), email_error: null }).eq('id', a.id)
    sent++
  }
  return respond({ success: true, sent, failed })
})
