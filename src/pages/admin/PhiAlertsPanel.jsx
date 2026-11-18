import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { ShieldAlert, Users, Moon, UserX, CalendarX, Settings, Loader2, RotateCcw, Search, Check, X } from 'lucide-react'

// Unusual-access alerts at the top of Admin Panel → Health Data Access.
// Alerts are raised in the database as each view is logged (log_phi_view →
// _phi_check_unusual, 20261116_phi_access_alerts.sql); this lists them
// (phi_alerts_list), records the review (phi_alert_decide), and edits the
// rules (phi_alert_settings_get / _save).

export const ALERT_KINDS = {
  bulk:              { label: 'Many residents in a short time', icon: Users },
  after_hours:       { label: 'Late-night access',               icon: Moon },
  inactive_resident: { label: "Former resident's record",        icon: UserX },
  after_end_date:    { label: 'After employment end date',       icon: CalendarX },
}

const TIMEZONES = [
  ['America/New_York', 'Eastern'], ['America/Chicago', 'Central'], ['America/Denver', 'Mountain'],
  ['America/Phoenix', 'Arizona'], ['America/Los_Angeles', 'Pacific'], ['America/Anchorage', 'Alaska'],
  ['Pacific/Honolulu', 'Hawaii'],
]
const HOURS = Array.from({ length: 24 }, (_, h) => [h, new Date(2000, 0, 1, h).toLocaleTimeString('en-US', { hour: 'numeric' })])

const fmtTime = ts => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
function fmtSpan(a, b) {
  if (!b || Math.abs(new Date(b) - new Date(a)) < 60000) return fmtTime(a)
  const sameDay = new Date(a).toDateString() === new Date(b).toDateString()
  return `${fmtTime(a)} – ${sameDay ? new Date(b).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : fmtTime(b)}`
}
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const inputCls = 'px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm'
const btnCls = 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40'

