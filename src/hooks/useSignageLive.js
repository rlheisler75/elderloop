// Keeps a signage/TV screen current without anyone touching it.
// - signage_ping() (20261109_signage_broadcast.sql) sends a public "refresh"
//   broadcast on signage-<org id> whenever announcements, activities, chapel,
//   menus or screens change, including hides and deletes anon can't see
// - a 1-minute refresh covers a dropped connection, and the screen reloads
//   right after it reconnects
// - screens run for weeks, so every 5 minutes it checks for a new deploy and
//   reloads the page to pick up new code
import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const POLL_MS = 60 * 1000
const DEPLOY_CHECK_MS = 5 * 60 * 1000
const BUNDLE_RE = /\/assets\/index-[\w-]+\.js/

export default function useSignageLive(orgId, reload) {
  const reloadRef = useRef(reload)
  reloadRef.current = reload

  useEffect(() => {
    if (!orgId) return
    let debounce = null
    let wasLive = false
    const refresh = () => {
      clearTimeout(debounce)
      debounce = setTimeout(() => reloadRef.current?.(), 800)
    }
    const ch = supabase.channel(`signage-${orgId}`)
      .on('broadcast', { event: 'refresh' }, refresh)
      .subscribe(status => {
        if (status === 'SUBSCRIBED') { if (wasLive) refresh(); wasLive = true }
      })
    const poll = setInterval(() => reloadRef.current?.(), POLL_MS)
    return () => { clearTimeout(debounce); clearInterval(poll); supabase.removeChannel(ch) }
  }, [orgId])

  useEffect(() => {
    const current = [...document.scripts].map(s => s.src.match(BUNDLE_RE)?.[0]).find(Boolean)
    if (!current) return // dev server
    const id = setInterval(async () => {
      try {
        const html = await (await fetch('/', { cache: 'no-store' })).text()
        const latest = html.match(BUNDLE_RE)?.[0]
        if (latest && latest !== current) window.location.reload()
      } catch { /* offline: try again next time */ }
    }, DEPLOY_CHECK_MS)
    return () => clearInterval(id)
  }, [])
}
