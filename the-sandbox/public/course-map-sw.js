// Course Map Service Worker — Offline-first caching
// Registered only in production or when explicitly enabled

const CACHE_NAME = 'course-map-v1'
const STATIC_CACHE = 'course-map-static-v1'

// Patterns for cache strategies
const COURSE_MAP_API = /\/api\/courses\/[^/]+\/course-map$/
const NOTIFICATION_WEBHOOK_API = /\/api\/courses\/[^/]+\/course-map\/(notifications|webhooks)/
const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

// ── Install ─────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Pre-cache the app shell assets we know about
      return cache.addAll([
        '/hub',
      ]).catch(() => {
        // Some assets may not be available during install — that's ok
      })
    })
  )
  self.skipWaiting()
})

// ── Activate ────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// ── Fetch ───────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Network-only for mutations — never serve cached POST/PATCH/DELETE
  if (MUTATION_METHODS.has(request.method)) {
    return
  }

  // Cache-first for course map API data
  if (COURSE_MAP_API.test(url.pathname) && request.method === 'GET') {
    event.respondWith(cacheFirst(request))
    return
  }

  // Stale-while-revalidate for notifications and webhooks
  if (NOTIFICATION_WEBHOOK_API.test(url.pathname) && request.method === 'GET') {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  // For syllabus-status, also cache-first
  if (/\/api\/courses\/[^/]+\/syllabus-status$/.test(url.pathname) && request.method === 'GET') {
    event.respondWith(cacheFirst(request))
    return
  }

  // Everything else: network-first (standard behavior)
})

// ── Strategies ──────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)

  if (cached) {
    // Refresh cache in background
    refreshCache(request, cache)
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Offline and no cache — return offline JSON
    return new Response(
      JSON.stringify({ offline: true, error: 'You are offline and no cached data is available.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => {
      // Offline — return cached or offline response
      return cached || new Response(
        JSON.stringify({ offline: true, error: 'Offline' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    })

  return cached || networkPromise
}

function refreshCache(request, cache) {
  fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
    })
    .catch(() => {
      // Offline — skip background refresh
    })
}

// ── Message handler for cache invalidation ──────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'INVALIDATE_COURSE_MAP') {
    const { courseId } = event.data
    caches.open(CACHE_NAME).then((cache) => {
      cache.keys().then((keys) => {
        for (const key of keys) {
          if (key.url.includes(`/courses/${courseId}/course-map`)) {
            cache.delete(key)
          }
        }
      })
    })
  }

  if (event.data?.type === 'CLEAR_ALL_CACHES') {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key))
    })
  }
})
