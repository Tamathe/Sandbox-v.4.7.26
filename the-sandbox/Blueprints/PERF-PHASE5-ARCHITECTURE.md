# Performance Phase 5 — Architectural Changes

> **Status**: Designed, not yet implemented
> **Risk**: MEDIUM–HIGH (new API surfaces, data flow changes, experimental APIs)
> **Prerequisite**: Phases 1–4 complete (bundle splitting, cache headers, indexes, dynamic imports)
> **Estimated bundle impact**: 300–500 KB additional savings + 40–60% fewer network requests on key pages

---

## 1. API Bundle Endpoints

### Problem
High-traffic pages make 5–7 independent API calls on mount, creating network waterfalls and redundant auth/DB connection overhead. Each call independently opens a Prisma connection, parses the JWT/demo header, and returns JSON.

### Affected Pages

| Page | Current Calls | Proposed Bundle | Savings |
|------|--------------|-----------------|---------|
| **Faculty Homepage** | 7 calls: `/api/briefing`, `/api/dashboard`, `/api/workshop/command-center/engagement-trend`, `/api/workshop/command-center/concept-gaps`, `/api/faculty/homepage-data`, `/api/faculty/day-summary`, `/api/faculty/overnight-tasks` | `GET /api/faculty/home-bundle` | 7→1 request |
| **Hub/Explore** | 5 calls: `/api/tools?toolType=PORTFOLIO`, `/api/departments/me`, `/api/departments?featured`, `/api/hub/personalized`, `/api/hub/recommendations` | `GET /api/hub/explore-bundle` | 5→1 request |
| **Student Homepage** | 6 calls across 2 useEffects: `/api/courses/enrollments`, `/api/tools?draft`, `/api/uknow/articles?Events`, `/api/analytics/student/sr-nudge`, `/api/community-pulse`, `/api/assistant/email/insights` | `GET /api/student/home-bundle` | 6→1 request |
| **Build Page** | 3 calls: `/api/tools?draft`, `/api/bounties?OPEN`, `/api/courses` | `GET /api/build/bundle` | 3→1 request |

### Implementation Pattern

```typescript
// app/api/faculty/home-bundle/route.ts
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const [briefing, dashboard, engagement, concepts, homepage, daySummary, tasks] =
    await Promise.allSettled([
      getBriefing(auth.user.id),
      getDashboard(auth.user.id),
      getEngagementTrend(auth.user.id),
      getConceptGaps(auth.user.id),
      getFacultyHomepageData(auth.user.id),
      getDaySummary(auth.user.id),
      getOvernightTasks(auth.user.id),
    ])

  return NextResponse.json({
    briefing: briefing.status === 'fulfilled' ? briefing.value : null,
    dashboard: dashboard.status === 'fulfilled' ? dashboard.value : null,
    engagement: engagement.status === 'fulfilled' ? engagement.value : null,
    concepts: concepts.status === 'fulfilled' ? concepts.value : null,
    homepage: homepage.status === 'fulfilled' ? homepage.value : null,
    daySummary: daySummary.status === 'fulfilled' ? daySummary.value : null,
    tasks: tasks.status === 'fulfilled' ? tasks.value : null,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
```

### Client Hook Pattern

```typescript
// app/hooks/useFacultyHomeBundle.ts
export function useFacultyHomeBundle() {
  const { currentUser } = useAuth()
  const [data, setData] = useState<FacultyHomeBundle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    apiFetch(currentUser.email, '/api/faculty/home-bundle', { signal: controller.signal })
      .then(setData)
      .catch(err => { if (err.name !== 'AbortError') console.error(err) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [currentUser.email])

  return { data, loading }
}
```

### Risks
- **Blast radius**: If the bundle endpoint fails, entire homepage is blank (vs. one section failing). Mitigate with `Promise.allSettled` + per-section error states.
- **Cache granularity**: One 60s cache for all data vs. per-section cache tiers. Some data (briefing) changes faster than others (concept gaps).
- **Migration**: Must update both the API route AND the consuming hook/component simultaneously. Cannot partially deploy.
- **Testing**: Need to verify each section's data shape matches what the component expects — 7 different data contracts in one response.

