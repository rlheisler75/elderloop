// Sends a staff member the "You've been added to <community>" welcome email again
// with a fresh password-setup link, for someone whose first link expired (24 hours)
// before they used it. Same email and permission rule as create-user: Org Admins
// and HR/Payroll Managers for their own community, super admins for anyone.
// Admin Panel → Users → Resend welcome email.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const respond = (data: object, status = 200) =>
  new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })

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

    const { target_user_id } = await req.json()
    if (!target_user_id) return respond({ success: false, error: 'target_user_id is required' })

    const [{ data: callerProfile }, { data: target }] = await Promise.all([
      supabaseAdmin.from('profiles').select('email, role, organization_id').eq('id', callingUser.id).single(),
      supabaseAdmin.from('profiles').select('email, first_name, role, organization_id, is_active').eq('id', target_user_id).single(),
    ])
    if (!target?.email || !target.organization_id) return respond({ success: false, error: 'Staff member not found' })
    if (target.is_active === false) return respond({ success: false, error: 'This account is inactive; reactivate it first' })
    if (['resident', 'family'].includes(target.role)) {
      return respond({ success: false, error: 'Portal logins get their welcome email from the resident record' })
    }

    // Same rule as create-user
    let isPrivileged = !!callerProfile && ['org_admin', 'super_admin'].includes(callerProfile.role)
    if (!isPrivileged && callerProfile) {
      const { data: deptRoles } = await supabaseAdmin
        .from('staff_department_roles').select('department')
        .eq('profile_id', callingUser.id).in('department', ['hr', 'payroll']).eq('level', 'manager')
      isPrivileged = !!deptRoles && deptRoles.length > 0
    }
    if (!callerProfile || !isPrivileged) {
      return respond({ success: false, error: 'Insufficient permissions — must be org_admin, super_admin, or an HR/Payroll Manager' })
    }
    if (callerProfile.role !== 'super_admin' && callerProfile.organization_id !== target.organization_id) {
      return respond({ success: false, error: 'Cannot email staff of other organizations' })
    }

    const { data: org } = await supabaseAdmin.from('organizations').select('name').eq('id', target.organization_id).single()
    const orgName = org?.name ?? 'your community'
    const email = target.email.trim().toLowerCase()
    const firstName = (target.first_name ?? '').trim() || 'there'

    // Our own page with the one-time code, not Supabase's action_link: email scanners
    // (Microsoft Safe Links) open every link and would use the code up.
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://elderloop.xyz'
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email })
    const tokenHash = linkData?.properties?.hashed_token
    if (linkErr || !tokenHash) return respond({ success: false, error: linkErr?.message ?? "Couldn't create a setup link" })
    const setupLink = `${siteUrl}/reset-password?token_hash=${tokenHash}&type=recovery`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY') ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ElderLoop Support <info@elderloop.xyz>',
        to: [email],
        subject: `You've been added to ${orgName} on ElderLoop`,
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
            <td><img src="${siteUrl}/icon-192.png" width="28" height="28" alt="ElderLoop" style="display:block;border-radius:8px;" /></td>
            <td style="padding-left:10px;"><span style="font-size:18px;font-weight:700;color:#0c2340;">ElderLoop</span></td>
          </tr></table>
          <h2 style="color:#1e3a5f;margin:0 0 12px;">Welcome, ${firstName}!</h2>
          <p style="color:#475569;font-size:15px;line-height:1.6;">You've been added as a staff member at <strong>${orgName}</strong> on ElderLoop. Click below to set your password and get started.</p>
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
      const detail = await resendRes.text()
      console.error('resend-welcome Resend error:', resendRes.status, detail)
      return respond({ success: false, error: `The email service refused the message (${resendRes.status})` })
    }

    const { error: auditErr } = await supabaseAdmin.from('audit_log').insert({
      organization_id: target.organization_id,
      user_id: callingUser.id,
      user_email: callerProfile.email ?? callingUser.email,
      user_role: callerProfile.role,
      action: 'WELCOME_RESENT',
      table_name: 'profiles',
      record_id: target_user_id,
      new_values: { target_email: email },
      notes: 'Welcome email sent again with a new setup link',
    })
    if (auditErr) console.error('resend-welcome audit insert failed:', auditErr.message)

    return respond({ success: true, email })
  } catch (error) {
    return respond({ success: false, error: error instanceof Error ? error.message : String(error) })
  }
})
