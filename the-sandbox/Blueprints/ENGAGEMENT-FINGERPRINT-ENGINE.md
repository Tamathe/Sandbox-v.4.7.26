# Blueprint: Engagement Fingerprint & Hyper-Personalization Engine

> **Sprint Scope:** Compute a multi-signal behavioral fingerprint for every user from existing platform interaction data. Feed that fingerprint into Sandy, the Hub, Study Buddy, notifications, the student homepage, and faculty analytics — making every surface adaptive without building new features.
> **Depends On:** Nothing — purely derived from existing data models. Enhances every existing feature.
> **Estimated Size:** Large (3 sprints)
> **Deploy Order:** 1 of 10 (Cross-Data Series)
> **Patent Relevance:** HIGH — "Multi-signal behavioral fingerprinting for adaptive educational personalization" (One Brain pillar, interdependency story)

---

## Context

the platform already collects rich behavioral signals across 190+ models — tool sessions, study modes, flashcard states, concept mastery, live room participation, messaging patterns, calendar behavior, Sandy interaction traces, wellness entries, and campus engagement. But no system synthesizes these signals into a unified understanding of *who this person is as a learner and worker*.

The Engagement Fingerprint closes that gap. It is a **computed, derived profile** — no new data collection, no new tracking. It reads what already exists and produces a structured intelligence layer that every surface can consume.

### Why This Matters

1. **Sandy becomes prescient.** Instead of generic responses, Sandy knows "this student is a night-owl who prefers flashcards, learns best solo, and crams before exams" — and adapts tone, timing, and suggestions accordingly.
2. **The Hub becomes personal.** Tool ordering reflects actual usage patterns, not static swim lanes.
3. **Faculty see their class, not just grades.** A class-level aggregate fingerprint reveals "70% of this section are binge-learners who cluster activity around deadlines" — actionable pedagogy intelligence.
4. **Students see what the system knows.** A transparent "My Learning Profile" card builds trust and metacognitive awareness.
5. **Patent story strengthens.** Every signal feeds One Brain; every surface consumes it. The interdependency web is the moat.

---

## Signal Inventory

Every signal below already exists in the database. The fingerprint engine reads — never writes — to these models.

| Signal Dimension | Source Model(s) | What We Extract |
|---|---|---|
| **Tool Usage Patterns** | `ToolSession` | Which tools, frequency, duration, scores, time-of-day distribution |
| **Study Mode Preferences** | `ToolSession` (where toolId = study-buddy variants) | Mode distribution (Tutor/Quiz/Flashcard/Socratic/Teach-Back/Debate/Essay), session lengths |
| **Flashcard Engagement** | `FlashcardState` | Cards reviewed vs. due, retention rate, again/good/easy distribution, streak consistency |
| **Concept Mastery** | `StudentConceptMastery`, `ConceptState` | Bloom distribution, mastery velocity, dominant domains, misconception frequency |
| **Learning Modality** | `StudentDomainModality` | Visual/auditory/kinesthetic/reading preference |
| **Live Room Participation** | `LiveRoomParticipant`, `LiveRoom` | Room types joined (Challenge/Study/Watch/TeachBack), frequency, scores, completion rate |
| **Session Timing** | `ToolSession.createdAt`, `SessionTelemetry` | Hour-of-day distribution, day-of-week distribution, session cadence |
| **Sandy Interactions** | `SandyExecutionTrace` | Tool suggestions accepted vs. ignored, conversation length, proactive trigger engagement |
| **Messaging & Social** | `ChannelMessage`, `ChatMembership`, `StudyGroupMember` | Message frequency, group count, response latency, study group participation |
| **Calendar & Deadlines** | `AssistantCalendarEvent`, `Assignment` + `Submission` | Lead time before deadlines, event creation patterns, deadline proximity behavior |
| **Course Engagement** | `CourseEnrollment`, `CourseMaterial` (read tracking), `CoursePostRead` | Material completion rate, announcement read rate, course activity distribution |
| **Wellness Signals** | `WellnessEntry` | Entry frequency only (not content — privacy). Consistent self-care correlates with engagement patterns |
| **Campus Engagement** | `CampusEvent` (RSVP/attendance), `Organization` membership | Event diversity, org count, campus involvement breadth |
| **Nudge Responsiveness** | `InterventionLog`, `StaffBriefingDismissal` | Intervention acceptance rate, briefing dismissal patterns |

**Rolling window:** 30 days (default). Configurable per dimension — some signals (like modality preference) benefit from longer windows (90 days).

---

## Schema Changes

### New Model: `EngagementFingerprint`

```prisma
model EngagementFingerprint {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  computedAt  DateTime @default(now())
  windowDays  Int      @default(30)

  // ── Temporal Profile ──
  peakHours       Int[]    // Top 3 most active hours (0-23), ordered by activity volume
  peakDays        Int[]    // Top 3 most active days (0=Sun, 6=Sat)
  chronotype      String   // "early-bird" | "night-owl" | "steady" | "weekend-warrior"
  sessionCadence  String   // "daily-grinder" | "binge-learner" | "sprint-rester" | "crammer" | "minimal"

  // ── Learning Style ──
  preferredStudyModes   String[]  // Top 3 study buddy modes by session count
  preferredModality     String    // "visual" | "auditory" | "kinesthetic" | "reading" | "mixed"
  bloomProfile          Json      // { "knowledge": 0.15, "comprehension": 0.25, "application": 0.30, "analysis": 0.20, "synthesis": 0.05, "evaluation": 0.05 }
  learningVelocity      String    // "accelerating" | "steady" | "decelerating" | "plateaued"
  masteryRetention      Float     // 0-1: flashcard retention rate (good+easy / total reviews)

  // ── Engagement Shape ──
  toolDiversity         Float     // 0-1: unique tools used / total tools available (higher = explorer)
  consistencyScore      Float     // 0-1: std deviation of daily activity (higher = more consistent)
  avgSessionMinutes     Float     // Average tool session duration
  sessionsPerWeek       Float     // Average sessions per week in window
  deadlineProximity     String    // "planner" (>72h early) | "steady" (24-72h) | "crammer" (<24h) | "late" (after due)

  // ── Social & Collaboration ──
  collaborationIndex    Float     // 0-1: (live rooms + study groups + messages) / total activity
  socialOrientation     String    // "solo" | "small-group" | "community-active"
  liveRoomWeekly        Float     // Live room sessions per week
  messagingWeekly       Float     // Messages sent per week
  studyGroupCount       Int       // Active study group memberships

  // ── Responsiveness ──
  nudgeResponseRate     Float     // 0-1: interventions acted on / interventions received
  announcementReadRate  Float     // 0-1: course posts read / total posts
  sandyEngagementRate   Float     // 0-1: Sandy suggestions accepted / offered

  // ── Meta ──
  signalCount           Int       // Total data points that fed this computation
  confidence            Float     // 0-1: composite confidence (low data = low confidence)
  version               Int       @default(1) // Schema version for forward compat
  raw                   Json?     // Full computation intermediates for debugging

  @@unique([userId])
  @@index([userId, computedAt])
  @@index([chronotype])
  @@index([sessionCadence])
  @@index([confidence])
}
```

