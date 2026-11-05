// Super Admin → Help & Feedback → Reply. Saves the reply, rings the sender's
// ElderLoop bell (plus device push), and emails them from info@elderloop.xyz
// with reply-to set to the super admin, so their answer comes straight back.
//
// Health information: there is no BAA with Resend or the web-push services,
// and family/resident portal users may describe health details. So for those
// senders the email and device push only say a reply is waiting; the text is
// read inside ElderLoop (bell + Help & Feedback → Your requests). Staff get the
// reply text in the email. The bell is in ElderLoop and always carries the text.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://elderloop.xyz'
const FROM = 'ElderLoop Support <info@elderloop.xyz>'
const PORTAL_ROLES = ['family', 'resident']

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const respond = (data: object, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return respond({ error: 'POST only' }, 405)

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } })

    // Super admins only
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: { user } } = await admin.auth.getUser(token)
    if (!user) return respond({ error: 'Your sign-in has ended. Sign in again and resend.' }, 401)
    const { data: me } = await admin.from('profiles')
      .select('id, role, first_name, last_name, email, is_active').eq('id', user.id).single()
    if (!me || me.role !== 'super_admin' || me.is_active === false) return respond({ error: 'Not allowed' }, 403)

    const { feedback_id, message } = await req.json()
    const text = String(message ?? '').trim()
    if (!feedback_id || !text) return respond({ error: 'A reply needs a message' }, 400)
    if (text.length > 5000) return respond({ error: 'Replies are limited to 5,000 characters' }, 400)

    const { data: fb } = await admin.from('platform_feedback')
      .select('id, user_id, organization_id, role, kind, subject, status').eq('id', feedback_id).single()
    if (!fb) return respond({ error: 'Message not found' }, 404)
    const { data: person } = await admin.from('profiles')
      .select('id, first_name, email, role, notify_push').eq('id', fb.user_id).maybeSingle()

    const { data: reply, error: insErr } = await admin.from('platform_feedback_replies')
      .insert({ feedback_id: fb.id, author_id: me.id, message: text }).select('id').single()
    if (insErr || !reply) return respond({ error: insErr?.message ?? 'Could not save the reply' }, 500)

    // A reply means it's being worked on
    if (fb.status === 'new') await admin.from('platform_feedback').update({ status: 'in_progress' }).eq('id', fb.id)

    const portal = PORTAL_ROLES.includes(person?.role ?? fb.role ?? '')
    const what = fb.kind === 'help' ? 'help request' : 'suggestion'
    const authorName = `${me.first_name ?? ''} ${me.last_name ?? ''}`.trim() || 'ElderLoop Support'

    // ── Bell (in ElderLoop, carries the text) + device push ──
    let pushed = false
    if (person && fb.organization_id) {
      const { error: bellErr } = await admin.from('push_notifications').insert({
        org_id: fb.organization_id, recipient_id: person.id,
        title: `ElderLoop Support replied: ${fb.subject}`.slice(0, 200),
        body: text, category: 'general',
      })
      pushed = !bellErr
      if (bellErr) console.error('reply-feedback: bell insert failed', bellErr.message)
      if (person.notify_push !== false) {
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient_ids: [person.id],
            title: 'ElderLoop Support replied',
            message: portal ? `There's a reply to your ${what}. Open ElderLoop to read it.` : text.slice(0, 180),
            url: portal ? '/' : '/app/dashboard',
            tag: 'feedback-reply',
            org_id: fb.organization_id,
          }),
        }).catch(err => console.error('reply-feedback: send-push failed', err))
      }
    }

    // ── Email ──
    let emailed = false, emailError: string | null = null
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!person?.email) emailError = 'Sender has no email address'
    else if (!resendKey) emailError = 'RESEND_API_KEY not set'
    else {
      const hi = person.first_name ? `Hi ${person.first_name},` : 'Hello,'
      const subject = portal ? `A reply to your ElderLoop ${what}` : `Re: ${fb.subject}`
      const bodyHtml = portal
        ? `<p style="font-size:15px;line-height:1.5;margin:0 0 20px">The ElderLoop team replied to your ${esc(what)}. Sign in to ElderLoop and open <b>Help &amp; Feedback</b> to read it.</p>
           <a href="${SITE_URL}" style="display:inline-block;background:#0c90e1;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Open ElderLoop</a>`
        : `<p style="font-size:15px;line-height:1.6;margin:0 0 16px;white-space:pre-wrap">${esc(text)}</p>
           <p style="font-size:13px;color:#5b6b79;margin:0">— ${esc(authorName)}, ElderLoop Support</p>
           <p style="font-size:12px;color:#8b9bab;margin:20px 0 0">About your ${esc(what)}: “${esc(fb.subject)}”. Reply to this email to answer, or use Help &amp; Feedback in ElderLoop.</p>`
      const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#0c2340">
        <p style="font-size:13px;color:#5b6b79;margin:0 0 8px">ElderLoop · Help &amp; Feedback</p>
        <p style="font-size:15px;margin:0 0 12px">${esc(hi)}</p>${bodyHtml}</div>`
      const plain = portal
        ? `${hi}\n\nThe ElderLoop team replied to your ${what}. Sign in to ElderLoop and open Help & Feedback to read it.\n\n${SITE_URL}`
        : `${hi}\n\n${text}\n\n- ${authorName}, ElderLoop Support\n\nAbout your ${what}: "${fb.subject}". Reply to this email to answer.`
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM, to: [person.email], reply_to: me.email ?? undefined, subject, html, text: plain }),
      })
      if (res.ok) emailed = true
      else {
        emailError = `Resend ${res.status}: ${(await res.text()).slice(0, 400)}`
        console.error('reply-feedback:', emailError)
      }
    }

    await admin.from('platform_feedback_replies').update({
      emailed_at: emailed ? new Date().toISOString() : null, email_error: emailError, pushed,
    }).eq('id', reply.id)

    return respond({ success: true, emailed, pushed, emailError, textInEmail: !portal })
  } catch (err) {
    console.error('reply-feedback error:', err)
    return respond({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
