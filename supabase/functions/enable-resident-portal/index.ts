import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const respond = (data: object, status = 200) =>
  new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user: callingUser } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!callingUser) return respond({ success: false, error: 'Unauthorized' })

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles').select('role, organization_id').eq('id', callingUser.id).single()
    if (!callerProfile || !['org_admin', 'super_admin', 'ceo'].includes(callerProfile.role))
      return respond({ success: false, error: 'Must be org_admin or ceo to manage resident portal access' })

    const body = await req.json()
    const { action, email, resident_id, organization_id } = body

    if (action === 'enable') {
      if (!email || !resident_id || !organization_id)
        return respond({ success: false, error: 'Missing required fields' })

      const { data: resident } = await supabaseAdmin
        .from('residents').select('first_name, last_name, profile_id').eq('id', resident_id).single()
      if (!resident) return respond({ success: false, error: 'Resident not found' })
      if (resident.profile_id) return respond({ success: false, error: 'This resident already has portal access' })

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        email_confirm: true,
        user_metadata: { first_name: resident.first_name, last_name: resident.last_name },
      })
      if (createError) return respond({ success: false, error: createError.message })

      const profileId = newUser.user.id

      await supabaseAdmin.from('profiles').update({
        organization_id,
        role: 'resident',
        first_name: resident.first_name,
        last_name: resident.last_name,
        email: email.trim().toLowerCase(),
        is_active: true,
        updated_at: new Date().toISOString(),
      }).eq('id', profileId)

      await supabaseAdmin.from('residents').update({ profile_id: profileId }).eq('id', resident_id)

      // Link to our own page with the one-time code, not Supabase's action_link: email
      // scanners (Microsoft Safe Links) open every link and would use the code up.
      // ResetPassword.jsx spends it only when the person presses Set New Password.
      const siteUrl = Deno.env.get('SITE_URL') ?? 'https://elderloop.xyz'
      const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email.trim().toLowerCase(),
      })
      const tokenHash = linkData?.properties?.hashed_token
      const setupLink = tokenHash ? `${siteUrl}/reset-password?token_hash=${tokenHash}&type=recovery` : `${siteUrl}/forgot-password`

      const { data: org } = await supabaseAdmin
        .from('organizations').select('name').eq('id', organization_id).single()
      const orgName = org?.name ?? 'Your community'

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY') ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ElderLoop Support <info@elderloop.xyz>',
          to: [email.trim().toLowerCase()],
          subject: `Welcome to ${orgName}'s Resident Portal`,
          html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;"><h2 style="color:#1e3a5f;">Welcome, ${resident.first_name}!</h2><p style="color:#475569;font-size:15px;line-height:1.6;">You have been given access to the <strong>${orgName}</strong> Resident Portal.</p><div style="margin:28px 0;"><a href="${setupLink}" style="display:inline-block;padding:12px 28px;background:#0c90e1;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">Set Up Your Password</a></div><p style="color:#94a3b8;font-size:13px;">This link expires in 1 hour. After setting your password, visit <a href="${siteUrl}/login">${siteUrl}/login</a> to log in.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/><p style="color:#94a3b8;font-size:12px;">Powered by ElderLoop</p></div>`,
        }),
      })
      if (!resendRes.ok) {
        console.error('enable-resident-portal Resend error:', resendRes.status, await resendRes.text())
      }

      return respond({ success: true, profile_id: profileId })
    }

    if (action === 'disable') {
      if (!resident_id) return respond({ success: false, error: 'Missing resident_id' })
      await supabaseAdmin.from('residents').update({ profile_id: null }).eq('id', resident_id)
      return respond({ success: true })
    }

    return respond({ success: false, error: `Unknown action: ${action}` })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('enable-resident-portal error:', message)
    return respond({ success: false, error: message })
  }
})
