import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Check, CalendarPlus } from 'lucide-react'

// Shared RSVP toggle used by both ResidentPortal and FamilyPortal's
// Activities tab — writes through immediately on click (insert/delete a
// single activity_rsvps row keyed by activity_id + occurrence_date +
// resident_id), no separate save step, same pattern as AttendanceModal.
export default function RSVPButton({ activity, occurrenceDate, resident, profile, orgId, isRSVPd, onToggled }) {
  const [saving, setSaving] = useState(false)

  const toggle = async (e) => {
    e.stopPropagation()
    setSaving(true)
    if (isRSVPd) {
      await supabase.from('activity_rsvps').delete()
        .eq('activity_id', activity.id).eq('occurrence_date', occurrenceDate).eq('resident_id', resident.id)
    } else {
      await supabase.from('activity_rsvps').insert({
        organization_id: orgId,
        activity_id: activity.id,
        occurrence_date: occurrenceDate,
        resident_id: resident.id,
        submitted_by: profile.id,
        submitted_by_name: `${profile.first_name} ${profile.last_name}`,
        submitted_by_role: profile.role,
      })
    }
    setSaving(false)
    onToggled()
  }

  return (
    <button onClick={toggle} disabled={saving}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-colors flex-shrink-0 ${isRSVPd ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-brand-300'}`}>
      {isRSVPd ? <><Check size={12} /> Going</> : <><CalendarPlus size={12} /> RSVP</>}
    </button>
  )
}
