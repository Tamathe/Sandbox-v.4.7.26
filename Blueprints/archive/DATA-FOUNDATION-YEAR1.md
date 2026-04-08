# Year 1 Data Foundation Sprint
## The Sandbox · University of Kentucky
### Lead Engineer Document — Living Spec
**Created:** 2026-03-19
**Goal:** Build the behavioral data layer that makes the platform measurably smarter than a human instructor over time. Zero features visible to users — all work is instrumentation, pipeline, and intelligence infrastructure.

---

## Why This Sprint Exists

The platform already captures `ToolSession.score`, `qualitySignal`, `StudentObjectiveProgress`, and LTI grade passback. That is a strong start. But the current data model answers **"did the student finish?"** — not **"how did they learn?"**

This sprint adds the signals needed to answer the harder questions:
- Did the student struggle and push through, or give up quickly?
- What concepts did they actually engage with in a session?
- Is their performance trending up or down over time?
- What time of day does this student do their best work?
- Is Sandy giving this student contextually relevant advice, or generic page-awareness?

None of this requires new user-facing UI. All of it is instrumentation and pipeline work that compounds in value every week the platform runs.

---

## Architecture Principle

> Every schema field added in this sprint must be computable from signals the platform already captures. We are not asking students for new information — we are extracting more insight from what they already give us.

---

## What Already Exists (Do Not Rebuild)

| Signal | Location | What It Gives Us |
|---|---|---|
| `ToolSession.score` | `session-analytics-service.ts` | 0.0–1.0 post-session quality |
| `ToolSession.qualitySignal` | Same | strong/partial/minimal/incomplete |
| `ToolSession.scoredAt` | Schema | Scoring timestamp |
| `ToolSession.startedAt` + `endedAt` | Schema | Time-on-task (compute `durationSeconds`) |
| `ToolSession.messageCount` | Schema | Total turn count |
| `ToolSession.summary` | Schema | AI wrap-up narrative |
| `ToolSession.sensitiveSession` | Schema | FERPA guard |
| `StudentObjectiveProgress` | Schema | Objective-level mastery |
| `Assignment.dueAt` | Schema | Deadline pressure signals |
| `ChatMessage` records | Schema | Full conversation transcript |
| `session-analytics-service.ts` | `app/lib/` | Post-session Haiku scorer — extend this |
| `concierge-service.ts` | `app/lib/` | Sandy context builder — extend this |

---

## Phase 1 — Session Enrichment (Schema + Scorer Extension)

**Goal:** Extract 4 new behavioral signals from every session transcript at scoring time. No new API routes. No UI changes. Pure pipeline.

### 1A — Schema additions to `ToolSession`

```prisma
model ToolSession {
  // ... existing fields unchanged ...

  // New fields — Year 1 Data Foundation
  durationSeconds     Int?     // endedAt - startedAt in seconds; null if session never ended
  hintCount           Int?     // number of times student asked clarifying/hint questions
  exitReason          String?  // "completed" | "abandoned" | "timeout"
  conceptsTouched     String[] // AI-extracted concept tags from session transcript
}
```

**Migration name:** `add-session-enrichment-fields`

**FERPA note:** `conceptsTouched` contains only concept labels (e.g. "hearsay exceptions", "FRE 803") — no student PII. Safe to include in educator analytics.

### 1B — Extend `app/lib/session-analytics-service.ts`

The existing `scoreSession()` function already:
1. Fetches the session + chatMessages + tool
2. Builds a transcript string
3. Calls Haiku for score + qualitySignal
4. Writes results back to the session record

**Extend step 3** — add to the Haiku prompt:

```
Also extract:
- hintCount: count the number of student turns that are asking for clarification, hints, or rephrasing (e.g. "can you explain that differently", "what does that mean", "I don't understand", "give me a hint"). Return 0 if none.
- conceptsTouched: extract up to 8 specific academic concepts, terms, or topics the student engaged with (not generic words like "learning" or "session"). Return as a JSON array of short strings.
- exitReason: "completed" if the session appears to have reached a natural conclusion; "abandoned" if it ends abruptly mid-thought or with very few messages (< 4 student turns); "timeout" if unclear.

Respond with ONLY valid JSON:
{
  "score": 0.0,
  "qualitySignal": "strong|partial|minimal|incomplete",
  "hintCount": 0,
  "conceptsTouched": ["concept1", "concept2"],
  "exitReason": "completed|abandoned|timeout"
}
```

