// WorkOrderChecklist.jsx — the checklist on one work order (20261120_wo_checklists.sql).
//
// Steps are a copy made when the checklist was added (by a PM schedule or by
// hand), so later edits to the checklist never change this work order.
// Answering follows the work order: wo_can_work() decides, same as the
// database policy. Unanswered steps only warn at close-out (Robert's choice).
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ListChecks, Printer, StickyNote, Wrench, X, Check } from 'lucide-react'

export const CHECKLIST_TYPES = [
  { key: 'check',     label: 'Check off' },
  { key: 'pass_fail', label: 'Pass / Fail' },
  { key: 'number',    label: 'Number' },
  { key: 'text',      label: 'Text' },
]

export function checklistSummary(items) {
  const total    = items.length
  const answered = items.filter(i => i.status).length
  const failed   = items.filter(i => i.status === 'fail').length
  return { total, answered, failed, unanswered: total - answered }
}

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function answerText(i) {
  if (i.status === 'na') return 'N/A'
  if (i.status === 'pass') return 'Pass'
  if (i.status === 'fail') return 'FAIL'
  if (i.status === 'done' && i.item_type === 'number') return `${i.value_number}${i.unit ? ` ${i.unit}` : ''}`
  if (i.status === 'done' && i.item_type === 'text') return i.value_text
  if (i.status === 'done') return '✓'
  return ''
}

const personName = (p) => p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : ''

