# Blueprint: Codebase Hardening Sprints — COMPLETE (2026-03-28)

> **Sprint Scope:** Systematic remediation of 60+ bugs, security gaps, crash vectors, and UX issues discovered during full-codebase debug audit (2026-03-28).
> **Depends On:** Nothing — all fixes are against existing code.
> **Estimated Size:** Large (4 sprints, ~45 tasks)
> **Origin:** Full-codebase debug audit using TSC, ESLint, and 3 parallel deep-read agents.
> **Status:** All 4 sprints implemented. `tsc --noEmit` clean. ESLint errors 112→108 (remaining: intentional `require()` + React compiler hints).

---

## Context

A comprehensive audit was run across the entire codebase using:
1. `tsc --noEmit` — **0 type errors** (clean)
2. `eslint` — **46 errors + 31 warnings** across 17 files
3. **API route agent** — read every file under `app/api/`, found 7 auth gaps + 13 crash bugs + 2 XSS vectors
4. **React component agent** — read pages under `app/(platform)/`, found 7 UX bugs including 6 permanent-stuck-spinner patterns
5. **lib/utils agent** — read every file under `lib/`, found 4 security issues + 3 resource leaks + 5 logic bugs

The #1 systemic pattern is **missing error boundaries** — both server-side (no try/catch on 13 API routes) and client-side (6 components stuck forever on fetch failure). The #2 pattern is **unauthenticated API routes** that allow account creation, email sending, and API credit burn.

---

## Sprint 1 — Security Hardening

> **Goal:** Close every unauthenticated route, eliminate XSS vectors, and fix path traversal / shell injection.
> **Size:** ~12 tasks
> **Priority:** P0 — must complete before any public demo or Deloitte presentation.

### 1A. Auth Guards on Unprotected Routes

**Problem:** 7 API routes accept requests with no authentication. Anyone on the internet can create accounts, import courses, send emails, and burn Anthropic API credits.

**Routes to fix:**

| Route | Fix |
|---|---|
| `app/api/onboarding/create-account/route.ts` | Add `requireRequestUser()` or rate-limit + CAPTCHA. Prevent bulk account creation. |
| `app/api/onboarding/import-courses/route.ts` | Add `requireRequestUser()`. Verify the authed user matches the email in the body. |
| `app/api/onboarding/set-intent/route.ts:67` | Replace raw header read with `requireRequestUser()`. |
| `app/api/onboarding/enrich/route.ts` | Add `requireRequestUser()` to prevent unauthenticated API credit burn. |
| `app/api/onboarding/enrich-stream/route.ts` | Same — add `requireRequestUser()`. |
| `app/api/evaluate/schedule-followup/route.ts` | Add `requireRequestUser()`. Validate recipient is not arbitrary. |
| `app/api/evaluate/send-summary/route.ts` | Add `requireRequestUser()`. Validate recipient is not arbitrary. |

**Implementation pattern:**
```typescript
// Before (vulnerable)
export async function POST(req: NextRequest) {
  const { email, ...body } = await req.json()
  // ... proceeds without auth

// After (secured)
export async function POST(req: NextRequest) {
  const user = requireRequestUser(req)
  const body = await req.json()
  // ... user.email is trusted
```

### 1B. XSS in Email Templates

**Problem:** 10+ locations interpolate user-controlled strings directly into HTML email bodies without escaping. An attacker who controls a `name`, `courseCode`, or `narrative` field can inject `<script>` tags or malicious HTML into emails.

**Files to fix:**

| File | Unescaped variables |
|---|---|
| `app/lib/email.ts:42,50,65,86-89` | `name`, `poolName`, `weekRecap`, `title`, `author`, `why` |
| `app/lib/policy-change-email.ts:77-87` | `courseCode`, `courseTitle`, `studentName`, `summary` |
| `app/lib/bracket/bracket-email-service.ts:39,59` | `user.name`, `narrative` (AI-generated) |
| `app/api/evaluate/schedule-followup/route.ts:52-77` | `trimmedName`, `email`, `date`, `trimmedMessage` |
| `app/api/evaluate/send-summary/route.ts:75-151` | `entry.detail`, `entry.action`, wishlist items |

