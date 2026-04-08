# Blueprint: Student Success Early Warning — Individual Retention Intelligence

> **Sprint Scope:** Per-student success prediction system that aggregates behavioral signals, computes trajectory scores, detects inflection points, routes alerts to the right responder, suggests interventions, and tracks outcomes — all FERPA-safe and never shame-based
> **Depends On:** Engagement Fingerprint Engine (BUILT — reads fingerprint data), Faculty Intelligence (enriches morning briefing), Course enrollment data, StudentConceptMastery, FlashcardState, ToolSession, Commons participation
> **Unlocks:** Proactive retention interventions, advisor dashboard, faculty risk heatmaps, Campus Pulse individual signal feed, accreditation evidence for student support (SACSCOC 12.1), Classroom Intelligence Loop teaching adjustments
> **Estimated Size:** Large — 6 phases, each independently deployable (recommend 1 phase per sprint)
> **Patent Relevance:** **HIGH** — "Multi-signal student success prediction system with trajectory inflection detection, role-appropriate alert routing, intervention recommendation engine, and closed-loop outcome tracking in an AI-mediated educational operating system"

---

## Context

### The Problem

Universities lose students in slow motion and notice too late:

1. **Signal blindness.** Platform data shows a student stopped logging in, stopped reviewing flashcards, missed two assignments, and dropped out of a study group — but no single system connects these dots. Each data point lives in its own silo.
2. **Alert fatigue.** Existing "early alert" systems generate binary flags — student is "at risk" or "not at risk." Faculty get a spreadsheet of 30 flagged students and no idea which ones to call first or what to say.
3. **Wrong responder.** A student struggling with course material needs their instructor. A student dealing with a personal crisis needs their advisor. Current systems route all alerts to the same inbox.
4. **No feedback loop.** When an instructor reaches out to a struggling student, there's no way to know if it worked. Did the student re-engage? Did they start studying again? The intervention disappears into the void.
5. **Shame-based nudging.** Most retention systems send messages like "You're falling behind!" which makes students feel surveilled and judged rather than supported.

### The Vision

| Old Model | New Model | Platform Feature |
|-----------|-----------|-----------------|
| Binary risk flag | Composite Success Score (0-100) with trajectory direction | Per-student per-course daily score |
| Flat student list | Priority-ranked queue with signal breakdown | Faculty Risk Dashboard |
| Same alert for everything | Pattern-classified routing (academic → instructor, life-crisis → advisor) | Smart Alert Router |
| "You're falling behind" | "Hey, I noticed you haven't been around — want to pick up where you left off?" | Sandy Gentle Nudges |
| No follow-up | Intervention outcome tracking with re-engagement detection | Closed-Loop Tracker |
| Spreadsheet export | Real-time heatmap with drill-down | Course Risk Heatmap |
| End-of-semester surprise | 7-day trajectory inflection alerts | Early Inflection Detection |

### Why This Works

1. **the platform sees everything.** Unlike external retention tools that only see grades and LMS logins, the platform captures Sandy conversations, flashcard review cadence, Commons participation, concept mastery trajectories, and tool usage — a 360-degree behavioral picture.
2. **Engagement Fingerprint provides the baseline.** The already-built fingerprint engine computes each student's normal patterns. Early warning detects *deviations from their personal baseline*, not arbitrary thresholds.
3. **Sandy is already the primary interface.** Gentle nudges from Sandy feel like a friend checking in, not an institution surveilling you.
4. **Faculty Intelligence is already built.** Risk signals enrich the morning briefing that faculty already read.
5. **FERPA by design.** Faculty see only students in their courses. Advisors see only assigned advisees. Aggregates are anonymized. Individual data requires a need-to-know relationship.

### Key Differentiator from Campus Pulse

**Campus Pulse** detects *institutional* patterns: "2+ signal streams are converging around the topic of exam accommodations campus-wide." It watches for themes across the entire student body.

**Student Success Early Warning** detects *individual* trajectories: "Tiana's engagement in CS 201 dropped 40% in 7 days, she missed her last flashcard review, and her concept mastery in recursion is declining." It watches each student against their own baseline.

The two systems complement each other: individual at-risk signals can feed *up* into Campus Pulse when patterns emerge across many students. Campus Pulse themes can feed *down* into early warning context ("This student's struggle may be related to the campus-wide exam accommodations confusion").

### Integration with Existing Systems

| Existing Feature | How It's Connected |
|-----------------|-------------------|
| `EngagementFingerprint` (BUILT) | Reads fingerprint to establish personal baseline; deviation from baseline drives alert sensitivity |
| `CourseFingerprint` (BUILT) | Class-level aggregate provides comparison context ("Is this student struggling or is the whole class?") |
| `StudentConceptMastery` | Mastery trajectory slope is a primary signal — declining mastery = academic risk |
| `FlashcardState` (SM-2) | Review consistency and overdue card count feed the study behavior signal |
| `ToolSession` | Session frequency, duration, and Sandy usage patterns feed engagement signal |
| `GradebookEntry` | Grade trends (slope) and missing assignments feed academic performance signal |
| `Submission` | Late submission patterns and submission rate feed academic behavior signal |
| `CourseEnrollment` | Enrollment status + last activity timestamp |
| `FacultyBriefing` | Risk alerts injected into morning briefing narrative |
| `LiveRoom` / Commons | Commons participation frequency feeds social engagement signal |
| Campus Pulse | Individual signals feed up; campus themes provide context down |
| Classroom Intelligence Loop | Teaching adjustments respond to at-risk clusters; intervention data feeds effectiveness tracking |
| Accreditation Autopilot | Intervention data = evidence for SACSCOC 12.1 (Student Support Services) |

---

## Schema Changes

### New Enum: `SuccessSignalType`

```prisma
enum SuccessSignalType {
  LOGIN_FREQUENCY          // Platform login cadence vs personal baseline
  ASSIGNMENT_SUBMISSION    // On-time, late, missing pattern
  SANDY_USAGE_DECAY        // Sandy conversation frequency declining
  STUDY_SESSION_CADENCE    // Study Buddy session frequency
  CONCEPT_MASTERY_SLOPE    // Mastery trajectory direction (improving/declining/stagnant)
  COMMONS_PARTICIPATION    // Commons room joins, contributions
  FLASHCARD_CONSISTENCY    // SR review adherence, overdue card count
  GRADE_TREND              // Rolling grade average direction
  TOOL_ENGAGEMENT          // Breadth and depth of tool usage
  CONTENT_ACCESS           // Course material view frequency
}
```

### New Enum: `AlertSeverity`

```prisma
enum AlertSeverity {
  WATCH         // Score dipped below 70, no action needed yet
  CONCERN       // Score below 50 or 30%+ drop in 7 days
  URGENT        // Score below 30 or 50%+ drop in 7 days
  CRITICAL      // Score below 15 or multiple compounding signals
}
```

### New Enum: `AlertRouteTarget`

```prisma
enum AlertRouteTarget {
  INSTRUCTOR      // Academic pattern: declining grades, missing work, concept struggles
  ADVISOR         // Life-crisis pattern: broad disengagement across all courses
  BOTH            // Compound risk: academic + engagement collapse
  SELF_SERVE      // Mild dip: Sandy nudge sufficient, no human alert
}
```

### New Enum: `InterventionType`

```prisma
enum InterventionType {
  SANDY_NUDGE           // Automated gentle nudge via Sandy
  INSTRUCTOR_OUTREACH   // Instructor sends personal message
  ADVISOR_MEETING       // Advisor schedules check-in
  PEER_CONNECTION       // Connected with study group or peer mentor
  RESOURCE_REFERRAL     // Referred to campus resource (counseling, tutoring, etc.)
  ACCOMMODATION_REVIEW  // Triggered review of academic accommodations
  CUSTOM                // Free-form intervention note
}
```

### New Enum: `InterventionOutcome`

```prisma
enum InterventionOutcome {
  PENDING           // Intervention sent, awaiting response window
  RE_ENGAGED        // Student showed measurable re-engagement within 14 days
  PARTIAL           // Some improvement but still below baseline
  NO_CHANGE         // No measurable change in 14 days
  DECLINED          // Student acknowledged but declined help
  ESCALATED         // Situation worsened, escalated to higher authority
  UNKNOWN           // Response window expired with insufficient data
}
```

### New Model: `StudentSuccessScore`

The core model. One record per student per course, recomputed daily by cron.

```prisma
model StudentSuccessScore {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  courseId         String
  course           Course   @relation(fields: [courseId], references: [id])

  // Composite score (0-100)
  score            Int                // Current composite success score
  previousScore    Int?               // Score from previous computation (for delta)
  scoreDelta7d     Int?               // Change over last 7 days
  scoreDelta14d    Int?               // Change over last 14 days
  trajectory       String  @default("stable")  // "improving" | "stable" | "declining" | "critical_decline"

  // Individual signal scores (0-100 each)
  loginScore           Int?
  assignmentScore      Int?
  sandyUsageScore      Int?
  studySessionScore    Int?
  conceptMasteryScore  Int?
  commonsScore         Int?
  flashcardScore       Int?
  gradeTrendScore      Int?
  toolEngagementScore  Int?
  contentAccessScore   Int?

  // Signal weights (personalized based on fingerprint)
  signalWeightsJson    Json?           // { loginFrequency: 0.15, assignmentSubmission: 0.20, ... }

  // Inflection detection
  inflectionDetected   Boolean  @default(false)
  inflectionType       String?         // "sudden_drop" | "gradual_decline" | "plateau_after_decline" | "recovery"
  inflectionDetectedAt DateTime?

  // Baseline reference
  baselineScore        Int?            // Score at enrollment or first computation
  peakScore            Int?            // Highest score achieved
  daysSinceActive      Int   @default(0)

  computedAt       DateTime @default(now())
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@unique([userId, courseId])
  @@index([courseId, score])
  @@index([userId])
  @@index([trajectory])
}
```

