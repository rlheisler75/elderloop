// Demo request form (elderloop.xyz/early-access): confirmation email to the person
// plus a lead notification to info@elderloop.xyz. The row itself is saved by the
// page (table `waitlist`, shown in Super Admin → Leads); this only sends email.
// Public (verify_jwt off). Everything the visitor typed is HTML-escaped.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM = 'ElderLoop <info@elderloop.xyz>'
const NOTIFY = 'info@elderloop.xyz'
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' }

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
))
// Subject lines are plain text: no HTML escaping, but no line breaks either
const plain = (v: unknown) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { name, email, community, role, community_size, message } = await req.json()
    const fullName = String(name ?? '').trim()
    const first = fullName.split(/\s+/)[0] || 'there'
    if (!email) throw new Error('email is required')

    const steps = [
      "You'll hear from me within 2 business days",
      "We'll schedule a 30-minute call",
      "I'll walk you through a live demo built around your community",
      "If it's a fit, we'll set up your community together and train your staff",
    ]

    // 1. Confirmation email to the person who asked for a demo
    const confirmHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="background:#0c2340;padding:32px 40px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="width:32px;height:32px;background:#0c90e1;border-radius:8px;text-align:center;vertical-align:middle;">
              <span style="color:white;font-weight:bold;font-size:14px;">EL</span>
            </td>
            <td style="padding-left:12px;"><span style="color:white;font-size:18px;font-weight:600;">ElderLoop</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#1e293b;font-size:24px;font-weight:700;">Thanks, ${esc(first)}. I'll be in touch.</h2>
          <p style="margin:0 0 24px;color:#64748b;font-size:16px;line-height:1.6;">Thanks for your interest in ElderLoop. I personally review every request and will reach out within <strong>2 business days</strong> to set up your demo and learn more about ${community ? esc(community) : 'your community'}.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:12px;padding:24px;margin-bottom:24px;">
            <tr><td>
              <p style="margin:0 0 12px;color:#475569;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">What happens next</p>
              ${steps.map((s, i) => `<p style="margin:0 0 8px;color:#64748b;font-size:14px;"><span style="display:inline-block;width:20px;height:20px;background:#0c90e1;border-radius:50%;color:white;font-size:11px;font-weight:bold;text-align:center;line-height:20px;margin-right:8px;">${i + 1}</span>${esc(s)}</p>`).join('')}
            </td></tr>
          </table>
          <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;">Questions? Reply to this email or reach me directly at</p>
          <a href="mailto:info@elderloop.xyz" style="color:#0c90e1;font-size:14px;">info@elderloop.xyz</a>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">ElderLoop &mdash; Built in Springfield, Missouri &mdash; <a href="https://elderloop.xyz" style="color:#94a3b8;">elderloop.xyz</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    // 2. Lead notification to ElderLoop
    const row = (label: string, value: string) =>
      `<tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">${label}</td><td style="padding:8px;border:1px solid #e2e8f0;">${value}</td></tr>`
    const notifyHtml = `
<h2>New ElderLoop demo request</h2>
<table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;">
  ${row('Name', esc(fullName) || '—')}
  ${row('Email', `<a href="mailto:${esc(email)}">${esc(email)}</a>`)}
  ${row('Community', esc(community) || '—')}
  ${row('Role', esc(role) || '—')}
  ${row('Size', esc(community_size) || '—')}
  ${row('Pain Point', esc(message) || '—')}
</table>
<p><a href="https://elderloop.xyz/app/superadmin" style="background:#0c90e1;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">View in SuperAdmin →</a></p>`

    const batchRes = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        {
          from: FROM,
          to: [String(email).trim()],
          reply_to: NOTIFY,
          subject: `Thanks for requesting an ElderLoop demo, ${plain(first)}`,
          html: confirmHtml,
        },
        {
          from: FROM,
          to: [NOTIFY],
          reply_to: String(email).trim(),
          subject: `New demo request: ${plain(fullName) || plain(email)}${community ? ' — ' + plain(community) : ''}`,
          html: notifyHtml,
        },
      ]),
    })

    if (!batchRes.ok) {
      console.error('waitlist-confirm Resend error:', batchRes.status, await batchRes.text())
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
