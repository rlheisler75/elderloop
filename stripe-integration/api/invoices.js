import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { customerId } = req.query

  if (!customerId) {
    return res.status(400).json({ error: 'Missing customerId' })
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
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
