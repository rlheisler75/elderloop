// Care-level filter buttons for resident lists (All / Independent / Assisted /
// …), the same choices as the Resident Directory. Only levels that have
// residents are shown, each with its count.
const LEVELS = [
  { key: 'independent',     label: 'Independent' },
  { key: 'assisted',        label: 'Assisted' },
  { key: 'memory_care',     label: 'Memory Care' },
  { key: 'skilled_nursing', label: 'Skilled Nursing' },
  { key: 'rehab',           label: 'Rehab' },
]

export const matchesCareLevel = (resident, level) => level === 'all' || resident.care_level === level

export default function CareLevelFilter({ residents, value, onChange, className = '' }) {
  const counts = residents.reduce((acc, r) => { acc[r.care_level] = (acc[r.care_level] || 0) + 1; return acc }, {})
  const shown = LEVELS.filter(l => counts[l.key])
  if (shown.length < 2) return null
  const btn = (active) => `px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${active
    ? 'bg-brand-600 text-white border-brand-600'
    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      <button type="button" onClick={() => onChange('all')} className={btn(value === 'all')}>
        All <span className="opacity-70">{residents.length}</span>
      </button>
      {shown.map(l => (
        <button key={l.key} type="button" onClick={() => onChange(value === l.key ? 'all' : l.key)} className={btn(value === l.key)}>
          {l.label} <span className="opacity-70">{counts[l.key]}</span>
        </button>
      ))}
    </div>
  )
}