### New Model: `CourseFingerprint` (Class-Level Aggregate)

```prisma
model CourseFingerprint {
  id          String   @id @default(cuid())
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  computedAt  DateTime @default(now())
  studentCount Int

  // ── Aggregate Distributions (percentages, not individuals) ──
  chronotypeDistribution   Json  // { "early-bird": 0.15, "night-owl": 0.45, "steady": 0.25, "weekend-warrior": 0.15 }
  cadenceDistribution      Json  // { "daily-grinder": 0.20, "binge-learner": 0.35, ... }
  modalityDistribution     Json  // { "visual": 0.30, "auditory": 0.20, ... }
  socialDistribution       Json  // { "solo": 0.40, "small-group": 0.35, "community-active": 0.25 }
  deadlineDistribution     Json  // { "planner": 0.15, "steady": 0.30, "crammer": 0.45, "late": 0.10 }

  // ── Aggregate Metrics ──
  avgCollaborationIndex    Float
  avgConsistencyScore      Float
  avgSessionMinutes        Float
  avgToolDiversity         Float
  avgNudgeResponseRate     Float
  topStudyModes            String[] // Top 3 modes across class
  topTools                 String[] // Top 5 tools by usage across class
  bloomProfile             Json     // Averaged bloom distribution

  // ── Class Insights (derived) ──
  dominantChronotype       String   // Most common chronotype
  dominantCadence          String   // Most common cadence
  engagementTrend          String   // "rising" | "stable" | "declining" (compared to prior 30d window)
  riskSignals              String[] // e.g., ["45% crammers", "low nudge response", "declining engagement"]

  @@unique([courseId])
  @@index([courseId, computedAt])
}
```

### User Relation Addition

```prisma
// Add to existing User model:
engagementFingerprint  EngagementFingerprint?
```

### Course Relation Addition

```prisma
// Add to existing Course model:
courseFingerprint  CourseFingerprint?
```

---

## Service Architecture

### Core: `app/lib/fingerprint/fingerprint-engine.ts`

The engine is a pure computation pipeline — no LLM calls. It reads existing data via Prisma aggregations and produces a fingerprint.

```typescript
// fingerprint-engine.ts — Core computation pipeline

import { prisma } from '../prisma'

interface FingerprintInput {
  userId: string
  windowDays?: number  // default 30
}

interface ComputedFingerprint {
  temporal: TemporalProfile
  learning: LearningProfile
  engagement: EngagementShape
  social: SocialProfile
  responsiveness: ResponsivenessProfile
  meta: FingerprintMeta
}

export async function computeFingerprint(input: FingerprintInput): Promise<ComputedFingerprint> {
  const { userId, windowDays = 30 } = input
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

  // Parallel data fetch — all independent queries run concurrently
  const [
    toolSessions,
    flashcardStates,
    conceptMastery,
    domainModality,
    liveRoomParticipation,
    sandyTraces,
    messages,
    studyGroups,
    assignments,
    submissions,
    coursePostReads,
    totalCoursePosts,
    interventions,
    wellnessEntries,
    calendarEvents,
  ] = await Promise.all([
    fetchToolSessions(userId, since),
    fetchFlashcardStats(userId, since),
    fetchConceptMastery(userId),
    fetchDomainModality(userId),
    fetchLiveRoomActivity(userId, since),
    fetchSandyTraces(userId, since),
    fetchMessageActivity(userId, since),
    fetchStudyGroupMemberships(userId),
    fetchAssignments(userId, since),
    fetchSubmissions(userId, since),
    fetchCoursePostReads(userId, since),
    fetchTotalCoursePosts(userId, since),
    fetchInterventions(userId, since),
    fetchWellnessEntryCount(userId, since),
    fetchCalendarEvents(userId, since),
  ])

  // ── Compute each dimension ──
  const temporal = computeTemporalProfile(toolSessions, since, windowDays)
  const learning = computeLearningProfile(toolSessions, flashcardStates, conceptMastery, domainModality)
  const engagement = computeEngagementShape(toolSessions, submissions, assignments, since, windowDays)
  const social = computeSocialProfile(liveRoomParticipation, messages, studyGroups, toolSessions)
  const responsiveness = computeResponsiveness(interventions, coursePostReads, totalCoursePosts, sandyTraces)

  // ── Confidence: based on signal density ──
  const signalCount = toolSessions.length + flashcardStates.totalReviews +
    liveRoomParticipation.length + messages.count + interventions.total
  const confidence = Math.min(1, signalCount / 100) // 100+ signals = full confidence

  return {
    temporal,
    learning,
    engagement,
    social,
    responsiveness,
    meta: { signalCount, confidence, windowDays, version: 1 }
  }
}
```

### Temporal Computation: `app/lib/fingerprint/temporal.ts`