**Extend step 4** — compute `durationSeconds` inline before the DB write:

```ts
const durationSeconds = session.endedAt && session.startedAt
  ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 1000)
  : null

await prisma.toolSession.update({
  where: { id: sessionId },
  data: {
    score,
    qualitySignal,
    scoredAt: new Date(),
    durationSeconds,
    hintCount: result.hintCount ?? null,
    conceptsTouched: result.conceptsTouched ?? [],
    exitReason: result.exitReason ?? null,
  },
})
```

**Increase `max_tokens`** from 100 → 300 to accommodate the larger JSON response.

### 1C — Backfill existing sessions (optional, low priority)

For sessions that already have `score` but no `durationSeconds`, a one-time backfill script can compute `durationSeconds` from `startedAt`/`endedAt` without re-calling Haiku. Add to `prisma/scripts/backfill-session-duration.ts` — do not run automatically, run manually after migration.

### Files touched (Phase 1)
| File | Change |
|---|---|
| `prisma/schema.prisma` | Add 4 fields to `ToolSession` |
| `app/lib/session-analytics-service.ts` | Extend prompt + parse result + write new fields |

---

## Phase 2 — StudentProfile Model

**Goal:** A persistent per-student intelligence record that aggregates session patterns into actionable signals. Updated after each scored session. Used by Sandy context injection (Phase 3) and future recommendation engine.

### 2A — Schema: new `StudentProfile` model

```prisma
model StudentProfile {
  id                  String    @id @default(cuid())
  userId              String    @unique
  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Learning style inference
  preferredModality   String?   // "dialogue" | "quiz" | "simulation" | "document" — derived from most-used tool types
  avgSessionLength    Int?      // rolling 30-day average session duration in seconds
  peakEngagementHour  Int?      // 0–23, hour-of-day with highest average score (local time)

  // Risk signals
  riskScore           Float?    // composite 0.0–1.0; updated after each session
  riskUpdatedAt       DateTime?

  // Progress signals
  learningVelocity    Float?    // score improvement rate per week (positive = improving, negative = declining)
  totalSessionCount   Int       @default(0)
  lastSessionAt       DateTime?

  // Concept coverage
  topConceptsThisWeek String[]  // union of conceptsTouched from last 7 days of sessions

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([userId])
}
```

**Migration name:** `add-student-profile`

**Add to User model:**
```prisma
studentProfile  StudentProfile?
```

### 2B — New lib: `app/lib/student-profile-service.ts`

Single exported function: `upsertStudentProfile(userId: string): Promise<void>`

**Logic:**

