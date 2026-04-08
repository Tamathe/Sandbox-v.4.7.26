# Handoff Prompt — Sprint M10: Teach It Back API Routes + UI

## Context
You are building "Magic Moments" for The Sandbox — an AI-powered educational marketplace
at the University of Kentucky. The full architecture is documented in:
`c:\AA Code\Educator marketplace\Blueprints\magic-moments-architecture.md`

Read that file FIRST for complete context, type definitions, and interfaces. You are
executing Sprint M10 (Tasks 19-20). This track depends on Sprint M9 (now complete).

The Sandbox uses:
- Next.js 16.1.6 App Router, TypeScript, Tailwind v4
- Prisma v7 with PostgreSQL (Neon), generated client at `app/generated/prisma`
- Auth via `x-demo-user-email` header; client-side: `useAuth()` from `app/lib/auth-context.tsx`
- Icons: lucide-react ONLY
- UI pattern: `border-2 rounded-2xl border-gray-200` cards, `font-extrabold` h1/h2, UK Blue `#0033A0`
- No new npm dependencies
- Read `the-sandbox/CLAUDE.md` for all coding constraints

### Sprint M9 Complete — Available Files & Exports

**ExamForgePanel:** `the-sandbox/app/components/exam-forge/ExamForgePanel.tsx`
- Props: `{ courseId: string }`
- Dual-view panel: student view (upcoming assessments, generate practice exams, past exam history) + educator view (aggregate stats, concept weakness breakdown)
- Integrated into course detail page (`app/courses/page.tsx`) as CollapsibleSection in assignments tab

**Exam Forge Sub-Components:**
- `ExamCard.tsx` — upcoming exam card with "Practice" button
- `QuestionCard.tsx` — individual question renderer (MC radio + textarea)
- `ExamResults.tsx` — results view with score, concept breakdown, weakness report, question review
- `ConceptBreakdown.tsx` — per-concept score visualization bars
- `ExamConfigModal.tsx` — question count slider + generate button

**Exam Forge Service:** `the-sandbox/app/lib/exam-forge-service.ts`
- `generatePracticeExam(userId, courseId, options?)` → `PracticeExamResponse`
- `submitPracticeExam(examId, userId, answers)` → `ExamResultResponse`
- `listPracticeExams(userId, courseId?)` → `PracticeExamSummary[]`
- `getExamForgeStats(courseId)` → `ExamForgeStatsResponse` (educator aggregate analytics)

**Exam Forge API Routes:**
- `GET /api/exam-forge?courseId=X` → list student's practice exams
- `POST /api/exam-forge` → generate practice exam `{ courseId, targetAssignmentId?, questionCount? }`
- `GET /api/exam-forge/[examId]` → exam details (answers stripped if not completed)
- `POST /api/exam-forge/[examId]/submit` → grade and return results `{ answers: [{questionId, answer}] }`
- `GET /api/exam-forge/stats?courseId=X` → educator-only aggregate stats

**Exam Forge Pages:**
- `/exam-forge` — `app/exam-forge/page.tsx` — standalone list page with course selector
- `/exam-forge/[examId]` — `app/exam-forge/[examId]/page.tsx` — exam taking + results view

**Integration point in courses page:** `app/courses/page.tsx:895` — `ExamForgePanel` rendered as CollapsibleSection in assignments tab

### Already Built for Teach It Back (from earlier sprints)

**Prisma Model:** `TeachBackSession` already exists in `prisma/schema.prisma` (line 4308+)
- Fields: id, userId, courseId, conceptSlug, conceptLabel, transcript (Json), turnCount, teachingScore, accuracyScore, clarityScore, bloomAchieved, misconceptionsCovered, completedAt, createdAt
- Relations to User and Course already wired

**Teach Back Service:** `the-sandbox/app/lib/teach-back-service.ts` (ALREADY EXISTS)
- `startTeachBack(userId, courseId, conceptSlug?)` — select concept + create session + first AI message
- `sendTeachBackMessage(sessionId, userId, message)` — append turn + AI student reply
- `completeTeachBack(sessionId, userId)` — Sonnet evaluation + SR/Bloom updates
- `listTeachBackSessions(userId, courseId?)` — metadata-only list
- **NOTE:** Has 2 pre-existing TS errors (Prisma Json casting on `transcript` field at lines 221, 324) — fix these if you encounter them

**NOT yet built:**
- API routes under `app/api/teach-back/`
- UI components under `app/components/teach-back/`
- Page at `app/teach-back/[sessionId]/page.tsx`

### The Goal
Execute ONLY these 2 tasks, then STOP:

**Task 19: Create Teach It Back API routes**
- Read the Teach It Back section (#5) in `magic-moments-architecture.md` for full spec
- Create API routes:
  - `POST /api/teach-back/start` — start a teaching session
  - `POST /api/teach-back/[sessionId]/message` — send a message in the session
  - `POST /api/teach-back/[sessionId]/complete` — evaluate and score the session
  - `GET /api/teach-back?courseId=X` — list sessions (optional)
- Auth: student-only (`requireStudentUser`)
- Follow thin route pattern: auth → parse → call lib → return
- Fix the 2 TS errors in teach-back-service.ts (lines 221, 324) — use `Prisma.InputJsonValue` cast

**Task 20: Create TeachItBackPanel.tsx**
- Read the Teach It Back UI section in `magic-moments-architecture.md` for full spec
- Create `app/components/teach-back/TeachItBackPanel.tsx`
  - Shows eligible concepts (mastered, Bloom < 6) with "Teach It Back" buttons
  - Chat interface: user messages right-aligned, AI student left-aligned
  - Turn counter + Bloom target indicator
  - "Complete" button after 6+ turns → triggers evaluation
  - Results view: score gauges, dimension bars, Bloom badge, feedback narrative
- Create `app/teach-back/[sessionId]/page.tsx` — full-page teaching session
- Integrate launcher into course detail page (similar to ExamForgePanel)
- Follow existing card/header patterns from PLATFORM-CONSISTENCY-MANIFEST.md

### Key Constraints
- FERPA: Teaching sessions visible only to the student who created them
- No new npm dependencies
- Tailwind v4 only (no @apply, utility classes in JSX)
- Follow ALL constraints from CLAUDE.md

### The Next Link
After completing Tasks 19-20, generate a Handoff Prompt for Sprint M11 (Tasks 21-22):
- Task 21: Prerequisite Unpacker service + API routes
- Task 22: Prerequisite Unpacker UI (PrereqUnpackerPanel.tsx)
Include full Context section with M10 file paths and exports.