### Migration Strategy
1. Create the bundle endpoint alongside existing individual endpoints
2. Create `useFacultyHomeBundle` hook that returns sectioned data
3. Update `FacultyHomepage.tsx` to use the new hook
4. Verify all sections render correctly
5. Delete individual fetch calls from the component
6. Keep individual API routes alive (other consumers may use them)

---

## 2. Server Component Conversion

### Problem
Most pages are `'use client'` components that fetch all data client-side. This means:
- Empty shell rendered → JS downloads → hydrates → fetch starts → data renders (4-step waterfall)
- Server could fetch data during SSR and stream HTML with data already embedded (2-step)

### Candidates (sorted by impact)

| Page | Why It's Client | What Prevents Server | Effort |
|------|----------------|---------------------|--------|
| `/hub` | `useAuth()`, `useState` for tabs | Auth header needed for personalized data | HIGH |
| `/courses` | `useAuth()`, 15+ `useState`, tabs | Heavy interaction (tab switching, modals, search) | VERY HIGH |
| `/uknow` | `useAuth()`, search, tabs | Search/filter state | MEDIUM |
| `/explore-majors` | `useAuth()`, compare state | What-if comparison state | MEDIUM |
| `/contribute` | `useAuth()`, tabs | Tab state + form interactions | MEDIUM |
| `/campus-map` | Leaflet (requires `window`) | Map library needs DOM | NOT POSSIBLE |

### Hybrid Pattern (Recommended)

Instead of converting entire pages, extract the data-fetching into a server component wrapper:

```typescript
// app/hub/page.tsx (server component — NO 'use client')
import { cookies } from 'next/headers'
import HubClient from './HubClient'

export default async function HubPage() {
  // Server-side data fetch — no client waterfall
  const session = cookies().get('sandbox-session')
  const email = session ? decodeJWT(session.value).email : null

  const [tools, departments, recommendations] = await Promise.all([
    getPublishedTools(),
    getDepartments({ featured: true }),
    email ? getRecommendations(email) : [],
  ])

  return <HubClient
    initialTools={tools}
    initialDepartments={departments}
    initialRecommendations={recommendations}
  />
}

// app/hub/HubClient.tsx ('use client' — handles interactivity)
'use client'
export default function HubClient({ initialTools, initialDepartments, initialRecommendations }) {
  const [tools, setTools] = useState(initialTools)
  // ... all the interactive state, search, filtering
}
```

### Risks
- **Auth complexity**: Server components can't use `useAuth()`. Must read the `sandbox-session` cookie directly via `cookies()` and decode the JWT. Demo mode users (no cookie) need fallback via the `x-demo-user-email` header — but server components don't have request headers access in the same way.
- **Hydration mismatches**: If server renders with one user's data but client hydrates with another (e.g., demo user switch), React will throw hydration errors.
- **Streaming**: Server components stream HTML, which conflicts with the current pattern of showing loading skeletons then filling in data.
- **Testing**: Every page that converts needs testing with: real auth, demo auth, unauthenticated, and admin "view-as" mode.

### Recommendation
**Defer this to a dedicated sprint.** The auth system complexity (dual-mode: JWT cookie + demo header) makes server component conversion non-trivial. The bundle endpoints (Section 1) provide most of the same performance benefit with lower risk.

---

## 3. `unstable_cache` for Hot Database Queries

### Problem
Several database queries are called many times per second across different API routes but return data that changes infrequently. Without caching, every request hits Neon PostgreSQL over the network.

### Candidates

