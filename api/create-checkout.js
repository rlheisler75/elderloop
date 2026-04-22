import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { organizationId, priceId, orgName, contactEmail } = req.body

  if (!organizationId || !priceId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // Fetch org to check for existing Stripe customer
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, contact_email, stripe_customer_id')
      .eq('id', organizationId)
      .single()

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organization not found' })
    }

    // Create or retrieve Stripe customer
    let customerId = org.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: orgName || org.name,
        email: contactEmail || org.contact_email,
        metadata: { organization_id: organizationId },
      })
      customerId = customer.id

      // Save customer ID to Supabase immediately
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', organizationId)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { organization_id: organizationId },
      },
      metadata: { organization_id: organizationId },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin?billing=success`,
      cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/admin?billing=cancelled`,
      allow_promotion_codes: true,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return res.status(500).json({ error: err.message })
  }
}
