# Handoff Prompt — Sprint M7: Interstitial Micro-Reviews Schema & Service (Tasks 13-14)

## Context
You are building "Magic Moments" for The Sandbox — an AI-powered educational
marketplace for University of Kentucky. The full architecture is documented in:
`c:\AA Code\Educator marketplace\Blueprints\magic-moments-architecture.md`

Read that file FIRST (especially Section 3: Interstitial Micro-Reviews) for
complete context. You are executing Sprint M7 (Tasks 13-14).

Sprints M1-M6 are complete. Knowledge Constellation, Learning Time Machine
(service, API, page, nav, concierge integration) all pass `tsc --noEmit`
with 0 new errors.

## Prior Sprint Files (DO NOT modify)
- All constellation files from M1-M4
- `the-sandbox/app/lib/timeline-service.ts`
- `the-sandbox/app/api/timeline/route.ts`
- `the-sandbox/app/timeline/page.tsx`
- `the-sandbox/app/components/timeline/*`

## The Sandbox Uses
- Next.js 16.1.6 App Router, TypeScript, React 19, Tailwind CSS v4
- Prisma v7 with PostgreSQL (Neon), generated client at `app/generated/prisma`
- Auth via `x-demo-user-email` header; guards in `app/lib/server-auth.ts`
- UI standard from `PLATFORM-CONSISTENCY-MANIFEST.md`: Pattern A/B header,
  `max-w-6xl`, `border-2 rounded-2xl` cards, `font-extrabold` h1/h2
- Icons: lucide-react ONLY
- Anthropic Claude — Haiku (`claude-haiku-4-5-20251001`) for question generation
- Read `the-sandbox/CLAUDE.md` for all coding constraints

## The Goal
Execute ONLY these 2 tasks, then STOP:

### Task 13: Schema migration + service layer

  a) Add MicroReview model to `prisma/schema.prisma`
     ```prisma
     model MicroReview {
       id            String   @id @default(cuid())
       userId        String
       user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
       courseId       String
       course        Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
       conceptSlug   String
       question      String   @db.Text
       answer        String   @db.Text
       bloomLevel    Int
       studentAnswer String?  @db.Text
       correct       Boolean?
       responseTimeMs Int?
       skipped       Boolean  @default(false)
       createdAt     DateTime @default(now())

       @@index([userId, courseId])
       @@index([userId, createdAt])
     }
     ```
     - Add the reverse relation fields on User and Course models
     - Run `npx prisma migrate dev --name add-micro-review`
     - Run `npx prisma generate`

  b) Create `the-sandbox/app/lib/micro-review-service.ts`
     - `getAvailableReview(userId, courseId)` — checks 24h throttle, fetches
       due concepts from `sr-scheduler.ts` (getDueConcepts or equivalent),
       picks top overdue concept, calls Haiku to generate a question at the
       concept's `bloomHighWater` level, creates MicroReview record, returns
       `MicroReviewResponse`
     - `submitReviewAnswer(reviewId, userId, answer, responseTimeMs)` —
       calls Haiku to grade answer (0-1 score, threshold 0.6), updates
       MicroReview record, calls `sr-scheduler.computeNextReview()` with
       appropriate score (0.8 correct, 0.3 incorrect), updates ConceptState,
       returns result with hint if wrong
     - `skipReview(reviewId, userId)` — marks review as skipped
     - Type exports: `MicroReviewResponse`, `MicroReviewResult`

### Task 14: API routes

  a) Create `the-sandbox/app/api/micro-review/route.ts`
     - `GET` handler
     - Auth: `requireStudentUser()`
     - Query param: `courseId` (required)
     - Calls `getAvailableReview(user.id, courseId)`
     - Returns `{ available: boolean, review?: { id, question, bloomLevel,
       conceptSlug, conceptLabel, courseName, daysOverdue } }`

  b) Create `the-sandbox/app/api/micro-review/[id]/respond/route.ts`
     - `POST` handler
     - Auth: `requireStudentUser()`
     - Body: `{ answer: string }` or `{ skipped: true }`
     - If skipped: calls `skipReview()`
     - If answer provided: calls `submitReviewAnswer()` with timing
     - Returns `{ correct: boolean, nextReviewIn: string, hint?: string,
       correctAnswer?: string }`

Run `npx tsc --noEmit` — fix any errors before declaring done.

## The Next Link
After completing Tasks 13-14, generate a Handoff Prompt for Sprint M8
(Tasks 15-16) — Interstitial Micro-Reviews UI: MicroReviewModal component,
MicroReviewCard with flip animation, course page integration (modal on mount),
tool launch integration, localStorage throttle.