```typescript
interface TemporalProfile {
  peakHours: number[]       // Top 3
  peakDays: number[]        // Top 3
  chronotype: 'early-bird' | 'night-owl' | 'steady' | 'weekend-warrior'
  sessionCadence: 'daily-grinder' | 'binge-learner' | 'sprint-rester' | 'crammer' | 'minimal'
}

export function computeTemporalProfile(
  sessions: { createdAt: Date; durationMinutes: number }[],
  since: Date,
  windowDays: number
): TemporalProfile {
  // Hour distribution: count sessions per hour (0-23)
  const hourCounts = new Array(24).fill(0)
  const dayCounts = new Array(7).fill(0)
  const dailyActivity: Record<string, number> = {} // "2026-03-15" → session count

  for (const s of sessions) {
    hourCounts[s.createdAt.getHours()]++
    dayCounts[s.createdAt.getDay()]++
    const dateKey = s.createdAt.toISOString().slice(0, 10)
    dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1
  }

  const peakHours = topN(hourCounts, 3)
  const peakDays = topN(dayCounts, 3)

  // Chronotype classification
  const morningWeight = sum(hourCounts.slice(5, 12))  // 5 AM - 12 PM
  const eveningWeight = sum(hourCounts.slice(18, 24)) + sum(hourCounts.slice(0, 3)) // 6 PM - 3 AM
  const weekendWeight = dayCounts[0] + dayCounts[6]
  const weekdayWeight = sum(dayCounts.slice(1, 6))
  const total = sessions.length || 1

  let chronotype: TemporalProfile['chronotype']
  if (weekendWeight / total > 0.5) chronotype = 'weekend-warrior'
  else if (morningWeight / total > 0.55) chronotype = 'early-bird'
  else if (eveningWeight / total > 0.55) chronotype = 'night-owl'
  else chronotype = 'steady'

  // Session cadence: analyze distribution of daily activity counts
  const activeDays = Object.keys(dailyActivity).length
  const activeDayRatio = activeDays / windowDays
  const dailyCounts = Object.values(dailyActivity)
  const maxDayCount = Math.max(...dailyCounts, 0)
  const avgDayCount = dailyCounts.length > 0 ? sum(dailyCounts) / dailyCounts.length : 0
  const burstiness = maxDayCount / (avgDayCount || 1) // High = binge pattern

  let sessionCadence: TemporalProfile['sessionCadence']
  if (activeDayRatio < 0.1) sessionCadence = 'minimal'
  else if (activeDayRatio > 0.6 && burstiness < 3) sessionCadence = 'daily-grinder'
  else if (burstiness > 5) sessionCadence = 'binge-learner'
  else if (activeDayRatio > 0.3 && burstiness > 3) sessionCadence = 'sprint-rester'
  else sessionCadence = 'crammer' // Moderate activity, moderate bursts

  return { peakHours, peakDays, chronotype, sessionCadence }
}
```

### Learning Profile Computation: `app/lib/fingerprint/learning.ts`

```typescript
interface LearningProfile {
  preferredStudyModes: string[]
  preferredModality: string
  bloomProfile: Record<string, number>
  learningVelocity: 'accelerating' | 'steady' | 'decelerating' | 'plateaued'
  masteryRetention: number
}

export function computeLearningProfile(
  sessions: ToolSessionData[],
  flashcardStats: FlashcardStats,
  conceptMastery: ConceptMasteryData[],
  domainModality: DomainModalityData | null
): LearningProfile {

  // Study mode preference: count sessions per mode
  const studyModeMap: Record<string, number> = {}
  for (const s of sessions) {
    if (s.metadata?.studyMode) {
      const mode = s.metadata.studyMode as string
      studyModeMap[mode] = (studyModeMap[mode] || 0) + 1
    }
  }
  const preferredStudyModes = Object.entries(studyModeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mode]) => mode)

  // Modality: use existing StudentDomainModality if available, else infer from tool usage
  const preferredModality = domainModality?.dominant || inferModalityFromTools(sessions)

  // Bloom: aggregate from concept mastery
  const bloomProfile = aggregateBloomDistribution(conceptMastery)

  // Learning velocity: compare mastery gains in first half vs second half of window
  const learningVelocity = computeVelocityTrend(conceptMastery)

  // Mastery retention: flashcard good+easy rate
  const totalReviews = flashcardStats.totalReviews || 1
  const masteryRetention = (flashcardStats.goodCount + flashcardStats.easyCount) / totalReviews

  return { preferredStudyModes, preferredModality, bloomProfile, learningVelocity, masteryRetention }
}
```

### Engagement Shape Computation: `app/lib/fingerprint/engagement.ts`

```typescript
interface EngagementShape {
  toolDiversity: number
  consistencyScore: number
  avgSessionMinutes: number
  sessionsPerWeek: number
  deadlineProximity: 'planner' | 'steady' | 'crammer' | 'late'
}

export function computeEngagementShape(
  sessions: ToolSessionData[],
  submissions: SubmissionData[],
  assignments: AssignmentData[],
  since: Date,
  windowDays: number
): EngagementShape {
  // Tool diversity: unique tools / total available tools
  const uniqueTools = new Set(sessions.map(s => s.toolId)).size
  const TOTAL_TOOLS = 76 // From hub config
  const toolDiversity = Math.min(1, uniqueTools / TOTAL_TOOLS)

  // Consistency: coefficient of variation of daily session counts (inverted)
  const dailyCounts = computeDailyCounts(sessions, since, windowDays)
  const mean = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length
  const stdDev = Math.sqrt(dailyCounts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / dailyCounts.length)
  const cv = mean > 0 ? stdDev / mean : 1
  const consistencyScore = Math.max(0, Math.min(1, 1 - (cv / 3))) // CV of 3+ → 0 consistency

  // Session metrics
  const avgSessionMinutes = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / sessions.length
    : 0
  const weeks = windowDays / 7
  const sessionsPerWeek = sessions.length / weeks

  // Deadline proximity: compare submission timestamps to assignment due dates
  const deadlineProximity = computeDeadlineProximity(submissions, assignments)

  return { toolDiversity, consistencyScore, avgSessionMinutes, sessionsPerWeek, deadlineProximity }
}

function computeDeadlineProximity(
  submissions: SubmissionData[],
  assignments: AssignmentData[]
): EngagementShape['deadlineProximity'] {
  if (submissions.length === 0) return 'steady' // No data → neutral default

  const leadTimes: number[] = []
  for (const sub of submissions) {
    const assignment = assignments.find(a => a.id === sub.assignmentId)
    if (!assignment?.dueDate) continue
    const hoursBeforeDue = (new Date(assignment.dueDate).getTime() - new Date(sub.submittedAt).getTime()) / (1000 * 60 * 60)
    leadTimes.push(hoursBeforeDue)
  }

  if (leadTimes.length === 0) return 'steady'
  const avgLeadHours = leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
  const lateRatio = leadTimes.filter(h => h < 0).length / leadTimes.length

  if (lateRatio > 0.3) return 'late'
  if (avgLeadHours > 72) return 'planner'
  if (avgLeadHours > 24) return 'steady'
  return 'crammer'
}
```

### Social Profile Computation: `app/lib/fingerprint/social.ts`

```typescript
interface SocialProfile {
  collaborationIndex: number
  socialOrientation: 'solo' | 'small-group' | 'community-active'
  liveRoomWeekly: number
  messagingWeekly: number
  studyGroupCount: number
}

export function computeSocialProfile(
  liveRooms: LiveRoomData[],
  messages: { count: number },
  studyGroups: { count: number },
  allSessions: ToolSessionData[]
): SocialProfile {
  const weeks = 4 // 30-day window ≈ 4 weeks
  const liveRoomWeekly = liveRooms.length / weeks
  const messagingWeekly = messages.count / weeks
  const studyGroupCount = studyGroups.count

  // Collaboration index: social activity as fraction of total activity
  const socialActivity = liveRooms.length + messages.count + studyGroupCount
  const totalActivity = allSessions.length + socialActivity
  const collaborationIndex = totalActivity > 0 ? socialActivity / totalActivity : 0

  // Social orientation classification
  let socialOrientation: SocialProfile['socialOrientation']
  if (collaborationIndex < 0.15) socialOrientation = 'solo'
  else if (collaborationIndex < 0.4 || (studyGroupCount <= 2 && liveRoomWeekly < 2)) socialOrientation = 'small-group'
  else socialOrientation = 'community-active'

  return { collaborationIndex, socialOrientation, liveRoomWeekly, messagingWeekly, studyGroupCount }
}
```