### New Model: `SuccessAlert`

Generated when a student's trajectory crosses a threshold. Routed to the appropriate responder.

```prisma
model SuccessAlert {
  id              String         @id @default(cuid())
  userId          String
  user            User           @relation(fields: [userId], references: [id])
  courseId         String
  course           Course        @relation(fields: [courseId], references: [id])
  scoreId         String
  score           StudentSuccessScore @relation(fields: [scoreId], references: [id])

  severity        AlertSeverity
  routeTarget     AlertRouteTarget

  // What triggered this alert
  triggerReason   String   @db.Text   // "Score dropped from 72 to 41 in 7 days. Primary drivers: 3 missed assignments, Sandy usage down 80%, no flashcard reviews in 10 days."
  signalBreakdown Json                // [{signal: "assignmentSubmission", score: 15, delta: -45, detail: "3 of last 4 assignments missing"}]
  suggestedActions Json               // [{action: "Schedule check-in", reason: "Multiple missed assignments suggests external barrier"}, ...]

  // Alert lifecycle
  status          String  @default("active")  // "active" | "acknowledged" | "acted_on" | "resolved" | "dismissed" | "expired"
  acknowledgedBy  String?
  acknowledgedAt  DateTime?
  actedOnAt       DateTime?
  resolvedAt      DateTime?
  dismissReason   String?

  // Pattern classification
  patternType     String?          // "academic_decline" | "broad_disengagement" | "sudden_absence" | "gradual_fade" | "social_withdrawal" | "study_abandonment"
  confidenceScore Float?           // 0-1: how confident the system is in the pattern classification

  expiresAt       DateTime         // Alerts expire after 14 days if not acted on
  createdAt       DateTime @default(now())

  interventions   SuccessIntervention[]

  @@index([courseId, severity, status])
  @@index([userId, status])
  @@index([routeTarget, status])
}
```

### New Model: `SuccessIntervention`

Tracks what was done in response to an alert and whether it worked.

```prisma
model SuccessIntervention {
  id              String              @id @default(cuid())
  alertId         String
  alert           SuccessAlert        @relation(fields: [alertId], references: [id])
  userId          String                                 // Student receiving intervention
  user            User                @relation("InterventionRecipient", fields: [userId], references: [id])
  initiatorId     String                                 // Faculty/advisor who initiated
  initiator       User                @relation("InterventionInitiator", fields: [initiatorId], references: [id])

  type            InterventionType
  notes           String?  @db.Text   // What was done: "Called student, they're dealing with family emergency. Connected with Dean of Students."
  
  // Outcome tracking
  outcome         InterventionOutcome @default(PENDING)
  outcomeNotes    String?  @db.Text
  outcomeDetectedAt DateTime?

  // Re-engagement metrics at time of outcome measurement
  scoreAtIntervention  Int?           // Success score when intervention happened
  scoreAtOutcome       Int?           // Success score when outcome was measured
  reEngagementSignals  Json?          // [{signal: "loginFrequency", before: 12, after: 45, improved: true}]

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([alertId])
  @@index([userId])
  @@index([outcome])
}
```

### New Model: `SuccessScoreHistory`

Daily snapshot for trend visualization. Kept for 120 days per student per course.

```prisma
model SuccessScoreHistory {
  id              String   @id @default(cuid())
  userId          String
  courseId         String
  score           Int
  trajectory      String
  topSignal       String?           // The signal contributing most to score change
  topSignalDelta  Int?              // How much that signal changed
  computedAt      DateTime

  @@index([userId, courseId, computedAt])
  @@index([courseId, computedAt])
}
```

### New Model: `SuccessAlertPreference`

Per-instructor notification preferences to prevent alert fatigue.

```prisma
model SuccessAlertPreference {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])

  // Severity filter: which severities generate notifications
  minSeverity     AlertSeverity @default(CONCERN)

  // Delivery preferences
  emailDigest     Boolean  @default(true)     // Daily email digest of new alerts
  briefingInject  Boolean  @default(true)     // Include in morning briefing
  sandyNotify     Boolean  @default(true)     // Sandy mentions in concierge

  // Batch vs real-time
  batchWindow     Int      @default(24)       // Hours to batch alerts (0 = real-time)
  
  // Quiet hours
  quietStart      Int?                        // Hour (0-23) to stop notifications
  quietEnd        Int?                        // Hour (0-23) to resume

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([userId])
}
```

---

## Service Architecture

### Service: `app/lib/success/types.ts`

```typescript
// ─── Shared types for Student Success Early Warning ─────────────────────────

export type Trajectory = 'improving' | 'stable' | 'declining' | 'critical_decline'

export type PatternType =
  | 'academic_decline'       // Grades/assignments declining, other signals stable
  | 'broad_disengagement'    // Decline across 4+ signals simultaneously
  | 'sudden_absence'         // Activity drops to near-zero within 3 days
  | 'gradual_fade'           // Slow decline over 14+ days
  | 'social_withdrawal'      // Commons/group participation declining, academics stable
  | 'study_abandonment'      // Flashcards/study sessions stopped, other activity continues

export interface SignalScore {
  signal: string
  score: number           // 0-100
  delta7d: number         // Change in last 7 days
  detail: string          // Human-readable explanation
  rawMetrics: Record<string, number>  // Underlying data points
}

export interface SuccessScoreResult {
  composite: number       // 0-100
  trajectory: Trajectory
  signals: SignalScore[]
  inflection: InflectionResult | null
  pattern: PatternClassification | null
}

export interface InflectionResult {
  type: 'sudden_drop' | 'gradual_decline' | 'plateau_after_decline' | 'recovery'
  magnitude: number       // 0-1: how dramatic
  primaryDrivers: string[] // Which signals drove the inflection
  detectedAt: Date
}

export interface PatternClassification {
  type: PatternType
  confidence: number      // 0-1
  evidence: string[]      // Human-readable evidence list
  suggestedTarget: 'INSTRUCTOR' | 'ADVISOR' | 'BOTH' | 'SELF_SERVE'
}

export interface InterventionSuggestion {
  action: string
  reason: string
  urgency: 'immediate' | 'this_week' | 'when_convenient'
  type: string            // InterventionType value
}

export interface StudentRiskSummary {
  userId: string
  userName: string
  score: number
  trajectory: Trajectory
  severity: string
  topSignals: { signal: string; score: number; delta: number }[]
  daysSinceActive: number
  openAlerts: number
  lastIntervention: Date | null
}

export interface CourseRiskHeatmap {
  courseId: string
  courseName: string
  totalStudents: number
  distribution: {
    healthy: number       // Score 70-100
    watch: number         // Score 50-69
    concern: number       // Score 30-49
    urgent: number        // Score 10-29
    critical: number      // Score 0-9
  }
  avgScore: number
  avgDelta7d: number
  topRiskStudents: StudentRiskSummary[]
}

// Signal weight defaults — personalized per student via fingerprint
export const DEFAULT_SIGNAL_WEIGHTS: Record<string, number> = {
  loginFrequency: 0.10,
  assignmentSubmission: 0.20,
  sandyUsageDecay: 0.10,
  studySessionCadence: 0.10,
  conceptMasterySlope: 0.15,
  commonsParticipation: 0.05,
  flashcardConsistency: 0.10,
  gradeTrend: 0.15,
  toolEngagement: 0.03,
  contentAccess: 0.02,
}

// Trajectory thresholds
export const TRAJECTORY_THRESHOLDS = {
  improving: 5,           // +5 or more over 7 days
  stable_upper: 5,        // -5 to +5 over 7 days
  stable_lower: -5,
  declining: -15,         // -5 to -15 over 7 days
  critical_decline: -15,  // -15 or worse over 7 days
} as const

// Alert severity thresholds
export const SEVERITY_THRESHOLDS = {
  WATCH: 70,
  CONCERN: 50,
  URGENT: 30,
  CRITICAL: 15,
} as const
```

### Service: `app/lib/success/signal-collectors.ts`

Individual signal computation functions. Each reads from existing models and returns a 0-100 score.

