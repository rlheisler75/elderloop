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
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !['sales_rep', 'super_admin'].includes(profile.role)) {
    return res.status(403).json({ error: 'Not authorized to create promo codes' })
  }

  const {
    code, discount_type, discount_value, duration_months,
    applies_to_plan, max_redemptions, expires_at,
  } = req.body

  if (!code || !discount_type || !discount_value) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  if (!['percent', 'amount'].includes(discount_type)) {
    return res.status(400).json({ error: 'Invalid discount_type' })
  }

  try {
    // ── Create Stripe Coupon ──────────────────────────────────
    const couponParams = {
      duration: duration_months ? 'repeating' : 'forever',
      ...(duration_months ? { duration_in_months: duration_months } : {}),
      ...(discount_type === 'percent'
        ? { percent_off: discount_value }
        : { amount_off: Math.round(discount_value * 100), currency: 'usd' }),
      name: `Rep code ${code}`,
    }
    const coupon = await stripe.coupons.create(couponParams)

    // ── Create Stripe Promotion Code ──────────────────────────
    const promoCodeParams = {
      coupon: coupon.id,
      code,
      ...(max_redemptions ? { max_redemptions } : {}),
      ...(expires_at ? { expires_at: Math.floor(new Date(expires_at).getTime() / 1000) } : {}),
    }
    const promotionCode = await stripe.promotionCodes.create(promoCodeParams)

    // ── Store in Supabase (service role — RLS scopes writes by rep_id) ──
    const { data: row, error: insertError } = await supabase
      .from('rep_promo_codes')
      .insert({
        rep_id:                   profile.id,
        code,
        discount_type,
        discount_value,
        duration_months:          duration_months || null,
        applies_to_plan:          applies_to_plan || null,
        stripe_coupon_id:         coupon.id,
        stripe_promotion_code_id: promotionCode.id,
        max_redemptions:          max_redemptions || null,
        expires_at:               expires_at || null,
      })
      .select()
      .single()

    if (insertError) {
      // Roll back the Stripe objects so we don't leak orphaned coupons
      await stripe.promotionCodes.update(promotionCode.id, { active: false }).catch(() => {})
      await stripe.coupons.del(coupon.id).catch(() => {})
      return res.status(500).json({ error: insertError.message })
    }

    return res.status(200).json({ success: true, promo_code: row })
  } catch (err) {
    console.error('Rep promo code creation error:', err)
    return res.status(500).json({ error: err.message })
  }
}
