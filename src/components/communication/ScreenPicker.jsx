// Which digital signage screens an announcement or activity shows on
// (signage_screen_ids, 20261109_signage_screen_targeting.sql). Empty = every screen.
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Check, Monitor } from 'lucide-react'

export const onScreen = (item, screenId) =>
  !item?.signage_screen_ids?.length || (!!screenId && item.signage_screen_ids.includes(screenId))

export default function ScreenPicker({ value = [], onChange, disabled }) {
  const { organization } = useAuth()
  const [screens, setScreens] = useState([])

  useEffect(() => {
    if (!organization?.id) return
    supabase.from('signage_screens').select('id, name')
      .eq('organization_id', organization.id).eq('is_active', true).order('name')
      .then(({ data }) => setScreens(data || []))
  }, [organization?.id])

  // A community with no named screens has only the default address: nothing to pick
  if (!screens.length) return null

  const ids = value.filter(id => screens.some(s => s.id === id))
  const all = ids.length === 0
  const toggle = (id) => onChange(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  const chip = (on) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
    on ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'}`

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        <Monitor size={12} /> Show on screens
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" disabled={disabled} onClick={() => onChange([])} className={chip(all)}>
          {all && <Check size={12} />} All screens
        </button>
        {screens.map(s => (
          <button key={s.id} type="button" disabled={disabled} onClick={() => toggle(s.id)} className={chip(ids.includes(s.id))}>
            {ids.includes(s.id) && <Check size={12} />} {s.name}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-1">
        {all ? 'Shows on every screen.' : 'Shows only on the screens picked, not on the main address.'}
      </p>
    </div>
  )
}
