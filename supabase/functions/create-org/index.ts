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

// Keep in sync with plan_allows_module() (SQL), src/lib/planModules.js, and
// PLAN_MODULE_KEYS in api/webhook.js. Essential, Plus, and Professional all get every
// module; they differ only in resident/staff caps (PLAN_LIMITS below).
const ALL_MODULES = [
  'activities','central_supply','chapel','communication','dietary','directory',
  'family','housekeeping','incidents','it','marketing','meters','nursing',
  'property_management','scheduling','security','social_services','staff',
  'surveys','timeclock','transportation','work_orders'
]
const PLAN_MODULE_KEYS: Record<string, string[]> = {
  starter:      ['directory', 'staff', 'communication', 'family'],
  essential:    ALL_MODULES,
  plus:         ALL_MODULES,
  professional: ALL_MODULES,
}

const PLAN_LIMITS: Record<string, { residents: number | null; staff: number | null }> = {
  starter:      { residents: 50,   staff: 10   },
  essential:    { residents: 100,  staff: 40   },
  plus:         { residents: 200,  staff: 75   },
  professional: { residents: null, staff: null },
}

// Default per-role module visibility (Admin Panel → Role Templates). Seeded here so a
// brand-new org doesn't start with an empty template and staff seeing almost nothing —
// same defaults already curated and in production use for the Sunrise Gardens pilot org.
// Org Admin/CEO/Super Admin excluded (already unconditional full access), Family/Resident
// excluded (routed to a fixed portal, hasModule()/role templates never apply to them).
const ROLE_TEMPLATE: Record<string, string[]> = {
  staff:           ['activities', 'chapel', 'communication', 'directory', 'timeclock'],
  supervisor:      ['activities', 'chapel', 'communication', 'dietary', 'directory', 'housekeeping', 'incidents', 'nursing', 'staff', 'timeclock', 'transportation', 'work_orders'],
  manager:         ['activities', 'chapel', 'communication', 'dietary', 'directory', 'family', 'housekeeping', 'incidents', 'marketing', 'nursing', 'property_management', 'security', 'staff', 'surveys', 'timeclock', 'transportation', 'work_orders'],
  maintenance:     ['communication', 'directory', 'incidents', 'timeclock', 'work_orders'],
  dietary:         ['activities', 'communication', 'dietary', 'directory', 'timeclock'],
  housekeeping:    ['activities', 'communication', 'directory', 'housekeeping', 'timeclock'],
  nursing:         ['activities', 'chapel', 'communication', 'dietary', 'directory', 'incidents', 'nursing'],
  social_services: ['activities', 'chapel', 'communication', 'directory', 'incidents', 'social_services'],
}

function makeSlug(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 60)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return respond({ success: false, error: 'Method not allowed' }, 405)

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await req.json()
    const { email, password, first_name, last_name, community_name, plan = 'starter', rep_code } = body

    if (!email?.trim() || !password || !first_name?.trim() || !last_name?.trim() || !community_name?.trim())
      return respond({ success: false, error: 'Name, email, password, and community name are required.' })
    if (password.length < 8)
      return respond({ success: false, error: 'Password must be at least 8 characters.' })

    const validPlan = ['starter', 'essential', 'plus', 'professional'].includes(plan) ? plan : 'starter'
    const limits = PLAN_LIMITS[validPlan]
    const moduleKeys = PLAN_MODULE_KEYS[validPlan] || PLAN_MODULE_KEYS['starter']

    let slug = makeSlug(community_name) || 'community'
    const { data: existing } = await admin.from('organizations').select('slug').eq('slug', slug)
    if (existing && existing.length > 0) slug = `${slug}-${Date.now().toString(36)}`

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { first_name: first_name.trim(), last_name: last_name.trim() },
    })
    if (authError) {
      const msg = authError.message || ''
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered') || msg.toLowerCase().includes('exists'))
        return respond({ success: false, error: 'An account with this email already exists. Try logging in.' })
      return respond({ success: false, error: msg || 'Failed to create account.' })
    }
    const userId = authData.user.id

    const { data: org, error: orgError } = await admin.from('organizations').insert({
      name: community_name.trim(), slug,
      plan: validPlan, billing_status: 'pilot', is_active: true,
      rep_code: rep_code?.trim().toUpperCase() || null,
      resident_limit: limits.residents, staff_limit: limits.staff,
    }).select('id').single()

    if (orgError) {
      await admin.auth.admin.deleteUser(userId)
      return respond({ success: false, error: 'Failed to create organization: ' + orgError.message })
    }
    const orgId = org.id

    await admin.from('profiles').update({
      organization_id: orgId, role: 'org_admin',
      first_name: first_name.trim(), last_name: last_name.trim(),
      email: email.trim().toLowerCase(), is_active: true,
      updated_at: new Date().toISOString(),
    }).eq('id', userId)

    if (moduleKeys.length > 0) {
      await admin.from('organization_modules').insert(
        moduleKeys.map((key: string) => ({ organization_id: orgId, module_key: key, is_enabled: true }))
      )
    }

    // Seed Role Templates (role_module_visibility) with sensible per-role defaults,
    // trimmed to whichever modules this plan actually enables — same approach already
    // used above for organization_modules.
    const enabledSet = new Set(moduleKeys)
    const roleVisRows: { organization_id: string; role: string; module_key: string }[] = []
    for (const [role, modules] of Object.entries(ROLE_TEMPLATE)) {
      for (const key of modules) {
        if (enabledSet.has(key)) roleVisRows.push({ organization_id: orgId, role, module_key: key })
      }
    }
    if (roleVisRows.length > 0) {
      await admin.from('role_module_visibility').insert(roleVisRows)
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://elderloop.xyz'
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY') ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ElderLoop Support <info@elderloop.xyz>',
        to: [email.trim().toLowerCase()],
        subject: 'Welcome to ElderLoop',
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;"><h2 style="color:#1e3a5f;">Welcome to ElderLoop, ${first_name.trim()}!</h2><p style="color:#475569;">Your community <strong>${community_name.trim()}</strong> is ready on the <strong>${validPlan.charAt(0).toUpperCase()+validPlan.slice(1)}</strong> plan.</p><div style="margin:28px 0;"><a href="${siteUrl}/login" style="display:inline-block;padding:12px 28px;background:#0c90e1;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Log In to ElderLoop</a></div><p style="color:#94a3b8;font-size:12px;">Questions? Email us at info@elderloop.xyz</p></div>`,
      }),
    })
    if (!resendRes.ok) {
      console.error('create-org Resend error:', resendRes.status, await resendRes.text())
    }

    return respond({ success: true, org_id: orgId, user_id: userId, plan: validPlan })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('create-org error:', message)
    return respond({ success: false, error: message })
  }
})
