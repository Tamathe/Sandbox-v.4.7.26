import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { LRUCache } from 'lru-cache'
import { SESSION_COOKIE_NAME, LEGACY_SESSION_COOKIE_NAME, DEMO_COOKIE_NAME, LEGACY_DEMO_COOKIE_NAME } from './app/lib/auth-jwt'

// Cache verified JWT tokens → email for 60s to avoid re-verifying on every request
const jwtCache = new LRUCache<string, string>({ max: 500, ttl: 60_000 })

// Allowed demo mode emails — only these 4 preset accounts can be used in demo mode
const DEMO_ALLOWED_EMAILS = new Set([
  'heath.price@uky.edu',
  'katie.thompson@uky.edu',
  'tiana.the.student@uky.edu',
  'morgan.rivera@uky.edu',
])

// ── Public API routes (no auth required) ─────────────────────────────────────
// Cron routes authenticate via CRON_SECRET Bearer token instead.
// Auth routes must be public so unauthenticated users can sign up / log in.
const PUBLIC_PREFIXES = [
  '/api/cron/',                          // all cron jobs
  '/api/registrar/cron/',                // registrar cron jobs
  '/api/compliance/audit-export',        // cron-authed compliance export
  '/api/brackets/digest',               // cron-authed bracket digest
  '/api/book-recommender/digest',       // cron-authed book digest
  '/api/audio/process-job',             // cron-authed audio processing
  '/api/auth/signup',                    // public: user registration
  '/api/auth/login',                     // public: user login
  '/api/auth/logout',                    // public: user logout
  '/api/auth/me',                        // public: session bootstrap
]


function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function getJwtSecret(): Uint8Array | null {
  const secret = process.env.AUTH_JWT_SECRET
  if (!secret) return null
  return new TextEncoder().encode(secret)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip non-API routes — pages don't need auth middleware
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Allow public / cron-authed routes through (they handle their own auth)
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // ── Cookie-based auth: verify JWT and inject x-demo-user-email header ──
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value || request.cookies.get(LEGACY_SESSION_COOKIE_NAME)?.value
  if (sessionToken) {
    // Check LRU cache before running full JWT verification
    const cachedEmail = jwtCache.get(sessionToken)
    if (cachedEmail) {
      const headers = new Headers(request.headers)
      headers.set('x-demo-user-email', cachedEmail)
      return NextResponse.next({ request: { headers } })
    }

    const secret = getJwtSecret()
    if (secret) {
      try {
        const { payload } = await jwtVerify(sessionToken, secret)
        const email = payload.email as string | undefined
        if (email) {
          jwtCache.set(sessionToken, email)
          const headers = new Headers(request.headers)
          headers.set('x-demo-user-email', email)
          return NextResponse.next({ request: { headers } })
        }
      } catch {
        // Invalid/expired token — fall through to header check
      }
    }
  }

  // ── Demo mode: accept x-demo-user-email header / cookie ──
  // Check both NEXT_PUBLIC_ (client-side) and DEMO_MODE (server/edge) env vars
  const isDemoMode =
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
    process.env.DEMO_MODE === 'true'

  if (isDemoMode) {
    const email = request.headers.get('x-demo-user-email')
    if (email && DEMO_ALLOWED_EMAILS.has(email.toLowerCase())) {
      return NextResponse.next()
    }

    const demoCookieEmail = request.cookies.get(DEMO_COOKIE_NAME)?.value || request.cookies.get(LEGACY_DEMO_COOKIE_NAME)?.value
    if (demoCookieEmail) {
      const decoded = decodeURIComponent(demoCookieEmail)
      if (DEMO_ALLOWED_EMAILS.has(decoded.toLowerCase())) {
        const headers = new Headers(request.headers)
        headers.set('x-demo-user-email', decoded)
        return NextResponse.next({ request: { headers } })
      }
    }
  }

  return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 },
  )
}

// Only run middleware on API routes
export const config = {
  matcher: '/api/:path*',
}
