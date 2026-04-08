# Blueprint: API Error Handling Migration

> **Sprint Scope:** Migrate 200+ API routes from manual try/catch to `withErrorHandling`, collapse identical preflight routes into dynamic segments, and extract shared helpers.
> **Estimated Size:** Large (3-4 prompts, ~60 min)
> **Origin:** Duplication Audit, 2026-03-28

---

## Context

`withErrorHandling` exists in `app/lib/api-utils.ts` and is used correctly in a few routes (e.g., `app/api/tasks/route.ts`). But 342 route files use hand-rolled `try/catch` with identical `console.error` + `NextResponse.json({ error }, { status: 500 })` boilerplate. Additionally, 12 preflight routes and 15 admin CRUD pairs contain near-identical code.

### Current Pattern (repeated 200+ times)

```typescript
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRequestUser(req)
    if ('response' in auth) return auth.response
    // ... business logic ...
    return NextResponse.json({ data })
  } catch (err) {
    console.error('GET /api/something error:', err)
    return NextResponse.json({ error: 'Failed to fetch something' }, { status: 500 })
  }
}
```

### Target Pattern

```typescript
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if ('response' in auth) return auth.response
  // ... business logic ...
  return NextResponse.json({ data })
})
```

---

## Implementation

### Prompt 1: Verify and enhance `withErrorHandling`

1. Read `app/lib/api-utils.ts` to confirm `withErrorHandling` signature and behavior
2. Ensure it:
   - Catches all errors
   - Logs with `console.error` (including the route path if possible)
   - Returns `NextResponse.json({ error: 'Internal server error' }, { status: 500 })`
   - Does NOT leak stack traces to the client
3. If it needs enhancement (e.g., adding route-path logging), update it now

### Prompt 2: Migrate core routes (highest-traffic first)

Migrate these categories in order:
1. **Tool routes** — `app/api/tools/**` (most user-facing)
2. **Course routes** — `app/api/courses/**`
3. **Notes/Tasks routes** — `app/api/notes/**`, `app/api/tasks/**`
4. **User routes** — `app/api/users/**`, `app/api/onboarding/**`
5. **Messages routes** — `app/api/messages/**`

For each route:
- Replace `export async function METHOD` + try/catch with `export const METHOD = withErrorHandling(async ...)`
- Remove the manual `console.error` and generic catch block
- Keep all business logic unchanged
- Run `npx tsc --noEmit` after each batch

### Prompt 3: Migrate admin/feature routes

1. **Admin compliance routes** (~30 files, 15 CRUD pairs)
   - Also fix the `request.json()` vs `parseRequestBody` inconsistency — standardize all to `parseRequestBody`
2. **Sandy/Concierge routes**
3. **Analytics routes**
4. **Suite routes** (wellness-hub, write-room, meeting-machine, data-desk)
5. All remaining routes

### Prompt 4: Collapse identical preflight routes into dynamic segments

**Data Desk (4 → 1):**
- Delete `app/api/data-desk/chart-explainer/preflight/route.ts` and 3 siblings
- Create `app/api/data-desk/[tool]/preflight/route.ts` that calls `getDataDeskPreflight(auth.user.id)`

**Meeting Machine (4 → 1):**
- Delete 4 individual preflight routes
- Create `app/api/meeting-machine/[tool]/preflight/route.ts`

**Wellness Hub (4 → 1):**
- Delete 4 individual preflight routes
- Create `app/api/wellness-hub/[tool]/preflight/route.ts` passing `params.tool` as slug

**Also add:** `requireUserByEmail` helper to `app/lib/server-auth.ts`:
```typescript
export async function requireUserByEmail(email: string, label = 'User') {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) return { response: NextResponse.json({ error: `${label} not found` }, { status: 404 }) }
  return { user }
}
```

---

## Execution Strategy

This is a large mechanical refactor. To avoid merge conflicts with other work:
- Do it in one session
- Work directory-by-directory
- Run `tsc` after each directory
- Do NOT change any business logic — only the error handling wrapper

---

## Risk

**Low-Medium.** The refactor is mechanical but touches 200+ files. Risk mitigations:
- `withErrorHandling` is already proven in the routes that use it
- TypeScript catches any signature mismatches
- No business logic changes
- The main risk is a route that relies on catch-specific behavior (e.g., returning a custom status code from the catch block) — grep for `catch` blocks that return non-500 status codes and handle those individually

## Acceptance Criteria

- [x] `withErrorHandling` is used in all API routes (zero manual try/catch with generic 500 returns)
- [x] All routes with JSON body parsing use `parseRequestBody` (~25 files migrated from inline try/catch)
- [x] Preflight routes collapsed: data-desk (6→1), meeting-machine (4→1), wellness-hub (4→1) via dynamic `[tool]/preflight/route.ts`
- [x] `requireUserByEmail` helper exists in `server-auth.ts`
- [x] TypeScript compiles clean (0 new errors; pre-existing: teach-it-service, sandy/suggestions)
- [x] No business logic changes

**Completed: 2026-03-28**
