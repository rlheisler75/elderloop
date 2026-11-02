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
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const client = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Verify caller is org_admin / ceo / super_admin
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user: caller } } = await client.auth.getUser(token)
    if (!caller) return respond({ success: false, error: 'Unauthorized' })
    const { data: callerProfile } = await admin.from('profiles').select('role, organization_id').eq('id', caller.id).single()
    if (!callerProfile || !['org_admin','ceo','super_admin'].includes(callerProfile.role))
      return respond({ success: false, error: 'Must be org admin to manage family portal access' })

    const body = await req.json()
    const { action, resident_id, organization_id, email, first_name, last_name,
            relationship, is_primary, can_view_medical, can_view_dietary, can_view_activities,
            link_id } = body

    // ── ENABLE: create family account + link to resident ─────────────
    if (action === 'enable') {
      if (!email || !resident_id || !organization_id || !first_name)
        return respond({ success: false, error: 'Email, first name, and resident are required.' })

      // Check if email already has an account
      let familyUserId: string
      const { data: existingUsers } = await admin.auth.admin.listUsers()
      const existing = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())

      if (existing) {
        // Use existing account — just create the link
        familyUserId = existing.id
        // Make sure profile is role=family and linked to this org
        await admin.from('profiles').update({
          role: 'family',
          organization_id,
          is_active: true,
          updated_at: new Date().toISOString(),
        }).eq('id', familyUserId).eq('role', 'family') // only update if already family role
      } else {
        // Create new auth account
        const { data: newUser, error: createError } = await admin.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          email_confirm: true,
          user_metadata: { first_name: first_name.trim(), last_name: (last_name || '').trim() },
        })
        if (createError) return respond({ success: false, error: createError.message })
        familyUserId = newUser.user.id

        // Update profile
        await admin.from('profiles').update({
          organization_id,
          role: 'family',
          first_name: first_name.trim(),
          last_name: (last_name || '').trim(),
          email: email.trim().toLowerCase(),
          is_active: true,
          updated_at: new Date().toISOString(),
        }).eq('id', familyUserId)
      }

      // Check for existing link
      const { data: existingLink } = await admin.from('family_resident_links')
        .select('id').eq('family_user_id', familyUserId).eq('resident_id', resident_id).single()
      if (existingLink) return respond({ success: false, error: 'This family member is already linked to this resident.' })

      // Create the link
      const { data: link, error: linkError } = await admin.from('family_resident_links').insert({
        organization_id,
        family_user_id:    familyUserId,
        resident_id,
        relationship:      relationship || null,
        is_primary:        is_primary ?? false,
        can_view_medical:  can_view_medical ?? true,
        can_view_dietary:  can_view_dietary ?? true,
        can_view_activities: can_view_activities ?? true,
      }).select('id').single()
      if (linkError) return respond({ success: false, error: linkError.message })

      // Send password setup email via Resend
      const siteUrl = Deno.env.get('SITE_URL') ?? 'https://elderloop.xyz'
      const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? ''

      // Get resident name
      const { data: resident } = await admin.from('residents').select('first_name, last_name').eq('id', resident_id).single()
      const residentName = resident ? `${resident.first_name} ${resident.last_name}` : 'your loved one'

      // Get org name
      const { data: org } = await admin.from('organizations').select('name').eq('id', organization_id).single()
      const orgName = org?.name ?? 'your community'

      if (!existing) {
        // New account — send password setup link. Link to our own page with the one-time
        // code, not Supabase's action_link: email scanners (Microsoft Safe Links) open every
        // link and would use the code up. ResetPassword.jsx spends it on Set New Password.
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: 'recovery',
          email: email.trim().toLowerCase(),
        })
        const tokenHash = linkData?.properties?.hashed_token
        const setupLink = tokenHash ? `${siteUrl}/reset-password?token_hash=${tokenHash}&type=recovery` : `${siteUrl}/forgot-password`

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'ElderLoop Support <info@elderloop.xyz>',
            to: [email.trim().toLowerCase()],
            subject: `You've been given access to ${residentName}'s family portal`,
            html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
              <h2 style="color:#1e3a5f;">Welcome, ${first_name.trim()}!</h2>
              <p style="color:#475569;font-size:15px;line-height:1.6;">
                You've been given access to the <strong>${orgName}</strong> Family Portal to stay connected with <strong>${residentName}</strong>.
              </p>
              <p style="color:#475569;font-size:15px;line-height:1.6;">Click below to set your password and get started.</p>
              <div style="margin:28px 0;">
                <a href="${setupLink}" style="display:inline-block;padding:12px 28px;background:#0c90e1;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">Set Up Your Password</a>
              </div>
              <p style="color:#94a3b8;font-size:13px;">This link expires in 24 hours. After setting your password, visit <a href="${siteUrl}/login">${siteUrl}/login</a> to sign in.</p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
              <p style="color:#94a3b8;font-size:12px;">Powered by ElderLoop &middot; elderloop.xyz</p>
            </div>`,
          }),
        })
        if (!resendRes.ok) {
          console.error('enable-family-portal Resend error:', resendRes.status, await resendRes.text())
        }
      }

      return respond({ success: true, family_user_id: familyUserId, link_id: link.id, existing_account: !!existing })
    }

    // ── REMOVE: delete the link (and optionally deactivate account) ──
    if (action === 'remove') {
      if (!link_id) return respond({ success: false, error: 'Missing link_id' })
      await admin.from('family_resident_links').delete().eq('id', link_id)
      return respond({ success: true })
    }

    return respond({ success: false, error: `Unknown action: ${action}` })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('enable-family-portal error:', message)
    return respond({ success: false, error: message })
  }
})
