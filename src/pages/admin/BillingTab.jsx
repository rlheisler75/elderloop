import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  CreditCard, CheckCircle, AlertTriangle, XCircle, Clock,
  Zap, Building2, ChevronRight, ExternalLink, RefreshCw,
  Star, Shield, Infinity
} from 'lucide-react'

// ── Plan definitions — update price IDs after creating in Stripe ──
const PLANS = [
  {
    key:     'starter',
    name:    'Starter',
    price:   0,
    period:  'Free forever',
    desc:    'Get started at no cost — core modules included.',
    priceId: null, // Free plan — no Stripe checkout
    color:   'border-slate-200 dark:border-slate-700',
    badge:   null,
    features: [
      'Up to 50 residents & 10 staff',
      'Resident Directory',
      'Staff Management & Staff Directory',
      'Communication (no SMS)',
      'Family Messaging',
      'Community support',
    ],
  },
  {
    key:     'essential',
    name:    'Essential',
    price:   299,
    period:  '/mo',
    desc:    'Starter plus clinical and programming modules, no limits.',
    priceId: import.meta.env.VITE_STRIPE_PRICE_ESSENTIAL,
    color:   'border-slate-200 dark:border-slate-700',
    badge:   null,
    features: [
      'Everything in Starter — no limits',
      'SMS messaging unlocked',
      'Chapel',
      'Activities & Event Calendar',
      'Incident Reports',
      'Nursing Notes & Vitals',
      'Priority email support',
    ],
  },
  {
    key:     'professional',
    name:    'Professional',
    price:   999,
    period:  '/mo',
    desc:    'The full platform — every module, every feature.',
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL,
    color:   'border-brand-500',
    badge:   'Most Popular',
    features: [
      'Everything in Essential — no limits',
      'Dietary & Cycle Menus',
      'Maintenance & Work Orders',
      'Housekeeping & Scheduling',
      'Transportation',
      'Central Supply',
      'Security & Guard Rounds',
      'Surveys & Analytics',
      'Property Management',
      'Marketing & Lead Pipeline',
      'Time Clock, IT & Meter Readings',
      'Resident Portal',
      'Every new module — included automatically',
      'Dedicated onboarding & phone support',
    ],
  },
]

