import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Health-information view logging (20261116_phi_view_logging.sql).
// Records who opened a screen or resident record that shows health information.
// Fire-and-forget: a logging failure never blocks the screen. The server also
// collapses repeats within 10 minutes; this cache just saves the round trip.
// orgId is the community on screen. The server uses it only for ElderLoop
// support (super admin) list views, which belong to no community of their own
// (20261116_phi_view_logging_support.sql); record views go to the record's community.
const recent = new Map()
const WINDOW_MS = 10 * 60 * 1000
// A different person signing in on the same device must be logged afresh.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') recent.clear()
})

export function logPhiView(area, recordId = null, count = null, orgId = null) {
  if (!area) return
  const key = `${orgId || ''}:${area}:${recordId || ''}`
  const now = Date.now()
  if (now - (recent.get(key) || 0) < WINDOW_MS) return
  recent.set(key, now)
  supabase.rpc('log_phi_view', { p_area: area, p_record_id: recordId, p_count: count, p_org: orgId })
    .then(({ error }) => { if (error) { recent.delete(key); console.error('log_phi_view:', error.message) } })
}

// Logs once per area/record while `enabled`. For a resident- or incident-level
// area, pass the id; for a list screen, pass null (and optionally how many rows it shows).
export default function usePhiView(area, recordId = null, { enabled = true, count = null } = {}) {
  const { organization } = useAuth()
  const orgId = organization?.id || null
  useEffect(() => {
    if (!enabled || !area) return
    logPhiView(area, recordId, count, orgId)
    // count is informational; don't re-log when it changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, recordId, enabled, orgId])
}