### Responsiveness Computation: `app/lib/fingerprint/responsiveness.ts`

```typescript
interface ResponsivenessProfile {
  nudgeResponseRate: number
  announcementReadRate: number
  sandyEngagementRate: number
}

export function computeResponsiveness(
  interventions: { accepted: number; total: number },
  coursePostReads: number,
  totalCoursePosts: number,
  sandyTraces: { accepted: number; offered: number }
): ResponsivenessProfile {
  return {
    nudgeResponseRate: interventions.total > 0 ? interventions.accepted / interventions.total : 0.5,
    announcementReadRate: totalCoursePosts > 0 ? coursePostReads / totalCoursePosts : 0.5,
    sandyEngagementRate: sandyTraces.offered > 0 ? sandyTraces.accepted / sandyTraces.offered : 0.5,
  }
}
```

### Persistence: `app/lib/fingerprint/fingerprint-service.ts`

```typescript
// fingerprint-service.ts — Read/write fingerprints, handle caching/staleness

import { prisma } from '../prisma'
import { computeFingerprint } from './fingerprint-engine'

const STALE_THRESHOLD_HOURS = 24

export async function getFingerprint(userId: string): Promise<EngagementFingerprint | null> {
  const existing = await prisma.engagementFingerprint.findUnique({ where: { userId } })

  if (existing && !isStale(existing.computedAt)) {
    return existing
  }

  // Lazy refresh: recompute if stale or missing
  return refreshFingerprint(userId)
}

export async function refreshFingerprint(userId: string): Promise<EngagementFingerprint> {
  const computed = await computeFingerprint({ userId, windowDays: 30 })

  return prisma.engagementFingerprint.upsert({
    where: { userId },
    create: {
      userId,
      ...flattenFingerprint(computed),
    },
    update: {
      ...flattenFingerprint(computed),
      computedAt: new Date(),
    },
  })
}

export async function getCourseFingerprint(courseId: string): Promise<CourseFingerprint | null> {
  const existing = await prisma.courseFingerprint.findUnique({ where: { courseId } })

  if (existing && !isStale(existing.computedAt)) {
    return existing
  }

  return refreshCourseFingerprint(courseId)
}

export async function refreshCourseFingerprint(courseId: string): Promise<CourseFingerprint> {
  // Get all enrolled students
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId, role: 'STUDENT' },
    select: { userId: true },
  })

  // Get or compute fingerprints for all students
  const fingerprints = await Promise.all(
    enrollments.map(e => getFingerprint(e.userId))
  )
  const valid = fingerprints.filter(Boolean) as EngagementFingerprint[]

  if (valid.length === 0) {
    // No data — return empty aggregate
    return createEmptyCourseFingerprint(courseId, 0)
  }

  const aggregate = aggregateFingerprints(valid)

  return prisma.courseFingerprint.upsert({
    where: { courseId },
    create: { courseId, studentCount: valid.length, ...aggregate },
    update: { studentCount: valid.length, ...aggregate, computedAt: new Date() },
  })
}

function isStale(computedAt: Date): boolean {
  const ageHours = (Date.now() - computedAt.getTime()) / (1000 * 60 * 60)
  return ageHours > STALE_THRESHOLD_HOURS
}

// Aggregate individual fingerprints into class-level distributions
function aggregateFingerprints(fps: EngagementFingerprint[]) {
  const n = fps.length

  // Distribution: count occurrences of each category
  const chronotypeDistribution = countDistribution(fps, 'chronotype')
  const cadenceDistribution = countDistribution(fps, 'sessionCadence')
  const modalityDistribution = countDistribution(fps, 'preferredModality')
  const socialDistribution = countDistribution(fps, 'socialOrientation')
  const deadlineDistribution = countDistribution(fps, 'deadlineProximity')

  // Averages
  const avg = (field: keyof EngagementFingerprint) =>
    fps.reduce((sum, fp) => sum + (Number(fp[field]) || 0), 0) / n

  // Top study modes across class
  const modeFreq: Record<string, number> = {}
  for (const fp of fps) {
    for (const mode of fp.preferredStudyModes) {
      modeFreq[mode] = (modeFreq[mode] || 0) + 1
    }
  }
  const topStudyModes = Object.entries(modeFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mode]) => mode)

  // Bloom: average each level
  const bloomProfile = averageJsonField(fps, 'bloomProfile')

  // Risk signals
  const riskSignals: string[] = []
  const crammerPct = (chronotypeDistribution['crammer'] || 0) * 100
  if (crammerPct > 40) riskSignals.push(`${Math.round(crammerPct)}% crammers`)
  const avgNudge = avg('nudgeResponseRate')
  if (avgNudge < 0.3) riskSignals.push('Low nudge response rate')
  const avgConsistency = avg('consistencyScore')
  if (avgConsistency < 0.3) riskSignals.push('Inconsistent engagement')

  // Dominant categories
  const dominantChronotype = maxKey(chronotypeDistribution)
  const dominantCadence = maxKey(cadenceDistribution)

  // Engagement trend: compare avg consistency to 0.5 threshold (simplified — full impl compares to prior window)
  const engagementTrend = avgConsistency > 0.55 ? 'rising' : avgConsistency > 0.4 ? 'stable' : 'declining'

  return {
    chronotypeDistribution,
    cadenceDistribution,
    modalityDistribution,
    socialDistribution,
    deadlineDistribution,
    avgCollaborationIndex: avg('collaborationIndex'),
    avgConsistencyScore: avgConsistency,
    avgSessionMinutes: avg('avgSessionMinutes'),
    avgToolDiversity: avg('toolDiversity'),
    avgNudgeResponseRate: avgNudge,
    topStudyModes,
    topTools: [], // Populated from ToolSession aggregation
    bloomProfile,
    dominantChronotype,
    dominantCadence,
    engagementTrend,
    riskSignals,
  }
}
```

---

## Data Fetch Layer: `app/lib/fingerprint/data-fetchers.ts`

Thin wrappers around Prisma queries. Each returns only the fields needed for fingerprint computation.

