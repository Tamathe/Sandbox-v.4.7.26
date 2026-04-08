# Registrar Walkthrough — Demo Readiness Sprint
**Status:** ✅ Complete (2026-03-20)
**Scope:** 5 surgical tasks — NOT new feature work. The registrar system was already fully built. This sprint closed the gaps preventing a clean walkthrough demo.

---

## Context

The Registrar Intelligence System (`/registrar`, `/registrar/petitions`, `/registrar/articulation`, `/registrar/degree-audit`, `/registrar/analytics`, `/registrar/programs`, `/registrar/reports`) was fully implemented in a prior sprint. A master engineer review found 5 gaps preventing a clean demo walkthrough:

1. Sandy had zero awareness of registrar routes
2. The graduation clearance cron sent no email digest
3. Seed data had only 1–2 petitions — not enough for a meaningful demo queue
4. No days-waiting indicator on the petition list
5. No demo script / blueprint documenting the walkthrough

---

## Task 1 — Seed Data ✅

**File:** `prisma/seed.ts`

Added 3 staged petitions and 1 articulation request for Ian, all idempotent via `findFirst` guard:

| Student | Type | Status | Age |
|---|---|---|---|
| Ian McClure | `LATE_WITHDRAWAL` | `SUBMITTED` | 4 days |
| Tiana The | `GRADE_CHANGE` | `IN_REVIEW` | 1 day |
| Ian McClure | `GRADUATION_APPLICATION` | `IN_REVIEW` | 2 days |

**Articulation Request:** Ian McClure → UofL "Evidence Law and Practice" → UK LAW 610
- `similarityScore: 91` (exceeds Law dept auto-approve threshold of 90)
- `recommendation: 'APPROVE'`
- `reasoning` field contains a JSON object with a `chainOfThought` array of 5 steps:
  1. Structural Alignment Check (3 credits, FRE survey, KY-equivalent) — HIGH
  2. Topic Coverage Comparison (8 canonical topic clusters, all present) — HIGH
  3. Depth and Rigor Assessment (4-hr final + midterm + hearing simulation) — HIGH
  4. Institutional Accreditation Cross-Check (ABA full accreditation) — HIGH
  5. Final Recommendation Synthesis (score 91 ≥ threshold 90, all criteria HIGH → AUTO-APPROVE) — HIGH

Each petition includes `PetitionAuditEntry` records tracking the submission and routing history.

---

## Task 2 — Sandy Page Descriptions ✅

**File:** `app/lib/concierge-service.ts`

Added 7 registrar routes to `PAGE_DESCRIPTIONS`:
- `/registrar` — dashboard overview with KPI framing
- `/registrar/petitions` — petition queue workflow description
- `/registrar/articulation` — AI-evaluated transfer credit with chain-of-thought
- `/registrar/degree-audit` — audit results, at-risk flags, staff override
- `/registrar/analytics` — volume trends and processing time stats
- `/registrar/programs` — degree program catalog
- `/registrar/reports` — exportable registrar reports

Added REGISTRAR persona block in `buildSystemPrompt()`:
- Activates when `currentPage` starts with `/registrar` AND user role is `REGISTRAR` or `ADMIN`
- Explains Sandy's role: navigate petition queue, explain AI scores/chain-of-thought reasoning, suggest next actions on stale cases, surface workflow shortcuts
- Lists all registrar sub-routes as navigation targets

Added registrar entry to the `PLATFORM NAVIGATION` section of Sandy's system prompt.

---

## Task 3 — Sandy Proactive Event ✅

**Files:** `app/registrar/page.tsx`, `app/components/ClientProviders.tsx`

**Pattern:** Matches the existing `sandbox-grading-open` custom event pattern.

In `app/registrar/page.tsx`:
- After analytics load (`setAnalytics(data)`), dispatches `sandy-proactive-registrar` CustomEvent
- `detail.staleCount` = sum of SUBMITTED + IN_REVIEW petition counts from analytics response

In `app/components/ClientProviders.tsx`:
- New `registrarProactive` state (same shape as `ToolsProactiveConfig`)
- `useEffect` listener for `sandy-proactive-registrar`:
  - If `staleCount > 0`: "You have N petition(s) awaiting action. Want me to summarize the most urgent ones or walk you through the review workflow?"
  - If `staleCount === 0`: "Registrar queue is clear — no petitions waiting. Want a summary of recent articulation decisions or degree audit flags?"
  - `sessionKey: \`sandy-registrar-${staleCount}\`` (resets Sandy on count change)