**Implementation pattern:**
```typescript
// Create a shared escapeHtml utility
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Before
html += `<td>${s.name}</td>`

// After
html += `<td>${escapeHtml(s.name)}</td>`
```

### 1C. Path Traversal in Canvas Import

**Problem:** `app/lib/canvas-import-service.ts:420` — `readFile(path)` does `join(extractDir, path)` without validating the resolved path stays within `extractDir`. A malicious `.imscc` file with entries like `../../etc/passwd` can read arbitrary server files.

**Fix:**
```typescript
function readFile(relativePath: string): string {
  const resolved = path.resolve(extractDir, relativePath)
  if (!resolved.startsWith(path.resolve(extractDir) + path.sep)) {
    throw new Error('Path traversal detected')
  }
  return fs.readFileSync(resolved, 'utf-8')
}
```

Apply same fix to `readFiles()` at line 430.

### 1D. Shell Injection in File Cleaner

**Problem:** `app/lib/file-cleaner-service.ts:92-96` — `escapeShellArg` only escapes single quotes but not `\n`, `\r`, `\0`. A filename with a newline + `; rm -rf /` breaks out of the shell command.

**Fix:** Replace custom escape with a proper library (`shell-quote`), or avoid shell entirely by using Node.js `fs.rename()` / `fs.unlink()` directly instead of spawning `mv`.

---

## Sprint 2 — Crash Resilience

> **Goal:** Wrap every API route in try/catch, fix unhandled exceptions in lib services.
> **Size:** ~15 tasks
> **Priority:** P1 — these cause 500 errors in production today.

### 2A. API Route try/catch Wrappers

**Problem:** 13 API routes have `await req.json()` or DB/external calls outside try/catch. A malformed request body, DB connection failure, or Anthropic API rate limit crashes the handler with an unhandled 500.

**Routes to wrap:**

1. `app/api/assignments/[id]/submit/route.ts:93`
2. `app/api/analytics/student/sr-review/route.ts:29`
3. `app/api/bracket/contests/[id]/picks/route.ts:27`
4. `app/api/bracket/contests/[id]/results/route.ts:15`
5. `app/api/bracket/contests/route.ts:30`
6. `app/api/live-rooms/route.ts:10`
7. `app/api/live-rooms/[roomId]/answer/route.ts:10`
8. `app/api/gradebook/[entryId]/route.ts:116`
9. `app/api/gradebook/[entryId]/release/route.ts`
10. `app/api/messages/[conversationId]/send/route.ts`
11. `app/api/users/data-erasure/route.ts:9`
12. `app/api/users/data-export/route.ts:9`
13. `app/api/admin/tools/[id]/review/route.ts`

**Implementation pattern:**
```typescript
// Wrap each handler body
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // ... existing logic
  } catch (err) {
    console.error('[route-name] error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: err instanceof SyntaxError ? 400 : 500 }
    )
  }
}
```

### 2B. Unhandled JSON.parse of AI Output

**File:** `app/lib/concierge-service.ts:1538`

**Problem:** `JSON.parse(saveNoteMatch[1])` parses regex-extracted content from an AI response with no try/catch. AI can produce malformed JSON, crashing the request.

**Fix:** Wrap in try/catch, log the malformed content, and skip the save-note action gracefully.

### 2C. `trimConversation` Breaks Tool-Use Sequences

**File:** `app/lib/agent/agent-loop.ts:152-157`

**Problem:** Assumes user/assistant message pairs, but tool-use conversations have 4-message sequences (`user -> assistant(tool_use) -> user(tool_result) -> assistant`). Removing exactly 2 messages can break the required alternating role pattern, causing Anthropic API errors.

**Fix:** Detect tool-use blocks and remove complete tool-use sequences (all 4 messages) instead of arbitrary pairs.

### 2D. `capToolResult` Produces Invalid JSON

**File:** `app/lib/agent/agent-loop.ts:183-191`

