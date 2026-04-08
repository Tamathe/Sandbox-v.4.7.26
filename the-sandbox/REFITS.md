# REFITS.md — Codebase Audit & Prioritized Refactor Checklist
_Generated: 2026-03-19 | Audited against CLAUDE.md rules_

---

## Priority Legend
- 🔴 **CRITICAL** — Security or data integrity risk; fix before next deploy
- 🟠 **HIGH** — Functional correctness or significant technical debt
- 🟡 **MEDIUM** — Code quality / maintainability; fix in next sprint
- 🟢 **LOW** — Polish / consistency; fix when touching those files

---

## Category 1 — Missing or Bypassed Authentication

### 🔴 CRIT-1: `/api/xp/route.ts` POST — Unauthenticated XP Award
- **File:** `app/api/xp/route.ts`
- **Problem:** The POST handler takes `{ email, amount, reason }` in the request body with no auth check. Any caller who knows a user's email can award arbitrary XP, create `SandTransaction` records, and trigger badge awards for any account.
- **Fix:** Wrap POST handler with `requireRequestUser`. Verify the caller is an ADMIN (for manual grants) or that the request originates from a trusted internal route only.

### 🔴 CRIT-2: `/api/upload/pdf/route.ts` POST — Unauthenticated DB Write
- **File:** `app/api/upload/pdf/route.ts`
- **Problem:** Creates a `ToolDocument` record linked to any caller-supplied `sessionId` with no ownership check. A user can attach documents to any other user's build session.
- **Fix:** Add `requireRequestUser`, then verify the target `BuildSession.userId === user.id` before creating the document.

### 🟠 HIGH-1: `/api/collab/route.ts` — Bypasses Suspension Check
- **File:** `app/api/collab/route.ts`
- **Problem:** Uses raw `req.headers.get('x-demo-user-email')` + a direct `prisma.user.findUnique` instead of `requireRequestUser()`. The suspension check inside `requireRequestUser` is skipped entirely. Suspended users can read and create collab requests.
- **Fix:** Replace manual header read + DB lookup with `requireRequestUser(request)` from `server-auth.ts`.

### 🟠 HIGH-2: `/api/admin/tools/[id]/approval/route.ts` — Inconsistent Admin Check
- **File:** `app/api/admin/tools/[id]/approval/route.ts`
- **Problem:** Uses `requireRequestUser` (not `requireAdminUser`), then manually checks `user.role === 'ADMIN'`. Functionally equivalent but breaks the consistent pattern used by every other admin route and is easy to accidentally downgrade.
- **Fix:** Replace with `requireAdminUser(request)`.

### 🟡 MED-1: `/api/studio/audit/route.ts` POST — Unauthenticated AI Quota Consumption
- **File:** `app/api/studio/audit/route.ts`
- **Problem:** No auth check. Any unauthenticated caller can trigger `reviewSandcastleSubmission()` (Anthropic API call) repeatedly, burning quota.
- **Fix:** Add `requireAdminUser` or at minimum `requireRequestUser` since this is admin-tier analysis.

### 🟡 MED-2: `/api/publish/generate-description/route.ts` POST — Unauthenticated AI Streaming
- **File:** `app/api/publish/generate-description/route.ts`
- **Problem:** No auth check. Streaming AI endpoint burns Anthropic credits for any unauthenticated POST.
- **Fix:** Add `requireRequestUser` — only authenticated users should be able to publish tools.

### 🟡 MED-3: `/api/onboarding/enrich/route.ts` POST — Unauthenticated AI Call (Pre-Login)
- **File:** `app/api/onboarding/enrich/route.ts`
- **Problem:** Intentionally pre-login but has no rate-limiting import or server-side throttle. The in-process `enrichCache` Map only deduplicates within a single cold-start; a new instance resets it. Repeated calls with varied inputs consume unbounded Anthropic quota.
- **Fix:** Add IP-based rate limiting (e.g., via `lru-cache` keyed on `x-forwarded-for`) or a per-email cooldown that survives across requests (Redis or DB-backed).

### 🟡 MED-4: `/api/onboarding/create-account/route.ts` POST — Email Domain Check Only
- **File:** `app/api/onboarding/create-account/route.ts`
- **Problem:** Only guard is `email.endsWith('@uky.edu')`. No CAPTCHA, rate limiting, or account-creation throttle. Automated account creation with any `@uky.edu` address is trivially possible.
- **Fix:** Add IP-based rate limiting and consider a honeypot or server-side token from the onboarding page.

