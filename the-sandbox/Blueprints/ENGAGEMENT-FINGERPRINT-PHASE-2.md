# Handoff Prompt: Engagement Fingerprint Engine — Phase 2 of 6

## Context

You are continuing the **Engagement Fingerprint & Hyper-Personalization Engine** build for the platform — the AI-powered operating system of the University of Kentucky.

**Full architecture blueprint:** `the-sandbox/Blueprints/ENGAGEMENT-FINGERPRINT-ENGINE.md` — read this for the complete service architecture, computation logic, and API specs.

**Phase 1 is COMPLETE.** Here is what was built:

### Phase 1 Deliverables (already on disk)

1. **Schema changes** (`prisma/schema.prisma`):
   - `EngagementFingerprint` model (~line 6443) — one per user, stores temporal, learning, engagement, social, responsiveness, and meta fields. Indexes on `[userId]` (unique), `[userId, computedAt]`, `[chronotype]`, `[confidence]`.
   - `CourseFingerprint` model (~line 6510) — one per course, stores class-level aggregate distributions, averages, derived insights. Indexes on `[courseId]` (unique), `[courseId, computedAt]`.
   - `User.engagementFingerprint` relation added (~line 355).
   - `Course.courseFingerprint` relation added (~line 1199).
   - Database synced via `prisma db push`. Prisma client regenerated.

2. **Type definitions** (`app/lib/fingerprint/types.ts`):
   - `TemporalProfile` — peakHours, peakDays, chronotype, sessionCadence
   - `LearningProfile` — preferredStudyModes, preferredModality, bloomProfile, learningVelocity, masteryRetention
   - `EngagementShape` — toolDiversity, consistencyScore, avgSessionMinutes, sessionsPerWeek, deadlineProximity
   - `SocialProfile` — collaborationIndex, socialOrientation, liveRoomWeekly, messagingWeekly, studyGroupCount
   - `ResponsivenessProfile` — nudgeResponseRate, announcementReadRate, sandyEngagementRate
   - `FingerprintMeta` — signalCount, confidence, windowDays, version
   - `ComputedFingerprint` — combines all 6 sub-interfaces

3. **Data fetchers** (`app/lib/fingerprint/data-fetchers.ts`):
   - 14 thin Prisma query wrappers, each takes `(userId: string, since: Date)`.
   - **Important field name adaptations** (blueprint assumed names differ from actual schema):
     - `ToolSession.startedAt` (not `createdAt`), `ToolSession.durationSeconds` (not `durationMinutes`)
     - `FlashcardState.lastQuality` (not `quality`), `FlashcardState.reviewCount`
     - `StudentConceptMastery.masteryLevel` (not `proficiency`), `StudentConceptMastery.lastSeenAt` (not `updatedAt`)
     - `StudentDomainModality.preferredModality` + `confidenceScore` (not `dominant`)
     - `Assignment.dueAt` (not `dueDate`)
     - `Submission.studentId` (not `userId`)
     - `InterventionLog.studentId` (not `userId`), uses `resolvedAt !== null` for acceptance
     - `SandyExecutionTrace.toolCallCount` + `approvalCount` (not `toolCalls`/`approved`)
   - Fetcher return shapes:
     - `fetchToolSessions` → array of `{ toolId, startedAt, durationSeconds, score, bloomLevel, notes }`
     - `fetchFlashcardStats` → array of `{ lastQuality, reviewCount }`
     - `fetchConceptMastery` → array of `{ concept, masteryLevel, encounterCount, successCount, failCount, lastSeenAt }`
     - `fetchDomainModality` → array of `{ domain, preferredModality, confidenceScore, sessionCount }` (sorted by confidence desc)
     - `fetchLiveRoomActivity` → array of `{ score, joinedAt, room: { type, phase } }`
     - `fetchSandyTraces` → `{ totalOffered: number, totalApproved: number }`
     - `fetchMessageActivity` → `{ messageCount: number }`
     - `fetchStudyGroupMemberships` → `{ groupCount: number }`
     - `fetchAssignments` → array of `{ id, dueAt, courseId }` (only enrolled courses)
     - `fetchSubmissions` → array of `{ assignmentId, submittedAt }`
     - `fetchCoursePostReads` → `{ readCount: number }`
     - `fetchTotalCoursePosts` → `{ postCount: number }`
     - `fetchInterventions` → `{ total: number, accepted: number }`
     - `fetchWellnessEntryCount` → `{ entryCount: number }`

