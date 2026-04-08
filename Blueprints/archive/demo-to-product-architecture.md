# Demo to Product: Architecture for the Next Sprint
### The Sandbox — University of Kentucky
### Status: Ready to build. Ordered by ROI.

---

## The Problem in One Sentence

The Sandbox has real infrastructure tracking real sessions — `ToolSession`, `ChatMessage`, `MetricEvent` are all populated — but the home dashboard and analytics pages ignore all of it and render hardcoded constants instead.

Fixing this is not a data model problem. It is a query problem. Most of this sprint is API routes and component wiring, not schema changes.

---

## What Already Works (Don't Rebuild)

`GET /api/tools/[id]/analytics` is a fully-realized real-data analytics endpoint. It queries sessions, upvotes, favorites, and MetricEvents using real Prisma aggregations. The pattern to follow for everything in this document already exists in that file.

The per-tool analytics page works. The home dashboard and role-level analytics pages don't.

---

## Build Sequence

| # | Work Item | Effort | Impact |
|---|---|---|---|
| 1 | Real dashboard data API | 2 days | Highest — affects every demo |
| 2 | Suggested For You (homepage) | 3 hours | Demo polish, replaces Discovery Feed gap |
| 3 | ELI5 button | 3 hours | Student UX win, already spec'd |
| 4 | Assignment + Gradebook | 2 sprints | Canvas replacement argument |
| 5 | Faculty Avatar with RAG | 1 sprint | "Wow" demo moment |
| 6 | Real analytics pipeline | 1 sprint | Platform measurability |

---

## Item 1 — Real Dashboard Data

### The Problem

`app/page.tsx` contains two large hardcoded constants — `STUDENT_PROFILES` and `EDUCATOR_PROFILES` — that supply all dashboard values. Real session data in Neon is never read.

### New Route: `GET /api/dashboard`

This route replaces both constants. It reads the authenticated user's role and returns appropriate data.

**File:** `app/api/dashboard/route.ts`

```typescript
// Returns different shapes based on role:

// STUDENT response:
{
  streak: number                          // consecutive days with a session
  totalSessions: number
  totalMinutes: number                    // sum of (endedAt - startedAt)
  avgScore: number | null                 // avg of numeric MetricEvents named 'score'
  recentSessions: {
    toolId: string
    toolName: string
    toolCategory: string
    date: string                          // relative: "2 hours ago"
    score: number | null
    topic: string | null                  // from MetricEvent 'topic' or null
  }[]
  suggestedTools: ToolWithDetails[]       // see Item 2
}

// EDUCATOR / ADMIN response:
{
  toolsPublished: number
  activeStudents: number                  // distinct userIds in sessions on their tools, last 30d
  totalSessions: number
  avgScore: number | null
  recentActivity: {
    studentName: string
    toolName: string
    date: string
    score: number | null
  }[]
}
```

### Specific Queries

**Student streak** — application-level calculation after fetching session dates:

```typescript
// Fetch all session start dates for the user
const sessions = await prisma.toolSession.findMany({
  where: { userId },
  select: { startedAt: true },
  orderBy: { startedAt: 'desc' },
})

function computeStreak(sessions: { startedAt: Date }[]): number {
  const days = new Set(
    sessions.map(s => format(startOfDay(s.startedAt), 'yyyy-MM-dd'))
  )
  let streak = 0
  let cursor = startOfDay(new Date())
  while (days.has(format(cursor, 'yyyy-MM-dd'))) {
    streak++
    cursor = subDays(cursor, 1)
  }
  return streak
}
```

**Student totalMinutes** — sum of duration for completed sessions:

```typescript
const completedSessions = await prisma.toolSession.findMany({
  where: { userId, endedAt: { not: null } },
  select: { startedAt: true, endedAt: true },
})

const totalMinutes = Math.round(
  completedSessions.reduce((sum, s) => {
    return sum + differenceInMinutes(s.endedAt!, s.startedAt)
  }, 0)
)
```

**Student avgScore** — MetricEvent values are stored as `String`; parse to numeric:

```typescript
const scoreEvents = await prisma.metricEvent.findMany({
  where: { session: { userId }, metricName: 'score' },
  select: { metricValue: true },
})

const numericScores = scoreEvents
  .map(e => parseFloat(e.metricValue))
  .filter(v => !isNaN(v) && v >= 0 && v <= 100)

const avgScore = numericScores.length > 0
  ? Math.round(numericScores.reduce((a, b) => a + b, 0) / numericScores.length)
  : null
```

**Student recentSessions:**

```typescript
const recent = await prisma.toolSession.findMany({
  where: { userId },
  orderBy: { startedAt: 'desc' },
  take: 8,
  include: {
    tool: { select: { id: true, name: true, category: true } },
    metricEvents: {
      where: { metricName: { in: ['score', 'topic'] } },
      select: { metricName: true, metricValue: true },
    },
  },
})
```

