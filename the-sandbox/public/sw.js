// ── Global Service Worker — Versioned Cache + Push Notifications ────────────
// Manages versioned caching for course map API data and static assets,
// handles push notification events, and supports cache invalidation messages.

const CACHE_VERSION = 'v2'
const API_CACHE = `course-map-api-${CACHE_VERSION}`
const STATIC_CACHE = `course-map-static-${CACHE_VERSION}`

// API patterns to cache
const COURSE_MAP_API = /\/api\/courses\/[^/]+\/course-map/

// ── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(['/hub']).catch(() => {
        // Some assets may not be available during install
      })
    })
  )
  // Don't skipWaiting by default — let the app control the update flow
})

// ── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== API_CACHE && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// ── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip mutations — never cache POST/PATCH/PUT/DELETE
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
    return
  }

  // Network-first for course map API calls
  if (COURSE_MAP_API.test(url.pathname) && request.method === 'GET') {
    event.respondWith(networkFirst(request, API_CACHE))
    return
  }

  // Cache-first for static assets (JS, CSS, images)
  if (/\.(js|css|png|jpg|svg|woff2?)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Everything else: default browser behavior
})

// ── Fetch Strategies ─────────────────────────────────────────────────────────

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }
    return new Response(
      JSON.stringify({ offline: true, error: 'You are offline and no cached data is available.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

// ── Push Notification Handler ────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Course Map Update', body: event.data.text() }
  }

  const title = payload.title || 'Course Map Update'
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: payload.tag || 'course-map-notification',
    data: {
      url: payload.url || '/hub',
      courseId: payload.courseId,
      type: payload.type,
    },
    actions: payload.actions || [],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Notification Click Handler ───────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/hub'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if one is open
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      // Open new tab
      return self.clients.openWindow(targetUrl)
    })
  )
})

// ── Message Handler ──────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  const { type } = event.data || {}

  if (type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (type === 'INVALIDATE_COURSE_MAP') {
    const { courseId } = event.data
    caches.open(API_CACHE).then((cache) => {
      cache.keys().then((keys) => {
        for (const key of keys) {
          if (key.url.includes(`/courses/${courseId}/course-map`)) {
            cache.delete(key)
          }
        }
      })
    })
  }

  if (type === 'CLEAR_ALL_CACHES') {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key))
    })
  }
})