```ts
export async function upsertStudentProfile(userId: string): Promise<void> {
  // 1. Fetch recent sessions (last 30 days, non-sensitive, scored only)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const sessions = await prisma.toolSession.findMany({
    where: {
      userId,
      sensitiveSession: false,
      scoredAt: { not: null },
      startedAt: { gte: thirtyDaysAgo },
    },
    include: { tool: { select: { type: true } } },
    orderBy: { startedAt: 'desc' },
    take: 100,
  })

  if (sessions.length === 0) return

  // 2. Compute preferredModality — which tool type appears most
  const typeCounts = new Map<string, number>()
  for (const s of sessions) {
    typeCounts.set(s.tool.type, (typeCounts.get(s.tool.type) ?? 0) + 1)
  }
  const preferredModality = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  // 3. avgSessionLength — mean of non-null durationSeconds
  const durSessions = sessions.filter(s => s.durationSeconds != null)
  const avgSessionLength = durSessions.length > 0
    ? Math.round(durSessions.reduce((sum, s) => sum + s.durationSeconds!, 0) / durSessions.length)
    : null

  // 4. peakEngagementHour — group scored sessions by start hour, find highest avg score
  const hourScores = new Map<number, number[]>()
  for (const s of sessions) {
    if (s.score == null) continue
    const hour = s.startedAt.getHours()
    hourScores.set(hour, [...(hourScores.get(hour) ?? []), s.score])
  }
  let peakEngagementHour: number | null = null
  let bestAvg = -1
  for (const [hour, scores] of hourScores.entries()) {
    if (scores.length < 2) continue // need at least 2 data points
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    if (avg > bestAvg) { bestAvg = avg; peakEngagementHour = hour }
  }

  // 5. learningVelocity — slope of score over time (simple linear: last week avg vs prior week avg)
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thisWeek = sessions.filter(s => s.score != null && s.startedAt >= oneWeekAgo)
  const priorWeek = sessions.filter(s => s.score != null && s.startedAt < oneWeekAgo)
  let learningVelocity: number | null = null
  if (thisWeek.length >= 2 && priorWeek.length >= 2) {
    const thisAvg = thisWeek.reduce((sum, s) => sum + s.score!, 0) / thisWeek.length
    const priorAvg = priorWeek.reduce((sum, s) => sum + s.score!, 0) / priorWeek.length
    learningVelocity = Math.round((thisAvg - priorAvg) * 100) / 100
  }

  // 6. riskScore — composite of recent signals
  const recentSessions = sessions.slice(0, 10)
  const recentAvg = recentSessions.filter(s => s.score != null).length > 0
    ? recentSessions.filter(s => s.score != null).reduce((sum, s) => sum + s.score!, 0) /
      recentSessions.filter(s => s.score != null).length
    : null
  const daysSinceLastSession = sessions[0]
    ? Math.floor((Date.now() - sessions[0].startedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 999
  const abandonRate = sessions.filter(s => s.exitReason === 'abandoned').length / sessions.length

  let riskScore = 0
  if (recentAvg != null && recentAvg < 0.5) riskScore += 0.35
  if (daysSinceLastSession > 7) riskScore += 0.25
  if (abandonRate > 0.4) riskScore += 0.25
  if (learningVelocity != null && learningVelocity < -0.1) riskScore += 0.15
  riskScore = Math.min(1, riskScore)

  // 7. topConceptsThisWeek
  const topConceptsThisWeek = [...new Set(
    thisWeek.flatMap(s => s.conceptsTouched ?? [])
  )].slice(0, 10)

  // 8. Upsert
  await prisma.studentProfile.upsert({
    where: { userId },
    create: {
      userId,
      preferredModality,
      avgSessionLength,
      peakEngagementHour,
      riskScore,
      riskUpdatedAt: new Date(),
      learningVelocity,
      totalSessionCount: sessions.length,
      lastSessionAt: sessions[0]?.startedAt ?? null,
      topConceptsThisWeek,
    },
    update: {
      preferredModality,
      avgSessionLength,
      peakEngagementHour,
      riskScore,
      riskUpdatedAt: new Date(),
      learningVelocity,
      totalSessionCount: sessions.length,
      lastSessionAt: sessions[0]?.startedAt ?? null,
      topConceptsThisWeek,
      updatedAt: new Date(),
    },
  })
}
```

### 2C — Wire into `session-analytics-service.ts`

At the end of `scoreSession()`, after the successful DB write, add:

```ts
// Non-blocking — profile update runs after scoring completes
if (session.userId) {
  void upsertStudentProfile(session.userId).catch(err =>
    console.error('[student-profile] Failed to update profile:', err)
  )
}
```

Import: `import { upsertStudentProfile } from './student-profile-service'`

### Files touched (Phase 2)
| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `StudentProfile` model + relation on `User` |
| `app/lib/student-profile-service.ts` | CREATE — upsertStudentProfile() |
| `app/lib/session-analytics-service.ts` | Call upsertStudentProfile after scoring |

---

## Phase 3 — Sandy Context Injection

**Goal:** Make Sandy a real personalized academic advisor. Currently she knows what page the student is on. After this phase, she also knows the student's risk score, their weakest objective, their last session score, and how many days since they last studied.

### 3A — New lib: `app/lib/student-context-service.ts`

Single exported function: `getStudentContextString(userId: string, courseId?: string): Promise<string>`

