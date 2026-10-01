import { createClient } from 'jsr:@supabase/supabase-js@2'

// Creates a Corporate Executive login (role 'corporate'): an org-less profile linked
// to a corporation. Super admin only — a corporation is linked to its communities by
// ElderLoop, never by a customer. The temporary password is replaced on first login
// (must_change_password → MustChangePasswordGate in CorporatePortal.jsx).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })

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
    if (!authHeader) return json({ success: false, error: 'No authorization header' }, 401)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: callingUser }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !callingUser) return json({ success: false, error: 'Unauthorized' }, 401)

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', callingUser.id).single()
    if (!callerProfile || callerProfile.role !== 'super_admin') {
      return json({ success: false, error: 'Insufficient permissions — must be super_admin' }, 403)
    }

    const { email, password, first_name, last_name, phone, corporation_id } = await req.json()
    if (!email || !password || !first_name || !corporation_id) {
      return json({ success: false, error: 'Missing required fields: email, password, first_name, corporation_id' })
    }
    if (String(password).length < 8) {
      return json({ success: false, error: 'Password must be at least 8 characters' })
    }

    const { data: corp } = await supabaseAdmin
      .from('corporations').select('id').eq('id', corporation_id).maybeSingle()
    if (!corp) return json({ success: false, error: 'Corporation not found' })

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: String(email).trim(),
      password,
      email_confirm: true,
      user_metadata: { first_name: String(first_name).trim(), last_name: String(last_name || '').trim() },
    })
    if (createError) return json({ success: false, error: createError.message })

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        organization_id: null,
        corporation_id,
        role: 'corporate',
        first_name: String(first_name).trim(),
        last_name: String(last_name || '').trim(),
        email: String(email).trim(),
        phone: phone || null,
        is_active: true,
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', newUser.user.id)

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return json({ success: false, error: profileError.message })
    }

    return json({ success: true, user_id: newUser.user.id })
  } catch (error) {
    return json({ success: false, error: (error as Error).message })
  }
})
