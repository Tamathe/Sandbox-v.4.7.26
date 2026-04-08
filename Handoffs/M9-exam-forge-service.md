# Handoff Prompt — Sprint M9: Exam Forge Service + API (Tasks 17-18)

## Context
You are building "Magic Moments" for The Sandbox — an AI-powered educational
marketplace for University of Kentucky. The full architecture is documented in:
`c:\AA Code\Educator marketplace\Blueprints\magic-moments-architecture.md`

Read that file FIRST (especially Section 4: Exam Forge — Data Model, Type
Definitions, API Routes, and Sprint Breakdown) for complete context.
You are executing Sprint M9 (Tasks 17-18).

Sprints M1-M8 are complete. Schema, service layer, API routes, and UI for
Constellation, Timeline, and Micro-Reviews all pass `tsc --noEmit` with 0
new errors.

## Prior Sprint Files (DO NOT modify)
- All constellation files from M1-M4
- `the-sandbox/app/lib/timeline-service.ts`
- `the-sandbox/app/api/timeline/route.ts`
- `the-sandbox/app/timeline/page.tsx`
- `the-sandbox/app/components/timeline/*`
- `the-sandbox/app/lib/micro-review-service.ts`
- `the-sandbox/app/api/micro-review/route.ts`
- `the-sandbox/app/api/micro-review/[id]/respond/route.ts`
- `the-sandbox/app/components/micro-review/*`

## The Sandbox Uses
- Next.js 16.1.6 App Router, TypeScript, React 19, Tailwind CSS v4
- Prisma v7 with PostgreSQL (Neon), generated client at `app/generated/prisma`
- Auth via `x-demo-user-email` header; guards in `app/lib/server-auth.ts`
- Anthropic SDK: Sonnet (`claude-sonnet-4-6`) for exam generation,
  Haiku (`claude-haiku-4-5-20251001`) for answer grading
- Icons: lucide-react ONLY
- Thin API routes: auth → parse → call lib → return
- Read `the-sandbox/CLAUDE.md` for all coding constraints

## Existing Services You Will Use
- `app/lib/concept-mastery-service.ts` — `upsertConceptMastery(userId, conceptSlug, courseId, score)`
- `app/lib/sr-scheduler.ts` — `getDueConcepts(userId, courseId)`, `computeNextReview(state, score)`
- `app/lib/prisma.ts` — singleton Prisma client

## The Goal
Execute ONLY these 2 tasks, then STOP:

### Task 17: Schema Migration — PracticeExam Model

  a) Add the `PracticeExam` model to `prisma/schema.prisma`:
     ```prisma
     model PracticeExam {
       id                 String      @id @default(cuid())
       userId             String
       user               User        @relation(fields: [userId], references: [id], onDelete: Cascade)
       courseId            String
       course             Course      @relation(fields: [courseId], references: [id], onDelete: Cascade)
       title              String
       targetAssignmentId String?
       targetAssignment   Assignment? @relation(fields: [targetAssignmentId], references: [id])
       strategy           Json
       questions          Json
       questionCount      Int
       estimatedMinutes   Int
       startedAt          DateTime?
       completedAt        DateTime?
       score              Float?
       questionResults    Json?
       conceptsTargeted   String[]
       bloomDistribution  Json
       createdAt          DateTime    @default(now())

       @@index([userId, courseId])
       @@index([userId, createdAt])
     }
     ```

  b) Add `practiceExams PracticeExam[]` relation array to the `User`, `Course`,
     and `Assignment` models (check each model for the right placement)

  c) Run the migration sequence:
     ```bash
     npx prisma migrate dev --name add-practice-exam
     npx prisma generate
     ```

  d) Verify with `npx tsc --noEmit` — fix any errors before proceeding.

