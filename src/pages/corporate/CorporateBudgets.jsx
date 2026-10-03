import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, Check, X } from 'lucide-react'
import BudgetStatusCard from '../../components/budgets/BudgetStatusCard'
import BudgetYearEditor from '../../components/budgets/BudgetYearEditor'
import { BUDGET_DEPARTMENTS, departmentLabel, money, firstOfMonth, monthLabel, shiftMonth, budgetTone } from '../../lib/budgets'

// Corporate Portal → Budgets. The per-community tools (status cards, year editor)
// are the same components a standalone community uses on its Budgets page; the
// chain adds the cross-community overview and approving change requests.

const TONE_CELL = {
  ok: 'text-slate-700', warn: 'text-amber-700 font-semibold', over: 'text-red-600 font-semibold', none: 'text-slate-400',
}

function Overview({ month, onOpen }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setRows(null)
    supabase.rpc('corporate_budget_overview', { p_month: month }).then(({ data, error }) => {
      if (error) setError(error.message)
      setRows(data || [])
    })
  }, [month])

  if (!rows) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>
  const communities = [...new Map(rows.map(r => [r.organization_id, r.name])).entries()]
  if (communities.length === 0) {
    return <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm">{error || 'No communities have the Budgets add-on turned on yet.'}</div>
  }
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
            <th className="px-4 py-3 font-medium">Community</th>
            {BUDGET_DEPARTMENTS.map(d => <th key={d.key} className="px-3 py-3 font-medium">{d.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {communities.map(([id, name]) => (
            <tr key={id} onClick={() => onOpen({ id, name })} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
              <td className="px-4 py-3 font-medium text-slate-800">{name}</td>
              {BUDGET_DEPARTMENTS.map(d => {
                const r = rows.find(x => x.organization_id === id && x.department === d.key)
                if (!r) return <td key={d.key} className="px-3 py-3 text-slate-300">—</td>
                return (
                  <td key={d.key} className="px-3 py-3 whitespace-nowrap">
                    <div className={TONE_CELL[budgetTone(r)]}>{money(r.spent)} <span className="text-xs text-slate-400">/ {money(r.budget)}</span></div>
                    <div className="text-xs text-slate-400">
                      {r.pct_used != null ? `${r.pct_used}% · on pace for ${r.projected_pct}%` : 'No budget'}
                      {r.spend_ppd != null && ` · ${money(r.spend_ppd, 2)} PPD`}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CommunityBudget({ community, month, onBack }) {
  const [rows, setRows] = useState(null)
  const [view, setView] = useState('month')
  useEffect(() => {
    supabase.rpc('budget_status', { p_month: month, p_org: community.id }).then(({ data }) => setRows(data || []))
  }, [community.id, month])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onBack} className="text-sm text-brand-600 hover:text-brand-700">← All communities</button>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {[['month', 'This month'], ['set', 'Set budgets']].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} className={`px-3 py-1.5 rounded-md text-sm ${view === k ? 'bg-white shadow-sm text-brand-700' : 'text-slate-500'}`}>{l}</button>
          ))}
        </div>
      </div>
      <h3 className="font-display text-lg font-semibold text-slate-800">{community.name}</h3>
      {view === 'set' ? <BudgetYearEditor orgId={community.id} /> : !rows ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map(r => <BudgetStatusCard key={r.department} row={r} month={month} orgId={community.id} />)}
        </div>
      )}
    </div>
  )
}

function Requests() {
  const [rows, setRows] = useState(null)
  const [busy, setBusy] = useState(null)
  const [notes, setNotes] = useState({})
  const [error, setError] = useState('')

  const load = useCallback(() => {
    supabase.rpc('corporate_budget_requests').then(({ data, error }) => {
      if (error) setError(error.message)
      setRows(data || [])
    })
  }, [])
  useEffect(() => { load() }, [load])

  const decide = async (id, approve) => {
    setBusy(id); setError('')
    const { error } = await supabase.rpc('decide_budget_change', { p_request: id, p_approve: approve, p_note: notes[id] || null })
    setBusy(null)
    if (error) return setError(error.message)
    load()
  }

  if (!rows) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>
  return (
    <div className="space-y-3">
      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
      {rows.length === 0 && <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm">No budget change requests.</div>}
      {rows.map(r => (
        <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-slate-800">{r.community} · {departmentLabel(r.department)} · {monthLabel(r.month)}</div>
              <div className="text-sm text-slate-600 mt-0.5">{money(r.current_amount)} → <b>{money(r.requested_amount)}</b></div>
              <div className="text-sm text-slate-500 mt-1">{r.reason}</div>
              {r.decision_note && <div className="text-xs text-slate-400 mt-1">Note: {r.decision_note}</div>}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{r.status}</span>
          </div>
          {r.status === 'pending' && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <input value={notes[r.id] || ''} onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))} placeholder="Note to the community (optional)"
                className="flex-1 min-w-[200px] px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <button onClick={() => decide(r.id, true)} disabled={busy === r.id} className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm"><Check size={14} /> Approve</button>
              <button onClick={() => decide(r.id, false)} disabled={busy === r.id} className="flex items-center gap-1 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-sm"><X size={14} /> Decline</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function CorporateBudgets() {
  const [month, setMonth] = useState(firstOfMonth())
  const [view, setView] = useState('overview')
  const [community, setCommunity] = useState(null)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {[['overview', 'Budget status'], ['requests', 'Change requests']].map(([k, l]) => (
            <button key={k} onClick={() => { setView(k); setCommunity(null) }} className={`px-3 py-1.5 rounded-md text-sm ${view === k ? 'bg-white shadow-sm text-brand-700' : 'text-slate-500'}`}>{l}</button>
          ))}
        </div>
        {view === 'overview' && (
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1">
            <button onClick={() => setMonth(m => shiftMonth(m, -1))} className="p-2 text-slate-500 hover:text-slate-800"><ChevronLeft size={16} /></button>
            <span className="text-sm font-medium text-slate-700 w-36 text-center">{monthLabel(month)}</span>
            <button onClick={() => setMonth(m => shiftMonth(m, 1))} className="p-2 text-slate-500 hover:text-slate-800"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>
      {view === 'requests' ? <Requests /> : community
        ? <CommunityBudget community={community} month={month} onBack={() => setCommunity(null)} />
        : <Overview month={month} onOpen={setCommunity} />}
      <p className="text-xs text-slate-400">Budgets cover supplies, food, vendors, and parts. Staff wages stay in payroll. Calendar months.</p>
    </div>
  )
}
