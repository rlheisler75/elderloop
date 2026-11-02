import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { email } = await req.json()
    if (!email?.trim()) return json({ success: false, error: 'Email is required' })

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://elderloop.xyz'

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim().toLowerCase(),
    })

    if (linkError || !linkData?.properties?.hashed_token) {
      // Don't reveal whether the account exists
      return json({ success: true })
    }

    // Link to our own page with the one-time code, not Supabase's action_link: email
    // scanners (Microsoft Safe Links) open every link and would use the code up.
    // ResetPassword.jsx spends it only when the person presses Set New Password.
    const resetLink = `${siteUrl}/reset-password?token_hash=${linkData.properties.hashed_token}&type=recovery`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY') ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ElderLoop Support <info@elderloop.xyz>',
        to: [email.trim().toLowerCase()],
        subject: 'Reset your ElderLoop password',
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
            <td><img src="${siteUrl}/icon-192.png" width="28" height="28" alt="ElderLoop" style="display:block;border-radius:8px;" /></td>
            <td style="padding-left:10px;"><span style="font-size:18px;font-weight:700;color:#0c2340;">ElderLoop</span></td>
          </tr></table>
          <h2 style="color:#1e3a5f;margin:0 0 12px;">Reset your password</h2>
          <p style="color:#475569;font-size:15px;line-height:1.6;">We received a request to reset the password for your ElderLoop account (${email.trim().toLowerCase()}). Click below to choose a new one.</p>
          <div style="margin:28px 0;">
            <a href="${resetLink}" style="display:inline-block;padding:12px 28px;background:#0c90e1;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">Reset Password</a>
          </div>
          <p style="color:#94a3b8;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password will stay the same.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
          <p style="color:#94a3b8;font-size:12px;">Powered by ElderLoop &middot; elderloop.xyz</p>
        </div>`,
      }),
    })

    if (!resendRes.ok) {
      console.error('send-password-reset Resend error:', resendRes.status, await resendRes.text())
    }

    return json({ success: true })

  } catch (error) {
    return json({ success: false, error: error.message })
  }
})