**Educator activeStudents** — distinct users in last 30 days across their tools:

```typescript
const myToolIds = await prisma.tool
  .findMany({ where: { creatorId: userId }, select: { id: true } })
  .then(tools => tools.map(t => t.id))

const uniqueStudents = await prisma.toolSession.findMany({
  where: {
    toolId: { in: myToolIds },
    userId: { not: null },
    startedAt: { gte: subDays(new Date(), 30) },
  },
  select: { userId: true },
  distinct: ['userId'],
})
```

### Component Changes in `page.tsx`

1. Add `useDashboard()` hook or inline `useEffect` that calls `GET /api/dashboard`
2. Replace `STUDENT_PROFILES[currentUser.email] ?? GENERIC_STUDENT` with the API response
3. Replace `EDUCATOR_PROFILES[currentUser.email] ?? GENERIC_EDUCATOR` with the API response
4. Keep the shape of JSX identical — only swap the data source
5. Show skeleton loading states while the request is in flight (already have patterns in the file)
6. The `STUDENT_PROFILES`, `EDUCATOR_PROFILES`, `GENERIC_STUDENT`, `GENERIC_EDUCATOR` constants and the `StudentProfile` / `EducatorProfile` types can all be deleted once the route is wired

**What stays synthetic:** `upcomingDue` (the "Coming Up" right-column widget). This requires the Assignment model (Phase 2). Leave it hardcoded until gradebook is built; the widget degrades gracefully.

---

## Item 2 — Suggested For You (Homepage)

### Why This Exists

Discovery Feed was removed. Students now see a gap between "Jump Back In" and their profile card. This section fills it with tools that are actually relevant to them — sourced from their enrolled courses — using one cheap DB query.

### Logic

```
1. Get student's enrolled courseIds from CourseEnrollment
2. Get CourseToolLink records for those courseIds
3. Exclude tools already in the student's LibraryEntry (they have them)
4. Exclude tools the student has already used (ToolSession)
5. Return up to 3 tools, ordered by upvote count
6. Fallback: if no course-linked tools found, return top 3 APPROVED tools
   by upvote count that the student hasn't used
```

### New Route: `GET /api/dashboard/suggested-tools`

```typescript
// Returns: ToolWithDetails[] (max 3)
// Reuses the existing ToolWithDetails type from app/lib/types.ts

const enrollments = await prisma.courseEnrollment.findMany({
  where: { userId },
  select: { courseId: true },
})

const usedToolIds = await prisma.toolSession.findMany({
  where: { userId },
  select: { toolId: true },
  distinct: ['toolId'],
})

const savedToolIds = await prisma.libraryEntry.findMany({
  where: { userId },
  select: { toolId: true },
})

const excludeIds = new Set([
  ...usedToolIds.map(s => s.toolId),
  ...savedToolIds.map(l => l.toolId),
])

const courseTools = await prisma.courseToolLink.findMany({
  where: {
    courseId: { in: enrollments.map(e => e.courseId) },
    tool: {
      approvalStatus: 'APPROVED',
      id: { notIn: [...excludeIds] },
    },
  },
  include: {
    tool: {
      include: {
        creator: { select: { name: true, college: true, department: true, role: true } },
        _count: { select: { upvotes: true } },
      },
    },
  },
  orderBy: { tool: { upvotes: { _count: 'desc' } } },
  take: 3,
})
```

### Section Label

```
"Suggested For You"
subtitle: "From your enrolled courses"  (or "From your department" if fallback)
```

Render using `DiscoveryToolCard` — which was already deleted. A simplified card component is preferable here anyway: tool name, category color, creator, one-line description, and a "Save to Library" button. No full card needed.

---

## Item 3 — ELI5 "Explain Simpler" Button

### Location

`app/components/ChatInterface.tsx` — inside the message list, after the last assistant message only.

### Behaviour

