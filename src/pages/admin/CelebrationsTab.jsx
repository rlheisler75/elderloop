import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { DEFAULT_CELEBRATIONS, rangeFor, describeRule, ORDINALS, MONTHS, WEEKDAYS } from '../../lib/appreciationWeeks'
import { ACCENT_COLORS, accentSwatch, accentLabel } from '../../lib/accentColors'
import { PartyPopper, Plus, Pencil, Trash2, RotateCcw, Loader2, Check, X } from 'lucide-react'

// Admin Panel → Celebrations: the community's "Celebrate Our Staff" calendar
// (org_celebrations). With no rows the community uses ElderLoop's defaults;
// customizing copies them in first.

const RULE_FIELDS = ['name', 'emoji', 'accent', 'kind', 'month', 'day', 'end_month', 'end_day', 'n', 'weekday', 'days']
const BLANK = { name: '', emoji: '🎉', accent: 'teal', kind: 'week', month: 1, n: 1, day: 1, end_month: 1, end_day: 7, weekday: 0, days: 7 }

// Saved rows have nulls in the columns their kind doesn't use; keep BLANK's
// values there so switching kinds in the editor starts from something sensible.
const withoutEmpty = (row) => Object.fromEntries(Object.entries(row).filter(([, v]) => v != null))

const fmtDay = d => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

// This year's dates, or next year's once this year's have passed.
function upcoming(rule) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const y = today.getFullYear()
  const r = rangeFor(rule, y)
  if (r && r[1] >= today) return r
  return rangeFor(rule, y + 1)
}

// Only the columns for the rule's kind; the rest are saved empty.
function clean(form) {
  const row = Object.fromEntries(RULE_FIELDS.map(k => [k, form[k] === '' ? null : form[k]]))
  for (const k of ['month', 'day', 'end_month', 'end_day', 'n', 'weekday', 'days']) row[k] = row[k] == null ? null : Number(row[k])
  if (row.kind !== 'dates')   Object.assign(row, { day: null, end_month: null, end_day: null })
  if (row.kind === 'dates')   Object.assign(row, { n: null })
  if (row.kind !== 'weekday') Object.assign(row, { weekday: null, days: null })
  row.name = (row.name || '').trim()
  row.emoji = row.emoji?.trim() || null
  return row
}

const Sel = ({ value, onChange, options }) => (
  <select value={value ?? ''} onChange={e => onChange(e.target.value)}
    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
  </select>
)
const monthOpts = MONTHS.map((m, i) => [i + 1, m])
const dayOpts = Array.from({ length: 31 }, (_, i) => [i + 1, i + 1])

function CelebrationForm({ initial, onSave, onCancel, saving }) {
  const [f, setF] = useState(initial)
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }))
  const row = clean(f)
  const preview = upcoming(row)
  const valid = row.name.length > 0 && preview

  return (
    <div className="border-2 border-brand-200 dark:border-brand-900 rounded-2xl p-5 bg-brand-50/40 dark:bg-brand-950/20 mb-4">
      <div className="grid sm:grid-cols-[80px_1fr] gap-3 mb-4">
        <label className="text-xs font-semibold text-slate-500">Emoji
          <input value={f.emoji || ''} onChange={e => set('emoji')(e.target.value)} maxLength={16}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-lg" />
        </label>
        <label className="text-xs font-semibold text-slate-500">Name
          <input value={f.name} onChange={e => set('name')(e.target.value)} maxLength={80} placeholder="e.g. Maranatha Founders Day"
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
        </label>
      </div>

      <p className="text-xs font-semibold text-slate-500 mb-2">Color</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {ACCENT_COLORS.map(c => (
          <button key={c.key} type="button" onClick={() => set('accent')(c.key)} title={c.label}
            className={`w-8 h-8 rounded-full flex items-center justify-center ring-offset-2 dark:ring-offset-slate-900 ${f.accent === c.key ? 'ring-2 ring-slate-400' : ''}`}
            style={{ background: c.swatch }}>
            {f.accent === c.key && <Check size={14} className="text-white" />}
          </button>
        ))}
      </div>

      <p className="text-xs font-semibold text-slate-500 mb-2">When</p>
      <div className="flex flex-wrap items-center gap-2 mb-3 text-sm text-slate-600 dark:text-slate-300">
        <Sel value={f.kind} onChange={set('kind')} options={[['week', 'A full work week of a month'], ['sunweek', 'A full Sunday–Saturday week of a month'], ['weekday', 'Starts on a weekday'], ['dates', 'The same dates every year']]} />
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-slate-600 dark:text-slate-300">
        {(f.kind === 'week' || f.kind === 'sunweek') && <>
          The <Sel value={f.n} onChange={set('n')} options={ORDINALS} /> full week of <Sel value={f.month} onChange={set('month')} options={monthOpts} />
        </>}
        {f.kind === 'weekday' && <>
          Starts the <Sel value={f.n} onChange={set('n')} options={ORDINALS} /> <Sel value={f.weekday} onChange={set('weekday')} options={WEEKDAYS.map((w, i) => [i, w])} />
          of <Sel value={f.month} onChange={set('month')} options={monthOpts} /> and runs
          <input type="number" min={1} max={31} value={f.days ?? ''} onChange={e => set('days')(e.target.value)}
            className="w-16 px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" /> days
        </>}
        {f.kind === 'dates' && <>
          From <Sel value={f.month} onChange={set('month')} options={monthOpts} /> <Sel value={f.day} onChange={set('day')} options={dayOpts} />
          to <Sel value={f.end_month} onChange={set('end_month')} options={monthOpts} /> <Sel value={f.end_day} onChange={set('end_day')} options={dayOpts} />
        </>}
      </div>
      <p className="text-xs text-slate-500 mb-4">
        {preview ? <>Next: {fmtDay(preview[0])} – {fmtDay(preview[1])}</> : 'That week doesn’t happen in this month. Pick another.'}
        {f.kind === 'week' && ' · A full week means Monday–Friday all in that month; the color shows Sunday through Saturday.'}
      </p>

      <div className="flex gap-2">
        <button disabled={!valid || saving} onClick={() => onSave(row)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
        </button>
        <button onClick={onCancel} className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm">
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  )
}

