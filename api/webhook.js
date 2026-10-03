import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const config = { api: { bodyParser: false } }

const PLAN_MODULE_KEYS = {
  starter:      ['directory', 'staff', 'communication', 'family'],
  // null = all modules. Essential, Plus, and Professional are all the full platform
  // and differ only in resident/staff caps (PLAN_LIMITS).
  essential:    null,
  plus:         null,
  professional: null,
}

const PLAN_LIMITS = {
  starter:      { resident_limit: 50,   staff_limit: 10   },
  essential:    { resident_limit: 100,  staff_limit: 40   },
  plus:         { resident_limit: 200,  staff_limit: 75   },
  professional: { resident_limit: null, staff_limit: null },
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const rawBody = await getRawBody(req)
  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object
        const orgId = session.metadata?.organization_id
        if (!orgId) break
        const subscription = await stripe.subscriptions.retrieve(session.subscription)
        const planItem = getPlanItem(subscription)
        const priceId = planItem?.price?.id
        const plan = getPlanFromPriceId(priceId)
        await supabase.from('organizations').update({
          stripe_customer_id:     session.customer,
          stripe_subscription_id: subscription.id,
          stripe_price_id:        priceId,
          subscription_status:    subscription.status,
          billing_status:         subscription.status === 'trialing' ? 'trialing' : 'active',
          ...periodFields(subscription),
          trial_end:              toIso(subscription.trial_end),
          plan,
          plan_price:             (planItem?.price?.unit_amount / 100) || null,
          ...PLAN_LIMITS[plan],
        }).eq('id', orgId)
        await enableModulesForPlan(orgId, plan)
        await syncAiAddon(orgId, subscription)
        await syncBudgetsAddon(orgId, subscription)
        await redeemPromoCodeIfUsed(session.id, orgId)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const orgId = sub.metadata?.organization_id || await getOrgIdFromCustomer(sub.customer)
        if (!orgId) break
        const planItem = getPlanItem(sub)
        const priceId = planItem?.price?.id
        const plan = getPlanFromPriceId(priceId)
        await supabase.from('organizations').update({
          stripe_price_id:      priceId,
          subscription_status:  sub.status,
          billing_status:       mapSubStatusToBilling(sub.status),
          ...periodFields(sub),
          trial_end:            toIso(sub.trial_end),
          cancel_at_period_end: sub.cancel_at_period_end,
          plan,
          plan_price:           (planItem?.price?.unit_amount / 100) || null,
          ...PLAN_LIMITS[plan],
        }).eq('id', orgId)
        await enableModulesForPlan(orgId, plan)
        await syncAiAddon(orgId, sub)
        await syncBudgetsAddon(orgId, sub)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const orgId = sub.metadata?.organization_id || await getOrgIdFromCustomer(sub.customer)
        if (!orgId) break
        await supabase.from('organizations').update({
          subscription_status:    'canceled',
          billing_status:         'canceled',
          cancel_at_period_end:   false,
          stripe_subscription_id: null,
          plan:                   'starter',
          ...PLAN_LIMITS['starter'],
        }).eq('id', orgId)
        await enableModulesForPlan(orgId, 'starter')
        await syncAiAddon(orgId, null)
        await syncBudgetsAddon(orgId, null)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const orgId = await getOrgIdFromCustomer(invoice.customer)
        if (!orgId) break
        await supabase.from('organizations').update({ subscription_status: 'past_due', billing_status: 'past_due' }).eq('id', orgId)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        if (invoice.billing_reason === 'subscription_create') break
        const orgId = await getOrgIdFromCustomer(invoice.customer)
        if (!orgId) break
        await supabase.from('organizations').update({ subscription_status: 'active', billing_status: 'active' }).eq('id', orgId)
        break
      }

      default: break
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return res.status(500).json({ error: err.message })
  }
}

// ── Helpers ────────────────────────────────────────────────────