const STATUS_CONFIG = {
  active:   { label: 'Active',      icon: CheckCircle,    color: 'text-green-600',  bg: 'bg-green-50  border-green-200 dark:bg-green-950/50 dark:border-green-900' },
  trialing: { label: 'Free Trial',  icon: Clock,          color: 'text-blue-600',   bg: 'bg-blue-50   border-blue-200 dark:bg-blue-950/50 dark:border-blue-900' },
  past_due: { label: 'Past Due',    icon: AlertTriangle,  color: 'text-amber-600',  bg: 'bg-amber-50  border-amber-200 dark:bg-amber-950/50 dark:border-amber-900' },
  canceled:  { label: 'Canceled',    icon: XCircle,        color: 'text-red-500',    bg: 'bg-red-50    border-red-200 dark:bg-red-950/50 dark:border-red-900' },
  cancelled: { label: 'Cancelled',   icon: XCircle,        color: 'text-red-500',    bg: 'bg-red-50    border-red-200 dark:bg-red-950/50 dark:border-red-900' },
  inactive: { label: 'No Plan',     icon: Zap,            color: 'text-slate-400',  bg: 'bg-slate-50  border-slate-200 dark:bg-slate-800 dark:border-slate-700' },
  pilot:    { label: 'Pilot',       icon: Star,           color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200 dark:bg-purple-950/50 dark:border-purple-900' },
  free:     { label: 'Free Plan',    icon: Star,           color: 'text-green-600',  bg: 'bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-900' },
  paused:   { label: 'Paused',      icon: Clock,          color: 'text-slate-500',  bg: 'bg-slate-50  border-slate-200 dark:bg-slate-800 dark:border-slate-700' },
  unpaid:   { label: 'Unpaid',      icon: AlertTriangle,  color: 'text-red-600',    bg: 'bg-red-50    border-red-200 dark:bg-red-950/50 dark:border-red-900' },
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'
const fmtMoney = (n) => n != null ? `$${Number(n).toLocaleString()}` : '—'

export default function BillingTab() {
  const { profile, organization } = useAuth()
  const [org, setOrg]           = useState(null)
  const [loading, setLoading]   = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [message, setMessage]   = useState(null)

  useEffect(() => {
    fetchOrg()
    // Check for return from Stripe
    const params = new URLSearchParams(window.location.search)
    if (params.get('billing') === 'success') {
      setMessage({ type: 'success', text: 'Payment successful! Your subscription is now active.' })
      window.history.replaceState({}, '', window.location.pathname + '?tab=billing')
    } else if (params.get('billing') === 'cancelled') {
      setMessage({ type: 'info', text: 'Checkout was cancelled — no charge was made.' })
      window.history.replaceState({}, '', window.location.pathname + '?tab=billing')
    }
  }, [])

  const fetchOrg = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('organizations')
      .select('*, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end, trial_end, cancel_at_period_end, plan, plan_price')
      .eq('id', profile.organization_id)
      .single()
    setOrg(data)
    setLoading(false)
  }

  const handleCheckout = async (plan) => {
    if (plan.key === 'starter') {
      setMessage({ type: 'info', text: 'Starter is free — no payment required.' })
      return
    }
    if (!plan.priceId) {
      setMessage({ type: 'error', text: 'Pricing not configured. Please contact support.' })
      return
    }
    setActionLoading(`checkout-${plan.key}`)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: plan.key }),
      })
      const data = await res.json()
      if (!data.success) {
        setMessage({ type: 'error', text: data.error || 'Failed to start checkout.' })
      } else if (data.upgraded) {
        // Prorated upgrade — already done, reload billing info
        setMessage({ type: 'success', text: `Upgraded to ${plan.name}! Your account has been updated.` })
        fetchOrg()
      } else if (data.checkout_url) {
        window.location.href = data.checkout_url
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
    }
    setActionLoading(null)
  }

  const handlePortal = async () => {
    setActionLoading('portal')
    try {
      const res = await fetch('/api/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: profile.organization_id }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setMessage({ type: 'error', text: data.error || 'Could not open billing portal.' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
    }
    setActionLoading(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  )

  // Only prefer subscription_status when it's a real Stripe status — 'inactive' is a placeholder
  const STRIPE_STATUSES = ['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'paused']
  // Show 'free' for starter plan orgs on pilot billing (self-signup free accounts)
  const rawStatus = (STRIPE_STATUSES.includes(org?.subscription_status) ? org.subscription_status : null)
              || org?.billing_status
  const status = (rawStatus === 'pilot' && org?.plan === 'starter') ? 'free' : rawStatus
              || 'inactive'
  const statusConf = STATUS_CONFIG[status] || STATUS_CONFIG.inactive
  const StatusIcon = statusConf.icon
  const hasActiveSub = ['active', 'trialing'].includes(status)
  const currentPlan = PLANS.find(p => p.key === org?.plan)

  return (
    <div className="max-w-4xl">

      {/* Message banner */}
      {message && (
        <div className={`mb-6 px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/50 dark:border-green-900 dark:text-green-400' :
          message.type === 'error'   ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/50 dark:border-red-900 dark:text-red-400' :
          'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:border-blue-900 dark:text-blue-400'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-4 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Current subscription status */}
      <div className={`mb-8 p-5 rounded-2xl border ${statusConf.bg} flex items-center justify-between flex-wrap gap-4`}>
        <div className="flex items-center gap-3">
          <StatusIcon size={22} className={statusConf.color} />
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              {statusConf.label}
              {currentPlan ? ` — ${currentPlan.name} Plan` : ''}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              {status === 'trialing' && org?.trial_end && `Trial ends ${fmtDate(org.trial_end)}`}
              {status === 'active' && org?.current_period_end && `Renews ${fmtDate(org.current_period_end)}`}
              {status === 'past_due' && 'Payment failed — please update your payment method'}
              {status === 'canceled' && 'Subscription has been canceled'}
              {status === 'pilot' && 'Founding customer — pilot arrangement'}
              {status === 'free' && 'Starter plan — free forever'}
              {status === 'inactive' && 'No active subscription'}
              {org?.cancel_at_period_end && org?.current_period_end && ` · Cancels ${fmtDate(org.current_period_end)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {org?.plan_price && (
            <span className="text-lg font-bold text-slate-700 dark:text-slate-300" style={{ fontFamily: '"Playfair Display", serif' }}>
              {fmtMoney(org.plan_price)}<span className="text-sm font-normal text-slate-400">/mo</span>
            </span>
          )}
          {hasActiveSub && org?.stripe_customer_id && (
            <button onClick={handlePortal} disabled={actionLoading === 'portal'}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
              {actionLoading === 'portal'
                ? <RefreshCw size={14} className="animate-spin" />
                : <ExternalLink size={14} />}
              Manage Billing
            </button>
          )}
          <button onClick={fetchOrg}
            className="p-2 hover:bg-white/60 rounded-lg transition-colors text-slate-400" title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Plans */}
      {!hasActiveSub && (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: '"Playfair Display", serif' }}>
              Choose a Plan
            </h2>
            <p className="text-sm text-slate-500 mt-1">Starter is free forever. Essential and Professional billed monthly — cancel any time.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {PLANS.map(plan => (
              <div key={plan.key}
                className={`relative bg-white dark:bg-slate-900 rounded-2xl border-2 p-6 flex flex-col ${plan.color} ${plan.badge ? 'shadow-md' : ''}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-brand-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg" style={{ fontFamily: '"Playfair Display", serif' }}>
                    {plan.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{plan.desc}</p>
                </div>
                <div className="mb-5">
                  {plan.price ? (
                    <span className="text-3xl font-bold text-slate-800 dark:text-slate-100" style={{ fontFamily: '"Playfair Display", serif' }}>
                      ${plan.price}<span className="text-sm font-normal text-slate-400">{plan.period}</span>
                    </span>
                  ) : (
                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-100" style={{ fontFamily: '"Playfair Display", serif' }}>
                      Custom
                    </span>
                  )}
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <CheckCircle size={14} className="text-brand-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleCheckout(plan)}
                  disabled={!!actionLoading}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                    plan.badge
                      ? 'bg-brand-600 hover:bg-brand-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                  {actionLoading === `checkout-${plan.key}`
                    ? 'Loading…'
                    : plan.key === 'starter'
                      ? 'Free — Get Started'
                      : 'Subscribe Now'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Active plan — upgrade/downgrade */}
      {hasActiveSub && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-4">Change Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PLANS.filter(p => p.key !== 'starter' || org?.plan !== 'starter').map(plan => {
              const isCurrent = plan.key === org?.plan
              return (
                <div key={plan.key}
                  className={`p-4 rounded-xl border ${isCurrent ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{plan.name}</span>
                    {isCurrent && <span className="text-xs text-brand-600 font-semibold">Current</span>}
                  </div>
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    {plan.price > 0 && <span className="text-xs font-normal text-slate-400">/mo</span>}
                  </p>
                  {!isCurrent && (
                    <button
                      onClick={() => {
                        const isProfessional = org?.plan === 'professional'
                        const isUpgrade = plan.key === 'professional' && org?.plan === 'essential'
                        if (isUpgrade) {
                          handleCheckout(plan) // prorated via edge function
                        } else {
                          handlePortal() // downgrade/cancel via Stripe portal
                        }
                      }}
                      disabled={!!actionLoading}
                      className="mt-3 w-full py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 rounded-lg transition-colors">
                      {actionLoading === `checkout-${plan.key}`
                        ? 'Processing...'
                        : plan.key === 'professional' && org?.plan === 'essential'
                          ? 'Upgrade — Prorated'
                          : 'Manage via Portal'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Upgrading from Essential to Professional is prorated — you only pay for the remaining days in your billing cycle. Cancellations and downgrades are managed through the Stripe billing portal.
          </p>
        </div>
      )}

      {/* Invoice history */}
      <InvoiceHistory organizationId={profile?.organization_id} customerId={org?.stripe_customer_id} />

    </div>
  )
}

// ── Invoice History ───────────────────────────────────────────

function InvoiceHistory({ organizationId, customerId }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]  = useState(false)
  const [loaded, setLoaded]    = useState(false)

  const fetchInvoices = async () => {
    if (!customerId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/invoices?customerId=${customerId}`)
      const data = await res.json()
      setInvoices(data.invoices || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
    setLoaded(true)
  }

  useEffect(() => {
    if (customerId) fetchInvoices()
    else setLoaded(true)
  }, [customerId])

  const statusColor = (s) => ({
    paid:   'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400',
    open:   'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    void:   'bg-slate-100 dark:bg-slate-800 text-slate-500',
    uncollectible: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400',
  })[s] || 'bg-slate-100 dark:bg-slate-800 text-slate-500'

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
        <CreditCard size={16} className="text-slate-400" /> Invoice History
      </h2>

      {!customerId ? (
        <div className="text-center py-10 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <CreditCard size={28} className="mx-auto text-slate-200 mb-2" />
          <p className="text-sm text-slate-400">No billing history yet</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-400">No invoices found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Description</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(inv.created * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{inv.description || inv.lines?.data?.[0]?.description || 'Subscription'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">${(inv.amount_paid / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(inv.status)}`}>
                      {inv.status?.charAt(0).toUpperCase() + inv.status?.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {inv.hosted_invoice_url && (
                      <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer"
                        className="text-brand-500 hover:text-brand-700 text-xs flex items-center gap-1">
                        View <ExternalLink size={11} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
