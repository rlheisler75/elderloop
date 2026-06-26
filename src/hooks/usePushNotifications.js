import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

export function usePushNotifications(profileId) {
  const [permission, setPermission] = useState(Notification?.permission || 'default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [supported,  setSupported]  = useState(false)

  useEffect(() => {
    const ok = 'serviceWorker' in navigator &&
               'PushManager'   in window      &&
               'Notification'  in window      &&
               !!VAPID_PUBLIC_KEY
    setSupported(ok)
    if (ok) setPermission(Notification.permission)
  }, [])

  // Check if already subscribed in DB
  useEffect(() => {
    if (!profileId || !supported) return
    supabase.from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .then(({ count }) => setSubscribed((count || 0) > 0))
  }, [profileId, supported])

  const subscribe = useCallback(async () => {
    if (!supported || !profileId) return false
    setLoading(true)

    try {
      // 1. Request permission
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') { setLoading(false); return false }

      // 2. Get service worker registration
      const reg = await navigator.serviceWorker.ready

      // 3. Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const { endpoint, keys } = sub.toJSON()

      // 4. Save to DB
      const { error } = await supabase.from('push_subscriptions').upsert({
        profile_id:      profileId,
        organization_id: (await supabase.from('profiles').select('organization_id').eq('id', profileId).single()).data?.organization_id,
        endpoint,
        p256dh:          keys.p256dh,
        auth:            keys.auth,
        user_agent:      navigator.userAgent.substring(0, 200),
        updated_at:      new Date().toISOString(),
      }, { onConflict: 'profile_id,endpoint' })

      if (error) { console.error('Failed to save push subscription:', error); setLoading(false); return false }

      setSubscribed(true)
      setLoading(false)
      return true
    } catch (err) {
      console.error('Push subscription error:', err)
      setLoading(false)
      return false
    }
  }, [supported, profileId])

  const unsubscribe = useCallback(async () => {
    if (!profileId) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await supabase.from('push_subscriptions')
          .delete()
          .eq('profile_id', profileId)
          .eq('endpoint', sub.endpoint)
      }
      setSubscribed(false)
    } catch (err) {
      console.error('Unsubscribe error:', err)
    }
  }, [profileId])

  return { permission, subscribed, loading, supported, subscribe, unsubscribe }
}
