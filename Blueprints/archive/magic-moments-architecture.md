# Magic Moments Architecture Blueprint

> **Status:** Phase 2 Approved — Ready for Sprint Execution
> **Author:** Staff Engineer + Product Architect
> **Created:** 2026-03-22
> **Scope:** 7 features, 14 sprints, ~28 tasks

---

## Philosophy

These are not features. They are **moments** — the instants where a student or educator stops and thinks *"this is the future."* Every moment shares one principle: **make invisible learning visible.** The Sandbox already tracks concept mastery, decay, transfer events, spaced repetition, and Bloom levels. These moments *surface* that intelligence in ways that feel magical.

**Design constraints (non-negotiable):**
- Zero new npm dependencies unless absolutely required (prefer recharts, lucide-react, existing stack)
- Every feature reads from existing data models first; new models only when necessary
- FERPA compliance: no sensitive session data surfaces; no cross-student PII leaks
- No gamification (XP, points, badges, leaderboards) — learning outcomes only
- UK Blue `#0033A0` accent; `rounded-2xl border-2 border-gray-200` card pattern; `font-extrabold` headers
- Tailwind v4 rules: no `@apply`, utility classes in JSX only, `size-N` not `w-N h-N`
- Auth: `x-demo-user-email` header on all API calls; `requireStudentUser()` / `requireEducatorUser()` guards
- Thin API routes: auth → parse → call lib → return

---

## Table of Contents