```typescript
import { prisma } from '../prisma'

/** Login frequency score: compares recent 7d logins against 30d baseline */
export async function computeLoginScore(userId: string, courseId: string): Promise<{
  score: number
  detail: string
  rawMetrics: Record<string, number>
}> {
  const now = new Date()
  const d7 = new Date(now.getTime() - 7 * 86400000)
  const d30 = new Date(now.getTime() - 30 * 86400000)

  // Count distinct days with any ToolSession activity
  const recent7d = await prisma.toolSession.groupBy({
    by: ['createdAt'],
    where: { userId, createdAt: { gte: d7 } },
  })
  const baseline30d = await prisma.toolSession.groupBy({
    by: ['createdAt'],
    where: { userId, createdAt: { gte: d30, lt: d7 } },
  })

  const recentDays = new Set(recent7d.map(s => s.createdAt.toISOString().slice(0, 10))).size
  const baselineDays = new Set(baseline30d.map(s => s.createdAt.toISOString().slice(0, 10))).size
  const baselineRate = baselineDays / 23 // 23 days in the non-recent window
  const recentRate = recentDays / 7

  const ratio = baselineRate > 0 ? recentRate / baselineRate : recentRate > 0 ? 1 : 0
  const score = Math.round(Math.min(100, ratio * 100))

  return {
    score,
    detail: `${recentDays} active days in last 7d (baseline: ${(baselineRate * 7).toFixed(1)} days/week)`,
    rawMetrics: { recentDays, baselineDays, recentRate, baselineRate },
  }
}

/** Assignment submission score: on-time/late/missing pattern */
export async function computeAssignmentScore(userId: string, courseId: string): Promise<{
  score: number
  detail: string
  rawMetrics: Record<string, number>
}> {
  const assignments = await prisma.assignment.findMany({
    where: { courseId, dueDate: { lte: new Date() } },
    include: {
      submissions: { where: { studentId: userId } },
    },
    orderBy: { dueDate: 'desc' },
    take: 10, // Last 10 assignments
  })

  let onTime = 0, late = 0, missing = 0
  for (const a of assignments) {
    if (a.submissions.length === 0) {
      missing++
    } else {
      const sub = a.submissions[0]
      if (sub.createdAt <= a.dueDate!) {
        onTime++
      } else {
        late++
      }
    }
  }

  const total = assignments.length
  if (total === 0) return { score: 80, detail: 'No assignments due yet', rawMetrics: {} }

  // Scoring: on-time = full credit, late = half, missing = zero
  const score = Math.round(((onTime + late * 0.5) / total) * 100)
  // Recent weighting: last 3 assignments count double
  const recent3 = assignments.slice(0, 3)
  const recentMissing = recent3.filter(a => a.submissions.length === 0).length

  return {
    score: recentMissing >= 2 ? Math.min(score, 30) : score, // Cap if recent streak is bad
    detail: `${onTime} on-time, ${late} late, ${missing} missing out of ${total}. Recent: ${recentMissing} missing in last 3.`,
    rawMetrics: { onTime, late, missing, total, recentMissing },
  }
}

/** Sandy usage decay: conversation frequency compared to personal baseline */
export async function computeSandyUsageScore(userId: string, courseId: string): Promise<{
  score: number
  detail: string
  rawMetrics: Record<string, number>
}> {
  const now = new Date()
  const d7 = new Date(now.getTime() - 7 * 86400000)
  const d30 = new Date(now.getTime() - 30 * 86400000)

  const [recent, baseline] = await Promise.all([
    prisma.toolSession.count({ where: { userId, createdAt: { gte: d7 } } }),
    prisma.toolSession.count({ where: { userId, createdAt: { gte: d30, lt: d7 } } }),
  ])

  const baselineWeekly = baseline / 3.29 // ~23 days = 3.29 weeks
  const ratio = baselineWeekly > 0 ? recent / baselineWeekly : recent > 0 ? 1 : 0.5
  const score = Math.round(Math.min(100, ratio * 100))

  return {
    score,
    detail: `${recent} sessions this week (baseline: ${baselineWeekly.toFixed(1)}/week)`,
    rawMetrics: { recent, baseline, baselineWeekly },
  }
}

/** Study session cadence: Study Buddy usage pattern */
export async function computeStudySessionScore(userId: string, courseId: string): Promise<{
  score: number
  detail: string
  rawMetrics: Record<string, number>
}> {
  const now = new Date()
  const d14 = new Date(now.getTime() - 14 * 86400000)

  // Study Buddy sessions are ToolSessions linked to the study buddy tool
  const sessions = await prisma.toolSession.findMany({
    where: {
      userId,
      createdAt: { gte: d14 },
      tool: { slug: 'study-buddy' },
    },
    orderBy: { createdAt: 'desc' },
  })

  const sessionsPerWeek = sessions.length / 2
  // Healthy: 2+ sessions/week = 100, 1/week = 70, 0 = 30
  const score = Math.round(Math.min(100, sessionsPerWeek >= 2 ? 100 : sessionsPerWeek >= 1 ? 70 : sessionsPerWeek > 0 ? 50 : 30))

  return {
    score,
    detail: `${sessions.length} study sessions in last 14 days (${sessionsPerWeek.toFixed(1)}/week)`,
    rawMetrics: { sessionCount: sessions.length, sessionsPerWeek },
  }
}

/** Concept mastery slope: are mastery scores improving or declining? */
export async function computeConceptMasteryScore(userId: string, courseId: string): Promise<{
  score: number
  detail: string
  rawMetrics: Record<string, number>
}> {
  const masteries = await prisma.studentConceptMastery.findMany({
    where: { userId, courseId },
    orderBy: { updatedAt: 'desc' },
  })

  if (masteries.length === 0) return { score: 70, detail: 'No concept mastery data yet', rawMetrics: {} }

  const avgMastery = masteries.reduce((sum, m) => sum + m.masteryScore, 0) / masteries.length
  // Check recent encounters for trend
  const recentlyActive = masteries.filter(m => {
    const daysSinceUpdate = (Date.now() - m.updatedAt.getTime()) / 86400000
    return daysSinceUpdate < 14
  })
  const improving = recentlyActive.filter(m => m.successCount > m.encounterCount * 0.6).length
  const declining = recentlyActive.filter(m => m.successCount < m.encounterCount * 0.4).length

  const trendBonus = (improving - declining) * 5
  const score = Math.round(Math.min(100, Math.max(0, avgMastery * 100 + trendBonus)))

  return {
    score,
    detail: `Avg mastery: ${(avgMastery * 100).toFixed(0)}% across ${masteries.length} concepts. ${improving} improving, ${declining} declining.`,
    rawMetrics: { avgMastery, conceptCount: masteries.length, improving, declining },
  }
}

/** Commons participation: social engagement signal */
export async function computeCommonsScore(userId: string, courseId: string): Promise<{
  score: number
  detail: string
  rawMetrics: Record<string, number>
}> {
  const now = new Date()
  const d14 = new Date(now.getTime() - 14 * 86400000)

  const participations = await prisma.liveRoomParticipant.count({
    where: {
      userId,
      joinedAt: { gte: d14 },
    },
  })

  // Any participation in 14 days is positive
  const score = participations >= 4 ? 100 : participations >= 2 ? 80 : participations >= 1 ? 60 : 40

  return {
    score,
    detail: `${participations} Commons sessions in last 14 days`,
    rawMetrics: { participations },
  }
}

/** Flashcard consistency: SR review adherence */
export async function computeFlashcardScore(userId: string, courseId: string): Promise<{
  score: number
  detail: string
  rawMetrics: Record<string, number>
}> {
  const now = new Date()

  const cards = await prisma.flashcardState.findMany({
    where: { userId },
  })

  if (cards.length === 0) return { score: 70, detail: 'No flashcards yet', rawMetrics: {} }

  const overdue = cards.filter(c => c.nextReviewAt && c.nextReviewAt < now).length
  const total = cards.length
  const overdueRatio = overdue / total

  // Fewer overdue = better score
  const score = Math.round(Math.max(0, (1 - overdueRatio) * 100))

  return {
    score,
    detail: `${overdue} of ${total} flashcards overdue (${(overdueRatio * 100).toFixed(0)}%)`,
    rawMetrics: { overdue, total, overdueRatio },
  }
}

/** Grade trend: rolling average direction */
export async function computeGradeTrendScore(userId: string, courseId: string): Promise<{
  score: number
  detail: string
  rawMetrics: Record<string, number>
}> {
  const entries = await prisma.gradebookEntry.findMany({
    where: {
      submission: { studentId: userId },
      assignment: { courseId },
      releasedScore: { not: null },
    },
    orderBy: { gradedAt: 'asc' },
    select: { releasedScore: true, gradedAt: true },
  })

  if (entries.length < 2) return { score: 75, detail: 'Insufficient grade data for trend', rawMetrics: {} }

  // Simple linear regression on scores
  const scores = entries.map(e => e.releasedScore!)
  const n = scores.length
  const avgScore = scores.reduce((a, b) => a + b, 0) / n

  // Last 3 vs first half
  const recentAvg = scores.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, scores.length)
  const earlyAvg = scores.slice(0, Math.ceil(n / 2)).reduce((a, b) => a + b, 0) / Math.ceil(n / 2)

  const trend = recentAvg - earlyAvg // Positive = improving
  const score = Math.round(Math.min(100, Math.max(0, avgScore + trend * 2)))

  return {
    score,
    detail: `Recent avg: ${recentAvg.toFixed(0)}%, Early avg: ${earlyAvg.toFixed(0)}%, Trend: ${trend > 0 ? '+' : ''}${trend.toFixed(1)}`,
    rawMetrics: { avgScore, recentAvg, earlyAvg, trend, entryCount: n },
  }
}

/** Tool engagement: breadth and depth of platform tool usage */
export async function computeToolEngagementScore(userId: string, courseId: string): Promise<{
  score: number
  detail: string
  rawMetrics: Record<string, number>
}> {
  const now = new Date()
  const d14 = new Date(now.getTime() - 14 * 86400000)

  const sessions = await prisma.toolSession.findMany({
    where: { userId, createdAt: { gte: d14 } },
    select: { toolId: true, messageCount: true },
  })

  const uniqueTools = new Set(sessions.map(s => s.toolId)).size
  const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0)

  // Breadth (unique tools) + Depth (messages per session)
  const breadthScore = Math.min(50, uniqueTools * 10) // Max 50 from breadth
  const depthScore = Math.min(50, totalMessages * 2)   // Max 50 from depth
  const score = breadthScore + depthScore

  return {
    score: Math.round(Math.min(100, score)),
    detail: `${uniqueTools} unique tools, ${totalMessages} total messages in last 14 days`,
    rawMetrics: { uniqueTools, totalMessages, sessionCount: sessions.length },
  }
}

/** Content access: course material view frequency */
export async function computeContentAccessScore(userId: string, courseId: string): Promise<{
  score: number
  detail: string
  rawMetrics: Record<string, number>
}> {
  // Use MetricEvent to track material views if available
  const now = new Date()
  const d7 = new Date(now.getTime() - 7 * 86400000)

  const views = await prisma.metricEvent.count({
    where: {
      userId,
      eventName: 'course_material_view',
      metadata: { path: ['courseId'], equals: courseId },
      createdAt: { gte: d7 },
    },
  })

  const score = views >= 10 ? 100 : views >= 5 ? 80 : views >= 2 ? 60 : views > 0 ? 40 : 20

  return {
    score,
    detail: `${views} material views in last 7 days`,
    rawMetrics: { views },
  }
}
```