**Key codebase conventions (from CLAUDE.md):**
- Prisma v7 with PrismaPg adapter. Generated client at `app/generated/prisma`. Import from `../generated/prisma`.
- Business logic in `app/lib/`, never in route files.
- Auth guards required on every route (`requireRequestUser`, etc. from `app/lib/server-auth.ts`).
- Tailwind v4, lucide-react icons only, `size-X` not `w-X h-X`.

## The Goal

**Execute ONLY these two tasks, then STOP:**

### Task 2A: Five Computation Modules

Create 5 pure-function modules. Each takes the output of data fetchers and produces one sub-profile of the fingerprint. **No Prisma calls, no LLM calls** — pure computation only. Import types from `./types`.

1. **`app/lib/fingerprint/temporal.ts`** — `computeTemporalProfile(sessions, since, windowDays) → TemporalProfile`
   - Build hour distribution (0-23) and day distribution (0=Sun, 6=Sat) from `session.startedAt`
   - `peakHours`: top 3 hours by count
   - `peakDays`: top 3 days by count
   - `chronotype`: classify by morning (5-12) vs evening (18-3) vs weekend weight. Thresholds: weekend >50% → "weekend-warrior", morning >55% → "early-bird", evening >55% → "night-owl", else "steady"
   - `sessionCadence`: from active-day ratio and burstiness (max daily count / avg daily count). <10% active → "minimal", >60% active + low burst → "daily-grinder", burst >5 → "binge-learner", >30% active + burst >3 → "sprint-rester", else "crammer"
   - Export helper `topN(counts: number[], n: number): number[]` and `sum(arr: number[]): number`

2. **`app/lib/fingerprint/learning.ts`** — `computeLearningProfile(sessions, flashcardStats, conceptMastery, domainModalities) → LearningProfile`
   - Input sessions are from `fetchToolSessions` (have `startedAt`, `durationSeconds`, `score`, `bloomLevel`, `notes`, `toolId`)
   - `preferredStudyModes`: parse `notes` field for study mode hints, or derive from toolId patterns. Top 3 by frequency.
   - `preferredModality`: take highest-confidence entry from `domainModalities` array. Fallback "mixed" if empty.
   - `bloomProfile`: aggregate from conceptMastery — distribute mastery levels into 6 Bloom buckets (knowledge through evaluation). Normalize to sum to 1.
   - `learningVelocity`: compare mastery gains in first half vs second half of window. More improvement in second half → "accelerating", roughly equal → "steady", less in second half → "decelerating", very low change → "plateaued".
   - `masteryRetention`: from flashcard stats. SM-2 quality 3+ = "good or better". Retention = count(lastQuality >= 3) / total. Fallback 0.5 if no data.

3. **`app/lib/fingerprint/engagement.ts`** — `computeEngagementShape(sessions, submissions, assignments, since, windowDays) → EngagementShape`
   - `toolDiversity`: unique toolIds / 76 (total hub tools), capped at 1.0
   - `consistencyScore`: compute daily session counts array for full window → coefficient of variation → invert. CV 0 = perfectly consistent (score 1.0), CV ≥ 3 = score 0.
   - `avgSessionMinutes`: average of `durationSeconds / 60`. Fallback 0.
   - `sessionsPerWeek`: `sessions.length / (windowDays / 7)`
   - `deadlineProximity`: for each submission, find matching assignment by `assignmentId`, compute `(dueAt - submittedAt)` in hours. Average lead time: >72h = "planner", 24-72h = "steady", 0-24h = "crammer". If >30% submissions are late (negative lead) = "late". Fallback "steady".
   - **Note:** `Assignment.dueAt` may be null — skip those.

4. **`app/lib/fingerprint/social.ts`** — `computeSocialProfile(liveRooms, messageActivity, studyGroupMemberships, sessionCount, windowDays) → SocialProfile`
   - `liveRoomWeekly`: `liveRooms.length / (windowDays / 7)`
   - `messagingWeekly`: `messageActivity.messageCount / (windowDays / 7)`
   - `studyGroupCount`: `studyGroupMemberships.groupCount`
   - `collaborationIndex`: `(liveRooms.length + messageActivity.messageCount + studyGroupCount) / (sessionCount + liveRooms.length + messageActivity.messageCount + studyGroupCount)`. Capped [0, 1]. Fallback 0 if denominator is 0.
   - `socialOrientation`: index <0.15 → "solo", <0.4 or (groups ≤ 2 and liveRoom < 2/week) → "small-group", else "community-active"

