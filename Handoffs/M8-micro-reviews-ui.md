# Handoff Prompt — Sprint M8: Interstitial Micro-Reviews UI (Tasks 15-16)

## Context
You are building "Magic Moments" for The Sandbox — an AI-powered educational
marketplace for University of Kentucky. The full architecture is documented in:
`c:\AA Code\Educator marketplace\Blueprints\magic-moments-architecture.md`

Read that file FIRST (especially Section 3: Interstitial Micro-Reviews,
Component Hierarchy and Integration Points) for complete context.
You are executing Sprint M8 (Tasks 15-16).

Sprints M1-M7 are complete. Schema, service layer, and API routes for
Micro-Reviews all pass `tsc --noEmit` with 0 new errors.

## Prior Sprint Files (DO NOT modify)
- All constellation files from M1-M4
- `the-sandbox/app/lib/timeline-service.ts`
- `the-sandbox/app/api/timeline/route.ts`
- `the-sandbox/app/timeline/page.tsx`
- `the-sandbox/app/components/timeline/*`
- `the-sandbox/app/lib/micro-review-service.ts`
- `the-sandbox/app/api/micro-review/route.ts`
- `the-sandbox/app/api/micro-review/[id]/respond/route.ts`

## The Sandbox Uses
- Next.js 16.1.6 App Router, TypeScript, React 19, Tailwind CSS v4
- Prisma v7 with PostgreSQL (Neon), generated client at `app/generated/prisma`
- Auth via `x-demo-user-email` header; guards in `app/lib/server-auth.ts`
- UI standard from `PLATFORM-CONSISTENCY-MANIFEST.md`: Pattern A/B header,
  `max-w-6xl`, `border-2 rounded-2xl` cards, `font-extrabold` h1/h2
- Icons: lucide-react ONLY
- Tailwind v4: no `@apply` in CSS; utility classes in JSX only; `size-4` not `w-4 h-4`
- Read `the-sandbox/CLAUDE.md` for all coding constraints

## Existing Service API (from M7)

### `GET /api/micro-review?courseId=xxx`
Returns:
```typescript
interface MicroReviewResponse {
  available: boolean
  review?: {
    id: string
    question: string
    bloomLevel: number
    conceptSlug: string
    conceptLabel: string   // human-readable (slug with hyphens → spaces)
    courseName: string     // "TEK-100 — Introduction to AI Tools"
    daysOverdue: number
  }
}
```

### `POST /api/micro-review/[id]/respond`
Body: `{ answer: string, responseTimeMs?: number }` or `{ skipped: true }`
Returns:
```typescript
interface MicroReviewSubmitResult {
  skipped?: boolean
  correct?: boolean
  feedback?: string
  hint?: string            // remediation hint if wrong + misconception exists
  correctAnswer?: string   // shown if wrong
  nextReviewIn?: string    // "tomorrow" | "3 days"
}
```

## The Goal
Execute ONLY these 2 tasks, then STOP:

### Task 15: MicroReviewModal + MicroReviewCard components

  a) Create `the-sandbox/app/components/micro-review/MicroReviewModal.tsx`
     - Accepts props: `courseId: string`, `onDismiss: () => void`
     - On mount, fetches `GET /api/micro-review?courseId=X` using the auth
       header from `useAuth()` (in `app/lib/auth-context.tsx`)
     - If `available === false`, calls `onDismiss()` immediately (no flash)
     - If available, renders a centered modal overlay (z-50, backdrop blur)
     - Contains `MicroReviewCard` with the review data
     - "Not now" dismiss button that calls `onDismiss()` and sets localStorage
       throttle key

  b) Create `the-sandbox/app/components/micro-review/MicroReviewCard.tsx`
     - Two-state card: **question side** (initial) → **result side** (after submit)
     - Question side:
       - `ConceptBadge`: concept label + course code in a small pill
       - `BloomIndicator`: Bloom level displayed (e.g., "Level 3: Apply")
       - Question text prominently displayed
       - Text input for answer (textarea, 2-3 lines)
       - Action buttons: **Submit** (primary, UK blue) | **Skip** (ghost)
       - Timer starts on mount (track responseTimeMs)
     - Flip animation: CSS `perspective` + `rotateY` transition (Tailwind
       `transition-transform duration-500` with `[transform-style:preserve-3d]`)
     - Result side (after API response):
       - Correct: green checkmark icon (`CheckCircle2`), feedback text,
         "Next review in {nextReviewIn}" label
       - Incorrect: red X icon (`XCircle`), feedback text, correct answer
         revealed, remediation hint if available, "Next review in {nextReviewIn}"
       - "Continue" button that calls `onDismiss()`
     - Skipped: calls POST with `{ skipped: true }`, then `onDismiss()`

  c) Bloom level labels for display (reuse from service or define locally):
     ```
     1: Remember, 2: Understand, 3: Apply,
     4: Analyze, 5: Evaluate, 6: Create
     ```

### Task 16: Course page + tool launch integration

  a) Integrate into course detail page
     - Find the course detail page component (likely
       `the-sandbox/app/courses/[courseId]/page.tsx` or similar)
     - Add state: `showMicroReview: boolean` (initially `true` for students)
     - On mount (student role only), render `<MicroReviewModal>` if
       `showMicroReview` is true AND localStorage throttle key
       `micro-review-{courseId}-{YYYY-MM-DD}` is not set
     - When modal dismissed: set `showMicroReview = false`, write localStorage
       throttle key with today's date
     - Modal renders OVER the course content (not blocking render)

  b) Integrate into tool launch flow
     - Find `ChatInterface.tsx` or the tool launch entry point
     - Before the first message / on tool open, check for micro-review
       availability for the tool's courseId
     - Show `MicroReviewCard` inline (not modal) above the chat area if
       available, with the same localStorage throttle
     - Alternative: if inline is too complex, use the same modal approach

  c) localStorage throttle utility
     - Create a small helper (can be in the MicroReviewModal file or a
       shared hook `useMicroReviewThrottle(courseId)`) that:
       - Checks `localStorage.getItem(`micro-review-${courseId}-${date}`)
       - Sets the key on dismiss
       - Returns `{ shouldShow: boolean, markShown: () => void }`

Run `npx tsc --noEmit` — fix any errors before declaring done.

## Design Notes
- The modal should feel lightweight — not a quiz. Think "flash card at the
  door" not "pop quiz."
- Card flip animation should be smooth but not slow (500ms max).
- The question side should be inviting: warm colors for the concept badge,
  clean typography, generous spacing.
- UK Blue (`#0033A0`) for primary action buttons.
- `border-2 rounded-2xl` card pattern per manifest.
- On mobile, modal should be nearly full-width with comfortable padding.

## The Next Link
After completing Tasks 15-16, generate a Handoff Prompt for Sprint M9
(Tasks 17-18) — Exam Forge: schema migration (ExamForgeSession, ExamQuestion,
ExamBlueprint models), service layer (blueprint generation via Sonnet,
question generation via Haiku, adaptive difficulty, Bloom coverage matrix).
