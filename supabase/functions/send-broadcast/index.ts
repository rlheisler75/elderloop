import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

// Message text is typed by staff; escape it before it goes into the email HTML.
const esc = (s: unknown) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Who is calling? Only the person who wrote the message (or a super admin)
    // may send it, and only once.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return json({ error: 'Not signed in' }, 401)

    const { data: caller } = await supabase.from('profiles')
      .select('id, role, organization_id, is_active')
      .eq('id', user.id).single()
    if (!caller || caller.is_active === false) return json({ error: 'Not allowed' }, 403)
    const isSuperAdmin = caller.role === 'super_admin'
    if (!isSuperAdmin && ['family', 'resident', 'sales_rep', 'corporate'].includes(caller.role)) {
      return json({ error: 'Not allowed' }, 403)
    }

    const { message_id } = await req.json()

    const { data: msg, error: msgErr } = await supabase
      .from('broadcast_messages')
      .select('*, sender:profiles!sender_id(first_name, last_name, email)')
      .eq('id', message_id)
      .single()

    if (msgErr || !msg) return json({ error: 'Message not found' }, 404)
    if (!isSuperAdmin && (msg.org_id !== caller.organization_id || msg.sender_id !== caller.id)) {
      return json({ error: 'Not allowed' }, 403)
    }

    // Claim the message so a repeat call can't send it twice.
    const { data: claimed } = await supabase.from('broadcast_messages')
      .update({ status: 'processing' })
      .eq('id', msg.id).eq('status', 'sending')
      .select('id')
    if (!claimed?.length) return json({ error: 'This message has already been sent' }, 409)

    // Plan gate: Starter orgs cannot send SMS
    const { data: org } = await supabase
      .from('organizations')
      .select('plan')
      .eq('id', msg.org_id)
      .single()

    const channels = msg.channels || ['push']
    const smsBlocked = org?.plan === 'starter' && channels.includes('sms')
    const activeChannels = smsBlocked
      ? channels.filter((c: string) => c !== 'sms')
      : channels

    const staffRoles = ['org_admin','ceo','manager','supervisor','maintenance','dietary','housekeeping','nursing','staff']
    // notifyEmail/notifyPush default true (matches profiles column defaults) — only
    // present for profile-backed recipients (staff/family); residents have no
    // account/Settings page, so they're unaffected by these fields (undefined !== false).
    let recipients: Array<{id: string, name: string, email: string|null, phone: string|null, hasAuth: boolean, notifyEmail?: boolean, notifyPush?: boolean}> = []

    const mapProfile = (p: any) => ({
      id: p.id, name: `${p.first_name} ${p.last_name}`, email: p.email, phone: p.cell_phone || p.phone,
      hasAuth: true, notifyEmail: p.notify_email, notifyPush: p.notify_push,
    })

    if (msg.audience_type === 'all' || msg.audience_type === 'all_staff') {
      const { data } = await supabase.from('profiles')
        .select('id, first_name, last_name, email, cell_phone, phone, notify_email, notify_push')
        .eq('organization_id', msg.org_id).in('role', staffRoles).eq('is_active', true)
      if (data) recipients.push(...data.map(mapProfile))
    }

    if (msg.audience_type === 'all' || msg.audience_type === 'all_family') {
      const { data } = await supabase.from('profiles')
        .select('id, first_name, last_name, email, cell_phone, phone, notify_email, notify_push')
        .eq('organization_id', msg.org_id).eq('role', 'family').eq('is_active', true)
      if (data) recipients.push(...data.map(mapProfile))
    }

    if (msg.audience_type === 'all' || msg.audience_type === 'all_residents') {
      const { data } = await supabase.from('residents')
        .select('id, first_name, last_name, phone')
        .eq('organization_id', msg.org_id).eq('is_active', true)
      if (data) recipients.push(...data.map((r: any) => ({ id: r.id, name: `${r.first_name} ${r.last_name}`, email: null, phone: r.phone, hasAuth: false })))
    }

    if (msg.audience_type === 'department') {
      const { data } = await supabase.from('profiles')
        .select('id, first_name, last_name, email, cell_phone, phone, notify_email, notify_push')
        .eq('organization_id', msg.org_id).eq('department', msg.audience_dept).eq('is_active', true)
      if (data) recipients.push(...data.map(mapProfile))
    }

    // Picked recipients must belong to the message's community.
    if (msg.audience_type === 'individual' && msg.audience_ids?.length) {
      const { data: profileData } = await supabase.from('profiles')
        .select('id, first_name, last_name, email, cell_phone, phone, notify_email, notify_push')
        .eq('organization_id', msg.org_id).in('id', msg.audience_ids)
      if (profileData) recipients.push(...profileData.map(mapProfile))
      const foundIds = profileData?.map((p: any) => p.id) || []
      const residentIds = msg.audience_ids.filter((id: string) => !foundIds.includes(id))
      if (residentIds.length) {
        const { data: resData } = await supabase.from('residents')
          .select('id, first_name, last_name, phone')
          .eq('organization_id', msg.org_id).in('id', residentIds)
        if (resData) recipients.push(...resData.map((r: any) => ({ id: r.id, name: `${r.first_name} ${r.last_name}`, email: null, phone: r.phone, hasAuth: false })))
      }
    }

    let emailSent = 0, smsSent = 0, pushSent = 0
    const senderName = msg.sender ? `${msg.sender.first_name} ${msg.sender.last_name}` : 'Your community team'
    const pushRecipients = recipients.filter(r => r.hasAuth && r.notifyPush !== false)

    // ── IN-APP PUSH (notification bell) ──────────────────────
    if (activeChannels.includes('push') && pushRecipients.length) {
      const { error: pushErr } = await supabase.from('push_notifications')
        .insert(pushRecipients.map(r => ({
          org_id: msg.org_id, message_id: msg.id,
          recipient_id: r.id, title: msg.subject,
          body: msg.body, category: msg.category || 'general',
        })))
      if (!pushErr) pushSent = pushRecipients.length

      // ── DEVICE PUSH (background notifications via Web Push) ──
      // Calls send-push edge function which delivers to subscribed devices
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
      const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      if (pushRecipients.length > 0) {
        fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVICE_ROLE}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient_ids: pushRecipients.map(r => r.id),
            title: msg.subject,
            message: msg.body,
            url: '/app/communication',
            tag: 'broadcast',
            org_id: msg.org_id,
          }),
        }).catch(err => console.error('send-push call failed:', err))
        // Non-blocking — don't await so broadcast doesn't fail if push fails
      }
    }

    // ── EMAIL via Resend batch API ────────────────────────────
    if (activeChannels.includes('email')) {
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
      if (!RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not set')
      } else {
        const emailRecipients = recipients.filter(r => r.email && r.notifyEmail !== false)
        if (emailRecipients.length) {
          const makeHtml = (recipientName: string) =>
            `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:20px}.container{max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}.header{background:#1e6b4f;padding:24px 32px}.header h1{color:white;margin:0;font-size:20px;font-weight:600}.header p{color:rgba(255,255,255,.7);margin:4px 0 0;font-size:13px}.body{padding:32px}.body h2{color:#0f172a;font-size:18px;margin:0 0 16px}.body p{color:#334155;font-size:15px;line-height:1.6;margin:0;white-space:pre-wrap}.footer{padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0}.footer p{color:#94a3b8;font-size:12px;margin:0}</style></head><body><div class="container"><div class="header"><h1>ElderLoop</h1><p>Message from ${esc(senderName)}</p></div><div class="body"><h2>${esc(msg.subject)}</h2><p>${esc(msg.body)}</p></div><div class="footer"><p>This message was sent to ${esc(recipientName)} via ElderLoop.</p></div></div></body></html>`

          const BATCH_SIZE = 100
          for (let i = 0; i < emailRecipients.length; i += BATCH_SIZE) {
            const batch = emailRecipients.slice(i, i + BATCH_SIZE)
            const payload = batch.map(r => ({
              from: 'ElderLoop <notifications@elderloop.xyz>',
              to: r.email,
              subject: msg.subject,
              html: makeHtml(r.name),
            }))
            try {
              const res = await fetch('https://api.resend.com/emails/batch', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              })
              const resBody = await res.json()
              if (res.ok && resBody.data) emailSent += resBody.data.length
              else console.error('Resend batch error:', JSON.stringify(resBody))
            } catch (e) { console.error('Resend batch fetch failed:', e) }
          }
        }
      }
    }

    // ── SMS via Twilio ────────────────────────────────────────
    if (activeChannels.includes('sms')) {
      const TWILIO_SID   = Deno.env.get('TWILIO_ACCOUNT_SID')
      const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
      const TWILIO_FROM  = Deno.env.get('TWILIO_PHONE_NUMBER')
      if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
        console.warn('Twilio not configured')
      } else {
        const smsRecipients = recipients.filter(r => r.phone)
        for (const r of smsRecipients) {
          try {
            const smsBody = new URLSearchParams({
              From: TWILIO_FROM, To: r.phone!,
              Body: `${msg.subject}\n\n${msg.body}\n\n— ${senderName} via ElderLoop`
            })
            const res = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
              { method: 'POST', headers: { 'Authorization': `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: smsBody }
            )
            if (res.ok) smsSent++
            else { const e = await res.json(); console.error(`SMS failed:`, JSON.stringify(e)) }
          } catch (e) { console.error('SMS error:', e) }
        }
      }
    }

    await supabase.from('broadcast_messages').update({
      status: 'sent', recipient_count: recipients.length,
      email_sent: emailSent, sms_sent: smsSent, push_sent: pushSent,
      sent_at: new Date().toISOString(),
      ...(smsBlocked ? { sms_blocked_plan: true } : {})
    }).eq('id', msg.id)

    return json({ success: true, recipients: recipients.length, emailSent, smsSent, pushSent, smsBlocked })

  } catch (err) {
    console.error('send-broadcast error:', err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
