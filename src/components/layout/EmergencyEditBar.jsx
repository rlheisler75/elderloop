import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ShieldAlert, Eye, X } from 'lucide-react'

// Shown only to an Administrator (NHA) in a community on tiered access. Outside
// their own modules the NHA is view + approve; Emergency Edit (24 hours, reason
// required) lifts that, is written to the audit log, and alerts the Org Admins.
// The database guard (nha_write_guard) enforces the same rule.
export default function EmergencyEditBar() {
  const { profile, accessModel, emergencyEditOn, emergencyUntil, startEmergencyEdit, endEmergencyEdit } = useAuth()
  const [open, setOpen]       = useState(false)
  const [reason, setReason]   = useState('')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')

  if (profile?.role !== 'ceo' || accessModel !== 'tiered') return null

  const until = emergencyUntil
    ? new Date(emergencyUntil).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    : ''

  const start = async () => {
    if (reason.trim().length < 10) { setError('Describe why you need Emergency Edit (at least 10 characters).'); return }
    setBusy(true); setError('')
    try {
      await startEmergencyEdit(reason.trim())
      setOpen(false); setReason('')
    } catch (e) {
      setError(e.message || 'Could not start Emergency Edit.')
    }
    setBusy(false)
  }

  const end = async () => {
    setBusy(true)
    await endEmergencyEdit()
    setBusy(false)
  }

  return (
    <>
      {emergencyEditOn ? (
        <div className="flex items-center gap-3 px-6 py-2 bg-amber-100 dark:bg-amber-950/60 border-b border-amber-300 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-sm">
          <ShieldAlert size={16} className="flex-shrink-0" />
          <span className="flex-1"><b>Emergency Edit is on</b> until {until}. You can change any record; every change is logged and your Org Admin has been notified.</span>
          <button onClick={end} disabled={busy}
            className="px-3 py-1 rounded-lg bg-amber-900 dark:bg-amber-200 text-white dark:text-amber-950 text-xs font-semibold disabled:opacity-50">
            End now
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-6 py-1.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs">
          <Eye size={14} className="flex-shrink-0" />
          <span className="flex-1">Administrator view: you can see every department and approve. Department records are edited by their teams.</span>
          <button onClick={() => { setOpen(true); setError('') }}
            className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 font-semibold">
            Emergency Edit
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber-600" /> Start Emergency Edit
              </h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                For the next <b>24 hours</b> you can change records in every department. Your reason and every change are written to the audit log, and your Org Admin is notified right away.
              </p>
              <label htmlFor="ee-reason" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</label>
              <textarea id="ee-reason" value={reason} onChange={e => setReason(e.target.value)} rows={3}
                placeholder="e.g. Night supervisor out sick — correcting tonight's medication pass documentation"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500" />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">Cancel</button>
              <button onClick={start} disabled={busy}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
                {busy ? 'Starting…' : 'Start for 24 hours'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