### 🟢 LOW-1: `/api/avatar/extract-pdf/route.ts` — Unauthenticated PDF Extraction
- **File:** `app/api/avatar/extract-pdf/route.ts`
- **Problem:** No auth. Accepts arbitrary PDF uploads for server-side text extraction. No DB writes but consumes server CPU and memory.
- **Fix:** Add `requireRequestUser` — PDF avatar setup is only meaningful for logged-in users anyway.

---

## Category 2 — Brittle State Management

### 🟠 HIGH-3: `StudyBuddyInterface.tsx` — 32 `useState` Hooks, 5 Loading Booleans
- **File:** `app/components/StudyBuddyInterface.tsx`
- **Problem:** 32 separate `useState` declarations with no state machine. Key offenders:
  - **5 mutually exclusive loading booleans** (`isLoading`, `uploading`, `loadingSessions`, `resuming`, `summaryLoading`) that should be a single `status` union type
  - **3 flashcard-mode sets** (`flippedCards`, `knownCards`, `reviewCards`) that should be a single `Map<string, CardState>`
  - **`pendingModeSwitch` boolean** alongside `screen` and `mode` — three atoms for one navigation concern
  - **`wrapupSummary` + `summaryLoading`** always coupled — should be a single object
- **Fix:** Define a `StudyBuddyStatus` union type; collapse loading flags into it. Introduce a `CardState` map for flashcard tracking. Consider `useReducer` for the overall component.

### 🟡 MED-5: `ChatInterface.tsx` — Post-Session End-Flow Scattered Across 3 State Atoms
- **File:** `app/components/ChatInterface.tsx`
- **Problem:** `endFlowStep`, `endFlowLoading`, `sessionJustCompleted` are three separate state atoms for one linear sub-flow. `sessionRating` and `journalNote` are also only relevant during this sub-flow but float independently.
- **Fix:** Collapse into a single `endFlow: { step: EndFlowStep | null; loading: boolean; completed: boolean; rating?: number; journal?: string }` object.

### 🟡 MED-6: `CourseSetupWizard.tsx` — Async Outcomes Tracked as Loose Booleans per Step
- **File:** `app/components/courses/CourseSetupWizard.tsx`
- **Problem:** Each wizard step's async outcome is tracked with parallel loose booleans (`importing`, `importError`, `generatingBot`, `botError`, `botToolId`) rather than as part of the step state itself. Adding a new step requires adding 2–3 new state atoms.
- **Fix:** Use a `stepState: Record<WizardStep, { status: 'idle' | 'loading' | 'done' | { error: string }; result?: unknown }>` pattern.

### 🟡 MED-7: `CollabChatInterface.tsx` — Dual Mutually Exclusive Async Flags
- **File:** `app/components/collab/CollabChatInterface.tsx`
- **Problem:** `isSending` and `isEndingOrLeaving` are mutually exclusive in-progress flags. `streamingMessageId` and `streamingContent` are always used together. `connectionStatus` and `error` both describe connection state.
- **Fix:** Collapse to `pendingAction: null | 'sending' | 'ending' | 'leaving'`; `streaming: { messageId: string; content: string } | null`; and `connectionState: 'connecting' | 'connected' | { error: string }`.

---

## Category 3 — Redundant Logic (No Shared Utilities)

### 🟡 MED-8: Date Formatting — Three Competing Approaches, No Shared Utility
- **Scope:** ~46 files
- **Problem:** The codebase uses three date formatting strategies with no shared utility function:
  1. **`date-fns` `format()`** — 32 files, the same `'MMM d, yyyy'` format string repeated verbatim at least 10 times. Key files: `app/components/courses/StudentGradesTab.tsx:102,104,153`, `app/admin/page.tsx:289,400,457`, `app/tools/[id]/page.tsx:1238,1310`, `app/profile/[id]/page.tsx:159,339`
  2. **`toLocaleDateString()`** — 14 files with inconsistent locale/options. Some pass `'en-US'` with explicit `{ year, month, day }` options; some pass nothing. Dates render differently across pages. Key files: `app/components/StudyBuddyInterface.tsx:343,857,1039`, `app/components/ChatInterface.tsx:349`, `app/registrar/degree-audit/page.tsx:180,263`
  3. **`Intl.DateTimeFormat` one-off** — `app/tools/transfer-credit-articulator/page.tsx:107`