```typescript
export async function fetchToolSessions(userId: string, since: Date) {
  return prisma.toolSession.findMany({
    where: { userId, createdAt: { gte: since } },
    select: {
      toolId: true,
      createdAt: true,
      durationMinutes: true,
      score: true,
      metadata: true,
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function fetchFlashcardStats(userId: string, since: Date) {
  const states = await prisma.flashcardState.findMany({
    where: { userId, lastReviewedAt: { gte: since } },
    select: { quality: true },
  })
  return {
    totalReviews: states.length,
    againCount: states.filter(s => s.quality === 0).length,
    goodCount: states.filter(s => s.quality === 3).length,
    easyCount: states.filter(s => s.quality === 5).length,
  }
}

export async function fetchConceptMastery(userId: string) {
  return prisma.studentConceptMastery.findMany({
    where: { userId },
    select: { proficiency: true, bloomLevel: true, updatedAt: true },
  })
}

export async function fetchDomainModality(userId: string) {
  return prisma.studentDomainModality.findFirst({
    where: { userId },
    select: { dominant: true },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function fetchLiveRoomActivity(userId: string, since: Date) {
  return prisma.liveRoomParticipant.findMany({
    where: { userId, joinedAt: { gte: since } },
    select: {
      score: true,
      joinedAt: true,
      room: { select: { type: true, status: true } },
    },
  })
}

export async function fetchSandyTraces(userId: string, since: Date) {
  const traces = await prisma.sandyExecutionTrace.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { toolCalls: true, approved: true },
  })
  return {
    offered: traces.length,
    accepted: traces.filter(t => t.approved).length,
  }
}

export async function fetchMessageActivity(userId: string, since: Date) {
  const count = await prisma.channelMessage.count({
    where: { authorId: userId, createdAt: { gte: since } },
  })
  return { count }
}

export async function fetchStudyGroupMemberships(userId: string) {
  const count = await prisma.studyGroupMember.count({
    where: { userId },
  })
  return { count }
}

export async function fetchAssignments(userId: string, since: Date) {
  // Get assignments from enrolled courses
  return prisma.assignment.findMany({
    where: {
      course: { enrollments: { some: { userId } } },
      dueDate: { gte: since },
    },
    select: { id: true, dueDate: true },
  })
}

export async function fetchSubmissions(userId: string, since: Date) {
  return prisma.submission.findMany({
    where: { studentId: userId, submittedAt: { gte: since } },
    select: { assignmentId: true, submittedAt: true },
  })
}

export async function fetchCoursePostReads(userId: string, since: Date) {
  return prisma.coursePostRead.count({
    where: { userId, readAt: { gte: since } },
  })
}

export async function fetchTotalCoursePosts(userId: string, since: Date) {
  return prisma.coursePost.count({
    where: {
      course: { enrollments: { some: { userId } } },
      createdAt: { gte: since },
    },
  })
}

export async function fetchInterventions(userId: string, since: Date) {
  const interventions = await prisma.interventionLog.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { accepted: true },
  })
  return {
    total: interventions.length,
    accepted: interventions.filter(i => i.accepted).length,
  }
}

export async function fetchWellnessEntryCount(userId: string, since: Date) {
  return prisma.wellnessEntry.count({
    where: { userId, createdAt: { gte: since } },
  })
}

export async function fetchCalendarEvents(userId: string, since: Date) {
  return prisma.assistantCalendarEvent.findMany({
    where: { userId, startTime: { gte: since } },
    select: { startTime: true, createdAt: true },
  })
}
```

---

## API Routes

### GET `/api/fingerprint/me`

Student views their own fingerprint (transparency card).

```typescript
// app/api/fingerprint/me/route.ts
import { withErrorHandling } from '@/app/lib/api-utils'
import { requireRequestUser, isAuthFailure } from '@/app/lib/server-auth'
import { getFingerprint } from '@/app/lib/fingerprint/fingerprint-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const fingerprint = await getFingerprint(auth.user.id)

  if (!fingerprint) {
    return NextResponse.json({
      status: 'insufficient-data',
      message: 'Keep using the platform and your learning profile will appear here.',
    })
  }

  // Redact raw computation data — student sees friendly profile only
  const { raw, ...profile } = fingerprint
  return NextResponse.json(profile)
})
```

### GET `/api/fingerprint/course/[courseId]`

Faculty views aggregated class fingerprint. Scoped to course owner or admin.

```typescript
// app/api/fingerprint/course/[courseId]/route.ts
import { withErrorHandling } from '@/app/lib/api-utils'
import { requireRequestUser, isAuthFailure } from '@/app/lib/server-auth'
import { getCourseFingerprint } from '@/app/lib/fingerprint/fingerprint-service'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { courseId } = await params

  // Verify course ownership or admin
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { creatorId: true },
  })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  if (course.creatorId !== auth.user.id && auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const fingerprint = await getCourseFingerprint(courseId)
  return NextResponse.json(fingerprint)
})
```

### POST `/api/fingerprint/refresh`

Manual refresh trigger (admin or cron). Recomputes all fingerprints.

```typescript
// app/api/fingerprint/refresh/route.ts
import { withErrorHandling } from '@/app/lib/api-utils'
import { verifyCronSecret } from '@/app/lib/server-auth'
import { refreshAllFingerprints } from '@/app/lib/fingerprint/fingerprint-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const cronAuth = verifyCronSecret(req)
  if (cronAuth) return cronAuth // Returns 401 if invalid

  const result = await refreshAllFingerprints()
  return NextResponse.json({
    refreshed: result.count,
    duration: result.durationMs,
  })
})
```

### GET `/api/fingerprint/sandy-context`

Internal route — Sandy calls this to get fingerprint context for system prompt injection. Not user-facing.