export default function PhiAlertsPanel({ orgId, onShowActivity }) {
  const [filter, setFilter]   = useState('open')
  const [alerts, setAlerts]   = useState([])
  const [openCount, setOpenCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [deciding, setDeciding] = useState(null)   // { id, action }
  const [note, setNote]       = useState('')
  const [busy, setBusy]       = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true); setError('')
    const { data, error: err } = await supabase.rpc('phi_alerts_list', { p_org: orgId, p_status: filter, p_limit: 200 })
    if (err) { setError(err.message); setAlerts([]) }
    else {
      setAlerts(data || [])
      if (data?.length) setOpenCount(Number(data[0].open_count) || 0)
      else if (filter === 'open') setOpenCount(0)
    }
    setLoading(false)
  }, [orgId, filter])
  useEffect(() => { load() }, [load])

  const decide = async (id, action, text) => {
    setBusy(true); setError('')
    const { error: err } = await supabase.rpc('phi_alert_decide', { p_id: id, p_action: action, p_note: text || null })
    setBusy(false)
    if (err) { setError(err.message); return }
    setDeciding(null); setNote('')
    load()
  }

  const showActivity = a => {
    const from = new Date(a.first_at), to = new Date(a.last_at)
    onShowActivity?.({ userId: a.user_id, userName: a.user_name, isSupport: a.is_support, residentId: a.kind === 'inactive_resident' ? a.resident_id : '', from: ymd(from), to: ymd(to) })
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldAlert size={18} className={openCount ? 'text-amber-500' : 'text-brand-600'} /> Unusual access
            {openCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                {openCount} to review
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            ElderLoop checks each time health information is opened and flags patterns worth a look. An alert isn't proof of a
            problem: check the activity, then mark it reviewed with what you found, or dismiss it if it was expected.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
            {[['open', 'To review'], ['closed', 'Reviewed'], ['all', 'All']].map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`px-3 py-1.5 font-medium ${filter === k ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowSettings(s => !s)} className={btnCls} aria-expanded={showSettings}>
            <Settings size={13} /> Rules
          </button>
        </div>
      </div>

      {showSettings && <AlertSettings orgId={orgId} onClose={() => setShowSettings(false)} />}

      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-4">{error}</p>}

      <div className="mt-4">
        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : alerts.length === 0 ? (
          <p className="py-4 text-sm text-slate-400">
            {filter === 'open' ? 'Nothing to review.' : filter === 'closed' ? 'No reviewed alerts yet.' : 'No alerts yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {alerts.map(a => {
              const k = ALERT_KINDS[a.kind] || { label: a.kind, icon: ShieldAlert }
              const Icon = k.icon
              const open = a.status === 'open'
              const isDeciding = deciding?.id === a.id
              return (
                <li key={a.id} className="py-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-2 rounded-lg ${open ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800 dark:text-slate-100">{a.user_name || 'Unknown user'}</span>
                        {a.is_support && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">ElderLoop support</span>
                        )}
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-sm text-slate-600 dark:text-slate-300">{k.label}</span>
                        {!open && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.status === 'reviewed'
                            ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                            {a.status === 'reviewed' ? 'Reviewed' : 'Dismissed as expected'}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {a.detail}
                        {a.kind === 'inactive_resident' && a.resident_name && <> Resident: <b className="font-medium text-slate-600 dark:text-slate-300">{a.resident_name}</b>.</>}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {fmtSpan(a.first_at, a.last_at)}
                        {a.view_count > 1 && ` · ${a.view_count} matching views`}
                      </div>
                      {!open && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {a.reviewed_by_name || 'Someone'} · {a.reviewed_at && fmtTime(a.reviewed_at)}
                          {a.review_note && <span className="block text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">“{a.review_note}”</span>}
                        </div>
                      )}

                      {isDeciding && (
                        <div className="mt-2 space-y-2 max-w-xl">
                          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={2000} autoFocus
                            placeholder={deciding.action === 'reviewed' ? 'What did you find? (e.g. "Covering for the night nurse, asked her supervisor")' : 'Why was it expected? (optional)'}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm" />
                          <div className="flex gap-2">
                            <button disabled={busy || (deciding.action === 'reviewed' && !note.trim())}
                              onClick={() => decide(a.id, deciding.action, note)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40">
                              {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                              {deciding.action === 'reviewed' ? 'Save review' : 'Dismiss'}
                            </button>
                            <button onClick={() => { setDeciding(null); setNote('') }} className={btnCls}><X size={13} /> Cancel</button>
                          </div>
                        </div>
                      )}

                      {!isDeciding && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <button onClick={() => showActivity(a)} className={btnCls}><Search size={13} /> Show activity</button>
                          {open && !a.is_me && (
                            <>
                              <button onClick={() => { setDeciding({ id: a.id, action: 'reviewed' }); setNote('') }} className={btnCls}>
                                <Check size={13} /> Mark reviewed
                              </button>
                              <button onClick={() => { setDeciding({ id: a.id, action: 'dismissed' }); setNote('') }} className={btnCls}>
                                <X size={13} /> Expected
                              </button>
                            </>
                          )}
                          {!open && !a.is_me && (
                            <button disabled={busy} onClick={() => decide(a.id, 'reopen')} className={btnCls}>
                              <RotateCcw size={13} /> Reopen
                            </button>
                          )}
                          {a.is_me && <span className="text-xs text-slate-400 self-center">This alert is about you, so another admin reviews it.</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function AlertSettings({ orgId, onClose }) {
  const [s, setS]           = useState(null)
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  useEffect(() => {
    if (!orgId) return
    ;(async () => {
      const { data, error: err } = await supabase.rpc('phi_alert_settings_get', { p_org: orgId })
      if (err) setError(err.message)
      else setS({ ...data, notify_mode: data?.notify_ids?.length ? 'some' : 'all' })
    })()
  }, [orgId])

  if (error && !s) return <p className="text-sm text-red-600 dark:text-red-400 mt-4">{error}</p>
  if (!s) return <div className="py-4 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>

  const set = patch => { setS(prev => ({ ...prev, ...patch })); setSaved(false) }
  const num = (key, min, max) => (
    <input type="number" min={min} max={max} value={s[key]}
      onChange={e => set({ [key]: e.target.value === '' ? '' : Number(e.target.value) })}
      className={`${inputCls} w-20`} />
  )
  const hour = key => (
    <select value={s[key]} onChange={e => set({ [key]: Number(e.target.value) })} className={inputCls}>
      {HOURS.map(([h, label]) => <option key={h} value={h}>{label}</option>)}
    </select>
  )
  const toggle = (key, title, children) => (
    <div className="flex items-start gap-3 py-3">
      <input type="checkbox" checked={!!s[key]} onChange={e => set({ [key]: e.target.checked })}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600" aria-label={title} />
      <div className={`text-sm ${s[key] ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>
        <div className="font-medium">{title}</div>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">{children}</div>
      </div>
    </div>
  )

  const save = async () => {
    const nums = ['bulk_count', 'bulk_minutes', 'night_usual_days', 'inactive_days']
    if (nums.some(k => !Number.isInteger(s[k]))) { setError('Fill in every number with a whole number.'); return }
    if (s.night_start === s.night_end) { setError('The late-night hours have to start and end at different times.'); return }
    setSaving(true); setError('')
    const { notify_mode, admins, updated_by, updated_by_name, updated_at, ...rest } = s
    const { error: err } = await supabase.rpc('phi_alert_settings_save', {
      p_org: orgId,
      p_settings: { ...rest, notify_ids: notify_mode === 'some' ? s.notify_ids : [] },
    })
    setSaving(false)
    if (err) { setError(err.message.includes('check constraint') ? 'One of the numbers is out of range, or the quiet hours start and end at the same time.' : err.message); return }
    setSaved(true)
  }

  const picked = new Set(s.notify_ids || [])
  return (
    <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 px-4 py-2">
      <div className="divide-y divide-slate-200/70 dark:divide-slate-700/70">
        {toggle('bulk_on', 'Many residents in a short time', <>
          Health records for {num('bulk_count', 5, 500)} or more different residents within {num('bulk_minutes', 5, 1440)} minutes
        </>)}
        {toggle('night_on', 'Late-night access', <>
          Between {hour('night_start')} and {hour('night_end')}, unless the person was signed in at night on
          {num('night_usual_days', 1, 30)} or more of the last 30 days (so night shift isn't flagged)
        </>)}
        {toggle('inactive_on', "Former resident's record", <>
          The resident has been inactive for {num('inactive_days', 1, 3650)} days or more
        </>)}
        {toggle('end_date_on', 'After employment end date', <>
          Health information opened after the date in the person's Employment End Date
        </>)}
        <div className="py-3 text-sm text-slate-700 dark:text-slate-200 flex flex-wrap items-center gap-2">
          <span className="font-medium">Community time zone</span>
          <select value={s.timezone} onChange={e => set({ timezone: e.target.value })} className={inputCls}>
            {TIMEZONES.map(([tz, label]) => <option key={tz} value={tz}>{label}</option>)}
          </select>
        </div>
        <div className="py-3 text-sm text-slate-700 dark:text-slate-200">
          <div className="font-medium">Who gets the bell</div>
          <label className="flex items-center gap-2 mt-1.5">
            <input type="radio" checked={s.notify_mode === 'all'} onChange={() => set({ notify_mode: 'all' })} />
            Every Org Admin and Platform Admin ({s.admins?.length || 0})
          </label>
          <label className="flex items-center gap-2 mt-1">
            <input type="radio" checked={s.notify_mode === 'some'} onChange={() => set({ notify_mode: 'some' })} />
            Only these people
          </label>
          {s.notify_mode === 'some' && (
            <div className="grid sm:grid-cols-2 gap-1 mt-2 ml-6">
              {(s.admins || []).map(p => (
                <label key={p.id} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={picked.has(p.id)}
                    onChange={e => set({ notify_ids: e.target.checked ? [...picked, p.id] : [...picked].filter(x => x !== p.id) })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                  {p.name}
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-2">The person an alert is about never gets its bell. Bells never include staff or resident names.</p>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}
      <div className="flex items-center justify-between gap-3 py-3 flex-wrap">
        <span className="text-xs text-slate-400">
          {s.updated_at && s.updated_by_name ? `Last changed by ${s.updated_by_name}, ${fmtTime(s.updated_at)}` : 'Using the standard rules'}
        </span>
        <div className="flex gap-2">
          <button onClick={onClose} className={btnCls}>Close</button>
          <button onClick={save} disabled={saving || (s.notify_mode === 'some' && !picked.size)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {saved ? 'Saved' : 'Save rules'}
          </button>
        </div>
      </div>
    </div>
  )
}
