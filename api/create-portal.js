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

  const { organizationId } = req.body

  if (!organizationId) {
    return res.status(400).json({ error: 'Missing organizationId' })
  }

  try {
    const { data: org, error } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', organizationId)
      .single()

    if (error || !org?.stripe_customer_id) {
      return res.status(404).json({ error: 'No Stripe customer found for this organization' })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin?tab=billing`,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe portal error:', err)
    return res.status(500).json({ error: err.message })
  }
}
