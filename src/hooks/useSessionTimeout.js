import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'

// HIPAA auto-logoff: sign out after 30 minutes with no activity.
//
// The idle clock is a saved "last active" time (localStorage, shared by every tab),
// not a countdown in one tab. A countdown alone never fired when the browser was
// closed and reopened, the computer slept, or the browser unloaded the tab: the saved
// sign-in came back with a fresh 30 minutes (Robert, 2026-11-26: "its not timeing
// out the logins"). Now the app checks the saved time when it opens, every second
// while open, and when the computer wakes or the tab comes back.
export const IDLE_TIMEOUT_MS   = 30 * 60 * 1000  // 30 minutes
const WARNING_BEFORE_MS        =  2 * 60 * 1000  // warn 2 minutes before
const STAMP_KEY                = 'elderloop_last_activity'

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'wheel', 'click', 'focus']

let lastWrite = 0         // throttles writes
let memStamp  = 0         // used only when localStorage is unavailable
let storageOk = true
// Every sign-in also calls this (AuthContext, SIGNED_IN / PASSWORD_RECOVERY).
export function markActivity(force = false) {
  const now = Date.now()
  if (!force && now - lastWrite < 5000) return   // at most one write every 5 seconds
  lastWrite = now
  memStamp = now
  try { localStorage.setItem(STAMP_KEY, String(now)) } catch { storageOk = false }
}

// Last activity on this browser. Before anything was saved (the first load after
// this was added), the sign-in time stands in.
function lastActivity(user) {
  let saved = memStamp
  if (storageOk) {
    try { saved = Number(localStorage.getItem(STAMP_KEY)) || 0 } catch { storageOk = false }
  }
  return saved || Date.parse(user?.last_sign_in_at || '') || 0
}
const msLeft = user => IDLE_TIMEOUT_MS - (Date.now() - lastActivity(user))

// Ends only this device's session (the default 'global' also signed the person out on
// their other devices; see signOut() in AuthContext).
export async function endIdleSession(note) {
  try {
    await supabase.rpc('log_audit_event', { p_action: 'AUTO_LOGOFF', p_notes: note })
  } catch (_) { /* non-blocking — don't let audit failure block sign-out */ }
  try {
    localStorage.removeItem('elderloop_super_admin_org')
    sessionStorage.setItem('elderloop_timed_out', '1')   // the login page says why (Login.jsx)
  } catch { /* blocked */ }
  await supabase.auth.signOut({ scope: 'local' })
}

// When the app opens with a saved sign-in that has been idle 30+ minutes, end it
// before anything loads. Runs once per page load (StrictMode runs effects twice).
let startupCheck = null
export function checkIdleAtStartup() {
  startupCheck ??= (async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user || msLeft(session.user) > 0) return false
    await endIdleSession('Signed out when the app was reopened: no activity for 30 minutes')
    return true
  })().catch(e => { console.error('Idle check failed:', e); return false })
  return startupCheck
}

export function useSessionTimeout({ user, onTimeout }) {
  const enabled = !!user
  const [timeLeft, setTimeLeft] = useState(null)   // seconds, while the warning shows
  const userRef       = useRef(user)
  const onTimeoutRef  = useRef(onTimeout)
  const warningRef    = useRef(false)
  const loggingOutRef = useRef(false)
  userRef.current = user
  onTimeoutRef.current = onTimeout

  const doLogout = useCallback(async (note = 'Session timed out after 30 minutes of inactivity') => {
    if (loggingOutRef.current) return
    loggingOutRef.current = true
    warningRef.current = false
    setTimeLeft(null)
    try { await endIdleSession(note) }
    finally { loggingOutRef.current = false }
    onTimeoutRef.current?.()
  }, [])

  const check = useCallback(() => {
    if (!userRef.current || loggingOutRef.current) return
    const left = msLeft(userRef.current)
    if (left <= 0) { doLogout(); return }
    if (left <= WARNING_BEFORE_MS) {
      warningRef.current = true
      setTimeLeft(Math.ceil(left / 1000))
    } else if (warningRef.current) {      // activity in another tab, or "Stay Logged In"
      warningRef.current = false
      setTimeLeft(null)
    }
  }, [doLogout])

  // "Stay Logged In"
  const extendSession = useCallback(() => {
    markActivity(true)
    warningRef.current = false
    setTimeLeft(null)
  }, [])

  useEffect(() => {
    if (!enabled) { warningRef.current = false; setTimeLeft(null); return }

    const onActivity = () => {
      if (warningRef.current || loggingOutRef.current) return   // once warned, only the buttons decide
      // Moving the mouse after the computer wakes must not undo a timeout that already
      // happened: check the clock before counting this as activity.
      if (msLeft(userRef.current) <= WARNING_BEFORE_MS) { check(); return }
      markActivity()
    }
    const onScroll = () => onActivity()
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, onActivity, { passive: true }))
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })  // scrolling inside panels too
    document.addEventListener('visibilitychange', check)
    window.addEventListener('pageshow', check)
    window.addEventListener('storage', check)   // another tab was active, or signed out

    if (msLeft(userRef.current) > WARNING_BEFORE_MS) markActivity()   // signed in / opened just now
    check()
    const tick = setInterval(check, 1000)

    return () => {
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, onActivity))
      window.removeEventListener('scroll', onScroll, { capture: true })
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('pageshow', check)
      window.removeEventListener('storage', check)
      clearInterval(tick)
    }
  }, [enabled, check])

  return {
    showWarning: timeLeft != null,
    timeLeft: timeLeft ?? 0,
    extendSession,
    doLogout: () => doLogout('Signed out from the session-expiring warning'),
  }
}