1. [Knowledge Constellation](#1-knowledge-constellation)
2. [Learning Time Machine](#2-learning-time-machine)
3. [Interstitial Micro-Reviews](#3-interstitial-micro-reviews)
4. [Exam Forge](#4-exam-forge)
5. [Teach It Back](#5-teach-it-back)
6. [Prerequisite Unpacker](#6-prerequisite-unpacker)
7. [Complementary Study Matching](#7-complementary-study-matching)

---

## 1. Knowledge Constellation

### Vision
A visual, interactive graph of everything a student is learning — or will learn across their entire degree. Two distinct modes:

**Mode A — Semester Constellation:** All current courses rendered as orbital clusters. Each cluster contains learning objectives, assignments, quizzes, and tools as nodes. Mastery colors the nodes (green = strong, amber = partial, red = weak, gray = not started). Transfer edges glow between concepts that connect across courses. Stale concepts dim and pulse.

**Mode B — Degree Arc:** The student's entire program laid out as a timeline. Semesters flow left-to-right. Each semester contains planned/completed courses. Milestone markers for major exams (Step 1, Bar, etc.), clinical rotations, capstone projects. Completed semesters show aggregate mastery; future semesters show planned courses with prerequisite chains.

### Data Sources (Already Exist)

| Data | Model/Service | What it provides |
|------|--------------|------------------|
| Current courses | `CourseEnrollment` + `Course` | Which courses student is in |
| Learning objectives | `LearningObjective` | Per-course objectives with Bloom levels |
| Assignments/quizzes | `Assignment` | Due dates, point values, types |
| Concept mastery | `StudentConceptMastery` | Per-concept mastery with decay |
| Mastery decay | `mastery-decay.ts` | Effective mastery after time decay |
| Spaced repetition | `ConceptState` | Due dates, stability, missed reviews |
| Transfer events | `TransferEvent` | Cross-course concept connections |
| Objective progress | `StudentObjectiveProgress` | Per-objective attempts/correct/mastery |
| Degree plan | `DegreePlan` + `PlannedCourse` | Future semester course layout |
| Transcript | `TranscriptRecord` | Completed courses with grades |
| Degree requirements | `DegreeRequirement` + `RequirementCourse` | What's needed for graduation |
| Catalog | `CatalogCourse` | Course metadata, prerequisites |
| Degree audit | `DegreeAuditResult` | Requirement satisfaction status |

### New Data Model

```prisma
// No new Prisma models required for v1.
// Constellation is a pure read-view over existing data.
// Future: ConstellationLayout for saved node positions (drag-and-drop).
```

### API Routes

#### `GET /api/constellation/semester`
**Auth:** `requireStudentUser()`
**Query:** `?semester=Spring+2026` (optional, defaults to current)
**Returns:**
```typescript
interface SemesterConstellation {
  semester: string                    // "Spring 2026"
  courses: CourseCluster[]
  transferEdges: TransferEdge[]       // cross-course concept links
  overallMastery: number              // weighted average across courses
  srDueCount: number                  // concepts needing review today
}

interface CourseCluster {
  courseId: string
  courseCode: string
  title: string
  color: string                       // assigned cluster color
  nodes: ConstellationNode[]
  edges: IntraCourseEdge[]            // prerequisite/sequence within course
  aggregateMastery: number            // average node mastery
}

interface ConstellationNode {
  id: string
  type: 'objective' | 'assignment' | 'concept' | 'tool'
  label: string
  // For objectives:
  bloomLevel?: string                 // "remember" | "understand" | ... | "create"
  masteryLevel?: number               // 0-1, after decay
  isStale?: boolean                   // decayed below threshold
  status?: 'not_started' | 'in_progress' | 'mastered'
  // For assignments:
  dueAt?: string                      // ISO date
  pointsPossible?: number
  submissionStatus?: 'pending' | 'submitted' | 'graded'
  score?: number
  // For concepts:
  effectiveMastery?: number           // after decay
  encounterCount?: number
  srDueDate?: string                  // next review date
  srOverdue?: boolean
  missedReviews?: number
  bloomHighWater?: number             // highest Bloom achieved
  // For tools:
  toolId?: string
  sessionCount?: number
  lastScore?: number
}

interface TransferEdge {
  concept: string
  sourceCourseId: string
  sourceCourseCode: string
  targetCourseId: string
  targetCourseCode: string
  sessionScore: number
}

interface IntraCourseEdge {
  fromNodeId: string
  toNodeId: string
  type: 'prerequisite' | 'sequence' | 'assesses'  // objective→assignment
}
```

**Service:** `app/lib/constellation-service.ts`
**Logic:**
1. Fetch enrolled courses for student + semester
2. For each course: fetch objectives, assignments, linked tools
3. Fetch `StudentObjectiveProgress` for all objectives
4. Fetch `StudentConceptMastery` for all concepts in `topConceptsThisWeek` + course concepts
5. Apply `mastery-decay.ts` to all concept masteries
6. Fetch `ConceptState` for SR due dates
7. Fetch `TransferEvent` where source or target is an enrolled course
8. Build node graph with edges (objective→assignment via `weekId` linkage, concept→objective via tag matching)

#### `GET /api/constellation/degree-arc`
**Auth:** `requireStudentUser()`
**Returns:**
```typescript
interface DegreeArc {
  program: {
    code: string                      // "LAW-JD"
    name: string
    totalCredits: number
    catalogYear: string
  }
  semesters: ArcSemester[]
  milestones: ArcMilestone[]
  requirementSatisfaction: RequirementStatus[]
  percentComplete: number
  estimatedGraduation: string         // "Spring 2028"
}

interface ArcSemester {
  label: string                       // "Fall 2025"
  semesterIndex: number               // 1-based year number
  status: 'completed' | 'current' | 'planned' | 'unplanned'
  courses: ArcCourse[]
  aggregateMastery?: number           // only for completed/current
  totalCredits: number
}

interface ArcCourse {
  courseCode: string
  title: string
  credits: number
  status: 'COMPLETED' | 'REGISTERED' | 'PLANNED' | 'WAIVED'
  grade?: string                      // for completed
  mastery?: number                    // aggregate concept mastery
  prerequisitesMet: boolean
  satisfiesRequirement?: string       // requirement name
}

interface ArcMilestone {
  label: string                       // "Step 1 Exam", "Clinical Rotations Begin"
  semesterLabel: string               // which semester it falls in
  type: 'exam' | 'rotation' | 'capstone' | 'graduation' | 'custom'
  status: 'completed' | 'upcoming' | 'far_future'
}

interface RequirementStatus {
  category: string                    // "CORE", "MAJOR", "GEN_ED"
  name: string
  creditsCompleted: number
  creditsRequired: number
  satisfied: boolean
}
```

**Service:** `app/lib/constellation-service.ts` (same file, separate function)
**Logic:**
1. Fetch student's `DegreePlan` with `PlannedCourse` includes
2. Fetch `TranscriptRecord` for completed courses
3. Fetch current enrollment from `CourseEnrollment`
4. Merge into unified timeline: completed → current → planned
5. Run `DegreeAuditResult` for requirement satisfaction (use cached if < 24h old, else re-run)
6. For completed/current semesters: aggregate concept mastery across courses
7. Build milestone markers from `DegreeProgram` metadata + course patterns (e.g., courses with "Clinical" or "Rotation" in title, courses matching capstone patterns)

### Component Hierarchy

```
ConstellationPage (/constellation)
├── ConstellationToggle (Mode A / Mode B switch)
├── SemesterConstellation (Mode A)
│   ├── ConstellationCanvas (SVG/Canvas rendering)
│   │   ├── CourseClusterGroup (per course, force-directed positioning)
│   │   │   ├── ClusterLabel (course code + title)
│   │   │   ├── ConstellationNode (circle per objective/assignment/concept)
│   │   │   │   ├── NodeTooltip (hover: mastery %, Bloom level, due date, SR status)
│   │   │   │   └── NodePulse (animation for stale/overdue nodes)
│   │   │   └── IntraCourseEdge (lines within cluster)
│   │   └── TransferEdgeLine (glowing arc between clusters)
│   ├── ConstellationLegend (color key: mastery levels, node types)
│   └── ConstellationStats (sidebar: overall mastery, SR due count, transfer events)
│
└── DegreeArcTimeline (Mode B)
    ├── ArcTrack (horizontal scrollable timeline)
    │   ├── SemesterColumn (per semester)
    │   │   ├── SemesterHeader (label + status badge)
    │   │   ├── CourseCard (per course, colored by status)
    │   │   │   ├── GradeBadge (if completed)
    │   │   │   ├── MasteryBar (if current/completed)
    │   │   │   └── PrerequisiteIndicator (met/unmet)
    │   │   └── SemesterCredits (total credits this semester)
    │   └── MilestoneMarker (exam/rotation/capstone diamond)
    ├── RequirementSidebar (degree requirement checklist)
    │   └── RequirementRow (category, progress bar, credits)
    └── GraduationTarget (endpoint with percent complete)
```

### Rendering Approach

**Semester Constellation (Mode A):**
- Use SVG with force-directed layout (lightweight custom implementation, no d3-force — just radial positioning per cluster)
- Each course cluster is a radial group: course label at center, nodes orbit at radius proportional to count
- Node radius: 8-16px scaled by mastery (higher mastery = larger)
- Node fill color: `#22c55e` (mastered, >0.75), `#f59e0b` (partial, 0.4-0.75), `#ef4444` (weak, <0.4), `#d1d5db` (not started)
- Stale nodes: pulsing opacity animation (CSS `@keyframes pulse`)
- SR overdue nodes: dashed border ring
- Transfer edges: curved SVG paths with `stroke-dasharray` animation (flowing particles effect)
- Click node → slide-out detail panel (mastery history, last session, SR schedule)

**Degree Arc (Mode B):**
- Horizontal scrollable container with CSS `overflow-x: auto`
- Semester columns: fixed width (200px), vertically stacked course cards
- Completed semesters: solid background, green left border
- Current semester: UK Blue `#0033A0` left border, slight glow
- Planned semesters: dashed border, lighter background
- Milestones: diamond markers on the timeline track between semesters
- Prerequisite chains: thin lines connecting course cards across semesters (only shown on hover)
- Requirement sidebar: collapsible, shows progress bars by category

### Integration Points

- **Student Home Page:** Add "My Constellation" card linking to `/constellation`
- **Course Page Overview Tab:** Add mini-constellation for single course (subset of Mode A)
- **Sandy:** Proactive message when transfer event detected: "Your Knowledge Constellation just grew — you connected [concept] across two courses!"
- **Student Analytics:** Link from concept mastery charts to constellation view

### Files to Create
```
app/constellation/page.tsx                              — Page component (Mode toggle + data fetching)
app/components/constellation/SemesterConstellation.tsx   — Mode A: SVG force-directed view
app/components/constellation/DegreeArcTimeline.tsx       — Mode B: horizontal timeline
app/components/constellation/ConstellationNode.tsx       — Individual node (circle + tooltip)
app/components/constellation/TransferEdgeLine.tsx        — Glowing cross-course edge
app/components/constellation/ConstellationLegend.tsx     — Color/type key
app/components/constellation/ConstellationStats.tsx      — Sidebar stats panel
app/components/constellation/ArcCourseCard.tsx           — Course card in degree arc
app/components/constellation/MilestoneMarker.tsx         — Diamond milestone indicator
app/components/constellation/RequirementSidebar.tsx      — Degree requirement checklist
app/lib/constellation-service.ts                         — Data aggregation service
app/api/constellation/semester/route.ts                  — Semester constellation endpoint
app/api/constellation/degree-arc/route.ts                — Degree arc endpoint
```

### Sprint Breakdown
- **Sprint M1 (Tasks 1-2):** Service layer + API routes for both modes
- **Sprint M2 (Tasks 3-4):** Semester Constellation SVG rendering + node interactions
- **Sprint M3 (Tasks 5-6):** Degree Arc Timeline + requirement sidebar
- **Sprint M4 (Tasks 7-8):** Integration (homepage card, Sandy proactives, analytics links) + polish

---

## 2. Learning Time Machine

### Vision
A timeline showing how a student's understanding has evolved over their academic journey. Not just scores — the actual arc of intellectual growth. Concept mastery trajectories, session quality trends, Bloom level progression, misconceptions overcome, and breakthrough moments (transfer events, mastery jumps).

Appears on the student homepage as a rich, scrollable timeline card. Each entry is a "learning event" — a scored session, a mastery change, a transfer detection, a misconception corrected.

### Data Sources (Already Exist)

| Data | Model | What it provides |
|------|-------|-----------------|
| Scored sessions | `ToolSession` | Score, conceptsTouched, bloomLevel, qualitySignal, startedAt |
| Mastery changes | `StudentConceptMastery` | firstSeenAt, lastSeenAt, masteryLevel over time |
| Transfer events | `TransferEvent` | Cross-course mastery detection with timestamp |
| Misconceptions | `ConceptState.firedMisconceptions` | Which misconceptions were overcome |
| Bloom progression | `LearnerObservationLog` | Per-turn Bloom readings with timestamps |
| Study plans | `StudyPlanLog` | When plans were generated and followed |
| SR events | `ConceptState` | Review schedule changes |

### New Data Model

```prisma
// No new models needed for v1.
// Timeline events are computed from existing timestamped records.
// Future: TimelineBookmark for student-pinned moments.
```

### API Route

#### `GET /api/timeline`
**Auth:** `requireStudentUser()`
**Query:** `?courseId=xxx&from=2026-01-01&to=2026-03-22&limit=50&offset=0`
**Returns:**
```typescript
interface LearningTimeline {
  events: TimelineEvent[]
  stats: {
    totalSessions: number
    conceptsMastered: number       // mastery > 0.75
    transferEvents: number
    misconceptionsOvercome: number
    bloomPeak: number              // highest confirmed Bloom level
    longestStreak: number          // consecutive days with productive sessions
  }
  hasMore: boolean
}

interface TimelineEvent {
  id: string
  timestamp: string                // ISO date
  type: 'session' | 'mastery_jump' | 'transfer' | 'misconception_cleared'
       | 'bloom_advance' | 'study_plan' | 'milestone'
  courseCode?: string
  title: string                    // human-readable event title
  description: string              // 1-2 sentence detail
  magnitude: 'minor' | 'notable' | 'breakthrough'  // visual emphasis
  metadata: Record<string, unknown> // type-specific data
}
```

**Event Generation Logic:**
- `session`: Every scored session with `qualitySignal` of "strong" or "partial" (filter out minimal/incomplete to avoid noise)
- `mastery_jump`: When `StudentConceptMastery.masteryLevel` increases by >0.2 in a single session → "breakthrough" magnitude
- `transfer`: Every `TransferEvent` → always "breakthrough" magnitude
- `misconception_cleared`: When a `ConceptState.firedMisconceptions` entry is overcome (concept mastery rises above 0.7 after misconception fired) → "notable"
- `bloom_advance`: When `ConceptState.bloomHighWater` increases by 2+ levels → "notable"
- `study_plan`: `StudyPlanLog` creation → "minor"
- `milestone`: Course completion, degree audit improvement → "notable"

**Service:** `app/lib/timeline-service.ts`

### Component Hierarchy

```
TimelineCard (on homepage — compact view, last 5 events)
├── TimelineHeader ("Your Learning Journey")
├── TimelineEventRow (compact: icon + title + date)
│   ├── EventIcon (type-specific lucide icon)
│   ├── EventTitle (bold, 1 line)
│   └── EventTimestamp (relative: "2 days ago")
├── TimelineStatsBar (sessions | concepts | transfers — inline)
└── ViewFullTimeline link → /timeline

TimelinePage (/timeline — full view)
├── TimelineFilters (course filter, date range, event type toggles)
├── TimelineChart (recharts AreaChart: daily session scores over time)
├── TimelineStream (scrollable event list)
│   ├── TimelineDateGroup (grouped by week)
│   │   └── TimelineEventCard (expanded: icon + title + description + metadata)
│   │       ├── BreakthroughBadge (for magnitude=breakthrough, gold glow)
│   │       ├── ConceptTags (concepts touched, colored by mastery)
│   │       └── CourseLabel (course code badge)
│   └── LoadMoreButton (pagination)
└── TimelineInsights (AI-generated summary: "This month you..." — cached, regenerated weekly)
```

### Files to Create
```
app/timeline/page.tsx                               — Full timeline page
app/components/timeline/TimelineCard.tsx             — Homepage compact widget
app/components/timeline/TimelineEventCard.tsx        — Individual event card
app/components/timeline/TimelineChart.tsx            — Recharts area chart
app/components/timeline/TimelineFilters.tsx          — Filter controls
app/components/timeline/TimelineInsights.tsx         — AI summary panel
app/lib/timeline-service.ts                          — Event aggregation from existing models
app/api/timeline/route.ts                            — Timeline events endpoint
```

### Sprint Breakdown
- **Sprint M5 (Tasks 9-10):** Timeline service + API route (event aggregation logic)
- **Sprint M6 (Tasks 11-12):** Timeline page + homepage card + recharts visualization

---

## 3. Interstitial Micro-Reviews

### Vision
When a student is about to enter a course (clicking into their course page or launching a tool), a brief 30-second review card appears — one concept from their spaced repetition queue that's due or overdue. "Quick — before you start: What's the difference between hearsay and an admission?" Flip to reveal. If they get it right, SR stability doubles. If wrong, flag for Sandy.

Appears as a modal overlay on the course detail page and/or tool launch flow. Dismissable. Throttled to max 1 per course visit per day.

### Data Sources (Already Exist)

| Data | Model/Service | What it provides |
|------|--------------|------------------|
| Due concepts | `ConceptState` via `sr-scheduler.ts` | Concepts overdue for review |
| Misconception hints | `MisconceptionTaxonomy` | Remediation hints for wrong answers |
| Bloom high water | `ConceptState.bloomHighWater` | Appropriate question difficulty |
| Course context | `CourseEnrollment` + `Course` | Which course the review targets |

### New Data Model

```prisma
model MicroReview {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId       String
  course        Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  conceptSlug   String
  question      String   @db.Text    // AI-generated review question
  answer        String   @db.Text    // Expected answer
  bloomLevel    Int                  // question Bloom level (matched to bloomHighWater)
  studentAnswer String?  @db.Text    // what student responded (null if skipped)
  correct       Boolean?             // null if skipped
  responseTimeMs Int?                // how long they took
  skipped       Boolean  @default(false)
  createdAt     DateTime @default(now())

  @@index([userId, courseId])
  @@index([userId, createdAt])
}
```

### API Routes

#### `GET /api/micro-review`
**Auth:** `requireStudentUser()`
**Query:** `?courseId=xxx`
**Logic:**
1. Check throttle: has student seen a micro-review for this course in last 24 hours? If yes → `{ available: false }`
2. Call `sr-scheduler.getDueConcepts(userId, courseId)` → get overdue concepts sorted by `daysOverdue` DESC
3. If no due concepts → `{ available: false }`
4. Pick top concept. Use its `bloomHighWater` to calibrate difficulty.
5. Call Haiku to generate a review question + answer at the appropriate Bloom level
6. Create `MicroReview` record (question, answer, bloomLevel)
7. Return `{ available: true, review: { id, question, bloomLevel, conceptSlug, courseName } }`

**Returns:**
```typescript
interface MicroReviewResponse {
  available: boolean
  review?: {
    id: string
    question: string
    bloomLevel: number
    conceptSlug: string
    conceptLabel: string    // human-readable concept name
    courseName: string
    daysOverdue: number
  }
}
```

#### `POST /api/micro-review/[id]/respond`
**Auth:** `requireStudentUser()`
**Body:** `{ answer: string }` or `{ skipped: true }`
**Logic:**
1. If skipped → update `MicroReview.skipped = true`, return
2. Call Haiku: "Is this answer correct for this question? Score 0-1." → threshold 0.6
3. Update `MicroReview`: `studentAnswer`, `correct`, `responseTimeMs`
4. If correct:
   - Call `sr-scheduler.computeNextReview()` with score=0.8 → doubles stability
   - Update `ConceptState`
5. If incorrect:
   - Call `sr-scheduler.computeNextReview()` with score=0.3 → halves stability
   - Return `{ correct: false, hint: remediationHint, correctAnswer: answer }`
6. Return `{ correct: boolean, nextReviewIn: "3 days" | "tomorrow", streak?: number }`

### Component Hierarchy

```
MicroReviewModal (overlay on course page / tool launch)
├── MicroReviewCard
│   ├── QuestionSide (front of card)
│   │   ├── ConceptBadge (concept name + course code)
│   │   ├── BloomIndicator (Bloom level icon)
│   │   ├── QuestionText (the review question)
│   │   ├── AnswerInput (text input or multiple choice)
│   │   └── ActionButtons (Submit | Skip | Not Now)
│   └── ResultSide (back of card, after submit)
│       ├── CorrectBadge / IncorrectBadge
│       ├── CorrectAnswer (if wrong)
│       ├── RemediationHint (if wrong + misconception exists)
│       └── NextReviewDate ("Next review in 3 days")
└── DismissButton (close modal, don't show again today)
```

### Integration Points

- **Course page:** On mount, check `/api/micro-review?courseId=X`. If available, show modal before course content renders.
- **Tool launch:** In `ChatInterface.tsx`, before first message, check for micro-review. Show inline card above chat.
- **Sandy:** After correct micro-review, Sandy can reference: "Nice — you nailed that review question on hearsay. Your retention is solid."
- **Throttle:** `localStorage` key `micro-review-{courseId}-{date}` prevents re-showing same day.

### Files to Create
```
app/components/micro-review/MicroReviewModal.tsx    — Modal overlay component
app/components/micro-review/MicroReviewCard.tsx     — Flip card with question/result
app/lib/micro-review-service.ts                     — Question generation + grading
app/api/micro-review/route.ts                       — GET: fetch review question
app/api/micro-review/[id]/respond/route.ts          — POST: submit answer
prisma/schema.prisma                                — Add MicroReview model
```

### Sprint Breakdown
- **Sprint M7 (Tasks 13-14):** Schema + service + API routes (question generation, SR integration)
- **Sprint M8 (Tasks 15-16):** Modal component + course page / tool launch integration

---

## 4. Exam Forge

### Vision
Based on a student's concept mastery profile, upcoming assessment dates, and course learning objectives, generate a *personalized* practice exam. Not random practice questions — a custom exam designed to maximally improve *this specific student*. Two students in the same course get completely different exams, both perfectly calibrated.

The exam targets: (1) weak concepts approaching a due date, (2) stale concepts that haven't been reviewed, (3) concepts at lower Bloom levels than the assessment expects, (4) misconceptions that have fired recently.

### Data Sources (Already Exist)

| Data | Model/Service | What it provides |
|------|--------------|------------------|
| Weak concepts | `StudentConceptMastery` + decay | Low-mastery concepts per course |
| SR due | `ConceptState` | Overdue reviews |
| Misconceptions | `MisconceptionTaxonomy` | Known pitfalls to probe |
| Upcoming exams | `Assignment` (type=quiz/exam) | Due dates + point values |
| Learning objectives | `LearningObjective` | Course goals with Bloom levels |
| Objective progress | `StudentObjectiveProgress` | Attempts, correct, mastery per objective |
| Bloom high water | `ConceptState.bloomHighWater` | Current vs. expected level |
| Domain modality | `StudentDomainModality` | Preferred question format |

### New Data Model

```prisma
model PracticeExam {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId         String
  course          Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title           String                // "Evidence Rules Practice Exam — March 22"
  targetAssignmentId String?            // the real exam this prepares for
  targetAssignment Assignment? @relation(fields: [targetAssignmentId], references: [id])
  strategy        Json                  // ExamStrategy: why these questions were chosen
  questions       Json                  // ExamQuestion[]: the generated exam
  questionCount   Int
  estimatedMinutes Int                  // AI-estimated completion time
  startedAt       DateTime?
  completedAt     DateTime?
  score           Float?               // overall score 0-1
  questionResults Json?                // per-question results
  conceptsTargeted String[]            // concepts this exam probes
  bloomDistribution Json               // { "remember": 2, "apply": 3, ... }
  createdAt       DateTime @default(now())

  @@index([userId, courseId])
  @@index([userId, createdAt])
}
```

### Type Definitions

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

### API Routes

#### `POST /api/exam-forge/generate`
**Auth:** `requireStudentUser()`
**Body:** `{ courseId: string, targetAssignmentId?: string, questionCount?: number }`
**Logic:**
1. Fetch student's `StudentConceptMastery` for course → apply decay → sort by weakness
2. Fetch `ConceptState` for overdue SR concepts
3. Fetch `MisconceptionTaxonomy` for recently fired misconceptions
4. Fetch `LearningObjective` with `StudentObjectiveProgress` → find Bloom gaps
5. Fetch `Assignment` by targetAssignmentId (or next upcoming exam) for scope
6. Build `ExamStrategy`: prioritize weak + stale + misconception concepts
7. Call Sonnet with strategy + course context → generate N questions (default 10)
   - Question distribution: 30% weak concepts, 25% stale concepts, 20% misconception probes, 25% Bloom gap pushers
   - Bloom distribution: match the target exam's expected levels (from objectives)
   - Format: use `StudentDomainModality` to weight question types
8. Create `PracticeExam` record
9. Return exam (questions without answers)

#### `POST /api/exam-forge/[examId]/submit`
**Auth:** `requireStudentUser()`
**Body:** `{ answers: { questionId: string, answer: string }[] }`
**Logic:**
1. Grade each answer: compare to correctAnswer (Haiku for short_answer/scenario, exact match for MC)
2. Calculate overall score
3. Per-question feedback via Haiku
4. Update `PracticeExam`: score, questionResults, completedAt
5. For each concept tested:
   - Call `upsertConceptMastery()` with question score
   - Call `upsertConceptStateAfterSession()` for SR update
6. Return results with feedback

#### `GET /api/exam-forge`
**Auth:** `requireStudentUser()`
**Query:** `?courseId=xxx`
**Returns:** List of student's practice exams (metadata only, not full questions)

### Component Hierarchy

```
ExamForgePage (/exam-forge)
├── ExamForgeHeader ("Exam Forge — Personalized Practice")
├── CourseSelector (dropdown of enrolled courses)
├── UpcomingExamsPanel (cards for each upcoming Assignment with dueAt)
│   └── ExamCard (title, due date, "Generate Practice Exam" button)
├── ExamConfigModal (question count slider, optional: focus areas)
│   └── GenerateButton → loading state → redirect to exam
│
├── ExamView (active exam — /exam-forge/[examId])
│   ├── ExamHeader (title, question count, estimated time, timer)
│   ├── QuestionList (scrollable)
│   │   └── QuestionCard (numbered, type-specific input)
│   │       ├── MCQuestion (radio buttons)
│   │       ├── ShortAnswerQuestion (textarea)
│   │       ├── ScenarioQuestion (longer textarea with context)
│   │       └── BloomBadge (indicates cognitive level)
│   ├── SubmitButton
│   └── ExitButton (save progress)
│
└── ExamResultsView (after submission)
    ├── ScoreSummary (overall %, letter grade equivalent)
    ├── ConceptBreakdown (per-concept score bars)
    ├── QuestionReview (expandable: question + your answer + correct + feedback)
    ├── WeaknessReport ("Focus on these 3 concepts before the real exam")
    └── RetakeButton ("Generate another exam targeting your weak spots")
```

### Integration Points

- **Course page:** "Exam Forge" button in Assignments tab when exam is upcoming (< 7 days)
- **Sandy:** "You have an Evidence Rules exam in 3 days. Want me to generate a practice exam targeting your weak spots?"
- **Post-exam:** Sandy references results: "Your Exam Forge score on hearsay was 40%. Let's work on that."
- **Session analytics:** Practice exam sessions contribute to concept mastery and SR scheduling

### Files to Create
```
app/exam-forge/page.tsx                              — Exam list + generation UI
app/exam-forge/[examId]/page.tsx                     — Active exam taking view
app/components/exam-forge/ExamCard.tsx                — Upcoming exam card
app/components/exam-forge/QuestionCard.tsx            — Individual question renderer
app/components/exam-forge/ExamResults.tsx             — Results + feedback view
app/components/exam-forge/ConceptBreakdown.tsx        — Per-concept score visualization
app/lib/exam-forge-service.ts                        — Strategy builder + Sonnet generation
app/api/exam-forge/route.ts                          — GET list, POST generate
app/api/exam-forge/[examId]/route.ts                 — GET exam details
app/api/exam-forge/[examId]/submit/route.ts          — POST submit answers
prisma/schema.prisma                                 — Add PracticeExam model
```

### Sprint Breakdown
- **Sprint M9 (Tasks 17-18):** Schema + service (strategy builder, Sonnet question generation)
- **Sprint M10 (Tasks 19-20):** Exam UI (question cards, submission, results view) + course page integration

---

## 5. Teach It Back

### Vision
"See one, do one, teach one." After mastering a concept, challenge the student to explain it to an "AI student" who asks confused follow-up questions. The AI calibrates its confusion to the student's Bloom level. This is the ultimate test — if you can teach it, you truly understand it. Successful teaching pushes the concept to Bloom level 6 (Create) and reinforces SR stability.

### Data Sources (Already Exist)

| Data | Model/Service | What it provides |
|------|--------------|------------------|
| Mastered concepts | `StudentConceptMastery` | Concepts with mastery > 0.75 |
| Bloom high water | `ConceptState.bloomHighWater` | Current vs. target level |
| Course objectives | `LearningObjective` | Context for what "correct" looks like |
| Misconceptions | `MisconceptionTaxonomy` | Common wrong explanations to test for |

### New Data Model

```prisma
model TeachBackSession {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId         String
  course          Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  conceptSlug     String
  conceptLabel    String                // human-readable name
  transcript      Json                  // { role: string, content: string }[]
  turnCount       Int      @default(0)
  teachingScore   Float?               // 0-1 AI assessment of teaching quality
  accuracyScore   Float?               // 0-1 factual correctness
  clarityScore    Float?               // 0-1 explanation clarity
  bloomAchieved   Int?                 // Bloom level demonstrated (should be 5-6)
  misconceptionsCovered String[]       // misconceptions the student correctly addressed
  completedAt     DateTime?
  createdAt       DateTime @default(now())

  @@index([userId, courseId])
  @@index([userId, createdAt])
}
```

### API Routes

#### `POST /api/teach-back/start`
**Auth:** `requireStudentUser()`
**Body:** `{ courseId: string, conceptSlug?: string }`
**Logic:**
1. If no conceptSlug: pick best candidate — highest mastery concept that hasn't been "taught back" yet, with Bloom < 6
2. Validate concept mastery > 0.6 (must have reasonable understanding to teach)
3. Fetch misconceptions for this concept from `MisconceptionTaxonomy`
4. Create `TeachBackSession`
5. Build AI student system prompt:
   - "You are a confused student trying to learn [concept]. You are in [course]."
   - "Start by asking the user to explain the concept to you."
   - "Ask follow-up questions that probe common misconceptions: [list from taxonomy]"
   - "Gradually increase the sophistication of your questions."
   - "After 6-8 exchanges, thank them and say you understand now."
   - "Never correct them — let them discover errors through your questions."
6. Return session ID + first AI message ("Hey, I'm really struggling with [concept]. Can you explain it to me?")

#### `POST /api/teach-back/[sessionId]/message`
**Auth:** `requireStudentUser()`
**Body:** `{ message: string }`
**Logic:**
1. Append to transcript
2. Call Haiku with full transcript + AI student persona
3. If turn count > 8: trigger wrap-up (AI student says "I think I get it now!")
4. Return AI response

#### `POST /api/teach-back/[sessionId]/complete`
**Auth:** `requireStudentUser()`
**Logic:**
1. Call Sonnet to evaluate transcript:
   - `teachingScore`: 0-1 overall quality
   - `accuracyScore`: 0-1 factual correctness
   - `clarityScore`: 0-1 explanation quality
   - `bloomAchieved`: typically 5 (Evaluate) or 6 (Create)
   - `misconceptionsCovered`: which common pitfalls were addressed
2. Update `TeachBackSession` with scores
3. If `teachingScore > 0.7`:
   - Update `ConceptState.bloomHighWater` to `bloomAchieved` (if higher)
   - Boost SR stability by 2x
   - Update `StudentConceptMastery` with success
4. Return evaluation + personalized feedback

### Component Hierarchy

```
TeachBackLauncher (button on course page / constellation node context menu)
├── ConceptPicker (if no concept specified — shows teachable concepts)

TeachBackPage (/teach-back/[sessionId])
├── TeachBackHeader
│   ├── ConceptBadge (concept name + course)
│   ├── TurnCounter ("Turn 3 of ~8")
│   └── BloomTarget ("Target: Create level")
├── ChatArea (scrollable transcript)
│   └── MessageBubble (AI student = left, user = right)
├── MessageInput (text input + send button)
├── CompleteButton (appears after 6+ turns)
│
└── TeachBackResults (after completion)
    ├── ScoreGauge (teaching score — circular gauge)
    ├── DimensionScores (accuracy, clarity — horizontal bars)
    ├── BloomBadge ("You demonstrated Bloom Level 6: Create!")
    ├── MisconceptionChecklist (which ones you covered / missed)
    ├── FeedbackNarrative (AI-generated coaching: "Your explanation of X was excellent, but you missed the nuance of Y")
    └── ConstellationImpact ("This concept is now at peak mastery in your constellation!")
```

### Integration Points

- **Constellation:** Mastered nodes (green) show "Teach It Back" in context menu
- **Sandy:** "You've mastered [concept] — want to lock it in by teaching it to someone? The best way to learn is to teach."
- **Course page:** "Teach It Back" section in Learning Path when concepts reach mastery threshold
- **Timeline:** TeachBack completions appear as "breakthrough" events

### Files to Create
```
app/teach-back/[sessionId]/page.tsx                 — Teaching session UI
app/components/teach-back/TeachBackLauncher.tsx      — Launch button + concept picker
app/components/teach-back/TeachBackResults.tsx       — Evaluation display
app/components/teach-back/ScoreGauge.tsx             — Circular score visualization
app/lib/teach-back-service.ts                       — Session management + evaluation
app/api/teach-back/start/route.ts                   — POST: start session
app/api/teach-back/[sessionId]/message/route.ts     — POST: send message
app/api/teach-back/[sessionId]/complete/route.ts    — POST: evaluate + score
prisma/schema.prisma                                — Add TeachBackSession model
```

### Sprint Breakdown
- **Sprint M11 (Tasks 21-22):** Schema + service (AI student persona, evaluation pipeline)
- **Sprint M12 (Tasks 23-24):** Chat UI + results view + constellation/course integration

---

## 6. Prerequisite Unpacker

### Vision
When a student is struggling with a concept, the system traces backward through prerequisite concepts to find the *root* gap. "You're stuck on integration not because you don't understand the technique, but because your limits knowledge has decayed to 0.3 mastery." It builds a prerequisite chain and recommends starting from the weakest link.

This is primarily a **Sandy capability enhancement** + a **visual component** that can appear in multiple contexts (constellation node detail, tool session sidebar, Sandy response).

### Data Sources (Already Exist)

| Data | Model/Service | What it provides |
|------|--------------|------------------|
| Concept mastery | `StudentConceptMastery` + decay | Current effective mastery |
| Course prerequisites | `CatalogCourse.prerequisitesParsed` | Course-level prereq chains |
| Map edges | `MapEdge` (PREREQUISITE type) | Within-course concept ordering |
| Requirement prerequisites | `RequirementCourse.prerequisites` | Degree requirement prereq courses |
| SR data | `ConceptState` | Stability, bloom level, missed reviews |

### New Data: Concept Prerequisite Graph

The current system tracks concept mastery but doesn't have an explicit **concept-to-concept prerequisite graph** (only course-to-course). We need a lightweight concept dependency mapping.

```prisma
model ConceptPrerequisite {
  id              String   @id @default(cuid())
  concept         String               // the target concept
  prerequisite    String               // the required concept
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

### API Routes

#### `POST /api/prerequisite-unpack`
**Auth:** `requireStudentUser()`
**Body:** `{ concept: string, courseId: string }`
**Logic:**
1. Fetch `StudentConceptMastery` for the target concept → confirm mastery < 0.6 (struggling)
2. Look up `ConceptPrerequisite` chain for this concept (recursive, max depth 4)
3. If no prerequisite records exist: call Haiku to infer prerequisites:
   - "For a student in [course], what are the prerequisite concepts needed to understand [concept]? Return as JSON array."
   - Insert inferred prerequisites into `ConceptPrerequisite` with source="ai_inferred"
4. For each prerequisite: fetch `StudentConceptMastery` → apply decay
5. Identify the **root gap**: the weakest prerequisite in the chain (lowest effective mastery)
6. Build recommendation: "Start here → then here → then you'll be ready for [concept]"
7. Return prerequisite chain with mastery values + root gap identification + recommended tools

**Returns:**
```typescript
interface PrerequisiteChain {
  targetConcept: string
  targetMastery: number
  chain: PrerequisiteNode[]
  rootGap: {
    concept: string
    effectiveMastery: number
    recommendedAction: string        // "Review [concept] using [tool]"
    recommendedToolId?: string
  }
  explanation: string                // AI narrative: "You're struggling with X because..."
}

interface PrerequisiteNode {
  concept: string
  effectiveMastery: number
  isStale: boolean
  isGap: boolean                    // mastery < 0.5
  depth: number                     // 0 = target, 1 = direct prereq, etc.
  courseId?: string
  courseCode?: string
}
```

### Component Hierarchy

```
PrerequisiteUnpackerPanel (slide-out or inline panel)
├── ChainVisualization (vertical tree: root → ... → target)
│   └── PrerequisiteNodeCard (concept name + mastery bar + gap flag)
│       ├── MasteryBar (colored by level)
│       ├── GapBadge (red "Root Gap" badge on weakest link)
│       └── ActionButton ("Review this concept" → launches recommended tool)
├── Explanation (AI narrative: why you're struggling)
└── RecommendedPath (ordered steps: "1. Review X → 2. Practice Y → 3. Return to Z")
```

### Integration Points

- **Sandy:** When a student shows frustration (frustrationScore > 0.7) on a concept with mastery < 0.5, Sandy can trigger: "Let me trace back to find where the confusion started..." → renders `PrerequisiteUnpackerPanel` inline
- **Constellation:** Click a weak (red) node → "Why am I struggling?" → shows prereq chain
- **Tool session:** If session score < 0.4, post-session card suggests "Let's find the root cause" → unpacker
- **Exam Forge results:** Weak concepts in results link to unpacker

### Files to Create
```
app/components/prerequisite/PrerequisiteUnpackerPanel.tsx  — Main panel component
app/components/prerequisite/ChainVisualization.tsx          — Tree visualization
app/components/prerequisite/PrerequisiteNodeCard.tsx        — Individual node
app/lib/prerequisite-service.ts                            — Chain resolution + AI inference
app/api/prerequisite-unpack/route.ts                       — POST: unpack chain
prisma/schema.prisma                                       — Add ConceptPrerequisite model
```

### Sprint Breakdown
- **Sprint M13 (Tasks 25-26):** Schema + service (chain resolution, AI inference, caching)
- **Sprint M14 (Tasks 27-28):** Panel component + Sandy/constellation/exam-forge integration

---

## 7. Complementary Study Matching

### Vision
Instead of random study groups, match students whose concept gaps are *complementary*. "You're strong in Evidence Rules but weak in Constitutional Law. Jamie is the opposite. You'd be perfect study partners — you can teach each other." The system finds pairs or small groups (3-4) where each member's strengths cover another's weaknesses.

### Data Sources (Already Exist)

| Data | Model/Service | What it provides |
|------|--------------|------------------|
| Concept mastery | `StudentConceptMastery` + decay | Per-student concept profiles |
| Course enrollment | `CourseEnrollment` | Who's in the same course |
| Domain modality | `StudentDomainModality` | Learning style compatibility |
| Bloom levels | `ConceptState.bloomHighWater` | Depth of understanding |
| Study group | `User.studyGroup` | A/B group (don't cross-contaminate) |

### FERPA Considerations

- **Critical:** Never expose student PII, grades, or individual mastery scores to other students
- Matching algorithm runs server-side; students see only: name, shared course, compatibility score, and *complementary topics* (not mastery numbers)
- Opt-in only: students must explicitly enable study matching
- Student can hide from matching at any time

### New Data Model

```prisma
model StudyMatchProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  optedIn         Boolean  @default(false)
  availableHours  Json?                 // { "Mon": ["14:00-16:00"], ... }
  preferredSize   Int      @default(3)  // 2-4
  updatedAt       DateTime @updatedAt
  createdAt       DateTime @default(now())
}

model StudyMatch {
  id              String   @id @default(cuid())
  courseId         String
  course          Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  members         Json                  // StudyMatchMember[]
  complementarityScore Float            // 0-1 how well gaps align
  matchReason     String   @db.Text     // human-readable explanation
  status          String   @default("suggested")  // "suggested" | "accepted" | "declined" | "active"
  createdAt       DateTime @default(now())
  expiresAt       DateTime              // matches expire after 2 weeks

  @@index([courseId])
}
```

### Type Definitions

```typescript
interface StudyMatchMember {
  userId: string
  name: string                         // first name only (FERPA)
  strengths: string[]                  // concept names (not scores)
  canHelpWith: string[]                // concepts this person can teach
  needsHelpWith: string[]             // concepts this person needs
}

interface MatchCandidate {
  userId: string
  conceptVector: Map<string, number>   // concept → effective mastery
  strengths: string[]                  // mastery > 0.75
  weaknesses: string[]                 // mastery < 0.5
}
```

### API Routes

#### `POST /api/study-match/opt-in`
**Auth:** `requireStudentUser()`
**Body:** `{ optedIn: boolean, availableHours?: Json, preferredSize?: number }`
**Logic:** Create/update `StudyMatchProfile`

#### `GET /api/study-match/suggestions`
**Auth:** `requireStudentUser()`
**Query:** `?courseId=xxx`
**Logic:**
1. Verify student has `StudyMatchProfile.optedIn = true`
2. Fetch all opted-in students in same course
3. For each student: build concept vector (all `StudentConceptMastery` with decay applied)
4. **Complementarity algorithm:**
   - For each pair (A, B): score = average of (A's strength on B's weakness) + (B's strength on A's weakness)
   - Normalize by number of complementary concepts
   - Filter: complementarityScore > 0.4 (meaningful overlap)
   - Bonus: +0.1 if `availableHours` overlap
   - Bonus: +0.05 if different `StudentDomainModality` (diverse perspectives)
5. Group into clusters of `preferredSize` using greedy matching
6. Generate match reasons via Haiku: "You're strong in [X], [Name] is strong in [Y]. Together you cover each other's gaps."
7. Create `StudyMatch` records
8. Return top 3 match suggestions

#### `POST /api/study-match/[matchId]/respond`
**Auth:** `requireStudentUser()`
**Body:** `{ action: "accept" | "decline" }`
**Logic:**
1. Update match status
2. If all members accept: status → "active", create `ChatGroup` for the match
3. Notify members via Sandy

### Component Hierarchy

```
StudyMatchPage (/study-match)
├── OptInCard (toggle + availability + preferred size)
├── CourseSelector (dropdown)
├── MatchSuggestions
│   └── MatchCard (per suggested match)
│       ├── MemberAvatars (initials, first name only)
│       ├── ComplementarityScore (visual meter)
│       ├── MatchReason ("You're strong in X, they're strong in Y")
│       ├── TopicOverlap (Venn diagram: your strengths | shared | their strengths)
│       └── ActionButtons (Accept | Decline)
└── ActiveMatches
    └── ActiveMatchCard (members + chat link + shared study plan suggestion)
```

### Integration Points

- **Course page:** "Find Study Partners" button in Overview tab (if opted in)
- **Sandy:** "I noticed you and 2 other students in Evidence Rules have complementary strengths. Want me to suggest a study group?"
- **Teach It Back:** Matched partners can do Teach It Back sessions with each other (human teaching, not AI)
- **Chat system:** Accepted matches auto-create `ChatGroup` with course channel

### Files to Create
```
app/study-match/page.tsx                              — Study match dashboard
app/components/study-match/MatchCard.tsx               — Individual match suggestion
app/components/study-match/OptInCard.tsx               — Opt-in controls
app/components/study-match/TopicOverlap.tsx            — Venn-style complementarity visual
app/lib/study-match-service.ts                         — Matching algorithm + clustering
app/api/study-match/opt-in/route.ts                    — POST: opt in/out
app/api/study-match/suggestions/route.ts               — GET: match suggestions
app/api/study-match/[matchId]/respond/route.ts         — POST: accept/decline
prisma/schema.prisma                                   — Add StudyMatchProfile, StudyMatch
```

### Sprint Breakdown
- **Sprint M15 (Tasks 29-30):** Schema + matching algorithm service + API routes
- **Sprint M16 (Tasks 31-32):** Match UI + course page integration + chat group creation

---

## Sprint Execution Sequence

### Dependency Graph

```
M1-M4: Knowledge Constellation (independent — can start immediately)
  ├── M2 depends on M1 (needs API data for rendering)
  ├── M3 depends on M1 (needs API data for rendering)
  └── M4 depends on M2+M3 (integration after both modes built)

M5-M6: Learning Time Machine (independent — can start immediately)
  └── M6 depends on M5 (needs API data for UI)

M7-M8: Interstitial Micro-Reviews (independent — can start immediately)
  └── M8 depends on M7 (needs API for modal)

M9-M10: Exam Forge (independent — can start immediately)
  └── M10 depends on M9 (needs API for exam UI)

M11-M12: Teach It Back (depends on nothing new, but enhanced by Constellation)
  └── M12 depends on M11

M13-M14: Prerequisite Unpacker (enhanced by Constellation and Exam Forge)
  └── M14 depends on M13

M15-M16: Complementary Study Matching (enhanced by Teach It Back)
  └── M16 depends on M15
```

### Recommended Execution Order

| Sprint | Feature | Tasks | Depends On | Rationale |
|--------|---------|-------|------------|-----------|
| **M1** | Constellation: Service + APIs | 1-2 | — | Foundation for visual identity |
| **M2** | Constellation: Semester View | 3-4 | M1 | Core student experience |
| **M3** | Constellation: Degree Arc | 5-6 | M1 | Long-horizon view |
| **M4** | Constellation: Integration | 7-8 | M2, M3 | Connect to homepage + Sandy |
| **M5** | Timeline: Service + API | 9-10 | — | Homepage enrichment |
| **M6** | Timeline: UI + Homepage | 11-12 | M5 | Student-facing timeline |
| **M7** | Micro-Reviews: Service + API | 13-14 | — | SR activation |
| **M8** | Micro-Reviews: UI + Integration | 15-16 | M7 | Course page enhancement |
| **M9** | Exam Forge: Service + API | 17-18 | — | Exam prep engine |
| **M10** | Exam Forge: UI + Integration | 19-20 | M9 | Student exam experience |
| **M11** | Teach It Back: Service + API | 21-22 | — | Bloom 6 activator |
| **M12** | Teach It Back: UI + Integration | 23-24 | M11 | Teaching experience |
| **M13** | Prerequisite Unpacker: Service | 25-26 | — | Root cause analysis |
| **M14** | Prerequisite Unpacker: UI | 27-28 | M13 | Sandy + constellation integration |
| **M15** | Study Matching: Service + API | 29-30 | — | Peer learning engine |
| **M16** | Study Matching: UI + Integration | 31-32 | M15 | Match experience |

### Parallelization Opportunities

These sprints can run in parallel (no dependencies):
- **M1** + **M5** + **M7** + **M9** (all service layers, independent)
- **M2** + **M6** + **M8** + **M10** (all UIs, once their service sprints complete)
- **M11** + **M13** + **M15** (second wave services)
- **M12** + **M14** + **M16** (second wave UIs)

---

## Handoff Prompt Template

Each sprint execution uses this handoff structure. The first handoff prompt (Sprint M1) follows below. After completing each sprint, the executing agent generates the next handoff prompt.

---

## First Handoff Prompt (Sprint M1)

```markdown
# Handoff Prompt — Sprint M1: Knowledge Constellation Service Layer + API Routes

## Context
You are building "Magic Moments" for The Sandbox — an AI-powered educational marketplace
at the University of Kentucky. The full architecture is documented in:
`c:\AA Code\Educator marketplace\Blueprints\magic-moments-architecture.md`

Read that file first for complete context. You are executing Sprint M1 (Tasks 1-2).

The Sandbox uses:
- Next.js 16.1.6 App Router, TypeScript, Tailwind v4
- Prisma v7 with PostgreSQL (Neon), generated client at `app/generated/prisma`
- Auth via `x-demo-user-email` header; guards in `app/lib/server-auth.ts`
- Thin API routes: auth → parse → call lib → return
- Existing services: `student-context-api.ts`, `concept-mastery-service.ts`,
  `mastery-decay.ts`, `sr-scheduler.ts`, `episodic-memory-service.ts`
- Key models: StudentConceptMastery, ConceptState, TransferEvent,
  StudentObjectiveProgress, LearningObjective, Assignment, DegreePlan,
  PlannedCourse, TranscriptRecord, DegreeAuditResult, CourseEnrollment

## The Goal
Execute ONLY these 2 tasks, then STOP:

### Task 1: Create `app/lib/constellation-service.ts`
Build the data aggregation service with two main functions:

**`getSemesterConstellation(userId, semester?)`**
- Fetch enrolled courses for student (current semester if not specified)
- For each course: fetch LearningObjectives, Assignments, linked Tools
- Fetch StudentObjectiveProgress for all objectives
- Fetch StudentConceptMastery → apply mastery-decay.ts
- Fetch ConceptState for SR due dates via sr-scheduler.ts
- Fetch TransferEvent where source/target is enrolled course
- Build ConstellationNode[] for each course (objectives, assignments, concepts, tools)
- Build IntraCourseEdge[] (objective→assignment via weekId, concept→objective via tag)
- Build TransferEdge[] for cross-course connections
- Return SemesterConstellation type (see architecture doc for exact interface)

**`getDegreeArc(userId)`**
- Fetch student's DegreePlan with PlannedCourse includes
- Fetch TranscriptRecord for completed courses
- Fetch current CourseEnrollment
- Merge into ArcSemester[] timeline: completed → current → planned
- Check for cached DegreeAuditResult (< 24h); use or note unavailable
- For completed/current: aggregate concept mastery across courses
- Build milestone markers from course titles/patterns
- Return DegreeArc type (see architecture doc for exact interface)

### Task 2: Create API routes
**`app/api/constellation/semester/route.ts`**
- GET handler
- Auth: requireStudentUser()
- Query param: ?semester=Spring+2026 (optional)
- Calls getSemesterConstellation()
- Returns JSON

**`app/api/constellation/degree-arc/route.ts`**
- GET handler
- Auth: requireStudentUser()
- Calls getDegreeArc()
- Returns JSON

## The Specs
- Read existing service files for patterns: `app/lib/student-context-api.ts`,
  `app/lib/concept-mastery-service.ts`, `app/lib/sr-scheduler.ts`
- Read `app/lib/server-auth.ts` for auth guard patterns
- Read any existing API route for the thin handler pattern
- Follow all constraints from CLAUDE.md (read it first)
- No new npm dependencies
- No new Prisma models needed for this sprint
- Export TypeScript interfaces for all return types

## The Next Link
After completing Tasks 1-2, generate a Handoff Prompt for Sprint M2 (Tasks 3-4):
- Task 3: Create SemesterConstellation SVG component with force-directed layout
- Task 4: Create ConstellationNode, TransferEdgeLine, ConstellationLegend components
Include the same Context section, updated to note M1 is complete and which files were created.
```

---

## Summary

| # | Feature | New Models | New Services | New API Routes | New Components | Sprints |
|---|---------|-----------|-------------|---------------|----------------|---------|
| 1 | Knowledge Constellation | 0 (v1) | 1 | 2 | 10 | M1-M4 |
| 2 | Learning Time Machine | 0 | 1 | 1 | 5 | M5-M6 |
| 3 | Interstitial Micro-Reviews | 1 | 1 | 2 | 2 | M7-M8 |
| 4 | Exam Forge | 1 | 1 | 3 | 5 | M9-M10 |
| 5 | Teach It Back | 1 | 1 | 3 | 4 | M11-M12 |
| 6 | Prerequisite Unpacker | 1 | 1 | 1 | 3 | M13-M14 |
| 7 | Complementary Study Matching | 2 | 1 | 3 | 3 | M15-M16 |
| **Total** | | **6** | **7** | **15** | **32** | **16** |
