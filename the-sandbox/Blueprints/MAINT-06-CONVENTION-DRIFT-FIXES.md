# Blueprint: Convention Drift Fixes

> **Sprint Scope:** Standardize naming verbs, body parsing in 271 routes, data fetching in 322 components, card/font styling across 500+ files, type extraction, and loading/error patterns.
> **Estimated Size:** Extra-Large (10 prompts across 6 phases, ~4-5 hours)
> **Origin:** Convention Drift Audit (`maintenance/05-convention-drift.md`), 2026-03-29

---

## Context

A full convention drift audit (2026-03-29) across 6 categories revealed:

| Category | Finding | Scope |
|----------|---------|-------|
| Naming | 3 `load*` functions should be `get*`; verb semantics undocumented | 3 files |
| File Organization | 23/32 lib features missing barrel files; ~887 inline types; 25 orphan components | ~50 dirs |
| Component Patterns | `loading` vs `isLoading` (361 vs 35); 0 Error Boundaries; 25+ silent `.catch()` | ~400 files |
| Data Fetching | 322 raw `fetch()` vs 149 `apiFetch()`; 0 SWR/React Query; no cache strategy | ~470 files |
| Styling | 1,743 `rounded-lg` cards; 4,280 `font-bold` headings; 159 non-`max-w-6xl` pages | ~700 elements |
| API Routes | 271 `req.json()` (should be `parseRequestBody`); 346 routes with inline prisma | ~620 routes |

This blueprint addresses fixes in dependency order: API routes first (foundation), then data fetching (client layer), then component patterns, styling, naming, and file organization last.

---

## Phase 1: API Route Body Parsing (271 routes)

> **Prompt 1A: Migrate `req.json()` → `parseRequestBody`**
> **Estimated:** ~45 min | **Risk:** Low (mechanical replacement)

### What to fix

271 POST/PUT/PATCH routes use raw `req.json()` instead of the prescribed `parseRequestBody` from `app/lib/server-auth.ts`. This bypasses the 400 response on malformed JSON input.

### Current pattern (violation)

```typescript
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { title, body } = await req.json()          // ← VIOLATION
  const result = await createThing(title, body)
  return NextResponse.json(result)
})
```

### Target pattern

```typescript
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const parsed = await parseRequestBody(req)         // ← FIXED
  if ('error' in parsed) return parsed.error          // ← 400 on bad JSON
  const { title, body } = parsed.data
  const result = await createThing(title, body)
  return NextResponse.json(result)
})
```

### Execution order

Migrate in batches by directory, running `npx tsc --noEmit` after each batch:

1. `app/api/ai-literacy/**` (~20 routes)
2. `app/api/admin/**` (~15 routes)
3. `app/api/analytics/**` (~10 routes)
4. `app/api/courses/**` (~25 routes)
5. `app/api/staff/**` (~20 routes)
6. `app/api/assistant/**` (~15 routes)
7. `app/api/commons/**` (~15 routes)
8. `app/api/messages/**` (~10 routes)
9. All remaining routes (~140)

### Rules

- Add `import { parseRequestBody } from '@/app/lib/server-auth'` if not already present
- Replace `const { ... } = await req.json()` with the two-line `parseRequestBody` + error check
- If the route destructures inline (e.g., `const { x } = await req.json()`), destructure from `parsed.data` instead
- If the route passes the whole body (e.g., `const body = await req.json()`), use `const body = parsed.data`
- Do NOT change business logic, only the parsing layer
- Streaming routes that read the body before creating a `ReadableStream` follow the same pattern

### Verification

```bash
# Should return 0 files after migration
grep -r "req\.json()" app/api --include="*.ts" -l | wc -l

# Type check
npx tsc --noEmit
```

---

## Phase 2: Inline Business Logic Extraction (346 routes)

> **Prompt 2A-2D: Extract prisma calls from routes into lib services**
> **Estimated:** ~90 min (4 sub-prompts) | **Risk:** Medium (logic relocation)

### What to fix

346 route files contain direct `prisma.*` calls. Per CLAUDE.md, routes should be thin: auth → parse → call lib → return. All business logic belongs in `app/lib/` service files.