5. **`app/lib/fingerprint/responsiveness.ts`** — `computeResponsiveness(interventions, postReads, totalPosts, sandyTraces) → ResponsivenessProfile`
   - `nudgeResponseRate`: `interventions.accepted / interventions.total`. Fallback 0.5 if total is 0.
   - `announcementReadRate`: `postReads.readCount / totalPosts.postCount`. Fallback 0.5 if total is 0.
   - `sandyEngagementRate`: `sandyTraces.totalApproved / sandyTraces.totalOffered`. Fallback 0.5 if total is 0.

### Task 2B: Fingerprint Engine Orchestrator + Service

Create 2 files:

1. **`app/lib/fingerprint/fingerprint-engine.ts`** — The core orchestrator that:
   - Takes `{ userId: string, windowDays?: number }` (default 30)
   - Computes `since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)`
   - Calls all 14 data fetchers in parallel via `Promise.all`
   - Passes fetcher results to the 5 computation modules
   - Computes `signalCount` (sum of meaningful data points across all fetchers)
   - Computes `confidence` = `Math.min(1, signalCount / 100)`
   - Returns `ComputedFingerprint`
   - Exported function: `computeFingerprint(input): Promise<ComputedFingerprint>`

2. **`app/lib/fingerprint/fingerprint-service.ts`** — Persistence + caching layer:
   - `getFingerprint(userId)` — returns cached if <24h old, else lazy-refreshes
   - `refreshFingerprint(userId)` — recomputes and upserts to DB
   - `getCourseFingerprint(courseId)` — returns cached if <24h old, else recomputes by aggregating student fingerprints
   - `refreshCourseFingerprint(courseId)` — fetches all enrolled students, gets/computes each fingerprint, aggregates distributions + averages, upserts to DB
   - Helper `flattenFingerprint(computed: ComputedFingerprint)` — maps the nested interface to flat Prisma model fields
   - Helper `isStale(computedAt: Date): boolean` — returns true if >24h old
   - Helper `aggregateFingerprints(fingerprints[])` — produces course-level distributions, averages, dominant categories, risk signals, engagement trend
   - Import prisma from `../prisma`

## The Specs

**Files to create:**
- `app/lib/fingerprint/temporal.ts`
- `app/lib/fingerprint/learning.ts`
- `app/lib/fingerprint/engagement.ts`
- `app/lib/fingerprint/social.ts`
- `app/lib/fingerprint/responsiveness.ts`
- `app/lib/fingerprint/fingerprint-engine.ts`
- `app/lib/fingerprint/fingerprint-service.ts`

**Files to read first:**
- `the-sandbox/Blueprints/ENGAGEMENT-FINGERPRINT-ENGINE.md` (full architecture — computation logic in detail)
- `app/lib/fingerprint/types.ts` (all interfaces — already built)
- `app/lib/fingerprint/data-fetchers.ts` (14 fetchers — already built, note exact return shapes above)
- `prisma/schema.prisma` (verify `EngagementFingerprint` and `CourseFingerprint` model field names)
- `the-sandbox/CLAUDE.md` (codebase conventions)

**Files NOT to modify:**
- `prisma/schema.prisma` — no schema changes in Phase 2
- `app/lib/fingerprint/types.ts` — already complete
- `app/lib/fingerprint/data-fetchers.ts` — already complete

## The Next Link

When you have completed ONLY Tasks 2A and 2B:
1. Verify all 7 new files have no TypeScript errors (`npx tsc --noEmit` and grep for `fingerprint/`)
2. Then generate the **next handoff prompt** for Phase 3 (Tasks 3A + 3B): the 3 API routes (`GET /api/fingerprint/me`, `GET /api/fingerprint/course/[courseId]`, `POST /api/fingerprint/refresh`) + the "My Learning Profile" student-facing component. Include full context of what was completed in Phases 1-2, the exact files to create, and the technical approach. The handoff prompt must follow the same format as this one (Context, Goal, Specs, Next Link).