```typescript
// app/api/fingerprint/sandy-context/route.ts
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const fingerprint = await getFingerprint(auth.user.id)
  if (!fingerprint || fingerprint.confidence < 0.2) {
    return NextResponse.json({ context: null })
  }

  // Build Sandy-friendly natural language summary
  const context = buildSandyContext(fingerprint)
  return NextResponse.json({ context })
})

function buildSandyContext(fp: EngagementFingerprint): string {
  const lines: string[] = []

  lines.push(`This user is a "${fp.chronotype}" who is most active around ${fp.peakHours.map(h => formatHour(h)).join(', ')}.`)
  lines.push(`Their study cadence is "${fp.sessionCadence}" with ${fp.sessionsPerWeek.toFixed(1)} sessions/week (avg ${fp.avgSessionMinutes.toFixed(0)} min each).`)

  if (fp.preferredStudyModes.length > 0) {
    lines.push(`Preferred study modes: ${fp.preferredStudyModes.join(', ')}.`)
  }

  lines.push(`Learning modality: ${fp.preferredModality}. Velocity: ${fp.learningVelocity}.`)

  if (fp.collaborationIndex > 0.4) {
    lines.push(`Highly collaborative (${fp.socialOrientation}) — active in live rooms and study groups.`)
  } else if (fp.collaborationIndex < 0.15) {
    lines.push(`Prefers solo work — respect their independence, suggest group activities gently.`)
  }

  lines.push(`Deadline behavior: "${fp.deadlineProximity}". Nudge response rate: ${(fp.nudgeResponseRate * 100).toFixed(0)}%.`)

  if (fp.masteryRetention > 0.8) {
    lines.push(`Strong flashcard retention (${(fp.masteryRetention * 100).toFixed(0)}%) — challenge them with harder material.`)
  } else if (fp.masteryRetention < 0.5) {
    lines.push(`Flashcard retention is low (${(fp.masteryRetention * 100).toFixed(0)}%) — encourage more frequent, shorter review sessions.`)
  }

  lines.push(`Confidence in this profile: ${(fp.confidence * 100).toFixed(0)}%.`)

  return lines.join(' ')
}
```

### POST `/api/cron/fingerprint-refresh`

Nightly cron job — refreshes all fingerprints and course aggregates.

```typescript
// app/api/cron/fingerprint-refresh/route.ts
import { verifyCronSecret } from '@/app/lib/server-auth'
import { refreshAllFingerprints, refreshAllCourseFingerprints } from '@/app/lib/fingerprint/fingerprint-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const cronAuth = verifyCronSecret(req)
  if (cronAuth) return cronAuth

  const [users, courses] = await Promise.all([
    refreshAllFingerprints(),
    refreshAllCourseFingerprints(),
  ])

  return NextResponse.json({
    usersRefreshed: users.count,
    coursesRefreshed: courses.count,
    totalDurationMs: users.durationMs + courses.durationMs,
  })
})
```

---

## Consumer Integrations

### Consumer 1: Sandy System Prompt (concierge-service.ts)

The fingerprint is injected into Sandy's system prompt so she can personalize every interaction.

```typescript
// In concierge-service.ts — buildSystemPrompt()

// Add fingerprint context block
async function buildFingerprintBlock(userId: string): Promise<string> {
  const fp = await getFingerprint(userId)
  if (!fp || fp.confidence < 0.2) return '' // Not enough data yet

  return `
<learner-profile confidence="${(fp.confidence * 100).toFixed(0)}%">
${buildSandyContext(fp)}
</learner-profile>

INSTRUCTIONS FOR USING LEARNER PROFILE:
- Adapt your suggestions to match their study cadence and chronotype
- If they're a "crammer", don't suggest long study plans — suggest focused sessions
- If they're a "night-owl", don't suggest morning study blocks
- If they prefer solo work, suggest individual tools before group activities
- If their nudge response rate is low, be less pushy with suggestions
- If flashcard retention is low, proactively suggest spaced repetition
- Reference their preferred study modes when recommending tools
- This profile is PRIVATE — never reveal raw numbers or classifications to the user unless asked
`
}
```

### Consumer 2: Hub Tool Ordering (hub-config.ts)

Personalized tool ordering within swim lanes based on fingerprint.

```typescript
// New: app/lib/fingerprint/hub-personalization.ts

import { getFingerprint } from './fingerprint-service'

export async function personalizeHubOrder(
  userId: string,
  lanes: HubLane[]
): Promise<HubLane[]> {
  const fp = await getFingerprint(userId)
  if (!fp || fp.confidence < 0.3) return lanes // Not enough data — use defaults

  return lanes.map(lane => ({
    ...lane,
    tools: scoreLaneTools(lane.tools, fp),
  }))
}

function scoreLaneTools(tools: HubTool[], fp: EngagementFingerprint): HubTool[] {
  return tools
    .map(tool => ({
      ...tool,
      _score: computeToolAffinity(tool, fp),
    }))
    .sort((a, b) => b._score - a._score)
}

function computeToolAffinity(tool: HubTool, fp: EngagementFingerprint): number {
  let score = 0

  // Boost tools matching preferred modality
  if (tool.tags?.includes(fp.preferredModality)) score += 2

  // Boost collaborative tools for collaborative users
  if (tool.tags?.includes('collaborative') && fp.collaborationIndex > 0.3) score += 1.5

  // Boost study tools matching preferred modes
  if (fp.preferredStudyModes.includes(tool.slug)) score += 3

  // Boost tools they've used before (familiarity)
  // (This would need a recent-tools lookup — keep simple for v1)

  return score
}
```

### Consumer 3: Study Buddy Default Mode

```typescript
// In StudyBuddyInterface.tsx — useEffect on mount

const fingerprint = useSWR(`/api/fingerprint/me`, fetcher)

// Auto-select preferred mode if user hasn't chosen
useEffect(() => {
  if (fingerprint.data?.preferredStudyModes?.length > 0 && !selectedMode) {
    setSelectedMode(fingerprint.data.preferredStudyModes[0])
  }
}, [fingerprint.data])
```

### Consumer 4: Notification Timing

```typescript
// New: app/lib/fingerprint/notification-timing.ts

export async function getOptimalNotificationWindow(userId: string): Promise<{ hour: number; day: number } | null> {
  const fp = await getFingerprint(userId)
  if (!fp || fp.confidence < 0.3) return null

  return {
    hour: fp.peakHours[0],      // Primary peak hour
    day: fp.peakDays[0],        // Primary peak day
  }
}

// Used by: cron jobs, Sandy proactive nudges, email digest scheduling
```

### Consumer 5: Student Homepage Briefing

```typescript
// In StudentHomepage.tsx — SandyBriefing section

// Fingerprint-aware greeting and suggestions
const fingerprint = useSWR(`/api/fingerprint/me`, fetcher)

// Example: if student is a crammer and has exam in 48h
// Sandy says "I know you like to focus close to deadlines — here's a quick review set"
// instead of "You should have started studying 3 days ago"
```

### Consumer 6: Faculty Course Intelligence

```typescript
// New component: app/components/analytics/ClassFingerprint.tsx

// Renders course-level fingerprint as visual dashboard
// - Chronotype donut chart
// - Cadence distribution bar chart
// - Social orientation breakdown
// - Risk signals as amber badges
// - "Class profile" natural language summary

// Placed in: /analytics/faculty (new tab: "Class Profile")
```

---

## UI Components

### Student: `LearningProfileCard.tsx`

Placed on the student homepage — transparent view of their own fingerprint.

