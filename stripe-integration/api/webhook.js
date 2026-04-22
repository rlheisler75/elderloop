import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Required to parse raw body for Stripe signature verification
export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawBody = await getRawBody(req)
  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  try {
    switch (event.type) {

      // ── Checkout completed ──────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object
        const orgId = session.metadata?.organization_id
        if (!orgId) break

        const subscription = await stripe.subscriptions.retrieve(session.subscription)
        await supabase.from('organizations').update({
          stripe_subscription_id: subscription.id,
          stripe_price_id:        subscription.items.data[0]?.price?.id,
          subscription_status:    subscription.status,
          billing_status:         subscription.status === 'trialing' ? 'trialing' : 'active',
          current_period_start:   new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end:     new Date(subscription.current_period_end   * 1000).toISOString(),
          trial_end:              subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          plan: getPlanFromPriceId(subscription.items.data[0]?.price?.id),
          plan_price: (subscription.items.data[0]?.price?.unit_amount / 100) || null,
        }).eq('id', orgId)
        break
      }

      // ── Subscription updated (plan change, renewal, etc.) ───
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const orgId = sub.metadata?.organization_id
          || await getOrgIdFromCustomer(sub.customer)
        if (!orgId) break

        await supabase.from('organizations').update({
          stripe_price_id:      sub.items.data[0]?.price?.id,
          subscription_status:  sub.status,
          billing_status:       mapSubStatusToBilling(sub.status),
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end:   new Date(sub.current_period_end   * 1000).toISOString(),
          trial_end:            sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null,
          cancel_at_period_end: sub.cancel_at_period_end,
          plan:      getPlanFromPriceId(sub.items.data[0]?.price?.id),
          plan_price: (sub.items.data[0]?.price?.unit_amount / 100) || null,
        }).eq('id', orgId)
        break
      }

      // ── Subscription deleted/cancelled ──────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const orgId = sub.metadata?.organization_id
          || await getOrgIdFromCustomer(sub.customer)
        if (!orgId) break

        await supabase.from('organizations').update({
          subscription_status:   'canceled',
          billing_status:        'canceled',
          cancel_at_period_end:  false,
          stripe_subscription_id: null,
        }).eq('id', orgId)
        break
      }

      // ── Payment failed ──────────────────────────────────────
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

      // ── Payment succeeded ───────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        if (invoice.billing_reason === 'subscription_create') break // handled above
        const orgId = await getOrgIdFromCustomer(invoice.customer)
        if (!orgId) break

        await supabase.from('organizations').update({
          subscription_status: 'active',
          billing_status:      'active',
        }).eq('id', orgId)
        break
      }

      default:
        // Unhandled event type — ignore
        break
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return res.status(500).json({ error: err.message })
  }
}

// ── Helpers ───────────────────────────────────────────────────

async function getOrgIdFromCustomer(customerId) {
  const { data } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()
  return data?.id || null
}

function mapSubStatusToBilling(status) {
  const map = {
    active:   'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid:   'unpaid',
    paused:   'paused',
  }
  return map[status] || 'inactive'
}

function getPlanFromPriceId(priceId) {
  // Map your Stripe Price IDs to plan names
  // Update these after you create products in Stripe
  const map = {
    [process.env.STRIPE_PRICE_STARTER]:   'starter',
    [process.env.STRIPE_PRICE_COMMUNITY]: 'community',
    [process.env.STRIPE_PRICE_ENTERPRISE]:'enterprise',
  }
  return map[priceId] || 'community'
}
