import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Verify caller session + role ──────────────────────────────
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
    return res.status(403).json({ error: 'Not authorized to view invoices' })
  }

  const { organizationId } = req.query

  if (!organizationId) {
    return res.status(400).json({ error: 'Missing organizationId' })
  }

  if (profile.role !== 'super_admin' && profile.organization_id !== organizationId) {
    return res.status(403).json({ error: 'Not authorized to view invoices for this organization' })
  }

  try {
    // Resolve the customer server-side rather than trusting a client-supplied id
    const { data: org, error } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', organizationId)
      .single()

    if (error || !org?.stripe_customer_id) {
      return res.status(200).json({ invoices: [] })
    }

    const invoices = await stripe.invoices.list({
      customer: org.stripe_customer_id,
      limit: 24,
    })

    return res.status(200).json({
      invoices: invoices.data.map(inv => ({
        id:                  inv.id,
        created:             inv.created,
        amount_paid:         inv.amount_paid,
        amount_due:          inv.amount_due,
        status:              inv.status,
        description:         inv.description,
        hosted_invoice_url:  inv.hosted_invoice_url,
        invoice_pdf:         inv.invoice_pdf,
        lines:               { data: inv.lines.data.slice(0, 1) },
      })),
    })
  } catch (err) {
    console.error('Invoice fetch error:', err)
    return res.status(500).json({ error: err.message })
  }
}
