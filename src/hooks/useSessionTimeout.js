import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'

const IDLE_TIMEOUT_MS   = 30 * 60 * 1000  // 30 minutes — HIPAA auto-logoff
const WARNING_BEFORE_MS =  2 * 60 * 1000  // Warn 2 minutes before timeout

const ACTIVITY_EVENTS = [
  'mousedown', 'mousemove', 'keypress', 'keydown',
  'scroll', 'touchstart', 'click', 'focus'
]

export function useSessionTimeout({ enabled = true, onTimeout }) {
  const idleTimerRef    = useRef(null)
  const warnTimerRef    = useRef(null)
  const countdownRef    = useRef(null)
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft]       = useState(WARNING_BEFORE_MS / 1000)

  const clearAllTimers = useCallback(() => {
    clearTimeout(idleTimerRef.current)
    clearTimeout(warnTimerRef.current)
    clearInterval(countdownRef.current)
  }, [])

  const doLogout = useCallback(async () => {
    clearAllTimers()
    setShowWarning(false)
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'AUTO_LOGOFF',
        p_notes:  'Session timed out after 30 minutes of inactivity'
      })
    } catch (_) { /* non-blocking — don't let audit failure block sign-out */ }
    await supabase.auth.signOut()
    if (onTimeout) onTimeout()
  }, [clearAllTimers, onTimeout])

  const startCountdown = useCallback(() => {
    let secs = Math.floor(WARNING_BEFORE_MS / 1000)
    setTimeLeft(secs)
    countdownRef.current = setInterval(() => {
      secs -= 1
      setTimeLeft(secs)
      if (secs <= 0) clearInterval(countdownRef.current)
    }, 1000)
  }, [])

  const resetTimers = useCallback(() => {
    if (!enabled) return
    clearAllTimers()
    setShowWarning(false)

    warnTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      startCountdown()
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS)

    idleTimerRef.current = setTimeout(doLogout, IDLE_TIMEOUT_MS)
  }, [enabled, clearAllTimers, doLogout, startCountdown])

  // "Stay logged in" button handler
  const extendSession = useCallback(() => {
    setShowWarning(false)
    clearInterval(countdownRef.current)
    resetTimers()
  }, [resetTimers])

  useEffect(() => {
    if (!enabled) return

    const handleActivity = () => {
      // Once the warning is showing, only the modal buttons control what happens
      if (showWarning) return
      resetTimers()
    }

    ACTIVITY_EVENTS.forEach(evt =>
      window.addEventListener(evt, handleActivity, { passive: true })
    )
    resetTimers() // kick off on mount

    return () => {
      ACTIVITY_EVENTS.forEach(evt =>
        window.removeEventListener(evt, handleActivity)
      )
      clearAllTimers()
    }
  }, [enabled, showWarning, resetTimers, clearAllTimers])

  return { showWarning, timeLeft, extendSession, doLogout }
}
