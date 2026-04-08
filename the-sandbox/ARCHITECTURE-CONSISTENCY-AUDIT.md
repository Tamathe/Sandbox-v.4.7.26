# Architecture: Codebase Consistency Audit

**Date:** 2026-03-28
**Scope:** API routes, components, data fetching patterns
**Codebase:** ~942 route files, ~553 components, ~550 lib files

---

## Executive Summary

the platform codebase is large and has grown rapidly. While strong conventions exist in CLAUDE.md, enforcement is uneven. This document catalogs every consistency pattern, identifies deviations, and provides a concrete audit plan with remediation steps.

---

## 1. API Route Consistency

### 1.1 Canonical Pattern (from CLAUDE.md)

Every route file MUST follow: **auth → parse → call lib → return**

```typescript
export async function POST(req: NextRequest) {
  // 1. Auth
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  // 2. Parse + validate
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const validation = validateBody(Schema, parsed.data)
  if ('error' in validation) return validation.error

  // 3. Call lib (NO business logic here)
  const result = await someService(auth.user, validation.value)

  // 4. Return
  return NextResponse.json(result, { status: 201 })
}
```

### 1.2 Inconsistencies Found

| Issue | Description | Affected Routes (Examples) | Severity |
|-------|-------------|---------------------------|----------|
| **Inline business logic** | ~70% of routes have Prisma queries directly in the handler instead of delegating to a service | `/api/courses`, `/api/library`, `/api/notes`, `/api/dashboard`, `/api/admin` | Medium |
| **Mixed error handling** | Two patterns coexist: manual `try/catch` (~70%) vs `withErrorHandling()` wrapper (~30%) | `/api/departments` (wrapper), `/api/courses` (manual) | Medium |
| **Inconsistent auth guards** | Some GET routes skip auth entirely, others require it for the same data sensitivity level | `/api/bounties` GET (no auth), `/api/tools` GET (optional auth) | High |
| **No Zod validation** | Some POST routes skip schema validation entirely | Older routes pre-dating Zod adoption | Medium |
| **Console.error format** | No consistent log prefix convention. Some use `[GET /api/route]`, others use nothing | Mixed across all routes | Low |
| **Status code inconsistency** | Some routes return 200 for creation (should be 201), some return generic 500 for validation errors | Scattered | Low |

### 1.3 Recommended Standards

| Aspect | Standard | Rationale |
|--------|----------|-----------|
| Error handling | `withErrorHandling()` wrapper for ALL routes | Eliminates boilerplate, ensures consistent 500 responses |
| Auth | Every route MUST call an auth guard. Public routes use `requireRequestUser()` with `{ allowAnonymous: true }` | Explicit is better than implicit |
| Validation | Every POST/PUT/PATCH MUST use Zod schema via `validateBody()` | Type safety at the boundary |
| Business logic | Zero Prisma imports in route files. All queries in `app/lib/` services | CLAUDE.md rule; ~70% of routes violate this |
| Logging | `console.error(`[${method} ${path}]`, err)` format everywhere | Grep-friendly |
| Status codes | 200 (read), 201 (created), 204 (deleted), 400 (validation), 401 (unauthed), 403 (forbidden), 404 (not found), 409 (conflict), 429 (rate limited), 500 (server error) | HTTP semantics |

---

## 2. Component Consistency

### 2.1 Canonical Patterns (from CLAUDE.md / PLATFORM-CONSISTENCY-MANIFEST)

- Page header: `<PageHeader title="..." subtitle="..." />`
- Layout: `max-w-6xl mx-auto px-4`
- Cards: `border rounded-2xl shadow-sm`
- Typography: `font-extrabold` for h1/h2
- Icons: lucide-react only, `size-X` shorthand
- Styling: Tailwind v4 utility classes only, no `@apply`

### 2.2 Inconsistencies Found

| Issue | Description | Severity |
|-------|-------------|----------|
| **No shared Button component** | Every component creates its own button styles inline. `rounded-lg px-3 py-1.5 text-sm font-semibold` appears with variations across 100+ files | High |
| **Color hardcoding** | UK Blue `#0033A0` appears as both `bg-[#0033A0]` and `style={{ backgroundColor: '#0033A0' }}`. No CSS variable or shared constant | Medium |
| **Card pattern drift** | Standard is `border rounded-2xl shadow-sm` but some cards use `rounded-xl`, `rounded-lg`, or omit shadow | Medium |
| **Loading state variety** | Three patterns: `<Loader2 className="animate-spin" />`, custom skeleton, plain text "Loading..." | Medium |
| **Prop typing inconsistency** | Mix of: inline interfaces (good), no interfaces (bad for complex components), Prisma types directly in props (coupling) | Low |
| **Server components underused** | Almost every page is `'use client'` even when they could be server components with data fetched server-side | Medium |
| **No shared error boundary** | Each component handles errors differently. No consistent `<ErrorFallback>` component | Medium |

### 2.3 Recommended Standards