export default function CelebrationsTab({ orgId }) {
  const { organization, refreshCelebrations } = useAuth()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // row id, 'new', or null
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => { if (orgId) load() }, [orgId])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('org_celebrations').select('*')
      .eq('organization_id', orgId).order('sort').order('created_at')
    if (error) setError(error.message)
    setRows(data || [])
    setLoading(false)
  }

  // Reload here and, when it's the signed-in community, the live accent too.
  async function done(err) {
    setSaving(false)
    if (err) { setError(err.message); return }
    setError(''); setEditing(null)
    await load()
    if (orgId === organization?.id) refreshCelebrations()
  }

  const custom = rows.length > 0
  const list = custom ? rows : DEFAULT_CELEBRATIONS

  // First change: copy the defaults in so there is something to edit.
  async function customize() {
    setSaving(true)
    const { error } = await supabase.from('org_celebrations').insert(
      DEFAULT_CELEBRATIONS.map((c, i) => ({ ...clean({ ...BLANK, ...c }), organization_id: orgId, sort: i * 10 })))
    done(error)
  }

  async function save(row) {
    setSaving(true)
    const { error } = editing === 'new'
      ? await supabase.from('org_celebrations').insert({ ...row, organization_id: orgId, sort: (rows.at(-1)?.sort ?? 0) + 10 })
      : await supabase.from('org_celebrations').update(row).eq('id', editing)
    done(error)
  }

  async function toggle(r) {
    const { error } = await supabase.from('org_celebrations').update({ enabled: !r.enabled }).eq('id', r.id)
    done(error)
  }

  async function remove(r) {
    if (!confirm(`Remove ${r.name}?`)) return
    const { error } = await supabase.from('org_celebrations').delete().eq('id', r.id)
    done(error)
  }

  async function reset() {
    if (!confirm('Go back to ElderLoop’s default calendar? Your changes and added celebrations will be removed.')) return
    setSaving(true)
    const { error } = await supabase.from('org_celebrations').delete().eq('organization_id', orgId)
    done(error)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <PartyPopper size={18} className="text-brand-600" />
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">Celebrate Our Staff</h2>
        </div>
        {custom ? (
          <div className="flex gap-2">
            <button onClick={() => setEditing('new')} disabled={!!editing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50">
              <Plus size={14} /> Add celebration
            </button>
            <button onClick={reset} disabled={saving}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
              <RotateCcw size={14} /> Reset to defaults
            </button>
          </div>
        ) : (
          <button onClick={customize} disabled={saving}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />} Customize this calendar
          </button>
        )}
      </div>
      <p className="text-slate-400 text-sm mb-5">
        Anyone who picks <b className="text-slate-600 dark:text-slate-300">Celebrate Our Staff</b> in Settings → Accent Color sees these colors during each week, and Ocean Blue the rest of the year.
        {custom ? ' This community uses its own calendar.' : ' This community uses ElderLoop’s default calendar.'}
      </p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {editing === 'new' && <CelebrationForm initial={BLANK} onSave={save} onCancel={() => setEditing(null)} saving={saving} />}

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {list.map((c, i) => {
          const id = c.id || i
          if (editing && editing === c.id) return (
            <CelebrationForm key={id} initial={{ ...BLANK, ...withoutEmpty(c) }} onSave={save} onCancel={() => setEditing(null)} saving={saving} />
          )
          const next = upcoming(c)
          const off = custom && !c.enabled
          return (
            <div key={id} className={`flex items-center gap-3 py-3 ${off ? 'opacity-50' : ''}`}>
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: accentSwatch(c.accent) + '22', boxShadow: `inset 0 0 0 2px ${accentSwatch(c.accent)}` }}>
                {c.emoji || '🎉'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{c.name}</p>
                <p className="text-xs text-slate-400">
                  {describeRule(c)}{next && <> · next {fmtDay(next[0])} – {fmtDay(next[1])}</>} · {accentLabel(c.accent)}
                </p>
              </div>
              {custom && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggle(c)} title={c.enabled ? 'Turn off' : 'Turn on'}
                    className={`relative w-10 h-6 rounded-full transition-colors ${c.enabled ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${c.enabled ? 'translate-x-4' : ''}`} />
                  </button>
                  <button onClick={() => setEditing(c.id)} disabled={!!editing} title="Edit"
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil size={15} /></button>
                  <button onClick={() => remove(c)} title="Remove"
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 size={15} /></button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
