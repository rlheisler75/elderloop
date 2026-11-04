import { useState } from 'react'
import { MapPin, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import LocationPicker from './LocationPicker'

// Button that shows the chosen location's path and opens the Locations tree picker.
// value = { id, path } | null; onChange gets { id, path, ... } or null.
export default function LocationPickerButton({ value, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 border rounded-lg text-sm transition-all text-left
          ${value ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-400 hover:border-brand-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
        <MapPin size={14} className={value ? 'text-brand-500 flex-shrink-0' : 'text-slate-400 flex-shrink-0'} />
        <span className="flex-1 truncate">{value?.path || 'Select location...'}</span>
        {value && (
          <button type="button"
            onClick={e => { e.stopPropagation(); onChange(null) }}
            className="text-slate-400 hover:text-red-500 flex-shrink-0 ml-1">
            <X size={13} />
          </button>
        )}
      </button>
      {open && (
        <LocationPicker
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// "Building > Hall > Room" path for one location (walks up parent_id)
export async function fetchLocationPath(locationId) {
  const parts = []
  let id = locationId
  for (let guard = 0; id && guard < 12; guard++) {
    const { data } = await supabase.from('locations').select('id,parent_id,name').eq('id', id).maybeSingle()
    if (!data) break
    parts.unshift(data.name)
    id = data.parent_id
  }
  return parts.join(' > ')
}
