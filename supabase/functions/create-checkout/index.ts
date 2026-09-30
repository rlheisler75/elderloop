import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@14'

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

const PRICE_IDS: Record<string, string> = {
  essential:    Deno.env.get('STRIPE_PRICE_ESSENTIAL')    ?? '',
  professional: Deno.env.get('STRIPE_PRICE_PROFESSIONAL') ?? '',
}
// AI Add-on — a second line item on an Essential/Professional subscription.
// Same price id must be set as STRIPE_PRICE_AI_ADDON in Vercel (api/webhook.js).
const AI_ADDON_PRICE = Deno.env.get('STRIPE_PRICE_AI_ADDON') ?? ''

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '')
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const client = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Verify caller
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user } } = await client.auth.getUser(token)
    if (!user) return respond({ success: false, error: 'Unauthorized' }, 401)

    const { data: profile } = await admin.from('profiles')
      .select('organization_id, role').eq('id', user.id).single()
    if (!profile?.organization_id) return respond({ success: false, error: 'No organization found' })
    if (!['org_admin', 'ceo', 'super_admin'].includes(profile.role))
      return respond({ success: false, error: 'Must be org admin to manage billing' })

    const { data: org } = await admin.from('organizations')
      .select('id, name, plan, stripe_customer_id, stripe_subscription_id')
      .eq('id', profile.organization_id).single()
    if (!org) return respond({ success: false, error: 'Organization not found' })

    const body = await req.json()

    // ── AI ADD-ON: add or remove the add-on line item ─────────
    if (body.addon === 'ai') {
      if (!AI_ADDON_PRICE) return respond({ success: false, error: 'The AI Add-on isn’t available yet. Please contact support.' })
      if (!['essential', 'professional'].includes(org.plan) || !org.stripe_subscription_id)
        return respond({ success: false, error: 'The AI Add-on requires an Essential or Professional plan. Upgrade your plan first.' })

      const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id)
      if (!['active', 'trialing', 'past_due'].includes(subscription.status))
        return respond({ success: false, error: 'Your subscription isn’t active. Please update billing first.' })
      const addonItem = subscription.items.data.find(i => i.price.id === AI_ADDON_PRICE)

      if (body.action === 'remove') {
        if (addonItem) {
          await stripe.subscriptions.update(org.stripe_subscription_id, {
            items: [{ id: addonItem.id, deleted: true }],
            proration_behavior: 'create_prorations', // credit the unused time on the next invoice
          })
        }
      } else {
        if (!addonItem) {
          await stripe.subscriptions.update(org.stripe_subscription_id, {
            items: [{ price: AI_ADDON_PRICE, quantity: 1 }], // existing plan item is kept
            proration_behavior: 'always_invoice',             // bill the prorated amount now
            metadata: { organization_id: org.id },
          })
        }
      }

      // Reflect it right away; the Stripe webhook (syncAiAddon) keeps it in sync after
      await admin.from('organization_modules').upsert(
        { organization_id: org.id, module_key: 'ai_assist', is_enabled: body.action !== 'remove' },
        { onConflict: 'organization_id,module_key' })

      return respond({ success: true, ai_addon: body.action !== 'remove' })
    }

    const { plan, success_url, cancel_url, promo_code } = body
    const priceId = PRICE_IDS[plan]
    if (!priceId) return respond({ success: false, error: `Invalid plan: ${plan}` })

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://elderloop.xyz'
    const successUrl = success_url ?? `${siteUrl}/app/dashboard?upgraded=1`
    const cancelUrl  = cancel_url  ?? `${siteUrl}/app/admin?tab=billing`

    // ── Resolve a rep promo code (if any) to a live Stripe promotion code ──
    let promotionCodeId: string | null = null
    if (promo_code) {
      const { data: promo } = await admin.from('rep_promo_codes')
        .select('stripe_promotion_code_id, is_active, expires_at, max_redemptions, times_redeemed, applies_to_plan')
        .eq('code', String(promo_code).trim().toUpperCase())
        .single()

      const notExpired   = !promo?.expires_at || new Date(promo.expires_at) > new Date()
      const notExhausted = !promo?.max_redemptions || promo.times_redeemed < promo.max_redemptions
      const planMatches  = !promo?.applies_to_plan || promo.applies_to_plan === plan

      if (promo?.is_active && promo.stripe_promotion_code_id && notExpired && notExhausted && planMatches) {
        promotionCodeId = promo.stripe_promotion_code_id
      }
    }

    // ── UPGRADE PATH: already has a subscription ──────────────
    if (org.stripe_subscription_id) {
      const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id)
      // The plan item — not the AI Add-on line, which is kept as-is
      const planItem = subscription.items.data.find(i => i.price.id !== AI_ADDON_PRICE) ?? subscription.items.data[0]

      // Update subscription with proration (Stripe handles the math)
      await stripe.subscriptions.update(org.stripe_subscription_id, {
        items: [{ id: planItem.id, price: priceId }],
        proration_behavior: 'always_invoice', // charge prorated amount immediately
        metadata: { organization_id: org.id },
      })

      return respond({ success: true, upgraded: true, redirect_url: successUrl })
    }

    // ── NEW CHECKOUT: no subscription yet ──────
    // Ensure Stripe customer exists
    let customerId = org.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name:  org.name,
        metadata: { organization_id: org.id },
      })
      customerId = customer.id
      await admin.from('organizations').update({ stripe_customer_id: customerId }).eq('id', org.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url:  cancelUrl,
      metadata:    { organization_id: org.id },
      subscription_data: {
        trial_period_days: 14,
        metadata: { organization_id: org.id },
      },
      ...(promotionCodeId
        ? { discounts: [{ promotion_code: promotionCodeId }] }
        : { allow_promotion_codes: true }),
    })

    return respond({ success: true, checkout_url: session.url })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('create-checkout error:', message)
    return respond({ success: false, error: message })
  }
})