### Service: `app/lib/success/score-engine.ts`

Orchestrator that combines all signals into a composite score.

```typescript
import type { SignalScore, SuccessScoreResult, Trajectory, InflectionResult, PatternClassification, PatternType } from './types'
import { DEFAULT_SIGNAL_WEIGHTS, TRAJECTORY_THRESHOLDS } from './types'
import * as collectors from './signal-collectors'
import { prisma } from '../prisma'

const SIGNAL_COLLECTORS: Record<string, (userId: string, courseId: string) => Promise<{ score: number; detail: string; rawMetrics: Record<string, number> }>> = {
  loginFrequency: collectors.computeLoginScore,
  assignmentSubmission: collectors.computeAssignmentScore,
  sandyUsageDecay: collectors.computeSandyUsageScore,
  studySessionCadence: collectors.computeStudySessionScore,
  conceptMasterySlope: collectors.computeConceptMasteryScore,
  commonsParticipation: collectors.computeCommonsScore,
  flashcardConsistency: collectors.computeFlashcardScore,
  gradeTrend: collectors.computeGradeTrendScore,
  toolEngagement: collectors.computeToolEngagementScore,
  contentAccess: collectors.computeContentAccessScore,
}

/** Compute full success score for a student in a course */
export async function computeSuccessScore(
  userId: string,
  courseId: string,
  personalizedWeights?: Record<string, number>
): Promise<SuccessScoreResult> {
  const weights = personalizedWeights ?? DEFAULT_SIGNAL_WEIGHTS

  // Compute all signals in parallel
  const signalEntries = Object.entries(SIGNAL_COLLECTORS)
  const results = await Promise.allSettled(
    signalEntries.map(([key, fn]) => fn(userId, courseId).then(r => ({ key, ...r })))
  )

  const signals: SignalScore[] = []
  let weightedSum = 0
  let totalWeight = 0

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { key, score, detail, rawMetrics } = result.value
      const weight = weights[key] ?? 0.05

      // Fetch 7d delta from history
      const history = await prisma.successScoreHistory.findFirst({
        where: { userId, courseId, computedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
        orderBy: { computedAt: 'asc' },
      })

      signals.push({
        signal: key,
        score,
        delta7d: 0, // Will be computed after composite
        detail,
        rawMetrics,
      })

      weightedSum += score * weight
      totalWeight += weight
    }
  }

  const composite = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50

  // Get previous score for trajectory
  const existing = await prisma.studentSuccessScore.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })

  const delta7d = existing?.scoreDelta7d ?? 0
  const actualDelta = existing ? composite - existing.score : 0
  const trajectory = classifyTrajectory(actualDelta, delta7d)

  // Detect inflection
  const inflection = await detectInflection(userId, courseId, composite, signals)

  // Classify pattern
  const pattern = classifyPattern(signals, composite, trajectory)

  return { composite, trajectory, signals, inflection, pattern }
}

function classifyTrajectory(currentDelta: number, rollingDelta7d: number): Trajectory {
  const delta = currentDelta || rollingDelta7d
  if (delta >= TRAJECTORY_THRESHOLDS.improving) return 'improving'
  if (delta <= TRAJECTORY_THRESHOLDS.critical_decline) return 'critical_decline'
  if (delta <= TRAJECTORY_THRESHOLDS.declining) return 'declining'
  return 'stable'
}

async function detectInflection(
  userId: string,
  courseId: string,
  currentScore: number,
  signals: SignalScore[]
): Promise<InflectionResult | null> {
  const history = await prisma.successScoreHistory.findMany({
    where: { userId, courseId },
    orderBy: { computedAt: 'desc' },
    take: 14, // Last 14 days
  })

  if (history.length < 3) return null

  const scores = history.map(h => h.score).reverse()
  const recent3 = scores.slice(-3)
  const prior3 = scores.slice(-6, -3)

  if (prior3.length < 3) return null

  const recentAvg = recent3.reduce((a, b) => a + b, 0) / 3
  const priorAvg = prior3.reduce((a, b) => a + b, 0) / 3
  const delta = recentAvg - priorAvg

  // Sudden drop: 20+ point decline in 3 days
  if (delta <= -20) {
    return {
      type: 'sudden_drop',
      magnitude: Math.min(1, Math.abs(delta) / 40),
      primaryDrivers: signals
        .filter(s => s.score < 40)
        .map(s => s.signal)
        .slice(0, 3),
      detectedAt: new Date(),
    }
  }

  // Gradual decline: 10+ point decline over 7+ days
  if (scores.length >= 7) {
    const weekAvg = scores.slice(-7).reduce((a, b) => a + b, 0) / 7
    const priorWeekAvg = scores.slice(-14, -7).reduce((a, b) => a + b, 0) / Math.min(7, scores.slice(-14, -7).length)
    if (priorWeekAvg - weekAvg >= 10) {
      return {
        type: 'gradual_decline',
        magnitude: Math.min(1, (priorWeekAvg - weekAvg) / 30),
        primaryDrivers: signals
          .sort((a, b) => a.score - b.score)
          .map(s => s.signal)
          .slice(0, 3),
        detectedAt: new Date(),
      }
    }
  }

  // Recovery: was declining, now improving
  if (delta >= 10 && prior3.some(s => s < 50)) {
    return {
      type: 'recovery',
      magnitude: Math.min(1, delta / 30),
      primaryDrivers: signals
        .filter(s => s.score > 70)
        .map(s => s.signal)
        .slice(0, 3),
      detectedAt: new Date(),
    }
  }

  return null
}

function classifyPattern(signals: SignalScore[], composite: number, trajectory: Trajectory): PatternClassification | null {
  if (composite >= 60 && trajectory !== 'declining' && trajectory !== 'critical_decline') return null

  const lowSignals = signals.filter(s => s.score < 40)
  const lowNames = new Set(lowSignals.map(s => s.signal))

  // Broad disengagement: 4+ low signals
  if (lowSignals.length >= 4) {
    return {
      type: 'broad_disengagement',
      confidence: Math.min(1, lowSignals.length / 6),
      evidence: lowSignals.map(s => `${s.signal}: ${s.score}/100 — ${s.detail}`),
      suggestedTarget: 'BOTH',
    }
  }

  // Academic decline: grades + assignments low, engagement ok
  if (lowNames.has('gradeTrend') && lowNames.has('assignmentSubmission') && !lowNames.has('loginFrequency')) {
    return {
      type: 'academic_decline',
      confidence: 0.8,
      evidence: lowSignals.map(s => `${s.signal}: ${s.score}/100 — ${s.detail}`),
      suggestedTarget: 'INSTRUCTOR',
    }
  }

  // Sudden absence: login score near zero
  const loginSignal = signals.find(s => s.signal === 'loginFrequency')
  if (loginSignal && loginSignal.score < 10) {
    return {
      type: 'sudden_absence',
      confidence: 0.9,
      evidence: [`Login score: ${loginSignal.score}/100 — ${loginSignal.detail}`],
      suggestedTarget: 'ADVISOR',
    }
  }

  // Social withdrawal: commons low, academics ok
  if (lowNames.has('commonsParticipation') && !lowNames.has('assignmentSubmission') && !lowNames.has('gradeTrend')) {
    return {
      type: 'social_withdrawal',
      confidence: 0.6,
      evidence: lowSignals.map(s => `${s.signal}: ${s.score}/100 — ${s.detail}`),
      suggestedTarget: 'SELF_SERVE',
    }
  }

  // Study abandonment: flashcards + study sessions stopped
  if (lowNames.has('flashcardConsistency') && lowNames.has('studySessionCadence')) {
    return {
      type: 'study_abandonment',
      confidence: 0.7,
      evidence: lowSignals.map(s => `${s.signal}: ${s.score}/100 — ${s.detail}`),
      suggestedTarget: 'SELF_SERVE',
    }
  }

  // Gradual fade: moderate decline across multiple signals
  if (lowSignals.length >= 2 && trajectory === 'declining') {
    return {
      type: 'gradual_fade',
      confidence: 0.6,
      evidence: lowSignals.map(s => `${s.signal}: ${s.score}/100 — ${s.detail}`),
      suggestedTarget: 'INSTRUCTOR',
    }
  }

  return null
}
```

### Service: `app/lib/success/alert-service.ts`

Generates, routes, and manages alerts.