- Only visible on the final assistant message when `isLoading === false`
- On click: injects a fixed prompt into the existing chat stream (no new API route)
- The injected prompt: `"Can you explain that more simply? Use plain language and a concrete everyday analogy — explain as if I've never studied this before."`
- After click: button disappears (a new message is in flight, so it's no longer the last message)

### Implementation Sketch

```tsx
// Inside the messages.map() render, after rendering the assistant message content:

{message.role === 'assistant' &&
 index === messages.length - 1 &&
 !isLoading && (
  <button
    type="button"
    onClick={() => sendMessage(
      "Can you explain that more simply? Use plain language and a concrete everyday analogy."
    )}
    className="mt-3 flex items-center gap-1.5 text-xs text-gray-400
               hover:text-[#0033A0] transition-colors"
  >
    <Lightbulb className="h-3.5 w-3.5" />
    Explain simpler
  </button>
)}
```

Add `Lightbulb` to the lucide-react import at the top of `ChatInterface.tsx`.

`sendMessage` is already available in the component — this reuses the same streaming path as user input.

---

## Item 4 — Assignment Submission + Gradebook

### Reference

The full data model, API routes, and AI scoring flow are already specified in:
`Blueprints/rag-gradebook-architecture.md` → Part 2

### Summary of What Gets Built

**New Prisma models:** `Assignment`, `AssignmentType`, `Rubric`, `RubricCriterion`, `RubricBand`, `Submission`, `GradebookEntry`, `GradebookStatus`

**New API routes:**
```
POST /api/courses/[courseId]/assignments       — create assignment (educator)
GET  /api/courses/[courseId]/assignments       — list (student: own; educator: all)
GET  /api/assignments/[id]                    — detail + rubric
POST /api/assignments/[id]/submit             — student submits; triggers AI scoring
GET  /api/gradebook/[entryId]                 — entry (student: if RELEASED; educator: always)
PATCH /api/gradebook/[entryId]               — educator approves / edits
POST /api/gradebook/[entryId]/release        — release to student
```

**New pages:**
```
/courses/[id]/assignments                     — list view (dual role)
/courses/[id]/assignments/[assignmentId]      — submit (student) / submissions list (educator)
/courses/[id]/gradebook                       — educator review queue
/courses/[id]/grades                          — student grade ledger
/courses/[id]/rubrics                         — rubric manager (educator)
```

### Demo Seed

BIO 201 (see `bio201-programmable-syllabus.md`) provides the first real rubric seed:
- 4 `Assignment` records: Exam 1–4 (15% each)
- 1 `Assignment`: Final Exam (20%)
- 1 `Rubric` "BIO 201 Exam 1" with 3 `RubricCriterion` records and point-valued `RubricBand` records

This gives the demo a concrete grading moment: a student submits a written answer to the buffer system question; the AI scores it against the 5-point criterion rubric; Dr. McClure reviews the AI draft and releases the grade.

### Build Order Within This Item

1. Schema migration + seed (no UI needed yet — validates the model)
2. `POST /api/assignments/[id]/submit` + AI scoring job (`app/lib/grading-service.ts`)
3. Educator gradebook review UI — this is the demo moment
4. Student submission UI and grade ledger
5. Rubric builder (manual first; "import from syllabus" is Phase 3)

---

## Item 5 — Faculty Avatar with RAG

### Reference

Full architecture is specified in:
`Blueprints/rag-gradebook-architecture.md` → Part 1

### Summary

**New Prisma model:** `DocumentChunk` with `embedding Unsupported("vector(1536)")`

**New lib files:**
```
app/lib/embedding-service.ts    — EmbeddingProvider interface (OpenAI now, Azure-ready)
app/lib/vector-store.ts         — VectorStore interface (pgvector now, Azure AI Search later)
app/lib/document-chunker.ts     — 512-token chunks, 64-token overlap, paragraph-first splits
app/lib/document-processor.ts  — orchestrates: parse → chunk → embed → store
```

**Upload flow change:** Wire `document-processor.ts` into the existing document upload route. Chunking and embedding happen synchronously for documents under ~50 pages; batched for larger ones.

**Inference flow change:** At `/api/chat`, before building the system prompt:
1. Embed the user's message
2. Call `vectorStore.similaritySearch(queryVector, courseId, topK=5)`
3. Inject the top-5 chunks into the system prompt under a `## Relevant Course Material` heading

### pgvector Setup (One Migration)

```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE "DocumentChunk" ADD COLUMN embedding vector(1536);
CREATE INDEX ON "DocumentChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### The Demo

Educator uploads their BIO 201 syllabus via the `/avatar` page. The system chunks it into ~40 pieces and embeds them. A student asks "What's on Exam 1?" Sandy retrieves the relevant schedule section and rubric appendix chunks and answers precisely. This works without any new UI — only the backend pipeline is new.

---

## Item 6 — Real Analytics Pipeline

### Current Gap

`/analytics/faculty` and `/analytics/student` render hardcoded values. The data exists in `ToolSession` and `ChatMessage` but has never been analyzed.

### Architecture: On-Demand Analysis

For the demo phase, analysis is triggered on-demand — when a session ends or when the analytics page is loaded — rather than via a background job. Production would use Inngest or a similar queue.

**New route: `POST /api/analytics/analyze-session`**

```typescript
// Called by the client when a session ends (after PUT /api/sessions/[id] with endedAt)
// Input: { sessionId }

// Flow:
// 1. Load ChatMessage[] for session
// 2. Build transcript string
// 3. Call Claude Sonnet with scoring prompt (see below)
// 4. Parse JSON response
// 5. Upsert MetricEvents: score, topic, engagement_level, flags
```

**Scoring prompt (Claude Sonnet, max 1024 tokens output):**

```
You are an educational analytics engine. Analyze this AI tutoring session transcript.

Return JSON only:
{
  "score": 0-100,              // estimated mastery demonstrated
  "topic": "string",           // primary topic covered, max 60 chars
  "engagement": "low"|"medium"|"high",
  "flags": string[]            // e.g. ["confusion", "off_topic", "academic_integrity"]
}

Rules:
- score 85-100: student demonstrates clear conceptual understanding
- score 70-84: mostly correct with minor gaps
- score 50-69: partial understanding, significant gaps
- score <50: significant confusion or minimal engagement
- flags array may be empty
- topic should be the specific subject matter, not the tool name

Transcript:
[ASSISTANT]: {welcome message}
[STUDENT]: ...
...
```

**New route: `GET /api/analytics/student`**

Returns real aggregates for the student analytics page:

```typescript
{
  totalSessions: number
  totalMinutes: number
  avgScore: number | null
  scoreHistory: { date: string; score: number }[]         // last 60 days
  topicCoverage: { topic: string; count: number }[]       // from MetricEvent 'topic'
  toolBreakdown: { toolName: string; sessions: number; avgScore: number }[]
  streak: number
  recentFlags: string[]                                    // for self-awareness
}
```

**New route: `GET /api/analytics/faculty`**

Returns real aggregates for the educator analytics page:

```typescript
{
  overview: {
    totalSessions: number
    activeStudents: number
    avgScore: number | null
    engagementTrend: { date: string; sessions: number }[] // last 30 days
  }
  studentBreakdown: {
    studentId: string
    studentName: string
    sessions: number
    avgScore: number | null
    lastSeen: string
    atRisk: boolean                                        // see below
  }[]
  topTools: { toolName: string; sessions: number; avgScore: number }[]
}
```

**At-risk flagging logic:**

```typescript
// A student is flagged at-risk if ANY of:
// - avgScore < 65 across last 5 sessions
// - No sessions in last 14 days (engagement drop)
// - 2+ 'confusion' flags in last 5 sessions

function isAtRisk(student: StudentStats): boolean {
  return (
    (student.recentAvgScore !== null && student.recentAvgScore < 65) ||
    differenceInDays(new Date(), student.lastSessionAt) > 14 ||
    student.recentFlags.filter(f => f === 'confusion').length >= 2
  )
}
```

---

## What Stays Synthetic (And Why)

| Data | Status | Reason |
|---|---|---|
| `upcomingDue` (Coming Up widget) | Stays synthetic | Requires `Assignment` model (Item 4). The widget is right-column; leave hardcoded until gradebook exists. |
| Demo user names in "Recent Activity" | Stays synthetic | Real session users are real — but the educator activity feed can show real student names from `toolSession.user.name` once Item 1 is built. The synthetic list goes away automatically. |
| `year` / `major` on student profile | Stays synthetic | No DB field for this. Add `year` and `major` to `User` model if needed, or leave as profile display text populated from seed data. Low priority. |
| League + Bracket stats | Stays synthetic | These have their own real DB tables. Not blocking. |

---

## File Change Summary

| File | Change |
|---|---|
| `app/api/dashboard/route.ts` | New — real data for home dashboard |
| `app/api/dashboard/suggested-tools/route.ts` | New — course-linked tool suggestions |
| `app/api/analytics/analyze-session/route.ts` | New — on-demand session scoring |
| `app/api/analytics/student/route.ts` | New — real student analytics |
| `app/api/analytics/faculty/route.ts` | New — real educator analytics |
| `app/page.tsx` | Replace `STUDENT_PROFILES`/`EDUCATOR_PROFILES` with dashboard API call; add Suggested For You section |
| `app/components/ChatInterface.tsx` | Add ELI5 button; call `analyze-session` on session end |
| `app/analytics/student/page.tsx` | Wire to real analytics route |
| `app/analytics/faculty/page.tsx` | Wire to real analytics route |
| `app/lib/grading-service.ts` | New — AI scoring against rubric (Item 4) |
| Gradebook pages | New (Item 4) |
| RAG lib files | New (Item 5) |
| `prisma/schema.prisma` | Add Assignment, Rubric, Submission, GradebookEntry, DocumentChunk models |

---

## Relationship to Other Blueprints

| Blueprint | Relationship |
|---|---|
| `rag-gradebook-architecture.md` | Items 4 and 5 implement it directly. This document adds specificity on sequencing and the demo seed story. |
| `bio201-programmable-syllabus.md` | Provides the seed data for Item 4 (Exam 1 rubric). Dr. McClure's course is the first live gradebook demo. |
| `canvas-killer-strategy.md` | Items 4 + 5 + 6 together constitute the Canvas replacement argument. Each item alone is a feature. Together they are a product. |