| Query | Called By | Change Frequency | Cache TTL |
|-------|----------|-----------------|-----------|
| `prisma.course.findMany()` (list) | `/api/courses`, faculty homepage, student homepage, build page, composer dropdowns | Hourly | 300s |
| `prisma.degreeProgram.findMany()` | `/api/registrar/programs`, explore-majors, what-if audit | Weekly | 3600s |
| `prisma.campusBuilding.findMany()` | `/api/campus-map/buildings`, Sandy campus tools | Monthly | 3600s |
| `prisma.department.findMany()` | `/api/departments`, hub page, storefronts | Daily | 600s |
| `prisma.catalogCourse.findMany()` | `/api/catalog/courses`, prerequisite tree | Semesterly | 3600s |
| `prisma.competencyFramework.findMany()` | `/api/competency/frameworks` | Rarely | 3600s |
| `getUserByEmail()` | Every authenticated API route (60s LRU already) | Per-session | Already cached |

### Implementation Pattern

```typescript
import { unstable_cache } from 'next/cache'

// app/lib/cached-queries.ts
export const getCachedPrograms = unstable_cache(
  async () => {
    return prisma.degreeProgram.findMany({
      include: { requirements: { include: { courses: true } } },
      orderBy: [{ college: 'asc' }, { code: 'asc' }],
    })
  },
  ['degree-programs'],
  { revalidate: 3600, tags: ['degree-programs'] }
)

export const getCachedBuildings = unstable_cache(
  async () => {
    return prisma.campusBuilding.findMany({ orderBy: { name: 'asc' } })
  },
  ['campus-buildings'],
  { revalidate: 3600, tags: ['campus-buildings'] }
)

export const getCachedDepartments = unstable_cache(
  async (featured?: boolean) => {
    return getDepartmentList({ featured })
  },
  ['departments'],
  { revalidate: 600, tags: ['departments'] }
)
```

Then in mutation routes, invalidate:
```typescript
import { revalidateTag } from 'next/cache'

// In POST /api/registrar/programs:
revalidateTag('degree-programs')
```