// Printable sheet: answers filled in, unanswered steps left blank to write on.
function printChecklist({ wo, items, orgName }) {
  const rows = items.map((i, n) => `
    <tr>
      <td class="num">${n + 1}</td>
      <td>${esc(i.label)}${i.unit ? ` <span class="unit">(${esc(i.unit)})</span>` : ''}</td>
      <td class="ans ${i.status === 'fail' ? 'fail' : ''}">${esc(answerText(i))}</td>
      <td>${esc(i.note || '')}</td>
      <td class="who">${i.answered_at ? esc(`${personName(i.answered)} ${new Date(i.answered_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`) : ''}</td>
    </tr>`).join('')
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<!DOCTYPE html><html><head><title>${esc(items[0]?.checklist_name || 'Checklist')}</title>
    <style>
      * { box-sizing: border-box; } body { font-family: sans-serif; color: #0f172a; margin: 0.5in; font-size: 12px; }
      h1 { font-size: 18px; margin: 0 0 2px; } .meta { color: #475569; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; }
      th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; }
      td.num { width: 28px; text-align: right; color: #64748b; } td.ans { width: 90px; font-weight: 600; } td.ans.fail { color: #b91c1c; }
      td.who { width: 120px; color: #475569; font-size: 11px; } .unit { color: #64748b; }
      .sign { margin-top: 24px; display: flex; gap: 40px; } .sign div { flex: 1; border-top: 1px solid #94a3b8; padding-top: 4px; color: #475569; }
      @media print { body { margin: 0.4in; } }
    </style></head><body>
    <h1>${esc(items[0]?.checklist_name || 'Checklist')}</h1>
    <div class="meta">${esc(orgName)} · Work order ${esc(wo.wo_number ? `#${wo.wo_number}` : '')} ${esc(wo.title)}${wo.location_path ? ` · ${esc(wo.location_path)}` : ''}</div>
    <table><thead><tr><th>#</th><th>Step</th><th>Answer</th><th>Note</th><th>By</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="sign"><div>Completed by</div><div>Date</div></div>
    <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
    </body></html>`)
  win.document.close()
}

function StepControl({ item, disabled, onAnswer }) {
  const [draft, setDraft] = useState(item.item_type === 'number' ? (item.value_number ?? '') : (item.value_text ?? ''))
  useEffect(() => {
    setDraft(item.item_type === 'number' ? (item.value_number ?? '') : (item.value_text ?? ''))
  }, [item.value_number, item.value_text, item.item_type])

  if (item.status === 'na') return null

  if (item.item_type === 'check') {
    const done = item.status === 'done'
    return (
      <button type="button" disabled={disabled} aria-pressed={done} aria-label={done ? 'Done — tap to undo' : 'Mark done'}
        onClick={() => onAnswer({ status: done ? null : 'done' })}
        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-60 ${done ? 'bg-green-600 border-green-600 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-green-500'}`}>
        {done && <Check size={16} strokeWidth={3} />}
      </button>
    )
  }

  if (item.item_type === 'pass_fail') {
    const btn = (key, label, on) => (
      <button type="button" disabled={disabled} aria-pressed={item.status === key}
        onClick={() => onAnswer({ status: item.status === key ? null : key })}
        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-60 ${item.status === key ? on : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'}`}>
        {label}
      </button>
    )
    return (
      <div className="flex gap-1.5 flex-shrink-0">
        {btn('pass', 'Pass', 'bg-green-600 border-green-600 text-white')}
        {btn('fail', 'Fail', 'bg-red-600 border-red-600 text-white')}
      </div>
    )
  }

  const isNumber = item.item_type === 'number'
  const commit = () => {
    const raw = String(draft).trim()
    if (isNumber) {
      if (raw === '') { if (item.status) onAnswer({ status: null, value_number: null }); return }
      const n = Number(raw)
      if (!Number.isFinite(n)) { setDraft(item.value_number ?? ''); return }
      if (n !== Number(item.value_number) || item.status !== 'done') onAnswer({ status: 'done', value_number: n })
    } else {
      if (raw === '') { if (item.status) onAnswer({ status: null, value_text: null }); return }
      if (raw !== item.value_text || item.status !== 'done') onAnswer({ status: 'done', value_text: raw })
    }
  }
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <input type={isNumber ? 'number' : 'text'} inputMode={isNumber ? 'decimal' : undefined} step="any"
        value={draft} disabled={disabled} onChange={e => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        placeholder={isNumber ? 'Number' : 'Text'} maxLength={isNumber ? undefined : 500}
        className={`${isNumber ? 'w-24' : 'w-40'} px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60`} />
      {item.unit && <span className="text-xs text-slate-500 dark:text-slate-400">{item.unit}</span>}
    </div>
  )
}

export default function WorkOrderChecklist({ wo, canAddChecklist = false, onSummary, onChanged }) {
  const { profile, organization } = useAuth()
  const [items, setItems]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [canAnswer, setCanAnswer]   = useState(false)
  const [lists, setLists]           = useState(null)   // active checklists, loaded when adding one
  const [picking, setPicking]       = useState(false)
  const [pickId, setPickId]         = useState('')
  const [busy, setBusy]             = useState(false)
  const [error, setError]           = useState('')
  const [notesOpen, setNotesOpen]   = useState(() => new Set())

  const load = useCallback(async () => {
    const [{ data, error: err }, { data: can }] = await Promise.all([
      supabase.from('work_order_checklist_items')
        .select('*, answered:profiles!work_order_checklist_items_answered_by_fkey(first_name,last_name), follow_up:work_orders!work_order_checklist_items_follow_up_work_order_id_fkey(wo_number)')
        .eq('work_order_id', wo.id).order('sort_order'),
      supabase.rpc('wo_can_work', { p_work_order: wo.id }),
    ])
    if (err) setError(err.message)
    setItems(data || [])
    setCanAnswer(!!can)
    setLoading(false)
  }, [wo.id])

  useEffect(() => { load() }, [load])
  useEffect(() => { onSummary?.(checklistSummary(items)) }, [items, onSummary])

  async function answer(item, patch) {
    setError('')
    const next = { ...patch }
    if (patch.status === 'na') { next.value_number = null; next.value_text = null }
    setItems(list => list.map(i => i.id === item.id ? { ...i, ...next } : i))
    const { data, error: err } = await supabase.from('work_order_checklist_items')
      .update(next).eq('id', item.id)
      .select('*, answered:profiles!work_order_checklist_items_answered_by_fkey(first_name,last_name), follow_up:work_orders!work_order_checklist_items_follow_up_work_order_id_fkey(wo_number)')
      .single()
    if (err || !data) {
      setError(err?.message || 'That answer wasn’t saved. Please try again.')
      setItems(list => list.map(i => i.id === item.id ? item : i))
      return
    }
    setItems(list => list.map(i => i.id === item.id ? data : i))
  }

  async function startAdding() {
    setPicking(true); setError('')
    if (!lists) {
      const { data } = await supabase.from('wo_checklists').select('id, name')
        .eq('organization_id', organization.id).eq('is_active', true).order('name')
      setLists(data || [])
      if (data?.length === 1) setPickId(data[0].id)
    }
  }

  async function addChecklist() {
    if (!pickId) return
    setBusy(true); setError('')
    const { error: err } = await supabase.rpc('attach_wo_checklist', { p_work_order: wo.id, p_checklist: pickId })
    setBusy(false)
    if (err) { setError(err.message); return }
    setPicking(false); setPickId('')
    await load()
    onChanged?.()
  }

  async function removeChecklist() {
    setBusy(true); setError('')
    const { error: err } = await supabase.rpc('remove_wo_checklist', { p_work_order: wo.id })
    setBusy(false)
    if (err) { setError(err.message); return }
    await load()
    onChanged?.()
  }

  // A failed step can open one follow-up job at the same place, unassigned.
  async function openFollowUp(item) {
    setBusy(true); setError('')
    const { data: newWo, error: err } = await supabase.from('work_orders').insert({
      organization_id: wo.organization_id,
      title: `Follow-up: ${item.label}`.slice(0, 200),
      description: [
        `Failed checklist step on work order${wo.wo_number ? ` #${wo.wo_number}` : ''} (${item.checklist_name}): ${item.label}`,
        item.note ? `Note: ${item.note}` : null,
      ].filter(Boolean).join('\n'),
      category: wo.category, subcategory: wo.subcategory || null, priority: 'normal', status: 'open',
      asset_id: wo.asset_id || null, location_id: wo.location_id || null, location_path: wo.location_path || null,
      building: wo.building || null, unit: wo.unit || null, location_detail: wo.location_detail || null,
      submitted_by: profile.id, source: 'staff', work_type: 'routine',
    }).select('id, wo_number').single()
    if (err || !newWo) { setBusy(false); setError(err?.message || 'The follow-up work order wasn’t created.'); return }
    await Promise.all([
      supabase.from('wo_activity').insert({
        work_order_id: newWo.id, user_id: profile.id, action_type: 'created',
        action: `Work order created from a failed checklist step on #${wo.wo_number ?? ''}: ${item.label}`,
      }),
      supabase.from('wo_activity').insert({
        work_order_id: wo.id, user_id: profile.id, action_type: 'checklist',
        action: `Follow-up work order #${newWo.wo_number ?? ''} opened for failed step: ${item.label}`,
      }),
    ])
    const { error: linkErr } = await supabase.from('work_order_checklist_items')
      .update({ follow_up_work_order_id: newWo.id }).eq('id', item.id)
    setBusy(false)
    if (linkErr) setError(linkErr.message)
    await load()
    onChanged?.()
  }

  if (loading) return null

  // No checklist yet: the Maintenance team can add one to an open job.
  if (!items.length) {
    if (!canAddChecklist || ['closed', 'cancelled'].includes(wo.status)) return null
    return (
      <div>
        {!picking ? (
          <button type="button" onClick={startAdding}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
            <ListChecks size={14} /> Add a checklist
          </button>
        ) : (
          <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Add a checklist</label>
            {lists && !lists.length ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No checklists yet. A Maintenance Manager can make them in Maintenance → Settings → Checklists.</p>
            ) : (
              <div className="flex gap-2">
                <select value={pickId} onChange={e => setPickId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-sm">
                  <option value="">Choose a checklist…</option>
                  {(lists || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <button type="button" disabled={!pickId || busy} onClick={addChecklist}
                  className="px-3 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">Add</button>
              </div>
            )}
            <button type="button" onClick={() => setPicking(false)} className="mt-2 text-xs text-slate-500">Cancel</button>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        )}
      </div>
    )
  }

  const sum = checklistSummary(items)
  const anyAnswered = items.some(i => i.status || i.note)
  const locked = !canAnswer || busy

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ListChecks size={16} className="text-brand-600 dark:text-brand-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{items[0].checklist_name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button type="button" onClick={() => printChecklist({ wo, items, orgName: organization?.name })}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200" title="Print this checklist">
              <Printer size={13} /> Print
            </button>
            {canAddChecklist && !anyAnswered && (
              <button type="button" onClick={removeChecklist} disabled={busy}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-600" title="Remove this checklist (only before any step is answered)">
                <X size={13} /> Remove
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-600 transition-all" style={{ width: `${sum.total ? (sum.answered / sum.total) * 100 : 0}%` }} />
          </div>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">{sum.answered} of {sum.total} done</span>
          {sum.failed > 0 && <span className="text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">{sum.failed} failed</span>}
        </div>
        {!canAnswer && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">View only: answers can be filled in by whoever is working this job.</p>}
      </div>

      <ol className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item, n) => {
          const noteOpen = notesOpen.has(item.id) || !!item.note
          return (
            <li key={item.id} className={`px-4 py-3 ${item.status === 'fail' ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
              <div className="flex items-start gap-3">
                <span className="text-xs text-slate-400 w-5 text-right pt-1.5 flex-shrink-0">{n + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${item.status === 'na' ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                    {item.label}{item.unit && item.item_type !== 'number' ? ` (${item.unit})` : ''}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    {canAnswer && (
                      <>
                        <button type="button" disabled={locked} onClick={() => answer(item, { status: item.status === 'na' ? null : 'na' })}
                          className={`text-xs ${item.status === 'na' ? 'text-brand-600 dark:text-brand-400 font-semibold' : 'text-slate-400 hover:text-slate-600'}`}>
                          {item.status === 'na' ? 'N/A (tap to undo)' : 'N/A'}
                        </button>
                        {!noteOpen && (
                          <button type="button" onClick={() => setNotesOpen(s => new Set(s).add(item.id))}
                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
                            <StickyNote size={11} /> Add note
                          </button>
                        )}
                      </>
                    )}
                    {item.answered_at && (
                      <span className="text-[11px] text-slate-400">
                        {personName(item.answered) || 'Someone'} · {new Date(item.answered_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                    {item.status === 'fail' && (item.follow_up_work_order_id ? (
                      <span className="flex items-center gap-1 text-xs text-slate-500"><Wrench size={11} /> Follow-up #{item.follow_up?.wo_number ?? ''} opened</span>
                    ) : canAnswer && (
                      <button type="button" disabled={busy} onClick={() => openFollowUp(item)}
                        className="flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 hover:underline">
                        <Wrench size={11} /> Open a follow-up work order
                      </button>
                    ))}
                  </div>
                  {noteOpen && (
                    canAnswer ? (
                      <NoteField item={item} disabled={locked} onSave={(note) => answer(item, { note })} />
                    ) : item.note && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 italic">{item.note}</p>
                  )}
                </div>
                {canAnswer
                  ? <StepControl item={item} disabled={locked} onAnswer={(patch) => answer(item, patch)} />
                  : <span className={`text-sm font-semibold flex-shrink-0 ${item.status === 'fail' ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'}`}>{answerText(item) || '—'}</span>}
              </div>
            </li>
          )
        })}
      </ol>
      {error && <p className="px-4 py-2 text-xs text-red-600 border-t border-slate-100 dark:border-slate-800">{error}</p>}
    </div>
  )
}

function NoteField({ item, disabled, onSave }) {
  const [draft, setDraft] = useState(item.note || '')
  useEffect(() => { setDraft(item.note || '') }, [item.note])
  return (
    <textarea rows={1} value={draft} disabled={disabled} maxLength={1000} placeholder="Note"
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { const v = draft.trim() || null; if (v !== (item.note || null)) onSave(v) }}
      className="mt-1.5 w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y disabled:opacity-60" />
  )
}
