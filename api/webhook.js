import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const config = { api: { bodyParser: false } }

// ── Plan config ────────────────────────────────────────────────
const PLAN_MODULES = {
  starter:      ['directory', 'staff', 'communication', 'family'],
  essential:    ['directory', 'staff', 'communication', 'family', 'chapel', 'activities', 'incidents', 'nursing'],
  professional: null, // null = all modules
}

const PLAN_LIMITS = {
  starter:      { resident_limit: 50,   staff_limit: 10   },
  essential:    { resident_limit: null, staff_limit: null },
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
        const priceId = subscription.items.data[0]?.price?.id
        const plan = getPlanFromPriceId(priceId)

        await supabase.from('organizations').update({
          stripe_customer_id:      session.customer,
          stripe_subscription_id:  subscription.id,
          stripe_price_id:         priceId,
          subscription_status:     subscription.status,
          billing_status:          subscription.status === 'trialing' ? 'trialing' : 'active',
          current_period_start:    new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end:      new Date(subscription.current_period_end   * 1000).toISOString(),
          trial_end:               subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString() : null,
          plan,
          plan_price:              (subscription.items.data[0]?.price?.unit_amount / 100) || null,
          ...PLAN_LIMITS[plan],
        }).eq('id', orgId)

        await enableModulesForPlan(orgId, plan)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const orgId = sub.metadata?.organization_id || await getOrgIdFromCustomer(sub.customer)
        if (!orgId) break

        const priceId = sub.items.data[0]?.price?.id
        const plan = getPlanFromPriceId(priceId)

        await supabase.from('organizations').update({
          stripe_price_id:      priceId,
          subscription_status:  sub.status,
          billing_status:       mapSubStatusToBilling(sub.status),
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end:   new Date(sub.current_period_end   * 1000).toISOString(),
          trial_end:            sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString() : null,
          cancel_at_period_end: sub.cancel_at_period_end,
          plan,
          plan_price:           (sub.items.data[0]?.price?.unit_amount / 100) || null,
          ...PLAN_LIMITS[plan],
        }).eq('id', orgId)

        await enableModulesForPlan(orgId, plan)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const orgId = sub.metadata?.organization_id || await getOrgIdFromCustomer(sub.customer)
        if (!orgId) break

        // Downgrade to starter — disable paid modules
        await supabase.from('organizations').update({
          subscription_status:    'canceled',
          billing_status:         'canceled',
          cancel_at_period_end:   false,
          stripe_subscription_id: null,
          plan:                   'starter',
          ...PLAN_LIMITS['starter'],
        }).eq('id', orgId)

        await enableModulesForPlan(orgId, 'starter')
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const orgId = await getOrgIdFromCustomer(invoice.customer)
        if (!orgId) break
        await supabase.from('organizations').update({
          subscription_status: 'past_due',
          billing_status:      'past_due',
        }).eq('id', orgId)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        if (invoice.billing_reason === 'subscription_create') break
        const orgId = await getOrgIdFromCustomer(invoice.customer)
        if (!orgId) break
        await supabase.from('organizations').update({
          subscription_status: 'active',
          billing_status:      'active',
        }).eq('id', orgId)
        break
      }

      default:
        break
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return res.status(500).json({ error: err.message })
  }
}

// ── Helpers ────────────────────────────────────────────────────

async function enableModulesForPlan(orgId, plan) {
  try {
    let moduleKeys

    if (plan === 'professional' || !PLAN_MODULES[plan]) {
      // Enable ALL modules
      const { data: allModules } = await supabase.from('modules').select('id, key').eq('is_active', true)
      moduleKeys = (allModules || []).map(m => ({ id: m.id, key: m.key }))
    } else {
      const keys = PLAN_MODULES[plan]
      const { data: modules } = await supabase.from('modules').select('id, key').in('key', keys)
      moduleKeys = modules || []
    }

    if (!moduleKeys.length) return

    // Upsert — enable new modules, don't touch ones already on
    await supabase.from('organization_modules').upsert(
      moduleKeys.map(m => ({
        organization_id: orgId,
        module_id:       m.id,
        is_enabled:      true,
      })),
      { onConflict: 'organization_id,module_id' }
    )

    // If downgrading (e.g. subscription canceled → starter),
    // disable modules not in the new plan
    if (plan !== 'professional') {
      const allowedKeys = PLAN_MODULES[plan] || []
      const { data: allOrgModules } = await supabase
        .from('organization_modules')
        .select('module_id, modules(key)')
        .eq('organization_id', orgId)

      const toDisable = (allOrgModules || [])
        .filter(m => !allowedKeys.includes(m.modules?.key))
        .map(m => m.module_id)

      if (toDisable.length) {
        await supabase.from('organization_modules')
          .update({ is_enabled: false })
          .eq('organization_id', orgId)
          .in('module_id', toDisable)
      }
    }
  } catch (err) {
    console.error('enableModulesForPlan error:', err.message)
  }
}

async function getOrgIdFromCustomer(customerId) {
  const { data } = await supabase.from('organizations')
    .select('id').eq('stripe_customer_id', customerId).single()
  return data?.id || null
}

function mapSubStatusToBilling(status) {
  const map = {
    active: 'active', trialing: 'trialing', past_due: 'past_due',
    canceled: 'canceled', unpaid: 'unpaid', paused: 'paused',
  }
  return map[status] || 'inactive'
}

function getPlanFromPriceId(priceId) {
  const map = {
    [process.env.STRIPE_PRICE_ESSENTIAL]:    'essential',
    [process.env.STRIPE_PRICE_PROFESSIONAL]: 'professional',
    // Legacy
    [process.env.STRIPE_PRICE_STARTER]:      'starter',
    [process.env.STRIPE_PRICE_COMMUNITY]:    'professional',
  }
  return map[priceId] || 'essential'
}