### Task 18: Exam Forge Service Layer + API Routes

  a) Create `the-sandbox/app/lib/exam-forge-service.ts` with these exports:

     **`generateExam(userId, courseId, targetAssignmentId?, questionCount?)`**
     Returns: `PracticeExam` record
     Logic:
     1. Fetch student's `StudentConceptMastery` for the course → apply time decay
        (use `decayedMastery = mastery * Math.exp(-lambda * daysSinceUpdate)`,
        lambda = 0.05)
     2. Fetch `ConceptState` via `getDueConcepts(userId, courseId)` for overdue SR concepts
     3. Fetch `MisconceptionTaxonomy` entries for the course
     4. Fetch `LearningObjective` with `StudentObjectiveProgress` → find Bloom gaps
        (where objective's expected Bloom > student's achieved Bloom)
     5. If `targetAssignmentId`, fetch that Assignment for title/context;
        else pick next upcoming exam/quiz assignment (type contains "exam" or "quiz",
        `dueAt > now`, ordered by `dueAt`)
     6. Build `ExamStrategy` object:
        - `weakConceptsTargeted`: concepts with decayed mastery < 0.5
        - `staleConceptsTargeted`: concepts overdue by > 3 days
        - `misconceptionsProbed`: active misconceptions for weak concepts
        - `bloomGaps`: objectives where student is below expected level
     7. Call Sonnet (`claude-sonnet-4-6`) with strategy + course context to generate
        questions. Prompt should specify:
        - Question count (default 10, max 20)
        - Distribution: ~30% weak concepts, ~25% stale, ~20% misconception probes,
          ~25% Bloom gap pushers
        - Bloom distribution: match target exam expectations from objectives
        - Question types: `multiple_choice`, `short_answer`, `scenario`, `explain`
        - Use `StudentDomainModality` to weight preferred question types if available
        - Output: JSON array of `ExamQuestion` objects
     8. Parse Sonnet response; validate each question has required fields
     9. Create `PracticeExam` record in DB with all fields
     10. Return the exam (strip `correctAnswer` and `explanation` from questions
         in the returned object — students shouldn't see answers before submitting)

     **`submitExam(examId, userId, answers)`**
     Returns: `{ score, questionResults, weakConcepts }`
     Logic:
     1. Fetch `PracticeExam`, verify ownership
     2. Parse stored questions (with answers)
     3. Grade each answer:
        - `multiple_choice`: exact string match on correctAnswer
        - `short_answer` / `scenario` / `explain`: call Haiku to grade (0-1 score)
          with the question, correctAnswer, and studentAnswer
     4. Calculate overall score (weighted by points)
     5. Generate per-question feedback via Haiku
     6. Update `PracticeExam`: `score`, `questionResults`, `completedAt`
     7. For each concept tested with a question result:
        - `upsertConceptMastery(userId, concept, courseId, questionScore)`
     8. Build weakness report: top 3 lowest-scoring concepts
     9. Return full results

     **`listExams(userId, courseId)`**
     Returns: Array of exam metadata (id, title, questionCount, score, createdAt,
     completedAt) — no full questions

  b) Create API routes (thin handlers):

     **`the-sandbox/app/api/exam-forge/route.ts`**
     - `GET`: `requireStudentUser()` → parse `courseId` from searchParams →
       call `listExams()` → return JSON
     - `POST`: `requireStudentUser()` → parse body `{ courseId, targetAssignmentId?,
       questionCount? }` → call `generateExam()` → return JSON

     **`the-sandbox/app/api/exam-forge/[examId]/route.ts`**
     - `GET`: `requireStudentUser()` → fetch exam by id, verify ownership →
       return exam (strip answers if not completed)

     **`the-sandbox/app/api/exam-forge/[examId]/submit/route.ts`**
     - `POST`: `requireStudentUser()` → parse body `{ answers: { questionId, answer }[] }` →
       call `submitExam()` → return results

Run `npx tsc --noEmit` — fix any errors before declaring done.

## Type Definitions (implement these in exam-forge-service.ts)

```typescript
interface ExamStrategy {
  weakConceptsTargeted: { concept: string; currentMastery: number; reason: string }[]
  staleConceptsTargeted: { concept: string; daysSinceReview: number }[]
  misconceptionsProbed: { concept: string; misconception: string }[]
  bloomGaps: { objective: string; expected: string; current: number }[]
}

interface ExamQuestion {
  id: string                       // q1, q2, ...
  concept: string                  // concept being tested
  objectiveId?: string             // linked learning objective
  bloomLevel: string               // "remember" | "understand" | ... | "create"
  type: 'multiple_choice' | 'short_answer' | 'scenario' | 'explain'
  question: string
  options?: string[]               // for MC
  correctAnswer: string
  explanation: string              // why this is correct
  misconceptionProbe?: string      // which misconception this tests
  points: number                   // relative weight
}

interface QuestionResult {
  questionId: string
  studentAnswer: string
  correct: boolean
  score: number                    // 0-1 partial credit
  feedback: string                 // AI-generated per-question feedback
}
```

## Design Notes
- Sonnet is expensive — cache strategy computation so regenerating with same
  strategy doesn't re-analyze mastery data
- Question generation prompt should be specific and structured to get valid JSON
- Haiku grading should be generous (partial credit for partial understanding)
- Keep the service modular: strategy builder, question generator, and grader
  should be separable functions within the service file
- Error handling: if Sonnet returns malformed JSON, retry once; if still bad,
  throw with a descriptive message

## The Next Link
After completing Tasks 17-18, generate a Handoff Prompt for Sprint M10
(Tasks 19-20) — Exam Forge UI: ExamForgePage (`/exam-forge`), ExamView
(`/exam-forge/[examId]`), ExamResultsView, QuestionCard components
(MCQuestion, ShortAnswerQuestion, ScenarioQuestion), course page integration
("Exam Forge" button in Assignments tab for upcoming exams).