### Risks
- **`unstable_cache` is experimental** — API may change in future Next.js versions. Name literally says "unstable."
- **Stale data**: TTL-based caching means users may see data up to N seconds old. Acceptable for programs/buildings, risky for courses (new course created but not visible for 5 min).
- **Memory pressure**: Cached data lives in Node.js memory (or Vercel's edge cache). Large result sets (all courses with includes) could consume significant memory.
- **Tag invalidation gaps**: Must ensure every mutation path calls `revalidateTag()`. Missing one = stale data that never refreshes until TTL expires.
- **Prisma adapter compatibility**: `unstable_cache` stores serialized JSON. Prisma returns objects with `Date` instances — these serialize to strings and won't round-trip as `Date` objects. Consumers must handle string dates.

### Recommendation
Start with the safest candidates only:
1. `degree-programs` (changes weekly, semesterly updates are planned)
2. `campus-buildings` (changes monthly at most)
3. `competency-frameworks` (rarely changes)

Skip `courses` and `departments` — they change frequently enough that stale data would be user-visible.

---

## 4. Bundle Analysis & Code Splitting Audit

### Problem
Without measuring, we're guessing which optimizations matter most. The codebase has ~314 Prisma models, ~550 lib files, and ~600 components — some of which may be dead code inflating the bundle.

### Proposed Process

```bash
# 1. Install analyzer
npm install --save-dev @next/bundle-analyzer

# 2. Add to next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
module.exports = withBundleAnalyzer(nextConfig)

# 3. Run analysis
ANALYZE=true npm run build

# 4. Review the generated report
# Opens browser with interactive treemap of all bundles
```

### What to Look For
- **Largest chunks**: Which pages/components dominate the bundle?
- **Duplicate modules**: Same library imported multiple times (recharts, date-fns, lucide-react)
- **Dead code**: Components imported but never rendered (tree-shaking failures)
- **Node.js modules in client bundle**: Server-only code accidentally included client-side (Prisma, Anthropic SDK)

### Risks
- **Build OOM**: The project already hits memory limits during build. Bundle analysis adds overhead. Use `NODE_OPTIONS="--max-old-space-size=8192"`.
- **No behavioral risk**: Analysis is read-only — doesn't change code.

### Recommendation
Run this as a diagnostic before committing to more dynamic import work. The treemap will show whether our Phase 1–4 optimizations actually reduced the critical chunks, and highlight any remaining low-hanging fruit.

---

## 5. Request Deduplication Layer

### Problem
Multiple components on the same page independently fetch the same data. Example: `FacultyHomepage` fetched `/api/courses` 3 times (fixed to 2 in Phase 4, but the pattern exists elsewhere).

### Proposed Solution: Shared SWR-like Hook

```typescript
// app/hooks/useSharedFetch.ts
const cache = new Map<string, { data: unknown; timestamp: number; promise?: Promise<unknown> }>()
const DEDUP_WINDOW_MS = 5000 // Deduplicate identical requests within 5s

export function useSharedFetch<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(() => {
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < DEDUP_WINDOW_MS) {
      return cached.data as T
    }
    return null
  })
  const [loading, setLoading] = useState(data === null)

  useEffect(() => {
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < DEDUP_WINDOW_MS) {
      setData(cached.data as T)
      setLoading(false)
      return
    }

    // If another component is already fetching this key, reuse its promise
    if (cached?.promise) {
      cached.promise.then(result => {
        setData(result as T)
        setLoading(false)
      })
      return
    }

    const promise = fetcher()
    cache.set(key, { data: null, timestamp: Date.now(), promise })

    promise.then(result => {
      cache.set(key, { data: result, timestamp: Date.now() })
      setData(result as T)
    }).finally(() => setLoading(false))

    return () => { /* cleanup */ }
  }, [key, fetcher])

  return { data, loading }
}
```

### Risks
- **Stale-while-revalidate semantics**: Multiple components sharing cached data may show stale state after a mutation. Need to expose a `mutate(key)` function.
- **Memory leaks**: Cache grows unbounded. Need TTL-based eviction.
- **Complexity**: This is essentially reimplementing SWR/React Query. Consider just adopting one of those libraries instead.

### Recommendation
**Do NOT build a custom solution.** If request deduplication becomes important enough, adopt `swr` (9KB gzipped) or `@tanstack/react-query` (13KB). Both provide:
- Automatic deduplication of concurrent requests
- Stale-while-revalidate caching
- Optimistic mutations
- DevTools for debugging

This is a dependency decision, not a code change — evaluate separately.

---

## Implementation Priority

| # | Change | Risk | Impact | Status |
|---|--------|------|--------|--------|
| 1 | API Bundle Endpoints | MEDIUM | HIGH | **DONE** (2026-03-30) — 4 bundles: faculty, hub, student, build. Hooks ready. |
| 2 | Bundle Analysis | NONE | DIAGNOSTIC | **DONE** (2026-03-30) — `@next/bundle-analyzer` installed, `ANALYZE=true npm run build` ready. |
| 3 | `unstable_cache` (safe queries only) | LOW | MEDIUM | **DONE** (2026-03-30) — buildings, programs, frameworks cached. revalidateTag on program POST. |
| 4 | Server Component Conversion | HIGH | MEDIUM | **Defer** — auth complexity too high for now |
| 5 | Request Deduplication | MEDIUM | LOW | **Skip** — adopt SWR/React Query if needed |

---

## Dependencies & Prerequisites

- **Bundle endpoints** require: extracting service functions from existing route handlers into importable lib functions (some already are, some have inline logic)
- **Server components** require: solving the dual auth problem (JWT cookie + demo header) at the server component level
- **`unstable_cache`** requires: Next.js 14+ (already on 16.x ✓), identifying all mutation paths that touch cached models
- **Bundle analysis** requires: `@next/bundle-analyzer` (new dev dependency), 8GB+ Node heap for build

---

*Generated 2026-03-30. Items 1-3 implemented 2026-03-30. Components still use individual endpoints — swap to bundle hooks (`useFacultyHomeBundle`, `useHubBundle`, `useStudentHomeBundle`, `useBuildBundle`) when ready to migrate. Run `ANALYZE=true npm run build` to generate bundle treemap.*
