// Changes a staff member's sign-in email (Admin Panel → Users → Edit User →
// Change) or a resident / family portal login's (Residents → resident → Portal
// Access → Change). The new address is their login right away and their password stays
// the same, so no new setup is needed. Both the old and new addresses get a
// notice, so a change someone didn't expect doesn't go unnoticed. Same
// permission rules as the functions that create the logins: staff = create-user
// (Org Admins and HR/Payroll Managers), portal logins = enable-resident-portal /
// enable-family-portal (Org Admins and the Administrator); super admins for anyone.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const respond = (data: object, status = 200) =>
  new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '')

    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user: callingUser } } = await supabaseClient.auth.getUser(token)
    if (!callingUser) return respond({ success: false, error: 'Unauthorized' })

    const { target_user_id, new_email } = await req.json()
    const email = String(new_email ?? '').trim().toLowerCase()
    if (!target_user_id) return respond({ success: false, error: 'target_user_id is required' })
    if (!EMAIL_RE.test(email)) return respond({ success: false, error: 'Enter a valid email address' })

    const [{ data: callerProfile }, { data: target }] = await Promise.all([
      supabaseAdmin.from('profiles').select('email, role, organization_id').eq('id', callingUser.id).single(),
      supabaseAdmin.from('profiles').select('email, first_name, role, organization_id').eq('id', target_user_id).single(),
    ])
    if (!target?.organization_id) return respond({ success: false, error: 'Account not found' })
    const isPortal = ['resident', 'family'].includes(target.role)

    // Same rules as the functions that create these logins
    let isPrivileged = !!callerProfile &&
      (isPortal ? ['org_admin', 'ceo', 'super_admin'] : ['org_admin', 'super_admin']).includes(callerProfile.role)
    if (!isPrivileged && callerProfile && !isPortal) {
      const { data: deptRoles } = await supabaseAdmin
        .from('staff_department_roles').select('department')
        .eq('profile_id', callingUser.id).in('department', ['hr', 'payroll']).eq('level', 'manager')
      isPrivileged = !!deptRoles && deptRoles.length > 0
    }
    if (!callerProfile || !isPrivileged) {
      return respond({ success: false, error: isPortal
        ? 'Only an Org Admin or the Administrator can change a portal login'
        : 'Insufficient permissions — must be org_admin, super_admin, or an HR/Payroll Manager' })
    }
    if (callerProfile.role !== 'super_admin') {
      if (callerProfile.organization_id !== target.organization_id) {
        return respond({ success: false, error: 'Cannot change accounts of other organizations' })
      }
      if (['super_admin', 'sales_rep'].includes(target.role)) {
        return respond({ success: false, error: 'Only ElderLoop can change this account' })
      }
      // Whoever controls the email controls the password reset, so an HR/Payroll
      // Manager can't move an Org Admin's or the Administrator's login
      if (callerProfile.role !== 'org_admin' && ['org_admin', 'ceo'].includes(target.role)) {
        return respond({ success: false, error: "Only an Org Admin can change an Org Admin's or the Administrator's email" })
      }
    }

    // The login is what counts: before this function, the Staff screen could change
    // profiles.email alone, so the two can disagree (and this repairs that)
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(target_user_id)
    const loginEmail = (authData?.user?.email ?? '').trim().toLowerCase()
    const oldEmail = loginEmail || (target.email ?? '').trim().toLowerCase()
    const profileEmail = (target.email ?? '').trim().toLowerCase()
    if (email === oldEmail && email === profileEmail) return respond({ success: false, error: 'That is already their email' })

    const { data: taken } = await supabaseAdmin.from('profiles').select('id').ilike('email', email).neq('id', target_user_id).limit(1)
    if (taken?.length) return respond({ success: false, error: 'Another ElderLoop account already uses that email' })

    // Confirmed right away: the admin vouches for it, and Supabase's own confirm
    // link would be opened (and used up) by email scanners
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, { email, email_confirm: true })
    if (authErr) {
      const msg = /already|registered|exists/i.test(authErr.message) ? 'Another ElderLoop account already uses that email' : authErr.message
      return respond({ success: false, error: msg })
    }

    const { error: profileErr } = await supabaseAdmin.from('profiles').update({ email }).eq('id', target_user_id)
    if (profileErr) {
      // Keep sign-in and profile in step: put the login back
      if (oldEmail) await supabaseAdmin.auth.admin.updateUserById(target_user_id, { email: oldEmail, email_confirm: true })
      return respond({ success: false, error: `Couldn't update the profile: ${profileErr.message}` })
    }

    const { data: org } = await supabaseAdmin.from('organizations').select('name').eq('id', target.organization_id).single()
    const orgName = org?.name ?? 'your community'
    const firstName = (target.first_name ?? '').trim() || 'there'
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://elderloop.xyz'

    const notice = (to: string, isNew: boolean) => fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY') ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ElderLoop Support <info@elderloop.xyz>',
        to: [to],
        subject: 'Your ElderLoop sign-in email was changed',
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
            <td><img src="${siteUrl}/icon-192.png" width="28" height="28" alt="ElderLoop" style="display:block;border-radius:8px;" /></td>
            <td style="padding-left:10px;"><span style="font-size:18px;font-weight:700;color:#0c2340;">ElderLoop</span></td>
          </tr></table>
          <h2 style="color:#1e3a5f;margin:0 0 12px;">Hi ${firstName},</h2>
          <p style="color:#475569;font-size:15px;line-height:1.6;">Staff at <strong>${orgName}</strong> changed your ElderLoop sign-in email${isNew ? ' to this address' : ''}.</p>
          <p style="color:#475569;font-size:15px;line-height:1.6;">From now on, sign in with <strong>${email}</strong>. Your password has not changed.</p>
          <p style="color:#475569;font-size:15px;line-height:1.6;">Sign in at <a href="${siteUrl}/login">${siteUrl}/login</a>.</p>
          <p style="color:#94a3b8;font-size:13px;">If you didn't expect this, contact ${orgName}.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
          <p style="color:#94a3b8;font-size:12px;">Powered by ElderLoop &middot; elderloop.xyz</p>
        </div>`,
      }),
    }).then(async r => { if (!r.ok) console.error('change-user-email Resend error:', r.status, await r.text()) })
      .catch(e => console.error('change-user-email Resend failed:', e))
    await Promise.all([notice(email, true), ...(oldEmail && oldEmail !== email ? [notice(oldEmail, false)] : [])])

    const { error: auditErr } = await supabaseAdmin.from('audit_log').insert({
      organization_id: target.organization_id,
      user_id: callingUser.id,
      user_email: callerProfile.email ?? callingUser.email,
      user_role: callerProfile.role,
      action: 'EMAIL_CHANGED',
      table_name: 'profiles',
      record_id: target_user_id,
      old_values: { email: oldEmail },
      new_values: { email },
      notes: isPortal ? `Portal (${target.role}) sign-in email changed` : 'Sign-in email changed by an administrator',
    })
    if (auditErr) console.error('change-user-email audit insert failed:', auditErr.message)

    return respond({ success: true, email })
  } catch (error) {
    return respond({ success: false, error: error instanceof Error ? error.message : String(error) })
  }
})
