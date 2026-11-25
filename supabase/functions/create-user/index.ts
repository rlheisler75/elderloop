import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const respond = (data: object, status = 200) =>
  new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })

const isEmailTaken = (e: any) =>
  e?.code === 'email_exists' || /already (been )?registered|already exists/i.test(e?.message ?? '')

// The email already has a login. If it belongs to someone who left another community
// (marked Terminated, or their account turned off), give the old login a placeholder email so
// this community can create a fresh login with the real one. The former community keeps its
// record and history; nothing carries over between communities (20261125_terminated_blocks_sign_in).
async function setAsideFormerLogin(admin: any, email: string, orgId: string) {
  const { data: rows } = await admin.from('profiles')
    .select('id, organization_id, role, status, is_active')
    .ilike('email', email.replace(/[\\%_]/g, '\\$&'))
  const owners: any[] = []
  for (const r of rows ?? []) {   // profiles keep a copy of the email; check the login itself
    const { data } = await admin.auth.admin.getUserById(r.id)
    if (data?.user?.email?.toLowerCase() === email) owners.push(r)
  }
  if (owners.length !== 1) {
    return { error: 'This email already has an ElderLoop login. Use a different email, or contact ElderLoop support.' }
  }
  const p = owners[0]
  const left = p.status === 'terminated' || p.is_active === false
  if (p.organization_id === orgId) {
    return { error: left
      ? 'This person already has a staff record here that is marked Terminated or turned off. Open their record and set them back to Active instead of adding them again.'
      : 'Someone on your staff already uses this email.' }
  }
  if (!p.organization_id || ['resident', 'family', 'sales_rep', 'corporate', 'super_admin'].includes(p.role)) {
    return { error: 'This email is already used by another kind of ElderLoop login. Use a different email.' }
  }
  if (!left) {
    return { error: 'This email already has an active ElderLoop login at another community. Use a different email, or that community needs to mark them Terminated first.' }
  }

  const asideEmail = `former-${p.id}@former.elderloop.xyz`
  const { error } = await admin.auth.admin.updateUserById(p.id, { email: asideEmail, email_confirm: true })
  if (error) return { error: `Couldn't free up this email: ${error.message}` }
  // sync_user_email copied the placeholder onto the old profile; the former community's record keeps the real address
  await admin.from('profiles').update({ email }).eq('id', p.id)
  // Logged in the former community without naming the new one
  const { error: auditErr } = await admin.from('audit_log').insert({
    organization_id: p.organization_id, user_id: null, user_email: 'ElderLoop', user_role: 'system',
    action: 'LOGIN_EMAIL_SET_ASIDE', table_name: 'profiles', record_id: p.id,
    old_values: { login_email: email }, new_values: { login_email: asideEmail },
    notes: 'This former staff member was added at another community with the same email, so their old login here got a placeholder email. Their record and history stay here.',
  })
  if (auditErr) console.error('create-user audit insert failed:', auditErr.message)
  return {
    undo: async () => {
      await admin.auth.admin.updateUserById(p.id, { email, email_confirm: true })
    },
  }
}

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

    // Starter/Essential/Plus staff limit — checked BEFORE creating the auth user so a rejected
    // request doesn't leave an orphaned login. The trg_enforce_staff_limit trigger on
    // profiles enforces the same rule in the database.
    const newRole = role || 'staff'
    const { data: org } = await supabaseAdmin
      .from('organizations').select('name, plan, staff_limit').eq('id', organization_id).single()
    if (['starter', 'essential', 'plus'].includes(org?.plan) && org.staff_limit != null && !['resident', 'family'].includes(newRole)) {
      const { count } = await supabaseAdmin
        .from('profiles').select('id', { count: 'exact', head: true })
        .eq('organization_id', organization_id)
        .not('is_active', 'is', false)
        .not('role', 'in', '(resident,family)')
      if ((count ?? 0) >= org.staff_limit) {
        return respond({
          success: false, limit_reached: true,
          error: `Staff limit reached: your ${org.plan.charAt(0).toUpperCase() + org.plan.slice(1)} plan includes up to ${org.staff_limit} staff accounts. Upgrade under Admin Panel → Billing to add more.`,
        })
      }
    }

    const cleanEmail = email.trim().toLowerCase()
    const createLogin = () => supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      email_confirm: true,
      user_metadata: { first_name: first_name.trim(), last_name: (last_name || '').trim() }
    })
    let { data: newUser, error: createError } = await createLogin()

    // Someone who left another community on ElderLoop: fresh login here, same email
    let formerLogin = false
    let undoAside: null | (() => Promise<void>) = null
    if (createError && isEmailTaken(createError) && !['resident', 'family'].includes(newRole)) {
      const freed: any = await setAsideFormerLogin(supabaseAdmin, cleanEmail, organization_id)
      if (freed.error) return respond({ success: false, error: freed.error })
      ;({ data: newUser, error: createError } = await createLogin())
      if (createError) await freed.undo()   // nothing left half done
      else { formerLogin = true; undoAside = freed.undo }
    }

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
      if (undoAside) await undoAside()   // the former login gets its email back
      return respond({ success: false, error: profileError.message })
    }

    // Email a password-setup link so the new staff member sets their own
    // password — no admin-chosen temp password to lose track of.
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://elderloop.xyz'
    // Link to our own page with the one-time code, not Supabase's action_link: email
    // scanners (Microsoft Safe Links) open every link and would use the code up.
    // ResetPassword.jsx spends it only when the person presses Set New Password.
    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim().toLowerCase(),
    })
    const tokenHash = linkData?.properties?.hashed_token
    const setupLink = tokenHash ? `${siteUrl}/reset-password?token_hash=${tokenHash}&type=recovery` : `${siteUrl}/forgot-password`

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
          ${formerLogin ? `<p style="color:#475569;font-size:15px;line-height:1.6;">If you used ElderLoop at another community before, this is a new login for ${orgName} with the same email. Set a new password with the button below.</p>` : ''}
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
      console.error('create-user Resend error:', resendRes.status, await resendRes.text())
    }

    return respond({ success: true, user_id: newUser.user.id })

  } catch (error) {
    return respond({ success: false, error: error.message })
  }
})