- Wired into `ConciergePanel proactiveConfig` chain: checked first when `pathname === '/registrar'`

---

## Task 4 — Graduation Clearance Email Digest ✅

**Files:** `app/api/registrar/cron/graduation-clearance/route.ts`, `.env.example`

After the graduation petition processing loop, calls `sendEmail()` from `app/lib/email.ts`:

- **Recipient:** `process.env.REGISTRAR_NOTIFY_EMAIL ?? 'registrar@uky.edu'`
- **Subject:** `Graduation Clearance Cron — N petition(s) processed`
- **Body:** HTML digest with UK blue header, summary table (total / pre-check passed / flagged for review / errors), amber warning block if `flaggedForReview > 0`, CTA button deep-linking to `/registrar/petitions`
- Falls back to `console.log` if no `RESEND_API_KEY` (same pattern as all other email sends in the codebase)

Added `REGISTRAR_NOTIFY_EMAIL` to `.env.example` (file created — it didn't exist previously).

---

## Task 5 — Days-Waiting Indicator ✅

**File:** `app/registrar/petitions/page.tsx`

Added imports: `AlertCircle` (lucide-react), `formatDistanceToNow` + `differenceInDays` (date-fns).

Added two helpers:
- `daysWaiting(submittedAt)` — returns integer days elapsed via `differenceInDays`
- `waitingBadge(submittedAt, status)` — returns null for resolved petitions; amber badge with `AlertCircle` icon if > 3 days; plain gray text otherwise

Added "Waiting" column header to the petition table.

Each petition row:
- Shows `waitingBadge` in the new column (human-readable, e.g. "4 days", "about 1 hour")
- Row background is amber (`bg-amber-50 hover:bg-amber-100`) if > 3 days AND petition is still open (not APPROVED / DENIED / WITHDRAWN)
- Selected row still takes priority (`bg-blue-50`)

---

## Demo Script

### Registrar Walkthrough (approx. 3 minutes)

1. **Switch to a REGISTRAR or ADMIN user** via the Demo Mode selector
2. **Navigate to `/registrar`**
   - Sandy badge appears: "You have N petitions awaiting action…"
   - Dashboard shows KPIs: Petitions Pending Review, Transfer Credit Requests, Degree Audits
3. **Click "Petition Queue"** → `/registrar/petitions`
   - Table shows 3+ petitions
   - Ian's LATE_WITHDRAWAL row is **amber** (4 days waiting, > 3-day threshold)
   - "Waiting" column shows human-readable elapsed time
4. **Click Ian's LATE_WITHDRAWAL petition**
   - Detail panel shows: form data (LAW 501, family emergency), eligibility check (eligible), audit trail (SUBMITTED → ROUTED)
   - Record a decision: select Approved / Approved with Conditions / Denied
5. **Navigate to Articulation Manager** → `/registrar/articulation`
   - Ian's UofL → LAW 610 request is visible
   - Similarity score: 91/100 — exceeds auto-approve threshold
   - Reasoning shows 5-step chain-of-thought analysis
6. **Navigate back to `/registrar`**
   - Point out Sandy's context-aware persona (registrar workflow guidance)
   - Ask Sandy: "What should I look at first?" → Sandy references petition queue and stale count

---

## Files Changed

| File | Change |
|---|---|
| `prisma/seed.ts` | +3 petitions + 1 articulation request, all idempotent |
| `app/lib/concierge-service.ts` | +7 PAGE_DESCRIPTIONS entries, +REGISTRAR persona block, +nav entry |
| `app/registrar/page.tsx` | +dispatch `sandy-proactive-registrar` after analytics load |
| `app/components/ClientProviders.tsx` | +`registrarProactive` state, +event listener, +proactiveConfig wire |
| `app/api/registrar/cron/graduation-clearance/route.ts` | +`sendEmail()` digest after processing loop |
| `app/registrar/petitions/page.tsx` | +`daysWaiting`/`waitingBadge` helpers, +"Waiting" column, +amber row highlight |
| `.env.example` | Created with `REGISTRAR_NOTIFY_EMAIL` and all known env vars |