### Execution strategy

For each batch, the pattern is:
1. Read the route file
2. Identify all `prisma.*` calls and data transformations
3. Extract them into a function in the appropriate `app/lib/{domain}-service.ts`
4. Replace the inline code with a call to the new service function
5. Verify with `npx tsc --noEmit`

### Prompt 2A: Admin routes (~40 files)

Extract inline logic from `app/api/admin/**` routes into:
- `app/lib/admin-service.ts` — for admin dashboard aggregation, announcements CRUD, user management
- `app/lib/admin-control-tower.ts` — already exists, extend if needed
- Existing compliance services in `app/lib/compliance-*-service.ts`

**Example transformation:**

```typescript
// BEFORE: app/api/admin/announcements/route.ts
const announcements = await prisma.adminAnnouncement.findMany({
  orderBy: { createdAt: 'desc' },
  include: { createdBy: { select: { id: true, name: true, email: true } } },
})

// AFTER: app/lib/admin-service.ts
export async function getAnnouncements() {
  return prisma.adminAnnouncement.findMany({
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  })
}

// Route becomes:
const announcements = await getAnnouncements()
```

**Rule:** If a service file already exists for the domain, add functions there. Only create a new service file if none exists for that domain.

### Prompt 2B: Course routes (~60 files)

Extract from `app/api/courses/**` into existing `app/lib/` course services.

### Prompt 2C: Staff routes (~50 files)

Extract from `app/api/staff/**` into existing `app/lib/staff/` services.

### Prompt 2D: All remaining routes (~196 files)

Extract from `app/api/assistant/**`, `app/api/commons/**`, `app/api/analytics/**`, `app/api/messages/**`, and all other directories.

### Verification

```bash
# Count should drop to near-zero (some prisma.* in streaming routes is acceptable)
grep -r "prisma\." app/api --include="*.ts" -l | wc -l

npx tsc --noEmit
```

---

## Phase 3: Data Fetching Standardization (322 components)

> **Prompt 3A: Migrate raw `fetch()` → `apiFetch()` in client components**
> **Estimated:** ~60 min | **Risk:** Low-Medium

### What to fix

322 client components use raw `fetch()` with manual header injection instead of the `apiFetch()` wrapper from `app/lib/api-client.ts`. The wrapper auto-injects `x-demo-user-email`, throws `ApiFetchError` on non-ok responses, and standardizes JSON parsing.

### Current pattern (violation)

```typescript
const headers = { 'x-demo-user-email': currentUser.email }
const res = await fetch('/api/things', { headers })
if (res.ok) {
  const data = await res.json()
  setThings(data)
}
```

### Target pattern

```typescript
import { apiFetch } from '@/app/lib/api-client'

const data = await apiFetch(currentUser.email, '/api/things')
setThings(data)
```

### For POST/PUT/PATCH requests

```typescript
// BEFORE
const res = await fetch('/api/things', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
  body: JSON.stringify({ title }),
})

// AFTER
const data = await apiFetch(currentUser.email, '/api/things', {
  method: 'POST',
  body: JSON.stringify({ title }),
})
```

### Execution order

1. `app/(pages)/ai-literacy/**` (~30 files)
2. `app/admin/**` (~25 files)
3. `app/(main)/**` (~15 files)
4. `app/components/**` (~80 files — hooks and components that fetch)
5. `app/(pages)/**` remaining (~50 files)
6. All remaining pages and components (~120 files)

### Rules

- Add `import { apiFetch } from '@/app/lib/api-client'` if not present
- Remove manual `headers` construction with `x-demo-user-email`
- Remove manual `Content-Type` headers (apiFetch handles this)
- Replace `.ok` checks — `apiFetch` throws on non-ok, so wrap in try/catch
- For fire-and-forget calls (telemetry, analytics pings), keep `.catch(() => {})` — these are intentionally silent
- Do NOT migrate SSR-only fetches in `app/lib/` service files (these are server-to-server)
- `Promise.all` patterns: replace each `fetch()` inside with `apiFetch()`

### Error handling migration