```ts
export async function getStudentContextString(
  userId: string,
  courseId?: string
): Promise<string> {
  const [profile, weakestObjective, lastSession, upcomingDue] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId } }),

    prisma.studentObjectiveProgress.findFirst({
      where: {
        studentId: userId,
        masteryLevel: { in: ['struggling', 'not_started'] },
        ...(courseId ? { courseId } : {}),
      },
      include: { objective: { select: { title: true } } },
      orderBy: { updatedAt: 'asc' },
    }),

    prisma.toolSession.findFirst({
      where: { userId, scoredAt: { not: null }, sensitiveSession: false },
      include: { tool: { select: { name: true } } },
      orderBy: { startedAt: 'desc' },
    }),

    prisma.assignment.findFirst({
      where: {
        course: { enrollments: { some: { studentId: userId } } },
        dueAt: { gte: new Date(), lte: new Date(Date.now() + 72 * 60 * 60 * 1000) },
      },
      orderBy: { dueAt: 'asc' },
      select: { title: true, dueAt: true },
    }),
  ])

  const parts: string[] = []

  if (profile) {
    if (profile.riskScore != null && profile.riskScore > 0.5) {
      parts.push(`This student is showing signs of struggle (risk score: ${(profile.riskScore * 100).toFixed(0)}%).`)
    }
    if (profile.learningVelocity != null) {
      const trend = profile.learningVelocity > 0.05 ? 'improving' : profile.learningVelocity < -0.05 ? 'declining' : 'stable'
      parts.push(`Learning velocity is ${trend} (${profile.learningVelocity > 0 ? '+' : ''}${(profile.learningVelocity * 100).toFixed(0)}% week-over-week).`)
    }
    if (profile.preferredModality) {
      parts.push(`Preferred learning modality: ${profile.preferredModality}.`)
    }
    if (profile.topConceptsThisWeek.length > 0) {
      parts.push(`Concepts studied this week: ${profile.topConceptsThisWeek.slice(0, 5).join(', ')}.`)
    }
    if (profile.peakEngagementHour != null) {
      const hour = profile.peakEngagementHour
      const label = hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`
      parts.push(`Best performance hour: around ${label}.`)
    }
    if (profile.lastSessionAt) {
      const days = Math.floor((Date.now() - profile.lastSessionAt.getTime()) / (1000 * 60 * 60 * 24))
      if (days > 0) parts.push(`Last session: ${days} day${days !== 1 ? 's' : ''} ago.`)
    }
  }

  if (weakestObjective) {
    parts.push(`Current weakest objective: "${weakestObjective.objective.title}".`)
  }

  if (lastSession?.score != null) {
    const pct = Math.round(lastSession.score * 100)
    parts.push(`Last session ("${lastSession.tool.name}"): score ${pct}%.`)
  }

  if (upcomingDue) {
    const hours = Math.round((upcomingDue.dueAt!.getTime() - Date.now()) / (1000 * 60 * 60))
    parts.push(`Urgent deadline: "${upcomingDue.title}" due in ${hours} hours.`)
  }

  if (parts.length === 0) return ''

  return `\n\n[STUDENT CONTEXT — use to personalize responses, do not recite verbatim]\n${parts.join(' ')}`
}
```

### 3B — Wire into `app/lib/concierge-service.ts`

Find where the system prompt is assembled (the section that builds `systemPrompt` for the concierge call). After the existing page-context injection, add:

```ts
// Student context injection — personalized academic signals
if (user.role === 'STUDENT' && user.id) {
  try {
    const { getStudentContextString } = await import('./student-context-service')
    const studentContext = await getStudentContextString(
      user.id,
      body.courseId ?? undefined  // pass courseId if the concierge knows which course we're on
    )
    if (studentContext) {
      systemPrompt += studentContext
    }
  } catch {
    // Non-fatal — Sandy still works without context
  }
}
```

**Important:** This is STUDENT-only. Do not inject student-profile context into EDUCATOR or ADMIN concierge sessions — that would be a FERPA violation.

### Files touched (Phase 3)
| File | Change |
|---|---|
| `app/lib/student-context-service.ts` | CREATE — getStudentContextString() |
| `app/lib/concierge-service.ts` | Import + inject student context for STUDENT role |

---

## Phase 4 — A/B Study Group Tracking

**Goal:** Start generating the proof data. Without a control group, we can never measure whether the platform improves outcomes. This phase adds a lightweight flag with zero user-facing impact.

### 4A — Schema: add `studyGroup` to User

```prisma
model User {
  // ... existing fields ...
  studyGroup  String  @default("treatment") // "treatment" | "control" — for outcome measurement
}
```

**Migration name:** `add-user-study-group`

**Note:** All existing users default to `"treatment"`. A/B assignment logic (if needed) can be done via the admin panel or a one-time script. The field is a string (not an enum) to allow arbitrary cohort labels in the future.

### 4B — New admin API route: `app/api/admin/study-groups/route.ts`

Thin route (admin-only):
- `GET` — return count of users by studyGroup
- `PATCH` — accept `{ userId: string, studyGroup: string }` to assign a user

No UI needed yet — this is data infrastructure only. The admin panel can expose it as a future sprint.

### 4C — Include `studyGroup` in platform analytics

In `app/api/analytics/platform/route.ts`, add to the response:

```ts
const studyGroupCounts = await prisma.user.groupBy({
  by: ['studyGroup'],
  _count: { _all: true },
  where: { role: 'STUDENT' },
})
```

Return as `studyGroups: { group: string; count: number }[]`.

### Files touched (Phase 4)
| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `studyGroup` to User |
| `app/api/admin/study-groups/route.ts` | CREATE — thin admin route |
| `app/api/analytics/platform/route.ts` | Add studyGroup breakdown to response |

---

## Phase 5 — Concept Coverage Heatmap API

**Goal:** An endpoint that returns, per student per course, which concepts have been touched by AI sessions vs. which are untouched. Powers future "you haven't studied this yet" nudges and educator visibility.

### 5A — New API route: `app/api/analytics/student/concepts/route.ts`

```ts
// GET /api/analytics/student/concepts?courseId=xyz
// Returns: { covered: string[], uncovered: LearningObjective[], byTool: { toolName: string, concepts: string[] }[] }
```

**Logic:**
1. Fetch all ToolSessions for the student in the course (last 90 days, non-sensitive, with `conceptsTouched`)
2. Flatten all `conceptsTouched` into a unique covered-concepts set
3. Fetch all `LearningObjective` records for the course
4. Cross-reference: objectives whose title doesn't match any covered concept are "uncovered" (fuzzy match — use `includes()` or simple normalization)
5. Group `conceptsTouched` by `toolId` → `toolName` for the `byTool` breakdown

### Files touched (Phase 5)
| File | Change |
|---|---|
| `app/api/analytics/student/concepts/route.ts` | CREATE — concept coverage query |

---

## Execution Order

| Phase | What | Schema migration? | Effort |
|---|---|---|---|
| **1** | Session enrichment (durationSeconds, hintCount, exitReason, conceptsTouched) | Yes — `add-session-enrichment-fields` | S |
| **2** | StudentProfile model + upsert pipeline | Yes — `add-student-profile` | M |
| **3** | Sandy context injection | No | S |
| **4** | A/B study group tracking | Yes — `add-user-study-group` | S |
| **5** | Concept coverage API | No | S |

Run phases in order. Each phase is independently shippable.

---

## Hard Constraints (inherit from CLAUDE.md)

1. Every new API route must call `requireRequestUser` (or `requireAdminUser`) before ANY DB access.
2. Every `ToolSession` query involving student data must include `sensitiveSession: false` unless it is the student querying their own data.
3. `StudentProfile` data must never be returned to EDUCATOR or ADMIN roles in a way that identifies individual students outside the existing at-risk/analytics pipeline. Surface aggregates, not raw profiles.
4. No `@apply` in CSS. No heroicons. No schema `url` in datasource.
5. `npm run lint && npx tsc --noEmit` must pass after each phase.
6. Schema change sequence: edit schema → `npx prisma migrate dev --name <name>` → `npx prisma generate` → `npm run build`.

---

## Verification Checklist (run after all phases)

| Step | Check | Expected |
|---|---|---|
| 1 | `npm run lint && npx tsc --noEmit` | 0 errors |
| 2 | End a tool session as Ian McClure, wait 5s | `ToolSession.durationSeconds`, `hintCount`, `exitReason`, `conceptsTouched` populated |
| 3 | Check `StudentProfile` after session end | Record created/updated for ian.mcclure.student@uky.edu |
| 4 | Open Sandy as Ian, ask anything | Sandy response references student's recent context (last session score, weak objective, or upcoming due date) |
| 5 | `GET /api/admin/study-groups` as admin | Returns `{ treatment: N, control: 0 }` |
| 6 | `GET /api/analytics/platform` as admin | Returns `studyGroups` array in response |
| 7 | `GET /api/analytics/student/concepts?courseId=...` as Ian | Returns `{ covered: [...], uncovered: [...], byTool: [...] }` |
| 8 | FERPA check: fetch Sandy response as heath.price@uky.edu | Sandy does NOT receive student-profile context — only students get this injection |

---

## Handoff Prompt

```
You are the lead engineer on The Sandbox — an AI-powered educational tool marketplace for the University of Kentucky. Execute the Year 1 Data Foundation sprint exactly as specified in `c:\AA Code\Educator marketplace\Blueprints\DATA-FOUNDATION-YEAR1.md`. Read that file in full before starting.