```typescript
import { prisma } from '../prisma'
import type { SuccessScoreResult, InterventionSuggestion } from './types'
import { SEVERITY_THRESHOLDS } from './types'

/** Generate an alert if the score warrants one */
export async function evaluateAndAlert(
  userId: string,
  courseId: string,
  result: SuccessScoreResult
): Promise<string | null> {
  const { composite, signals, inflection, pattern } = result

  // Determine severity
  let severity: string
  if (composite < SEVERITY_THRESHOLDS.CRITICAL) severity = 'CRITICAL'
  else if (composite < SEVERITY_THRESHOLDS.URGENT) severity = 'URGENT'
  else if (composite < SEVERITY_THRESHOLDS.CONCERN) severity = 'CONCERN'
  else if (composite < SEVERITY_THRESHOLDS.WATCH) severity = 'WATCH'
  else return null // Score is healthy, no alert needed

  // Check if there's already an active alert for this student+course
  const existingAlert = await prisma.successAlert.findFirst({
    where: {
      userId,
      courseId,
      status: { in: ['active', 'acknowledged'] },
    },
  })

  // Only create a new alert if severity escalated or no existing alert
  if (existingAlert) {
    const severityOrder = ['WATCH', 'CONCERN', 'URGENT', 'CRITICAL']
    const existingIdx = severityOrder.indexOf(existingAlert.severity)
    const newIdx = severityOrder.indexOf(severity)
    if (newIdx <= existingIdx) return null // Same or lower severity, don't duplicate
  }

  // Build trigger reason
  const lowSignals = signals.filter(s => s.score < 50).sort((a, b) => a.score - b.score)
  const triggerReason = buildTriggerReason(composite, lowSignals, inflection)

  // Route to appropriate target
  const routeTarget = pattern?.suggestedTarget ?? (severity === 'CRITICAL' ? 'BOTH' : 'INSTRUCTOR')

  // Generate intervention suggestions
  const suggestedActions = generateSuggestions(signals, pattern, severity)

  const scoreRecord = await prisma.studentSuccessScore.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })

  const alert = await prisma.successAlert.create({
    data: {
      userId,
      courseId,
      scoreId: scoreRecord!.id,
      severity,
      routeTarget,
      triggerReason,
      signalBreakdown: lowSignals.map(s => ({
        signal: s.signal,
        score: s.score,
        delta: s.delta7d,
        detail: s.detail,
      })),
      suggestedActions,
      patternType: pattern?.type ?? null,
      confidenceScore: pattern?.confidence ?? null,
      expiresAt: new Date(Date.now() + 14 * 86400000), // 14 days
    },
  })

  return alert.id
}

function buildTriggerReason(
  score: number,
  lowSignals: { signal: string; score: number; detail: string }[],
  inflection: SuccessScoreResult['inflection']
): string {
  const parts: string[] = [`Success score: ${score}/100.`]

  if (inflection) {
    parts.push(`Inflection detected: ${inflection.type} (magnitude: ${(inflection.magnitude * 100).toFixed(0)}%).`)
  }

  if (lowSignals.length > 0) {
    parts.push(`Primary concerns: ${lowSignals.slice(0, 3).map(s => `${s.signal} (${s.score}/100)`).join(', ')}.`)
  }

  return parts.join(' ')
}

function generateSuggestions(
  signals: { signal: string; score: number }[],
  pattern: SuccessScoreResult['pattern'],
  severity: string
): InterventionSuggestion[] {
  const suggestions: InterventionSuggestion[] = []
  const lowSignals = new Set(signals.filter(s => s.score < 40).map(s => s.signal))

  if (lowSignals.has('assignmentSubmission')) {
    suggestions.push({
      action: 'Send personal check-in about missing assignments',
      reason: 'Multiple assignments missing — may need deadline extension or accommodation',
      urgency: severity === 'CRITICAL' ? 'immediate' : 'this_week',
      type: 'INSTRUCTOR_OUTREACH',
    })
  }

  if (lowSignals.has('flashcardConsistency') || lowSignals.has('studySessionCadence')) {
    suggestions.push({
      action: 'Sandy nudge to restart study sessions',
      reason: 'Study habits have dropped off — gentle re-engagement prompt',
      urgency: 'this_week',
      type: 'SANDY_NUDGE',
    })
  }

  if (pattern?.type === 'broad_disengagement' || pattern?.type === 'sudden_absence') {
    suggestions.push({
      action: 'Advisor check-in meeting',
      reason: 'Broad disengagement across multiple areas suggests non-academic barrier',
      urgency: 'immediate',
      type: 'ADVISOR_MEETING',
    })
  }

  if (lowSignals.has('commonsParticipation')) {
    suggestions.push({
      action: 'Connect with study group or peer mentor',
      reason: 'Social engagement has declined — peer connection may help',
      urgency: 'when_convenient',
      type: 'PEER_CONNECTION',
    })
  }

  if (lowSignals.has('conceptMasterySlope')) {
    suggestions.push({
      action: 'Recommend Study Buddy session on struggling concepts',
      reason: 'Concept mastery is declining — targeted tutoring may help',
      urgency: 'this_week',
      type: 'SANDY_NUDGE',
    })
  }

  if (suggestions.length === 0) {
    suggestions.push({
      action: 'Monitor for another 7 days',
      reason: 'Signals are mixed — continue tracking before intervention',
      urgency: 'when_convenient',
      type: 'CUSTOM',
    })
  }

  return suggestions
}

/** Acknowledge an alert */
export async function acknowledgeAlert(alertId: string, userId: string) {
  return prisma.successAlert.update({
    where: { id: alertId },
    data: { status: 'acknowledged', acknowledgedBy: userId, acknowledgedAt: new Date() },
  })
}

/** Record an intervention action */
export async function recordIntervention(input: {
  alertId: string
  userId: string
  initiatorId: string
  type: string
  notes: string
}) {
  const alert = await prisma.successAlert.update({
    where: { id: input.alertId },
    data: { status: 'acted_on', actedOnAt: new Date() },
  })

  const scoreAtIntervention = await prisma.studentSuccessScore.findUnique({
    where: { userId_courseId: { userId: input.userId, courseId: alert.courseId } },
  })

  return prisma.successIntervention.create({
    data: {
      alertId: input.alertId,
      userId: input.userId,
      initiatorId: input.initiatorId,
      type: input.type,
      notes: input.notes,
      scoreAtIntervention: scoreAtIntervention?.score ?? null,
    },
  })
}

/** Check intervention outcomes (run daily by cron) */
export async function evaluateInterventionOutcomes() {
  const pending = await prisma.successIntervention.findMany({
    where: {
      outcome: 'PENDING',
      createdAt: { lte: new Date(Date.now() - 7 * 86400000) }, // At least 7 days old
    },
    include: { alert: true },
  })

  for (const intervention of pending) {
    const currentScore = await prisma.studentSuccessScore.findUnique({
      where: { userId_courseId: { userId: intervention.userId, courseId: intervention.alert.courseId } },
    })

    if (!currentScore) continue

    const scoreDelta = currentScore.score - (intervention.scoreAtIntervention ?? 0)
    let outcome: string

    if (scoreDelta >= 15) outcome = 'RE_ENGAGED'
    else if (scoreDelta >= 5) outcome = 'PARTIAL'
    else if (scoreDelta <= -10) outcome = 'ESCALATED'
    else outcome = 'NO_CHANGE'

    // If it's been 14+ days and still no change, mark as UNKNOWN
    const daysSince = (Date.now() - intervention.createdAt.getTime()) / 86400000
    if (daysSince >= 14 && outcome === 'NO_CHANGE') outcome = 'UNKNOWN'

    await prisma.successIntervention.update({
      where: { id: intervention.id },
      data: {
        outcome,
        scoreAtOutcome: currentScore.score,
        outcomeDetectedAt: new Date(),
        reEngagementSignals: {
          scoreBefore: intervention.scoreAtIntervention,
          scoreAfter: currentScore.score,
          delta: scoreDelta,
          trajectory: currentScore.trajectory,
        },
      },
    })

    // If re-engaged, resolve the alert
    if (outcome === 'RE_ENGAGED') {
      await prisma.successAlert.update({
        where: { id: intervention.alertId },
        data: { status: 'resolved', resolvedAt: new Date() },
      })
    }
  }
}

/** Get alerts for a course, filtered by role-appropriate visibility */
export async function getCourseAlerts(courseId: string, requesterId: string, role: string) {
  // FERPA: Only course instructor or assigned advisor can see individual alerts
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { creatorId: true },
  })

  if (!course) throw new Error('Course not found')
  if (role !== 'ADMIN' && course.creatorId !== requesterId) {
    throw new Error('Access denied: not the course instructor')
  }

  return prisma.successAlert.findMany({
    where: {
      courseId,
      status: { in: ['active', 'acknowledged', 'acted_on'] },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      interventions: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: [
      { severity: 'desc' },
      { createdAt: 'desc' },
    ],
  })
}
```

### Service: `app/lib/success/nudge-service.ts`

Sandy-facing gentle nudge generation. Never shame-based.

