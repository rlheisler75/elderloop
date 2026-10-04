import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ChevronLeft, ChevronRight, Loader2, Plus, X, Pencil } from 'lucide-react'
import BudgetStatusCard from '../../components/budgets/BudgetStatusCard'
import { money, firstOfMonth, monthLabel, shiftMonth } from '../../lib/budgets'

// Linen (budget layer Phase 4). Any Housekeeping staff member logs discarded linen
// (torn, stained, worn out, lost); entries are never deleted, only marked entered in
// error. With the Budgets add-on, the Housekeeping Manager and leaders also see costs:
// linen $ per occupied room day, chemical units per occupied room day, and the linen
// loss rate (discards ÷ linen in circulation, a count the Manager keeps current).

const REASONS = [
  { key: 'torn', label: 'Torn' }, { key: 'stained', label: 'Stained' }, { key: 'worn', label: 'Worn out' },
  { key: 'lost', label: 'Lost' }, { key: 'other', label: 'Other' },
]
const shortMonth = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

function Tile({ label, value, sub }) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
      <div className="text-xl font-display font-bold text-slate-800 dark:text-slate-100">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
      {sub && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

function LinenCosts({ orgId, month, canSetCirculation }) {
  const [trend, setTrend] = useState(null)
  const [status, setStatus] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [editCirc, setEditCirc] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    Promise.all([
      supabase.rpc('housekeeping_cost_report', { p_month: month, p_months: 6, p_org: orgId }),
      supabase.rpc('budget_status', { p_month: month, p_org: orgId }),
      supabase.from('budget_alerts').select('department, kind, created_at')
        .eq('organization_id', orgId).eq('month', month).eq('department', 'housekeeping').eq('suppressed', false),
    ]).then(([r, s, a]) => {
      setTrend(r.data || [])
      setStatus((s.data || []).find(x => x.department === 'housekeeping') || null)
      setAlerts(a.data || [])
    })
  }, [orgId, month])
  useEffect(() => { load() }, [load])

  const saveCirc = async () => {
    setError('')
    const { error } = await supabase.rpc('set_linen_in_circulation', { p_count: editCirc === '' ? null : Number(editCirc) })
    if (error) return setError(error.message)
    setEditCirc(null); load()
  }

  if (!trend || trend.length === 0) return null
  const cur = trend[trend.length - 1]
  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4">
        {status && <BudgetStatusCard row={status} month={month} orgId={orgId} alerts={alerts} />}
        <div className="grid grid-cols-2 gap-3 content-start">
          <Tile label="Linen per occupied room day" value={cur.linen_per_room_day != null ? money(cur.linen_per_room_day, 2) : '—'}
            sub={`${money(cur.linen_spend, 2)} linen this month`} />
          <Tile label="Chemical units per occupied room day" value={cur.chemical_units_per_room_day != null ? Number(cur.chemical_units_per_room_day) : '—'}
            sub={`${Number(cur.chemical_units)} units issued or bought`} />
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="text-xl font-display font-bold text-slate-800 dark:text-slate-100">{cur.linen_loss_pct != null ? `${cur.linen_loss_pct}%` : '—'}</div>
            <div className="text-xs text-slate-400">Linen loss rate</div>
            {editCirc != null ? (
              <div className="flex items-center gap-1 mt-1">
                <input type="number" min="0" value={editCirc} onChange={e => setEditCirc(e.target.value)} className="w-24 px-2 py-1 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded text-xs" />
                <button onClick={saveCirc} className="text-xs font-semibold text-brand-600">Save</button>
                <button onClick={() => setEditCirc(null)} className="text-xs text-slate-400">Cancel</button>
              </div>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                {cur.linen_discarded} discarded of {cur.linen_in_circulation ?? '?'} in circulation
                {canSetCirculation && <button onClick={() => setEditCirc(cur.linen_in_circulation ?? '')} title="Set linen in circulation" className="text-slate-400 hover:text-brand-600"><Pencil size={11} /></button>}
              </div>
            )}
            {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
          </div>
          <Tile label="Discarded linen value" value={money(cur.linen_discard_cost, 2)} sub="At each item's cost" />
        </div>
      </div>
      {cur.census_days === 0 && <p className="text-xs text-slate-400">No census recorded for this month yet, so per-room-day figures are blank.</p>}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 overflow-x-auto">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Last 6 months</h3>
        <table className="w-full text-sm min-w-[600px]">
          <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
            <th className="py-2">Month</th><th className="py-2 text-right">Occupied room days</th><th className="py-2 text-right">Linen / room day</th>
            <th className="py-2 text-right">Chemicals / room day</th><th className="py-2 text-right">Discarded</th><th className="py-2 text-right">Loss rate</th><th className="py-2 text-right">All Housekeeping</th>
          </tr></thead>
          <tbody>
            {trend.map(r => (
              <tr key={r.month} className={`border-b border-slate-50 dark:border-slate-800 ${r.month === month ? 'font-semibold' : ''}`}>
                <td className="py-2 text-slate-700 dark:text-slate-200">{shortMonth(r.month)}</td>
                <td className="py-2 text-right text-slate-500">{Number(r.occupied_room_days) > 0 ? Number(r.occupied_room_days).toLocaleString() : '—'}</td>
                <td className="py-2 text-right text-slate-800 dark:text-slate-100">{r.linen_per_room_day != null ? money(r.linen_per_room_day, 2) : '—'}</td>
                <td className="py-2 text-right text-slate-600 dark:text-slate-300">{r.chemical_units_per_room_day ?? '—'}</td>
                <td className="py-2 text-right text-slate-500">{r.linen_discarded}</td>
                <td className="py-2 text-right text-slate-500">{r.linen_loss_pct != null ? `${r.linen_loss_pct}%` : '—'}</td>
                <td className="py-2 text-right text-slate-600 dark:text-slate-300">{money(r.housekeeping_spend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-400 mt-3">Linen spend is linen-category purchases and stock issued to Housekeeping. Chemical units are counted in units, not dollars, so a price change doesn't hide overuse.</p>
      </div>
    </div>
  )
}

export default function HousekeepingLinen({ canLog, canCorrectAny }) {
  const { profile, organization, isSuperAdmin, departmentRoles, accessModel } = useAuth()
  const orgId = organization?.id
  const [month, setMonth] = useState(firstOfMonth())
  const [rows, setRows] = useState(null)
  const [items, setItems] = useState([])
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const role = isSuperAdmin ? 'super_admin' : profile?.role
  // Mirrors set_linen_in_circulation()
  const canSetCirculation = role === 'org_admin' || (role === 'ceo' && accessModel !== 'tiered')
    || (departmentRoles || []).some(d => d.department === 'housekeeping' && d.level === 'manager')

  const load = useCallback(async () => {
    if (!orgId) return
    const { data } = await supabase.from('linen_discards')
      .select('id, discard_date, item_name, quantity, reason, notes, logged_by, entered_in_error, profiles:logged_by(first_name, last_name)')
      .eq('organization_id', orgId).gte('discard_date', month).lt('discard_date', shiftMonth(month, 1))
      .order('discard_date', { ascending: false }).order('created_at', { ascending: false })
    setRows(data || [])
  }, [orgId, month])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!orgId) return
    supabase.from('supply_items').select('id, name').eq('organization_id', orgId).eq('spend_category', 'linen').eq('is_active', true).order('name')
      .then(({ data }) => setItems(data || []))
  }, [orgId])

  const save = async () => {
    setSaving(true); setError('')
    const item = items.find(i => i.id === form.supply_item_id)
    const { error } = await supabase.from('linen_discards').insert({
      organization_id: orgId, discard_date: form.discard_date, supply_item_id: item?.id ?? null,
      item_name: item?.name ?? form.item_name.trim(), quantity: Number(form.quantity), reason: form.reason,
      notes: form.notes.trim() || null, logged_by: profile.id,
    })
    setSaving(false)
    if (error) return setError(error.message)
    setForm(null); load()
  }
  const markError = async (id) => {
    const { error } = await supabase.from('linen_discards').update({ entered_in_error: true }).eq('id', id)
    if (error) setError(error.message); else load()
  }

  const total = (rows || []).filter(r => !r.entered_in_error).reduce((s, r) => s + r.quantity, 0)
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-lg">Linen</h2>
          <p className="text-sm text-slate-400">Log linen pulled from service, so replacement cost is tied to loss.</p>
        </div>
        <div className="flex items-center gap-2">
          {canLog && (
            <button onClick={() => setForm({ discard_date: localToday(), supply_item_id: items[0]?.id ?? '', item_name: '', quantity: 1, reason: 'torn', notes: '' })}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium"><Plus size={14} /> Log discarded linen</button>
          )}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-1">
            <button onClick={() => setMonth(m => shiftMonth(m, -1))} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><ChevronLeft size={16} /></button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 w-36 text-center">{monthLabel(month)}</span>
            <button onClick={() => setMonth(m => shiftMonth(m, 1))} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {orgId && <LinenCosts orgId={orgId} month={month} canSetCirculation={canSetCirculation} />}

      {error && !form && <div className="px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto">
        <div className="px-5 pt-4 pb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Discarded this month · {total}</div>
        {!rows ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div> : (
          <table className="w-full text-sm min-w-[560px]">
            <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <th className="px-5 py-2">Date</th><th className="px-3 py-2">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2">Reason</th><th className="px-3 py-2">Logged by</th><th />
            </tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Nothing logged this month.</td></tr>}
              {rows.map(r => (
                <tr key={r.id} className={`border-b border-slate-50 dark:border-slate-800 ${r.entered_in_error ? 'opacity-50 line-through' : ''}`}>
                  <td className="px-5 py-2 text-slate-500 whitespace-nowrap">{r.discard_date}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{r.item_name}{r.notes && <div className="text-xs text-slate-400 no-underline">{r.notes}</div>}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">{r.quantity}</td>
                  <td className="px-3 py-2 text-slate-500">{REASONS.find(x => x.key === r.reason)?.label ?? r.reason}</td>
                  <td className="px-3 py-2 text-slate-500">{[r.profiles?.first_name, r.profiles?.last_name].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    {!r.entered_in_error && (canCorrectAny || r.logged_by === profile?.id) && (
                      <button onClick={() => markError(r.id)} className="text-xs text-slate-400 hover:text-red-600 whitespace-nowrap">Entered in error</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setForm(null)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">Log discarded linen</h3>
              <button onClick={() => setForm(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            {error && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Item</label>
                {items.length > 0 ? (
                  <select value={form.supply_item_id} onChange={e => setForm(f => ({ ...f, supply_item_id: e.target.value }))} className={inputCls}>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    <option value="">Other (type it)</option>
                  </select>
                ) : null}
                {(!items.length || !form.supply_item_id) && (
                  <input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} placeholder="e.g. Bath towel"
                    className={`${inputCls} ${items.length ? 'mt-2' : ''}`} />
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Qty</label>
                  <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className={inputCls} /></div>
                <div className="col-span-2"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Date</label>
                  <input type="date" value={form.discard_date} onChange={e => setForm(f => ({ ...f, discard_date: e.target.value }))} className={inputCls} /></div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {REASONS.map(r => (
                  <button key={r.key} type="button" onClick={() => setForm(f => ({ ...f, reason: r.key }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${form.reason === r.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>{r.label}</button>
                ))}
              </div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Note (optional)</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setForm(null)} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
              <button onClick={save} disabled={saving || !(Number(form.quantity) > 0) || (!form.supply_item_id && !form.item_name.trim())}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
