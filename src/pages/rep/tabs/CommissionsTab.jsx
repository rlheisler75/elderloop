import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { DollarSign, Clock, TrendingUp, Loader2, ClipboardList, Download } from 'lucide-react'

const STATUS_STYLES = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  paid:     'bg-green-100 text-green-700',
}

const EVENT_LABELS = {
  signup_bonus: 'Signup Bonus',
  residual:     'Monthly Residual',
}

const fmtMoney = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const csvField = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

function downloadCsv(events) {
  const headers = ['Account', 'Type', 'Plan', 'Period Start', 'Period End', 'Amount', 'Status', 'Notes', 'Created']
  const rows = events.map(e => [
    e.organizations?.name || '',
    EVENT_LABELS[e.event_type] || e.event_type,
    e.plan || '',
    e.period_start || '',
    e.period_end || '',
    Number(e.amount || 0).toFixed(2),
    e.status,
    e.notes || '',
    e.created_at ? new Date(e.created_at).toISOString().slice(0, 10) : '',
  ])
  const csv = [headers, ...rows].map(row => row.map(csvField).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `elderloop-commissions-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function CommissionsTab() {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchEvents() }, [])

  async function fetchEvents() {
    setLoading(true)
    const { data } = await supabase
      .from('rep_commission_events')
      .select('*, organizations(name)')
      .order('created_at', { ascending: false })
    setEvents(data || [])
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={28} className="animate-spin text-brand-400" />
    </div>
  )

  const paidToDate     = events.filter(e => e.status === 'paid').reduce((s, e) => s + Number(e.amount), 0)
  const pending         = events.filter(e => e.status !== 'paid').reduce((s, e) => s + Number(e.amount), 0)
  const now             = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const residualRunRate = events
    .filter(e => e.event_type === 'residual' && e.period_start?.slice(0, 7) === currentMonthKey)
    .reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Paid to Date',            value: fmtMoney(paidToDate),     icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Pending / Owed',          value: fmtMoney(pending),        icon: Clock,       color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Monthly Residual Run-Rate', value: fmtMoney(residualRunRate), icon: TrendingUp, color: 'text-brand-600', bg: 'bg-brand-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-2">
              <s.icon size={18} className={s.color} />
            </div>
            <div className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Ledger */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-700 text-sm">Commission & Residual Ledger</h3>
          {events.length > 0 && (
            <button onClick={() => downloadCsv(events)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors">
              <Download size={12} /> Download CSV
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No commission events yet</p>
            <p className="text-sm mt-1">Events appear here as your referred accounts go active and renew.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Account', 'Type', 'Plan', 'Period', 'Amount', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {events.map(e => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800 text-sm">{e.organizations?.name || '—'}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">{EVENT_LABELS[e.event_type] || e.event_type}</td>
                  <td className="px-5 py-3 text-sm text-slate-500 capitalize">{e.plan || '—'}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {e.period_start ? `${fmtDate(e.period_start)} – ${fmtDate(e.period_end)}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-slate-800">{fmtMoney(e.amount)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[e.status] || 'bg-slate-100 text-slate-500'}`}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