// The AI Add-on is a second line item on the plan subscription
// (STRIPE_PRICE_AI_ADDON). The plan is whichever item isn't the add-on.
const AI_ADDON_PRICE = process.env.STRIPE_PRICE_AI_ADDON

function getPlanItem(sub) {
  const items = sub.items?.data || []
  return items.find(i => i.price?.id !== AI_ADDON_PRICE) || items[0]
}

// Turn the ai_assist module on/off to match whether the subscription carries the
// add-on — or is on Professional, which includes AI. Only touches ai_assist —
// ai_assist_clinical stays a manual super-admin switch (it requires a signed HIPAA
// BAA). Skipped entirely if the price isn't configured, so a missing env var can
// never switch AI off for everyone.
async function syncAiAddon(orgId, sub) {
  if (!AI_ADDON_PRICE) return
  const live = !!sub && ['active', 'trialing', 'past_due'].includes(sub.status)
  const hasAddon = live && (
    (sub.items?.data || []).some(i => i.price?.id === AI_ADDON_PRICE) ||
    getPlanFromPriceId(getPlanItem(sub)?.price?.id) === 'professional'
  )
  const { error } = await supabase.from('organization_modules').upsert(
    { organization_id: orgId, module_key: 'ai_assist', is_enabled: hasAddon },
    { onConflict: 'organization_id,module_key' })
  if (error) console.error('syncAiAddon error:', error.message)
}

// Budgets add-on (budgets module). Included with Professional and for Enterprise
// communities (a corporation with 3+ active communities); otherwise sold as a
// $79/mo add-on line (STRIPE_PRICE_BUDGETS_ADDON, once that price exists). Like
// ai_assist, only billing (or a super admin) turns it on or off.
const BUDGETS_ADDON_PRICE = process.env.STRIPE_PRICE_BUDGETS_ADDON
const ENTERPRISE_MIN_COMMUNITIES = 3

async function isEnterpriseCommunity(orgId) {
  const { data: org } = await supabase.from('organizations').select('corporation_id').eq('id', orgId).maybeSingle()
  if (!org?.corporation_id) return false
  const { count } = await supabase.from('organizations').select('id', { count: 'exact', head: true })
    .eq('corporation_id', org.corporation_id).neq('is_active', false)
  return (count || 0) >= ENTERPRISE_MIN_COMMUNITIES
}

async function syncBudgetsAddon(orgId, sub) {
  const live = !!sub && ['active', 'trialing', 'past_due'].includes(sub.status)
  const included = live && (
    getPlanFromPriceId(getPlanItem(sub)?.price?.id) === 'professional' ||
    (!!BUDGETS_ADDON_PRICE && (sub.items?.data || []).some(i => i.price?.id === BUDGETS_ADDON_PRICE)) ||
    await isEnterpriseCommunity(orgId)
  )
  const { error } = await supabase.from('organization_modules').upsert(
    { organization_id: orgId, module_key: 'budgets', is_enabled: included },
    { onConflict: 'organization_id,module_key' })
  if (error) console.error('syncBudgetsAddon error:', error.message)
}

// Unix seconds → ISO string, or null when absent
function toIso(unixSeconds) {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null
}

// Since Stripe API 2025-03-31.basil, current_period_start/end live on each
// subscription item, not on the subscription. The SDK (v22) pins a newer API
// version, so reading them off the subscription gives undefined and
// new Date(NaN).toISOString() throws. Read the item first, then fall back to
// the top-level fields for events delivered on an older webhook API version.
function periodFields(sub) {
  const item = sub.items?.data?.[0]
  return {
    current_period_start: toIso(item?.current_period_start ?? sub.current_period_start),
    current_period_end:   toIso(item?.current_period_end   ?? sub.current_period_end),
  }
}

