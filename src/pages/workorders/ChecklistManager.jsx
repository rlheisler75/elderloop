// ChecklistManager.jsx — Maintenance → Settings → Checklists (20261120_wo_checklists.sql).
// Each community builds its own checklists; a PM schedule carries one and
// every work order it generates gets a copy of the steps. Editing here never
// changes work orders that already have their copy.
// Who edits: same as work order categories (CategoryManager): Org Admin,
// Administrator, super admin, or a Maintenance Manager. Others see read-only.
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ListChecks, Plus, ArrowUp, ArrowDown, Trash2, Power } from 'lucide-react'
import { CHECKLIST_TYPES } from './WorkOrderChecklist'

const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60'

function StepRow({ step, index, count, canManage, onSave, onMove, onDelete }) {
  const [label, setLabel] = useState(step.label)
  const [unit, setUnit]   = useState(step.unit || '')
  useEffect(() => { setLabel(step.label); setUnit(step.unit || '') }, [step.label, step.unit])

  return (
    <li className="flex items-start gap-2 py-2">
      <span className="text-xs text-slate-400 w-6 text-right pt-2.5 flex-shrink-0">{index + 1}.</span>
      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_130px_90px] gap-2">
        <input value={label} disabled={!canManage} maxLength={300} aria-label={`Step ${index + 1}`}
          onChange={e => setLabel(e.target.value)}
          onBlur={() => { const v = label.trim(); if (!v) { setLabel(step.label); return } if (v !== step.label) onSave({ label: v }) }}
          className={inputCls} />
        <select value={step.item_type} disabled={!canManage} aria-label={`Step ${index + 1} answer type`}
          onChange={e => onSave({ item_type: e.target.value })} className={inputCls}>
          {CHECKLIST_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <input value={unit} disabled={!canManage} maxLength={20} placeholder="Unit" aria-label={`Step ${index + 1} unit`}
          title="Optional unit, e.g. Volts or °F"
          onChange={e => setUnit(e.target.value)}
          onBlur={() => { const v = unit.trim() || null; if (v !== (step.unit || null)) onSave({ unit: v }) }}
          className={inputCls} />
      </div>
      {canManage && (
        <div className="flex items-center gap-0.5 pt-1.5 flex-shrink-0">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up"
            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowUp size={14} /></button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move down"
            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowDown size={14} /></button>
          <button type="button" onClick={onDelete} aria-label="Delete step"
            className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
        </div>
      )}
    </li>
  )
}