```
┌──────────────────────────────────────────────────────────┐
│  MY LEARNING PROFILE                            (i) info │
│                                                          │
│  🌙 Night Owl  ·  Sprint & Rest  ·  Solo Learner        │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Peak     │ │ Favorite │ │ Session  │ │ Retention│   │
│  │ 8-11 PM  │ │ Flashcard│ │ 22 min   │ │ 78%      │   │
│  │          │ │ Quiz     │ │ avg      │ │ SR cards │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                          │
│  📊 Based on 142 sessions over the last 30 days         │
│  [View full profile →]                                   │
└──────────────────────────────────────────────────────────┘
```

### Faculty: `ClassFingerprintPanel.tsx`

Displayed in the faculty analytics dashboard — aggregated view, no individual students.

```
┌──────────────────────────────────────────────────────────┐
│  CLASS PROFILE — TEK 100 (24 students)                   │
│                                                          │
│  ┌─ Chronotype ──────┐  ┌─ Study Cadence ──────┐       │
│  │ [====] Night Owl 45%│ │ [======] Crammer  40% │       │
│  │ [==]   Steady    25%│ │ [===]   Sprint    30% │       │
│  │ [=]    Early     15%│ │ [==]    Daily     20% │       │
│  │ [=]    Weekend   15%│ │ [=]    Minimal   10% │       │
│  └────────────────────┘  └───────────────────────┘       │
│                                                          │
│  ⚠ Risk: 40% crammers · Low nudge response              │
│                                                          │
│  Top modes: Flashcards, Quiz, Tutor                      │
│  Avg session: 18 min · 3.2 sessions/week                 │
│  Collaboration: 35% small-group, 40% solo                │
│                                                          │
│  SANDY SUGGESTION: "Most of your class works late and    │
│  crams. Consider releasing study materials 72h before    │
│  deadlines with bite-sized review sets."                  │
└──────────────────────────────────────────────────────────┘
```

### Full Profile Page: `/my-profile/learning`

Expanded view with charts (recharts):
- **Temporal heatmap** — hour × day-of-week activity grid
- **Bloom radar chart** — 6-axis bloom distribution
- **Study mode pie chart** — preferred modes
- **Consistency trend line** — 30-day daily activity
- **Fingerprint history** — how profile has shifted over time (requires versioned snapshots)

---

## Sandy Agent Tool

### `get_learner_profile` tool in `sandy-tools.ts`

```typescript
{
  name: 'get_learner_profile',
  description: 'Get the engagement fingerprint and learning profile for the current user or a specific student (if educator viewing their course roster).',
  parameters: {
    type: 'object',
    properties: {
      studentId: {
        type: 'string',
        description: 'Optional: specific student ID (educator use only, must be in their course roster)'
      }
    }
  },
  permission: 'auto',
  handler: async ({ studentId }, context) => {
    const targetId = studentId || context.userId

    // If requesting another student's profile, verify educator has access
    if (studentId && studentId !== context.userId) {
      const hasAccess = await verifyEducatorStudentAccess(context.userId, studentId)
      if (!hasAccess) return { is_error: true, message: 'You can only view profiles of students in your courses.' }
    }

    const fp = await getFingerprint(targetId)
    if (!fp) return { message: 'Not enough data yet to build a learning profile.' }

    return {
      chronotype: fp.chronotype,
      cadence: fp.sessionCadence,
      preferredModes: fp.preferredStudyModes,
      modality: fp.preferredModality,
      collaborationStyle: fp.socialOrientation,
      deadlineBehavior: fp.deadlineProximity,
      sessionsPerWeek: fp.sessionsPerWeek,
      avgSessionMinutes: fp.avgSessionMinutes,
      retention: fp.masteryRetention,
      consistency: fp.consistencyScore,
      confidence: fp.confidence,
    }
  }
}
```

### `get_class_profile` tool in `faculty-tools.ts`

```typescript
{
  name: 'get_class_profile',
  description: 'Get the aggregated engagement fingerprint for a course section. Shows class-level patterns without identifying individual students.',
  parameters: {
    type: 'object',
    properties: {
      courseId: { type: 'string', description: 'Course ID to analyze' }
    },
    required: ['courseId']
  },
  permission: 'auto',
  handler: async ({ courseId }, context) => {
    // Verify course ownership
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { creatorId: true, title: true },
    })
    if (!course) return { is_error: true, message: 'Course not found.' }
    if (course.creatorId !== context.userId && context.userRole !== 'ADMIN') {
      return { is_error: true, message: 'You can only view profiles for your own courses.' }
    }

    const cfp = await getCourseFingerprint(courseId)
    if (!cfp) return { message: 'Not enough student data to build a class profile.' }

    return {
      courseName: course.title,
      studentCount: cfp.studentCount,
      dominantChronotype: cfp.dominantChronotype,
      dominantCadence: cfp.dominantCadence,
      distributions: {
        chronotype: cfp.chronotypeDistribution,
        cadence: cfp.cadenceDistribution,
        social: cfp.socialDistribution,
        deadline: cfp.deadlineDistribution,
      },
      topStudyModes: cfp.topStudyModes,
      avgSessionMinutes: cfp.avgSessionMinutes,
      avgConsistency: cfp.avgConsistencyScore,
      riskSignals: cfp.riskSignals,
      engagementTrend: cfp.engagementTrend,
    }
  }
}
```

---

## Files to Create

| File | Purpose |
|---|---|
| `app/lib/fingerprint/fingerprint-engine.ts` | Core computation pipeline — orchestrates all signal aggregation |
| `app/lib/fingerprint/fingerprint-service.ts` | Read/write/refresh logic, staleness checks, course aggregation |
| `app/lib/fingerprint/data-fetchers.ts` | Thin Prisma query wrappers for each signal source |
| `app/lib/fingerprint/temporal.ts` | Chronotype + cadence classification |
| `app/lib/fingerprint/learning.ts` | Study mode, modality, bloom, velocity, retention computation |
| `app/lib/fingerprint/engagement.ts` | Tool diversity, consistency, session metrics, deadline proximity |
| `app/lib/fingerprint/social.ts` | Collaboration index, social orientation, live room & messaging stats |
| `app/lib/fingerprint/responsiveness.ts` | Nudge, announcement, Sandy engagement rates |
| `app/lib/fingerprint/hub-personalization.ts` | Tool affinity scoring for personalized hub ordering |
| `app/lib/fingerprint/notification-timing.ts` | Optimal notification window from peak hours |
| `app/lib/fingerprint/types.ts` | Shared TypeScript interfaces for all fingerprint data |
| `app/api/fingerprint/me/route.ts` | GET — student views own fingerprint |
| `app/api/fingerprint/course/[courseId]/route.ts` | GET — faculty views class aggregate |
| `app/api/fingerprint/refresh/route.ts` | POST — cron-triggered batch refresh |
| `app/api/fingerprint/sandy-context/route.ts` | GET — Sandy system prompt injection |
| `app/api/cron/fingerprint-refresh/route.ts` | POST — nightly cron job |
| `app/components/fingerprint/LearningProfileCard.tsx` | Compact student homepage card |
| `app/components/fingerprint/LearningProfileFull.tsx` | Full profile page with charts |
| `app/components/fingerprint/ClassFingerprintPanel.tsx` | Faculty analytics class profile |
| `app/components/fingerprint/ChronotypeChart.tsx` | Donut chart for chronotype distribution |
| `app/components/fingerprint/CadenceChart.tsx` | Bar chart for cadence distribution |
| `app/components/fingerprint/BloomRadar.tsx` | 6-axis radar chart for bloom profile |
| `app/components/fingerprint/ActivityHeatmap.tsx` | Hour × day-of-week heatmap |
| `app/my-profile/learning/page.tsx` | Full learning profile page |