async function enableModulesForPlan(orgId, plan) {
  try {
    let moduleKeys

    if (!PLAN_MODULE_KEYS[plan]) {
      // Get all active module keys
      const { data: allModules } = await supabase.from('modules').select('key').eq('is_active', true)
      moduleKeys = (allModules || []).map(m => m.key)
    } else {
      moduleKeys = PLAN_MODULE_KEYS[plan]
    }

    if (!moduleKeys?.length) return

    // Upsert modules using module_key (not module_id)
    await supabase.from('organization_modules').upsert(
      moduleKeys.map(key => ({ organization_id: orgId, module_key: key, is_enabled: true })),
      { onConflict: 'organization_id,module_key' }
    )

    // Disable modules not in the new plan (for downgrades)
    if (plan !== 'professional') {
      const { data: allOrgModules } = await supabase
        .from('organization_modules')
        .select('module_key')
        .eq('organization_id', orgId)

      // AI modules aren't plan-based: ai_assist follows the add-on (syncAiAddon),
      // ai_assist_clinical is a manual super-admin switch
      const toDisable = (allOrgModules || [])
        .map(m => m.module_key)
        .filter(key => !moduleKeys.includes(key) && !key.startsWith('ai_assist'))

      if (toDisable.length) {
        await supabase.from('organization_modules')
          .update({ is_enabled: false })
          .eq('organization_id', orgId)
          .in('module_key', toDisable)
      }
    }
  } catch (err) {
    console.error('enableModulesForPlan error:', err.message)
  }
}

// If the checkout session redeemed a rep promotion code, credit the redemption
// and — if this org isn't already attributed to a rep — attribute it to whichever
// rep owns that code. This covers signups that only ever used a promo code (typed
// straight into Stripe Checkout, or passed via ?promo=) with no ?rep= link click,
// which would otherwise never show up in that rep's Accounts/Commissions tabs.
async function redeemPromoCodeIfUsed(sessionId, orgId) {
  try {
    const fullSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['discounts.promotion_code'],
    })
    const promo = fullSession.discounts?.[0]?.promotion_code
    const code = typeof promo === 'string'
      ? (await stripe.promotionCodes.retrieve(promo)).code
      : promo?.code
    if (!code) return
    await supabase.rpc('increment_promo_redemption', { p_code: code })

    const { data: promoRow } = await supabase
      .from('rep_promo_codes')
      .select('rep_id')
      .eq('code', code)
      .single()
    if (!promoRow?.rep_id) return

    const { data: repCodeRow } = await supabase
      .from('rep_codes')
      .select('code')
      .eq('rep_id', promoRow.rep_id)
      .maybeSingle()

    await supabase
      .from('organizations')
      .update({ rep_id: promoRow.rep_id, ...(repCodeRow?.code ? { rep_code: repCodeRow.code } : {}) })
      .eq('id', orgId)
      .is('rep_id', null)
  } catch (err) {
    console.error('redeemPromoCodeIfUsed error:', err.message)
  }
}

async function getOrgIdFromCustomer(customerId) {
  const { data } = await supabase.from('organizations')
    .select('id').eq('stripe_customer_id', customerId).single()
  return data?.id || null
}

function mapSubStatusToBilling(status) {
  const map = { active: 'active', trialing: 'trialing', past_due: 'past_due', canceled: 'canceled', unpaid: 'unpaid', paused: 'paused' }
  return map[status] || 'inactive'
}

function getPlanFromPriceId(priceId) {
  const pairs = [
    [process.env.STRIPE_PRICE_ESSENTIAL,    'essential'],
    [process.env.STRIPE_PRICE_PLUS,         'plus'],
    [process.env.STRIPE_PRICE_PROFESSIONAL, 'professional'],
    [process.env.STRIPE_PRICE_STARTER,      'starter'],
    [process.env.STRIPE_PRICE_COMMUNITY,    'professional'],
  ]
  // Skip unset env vars so an undefined price can't match an undefined priceId
  const hit = priceId && pairs.find(([id]) => id && id === priceId)
  return hit ? hit[1] : 'essential'
}