export default function ChecklistManager({ orgId }) {
  const { profile, hasDepartmentAccess } = useAuth()
  const canManage = ['org_admin', 'ceo', 'super_admin'].includes(profile?.role) || hasDepartmentAccess('maintenance', 'manager')

  const [lists, setLists]       = useState([])
  const [pmCounts, setPmCounts] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [steps, setSteps]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [newName, setNewName]   = useState('')
  const [bulk, setBulk]         = useState('')
  const [name, setName]         = useState('')
  const [error, setError]       = useState('')

  const selected = lists.find(l => l.id === selectedId) || null

  async function loadLists(selectId) {
    const [{ data }, { data: pms }] = await Promise.all([
      supabase.from('wo_checklists').select('*').eq('organization_id', orgId).order('is_active', { ascending: false }).order('name'),
      supabase.from('pm_schedules').select('checklist_id').eq('organization_id', orgId).eq('is_active', true).not('checklist_id', 'is', null),
    ])
    setLists(data || [])
    const counts = {}
    for (const p of pms || []) counts[p.checklist_id] = (counts[p.checklist_id] || 0) + 1
    setPmCounts(counts)
    setLoading(false)
    const id = selectId ?? selectedId ?? data?.[0]?.id ?? null
    setSelectedId(id)
    return id
  }

  async function loadSteps(id) {
    if (!id) { setSteps([]); return }
    const { data } = await supabase.from('wo_checklist_items').select('*').eq('checklist_id', id).order('sort_order').order('created_at')
    setSteps(data || [])
  }

  useEffect(() => { if (orgId) loadLists() }, [orgId])
  useEffect(() => { loadSteps(selectedId); setName(selected?.name || ''); setError('') }, [selectedId])
  useEffect(() => { setName(selected?.name || '') }, [selected?.name])

  const fail = (err) => { if (err) setError(err.message); return !!err }

  async function createList() {
    const n = newName.trim()
    if (!n) return
    const { data, error: err } = await supabase.from('wo_checklists').insert({ organization_id: orgId, name: n }).select().single()
    if (fail(err)) return
    setNewName('')
    await loadLists(data.id)
  }

  async function saveList(patch) {
    const { error: err } = await supabase.from('wo_checklists')
      .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', selectedId)
    if (fail(err)) return
    await loadLists(selectedId)
  }

  async function addSteps(labels) {
    const clean = labels.map(l => l.trim()).filter(Boolean).map(l => l.slice(0, 300))
    if (!clean.length) return
    const start = steps.length ? Math.max(...steps.map(s => s.sort_order)) + 1 : 1
    const { error: err } = await supabase.from('wo_checklist_items').insert(
      clean.map((label, i) => ({ checklist_id: selectedId, organization_id: orgId, label, item_type: 'check', sort_order: start + i }))
    )
    if (fail(err)) return
    setBulk('')
    await loadSteps(selectedId)
  }

  async function saveStep(step, patch) {
    setSteps(list => list.map(s => s.id === step.id ? { ...s, ...patch } : s))
    const { error: err } = await supabase.from('wo_checklist_items').update(patch).eq('id', step.id)
    if (fail(err)) await loadSteps(selectedId)
  }

  async function moveStep(index, dir) {
    const other = steps[index + dir]
    const step = steps[index]
    if (!other) return
    // Renumber the whole list so ties from older rows can't stick
    const order = [...steps]
    order[index] = other; order[index + dir] = step
    setSteps(order)
    const results = await Promise.all(order.map((s, i) =>
      s.sort_order === i + 1 ? null : supabase.from('wo_checklist_items').update({ sort_order: i + 1 }).eq('id', s.id)))
    const err = results.find(r => r?.error)?.error
    if (fail(err)) await loadSteps(selectedId)
    else setSteps(order.map((s, i) => ({ ...s, sort_order: i + 1 })))
  }

  async function deleteStep(step) {
    const { error: err } = await supabase.from('wo_checklist_items').delete().eq('id', step.id)
    if (fail(err)) return
    setSteps(list => list.filter(s => s.id !== step.id))
  }

  if (loading) return <div className="text-center py-10 text-slate-400 text-sm">Loading checklists...</div>

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Build checklists for preventive maintenance. Pick one on a PM schedule and every work order it creates gets a copy of the steps.
        Changes here only affect work orders created afterward.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
        {/* Checklists */}
        <div className="space-y-2">
          {lists.map(l => (
            <button key={l.id} type="button" onClick={() => setSelectedId(l.id)}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${l.id === selectedId ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/30 text-brand-800 dark:text-brand-300' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300'} ${l.is_active ? '' : 'opacity-60'}`}>
              <div className="font-medium truncate">{l.name}</div>
              <div className="text-xs text-slate-400">
                {l.is_active ? (pmCounts[l.id] ? `${pmCounts[l.id]} PM schedule${pmCounts[l.id] === 1 ? '' : 's'}` : 'Not on a PM schedule') : 'Turned off'}
              </div>
            </button>
          ))}
          {!lists.length && <p className="text-sm text-slate-400">No checklists yet.</p>}
          {canManage && (
            <div className="flex gap-1.5 pt-1">
              <input value={newName} onChange={e => setNewName(e.target.value)} maxLength={120} placeholder="New checklist name"
                onKeyDown={e => { if (e.key === 'Enter') createList() }} className={inputCls} />
              <button type="button" onClick={createList} disabled={!newName.trim()} aria-label="Create checklist"
                className="px-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg"><Plus size={16} /></button>
            </div>
          )}
        </div>

        {/* Selected checklist */}
        {selected ? (
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <ListChecks size={16} className="text-brand-600 dark:text-brand-400 flex-shrink-0" />
              <input value={name} disabled={!canManage} maxLength={120} aria-label="Checklist name"
                onChange={e => setName(e.target.value)}
                onBlur={() => { const v = name.trim(); if (!v) { setName(selected.name); return } if (v !== selected.name) saveList({ name: v }) }}
                className={`${inputCls} font-semibold`} />
              {canManage && (
                <button type="button" onClick={() => saveList({ is_active: !selected.is_active })}
                  title={selected.is_active ? 'Turn off: no new work orders get this checklist' : 'Turn back on'}
                  className={`flex items-center gap-1 px-2.5 py-2 rounded-lg border text-xs font-medium whitespace-nowrap ${selected.is_active ? 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-600' : 'border-green-300 text-green-700'}`}>
                  <Power size={13} /> {selected.is_active ? 'Turn off' : 'Turn on'}
                </button>
              )}
            </div>
            {!selected.is_active && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Turned off: PM schedules that use it create work orders without a checklist.</p>
            )}

            <div className="mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Steps <span className="font-normal normal-case text-slate-400">({steps.length})</span>
            </div>
            <ol className="divide-y divide-slate-100 dark:divide-slate-800">
              {steps.map((s, i) => (
                <StepRow key={s.id} step={s} index={i} count={steps.length} canManage={canManage}
                  onSave={(patch) => saveStep(s, patch)} onMove={(dir) => moveStep(i, dir)} onDelete={() => deleteStep(s)} />
              ))}
            </ol>
            {!steps.length && <p className="py-3 text-sm text-slate-400">No steps yet.</p>}

            {canManage && (
              <div className="mt-3 space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Add steps</label>
                <textarea rows={3} value={bulk} onChange={e => setBulk(e.target.value)}
                  placeholder={'One step per line, e.g.\nCheck oil filter\nCheck lube oil level'}
                  className={`${inputCls} resize-y`} />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">New steps start as Check off; change the type after adding.</span>
                  <button type="button" onClick={() => addSteps(bulk.split('\n'))} disabled={!bulk.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                    <Plus size={14} /> Add {bulk.split('\n').filter(l => l.trim()).length > 1 ? `${bulk.split('\n').filter(l => l.trim()).length} steps` : 'step'}
                  </button>
                </div>
              </div>
            )}
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        ) : (
          <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-sm text-slate-400 text-center">
            {canManage ? 'Create a checklist to get started.' : 'No checklists yet.'}
          </div>
        )}
      </div>
    </div>
  )
}