## Files to Modify

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `EngagementFingerprint` and `CourseFingerprint` models + relations |
| `app/lib/concierge-service.ts` | Inject fingerprint context block into Sandy system prompt |
| `app/lib/agent/tools/sandy-tools.ts` | Add `get_learner_profile` tool |
| `app/lib/agent/tools/faculty-tools.ts` | Add `get_class_profile` tool |
| `app/lib/agent/tool-registry.ts` | Register new tools |
| `app/hub/hub-config.ts` | Wire personalization hook into lane ordering |
| `app/components/student-home/StudentHomepage.tsx` | Add `LearningProfileCard` to homepage |
| `app/components/StudyBuddyInterface.tsx` | Auto-select preferred mode from fingerprint |
| `app/components/student-home/SandyBriefing.tsx` | Fingerprint-aware briefing content |
| `app/components/Header.tsx` | Add "My Profile" nav link (if adding `/my-profile` route) |
| `app/analytics/faculty/page.tsx` | Add "Class Profile" tab with `ClassFingerprintPanel` |

## Files to Read (before implementation)

| File | Why |
|---|---|
| `app/lib/concierge-service.ts` | Understand system prompt injection points |
| `app/lib/agent/tool-registry.ts` | Tool registration pattern |
| `app/lib/agent/tools/sandy-tools.ts` | Existing Sandy tools pattern |
| `app/lib/agent/tools/faculty-tools.ts` | Existing faculty tools pattern |
| `app/components/student-home/StudentHomepage.tsx` | Homepage card placement |
| `app/components/StudyBuddyInterface.tsx` | Mode selection logic |
| `app/hub/hub-config.ts` | Lane ordering mechanism |
| `app/analytics/faculty/page.tsx` | Analytics tab structure |
| `prisma/schema.prisma` | Existing models referenced by fetchers |

---

## Privacy & FERPA

| Concern | Mitigation |
|---|---|
| **No new data collection** | Fingerprint is 100% derived from existing interaction data — no new tracking |
| **Student transparency** | Students can view their own full profile at `/my-profile/learning` |
| **No individual exposure to faculty** | `CourseFingerprint` only shows class-level distributions (percentages), never individual students |
| **FERPA scoping** | Faculty can only access `CourseFingerprint` for courses they own; Sandy tool verifies roster membership |
| **Confidence gating** | Low-confidence fingerprints (< 0.2) are not shown or injected into Sandy — prevents inaccurate profiling |
| **Opt-out ready** | Architecture supports a `fingerprintOptOut` flag on User model (not implemented in v1 — add if FERPA review requires it) |
| **Sensitive sessions excluded** | `sensitiveSession: true` tool sessions are excluded from fingerprint computation (consistent with existing analytics) |
| **No wellness content** | Only wellness entry *count* (frequency) is used — never the content of entries |

---

## Patent Claims (Architecture Intentionally Supports)

1. **Multi-signal behavioral fingerprinting** — synthesizing 14+ distinct signal sources into a unified adaptive learner profile
2. **One Brain pillar** — every platform interaction feeds the fingerprint; every surface consumes it (the interdependency web)
3. **Lazy refresh with staleness threshold** — hybrid cron + on-demand computation optimizes cost without sacrificing freshness
4. **Class-level aggregation without individual exposure** — FERPA-compliant intelligence for faculty derived from individual profiles but presented only as distributions
5. **Natural language profile injection** — structured data → natural language → AI system prompt → adaptive conversation behavior
6. **Cross-system reasoning** — a study session in Study Buddy, a message in chat, and a Live Room challenge all feed the same profile, enabling recommendations no single system could make alone

---

## Cron Schedule

| Job | Schedule | Route |
|---|---|---|
| Fingerprint refresh | Nightly 3:00 AM ET | `POST /api/cron/fingerprint-refresh` |

Batch refresh iterates all users with `ToolSession` activity in the last 30 days. Estimated runtime: ~2-5 seconds per user (14 parallel queries), ~5 minutes for 100 active users.

---

## Migration Path

1. **Sprint 1**: Schema + engine + data fetchers + fingerprint service + cron + `/api/fingerprint/me` + `LearningProfileCard` on homepage
2. **Sprint 2**: Sandy integration (system prompt + agent tools) + Study Buddy default mode + notification timing + hub personalization
3. **Sprint 3**: Faculty `ClassFingerprintPanel` + `/my-profile/learning` full page + faculty analytics tab + risk signals

---

## What This Does NOT Do

- Does not introduce new data collection or tracking mechanisms
- Does not expose individual student fingerprints to other students
- Does not use LLM for computation (pure SQL aggregation + heuristics)
- Does not replace existing analytics — it supplements them with a behavioral intelligence layer
- Does not require real-time computation — nightly batch with lazy refresh is sufficient
- Does not create gamification (no badges/scores from fingerprint — per DO NOT REBUILD rule)

---

## Success Criteria

1. **Sandy adapts.** A night-owl crammer gets different study suggestions than a morning daily-grinder — and the suggestions feel natural, not creepy.
2. **Students see themselves.** The `LearningProfileCard` gives students a moment of recognition: "Yeah, that's me."
3. **Faculty gain insight.** The class fingerprint reveals patterns invisible in gradebooks: "45% of my class are crammers — I should release study materials earlier."
4. **The Hub feels personal.** Tools relevant to the user's profile surface higher in swim lanes.
5. **The patent strengthens.** Every signal path, every consumer, every cross-system inference is documented and architecturally intentional.