When migrating from `.ok` check to `apiFetch`, add proper error handling:

```typescript
// BEFORE: silent failure
fetch('/api/things', { headers }).then(r => r.ok ? r.json() : null)

// AFTER: explicit error handling
try {
  const data = await apiFetch(currentUser.email, '/api/things')
  setThings(data)
} catch {
  setError('Failed to load things')
}
```

### Verification

```bash
# Count raw fetch in client components (should be near-zero, excluding lib/ and api/)
grep -r "fetch('/api" app/\(pages\) app/\(main\) app/admin app/components --include="*.tsx" -l | wc -l

npx tsc --noEmit
```

---

## Phase 4: Component Pattern Standardization

> **Prompt 4A: Loading state naming + Error Boundaries**
> **Estimated:** ~30 min | **Risk:** Low

### 4A-1: Standardize loading variable naming

Rename `isLoading` → `loading` in the 35 files that use `isLoading`. The codebase uses `loading` in 361 files (10x more common).

```bash
# Find all files to update
grep -r "isLoading" app/components app/\(pages\) app/\(main\) app/admin --include="*.tsx" -l
```

For each file:
- Rename `isLoading` → `loading` (state variable, setter `setIsLoading` → `setLoading`)
- Update all references within the file
- Do NOT rename if `isLoading` comes from an external library prop

### 4A-2: Add Error Boundary

Create a single reusable Error Boundary component and add it to the root layout.

**New file:** `app/components/ErrorBoundary.tsx`

```tsx
'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="size-8 text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-600">Something went wrong</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 text-sm text-[#0033A0] hover:underline"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

**Integration:** Wrap major page sections in `app/layout.tsx` or `ClientProviders.tsx`:

```tsx
<ErrorBoundary>
  {children}
</ErrorBoundary>
```

> **Prompt 4B: Fix silent error swallows**
> **Estimated:** ~20 min | **Risk:** Low

Find and fix ~25 files with `.catch(() => {})` on non-telemetry fetches. Replace with proper error state:

```typescript
// BEFORE
fetch('/api/enrollments', { headers }).catch(() => {})