**Problem:** `.slice(0, MAX_TOOL_RESULT_CHARS)` on stringified JSON can cut mid-UTF-8 or mid-escape sequence, producing invalid JSON that Claude cannot parse.

**Fix:** Use a JSON-aware truncation that ends at a valid boundary, or truncate the parsed object's string values before re-stringifying.

### 2E. `search()` Called Before Declaration

**File:** `app/(pages)/university-systems/page.tsx:284`

**Problem:** `useEffect(() => { search() }, [])` references `search` which is declared as an `async function` at line 286. Function declarations are hoisted, so this works at runtime, but the ESLint `react-hooks/immutability` rule flags it because the effect captures a stale reference.

**Fix:** Move `search` declaration above the useEffect, or convert to `useCallback`.

### 2F. `mean()` Divides by Zero

**File:** `app/lib/ab-experiments.ts:335`

**Problem:** `values.reduce((s, v) => s + v, 0) / values.length` returns `NaN` when array is empty. `computeWelchsT` is a public export.

**Fix:** Guard with `if (values.length === 0) return 0` at the top of `mean()`.

---

## Sprint 3 — UX Resilience

> **Goal:** Fix every component that can get permanently stuck, fix stale-state bugs.
> **Size:** ~12 tasks
> **Priority:** P2 — users encounter these during normal usage.

### 3A. Fetch Error Handling (6 Components)

**Problem:** 6 components set a loading/submitting flag to `true` before a fetch, but have no try/catch or `finally` block. If the fetch fails, the component is stuck forever — spinner never stops, buttons stay disabled.

**Components to fix:**

| Component | File | Stuck state |
|---|---|---|
| ClarityCheck | `app/components/ai-literacy/ClarityCheck.tsx:28,59` | `'loading'` phase forever |
| PromptLabChallenge | `app/components/ai-literacy/PromptLabChallenge.tsx:63,85` | `'running'` or `'scoring'` stage |
| PromptLabSandbox | `app/components/ai-literacy/PromptLabSandbox.tsx:25` | `loading = true` forever |
| OutputEvalScenario | `app/components/ai-literacy/OutputEvalScenario.tsx:130` | `submitting = true` forever |
| Output Eval page | `app/(pages)/ai-literacy/output-eval/page.tsx:56` | `loading = true`, no error feedback |
| AI Literacy hub | `app/(pages)/ai-literacy/page.tsx:110` | Profile permanently null, ref prevents retry |

**Implementation pattern:**
```typescript
// Before (broken)
async function handleSubmit() {
  setSubmitting(true)
  const res = await fetch('/api/...')
  const data = await res.json()
  setResult(data)
  setSubmitting(false)
}

// After (resilient)
async function handleSubmit() {
  setSubmitting(true)
  try {
    const res = await fetch('/api/...')
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    setResult(data)
  } catch (err) {
    setError('Something went wrong. Please try again.')
  } finally {
    setSubmitting(false)
  }
}
```

### 3B. NodeDetailDrawer Stale State

**File:** `app/courses/[id]/course-map/page.tsx:7428`

**Problem:** When clicking a different node, `useState(unit?.label)` keeps the previous node's values because React reuses the component instance.

**Fix:** Add `key={selectedNode.id}` to `<NodeDetailDrawer>` to force remount when node changes.

### 3C. SortIcon Defined Inside Render

**File:** `app/advising/page.tsx:92`

**Problem:** `function SortIcon(...)` is defined inside the component body, causing React to treat it as a new component on every render, resetting any internal state.

**Fix:** Move `SortIcon` outside the parent component, pass `sortKey` and `sortAsc` as props.

### 3D. `Date.now()` in Render Body

**File:** `app/admin/components/ComplianceTabExtended.tsx:1475`

**Problem:** `const now = Date.now()` inside a `.map()` during render is impure — can produce different results across renders.

**Fix:** Compute `now` once in a `useMemo` or move the calculation into a memoized derived value.

### 3E. AI Literacy Profile Fetch Retry

**File:** `app/(pages)/ai-literacy/page.tsx:110-111`

**Problem:** `profileFetched.current = true` is set before the fetch completes. If the fetch fails (caught and ignored at line 117), the ref prevents retry forever.

