import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const respond = (data: object, status = 200) =>
  new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return respond({ success: false, error: 'No authorization header' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: callingUser }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !callingUser) {
      return respond({ success: false, error: 'Unauthorized' })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', callingUser.id)
      .single()

    // org_admin/super_admin always may; otherwise an HR or Payroll Manager (department+level
    // model — see staff_department_roles) may also create staff accounts within their own org.
    let isPrivileged = !!callerProfile && ['org_admin', 'super_admin'].includes(callerProfile.role)
    if (!isPrivileged && callerProfile) {
      const { data: deptRoles } = await supabaseAdmin
        .from('staff_department_roles')
        .select('department, level')
        .eq('profile_id', callingUser.id)
        .in('department', ['hr', 'payroll'])
        .eq('level', 'manager')
      isPrivileged = !!deptRoles && deptRoles.length > 0
    }

    if (!callerProfile || !isPrivileged) {
      return respond({ success: false, error: 'Insufficient permissions — must be org_admin, super_admin, or an HR/Payroll Manager' })
    }

    const isSuperAdmin = callerProfile.role === 'super_admin'

    const body = await req.json()
    const { email, first_name, last_name, role, phone, organization_id } = body

    if (!email || !first_name || !organization_id) {
      return respond({ success: false, error: 'Missing required fields: email, first_name, organization_id' })
    }

    if (!isSuperAdmin && callerProfile.organization_id !== organization_id) {
      return respond({ success: false, error: 'Cannot create users for other organizations' })
    }

    // Starter-plan staff limit — checked BEFORE creating the auth user so a rejected
    // request doesn't leave an orphaned login. The trg_enforce_staff_limit trigger on
    // profiles enforces the same rule in the database.
    const newRole = role || 'staff'
    const { data: org } = await supabaseAdmin
      .from('organizations').select('name, plan, staff_limit').eq('id', organization_id).single()
    if (org?.plan === 'starter' && org.staff_limit != null && !['resident', 'family'].includes(newRole)) {
      const { count } = await supabaseAdmin
        .from('profiles').select('id', { count: 'exact', head: true })
        .eq('organization_id', organization_id)
        .not('is_active', 'is', false)
        .not('role', 'in', '(resident,family)')
      if ((count ?? 0) >= org.staff_limit) {
        return respond({
          success: false, limit_reached: true,
          error: `Staff limit reached: the Starter plan includes up to ${org.staff_limit} staff accounts. Upgrade under Admin Panel → Billing to add more.`,
        })
      }
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      email_confirm: true,
      user_metadata: { first_name: first_name.trim(), last_name: (last_name || '').trim() }
    })

    if (createError) {
      return respond({ success: false, error: createError.message })
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        organization_id,
        role: newRole,
        first_name: first_name.trim(),
        last_name: (last_name || '').trim(),
        phone: phone || null,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', newUser.user.id)

    if (profileError) {
      // Don't leave a login with no organization behind (e.g. staff limit trigger fired)
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return respond({ success: false, error: profileError.message })
    }

    // Email a password-setup link so the new staff member sets their own
    // password — no admin-chosen temp password to lose track of.
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://elderloop.xyz'
    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim().toLowerCase(),
      options: { redirectTo: `${siteUrl}/reset-password` },
    })
    const setupLink = linkData?.properties?.action_link ?? `${siteUrl}/login`

    const orgName = org?.name ?? 'your community'

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY') ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ElderLoop Support <info@elderloop.xyz>',
        to: [email.trim().toLowerCase()],
        subject: `You've been added to ${orgName} on ElderLoop`,
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
            <td><img src="${siteUrl}/icon-192.png" width="28" height="28" alt="ElderLoop" style="display:block;border-radius:8px;" /></td>
            <td style="padding-left:10px;"><span style="font-size:18px;font-weight:700;color:#0c2340;">ElderLoop</span></td>
          </tr></table>
          <h2 style="color:#1e3a5f;margin:0 0 12px;">Welcome, ${first_name.trim()}!</h2>
          <p style="color:#475569;font-size:15px;line-height:1.6;">You've been added as a staff member at <strong>${orgName}</strong> on ElderLoop. Click below to set your password and get started.</p>
          <div style="margin:28px 0;">
            <a href="${setupLink}" style="display:inline-block;padding:12px 28px;background:#0c90e1;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">Set Up Your Password</a>
          </div>
          <p style="color:#94a3b8;font-size:13px;">This link expires in 1 hour. After setting your password, visit <a href="${siteUrl}/login">${siteUrl}/login</a> to sign in.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
          <p style="color:#94a3b8;font-size:12px;">Powered by ElderLoop &middot; elderloop.xyz</p>
        </div>`,
      }),
    })
    if (!resendRes.ok) {
      console.error('create-user Resend error:', resendRes.status, await resendRes.text())
    }

    return respond({ success: true, user_id: newUser.user.id })

  } catch (error) {
    return respond({ success: false, error: error.message })
  }
})
