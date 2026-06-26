// ElderLoop Service Worker
// Handles Web Push notifications and PWA caching

const CACHE_NAME = 'elderloop-v1'
const OFFLINE_URL = '/offline.html'

// ── Install: cache app shell ──────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(['/'])
    }).catch(() => {}) // don't fail install if cache fails
  )
  self.skipWaiting()
})

// ── Activate: clean up old caches ────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch: network first, cache fallback ─────────────────────
self.addEventListener('fetch', (event) => {
  // Only handle GET requests to same origin
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith(self.location.origin)) return

  // Skip Supabase API calls
  if (event.request.url.includes('supabase.co')) return

  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request)
        .then(cached => cached || caches.match('/'))
      )
  )
})

// ── Push: receive and display notification ────────────────────
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data?.json() || {}
  } catch (_) {
    data = { title: 'ElderLoop', body: event.data?.text() || '' }
  }

  const title   = data.title   || 'ElderLoop'
  const options = {
    body:    data.body    || '',
    icon:    '/icon-192.png',
    badge:   '/icon-96.png',
    tag:     data.tag     || 'elderloop',
    renotify: true,
    requireInteraction: false,
    silent: false,
    data: {
      url: data.url || '/app/dashboard',
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open',    title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss'  },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// ── Notification click: navigate to relevant page ─────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/app/dashboard'
  const fullUrl = new URL(url, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // If app already open — focus and navigate
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.focus()
            if ('navigate' in client) client.navigate(fullUrl)
            return
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) return clients.openWindow(fullUrl)
      })
  )
})

// ── Push subscription change ──────────────────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
  // Re-subscribe when subscription expires
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then(subscription => {
        // Post new subscription back to the app to save in DB
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'PUSH_SUBSCRIPTION_CHANGED',
              subscription: JSON.parse(JSON.stringify(subscription)),
            })
          })
        })
      })
  )
})
