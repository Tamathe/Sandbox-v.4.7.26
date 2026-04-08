# Handoff Prompt — Sprint M11: Prerequisite Unpacker (Schema + Service + API + UI)

## Context
You are building "Magic Moments" for The Sandbox — an AI-powered educational marketplace
at the University of Kentucky. The full architecture is documented in:
`c:\AA Code\Educator marketplace\Blueprints\magic-moments-architecture.md`

Read that file FIRST for complete context, type definitions, and interfaces. You are
executing Sprint M11 (Tasks 21-22). Sprints M5-M10 are complete.

The Sandbox uses:
- Next.js 16.1.6 App Router, TypeScript, Tailwind v4
- Prisma v7 with PostgreSQL (Neon), generated client at `app/generated/prisma`
- Auth via `x-demo-user-email` header; guards in `app/lib/server-auth.ts`
- AI: Anthropic — Haiku (`claude-haiku-4-5-20251001`) for chat/inference, Sonnet (`claude-sonnet-4-6`) for analysis
- Icons: lucide-react ONLY
- UI pattern: `border-2 rounded-2xl border-gray-200` cards, `font-extrabold` h1/h2, UK Blue `#0033A0`
- No new npm dependencies
- Read `the-sandbox/CLAUDE.md` for all coding constraints

## Completed Sprints (M5-M10)

### M5 — Timeline Service + API:
- Service: `the-sandbox/app/lib/timeline-service.ts`
  - Exports: `getTimeline`, `LearningTimeline`, `TimelineEvent`, `TimelineOptions`, `TimelineEventType`, `TimelineStats`
- API: `the-sandbox/app/api/timeline/route.ts`
  - GET `/api/timeline?courseId&from&to&limit&offset&types` — Auth: `requireStudentUser()`

### M6 — Timeline UI:
- Page: `the-sandbox/app/timeline/page.tsx` — full `/timeline` page with filters, chart, stream, insights sidebar
- Components in `the-sandbox/app/components/timeline/`:
  `TimelineFilters.tsx`, `TimelineChart.tsx`, `TimelineStream.tsx`, `TimelineEventCard.tsx`,
  `TimelineInsights.tsx`, `TimelineCard.tsx`
- Homepage integration: `TimelineCard` added to `app/page.tsx` for STUDENT users

### M7 — Micro-Review Schema + Service + API:
- Schema: `MicroReview` model in `prisma/schema.prisma`
- Service: `the-sandbox/app/lib/micro-review-service.ts`
  - Exports: `getMicroReview(userId, courseId)`, `submitMicroReviewResponse(reviewId, userId, answer, skipped, responseTimeMs?)`
- API: `GET /api/micro-review?courseId=xxx`, `POST /api/micro-review/[id]/respond`

### M8 — Micro-Review UI:
- Component: `the-sandbox/app/components/micro-review/MicroReviewModal.tsx`
- Integration: triggers on course selection in `app/courses/page.tsx` for STUDENT users

### M9 — Exam Forge Schema + Service + API:
- Schema: `PracticeExam` model in `prisma/schema.prisma`
- Service: `the-sandbox/app/lib/exam-forge-service.ts`
  - Exports: `generatePracticeExam()`, `submitPracticeExam()`, `listPracticeExams()`
- API: `GET/POST /api/exam-forge`, `GET /api/exam-forge/[examId]`, `POST /api/exam-forge/[examId]/submit`

### M10 — Teach It Back (Full: Service + API + UI):
- **Service:** `the-sandbox/app/lib/teach-back-service.ts`
  - Exports: `startTeachBack(userId, courseId, conceptSlug?)` → `TeachBackStartResponse`
  - `sendTeachBackMessage(sessionId, userId, message)` → `TeachBackMessageResponse`
  - `completeTeachBack(sessionId, userId)` → `TeachBackEvaluation`
  - `listTeachBackSessions(userId, courseId?)` → `TeachBackSummary[]`
  - Types: `TeachBackStartResponse`, `TeachBackMessageResponse`, `TeachBackEvaluation`, `TeachBackSummary`