```typescript
import type { SuccessScoreResult } from './types'

export interface GentleNudge {
  message: string
  action: string       // What Sandy should suggest
  priority: number     // 1-10, higher = more important
  category: string     // For grouping in proactive suggestions
}

const NUDGE_TEMPLATES = {
  study_restart: [
    "Hey! I noticed it's been a bit since we studied together. Want to pick up where we left off?",
    "It's been a few days — ready to jump back into your flashcards? I'll make it quick.",
    "I've been keeping your study materials warm. Want to do a quick 10-minute review?",
  ],
  assignment_reminder: [
    "I see you have some assignments coming up. Want me to help you plan your approach?",
    "There's an assignment I can help you with. Want to work through it together?",
    "I noticed you haven't started on a few things yet — no pressure, but I'm here if you want to talk through them.",
  ],
  general_checkin: [
    "Hey, I haven't seen you around much lately. Everything okay? I'm here if you need anything.",
    "It's been a while! Whenever you're ready, I've got some things saved up for you.",
    "Welcome back! Want me to catch you up on what you've missed?",
  ],
  concept_help: [
    "I noticed a couple of concepts that might benefit from a quick review. Want me to explain them differently?",
    "Some of the recent material has been tricky — want to try a different approach with Study Buddy?",
    "I have some ideas for making the tough stuff click. Want to give it a try?",
  ],
  social_reconnect: [
    "There are some study groups meeting soon — want me to find one that fits your schedule?",
    "A few of your classmates are in The Commons right now. Want to join?",
    "Sometimes studying with others makes things click. Want me to set up a study session?",
  ],
}

/** Generate a gentle nudge for a student based on their success profile */
export function generateNudge(result: SuccessScoreResult): GentleNudge | null {
  if (result.composite >= 70) return null // Healthy student, no nudge needed

  const lowSignals = new Set(result.signals.filter(s => s.score < 40).map(s => s.signal))

  // Pick the most appropriate nudge category
  if (lowSignals.has('flashcardConsistency') || lowSignals.has('studySessionCadence')) {
    const templates = NUDGE_TEMPLATES.study_restart
    return {
      message: templates[Math.floor(Math.random() * templates.length)],
      action: 'Open Study Buddy with their last topic',
      priority: 7,
      category: 'study-action',
    }
  }

  if (lowSignals.has('assignmentSubmission')) {
    const templates = NUDGE_TEMPLATES.assignment_reminder
    return {
      message: templates[Math.floor(Math.random() * templates.length)],
      action: 'Show upcoming assignments with Sandy help offer',
      priority: 8,
      category: 'study-action',
    }
  }

  if (lowSignals.has('conceptMasterySlope')) {
    const templates = NUDGE_TEMPLATES.concept_help
    return {
      message: templates[Math.floor(Math.random() * templates.length)],
      action: 'Launch Study Buddy in Tutor mode on struggling concepts',
      priority: 6,
      category: 'study-action',
    }
  }

  if (lowSignals.has('commonsParticipation')) {
    const templates = NUDGE_TEMPLATES.social_reconnect
    return {
      message: templates[Math.floor(Math.random() * templates.length)],
      action: 'Show active Commons sessions',
      priority: 4,
      category: 'social',
    }
  }

  // Generic check-in for broad disengagement
  if (result.pattern?.type === 'broad_disengagement' || result.pattern?.type === 'sudden_absence') {
    const templates = NUDGE_TEMPLATES.general_checkin
    return {
      message: templates[Math.floor(Math.random() * templates.length)],
      action: 'Show personalized dashboard with easy re-entry points',
      priority: 9,
      category: 'wellbeing',
    }
  }

  return null
}
```

### Service: `app/lib/success/success-service.ts`

Main orchestration service: batch scoring, dashboard queries, briefing integration.

```typescript
import { prisma } from '../prisma'
import { computeSuccessScore } from './score-engine'
import { evaluateAndAlert } from './alert-service'
import { generateNudge } from './nudge-service'
import type { CourseRiskHeatmap, StudentRiskSummary } from './types'

/** Batch compute success scores for all enrolled students (cron entry point) */
export async function batchComputeScores() {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { status: 'ACTIVE' },
    select: { userId: true, courseId: true },
  })

  let computed = 0
  let alerts = 0
  const batchSize = 10

  for (let i = 0; i < enrollments.length; i += batchSize) {
    const batch = enrollments.slice(i, i + batchSize)

    await Promise.allSettled(
      batch.map(async ({ userId, courseId }) => {
        try {
          const result = await computeSuccessScore(userId, courseId)

          // Upsert score
          await prisma.studentSuccessScore.upsert({
            where: { userId_courseId: { userId, courseId } },
            create: {
              userId,
              courseId,
              score: result.composite,
              trajectory: result.trajectory,
              loginScore: result.signals.find(s => s.signal === 'loginFrequency')?.score,
              assignmentScore: result.signals.find(s => s.signal === 'assignmentSubmission')?.score,
              sandyUsageScore: result.signals.find(s => s.signal === 'sandyUsageDecay')?.score,
              studySessionScore: result.signals.find(s => s.signal === 'studySessionCadence')?.score,
              conceptMasteryScore: result.signals.find(s => s.signal === 'conceptMasterySlope')?.score,
              commonsScore: result.signals.find(s => s.signal === 'commonsParticipation')?.score,
              flashcardScore: result.signals.find(s => s.signal === 'flashcardConsistency')?.score,
              gradeTrendScore: result.signals.find(s => s.signal === 'gradeTrend')?.score,
              toolEngagementScore: result.signals.find(s => s.signal === 'toolEngagement')?.score,
              contentAccessScore: result.signals.find(s => s.signal === 'contentAccess')?.score,
              inflectionDetected: !!result.inflection,
              inflectionType: result.inflection?.type,
              inflectionDetectedAt: result.inflection?.detectedAt,
              baselineScore: result.composite,
              peakScore: result.composite,
            },
            update: {
              previousScore: undefined, // Will be set by raw update
              score: result.composite,
              trajectory: result.trajectory,
              loginScore: result.signals.find(s => s.signal === 'loginFrequency')?.score,
              assignmentScore: result.signals.find(s => s.signal === 'assignmentSubmission')?.score,
              sandyUsageScore: result.signals.find(s => s.signal === 'sandyUsageDecay')?.score,
              studySessionScore: result.signals.find(s => s.signal === 'studySessionCadence')?.score,
              conceptMasteryScore: result.signals.find(s => s.signal === 'conceptMasterySlope')?.score,
              commonsScore: result.signals.find(s => s.signal === 'commonsParticipation')?.score,
              flashcardScore: result.signals.find(s => s.signal === 'flashcardConsistency')?.score,
              gradeTrendScore: result.signals.find(s => s.signal === 'gradeTrend')?.score,
              toolEngagementScore: result.signals.find(s => s.signal === 'toolEngagement')?.score,
              contentAccessScore: result.signals.find(s => s.signal === 'contentAccess')?.score,
              inflectionDetected: !!result.inflection,
              inflectionType: result.inflection?.type,
              inflectionDetectedAt: result.inflection?.detectedAt,
              peakScore: { set: undefined }, // handled below
            },
          })

          // Record history snapshot
          await prisma.successScoreHistory.create({
            data: {
              userId,
              courseId,
              score: result.composite,
              trajectory: result.trajectory,
              topSignal: result.signals.sort((a, b) => a.score - b.score)[0]?.signal,
              topSignalDelta: result.signals.sort((a, b) => a.score - b.score)[0]?.delta7d,
              computedAt: new Date(),
            },
          })

          // Evaluate for alerts
          const alertId = await evaluateAndAlert(userId, courseId, result)
          if (alertId) alerts++

          computed++
        } catch (err) {
          // Log but don't fail the batch
          console.error(`Failed to compute score for ${userId}/${courseId}:`, err)
        }
      })
    )
  }

  return { computed, alerts, total: enrollments.length }
}

/** Get course-level risk heatmap for faculty dashboard */
export async function getCourseRiskHeatmap(courseId: string): Promise<CourseRiskHeatmap> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true },
  })

  const scores = await prisma.studentSuccessScore.findMany({
    where: { courseId },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { score: 'asc' },
  })

  const distribution = {
    healthy: scores.filter(s => s.score >= 70).length,
    watch: scores.filter(s => s.score >= 50 && s.score < 70).length,
    concern: scores.filter(s => s.score >= 30 && s.score < 50).length,
    urgent: scores.filter(s => s.score >= 10 && s.score < 30).length,
    critical: scores.filter(s => s.score < 10).length,
  }

  const topRiskStudents: StudentRiskSummary[] = scores
    .filter(s => s.score < 50)
    .slice(0, 10)
    .map(s => ({
      userId: s.userId,
      userName: s.user.name ?? 'Unknown',
      score: s.score,
      trajectory: s.trajectory as any,
      severity: s.score < 15 ? 'CRITICAL' : s.score < 30 ? 'URGENT' : 'CONCERN',
      topSignals: [
        s.loginScore != null ? { signal: 'login', score: s.loginScore, delta: 0 } : null,
        s.assignmentScore != null ? { signal: 'assignments', score: s.assignmentScore, delta: 0 } : null,
        s.gradeTrendScore != null ? { signal: 'grades', score: s.gradeTrendScore, delta: 0 } : null,
      ].filter(Boolean).sort((a, b) => a!.score - b!.score).slice(0, 3) as any,
      daysSinceActive: s.daysSinceActive,
      openAlerts: 0, // Will be enriched by caller
      lastIntervention: null,
    }))

  return {
    courseId,
    courseName: course?.title ?? 'Unknown',
    totalStudents: scores.length,
    distribution,
    avgScore: scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length) : 0,
    avgDelta7d: scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + (s.scoreDelta7d ?? 0), 0) / scores.length) : 0,
    topRiskStudents,
  }
}

/** Build Sandy context block for a student's success profile */
export function buildSandySuccessContext(score: {
  score: number
  trajectory: string
  inflectionDetected: boolean
  daysSinceActive: number
}): string {
  if (!score) return ''

  const lines: string[] = ['<student-success-profile>']
  lines.push(`  <score>${score.score}/100</score>`)
  lines.push(`  <trajectory>${score.trajectory}</trajectory>`)
  if (score.inflectionDetected) {
    lines.push(`  <inflection-alert>true</inflection-alert>`)
  }
  if (score.daysSinceActive > 3) {
    lines.push(`  <days-since-active>${score.daysSinceActive}</days-since-active>`)
  }
  lines.push(`  <instruction>If the student seems disengaged, use a warm, inviting tone. Never say "you're falling behind" or shame them. Instead, offer to help with specific tasks or remind them of what they were working on.</instruction>`)
  lines.push('</student-success-profile>')

  return lines.join('\n')
}

/** Build briefing injection for faculty morning briefing */
export async function buildBriefingRiskSummary(courseId: string): Promise<string | null> {
  const alerts = await prisma.successAlert.findMany({
    where: {
      courseId,
      status: 'active',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    include: {
      user: { select: { name: true } },
    },
    orderBy: { severity: 'desc' },
    take: 5,
  })

  if (alerts.length === 0) return null

  const critical = alerts.filter(a => a.severity === 'CRITICAL').length
  const urgent = alerts.filter(a => a.severity === 'URGENT').length
  const concern = alerts.filter(a => a.severity === 'CONCERN').length

  let summary = `Student Success Alerts: `
  const parts: string[] = []
  if (critical > 0) parts.push(`${critical} critical`)
  if (urgent > 0) parts.push(`${urgent} urgent`)
  if (concern > 0) parts.push(`${concern} concern`)
  summary += parts.join(', ') + '. '

  // Top 3 students with names
  const top3 = alerts.slice(0, 3)
  for (const alert of top3) {
    summary += `${alert.user.name}: ${alert.triggerReason.slice(0, 100)}. `
  }

  return summary
}
```

