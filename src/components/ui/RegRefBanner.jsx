import { useState } from 'react'
import { Info, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

// Collapsible state-regulation reference banner. Shared by Social Services
// tabs (Grievances, DischargePlanning) — mirrors the banner pattern used by
// Workorders/Compliance, but flags low/medium-confidence sourced facts so
// staff know what still needs verification against the primary statute.
export default function RegRefBanner({ label, statute, summary, confidence, note, children }) {
  const [open, setOpen] = useState(false)
  const needsVerification = confidence && confidence !== 'high'

  return (
    <div className="mb-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <Info size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">{label}</span>
          {statute && <span className="font-mono text-xs text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded">{statute}</span>}
          {needsVerification && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-medium">
              <AlertTriangle size={10} /> Verify before relying on this
            </span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-blue-600 flex-shrink-0" /> : <ChevronDown size={16} className="text-blue-600 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-blue-200 dark:border-blue-900 pt-3 space-y-2">
          {summary && <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">{summary}</p>}
          {children}
          {note && <p className="text-xs text-amber-700 dark:text-amber-400 italic">⚠ {note}</p>}
        </div>
      )}
    </div>
  )
}
