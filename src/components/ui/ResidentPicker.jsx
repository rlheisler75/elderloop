// Type-to-search resident field, the same feel as Schedule a Trip: type part of
// a name or room, pick from the matches (mouse or ↑/↓ + Enter). Replaces the
// long resident <select> lists. value / onChange use the resident id ('' = none).
// noneLabel is what an empty, read-only field says (e.g. "Not resident-specific").
import { useState } from 'react'
import { Search, X } from 'lucide-react'
import useListNav from '../../hooks/useListNav'
import { residentPlace } from '../../lib/residentPlace'

export default function ResidentPicker({ residents, value, onChange, disabled = false,
  placeholder = 'Search resident by name or room…', noneLabel, className = '' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const selected = residents.find(r => r.id === value)

  const q = query.toLowerCase().trim()
  const matches = q
    ? residents.filter(r => [`${r.first_name} ${r.last_name}`, `${r.last_name} ${r.first_name}`, `${r.last_name}, ${r.first_name}`, r.room, r.unit]
        .some(v => (v || '').toLowerCase().includes(q))).slice(0, 8)
    : []
  const pick = (r) => { onChange(r.id); setQuery(''); setOpen(false) }
  const nav = useListNav({ items: matches, onPick: pick, open: open && !!q, onClose: () => setOpen(false), resetKey: q })

  const boxCls = `w-full flex items-center gap-2 px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 ${className}`

  if (selected) {
    return (
      <div className={`${boxCls} ${disabled ? 'bg-slate-50 dark:bg-slate-800' : ''}`}>
        <span className="flex-1 min-w-0 truncate text-slate-800 dark:text-slate-100">
          <span className="font-medium">{selected.first_name} {selected.last_name}</span>
          {residentPlace(selected) && <span className="text-slate-400"> · {residentPlace(selected)}</span>}
        </span>
        {!disabled && (
          <button type="button" onClick={() => onChange('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="Clear resident">
            <X size={14} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} disabled={disabled}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onKeyDown={nav.onKeyDown}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={disabled ? (noneLabel || 'No resident') : placeholder}
          className={`w-full pl-8 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-800 ${className}`} />
      </div>
      {open && q && (
        <div ref={nav.listRef} className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {matches.map((r, i) => (
            <button key={r.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => pick(r)} {...nav.rowProps(i)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 last:border-0 text-left ${nav.isActive(i) ? 'bg-brand-50 dark:bg-slate-800' : ''}`}>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.first_name} {r.last_name}</span>
              {residentPlace(r) && <span className="text-xs text-slate-400 flex-shrink-0">{residentPlace(r)}</span>}
            </button>
          ))}
          {matches.length === 0 && <div className="px-4 py-3 text-sm text-slate-400">No residents found</div>}
        </div>
      )}
    </div>
  )
}