### Service: `app/lib/success/weight-personalizer.ts`

Reads Engagement Fingerprint to personalize signal weights per student.

```typescript
import { prisma } from '../prisma'
import { DEFAULT_SIGNAL_WEIGHTS } from './types'

/**
 * Personalize signal weights based on a student's engagement fingerprint.
 * Students who are naturally social get lower weight on commons (less deviation needed).
 * Students who rely heavily on flashcards get higher weight on flashcard consistency.
 */
export async function getPersonalizedWeights(userId: string): Promise<Record<string, number>> {
  const fingerprint = await prisma.engagementFingerprint.findUnique({
    where: { userId },
  })

  if (!fingerprint || fingerprint.confidence < 0.3) return DEFAULT_SIGNAL_WEIGHTS

  const weights = { ...DEFAULT_SIGNAL_WEIGHTS }

  // Socially active students: increase social signal weight
  if (fingerprint.socialOrientation === 'collaborative') {
    weights.commonsParticipation = 0.10
    weights.toolEngagement = 0.02
  }

  // Heavy flashcard users: increase flashcard weight
  if (fingerprint.studyModes && (fingerprint.studyModes as string[]).includes('flashcards')) {
    weights.flashcardConsistency = 0.15
    weights.contentAccess = 0.01
  }

  // Night owls: reduce login frequency weight (they login at unusual times)
  if (fingerprint.chronotype === 'night-owl') {
    weights.loginFrequency = 0.05
    weights.gradeTrend = 0.18
  }

  // High deadline sensitivity: increase assignment weight
  if (fingerprint.deadlineStyle === 'early-bird') {
    weights.assignmentSubmission = 0.25
  }

  // Normalize to sum to 1.0
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  for (const key of Object.keys(weights)) {
    weights[key] = weights[key] / total
  }

  return weights
}
```

---

## Data Fetch Layer

### Query Patterns

| Query | Frequency | Optimization |
|-------|-----------|-------------|
| Compute all student scores for a course | Daily cron | Batch with `Promise.allSettled`, 10 concurrent |
| Get course risk heatmap | On faculty dashboard load | Single query with `findMany` + `include` |
| Get student's score + history | On student homepage / Sandy context | `findUnique` by compound key + history last 30 |
| Get active alerts for a course | On faculty alert dashboard | `findMany` filtered by status, sorted by severity |
| Get intervention outcomes | Weekly cron | `findMany` where outcome = PENDING, 7+ days old |
| Build briefing injection | Daily briefing cron | Aggregated count + top 3 alerts |
| History for trend chart | On student/faculty analytics | `findMany` by userId+courseId, last 120 days |

---

## API Routes

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/success/score` | GET | `requireRequestUser` | Get current student's score for a course (`?courseId=`) |
| `/api/success/course/[courseId]/heatmap` | GET | `requireEducatorUser` | Course risk heatmap with distribution + top risk students |
| `/api/success/course/[courseId]/alerts` | GET | `requireEducatorUser` | Active alerts for a course, sorted by severity |
| `/api/success/course/[courseId]/students` | GET | `requireEducatorUser` | Full student list with scores, sortable |
| `/api/success/alert/[alertId]/acknowledge` | POST | `requireEducatorUser` | Acknowledge an alert |
| `/api/success/alert/[alertId]/intervene` | POST | `requireEducatorUser` | Record an intervention with type and notes |
| `/api/success/alert/[alertId]/dismiss` | POST | `requireEducatorUser` | Dismiss alert with reason |
| `/api/success/history` | GET | `requireRequestUser` | Score history for trend chart (`?courseId=&days=30`) |
| `/api/success/preferences` | GET/PUT | `requireEducatorUser` | Alert notification preferences |
| `/api/success/interventions` | GET | `requireEducatorUser` | All interventions for a course with outcomes |
| `/api/success/nudge` | GET | `requireRequestUser` | Get current nudge for student (Sandy calls this) |
| `/api/cron/success-scores` | POST | `verifyCronSecret` | Nightly batch score computation |
| `/api/cron/intervention-outcomes` | POST | `verifyCronSecret` | Weekly outcome evaluation |

---

## UI Components

| Component | File | Purpose | Dependencies |
|-----------|------|---------|-------------|
| `CourseRiskHeatmap` | `app/components/success/CourseRiskHeatmap.tsx` | Color-coded distribution bar + donut chart showing healthy/watch/concern/urgent/critical breakdown | recharts |
| `StudentRiskTable` | `app/components/success/StudentRiskTable.tsx` | Sortable table of students with score, trajectory arrow, top signals, days since active, action buttons | — |
| `StudentRiskRow` | `app/components/success/StudentRiskRow.tsx` | Single row: avatar, name, score badge (color-coded), trajectory icon, signal pills, "View" button | — |
| `AlertPanel` | `app/components/success/AlertPanel.tsx` | Slide-out panel showing alert details, signal breakdown, suggested actions, intervention form | — |
| `AlertCard` | `app/components/success/AlertCard.tsx` | Compact card for alert: severity badge, student name, trigger summary, action buttons (Acknowledge, Act, Dismiss) | — |
| `InterventionForm` | `app/components/success/InterventionForm.tsx` | Form to record an intervention: type dropdown, notes textarea, submit | — |
| `InterventionTimeline` | `app/components/success/InterventionTimeline.tsx` | Vertical timeline of interventions for a student with outcome badges | — |
| `SuccessScoreChart` | `app/components/success/SuccessScoreChart.tsx` | Line chart of score history over time with inflection markers and intervention points | recharts |
| `SignalBreakdown` | `app/components/success/SignalBreakdown.tsx` | Horizontal bar chart of 10 signal scores with color-coded thresholds | recharts |
| `TrajectoryBadge` | `app/components/success/TrajectoryBadge.tsx` | Small badge: arrow icon + label ("Improving", "Declining", etc.) with color | lucide-react |
| `SeverityBadge` | `app/components/success/SeverityBadge.tsx` | Color-coded pill (green/amber/orange/red) with severity label | — |
| `BulkOutreachModal` | `app/components/success/BulkOutreachModal.tsx` | Select multiple at-risk students, compose message, send via Sandy | ModalShell |
| `AlertPreferences` | `app/components/success/AlertPreferences.tsx` | Settings panel for notification preferences: severity filter, digest toggle, batch window | — |
| `FacultyRiskDashboard` | `app/components/success/FacultyRiskDashboard.tsx` | Full dashboard assembly: heatmap + alert cards + student table + action panel | All above |
| `StudentSuccessWidget` | `app/components/success/StudentSuccessWidget.tsx` | Compact widget for student homepage: score ring, trajectory, "Sandy thinks..." gentle message | — |

---

## Pages

| Page | Route | Role | Description |
|------|-------|------|-------------|
| Faculty Risk Dashboard | `/analytics/success` | EDUCATOR, ADMIN | Course selector + risk heatmap + alert queue + student table. New tab in analytics sub-nav. |
| Student Success Detail | `/analytics/success/[courseId]/[userId]` | EDUCATOR, ADMIN | Individual student deep-dive: score history chart, signal breakdown, intervention timeline |
| Alert Management | `/analytics/success/alerts` | EDUCATOR, ADMIN | Cross-course alert inbox with filtering by severity, status, pattern type |

---

## Sandy Integration

### Agent Tools (4 tools in `app/lib/agent/tools/success-tools.ts`)

```typescript
export const SUCCESS_TOOLS = [
  {
    name: 'get_student_success_score',
    description: 'Get a student\'s current success score and trajectory for a course. For faculty/advisor use.',
    parameters: {
      type: 'object',
      properties: {
        studentEmail: { type: 'string', description: 'Student email' },
        courseId: { type: 'string', description: 'Course ID' },
      },
      required: ['studentEmail', 'courseId'],
    },
    handler: async (params: { studentEmail: string; courseId: string }) => {
      // Returns score, trajectory, top 3 signals, active alerts, last intervention
    },
  },
  {
    name: 'get_course_risk_summary',
    description: 'Get risk distribution and top at-risk students for a course. Faculty only.',
    parameters: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'Course ID' },
      },
      required: ['courseId'],
    },
    handler: async (params: { courseId: string }) => {
      // Returns heatmap distribution, avg score, top 5 at-risk students
    },
  },
  {
    name: 'get_intervention_effectiveness',
    description: 'Get intervention outcome statistics for a course. Shows what types of outreach are working.',
    parameters: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'Course ID' },
      },
      required: ['courseId'],
    },
    handler: async (params: { courseId: string }) => {
      // Returns outcome distribution by intervention type
    },
  },
  {
    name: 'suggest_intervention',
    description: 'Get AI-generated intervention suggestions for a specific at-risk student.',
    parameters: {
      type: 'object',
      properties: {
        alertId: { type: 'string', description: 'Alert ID' },
      },
      required: ['alertId'],
    },
    handler: async (params: { alertId: string }) => {
      // Returns suggested actions with reasoning
    },
  },
]
```

### Proactive Nudges (in `proactive-suggestions.ts`)

```typescript
// Student-facing nudges (gentle, never shame-based)
{
  id: 'success-study-restart',
  type: 'study-action',
  priority: 7,
  condition: (data) => data.successScore?.score < 60 && data.successScore?.flashcardScore < 40,
  message: "It's been a bit since we studied together — want to do a quick review?",
  action: { type: 'sandy-message', message: 'Help me review my flashcards' },
}

