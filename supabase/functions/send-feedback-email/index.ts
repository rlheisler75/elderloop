// Help & Feedback emails. Called by the platform_feedback_notify trigger right after
// someone sends a help request or suggestion. Emails every pending message (not yet
// claimed, from the last 3 days) to the active super admins with email notifications
// on. Each message is claimed before sending, so a second call never sends it twice.
// The email never carries the subject or message text (no BAA with Resend, and family
// members may type health details): who sent it, from where, and a link to the inbox.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://elderloop.xyz'
const FROM = 'ElderLoop Support <info@elderloop.xyz>'

const respond = (data: object, status = 200) =>
  new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' }, status })

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

const ROLE_LABEL: Record<string, string> = { family: 'Family', resident: 'Resident', ceo: 'Administrator', org_admin: 'Org Admin', super_admin: 'Super Admin' }
const roleLabel = (r: string | null) => r ? (ROLE_LABEL[r] ?? r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) : 'Unknown role'

type Feedback = { id: string; kind: string; role: string | null; user_id: string; organization_id: string | null }

function compose(f: Feedback, sender: string, orgName: string) {
  const what = f.kind === 'help' ? 'help request' : 'suggestion'
  const subject = `New ${what} from ${sender} (${orgName})`
  const lead = `${sender} (${roleLabel(f.role)}) at ${orgName} sent a ${what}.`
  const link = `${SITE_URL}/superadmin`
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#0c2340">
  <p style="font-size:13px;color:#5b6b79;margin:0 0 8px">ElderLoop · Help &amp; Feedback</p>
  <h2 style="font-size:20px;margin:0 0 12px">${esc(subject)}</h2>
  <p style="font-size:15px;line-height:1.5;margin:0 0 20px">${esc(lead)} Open Super Admin → Help &amp; Feedback to read it.</p>
  <a href="${link}" style="display:inline-block;background:#0c90e1;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Open Super Admin</a>
  <p style="font-size:12px;color:#8b9bab;margin:24px 0 0">The message itself stays in ElderLoop. Turn off email notifications in your profile settings.</p>
</div>`
  const text = `${subject}\n\n${lead} Open Super Admin → Help & Feedback to read it.\n\n${link}`
  return { subject, html, text }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return respond({ error: 'POST only' }, 405)
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return respond({ error: 'RESEND_API_KEY not set' }, 500)

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } })

  const since = new Date(Date.now() - 3 * 86400000).toISOString()
  const { data: pending, error } = await admin.from('platform_feedback')
    .select('id, kind, role, user_id, organization_id')
    .is('email_claimed_at', null).gte('created_at', since)
    .order('created_at').limit(50)
  if (error) return respond({ error: error.message }, 500)
  if (!pending?.length) return respond({ success: true, sent: 0, failed: 0 })

  const { data: admins } = await admin.from('profiles').select('email, notify_email, is_active').eq('role', 'super_admin')
  const to = (admins ?? []).filter(p => p.email && p.notify_email !== false && p.is_active !== false).map(p => p.email as string)

  let sent = 0, failed = 0
  for (const f of pending as Feedback[]) {
    // Claim it first; if another call got here, skip
    const { data: claimed } = await admin.from('platform_feedback').update({ email_claimed_at: new Date().toISOString() })
      .eq('id', f.id).is('email_claimed_at', null).select('id')
    if (!claimed?.length) continue

    if (to.length === 0) {
      await admin.from('platform_feedback').update({ email_error: 'No super admins with email on' }).eq('id', f.id)
      continue
    }

    const [{ data: person }, { data: org }] = await Promise.all([
      admin.from('profiles').select('first_name, last_name').eq('id', f.user_id).maybeSingle(),
      f.organization_id
        ? admin.from('organizations').select('name').eq('id', f.organization_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    const sender = `${person?.first_name ?? ''} ${person?.last_name ?? ''}`.trim() || 'Someone'
    const mail = compose(f, sender, org?.name ?? 'no community')

    // One message per person, so recipients don't see each other's addresses
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(to.map(email => ({ from: FROM, to: [email], subject: mail.subject, html: mail.html, text: mail.text }))),
    })
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 500)
      console.error('send-feedback-email: Resend rejected', res.status, detail)
      await admin.from('platform_feedback').update({ email_error: `Resend ${res.status}: ${detail}` }).eq('id', f.id)
      failed++
      continue
    }
    await admin.from('platform_feedback').update({ emailed_at: new Date().toISOString(), email_error: null }).eq('id', f.id)
    sent++
  }
  return respond({ success: true, sent, failed })
})