- **Fix:** Create `app/lib/format.ts` with shared `formatDate(date, format?)`, `formatDateTime(date)`, `formatRelative(date)` helpers. Migrate all call sites.

### 🟡 MED-9: UK Blue Primary Button — Inline Tailwind String Duplicated 335 Times
- **Scope:** 92 files, 335 occurrences
- **Problem:** No shared `<Button>` component exists. The string `bg-[#0033A0] text-white hover:bg-[#002580]` (with minor padding variants) is inlined in every file. Visual drift has already occurred — padding and rounding are inconsistent across instances (some `rounded-xl`, some `rounded-lg`, some `rounded-md`). A single brand color change would require touching 92 files.
- **Key examples:** `app/avatar/page.tsx` (5 occurrences in one file), `app/admin/page.tsx:533`, `app/bounties/new/page.tsx:201`
- **Fix:** Create `app/components/ui/Button.tsx` with `variant` prop (`primary`, `secondary`, `ghost`, `danger`). Migrate high-traffic pages first (admin, tools, bounties).

### 🟢 LOW-2: Loading Spinner — `animate-spin` Inlined 84 Times, No Shared Component
- **Scope:** 84 occurrences across component files
- **Problem:** No `<Spinner>` component. Colors, sizes, and border widths differ across instances:
  - `app/analytics/faculty/page.tsx:603` — `h-6 w-6 border-2 border-[#0033A0] border-t-transparent`
  - `app/build/page.tsx:366` — `w-4 h-4 border-2 border-white/30 border-t-white`
  - `app/tools/[id]/gamification/page.tsx:33` — `w-8 h-8 border-4 border-[#0033A0] border-t-transparent`
- **Fix:** Create `app/components/ui/Spinner.tsx` with `size` and `variant` props. Address alongside the Button component work.

---

## Category 4 — Dead/Missing Schema References

### ✅ No issues found
All `prisma.<model>` calls in `app/api/` and `app/lib/` were cross-referenced against all 86 model definitions in `prisma/schema.prisma`. No references to non-existent tables were found. Notably verified: `prisma.notification`, `prisma.articulationRoutingRule`, `prisma.xPEvent`, `prisma.userPlatformQuest` — all valid.

---

## Summary Checklist

### 🔴 Critical (fix before next deploy)
- [x] **CRIT-1** Add auth to `/api/xp` POST — unauthenticated XP award
- [x] **CRIT-2** Add auth + ownership check to `/api/upload/pdf` POST

### 🟠 High (fix this sprint)
- [x] **HIGH-1** Replace manual header auth in `/api/collab/route.ts` with `requireRequestUser`
- [x] **HIGH-2** Replace `requireRequestUser` with `requireAdminUser` in `/api/admin/tools/[id]/approval/route.ts`
- [ ] **HIGH-3** Refactor `StudyBuddyInterface.tsx` — collapse 5 loading booleans into status union; unify flashcard state

### 🟡 Medium (next sprint)
- [ ] **MED-1** Add `requireAdminUser` to `/api/studio/audit/route.ts`
- [ ] **MED-2** Add `requireRequestUser` to `/api/publish/generate-description/route.ts`
- [ ] **MED-3** Add IP-rate-limiting to `/api/onboarding/enrich/route.ts`
- [ ] **MED-4** Add IP-rate-limiting to `/api/onboarding/create-account/route.ts`
- [ ] **MED-5** Collapse `ChatInterface.tsx` end-flow state into single object
- [ ] **MED-6** Unify `CourseSetupWizard.tsx` per-step async outcome state
- [ ] **MED-7** Collapse `CollabChatInterface.tsx` async flags and streaming state
- [ ] **MED-8** Create `app/lib/format.ts` — shared date formatting utilities (eliminates 3 competing patterns across 46 files)
- [ ] **MED-9** Create `app/components/ui/Button.tsx` — eliminate 335 inline UK-blue button strings

### 🟢 Low (polish pass)
- [ ] **LOW-1** Add `requireRequestUser` to `/api/avatar/extract-pdf/route.ts`
- [ ] **LOW-2** Create `app/components/ui/Spinner.tsx` — consolidate 84 inline spinner divs