- **API Routes (4 endpoints):**
  - `GET /api/teach-back?courseId=X` → `listTeachBackSessions` — Auth: `requireStudentUser()`
  - `POST /api/teach-back/start` → `startTeachBack` — Body: `{ courseId, conceptSlug? }`
  - `POST /api/teach-back/[sessionId]/message` → `sendTeachBackMessage` — Body: `{ message }`
  - `POST /api/teach-back/[sessionId]/complete` → `completeTeachBack`

- **UI Components (in `the-sandbox/app/components/teach-back/`):**
  - `TeachBackLauncher.tsx` — concept picker dropdown + "Start Teaching" button
  - `TeachBackSection.tsx` — wrapper integrated into course page learning path tab
  - `MessageBubble.tsx` — chat message display (AI student left, user right, UK Blue)
  - `TeachBackResults.tsx` — score gauge (SVG circle), dimension bars, Bloom badge, misconception checklist, coaching feedback

- **Page:** `the-sandbox/app/teach-back/[sessionId]/page.tsx`
  - Chat interface with optimistic updates, turn counter, auto-complete at 8 turns
  - Results view after completion with all evaluation metrics

- **Integration:** `TeachBackSection` rendered in course detail page (`app/courses/page.tsx:863`)

## Key Files to Read Before Starting
- `prisma/schema.prisma` — existing models (`StudentConceptMastery`, `ConceptState`, `MapEdge`, `MisconceptionTaxonomy`, `CatalogCourse`)
- `app/lib/concept-mastery-service.ts` — mastery with decay: `getEffectiveMastery()`, `upsertConceptMastery()`
- `app/lib/sr-scheduler.ts` — spaced repetition: `getDueConcepts()`, `computeNextReview()`
- `app/lib/teach-back-service.ts` — pattern for Haiku AI calls, session creation, evaluation
- `app/lib/server-auth.ts` — `requireStudentUser()`, `isAuthFailure()`
- `app/api/teach-back/start/route.ts` — thin route handler pattern
- `app/courses/page.tsx` — course detail page (integration target)
- `Blueprints/magic-moments-architecture.md` § "6. Prerequisite Unpacker" — full spec

## The Goal
Execute ONLY these 2 tasks, then STOP:

### Task 21: ConceptPrerequisite Schema + prerequisite-service.ts + API Route

1. **Add `ConceptPrerequisite` model** to `prisma/schema.prisma`:
   ```prisma
   model ConceptPrerequisite {
     id              String   @id @default(cuid())
     concept         String               // the target concept slug
     prerequisite    String               // the required concept slug
     courseId         String?              // course context (null = universal)
     course          Course?  @relation(fields: [courseId], references: [id])
     strength        Float    @default(1.0) // 0-1 how critical this prereq is
     source          String   @default("ai_inferred")  // "manual" | "ai_inferred" | "syllabus"
     createdAt       DateTime @default(now())

     @@unique([concept, prerequisite, courseId])
     @@index([concept])
     @@index([prerequisite])
   }
   ```
   - Add reverse relation on Course model: `conceptPrerequisites ConceptPrerequisite[]`
   - Run: `npx prisma db push`
   - Run: `npx prisma generate`

2. **Create `the-sandbox/app/lib/prerequisite-service.ts`:**

   Exports:
   - `unpackPrerequisites(userId, courseId, concept)` → `PrerequisiteChain`
     1. Fetch `StudentConceptMastery` for target concept → confirm mastery < 0.6 (struggling)
     2. Look up `ConceptPrerequisite` chain for this concept (recursive BFS/DFS, max depth 4)
     3. If no prerequisite records exist for this concept: call Haiku to infer them
        - Prompt: "For a student in [courseCode], what are the prerequisite concepts needed to understand [concept]? Return as JSON array of objects: [{concept: string, strength: number}]"
        - Insert inferred prerequisites into `ConceptPrerequisite` with `source="ai_inferred"`
     4. For each prerequisite in the chain: fetch `StudentConceptMastery` → compute effective mastery (apply decay via `getEffectiveMastery` pattern from concept-mastery-service or manual decay calc)
     5. Identify **root gap**: the weakest prerequisite in the chain (lowest effective mastery)
     6. Build recommendation: "Start here → then here → then you'll be ready for [concept]"
     7. Generate explanation via Haiku: "You're struggling with X because your understanding of Y has decayed..."
     8. Return `PrerequisiteChain`

   Types to export:
   ```typescript
   interface PrerequisiteChain {
     targetConcept: string
     targetMastery: number
     chain: PrerequisiteNode[]
     rootGap: {
       concept: string
       effectiveMastery: number
       recommendedAction: string     // "Review [concept] using [tool]"
       recommendedToolId?: string
     }
     explanation: string             // AI narrative
   }

   interface PrerequisiteNode {
     concept: string
     effectiveMastery: number
     isStale: boolean                // stability decayed significantly
     isGap: boolean                  // mastery < 0.5
     depth: number                   // 0 = target, 1 = direct prereq, etc.
     courseId?: string
     courseCode?: string
   }
   ```

