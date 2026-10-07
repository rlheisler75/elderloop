// Resets a person's two-factor sign-in (lost or replaced phone): removes every
// authenticator on their account, so their next sign-in asks them to set one up again
// (if their role requires it) or signs them in with just the password.
//
// Who may: decided by can_reset_mfa(target), evaluated as the caller — Org Admins and
// Platform Admins for people in their own community, super admins for anyone, and the
// caller must have passed their own code step. Deleting factors needs the service role.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const authHeader = req.headers.get('Authorization') ?? ''
    const { target_user_id } = await req.json()
    if (!target_user_id) return json({ error: 'target_user_id is required' }, 400)

    // Permission check runs as the caller, so auth.uid() and their session's aal apply.
    const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: { user } } = await asCaller.auth.getUser()
    if (!user) return json({ error: 'Not signed in' }, 401)

    const { data: allowed, error: permErr } = await asCaller.rpc('can_reset_mfa', { p_target: target_user_id })
    if (permErr) return json({ error: permErr.message }, 500)
    if (allowed !== true) return json({ error: 'Not allowed' }, 403)

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: list, error: listErr } = await admin.auth.admin.mfa.listFactors({ userId: target_user_id })
    if (listErr) return json({ error: listErr.message }, 500)

    let removed = 0
    for (const f of list?.factors ?? []) {
      const { error: delErr } = await admin.auth.admin.mfa.deleteFactor({ userId: target_user_id, id: f.id })
      if (delErr) return json({ error: delErr.message, removed }, 500)
      removed++
    }

    const [{ data: caller }, { data: target }] = await Promise.all([
      admin.from('profiles').select('email, role, organization_id').eq('id', user.id).single(),
      admin.from('profiles').select('email, organization_id').eq('id', target_user_id).single(),
    ])
    const { error: auditErr } = await admin.from('audit_log').insert({
      organization_id: target?.organization_id ?? caller?.organization_id ?? null,
      user_id: user.id,
      user_email: caller?.email ?? user.email,
      user_role: caller?.role ?? null,
      action: 'MFA_RESET',
      table_name: 'auth.mfa_factors',
      record_id: target_user_id,
      new_values: { target_email: target?.email ?? null, factors_removed: removed },
      notes: 'Two-factor sign-in reset by an administrator',
    })
    if (auditErr) console.error('MFA reset audit insert failed:', auditErr.message)

    return json({ success: true, removed })
  } catch (err) {
    console.error('reset-user-mfa error:', err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