## Context

- Project root: `c:\AA Code\Educator marketplace\the-sandbox\`
- Always read CLAUDE.md first. Hard constraints: Tailwind v4 no @apply, Prisma v7 adapter pattern, lucide-react icons only, requireRequestUser on all routes, thin routes.
- Schema change sequence: edit schema → `npx prisma migrate dev --name <name>` → `npx prisma generate` → `npm run build`
- Existing scoring pipeline: `app/lib/session-analytics-service.ts` — extend this, do not replace it.
- Existing concierge: `app/lib/concierge-service.ts` — extend this, do not replace it.

## Global Rules (non-negotiable)

1. Every new API route must call requireRequestUser (or requireAdminUser) before ANY DB access.
2. Every ToolSession query must include `sensitiveSession: false` unless student is querying their own data.
3. StudentProfile data must never be exposed to EDUCATOR/ADMIN roles at individual-student granularity outside the existing at-risk pipeline.
4. `npm run lint && npx tsc --noEmit` must pass with 0 new errors after each phase.
5. Do not rebuild session-analytics-service.ts or concierge-service.ts from scratch — extend them.
6. Do not add any user-facing UI in this sprint. This is entirely instrumentation and pipeline work.

## Execution order

Execute phases in order. Mark each complete before starting the next.

**Phase 1** — Session enrichment: add `durationSeconds Int?`, `hintCount Int?`, `exitReason String?`, `conceptsTouched String[]` to `ToolSession`. Extend `session-analytics-service.ts` scorer to extract and write these fields. Increase max_tokens from 100 → 300.

**Phase 2** — StudentProfile model: add schema, build `app/lib/student-profile-service.ts` with `upsertStudentProfile(userId)`, call it non-blockingly from `session-analytics-service.ts` after scoring.

**Phase 3** — Sandy context injection: build `app/lib/student-context-service.ts` with `getStudentContextString(userId, courseId?)`, wire into `concierge-service.ts` for STUDENT role only.

**Phase 4** — A/B tracking: add `studyGroup String @default("treatment")` to User. Build `app/api/admin/study-groups/route.ts` (GET count + PATCH assign, requireAdminUser). Add studyGroups breakdown to `app/api/analytics/platform/route.ts`.

**Phase 5** — Concept coverage API: build `app/api/analytics/student/concepts/route.ts` (GET, requireRequestUser, student-scoped).

## Verification

After all phases:
1. `npm run lint && npx tsc --noEmit` — 0 errors
2. End a session as Ian McClure — verify all 4 new fields populated in DB
3. Check StudentProfile record created/updated after session end
4. Open Sandy as Ian — verify context-aware response
5. Verify FERPA: Sandy as heath.price@uky.edu does NOT receive student-profile context
6. Report: "Year 1 Data Foundation complete. Files changed: [list]. Migrations run: [list]."

Then add this sprint entry to CLAUDE.md sprint history:
| 2026-03-19 | **Year 1 Data Foundation Sprint** — Session enrichment (durationSeconds, hintCount, exitReason, conceptsTouched); StudentProfile model with riskScore/learningVelocity/preferredModality/peakEngagementHour; Sandy personalized context injection (STUDENT-only, FERPA-safe); A/B study group tracking on User; concept coverage API. Zero user-facing UI changes. Build clean, 0 TS errors. | ✅ Complete |

Do not suggest additional features. Do not add user-facing UI. Do not rebuild existing services.
```

---

## What This Unlocks

After this sprint ships and runs for 4–8 weeks:

| Future capability | What it needs from this sprint |
|---|---|
| Personalized tool recommendations ("students like you scored 23% higher with [tool X]") | `conceptsTouched` + `preferredModality` + `score` |
| Optimal timing nudges ("your best sessions are at 2pm — you have a due date in 36 hours") | `peakEngagementHour` + `Assignment.dueAt` |
| Abandonment detection per tool (flag tools that students consistently quit early) | `exitReason` aggregated by toolId |
| Educator intervention engine ("3 students in your course have declining learning velocity") | `learningVelocity` + `riskScore` in StudentProfile |
| Outcome proof for provost ("AI-assisted students improve X% per week vs control") | `studyGroup` + `learningVelocity` over time |
| GraphRAG concept mapping ("you've studied hearsay 8 times but never touched FRE 404") | `conceptsTouched` + course `LearningObjective` records |

---

*End of spec. Last updated: 2026-03-19.*