3. **Create API route `the-sandbox/app/api/prerequisite-unpack/route.ts`:**
   - POST `{ concept: string, courseId: string }` — Auth: `requireStudentUser()` → `unpackPrerequisites`
   - Follow thin route pattern: auth → parse → call lib → return
   - Return 400 if concept or courseId missing
   - Return 500 with error message on failure

### Task 22: PrerequisiteUnpackerPanel + Course Page Integration

1. **Create components in `the-sandbox/app/components/prerequisite/`:**

   **`PrerequisiteNodeCard.tsx`:**
   - Concept name (capitalized slug) + mastery bar (colored: green > 0.7, yellow > 0.4, red)
   - "Root Gap" badge (red) on the weakest node
   - "Review" action button → links to recommended tool or Sandy
   - Connecting line/arrow to next node in chain

   **`ChainVisualization.tsx`:**
   - Vertical tree layout: root gap at top → intermediate prereqs → target concept at bottom
   - Each node is a `PrerequisiteNodeCard`
   - Visual connectors (CSS borders or SVG lines) between nodes
   - Depth labels: "Root Cause", "Prerequisite", "Target Concept"

   **`PrerequisiteUnpackerPanel.tsx`:**
   - Props: `{ courseId: string, concept?: string, onClose?: () => void }`
   - If no concept prop: show a concept picker (concepts with mastery < 0.6)
   - Loading state while fetching from `/api/prerequisite-unpack`
   - Sections:
     1. `ChainVisualization` — the prerequisite tree
     2. Explanation card — AI narrative with Sparkles icon
     3. Recommended Path — ordered steps: "1. Review X → 2. Practice Y → 3. Return to Z"
   - Empty state: "No prerequisite gaps detected"
   - Error state with retry button

2. **Integration into course detail page (`app/courses/page.tsx`):**
   - Add "Prerequisite Unpacker" section in the learning path area for STUDENT users
   - Show when any concept has mastery < 0.5 (struggling student)
   - Import `PrerequisiteUnpackerPanel` and render it as a CollapsibleSection or standalone card
   - Pattern: follow same integration as `TeachBackSection` at line 863 and `ExamForgePanel` at line 906

## Key Constraints
- FERPA: Prerequisite chains are student-specific; never expose to other users
- No new npm dependencies
- Tailwind v4 only (no @apply, utility classes in JSX)
- `size-N` not `w-N h-N` for square dimensions
- lucide-react ONLY for icons
- Follow ALL constraints from CLAUDE.md
- Use Haiku (`claude-haiku-4-5-20251001`) for prerequisite inference
- Run `npx tsc --noEmit` after to verify 0 errors

## The Next Link
After completing Tasks 21-22, generate a Handoff Prompt for Sprint M12 (Tasks 23-24):
- Task 23: Complementary Study Matching — `StudyMatchProfile` + `StudyMatch` schema, `study-match-service.ts`, API routes (`/api/study-match/opt-in`, `/api/study-match/suggestions`, `/api/study-match/[matchId]/respond`)
- Task 24: Study Match UI — `StudyMatchPage`, `MatchCard`, `OptInCard`, `TopicOverlap`, course page integration
Include full Context section noting M5-M11 are complete with file paths and exports.