| Aspect | Standard | Action |
|--------|----------|--------|
| Buttons | Create `<Button variant="primary\|secondary\|ghost" size="sm\|md\|lg" />` | New shared component |
| Colors | Define UK color palette as Tailwind theme tokens (`uk-blue`, `uk-white`) | `tailwind.config.ts` or CSS variables |
| Loading | Shared `<LoadingSpinner size="sm\|md\|lg" />` component | Wraps Loader2 with consistent sizing |
| Error display | Shared `<ErrorBanner message={string} retry?={fn} />` | Used in all data-fetching components |
| Prop types | Always define an explicit interface. Never use `any`. Avoid passing raw Prisma types — create view models | Convention, enforced by ESLint |

---

## 3. Data Fetching Consistency

### 3.1 Current State

The codebase uses **zero** external data fetching libraries (no SWR, React Query, TanStack Query). All fetching is manual `fetch()` + `useState` + `useEffect`.

### 3.2 Inconsistencies Found

| Issue | Description | Severity |
|-------|-------------|----------|
| **No caching layer** | Every page navigation re-fetches all data from scratch. No client-side cache, no Next.js `revalidate`, no `unstable_cache` | High |
| **Race condition handling** | Some components use `let cancelled = false` cleanup pattern, most don't | High |
| **No shared fetch wrapper** | Raw `fetch()` with `x-demo-user-email` header manually added in every component | High |
| **Inconsistent error handling** | Some components show errors to users, most silently swallow them with `.catch(() => fallback)` | Medium |
| **No loading skeletons** | Most pages show a centered spinner. No content-shaped skeleton loaders | Low |
| **Parallel fetch patterns vary** | `Promise.all()` in some places, `Promise.allSettled()` in others, sequential awaits elsewhere — no guideline for when to use which | Medium |
| **Module-level caching** | One page (`university-systems`) uses module-level variables for caching — unique, undocumented, fragile | Medium |

### 3.3 Recommended Standards

| Aspect | Standard | Rationale |
|--------|----------|-----------|
| Fetch wrapper | Create `app/lib/api-client.ts` with `apiFetch(path, options)` that auto-injects auth headers | Eliminates header duplication, centralizes error handling |
| Cleanup | All `useEffect` fetches MUST use AbortController or `cancelled` flag | Prevent state updates on unmounted components |
| Parallel fetches | `Promise.allSettled()` when partial failure is acceptable (dashboards), `Promise.all()` when all data is required (forms) | Document in CLAUDE.md |
| Error display | Always surface errors to the user. Silent failures hide bugs | UX principle |
| Server components | Evaluate whether pages that only display data can be server components with direct service calls | Performance, eliminates client fetch overhead |

---

## 4. Auth Pattern Consistency

### 4.1 Current Guard Functions

| Guard | Use Case | Notes |
|-------|----------|-------|
| `requireRequestUser(req)` | Any authenticated user | Most common |
| `requireAdminUser(req)` | Admin-only routes | Correct usage |
| `requireEducatorUser(req)` | Educator or Admin | Limited to admin/registrar routes per CLAUDE.md |
| `requireStaffOrAdminUser(req)` | Staff operations | Correct usage |
| `requireCourseOwner(req, courseId)` | Course-scoped actions | Correct usage |
| `requireToolOwner(req, toolId)` | Tool-scoped actions | Correct usage |
| `verifyCronSecret(req)` | Cron jobs | Correct usage |

### 4.2 Issues

| Issue | Description | Severity |
|-------|-------------|----------|
| **Unguarded GET routes** | Some public-facing GET routes have no auth at all (e.g., `/api/bounties` GET) — intentional or oversight? | Needs review |
| **Optional auth inconsistency** | `/api/tools` GET checks header but doesn't require it. No documented pattern for "optional auth" routes | Medium |
| **Cron routes** | All cron routes correctly use `verifyCronSecret()` | OK |
| **Demo header leakage** | The `x-demo-user-email` header is a demo convenience but also the real auth mechanism. In production, middleware injects it from JWT — but routes can't distinguish demo vs real auth | Low (by design) |

---

## 5. Audit Execution Plan

### Phase 1: Foundation (Create shared utilities) — COMPLETE

| Task | Files | Status |
|------|-------|--------|
| Create `app/lib/api-client.ts` — shared fetch wrapper with auth headers | 1 new file | Done |
| Create `<Button>` shared component with variants (primary/secondary/ghost/danger, sm/md/lg) | 1 new file | Done |
| Create `<LoadingSpinner>` shared component (sm/md/lg + optional label) | 1 new file | Done |
| Create `<ErrorBanner>` shared component (AlertTriangle + retry) | 1 new file | Done |
| Add UK color palette to Tailwind v4 `@theme` (uk-blue, uk-blue-dark, uk-blue-light, uk-white, uk-gray) | 1 file edit | Done |

### Phase 2: API Route Audit — COMPLETE

