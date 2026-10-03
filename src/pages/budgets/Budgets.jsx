import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Wallet, ChevronLeft, ChevronRight, Loader2, AlertCircle, Users, Pencil, Send, Plus, X, Check, Receipt, CalendarRange
} from 'lucide-react'
import BudgetStatusCard from '../../components/budgets/BudgetStatusCard'
import BudgetYearEditor from '../../components/budgets/BudgetYearEditor'
import {
  BUDGET_DEPARTMENTS, BUDGET_DEPARTMENT_KEYS, SPEND_CATEGORIES, departmentLabel, categoryLabel,
  money, firstOfMonth, monthLabel, shiftMonth
} from '../../lib/budgets'

// Budgets (add-on). What each person sees comes from the database:
// budget_status() returns only the departments the caller may see (department
// Manager, NHA, Org Admin); set_budget_year() / request_budget_change() enforce who
// sets budgets (Corporate for a chain community, otherwise the NHA or Org Admin).

const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CensusPanel({ month, canCorrect }) {
  const [rows, setRows] = useState([])
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const end = shiftMonth(month, 1)
    const { data } = await supabase.from('census_daily').select('census_date, resident_count, occupied_rooms, source, note')
      .gte('census_date', month).lt('census_date', end).order('census_date')
    setRows(data || [])
  }, [month])
  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true); setError('')
    const { error } = await supabase.rpc('correct_census', {
      p_date: editing.census_date, p_residents: Number(editing.resident_count), p_rooms: Number(editing.occupied_rooms), p_note: editing.note || '',
    })
    setSaving(false)
    if (error) return setError(error.message)
    setEditing(null); load()
  }

  const residentDays = rows.reduce((s, r) => s + r.resident_count, 0)
  const latest = rows[rows.length - 1]
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2"><Users size={16} className="text-brand-600" /><h3 className="font-semibold text-slate-800 dark:text-slate-100">Census</h3></div>
        {canCorrect && (
          <button onClick={() => setEditing({ census_date: localToday(), resident_count: latest?.resident_count ?? '', occupied_rooms: latest?.occupied_rooms ?? '', note: '' })}
            className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"><Pencil size={12} /> Correct a day</button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div><div className="text-xs text-slate-400">Latest census</div><div className="text-xl font-semibold text-slate-800 dark:text-slate-100">{latest?.resident_count ?? '—'}</div></div>
        <div><div className="text-xs text-slate-400">Resident days this month</div><div className="text-xl font-semibold text-slate-800 dark:text-slate-100">{residentDays || '—'}</div></div>
        <div><div className="text-xs text-slate-400">Days recorded</div><div className="text-xl font-semibold text-slate-800 dark:text-slate-100">{rows.length}</div></div>
      </div>
      <p className="text-xs text-slate-400 mt-3">Recorded automatically every night from active residents. Per-resident-day figures use these days.{rows.some(r => r.source === 'corrected') ? ` ${rows.filter(r => r.source === 'corrected').length} corrected this month.` : ''}</p>
      {editing && (
        <Modal title="Correct the census" onClose={() => setEditing(null)}>
          {error && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <div className="space-y-3">
            <div><label className={labelCls}>Date</label><input type="date" value={editing.census_date} onChange={e => setEditing(x => ({ ...x, census_date: e.target.value }))} className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Residents</label><input type="number" min="0" value={editing.resident_count} onChange={e => setEditing(x => ({ ...x, resident_count: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Occupied rooms</label><input type="number" min="0" value={editing.occupied_rooms} onChange={e => setEditing(x => ({ ...x, occupied_rooms: e.target.value }))} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Reason</label><input value={editing.note} onChange={e => setEditing(x => ({ ...x, note: e.target.value }))} placeholder="e.g. discharge entered late" className={inputCls} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl">Save</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function RequestsPanel({ month, statusRows }) {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('budget_change_requests').select('*').order('requested_at', { ascending: false }).limit(50)
    setRows(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const submit = async () => {
    setSaving(true); setError('')
    const { error } = await supabase.rpc('request_budget_change', {
      p_department: form.department, p_month: form.month, p_amount: Number(form.amount), p_reason: form.reason,
    })
    setSaving(false)
    if (error) return setError(error.message)
    setForm(null); load()
  }

  const STATUS = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', declined: 'bg-red-100 text-red-700', withdrawn: 'bg-slate-100 text-slate-500' }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">Your corporate office sets this community's budgets. Ask for a change here and they'll approve or decline it.</p>
        <button onClick={() => setForm({ department: 'dietary', month, amount: statusRows.find(r => r.department === 'dietary')?.budget ?? '', reason: '' })}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium"><Send size={14} /> Request a change</button>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
            <th className="px-4 py-3">Department</th><th className="px-4 py-3">Month</th><th className="px-4 py-3">From → to</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No requests yet.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800 align-top">
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{departmentLabel(r.department)}</td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{monthLabel(r.month)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{money(r.current_amount)} → <b>{money(r.requested_amount)}</b></td>
                <td className="px-4 py-3 text-slate-500">{r.reason}{r.decision_note && <div className="text-xs mt-1 text-slate-400">Corporate: {r.decision_note}</div>}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS[r.status]}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {form && (
        <Modal title="Request a budget change" onClose={() => setForm(null)}>
          {error && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Department</label>
                <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className={inputCls}>
                  {BUDGET_DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select></div>
              <div><label className={labelCls}>Month</label><input type="month" value={form.month.slice(0, 7)} onChange={e => setForm(f => ({ ...f, month: `${e.target.value}-01` }))} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>New monthly budget</label><input type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>Reason (at least 10 characters)</label><textarea rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className={inputCls} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setForm(null)} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
            <button onClick={submit} disabled={saving || form.amount === '' || form.reason.trim().length < 10}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl">Send request</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ManualSpendPanel({ month, writableDepartments }) {
  const { profile } = useAuth()
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('budget_manual_spend').select('*')
      .gte('spend_date', month).lt('spend_date', shiftMonth(month, 1)).order('spend_date', { ascending: false })
    setRows(data || [])
  }, [month])
  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true); setError('')
    const { error } = await supabase.from('budget_manual_spend').insert({
      organization_id: profile.organization_id, department: form.department, category: form.category,
      spend_date: form.spend_date, amount: Number(form.amount), vendor: form.vendor || null,
      description: form.description.trim(), entered_by: profile.id,
    })
    setSaving(false)
    if (error) return setError(error.message)
    setForm(null); load()
  }

  const remove = async (id) => {
    const { error } = await supabase.from('budget_manual_spend').delete().eq('id', id)
    if (error) setError(error.message); else load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">Purchases made outside ElderLoop (a grocery run, a card purchase) so they count against the budget.</p>
        {writableDepartments.length > 0 && (
          <button onClick={() => setForm({ department: writableDepartments[0], category: 'other', spend_date: localToday(), amount: '', vendor: '', description: '' })}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium"><Plus size={14} /> Record a purchase</button>
        )}
      </div>
      {error && !form && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
            <th className="px-4 py-3">Date</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">What</th><th className="px-4 py-3 text-right">Amount</th><th />
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">None this month.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800">
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.spend_date}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{departmentLabel(r.department)} <span className="text-xs text-slate-400">· {categoryLabel(r.category)}</span></td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.description}{r.vendor && <span className="text-xs text-slate-400"> · {r.vendor}</span>}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-100">{money(r.amount, 2)}</td>
                <td className="px-4 py-3 text-right">{writableDepartments.includes(r.department) && <button onClick={() => remove(r.id)} className="text-slate-300 hover:text-red-500"><X size={14} /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {form && (
        <Modal title="Record a purchase" onClose={() => setForm(null)}>
          {error && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Department</label>
                <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className={inputCls}>
                  {writableDepartments.map(d => <option key={d} value={d}>{departmentLabel(d)}</option>)}
                </select></div>
              <div><label className={labelCls}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                  {SPEND_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Date</label><input type="date" value={form.spend_date} onChange={e => setForm(f => ({ ...f, spend_date: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Amount</label><input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>What was bought</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>Where (optional)</label><input value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} className={inputCls} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setForm(null)} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
            <button onClick={save} disabled={saving || !(Number(form.amount) > 0) || !form.description.trim()}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl">Save</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function Budgets() {
  const { profile, organization, departmentRoles, accessModel, isSuperAdmin } = useAuth()
  const orgId = organization?.id
  const [month, setMonth] = useState(firstOfMonth())
  const [tab, setTab] = useState('month')
  const [rows, setRows] = useState(null)
  const [canSet, setCanSet] = useState(false)
  const [error, setError] = useState('')

  const role = isSuperAdmin ? 'super_admin' : profile?.role
  const isLeader = ['ceo', 'org_admin', 'super_admin'].includes(role)
  const isChain = !!organization?.corporation_id
  const managerDepts = (departmentRoles || []).filter(d => d.level === 'manager' && BUDGET_DEPARTMENT_KEYS.includes(d.department)).map(d => d.department)
  // Mirrors the manual_spend_write policy: department Managers, Org Admins, and the
  // NHA only in legacy communities
  const writableDepartments = ['org_admin', 'super_admin'].includes(role) || (role === 'ceo' && accessModel !== 'tiered')
    ? BUDGET_DEPARTMENT_KEYS : managerDepts

  const load = useCallback(async () => {
    setRows(null); setError('')
    const { data, error } = await supabase.rpc('budget_status', { p_month: month })
    if (error) setError(error.message)
    setRows(data || [])
  }, [month])
  useEffect(() => { if (orgId) load() }, [orgId, load])
  useEffect(() => {
    if (!orgId) return
    supabase.rpc('can_set_budget', { p_org: orgId }).then(({ data }) => setCanSet(!!data))
  }, [orgId])

  const tabs = [
    { key: 'month', label: 'This month', icon: Wallet },
    canSet && { key: 'set', label: 'Set budgets', icon: CalendarRange },
    isChain && isLeader && { key: 'requests', label: 'Change requests', icon: Send },
    { key: 'manual', label: 'Off-system purchases', icon: Receipt },
  ].filter(Boolean)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">Budgets</h1>
          <p className="text-slate-500 text-sm mt-0.5">Monthly spending against budget{isChain ? ', set by your corporate office' : ''}.</p>
        </div>
        {(tab === 'month' || tab === 'manual') && (
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-1">
            <button onClick={() => setMonth(m => shiftMonth(m, -1))} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><ChevronLeft size={16} /></button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 w-36 text-center">{monthLabel(month)}</span>
            <button onClick={() => setMonth(m => shiftMonth(m, 1))} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </div>

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}

      {tab === 'month' && (
        !rows ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div> : (
          <div className="space-y-5">
            {rows.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 text-center text-slate-500 text-sm">
                Budgets are visible to department Managers, the Administrator, and Org Admins.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {rows.map(r => <BudgetStatusCard key={r.department} row={r} month={month} />)}
              </div>
            )}
            {rows[0]?.resident_days === 0 && rows.length > 0 && (
              <p className="text-xs text-slate-400 flex items-center gap-1"><Check size={12} /> Per-resident-day figures appear once the nightly census has recorded days for this month.</p>
            )}
            <CensusPanel month={month} canCorrect={['ceo', 'org_admin', 'super_admin'].includes(role)} />
          </div>
        )
      )}
      {tab === 'set' && canSet && <BudgetYearEditor orgId={orgId} />}
      {tab === 'requests' && <RequestsPanel month={month} statusRows={rows || []} />}
      {tab === 'manual' && <ManualSpendPanel month={month} writableDepartments={writableDepartments} />}
    </div>
  )
}
