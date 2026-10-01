import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'

// Enterprise pricing: 15% off each community's plan once a corporation has 3+ active
// communities. Applies (or removes) the ELDERLOOP_ENTERPRISE_15 coupon on every linked
// community's subscription, keeping any other discount (e.g. a rep promo code) in
// place. The coupon covers the plan products only, never the AI Add-on.
// Super admin only — run from Super Admin → Corporations after linking/unlinking.

const COUPON_ID = 'ELDERLOOP_ENTERPRISE_15'
const MIN_COMMUNITIES = 3

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const anon = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '')

    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user }, error: authError } = await anon.auth.getUser(token)
    if (authError || !user) return json({ success: false, error: 'Unauthorized' }, 401)

    const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (caller?.role !== 'super_admin') {
      return json({ success: false, error: 'Insufficient permissions — must be super_admin' }, 403)
    }

    const { corporation_id } = await req.json()
    if (!corporation_id) return json({ success: false, error: 'corporation_id is required' })

    const { data: orgs, error: orgErr } = await admin
      .from('organizations')
      .select('id, name, is_active, stripe_subscription_id')
      .eq('corporation_id', corporation_id)
    if (orgErr) return json({ success: false, error: orgErr.message })

    const active = (orgs ?? []).filter(o => o.is_active !== false)
    const qualifies = active.length >= MIN_COMMUNITIES

    // Communities unlinked from any corporation may still carry the coupon from an earlier sync
    const { data: orphans } = await admin
      .from('organizations')
      .select('id, name, is_active, stripe_subscription_id')
      .is('corporation_id', null)
      .not('stripe_subscription_id', 'is', null)

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '')

    const results: string[] = []
    let applied = 0, removed = 0, skipped = 0

    const sync = async (org: { name: string; stripe_subscription_id: string | null }, want: boolean) => {
      if (!org.stripe_subscription_id) { skipped++; if (want) results.push(`${org.name}: no subscription yet`); return }
      const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id, { expand: ['discounts'] })
      if (['canceled', 'incomplete_expired'].includes(sub.status)) { skipped++; return }
      const discounts = (sub.discounts ?? []) as Stripe.Discount[]
      const has = discounts.some(d => d.coupon?.id === COUPON_ID)
      if (want === has) return
      const keep = discounts.filter(d => d.coupon?.id !== COUPON_ID).map(d => ({ discount: d.id }))
      await stripe.subscriptions.update(org.stripe_subscription_id, {
        discounts: want ? [...keep, { coupon: COUPON_ID }] : keep,
        proration_behavior: 'none',
      })
      if (want) applied++; else removed++
      results.push(`${org.name}: ${want ? 'discount applied' : 'discount removed'}`)
    }

    for (const org of orgs ?? []) await sync(org, qualifies && org.is_active !== false)
    for (const org of orphans ?? []) await sync(org, false)

    const message = qualifies
      ? `${active.length} active communities — Enterprise 15% is on. Applied ${applied}, removed ${removed}${skipped ? `, ${skipped} without an active subscription` : ''}.`
      : `${active.length} active ${active.length === 1 ? 'community' : 'communities'} — Enterprise needs ${MIN_COMMUNITIES}. Removed ${removed}.`

    return json({ success: true, qualifies, applied, removed, skipped, results, message })
  } catch (error) {
    return json({ success: false, error: (error as Error).message })
  }
})