| Action | Count | Details |
|--------|-------|---------|
| Unguarded route fixed (P0 security) | 1 | `studio/audit` — added `requireRequestUser` + `withErrorHandling` |
| Unprotected routes wrapped with `withErrorHandling` | 25 | Admin + analytics routes with zero error handling |
| Manual try/catch migrated to `withErrorHandling` | 7 routes (14 handlers) | dashboard, tools, tools/[id], library, notes, bounties, notifications |
| Prisma extracted to services | 5 routes → 5 new services | dashboard-service, notifications-service, bounties-service, notes-service, announcements-service |

**Remaining:** 338 routes with direct Prisma imports, 519 with manual try/catch, 104 with no error handling.

### Phase 3: Component Audit — COMPLETE

| Action | Files | Items |
|--------|-------|-------|
| UK color tokens (`#0033A0` → `uk-blue`) | 20 | ~654 occurrences |
| LoadingSpinner migration | 10 | 12 spinners |
| ErrorBanner migration | 5 | 5 error blocks |
| Button migration | 8 | 15 buttons |
| Card pattern standardization | skipped | Only 32 occurrences, mostly intentional |

### Phase 4: Data Fetching Audit — COMPLETE

| Action | Files | Details |
|--------|-------|---------|
| `apiFetch()` wrapper migration | 15 | ~57 raw fetch calls replaced |
| AbortController cleanup | 9 | ~14 useEffects with proper cleanup |
| Promise.all/allSettled policy | CLAUDE.md | New "Client-Side Data Fetching" section |
| Server component evaluation | 5 pages | 1 candidate, 1 hybrid, 3 not feasible (documented only) |

### Phase 5: Validation — COMPLETE

- [x] `npx tsc --noEmit` — zero new type errors (pre-existing in my-path-service, survey-intelligence)
- [x] `npm run build` — passes after fixing pre-existing issues (MicroCourse orphan models removed, sandy/suggestions field names fixed)
- [x] ESLint — all errors pre-existing (set-state-in-effect pattern), zero new lint issues
- [x] Bonus: removed 5 orphan Prisma models (MicroCourse, MicroLesson, MicroCourseEnrollment, MicroLessonProgress, MicroCourseRating) + enum that were defined but never used

---

## 6. Automated Enforcement

To prevent future drift, add these checks:

| Check | Tool | Description |
|-------|------|-------------|
| No Prisma in routes | ESLint custom rule or CI grep | Fail if `app/api/` files import from `prisma` |
| Auth guard required | CI grep | Fail if route.ts lacks `require*User` or `verifyCronSecret` |
| No `@apply` | ESLint/stylelint | Already in CLAUDE.md, needs automated enforcement |
| No non-lucide icons | ESLint restricted-imports | Block `heroicons`, `react-icons`, etc. |
| Zod validation | Code review checklist | All POST/PUT/PATCH routes must have schema |

---

## 7. Priority Matrix

| Priority | Category | Issue | Impact |
|----------|----------|-------|--------|
| P0 | API | Unguarded routes (missing auth) | Security |
| P0 | Data | No fetch cleanup (race conditions) | Bugs |
| P1 | API | Business logic in route files (~70%) | Maintainability |
| P1 | Data | No shared fetch wrapper | DRY, consistency |
| P1 | API | Mixed error handling patterns | Consistency |
| P2 | Components | No shared Button/Loading/Error | DRY |
| P2 | Data | No caching strategy | Performance |
| P2 | Components | Color hardcoding | Theming |
| P3 | API | Inconsistent status codes | Correctness |
| P3 | Components | Server component underuse | Performance |
| P3 | API | Inconsistent log formatting | Debugging |

---

## Appendix A: File Counts by Category

| Category | Count | Pattern |
|----------|-------|---------|
| API route files | ~942 | `app/api/**/route.ts` |
| Components | ~553 | `app/components/**/*.tsx` |
| Lib/service files | ~550 | `app/lib/**/*.ts` |
| Custom hooks | ~30 | `app/hooks/*.ts` |
| Cron routes | ~15 | `app/api/cron/**/route.ts` |
| Pages | ~80+ | `app/(main)/**`, `app/(pages)/**` |

## Appendix B: Quick Grep Commands for Auditing

```bash
# Routes with direct Prisma (violation of "thin routes" rule)
grep -rn "from.*prisma" app/api/ --include="*.ts" | grep -v node_modules

# Routes missing any auth guard
grep -rL "require.*User\|verifyCronSecret" app/api/**/route.ts

# Components using non-lucide icons
grep -rn "from.*heroicons\|from.*react-icons" app/ --include="*.tsx"

# Hardcoded UK Blue
grep -rn "#0033A0" app/ --include="*.tsx" | wc -l

# Components missing 'use client' that use hooks
grep -rL "use client" app/components/ --include="*.tsx" | xargs grep -l "useState\|useEffect"

# @apply usage (forbidden in Tailwind v4)
grep -rn "@apply" app/ --include="*.css"

# Routes without withErrorHandling
grep -rL "withErrorHandling" app/api/**/route.ts | wc -l
```