**Fix:** Move `profileFetched.current = true` inside the success path, after the fetch resolves.

---

## Sprint 4 — Performance & Cleanup

> **Goal:** Consolidate database pools, fix memory issues, clean up lint warnings.
> **Size:** ~10 tasks
> **Priority:** P3/P4 — improves reliability under load, reduces noise.

### 4A. Consolidate pg Pools

**Problem:** 7 files each create their own `new Pool()` with `max: 3-5`. That's ~30 connections held open — can exhaust Neon's connection limit (100 free / 300 paid).

**Files:**
- `app/lib/vector-store.ts:58`
- `app/lib/research-rag-service.ts:9`
- `app/lib/staff/policy-service.ts:83`
- `app/lib/uknow-service.ts:81`
- `app/lib/uknow-alert-service.ts:17`
- `app/lib/uknow-insights-service.ts:20`
- `app/lib/staff/survey-vault-service.ts:45`

**Fix:** Create a shared `lib/pg-pool.ts` that exports a single `globalThis`-cached pool with `max: 10`. All services import from this module instead of creating their own.

### 4B. Timeline In-Memory Pagination

**File:** `app/lib/timeline-service.ts:80-135`

**Problem:** `getTimeline()` fetches ALL sessions/events (no LIMIT), merges in JS, sorts, then applies offset/limit. For active students with thousands of sessions, this loads everything into memory on every request.

**Fix:** Push pagination into the SQL queries. Use `UNION ALL` with `ORDER BY` and `LIMIT/OFFSET` at the database level, or use cursor-based pagination.

### 4C. Join Code Normalization Mismatch

**File:** `app/lib/join-code.ts:11`

**Problem:** `normalizeJoinCode` allows `O`, `0`, `I`, `1` but `generateJoinCode` deliberately excludes them (ambiguous characters). A user typing `O` gets it uppercased to `O` which will never match a generated code.

**Fix:** Add a character mapping step: `O -> 0 -> removed`, `I -> 1 -> removed`, or strip the same ambiguous chars in normalization.

### 4D. Agent Loop Cleanup

**Files:** `app/lib/agent/agent-loop.ts:82,101`

| Issue | Fix |
|---|---|
| Unbounded `sessionApprovalManagers` map | Add `finally` cleanup in the stream handler, not just setTimeout |
| O(n) `auditLog.shift()` | Replace with a ring buffer or just remove (meaningless in serverless) |
| Approval timeout race leaves dangling promise | Clean up the pending promise in the timeout branch |

### 4E. ESLint Warning Cleanup

| Category | Count | Fix |
|---|---|---|
| `setState` in useEffect | ~20 | Refactor to derived state or event handlers where appropriate |
| Unused imports | ~25 | Remove unused lucide icon imports |
| `no-explicit-any` | ~15 | Add proper types to university-systems page |
| Missing useEffect deps | ~5 | Add missing dependencies or document intentional omissions |

---

## Sprint Sequencing

```
Sprint 1 (Security)    ████████████  ~12 tasks   ← DO FIRST
Sprint 2 (Crashes)     ███████████████  ~15 tasks
Sprint 3 (UX)          ████████████  ~12 tasks
Sprint 4 (Perf/Clean)  ██████████  ~10 tasks
                       ─────────────────────────
                       Total: ~49 tasks
```

**Sprint 1** is the only hard dependency — it must complete before any public-facing demo. Sprints 2-4 can overlap or reorder based on what users are hitting most.

## Audit Methodology

| Source | Tool | Coverage |
|---|---|---|
| TypeScript compiler | `tsc --noEmit` | All `.ts`/`.tsx` files |
| ESLint | `eslint` (with React hooks plugin) | All `.ts`/`.tsx` except generated Prisma |
| API route audit | Deep-read agent, every file under `app/api/` | 83 tool calls, 13 min |
| React component audit | Deep-read agent, pages under `app/(platform)/` | 94 tool calls, 15 min |
| lib/utils audit | Deep-read agent, every file under `lib/` | 89 tool calls, 12 min |