// AFTER
try {
  const data = await apiFetch(currentUser.email, '/api/enrollments')
  setEnrollments(data)
} catch {
  // Non-critical: log but don't block UI
  console.error('Failed to load enrollments')
}
```

**Intentionally silent fetches** (do NOT change):
- Analytics/telemetry pings (`/api/analytics/track`, `/api/telemetry/*`)
- Background profile updates (`POST /api/ai-literacy/student/profile`)

### Verification

```bash
grep -r "isLoading" app/components app/\(pages\) --include="*.tsx" -l | wc -l  # should be 0
grep -r "\.catch(() => {})" app --include="*.tsx" -l | wc -l  # should be < 5 (only telemetry)
npx tsc --noEmit
```

---

## Phase 5: Styling Standardization

> **Prompt 5A: Card styling — `rounded-2xl shadow-sm`**
> **Estimated:** ~45 min | **Risk:** Low (visual-only)

### What to fix

CLAUDE.md prescribes `border rounded-2xl shadow-sm` for card elements. Audit found:
- 1,743 `rounded-lg` (many are cards that should be `rounded-2xl`)
- 234 `shadow-md` on cards (should be `shadow-sm`)
- 101 `shadow-xl`/`shadow-2xl` on cards

### Rules for what IS and ISN'T a violation

**DO fix** (cards, panels, content containers):
- `<div className="bg-white rounded-lg border p-4">` → `rounded-2xl`
- `<div className="shadow-md rounded-xl">` → `shadow-sm rounded-2xl`
- Any element with `bg-white` + `border` + a rounding class

**DO NOT fix** (these legitimately use smaller radii):
- Input fields (`<input className="rounded-lg">`) — inputs keep `rounded-lg`
- Badges/pills (`<span className="rounded-full">`) — pills stay `rounded-full`
- Buttons (`<button className="rounded-lg">`) — buttons keep `rounded-lg`
- Dropdown menus — keep existing rounding
- Toast notifications — keep existing rounding
- Avatar circles — keep `rounded-full`

### Execution

Process by directory. For each file:
1. Identify card-like containers (bg-white + border + padding + rounding)
2. Replace `rounded-lg` or `rounded-xl` → `rounded-2xl` on cards only
3. Replace `shadow-md` or `shadow-lg` → `shadow-sm` on cards only
4. Leave `hover:shadow-md` transitions — these are intentional interaction feedback

> **Prompt 5B: Font weights on headings**
> **Estimated:** ~30 min | **Risk:** Low (visual-only)

### What to fix

CLAUDE.md says `font-extrabold` for h1/h2. Found 4,280+ `font-bold` and 2,300+ `font-semibold` across files.

### Rules

**DO fix:**
- Page titles (h1): `font-bold` → `font-extrabold`
- Section headings (h2): `font-bold` → `font-extrabold`
- Card titles (`text-lg font-bold`): → `font-extrabold`

**DO NOT fix:**
- Body text labels (`text-sm font-semibold`) — these stay `font-semibold`
- Button text — stays `font-medium` or `font-semibold`
- Navigation items — stays as-is
- `font-medium` on form labels — stays as-is
- Table headers — stays `font-semibold`

### Identification heuristic

Fix `font-bold` → `font-extrabold` when the element ALSO has:
- `text-lg`, `text-xl`, `text-2xl`, `text-3xl` (heading sizes)
- AND is inside a page/section header context

> **Prompt 5C: Page container width**
> **Estimated:** ~15 min | **Risk:** Low

### What to fix

Standardize page containers to `max-w-6xl` (CLAUDE.md standard). 159 violations:
- 91 `max-w-4xl` → `max-w-6xl`
- 36 `max-w-5xl` → `max-w-6xl`
- 32 `max-w-7xl` → `max-w-6xl`

### Rules

- Only fix top-level page containers (`<div className="max-w-Xyl mx-auto ...">`)
- Do NOT fix nested content containers (e.g., modal content, form wrappers)
- Do NOT fix `max-w-2xl` or `max-w-xs` on modals/dialogs — these are intentionally narrow
- `max-w-screen-*` variants are layout constraints, not page containers — skip

### Verification

```bash
# Should show only max-w-6xl for page containers
grep -rn "max-w-[4-7]xl mx-auto" app --include="*.tsx" | grep -v "max-w-6xl" | wc -l  # target: 0
```

---

## Phase 6: Naming & File Organization

> **Prompt 6A: Verb standardization + CLAUDE.md documentation**
> **Estimated:** ~10 min | **Risk:** Trivial

### Rename 3 functions

| File | Old Name | New Name |
|------|----------|----------|
| `app/lib/collab.ts` | `loadCollabSession` | `getCollabSession` |
| `app/lib/playground-templates/index.ts` | `loadTemplate` | `getTemplate` |
| `app/lib/reputation-pulse-snapshot.ts` | `loadReputationPulseSnapshot` | `getReputationPulseSnapshot` |

For each: rename the function, update all call sites (grep for the old name), verify with `npx tsc --noEmit`.

### Add to CLAUDE.md

Add a "Naming Conventions" section after the Route Pattern section:

```markdown
### Naming Conventions

**Function verbs:**
- `get*` — retrieve/query existing data (default for all reads)
- `create*` — persist a new entity to DB (returns the created record)
- `build*` — assemble/compute a value from inputs (no DB write)
- `fetch*` — reserved for `fingerprint/data-fetchers.ts` module only
- `load*` — do not use (use `get*` instead)

**Files:**
- `app/lib/` — kebab-case (`my-service.ts`)
- `app/components/` — PascalCase (`MyComponent.tsx`)
- `app/hooks/` — camelCase with `use` prefix (`useMyHook.ts`)
- Multi-file domains: `{domain}.ts` (types/constants) + `{domain}-service.ts` (functions)

**Component suffixes:**
- `*Card.tsx` — self-contained interactive summary
- `*Panel.tsx` — side/overlay panel with scroll
- `*Modal.tsx` — centered dialog
- `*View.tsx` — read-only layout
- `*Viewer.tsx` — interactive content viewer
```

> **Prompt 6B: Type extraction (high-value targets)**
> **Estimated:** ~30 min | **Risk:** Low

### Create `types.ts` for 4 features

Extract inline types from these service/component files into dedicated type files:

1. **`app/lib/assistant/types.ts`** — extract from `email-service.ts`, `calendar-service.ts`, `rules-service.ts`, `tasks-service.ts`
2. **`app/lib/commons/types.ts`** — extract from `commons-service.ts` and engine files
3. **`app/lib/course-map/types.ts`** — extract from the 32 course-map service files
4. **`app/lib/concierge-types.ts`** — extract from `concierge-service.ts` (~15 types)

**Pattern:**
```typescript
// app/lib/assistant/types.ts
export interface EmailThread { ... }
export interface CalendarEvent { ... }
export type Rule = { ... }

// Then in email-service.ts:
import type { EmailThread } from './types'
```

### Rules

- Only extract types that are exported or used across multiple files in the same feature
- Keep component-local types (used only in that one file) inline
- Re-export types from barrel files if they exist

> **Prompt 6C: Add barrel files (top 6 features)**
> **Estimated:** ~20 min | **Risk:** Low

Create `index.ts` barrel files for the 6 largest features missing them:

1. `app/lib/staff/index.ts`
2. `app/lib/commons/index.ts`
3. `app/lib/assistant/index.ts`
4. `app/lib/registrar/index.ts`
5. `app/lib/course-map/index.ts`
6. `app/lib/fingerprint/index.ts`

**Pattern** (follow existing barrels like `app/lib/debate/index.ts`):
```typescript
export { functionA, functionB } from './service-a'
export { functionC } from './service-b'
export type { TypeA, TypeB } from './types'
```

**Rule:** Do NOT update imports across the codebase yet — barrel files are additive. Consumers can optionally switch to barrel imports in future work.

---

## Execution Order & Dependencies

```
Phase 1 (API body parsing)          ← No dependencies, start here
  ↓
Phase 2 (Business logic extraction) ← Depends on Phase 1 (routes are cleaner)
  ↓
Phase 3 (apiFetch migration)        ← Independent of Phase 2, can parallel
  ↓
Phase 4 (Component patterns)        ← After Phase 3 (error handling changes)
  ↓
Phase 5 (Styling)                   ← Independent, can parallel with Phase 4
  ↓
Phase 6 (Naming & organization)     ← Last (lowest risk, least impact)
```

**Parallelization:** Phases 3+5 can run simultaneously. Phase 6 can run anytime.

---

## Verification Checklist (run after all phases)

```bash
# Phase 1: No raw req.json() in routes
grep -r "req\.json()" app/api --include="*.ts" -l | wc -l  # target: 0

# Phase 2: Minimal prisma in routes (only acceptable: streaming internals)
grep -r "prisma\." app/api --include="*.ts" -l | wc -l  # target: < 20

# Phase 3: No raw fetch('/api in client components
grep -r "fetch('/api" app/\(pages\) app/\(main\) app/admin app/components --include="*.tsx" -l | wc -l  # target: < 10

# Phase 4: No isLoading naming
grep -r "isLoading" app/components app/\(pages\) --include="*.tsx" -l | wc -l  # target: 0

# Phase 5: No rounded-lg on cards (check manually — grep is noisy)
# Phase 6: No load* verbs
grep -rn "function load[A-Z]" app/lib --include="*.ts" | wc -l  # target: 0

# Full build
npm run lint && npx tsc --noEmit && npm run build
```

---

## Risk Notes

- **Phase 2** (logic extraction) is highest-risk — moving code between files can introduce import errors or change behavior. Always run the full type check after each batch.
- **Phase 3** (apiFetch migration) changes error handling semantics — `apiFetch` throws instead of returning a response. Each call site needs try/catch. Test manually after migration.
- **Phase 5** (styling) is visual-only — no functional risk, but do a visual spot-check of 5-10 pages after changes.
- **Streaming routes** are special cases throughout — they use `ReadableStream` callbacks with inner try/catch. Do not change their error handling structure.
