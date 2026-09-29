import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SITE_URL = process.env.SITE_URL || 'https://elderloop.xyz'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Verify caller session + role ──────────────────────────────
  // Without this, anyone could open the Stripe Billing Portal (cancel the plan,
  // change payment methods) for any org just by POSTing its id.
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !['org_admin', 'ceo', 'super_admin'].includes(profile.role)) {
    return res.status(403).json({ error: 'Not authorized to manage billing' })
  }

  const { organizationId } = req.body || {}

  if (!organizationId) {
    return res.status(400).json({ error: 'Missing organizationId' })
  }

  if (profile.role !== 'super_admin' && profile.organization_id !== organizationId) {
    return res.status(403).json({ error: 'Not authorized to manage billing for this organization' })
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
      return_url: `${SITE_URL}/app/admin?tab=billing`,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe portal error:', err)
    return res.status(500).json({ error: err.message })
  }
}