{
  id: 'success-gentle-checkin',
  type: 'wellbeing',
  priority: 8,
  condition: (data) => data.successScore?.trajectory === 'critical_decline',
  message: "Hey, I'm here whenever you need me. Want to catch up on what you've missed?",
  action: { type: 'link', href: '/study' },
}

// Faculty-facing nudges
{
  id: 'success-new-alerts',
  type: 'faculty-alert',
  priority: 9,
  condition: (data) => data.activeAlertCount > 0,
  message: `${data.activeAlertCount} students need attention in your courses`,
  action: { type: 'link', href: '/analytics/success' },
}
```

### Sandy Context Injection

```typescript
// In concierge-service.ts, for STUDENT role:
const successScore = await prisma.studentSuccessScore.findFirst({
  where: { userId },
  orderBy: { score: 'asc' }, // Show worst course score
})
if (successScore && successScore.score < 70) {
  contextBlocks.push(buildSandySuccessContext(successScore))
}

// In briefing.ts, for EDUCATOR role:
const riskSummary = await buildBriefingRiskSummary(courseId)
if (riskSummary) {
  briefingSections.push(riskSummary)
}
```

---

## Implementation Phases

### Phase 1: Score Engine + Schema

> **Size:** Medium (~600 lines)
> **Delivers:** Schema models, signal collectors, score engine, daily cron, `StudentSuccessScore` populated

1. Add all schema models and enums to `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name add-student-success-early-warning`
3. Implement `app/lib/success/types.ts`
4. Implement `app/lib/success/signal-collectors.ts` (10 collectors)
5. Implement `app/lib/success/score-engine.ts` (composite + trajectory + inflection + pattern)
6. Implement `app/lib/success/success-service.ts` (batch compute)
7. Add cron route: `POST /api/cron/success-scores`
8. Add student API: `GET /api/success/score`

**Success Metric:** Scores populated for all enrolled students. Score distribution looks reasonable (not all 50s or all 100s).

### Phase 2: Alert System + Routing

> **Size:** Medium (~500 lines)
> **Delivers:** Alerts generated, routed, acknowledgeable. Intervention recording.

1. Implement `app/lib/success/alert-service.ts`
2. Add alert API routes: acknowledge, intervene, dismiss
3. Add `GET /api/success/course/[courseId]/alerts`
4. Implement `app/lib/success/nudge-service.ts`
5. Wire alert evaluation into cron batch job
6. Add intervention outcome cron: `POST /api/cron/intervention-outcomes`

**Success Metric:** Alerts generated for students with scores below thresholds. Pattern classification correctly distinguishes academic decline from broad disengagement.

### Phase 3: Faculty Dashboard

> **Size:** Large (~800 lines, 10 components)
> **Delivers:** `/analytics/success` page with heatmap, student table, alert panel.

1. Create all 15 UI components
2. Create faculty dashboard page at `/analytics/success`
3. Add to analytics sub-nav
4. Implement student detail page at `/analytics/success/[courseId]/[userId]`
5. Implement bulk outreach modal
6. Add alert preferences API + UI

**Success Metric:** Faculty can view risk distribution, drill into individual students, acknowledge alerts, and record interventions from a single page.

### Phase 4: Sandy Integration + Student Nudges

> **Size:** Small (~300 lines)
> **Delivers:** Sandy knows about student risk, provides gentle nudges, faculty can ask Sandy about risk.

1. Add 4 agent tools to `success-tools.ts`
2. Register in `tool-registry.ts`
3. Add proactive nudge conditions to `proactive-suggestions.ts`
4. Wire success context into `concierge-service.ts` (student + faculty)
5. Wire risk summary into `briefing.ts`
6. Add `StudentSuccessWidget` to student homepage

**Success Metric:** Sandy proactively offers help to declining students without being pushy. Faculty morning briefing includes risk alerts.

### Phase 5: Weight Personalization + Fingerprint Integration

> **Size:** Small (~200 lines)
> **Delivers:** Signal weights personalized per student based on their engagement fingerprint.

1. Implement `app/lib/success/weight-personalizer.ts`
2. Wire personalized weights into score engine
3. Add fingerprint-based threshold adjustments
4. Test that night-owl students aren't penalized for login timing

**Success Metric:** Students with different engagement patterns get appropriately weighted scores. A student who never uses flashcards doesn't get penalized for flashcard consistency.

### Phase 6: Cross-System Feeds + Analytics

> **Size:** Small (~200 lines)
> **Delivers:** Intervention effectiveness analytics, Campus Pulse feed, Accreditation Autopilot evidence.

1. Build intervention effectiveness dashboard (outcome distribution by type, time-to-outcome)
2. Add individual signal feed to Campus Pulse (aggregated: "12% of CS 201 students are in critical decline")
3. Add intervention data export for Accreditation Autopilot (evidence for SACSCOC 12.1)
4. Wire into Classroom Intelligence Loop (at-risk clusters inform teaching adjustments)
5. Prune history older than 120 days via cron

**Success Metric:** Faculty can see which intervention types work best. Campus Pulse detects when individual struggles converge into institutional patterns. Accreditation has automatic evidence of student support services.

---

## Privacy & FERPA Considerations

| Data Point | Who Can See It | Justification |
|-----------|---------------|---------------|
| Individual student score + signals | Course instructor, assigned advisor, ADMIN | Educational records within "legitimate educational interest" |
| Course-level distribution (no names) | Course instructor, department chair, ADMIN | Aggregate statistics, no individual identification |
| Intervention records | Initiator + ADMIN | Intervention documentation for student support |
| Sandy nudge content | The student only | Personal guidance, not shared with faculty |
| Cross-course aggregates | ADMIN only | Institutional research, fully anonymized |
| Signal raw metrics | System only (not exposed in UI) | Internal computation, never displayed |

**Key rules:**
- Faculty ONLY see students in their own courses
- Advisors ONLY see assigned advisees
- No student-to-student comparison is ever exposed
- Sandy never tells a student their "score" — only provides gentle, actionable support
- Alert acknowledgment/intervention is logged for accountability
- History auto-prunes after 120 days

---

## Patent Claims

**Primary Claim:** A computer-implemented method for predicting individual student success trajectories in a digital educational platform, comprising:
1. Aggregating multi-signal behavioral data from at least five distinct engagement channels (login patterns, assignment submissions, AI tutor conversations, spaced repetition adherence, collaborative session participation, concept mastery assessments, grade trajectories, and content access patterns)
2. Computing a composite success score normalized against each student's personalized behavioral baseline derived from a machine-learned engagement fingerprint
3. Detecting trajectory inflection points by comparing rolling score windows against historical patterns
4. Classifying risk patterns into at least four categories (academic decline, broad disengagement, sudden absence, social withdrawal) using signal constellation analysis
5. Routing alerts to role-appropriate responders based on pattern classification (academic patterns to instructors, life-crisis patterns to advisors, compound patterns to both)
6. Generating contextual, non-punitive intervention suggestions based on the specific signal breakdown and historical intervention effectiveness data
7. Tracking intervention outcomes through automated re-engagement detection within a defined observation window
8. Feeding anonymized individual trajectory data into institutional-level pattern detection (Campus Pulse integration)

**Dependent Claims:**
- Claim 2: The method of claim 1, wherein the behavioral baseline is personalized using an engagement fingerprint that adjusts signal weights based on the student's chronotype, social orientation, study mode preferences, and deadline behavior patterns
- Claim 3: The method of claim 1, wherein the AI-mediated intervention suggestions are delivered through a conversational agent persona that uses warm, non-shame-based language templates selected based on the student's communication preferences
- Claim 4: The method of claim 1, further comprising a closed-loop outcome tracking system that measures re-engagement within 7-14 days of intervention and uses outcome data to improve future intervention recommendations
- Claim 5: The method of claim 1, wherein individual student trajectories are anonymized and aggregated to feed a campus-level early warning system that detects institutional patterns when multiple students exhibit correlated risk signals
