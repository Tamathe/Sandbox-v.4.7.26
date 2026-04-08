# Blueprint: Campus Pulse — Multi-Signal Early Warning System

> **Sprint Scope:** Cross-reference UKNow articles, email urgency spikes, student at-risk signals, Reputation Pulse sentiment, policy changes, and Office Hours question clusters to detect emerging campus concerns before they escalate. Surface these as proactive intelligence in Sandy, the admin dashboard, and faculty briefings.
> **Depends On:** Engagement Fingerprint (Blueprint 9) for nudge-response calibration. Can launch independently — fingerprint integration is additive.
> **Estimated Size:** Large (3 sprints)
> **Deploy Order:** 2 of 10 (Cross-Data Series)
> **Patent Relevance:** HIGH — "Multi-signal campus intelligence fusion for proactive institutional awareness" (Proactive Agency pillar)

---

## Context

the platform already monitors multiple independent signal streams — campus news (14K+ UKNow articles), email urgency scoring, student at-risk detection, social media sentiment (Reputation Pulse), 94 UK policies, and Office Hours question clustering. But each stream is siloed. Nobody is watching for **convergence** — when multiple unrelated signals align around the same topic simultaneously.

Campus Pulse is a **correlation engine**. It watches all signal streams, detects when 2+ streams spike around the same theme within a time window, and escalates the convergence as a "Pulse Event" — a named, scored, actionable alert.

### Why This Matters

1. **Early warning.** A UKNow article about a grading policy change + spike in student questions about grading + faculty email urgency about the same topic = emerging concern *before* anyone files a formal complaint.
2. **Proactive Sandy.** Instead of waiting for users to ask, Sandy says: "I'm noticing a lot of questions about the new attendance policy. Here's what changed and how it affects your courses."
3. **Admin situational awareness.** A Pulse dashboard shows the admin real-time convergence events — think "institutional radar."
4. **Faculty briefing enrichment.** Morning briefings include: "Campus Pulse: 3 of your students asked about exam accommodations in the last 24 hours, and UKNow just published new disability services guidelines."
5. **Crisis anticipation.** Reputation Pulse detects negative social media sentiment + UKNow publishes about the same topic + email urgency spikes = crisis comms team gets a heads-up.

---

## Signal Streams

Each stream already exists. Campus Pulse reads them — never writes to them.

| Stream | Source Model(s) | Signal Extracted | Refresh Rate |
|---|---|---|---|
| **Campus News** | `UKNowArticle`, `UKNowChunk` | New articles, topic tags, entity mentions, section | On ingest (admin-triggered) |
| **Email Urgency** | `AssistantEmail` | Urgency bucket distribution shift, topic clustering from subjects | Continuous (on email read) |
| **Student At-Risk** | `StudentProfile`, `InterventionLog` | Risk score spikes, intervention volume, course-level clusters | Hourly (from analytics) |
| **Social Sentiment** | Reputation Pulse synthetic data (future: Sprout Social API) | Sentiment shift, negative theme clusters, AI-flagged posts | On analysis run |
| **Policy Changes** | `PolicyDocument`, `PolicyChunk` | New/updated policies, affected domains | On policy ingest |
| **Office Hours Clusters** | `OfficeHoursQuestion`, `OfficeHoursCluster` | Question topic spikes, repeated themes across courses | Continuous (on question submit) |
| **Course Post Activity** | `CoursePost`, `CoursePostRead` | Announcement volume spikes, low read rates on important posts | Continuous |
| **Assignment Submission Anomalies** | `Submission`, `Assignment` | Submission rate drops, late submission spikes, score distribution shifts | Daily |

---

## Core Concept: Pulse Events

A **Pulse Event** is a detected convergence of 2+ signal streams around a common theme within a 48-hour window.

```typescript
interface PulseEvent {
  id: string
  detectedAt: Date
  theme: string                    // AI-extracted theme label: "attendance policy", "exam accommodations", etc.
  severity: 'low' | 'medium' | 'high' | 'critical'
  signals: PulseSignal[]           // The 2+ converging signals
  affectedRoles: UserRole[]        // Which roles this impacts
  affectedCourses: string[]        // Course IDs if course-specific
  summary: string                  // AI-generated 2-sentence summary
  suggestedActions: string[]       // AI-generated action items
  status: 'active' | 'acknowledged' | 'resolved' | 'false-alarm'
  acknowledgedBy?: string          // Admin/staff who acknowledged
  resolvedAt?: Date
}

interface PulseSignal {
  stream: string                   // "uknow" | "email-urgency" | "at-risk" | "sentiment" | "policy" | "office-hours" | "course-posts" | "submissions"
  evidence: string                 // Human-readable: "3 UKNow articles about grading policy in 24h"
  dataPoints: number               // How many data points in this signal
  firstSeen: Date
  lastSeen: Date
  strength: number                 // 0-1: how strong this signal is
  sourceIds: string[]              // IDs of the source records for drill-down
}
```

### Severity Classification

```typescript
function classifySeverity(signals: PulseSignal[]): PulseEvent['severity'] {
  const streamCount = signals.length
  const maxStrength = Math.max(...signals.map(s => s.strength))
  const totalDataPoints = signals.reduce((sum, s) => sum + s.dataPoints, 0)

  // Critical: 4+ streams converging OR sentiment+policy+at-risk triple
  if (streamCount >= 4) return 'critical'
  if (hasSentiment(signals) && hasPolicy(signals) && hasAtRisk(signals)) return 'critical'

  // High: 3 streams OR any signal with strength > 0.8
  if (streamCount >= 3 || maxStrength > 0.8) return 'high'

  // Medium: 2 streams with moderate strength
  if (maxStrength > 0.5) return 'medium'

  return 'low'
}
```

---

## Schema Changes

### New Model: `PulseEvent`

```prisma
model PulseEvent {
  id              String       @id @default(cuid())
  detectedAt      DateTime     @default(now())
  theme           String       // Extracted theme label
  themeEmbedding  Float[]?     // For semantic matching across events
  severity        String       // "low" | "medium" | "high" | "critical"
  status          String       @default("active") // "active" | "acknowledged" | "resolved" | "false-alarm"

  summary         String       // AI-generated 2-sentence summary
  suggestedActions String[]    // AI-generated action items

  affectedRoles   String[]     // ["STUDENT", "EDUCATOR", etc.]
  affectedCourses String[]     // Course IDs if course-specific

  signals         PulseSignal[]

  acknowledgedBy  String?
  acknowledgedAt  DateTime?
  resolvedBy      String?
  resolvedAt      DateTime?
  resolvedNote    String?      // How it was resolved

  // Lifecycle
  escalatedAt     DateTime?    // When auto-escalated (severity upgrade)
  suppressedUntil DateTime?    // Snooze mechanism
  relatedEventIds String[]     // Links to related/predecessor events

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@index([status, severity])
  @@index([detectedAt])
  @@index([theme])
}

model PulseSignal {
  id          String     @id @default(cuid())
  eventId     String
  event       PulseEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)

  stream      String     // "uknow" | "email-urgency" | "at-risk" | "sentiment" | "policy" | "office-hours" | "course-posts" | "submissions"
  evidence    String     // Human-readable description
  dataPoints  Int        // Count of contributing data points
  strength    Float      // 0-1 signal strength
  firstSeen   DateTime
  lastSeen    DateTime
  sourceIds   String[]   // IDs for drill-down into source records
  metadata    Json?      // Stream-specific extra data

  @@index([eventId])
  @@index([stream])
}
```

### New Model: `PulseSubscription`

```prisma
model PulseSubscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // What to watch
  themes    String[] // Empty = all themes
  minSeverity String @default("medium") // Only notify at this severity or above
  roles     String[] // Only events affecting these roles

  // How to notify
  inApp     Boolean  @default(true)
  email     Boolean  @default(false)

  createdAt DateTime @default(now())

  @@unique([userId])
}
```

---

## Service Architecture

### Signal Extractors: `app/lib/pulse/extractors/`

Each extractor monitors one signal stream and returns anomalies detected in the last N hours.

#### `uknow-extractor.ts` — Campus News Signal

```typescript
export async function extractUKNowSignals(windowHours: number = 48): Promise<RawSignal[]> {
  const since = hoursAgo(windowHours)

  // Find articles published in the window
  const recentArticles = await prisma.uKNowArticle.findMany({
    where: { publishedAt: { gte: since } },
    select: { id: true, title: true, summary: true, section: true, publishedAt: true },
    orderBy: { publishedAt: 'desc' },
  })

  if (recentArticles.length === 0) return []

  // Cluster by topic similarity (title + summary keyword overlap)
  const clusters = clusterByTopicOverlap(recentArticles)

  // A signal fires when 2+ articles cluster around the same topic
  return clusters
    .filter(c => c.articles.length >= 2)
    .map(c => ({
      stream: 'uknow' as const,
      theme: c.topicLabel,
      evidence: `${c.articles.length} UKNow articles about "${c.topicLabel}" in ${windowHours}h`,
      dataPoints: c.articles.length,
      strength: Math.min(1, c.articles.length / 5), // 5+ articles = max strength
      firstSeen: c.articles[c.articles.length - 1].publishedAt,
      lastSeen: c.articles[0].publishedAt,
      sourceIds: c.articles.map(a => a.id),
    }))
}
```

#### `email-urgency-extractor.ts` — Email Urgency Signal

```typescript
export async function extractEmailUrgencySignals(windowHours: number = 48): Promise<RawSignal[]> {
  const since = hoursAgo(windowHours)

  // Find emails with urgency spikes (respond-today or higher) in the window
  const urgentEmails = await prisma.assistantEmail.findMany({
    where: {
      createdAt: { gte: since },
      urgencyBucket: { in: ['respond-today'] },
    },
    select: { id: true, subject: true, urgencyScore: true, userId: true, createdAt: true },
  })

  if (urgentEmails.length < 3) return [] // Need critical mass

  // Cluster by subject keyword overlap
  const clusters = clusterBySubjectOverlap(urgentEmails)

  return clusters
    .filter(c => c.emails.length >= 3) // 3+ urgent emails on same topic
    .map(c => ({
      stream: 'email-urgency' as const,
      theme: c.topicLabel,
      evidence: `${c.emails.length} urgent emails about "${c.topicLabel}" across ${new Set(c.emails.map(e => e.userId)).size} users`,
      dataPoints: c.emails.length,
      strength: Math.min(1, c.emails.length / 10),
      firstSeen: c.emails[c.emails.length - 1].createdAt,
      lastSeen: c.emails[0].createdAt,
      sourceIds: c.emails.map(e => e.id),
    }))
}
```

#### `at-risk-extractor.ts` — Student Risk Signal

```typescript
export async function extractAtRiskSignals(windowHours: number = 48): Promise<RawSignal[]> {
  const since = hoursAgo(windowHours)

  // Find students whose risk score increased significantly recently
  const riskSpikes = await prisma.studentProfile.findMany({
    where: {
      riskScore: { gte: 0.6 },
      updatedAt: { gte: since },
    },
    select: {
      userId: true,
      riskScore: true,
      updatedAt: true,
      user: {
        select: {
          enrollments: {
            select: { courseId: true, course: { select: { title: true } } },
          },
        },
      },
    },
  })

  if (riskSpikes.length < 2) return []

  // Cluster by course — if multiple students in same course spike, that's a signal
  const byCourse: Record<string, typeof riskSpikes> = {}
  for (const sp of riskSpikes) {
    for (const enrollment of sp.user.enrollments) {
      const key = enrollment.courseId
      if (!byCourse[key]) byCourse[key] = []
      byCourse[key].push(sp)
    }
  }

  return Object.entries(byCourse)
    .filter(([, students]) => students.length >= 2)
    .map(([courseId, students]) => ({
      stream: 'at-risk' as const,
      theme: students[0].user.enrollments.find(e => e.courseId === courseId)?.course.title || 'Unknown course',
      evidence: `${students.length} students flagged at-risk in same course within ${windowHours}h`,
      dataPoints: students.length,
      strength: Math.min(1, students.length / 5),
      firstSeen: students[students.length - 1].updatedAt,
      lastSeen: students[0].updatedAt,
      sourceIds: students.map(s => s.userId),
      metadata: { courseId },
    }))
}
```

#### `office-hours-extractor.ts` — Question Cluster Signal

```typescript
export async function extractOfficeHoursSignals(windowHours: number = 48): Promise<RawSignal[]> {
  const since = hoursAgo(windowHours)

  // Find question clusters that formed recently
  const clusters = await prisma.officeHoursCluster.findMany({
    where: {
      createdAt: { gte: since },
      questionCount: { gte: 3 }, // 3+ similar questions
    },
    select: {
      id: true,
      topic: true,
      questionCount: true,
      courseId: true,
      createdAt: true,
    },
  })

  return clusters.map(c => ({
    stream: 'office-hours' as const,
    theme: c.topic,
    evidence: `${c.questionCount} similar questions about "${c.topic}" in office hours`,
    dataPoints: c.questionCount,
    strength: Math.min(1, c.questionCount / 8),
    firstSeen: c.createdAt,
    lastSeen: c.createdAt,
    sourceIds: [c.id],
    metadata: { courseId: c.courseId },
  }))
}
```

#### `policy-extractor.ts` — Policy Change Signal

```typescript
export async function extractPolicySignals(windowHours: number = 168): Promise<RawSignal[]> {
  // Wider window for policies — they change slowly
  const since = hoursAgo(windowHours)

  const recentPolicies = await prisma.policyDocument.findMany({
    where: {
      OR: [
        { createdAt: { gte: since } },
        { updatedAt: { gte: since } },
      ],
    },
    select: { id: true, title: true, category: true, updatedAt: true },
  })

  if (recentPolicies.length === 0) return []

  return recentPolicies.map(p => ({
    stream: 'policy' as const,
    theme: p.title,
    evidence: `Policy updated: "${p.title}" (${p.category})`,
    dataPoints: 1,
    strength: 0.6, // Policy changes are inherently significant
    firstSeen: p.updatedAt,
    lastSeen: p.updatedAt,
    sourceIds: [p.id],
  }))
}
```

#### `sentiment-extractor.ts` — Social Media Signal

```typescript
export async function extractSentimentSignals(windowHours: number = 48): Promise<RawSignal[]> {
  // Read from Reputation Pulse analysis results (synthetic data for now)
  // In production: read from cached Sprout Social analysis
  const { getSyntheticPosts } = await import('../../crisis-comms/reputation-pulse/synthetic-data/sprout-7day-posts')

  const posts = getSyntheticPosts()
  const since = hoursAgo(windowHours)
  const recentNegative = posts.filter(p =>
    new Date(p.publishedAt) >= since && p.sentiment === 'negative'
  )

  if (recentNegative.length < 2) return []

  // Cluster negative posts by theme
  const clusters = clusterByContentOverlap(recentNegative)

  return clusters
    .filter(c => c.posts.length >= 2)
    .map(c => ({
      stream: 'sentiment' as const,
      theme: c.topicLabel,
      evidence: `${c.posts.length} negative social media posts about "${c.topicLabel}"`,
      dataPoints: c.posts.length,
      strength: Math.min(1, c.posts.length / 5),
      firstSeen: new Date(c.posts[c.posts.length - 1].publishedAt),
      lastSeen: new Date(c.posts[0].publishedAt),
      sourceIds: c.posts.map(p => p.sproutId),
    }))
}
```

#### `submission-extractor.ts` — Assignment Anomaly Signal

```typescript
export async function extractSubmissionSignals(windowHours: number = 48): Promise<RawSignal[]> {
  const since = hoursAgo(windowHours)

  // Find assignments where submission rate dropped significantly
  const assignments = await prisma.assignment.findMany({
    where: {
      dueDate: { gte: since, lte: new Date() }, // Due in the window and past due
    },
    select: {
      id: true,
      title: true,
      courseId: true,
      course: { select: { title: true } },
      dueDate: true,
      _count: { select: { submissions: true } },
    },
  })

  // Compare submission count to enrolled student count
  const anomalies: RawSignal[] = []
  for (const a of assignments) {
    const enrolled = await prisma.courseEnrollment.count({
      where: { courseId: a.courseId, role: 'STUDENT' },
    })
    if (enrolled === 0) continue

    const submitRate = a._count.submissions / enrolled
    if (submitRate < 0.5) { // Less than 50% submitted — anomaly
      anomalies.push({
        stream: 'submissions' as const,
        theme: `Low submission: ${a.course.title}`,
        evidence: `Only ${Math.round(submitRate * 100)}% submitted "${a.title}" (${a._count.submissions}/${enrolled})`,
        dataPoints: enrolled - a._count.submissions,
        strength: Math.min(1, (1 - submitRate)),
        firstSeen: a.dueDate,
        lastSeen: new Date(),
        sourceIds: [a.id],
        metadata: { courseId: a.courseId, assignmentId: a.id },
      })
    }
  }

  return anomalies
}
```

#### `course-posts-extractor.ts` — Announcement Activity Signal

```typescript
export async function extractCoursePostSignals(windowHours: number = 48): Promise<RawSignal[]> {
  const since = hoursAgo(windowHours)

  // Find announcements with unusually low read rates
  const posts = await prisma.coursePost.findMany({
    where: {
      createdAt: { gte: since },
      importance: 'HIGH', // Only track important announcements
    },
    select: {
      id: true,
      title: true,
      courseId: true,
      course: { select: { title: true } },
      createdAt: true,
      _count: { select: { reads: true } },
    },
  })

  const signals: RawSignal[] = []
  for (const post of posts) {
    const enrolled = await prisma.courseEnrollment.count({
      where: { courseId: post.courseId, role: 'STUDENT' },
    })
    if (enrolled === 0) continue

    const readRate = post._count.reads / enrolled
    // Important announcement with <30% read rate after 24h+ = signal
    const ageHours = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60)
    if (readRate < 0.3 && ageHours > 24) {
      signals.push({
        stream: 'course-posts' as const,
        theme: `Unread announcement: ${post.course.title}`,
        evidence: `Important announcement "${post.title}" has only ${Math.round(readRate * 100)}% read rate after ${Math.round(ageHours)}h`,
        dataPoints: enrolled - post._count.reads,
        strength: Math.min(1, (1 - readRate) * 0.8),
        firstSeen: post.createdAt,
        lastSeen: new Date(),
        sourceIds: [post.id],
        metadata: { courseId: post.courseId },
      })
    }
  }

  return signals
}
```

---

### Correlation Engine: `app/lib/pulse/correlation-engine.ts`

The core intelligence — takes raw signals from all extractors and finds convergences.

```typescript
import { extractUKNowSignals } from './extractors/uknow-extractor'
import { extractEmailUrgencySignals } from './extractors/email-urgency-extractor'
import { extractAtRiskSignals } from './extractors/at-risk-extractor'
import { extractOfficeHoursSignals } from './extractors/office-hours-extractor'
import { extractPolicySignals } from './extractors/policy-extractor'
import { extractSentimentSignals } from './extractors/sentiment-extractor'
import { extractSubmissionSignals } from './extractors/submission-extractor'
import { extractCoursePostSignals } from './extractors/course-posts-extractor'

interface RawSignal {
  stream: string
  theme: string
  evidence: string
  dataPoints: number
  strength: number
  firstSeen: Date
  lastSeen: Date
  sourceIds: string[]
  metadata?: Record<string, unknown>
}

interface CorrelationResult {
  theme: string
  signals: RawSignal[]
  correlationScore: number  // 0-1: how strong the convergence is
}

export async function runCorrelationScan(windowHours: number = 48): Promise<CorrelationResult[]> {
  // 1. Extract all signals in parallel
  const allSignals = (await Promise.all([
    extractUKNowSignals(windowHours),
    extractEmailUrgencySignals(windowHours),
    extractAtRiskSignals(windowHours),
    extractOfficeHoursSignals(windowHours),
    extractPolicySignals(windowHours * 3), // Wider window for slow-moving signals
    extractSentimentSignals(windowHours),
    extractSubmissionSignals(windowHours),
    extractCoursePostSignals(windowHours),
  ])).flat()

  if (allSignals.length < 2) return [] // Need at least 2 signals to correlate

  // 2. Theme matching — group signals whose themes overlap
  const correlations = findThemeCorrelations(allSignals)

  // 3. Filter: only keep correlations with 2+ different streams
  return correlations
    .filter(c => {
      const uniqueStreams = new Set(c.signals.map(s => s.stream))
      return uniqueStreams.size >= 2
    })
    .sort((a, b) => b.correlationScore - a.correlationScore)
}

function findThemeCorrelations(signals: RawSignal[]): CorrelationResult[] {
  // Strategy: pairwise theme similarity using keyword overlap
  // Group signals whose themes share significant keyword overlap

  const groups: Map<string, RawSignal[]> = new Map()

  for (const signal of signals) {
    const keywords = extractKeywords(signal.theme)
    let matched = false

    for (const [groupTheme, groupSignals] of groups) {
      const groupKeywords = extractKeywords(groupTheme)
      const overlap = keywordOverlap(keywords, groupKeywords)

      if (overlap >= 0.3) { // 30%+ keyword overlap = same theme
        groupSignals.push(signal)
        matched = true
        break
      }
    }

    if (!matched) {
      groups.set(signal.theme, [signal])
    }
  }

  return Array.from(groups.entries()).map(([theme, signals]) => ({
    theme,
    signals,
    correlationScore: computeCorrelationScore(signals),
  }))
}

function computeCorrelationScore(signals: RawSignal[]): number {
  const uniqueStreams = new Set(signals.map(s => s.stream)).size
  const avgStrength = signals.reduce((sum, s) => sum + s.strength, 0) / signals.length
  const totalDataPoints = signals.reduce((sum, s) => sum + s.dataPoints, 0)

  // Score factors: stream diversity (most important), signal strength, data volume
  const streamDiversityScore = Math.min(1, uniqueStreams / 4) // 4+ streams = max
  const strengthScore = avgStrength
  const volumeScore = Math.min(1, totalDataPoints / 20) // 20+ data points = max

  return (streamDiversityScore * 0.5) + (strengthScore * 0.3) + (volumeScore * 0.2)
}

function extractKeywords(text: string): Set<string> {
  const stopWords = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or', 'is', 'was', 'are'])
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
  )
}

function keywordOverlap(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter(x => b.has(x)))
  const union = new Set([...a, ...b])
  return union.size > 0 ? intersection.size / union.size : 0
}
```

---

### Pulse Service: `app/lib/pulse/pulse-service.ts`

Orchestrates the scan → correlate → summarize → persist → notify pipeline.

```typescript
import { runCorrelationScan } from './correlation-engine'
import { prisma } from '../prisma'
import Anthropic from '@anthropic-ai/sdk'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

export async function runPulseScan(): Promise<{
  newEvents: number
  updatedEvents: number
  totalActive: number
}> {
  // 1. Run correlation scan
  const correlations = await runCorrelationScan(48)

  let newEvents = 0
  let updatedEvents = 0

  for (const correlation of correlations) {
    // 2. Check if this theme already has an active PulseEvent
    const existing = await findExistingEvent(correlation.theme)

    if (existing) {
      // Update existing event with new signals
      await updatePulseEvent(existing.id, correlation)
      updatedEvents++
    } else {
      // Create new PulseEvent
      await createPulseEvent(correlation)
      newEvents++
    }
  }

  // 3. Auto-resolve stale events (no new signals in 72h)
  await resolveStaleEvents()

  const totalActive = await prisma.pulseEvent.count({
    where: { status: 'active' },
  })

  return { newEvents, updatedEvents, totalActive }
}

async function createPulseEvent(correlation: CorrelationResult): Promise<void> {
  const severity = classifySeverity(correlation.signals)
  const { summary, suggestedActions } = await generateEventIntelligence(correlation)
  const affectedRoles = deriveAffectedRoles(correlation.signals)
  const affectedCourses = deriveAffectedCourses(correlation.signals)

  await prisma.pulseEvent.create({
    data: {
      theme: correlation.theme,
      severity,
      summary,
      suggestedActions,
      affectedRoles,
      affectedCourses,
      signals: {
        create: correlation.signals.map(s => ({
          stream: s.stream,
          evidence: s.evidence,
          dataPoints: s.dataPoints,
          strength: s.strength,
          firstSeen: s.firstSeen,
          lastSeen: s.lastSeen,
          sourceIds: s.sourceIds,
          metadata: s.metadata || {},
        })),
      },
    },
  })
}

async function generateEventIntelligence(
  correlation: CorrelationResult
): Promise<{ summary: string; suggestedActions: string[] }> {
  const signalDescriptions = correlation.signals
    .map(s => `- [${s.stream}] ${s.evidence}`)
    .join('\n')

  const anthropic = new Anthropic()
  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 300,
    system: `You are an institutional intelligence analyst for the University of Kentucky. Given converging signals from multiple data streams, produce a concise 2-sentence summary of the emerging situation and 2-4 suggested actions. Be specific and actionable. Output JSON: { "summary": "...", "suggestedActions": ["...", "..."] }`,
    messages: [{
      role: 'user',
      content: `Theme: "${correlation.theme}"\nCorrelation score: ${correlation.correlationScore.toFixed(2)}\n\nConverging signals:\n${signalDescriptions}\n\nGenerate intelligence summary and actions.`,
    }],
  })

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text)
    return {
      summary: parsed.summary || 'Multiple signals converging around this theme.',
      suggestedActions: parsed.suggestedActions || ['Monitor situation', 'Review source data'],
    }
  } catch {
    return {
      summary: `${correlation.signals.length} signals converging around "${correlation.theme}" across ${new Set(correlation.signals.map(s => s.stream)).size} data streams.`,
      suggestedActions: ['Review source data', 'Monitor for escalation'],
    }
  }
}

async function findExistingEvent(theme: string): Promise<{ id: string } | null> {
  // Find active events with similar theme (keyword overlap)
  const active = await prisma.pulseEvent.findMany({
    where: { status: 'active' },
    select: { id: true, theme: true },
  })

  const themeKeywords = extractKeywords(theme)
  for (const event of active) {
    const eventKeywords = extractKeywords(event.theme)
    if (keywordOverlap(themeKeywords, eventKeywords) >= 0.4) {
      return { id: event.id }
    }
  }

  return null
}

async function updatePulseEvent(eventId: string, correlation: CorrelationResult): Promise<void> {
  const severity = classifySeverity(correlation.signals)

  // Add new signals (avoid duplicates by stream+sourceId)
  const existingSignals = await prisma.pulseSignal.findMany({
    where: { eventId },
    select: { stream: true, sourceIds: true },
  })

  for (const signal of correlation.signals) {
    const isDuplicate = existingSignals.some(es =>
      es.stream === signal.stream &&
      signal.sourceIds.some(id => es.sourceIds.includes(id))
    )
    if (!isDuplicate) {
      await prisma.pulseSignal.create({
        data: {
          eventId,
          stream: signal.stream,
          evidence: signal.evidence,
          dataPoints: signal.dataPoints,
          strength: signal.strength,
          firstSeen: signal.firstSeen,
          lastSeen: signal.lastSeen,
          sourceIds: signal.sourceIds,
          metadata: signal.metadata || {},
        },
      })
    }
  }

  // Upgrade severity if warranted (never downgrade active events)
  const currentEvent = await prisma.pulseEvent.findUnique({
    where: { id: eventId },
    select: { severity: true },
  })
  const severityRank = { low: 0, medium: 1, high: 2, critical: 3 }
  const shouldUpgrade = severityRank[severity] > severityRank[currentEvent?.severity as keyof typeof severityRank || 'low']

  if (shouldUpgrade) {
    await prisma.pulseEvent.update({
      where: { id: eventId },
      data: { severity, escalatedAt: new Date() },
    })
  }
}

async function resolveStaleEvents(): Promise<void> {
  const staleThreshold = new Date(Date.now() - 72 * 60 * 60 * 1000) // 72h

  await prisma.pulseEvent.updateMany({
    where: {
      status: 'active',
      updatedAt: { lt: staleThreshold },
    },
    data: {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedNote: 'Auto-resolved: no new signals in 72 hours',
    },
  })
}

// Public query functions

export async function getActiveEvents(options?: {
  severity?: string
  role?: string
  limit?: number
}): Promise<PulseEvent[]> {
  return prisma.pulseEvent.findMany({
    where: {
      status: 'active',
      ...(options?.severity && { severity: options.severity }),
      ...(options?.role && { affectedRoles: { has: options.role } }),
    },
    include: { signals: true },
    orderBy: [
      { severity: 'desc' },
      { detectedAt: 'desc' },
    ],
    take: options?.limit || 20,
  })
}

export async function acknowledgeEvent(eventId: string, userId: string): Promise<void> {
  await prisma.pulseEvent.update({
    where: { id: eventId },
    data: {
      status: 'acknowledged',
      acknowledgedBy: userId,
      acknowledgedAt: new Date(),
    },
  })
}

export async function resolveEvent(eventId: string, userId: string, note: string): Promise<void> {
  await prisma.pulseEvent.update({
    where: { id: eventId },
    data: {
      status: 'resolved',
      resolvedBy: userId,
      resolvedAt: new Date(),
      resolvedNote: note,
    },
  })
}

export async function markFalseAlarm(eventId: string, userId: string): Promise<void> {
  await prisma.pulseEvent.update({
    where: { id: eventId },
    data: {
      status: 'false-alarm',
      resolvedBy: userId,
      resolvedAt: new Date(),
      resolvedNote: 'Marked as false alarm',
    },
  })
}
```

---

### Theme Clustering Utility: `app/lib/pulse/theme-matcher.ts`

Shared keyword extraction and clustering logic used by all extractors and the correlation engine.

```typescript
// Lightweight keyword-based clustering (no embeddings needed for v1)
// Future: swap in embedding-based similarity when OPENAI_API_KEY is available

export function clusterByTopicOverlap<T extends { theme?: string; title?: string; subject?: string }>(
  items: T[],
  options?: { minOverlap?: number }
): Array<{ topicLabel: string; items: T[] }> {
  const minOverlap = options?.minOverlap ?? 0.3
  const groups: Array<{ keywords: Set<string>; topicLabel: string; items: T[] }> = []

  for (const item of items) {
    const text = item.theme || item.title || item.subject || ''
    const keywords = extractKeywords(text)
    let matched = false

    for (const group of groups) {
      if (keywordOverlap(keywords, group.keywords) >= minOverlap) {
        group.items.push(item)
        // Expand group keywords
        for (const kw of keywords) group.keywords.add(kw)
        matched = true
        break
      }
    }

    if (!matched) {
      groups.push({ keywords, topicLabel: text, items: [item] })
    }
  }

  return groups.map(g => ({ topicLabel: g.topicLabel, items: g.items }))
}
```

---

## API Routes

### GET `/api/pulse/events`

Active pulse events — for admin dashboard and Sandy context.

```typescript
// app/api/pulse/events/route.ts
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = req.nextUrl
  const severity = url.searchParams.get('severity') || undefined
  const role = url.searchParams.get('role') || auth.user.role
  const limit = parseInt(url.searchParams.get('limit') || '20')

  const events = await getActiveEvents({ severity, role, limit })

  // Non-admin users see only events affecting their role
  const filtered = auth.user.role === 'ADMIN'
    ? events
    : events.filter(e => e.affectedRoles.includes(auth.user.role))

  return NextResponse.json(filtered)
})
```

### POST `/api/pulse/events/[eventId]/acknowledge`

Admin acknowledges an event.

```typescript
// app/api/pulse/events/[eventId]/acknowledge/route.ts
export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { eventId } = await params

  await acknowledgeEvent(eventId, auth.user.id)
  return NextResponse.json({ success: true })
})
```

### POST `/api/pulse/events/[eventId]/resolve`

Admin resolves an event.

```typescript
// app/api/pulse/events/[eventId]/resolve/route.ts
export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { eventId } = await params
  const { note } = await req.json()

  await resolveEvent(eventId, auth.user.id, note || 'Resolved')
  return NextResponse.json({ success: true })
})
```

### POST `/api/pulse/events/[eventId]/false-alarm`

```typescript
// app/api/pulse/events/[eventId]/false-alarm/route.ts
export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { eventId } = await params

  await markFalseAlarm(eventId, auth.user.id)
  return NextResponse.json({ success: true })
})
```

### POST `/api/pulse/scan`

Manual scan trigger (admin or cron).

```typescript
// app/api/pulse/scan/route.ts
export const POST = withErrorHandling(async (req: NextRequest) => {
  // Allow both admin and cron
  const cronAuth = verifyCronSecret(req)
  if (!cronAuth) {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) return auth.response
  }

  const result = await runPulseScan()
  return NextResponse.json(result)
})
```

### GET `/api/pulse/sandy-context`

Internal — Sandy reads active pulse events for proactive awareness.

```typescript
// app/api/pulse/sandy-context/route.ts
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const events = await getActiveEvents({
    role: auth.user.role,
    limit: 5,
  })

  if (events.length === 0) {
    return NextResponse.json({ context: null })
  }

  const context = events.map(e =>
    `[${e.severity.toUpperCase()}] ${e.theme}: ${e.summary} (${e.signals.length} signals)`
  ).join('\n')

  return NextResponse.json({ context })
})
```

### POST `/api/cron/pulse-scan`

Scheduled scan — runs every 2 hours.

```typescript
// app/api/cron/pulse-scan/route.ts
export const POST = withErrorHandling(async (req: NextRequest) => {
  const cronAuth = verifyCronSecret(req)
  if (cronAuth) return cronAuth

  const result = await runPulseScan()
  return NextResponse.json(result)
})
```

---

## Consumer Integrations

### Consumer 1: Admin Pulse Dashboard

New page at `/admin/pulse` — the institutional radar.

```
┌──────────────────────────────────────────────────────────────────┐
│  CAMPUS PULSE                                    Last scan: 2m ago│
│                                                                    │
│  ┌─ CRITICAL (1) ────────────────────────────────────────────┐   │
│  │ 🔴 Exam Accommodation Policy                              │   │
│  │    4 signals · Detected 6h ago                             │   │
│  │                                                            │   │
│  │    📰 3 UKNow articles about disability services           │   │
│  │    📧 8 urgent emails about accommodations across faculty  │   │
│  │    ❓ 12 office hours questions about exam accommodations  │   │
│  │    📋 Policy updated: "Academic Accommodation Procedures"  │   │
│  │                                                            │   │
│  │    AI SUMMARY: A recent update to exam accommodation       │   │
│  │    procedures has triggered cross-campus confusion.        │   │
│  │    Faculty are receiving urgent student requests and        │   │
│  │    seeking clarification from administration.              │   │
│  │                                                            │   │
│  │    SUGGESTED ACTIONS:                                      │   │
│  │    • Send clarification announcement to all faculty        │   │
│  │    • Update FAQ on disability services website             │   │
│  │    • Brief Sandy with new accommodation procedures         │   │
│  │    • Schedule info session for affected departments        │   │
│  │                                                            │   │
│  │    [Acknowledge]  [Resolve]  [False Alarm]  [View Sources] │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌─ HIGH (2) ────────────────────────────────────────────────┐   │
│  │ 🟠 Low Submission Rate — STAT 200                          │   │
│  │    3 signals · Detected 12h ago                            │   │
│  │    ...                                                     │   │
│  │                                                            │   │
│  │ 🟠 Grading Concerns — CS 101                               │   │
│  │    2 signals · Detected 4h ago                             │   │
│  │    ...                                                     │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌─ RESOLVED (3 this week) ──────────────────────────────────┐   │
│  │  ✓ Parking Policy Update (resolved 2d ago)                 │   │
│  │  ✓ Library Hours Change (auto-resolved)                    │   │
│  │  ✗ Registration Glitch (false alarm)                       │   │
│  └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Consumer 2: Sandy System Prompt

Active pulse events are injected into Sandy's context so she can proactively mention them.

```typescript
// In concierge-service.ts — buildSystemPrompt()

async function buildPulseBlock(userRole: string): Promise<string> {
  const events = await getActiveEvents({ role: userRole, limit: 3 })
  if (events.length === 0) return ''

  const lines = events.map(e =>
    `- [${e.severity}] "${e.theme}": ${e.summary}`
  )

  return `
<campus-pulse>
Active campus concerns detected by multi-signal intelligence:
${lines.join('\n')}
</campus-pulse>

INSTRUCTIONS FOR CAMPUS PULSE:
- If the user asks about a topic that matches an active pulse event, reference it naturally
- For HIGH/CRITICAL events: proactively mention them if relevant to the user's context
- Do not alarm users — present information calmly and with actionable next steps
- For ADMIN users: encourage them to review the Pulse dashboard for full details
- Never reveal the raw signal data or source model names — speak in plain language
`
}
```

### Consumer 3: Faculty Morning Briefing

Pulse events affecting a faculty member's courses are injected into their briefing.

```typescript
// In staff/briefing-service.ts — buildBriefing()

async function addPulseInsights(userId: string, briefing: BriefingData): Promise<void> {
  // Find events affecting this faculty's courses
  const courses = await prisma.course.findMany({
    where: { creatorId: userId },
    select: { id: true },
  })
  const courseIds = courses.map(c => c.id)

  const events = await prisma.pulseEvent.findMany({
    where: {
      status: 'active',
      affectedCourses: { hasSome: courseIds },
    },
    include: { signals: true },
    orderBy: { severity: 'desc' },
    take: 3,
  })

  if (events.length > 0) {
    briefing.pulseAlerts = events.map(e => ({
      theme: e.theme,
      severity: e.severity,
      summary: e.summary,
      signalCount: e.signals.length,
    }))
  }
}
```

### Consumer 4: Sandy Agent Tool

```typescript
// In sandy-tools.ts
{
  name: 'get_campus_pulse',
  description: 'Check for active campus-wide concerns detected by the multi-signal intelligence system. Shows emerging issues based on converging signals from news, emails, student risk, and more.',
  parameters: {
    type: 'object',
    properties: {
      severity: {
        type: 'string',
        description: 'Filter by minimum severity: low, medium, high, critical',
        enum: ['low', 'medium', 'high', 'critical']
      }
    }
  },
  permission: 'auto',
  handler: async ({ severity }, context) => {
    const events = await getActiveEvents({
      severity,
      role: context.userRole,
      limit: 5,
    })

    if (events.length === 0) {
      return { message: 'No active campus concerns detected. All signals are within normal ranges.' }
    }

    return events.map(e => ({
      theme: e.theme,
      severity: e.severity,
      summary: e.summary,
      signalCount: e.signals.length,
      streams: [...new Set(e.signals.map(s => s.stream))],
      suggestedActions: e.suggestedActions,
      detectedAt: e.detectedAt,
    }))
  }
}
```

### Consumer 5: Notification System

High/critical pulse events trigger notifications for relevant users.

```typescript
// In pulse-service.ts — after creating a new HIGH or CRITICAL event

async function notifyRelevantUsers(event: PulseEvent): Promise<void> {
  if (!['high', 'critical'].includes(event.severity)) return

  // Find users matching affected roles
  const users = await prisma.user.findMany({
    where: {
      role: { in: event.affectedRoles as any[] },
      ...(event.affectedCourses.length > 0 && {
        OR: [
          { courses: { some: { id: { in: event.affectedCourses } } } },
          { enrollments: { some: { courseId: { in: event.affectedCourses } } } },
        ],
      }),
    },
    select: { id: true },
  })

  // Check subscription preferences
  for (const user of users) {
    const sub = await prisma.pulseSubscription.findUnique({
      where: { userId: user.id },
    })

    // Default: notify on HIGH+ for in-app
    const minSeverity = sub?.minSeverity || 'high'
    const severityRank = { low: 0, medium: 1, high: 2, critical: 3 }
    if (severityRank[event.severity] < severityRank[minSeverity]) continue

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'CAMPUS_PULSE',
        title: `Campus Pulse: ${event.theme}`,
        body: event.summary,
        link: '/admin/pulse',
        metadata: { eventId: event.id, severity: event.severity },
      },
    })
  }
}
```

---

## UI Components

### `PulseDashboard.tsx` — Admin Pulse Page

```
app/admin/pulse/page.tsx
app/components/pulse/PulseDashboard.tsx        — Main dashboard orchestrator
app/components/pulse/PulseEventCard.tsx         — Single event card with signals, actions
app/components/pulse/PulseSignalBadge.tsx       — Stream icon + evidence one-liner
app/components/pulse/PulseSeverityBanner.tsx    — Color-coded severity sections
app/components/pulse/PulseTimeline.tsx          — Recharts timeline of events over time
app/components/pulse/PulseFilterBar.tsx         — Severity + stream + status filters
```

### `PulseWidget.tsx` — Compact Admin Homepage Widget

Small card on the admin homepage showing active event count by severity.

```
┌────────────────────────────────┐
│  CAMPUS PULSE          [View →]│
│                                │
│  🔴 1 Critical  🟠 2 High     │
│  🟡 3 Medium   🟢 0 Low       │
│                                │
│  Latest: Exam Accommodations   │
│  (4 signals · 6h ago)          │
└────────────────────────────────┘
```

### `PulseBriefingCard.tsx` — Faculty Briefing Integration

Inserted into the morning briefing when pulse events affect the faculty member's courses.

```
┌────────────────────────────────────────────────┐
│  ⚡ CAMPUS PULSE                                │
│                                                 │
│  Your courses are affected by 1 active concern: │
│                                                 │
│  🟠 Low Submission Rate — STAT 200              │
│  Only 42% submitted the midterm review.         │
│  3 of your students flagged at-risk.            │
│                                                 │
│  Sandy suggests: "Consider sending a reminder   │
│  with office hours information."                │
│                                                 │
│  [View Details]  [Ask Sandy]                    │
└────────────────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|---|---|
| `app/lib/pulse/correlation-engine.ts` | Core: run all extractors, find theme convergences |
| `app/lib/pulse/pulse-service.ts` | Orchestration: scan → persist → notify pipeline |
| `app/lib/pulse/theme-matcher.ts` | Shared keyword clustering utility |
| `app/lib/pulse/types.ts` | TypeScript interfaces for all pulse data |
| `app/lib/pulse/extractors/uknow-extractor.ts` | Campus news signal extraction |
| `app/lib/pulse/extractors/email-urgency-extractor.ts` | Email urgency spike detection |
| `app/lib/pulse/extractors/at-risk-extractor.ts` | Student risk cluster detection |
| `app/lib/pulse/extractors/office-hours-extractor.ts` | Question topic spike detection |
| `app/lib/pulse/extractors/policy-extractor.ts` | Policy change detection |
| `app/lib/pulse/extractors/sentiment-extractor.ts` | Social media sentiment signal |
| `app/lib/pulse/extractors/submission-extractor.ts` | Assignment anomaly detection |
| `app/lib/pulse/extractors/course-posts-extractor.ts` | Announcement engagement signal |
| `app/api/pulse/events/route.ts` | GET — list active events |
| `app/api/pulse/events/[eventId]/acknowledge/route.ts` | POST — acknowledge event |
| `app/api/pulse/events/[eventId]/resolve/route.ts` | POST — resolve event |
| `app/api/pulse/events/[eventId]/false-alarm/route.ts` | POST — mark false alarm |
| `app/api/pulse/scan/route.ts` | POST — manual scan trigger |
| `app/api/pulse/sandy-context/route.ts` | GET — Sandy context injection |
| `app/api/cron/pulse-scan/route.ts` | POST — scheduled scan (every 2h) |
| `app/admin/pulse/page.tsx` | Admin Pulse dashboard page |
| `app/components/pulse/PulseDashboard.tsx` | Dashboard orchestrator |
| `app/components/pulse/PulseEventCard.tsx` | Event card with signals + actions |
| `app/components/pulse/PulseSignalBadge.tsx` | Stream icon + evidence badge |
| `app/components/pulse/PulseSeverityBanner.tsx` | Severity section headers |
| `app/components/pulse/PulseTimeline.tsx` | Recharts event timeline |
| `app/components/pulse/PulseFilterBar.tsx` | Severity/stream/status filters |
| `app/components/pulse/PulseWidget.tsx` | Compact admin homepage widget |
| `app/components/pulse/PulseBriefingCard.tsx` | Faculty briefing integration |

## Files to Modify

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `PulseEvent`, `PulseSignal`, `PulseSubscription` models |
| `app/lib/concierge-service.ts` | Inject pulse context block into Sandy system prompt |
| `app/lib/agent/tools/sandy-tools.ts` | Add `get_campus_pulse` tool |
| `app/lib/agent/tool-registry.ts` | Register new tool |
| `app/components/Header.tsx` | Add "Pulse" nav link for ADMIN role |
| `app/admin/page.tsx` | Add `PulseWidget` to admin homepage |
| `app/components/staff/BriefingCard.tsx` | Add `PulseBriefingCard` to morning briefing |

---

## Cron Schedule

| Job | Schedule | Route |
|---|---|---|
| Pulse scan | Every 2 hours | `POST /api/cron/pulse-scan` |

Estimated runtime: ~5-10 seconds (8 parallel extractor queries + correlation + optional Haiku summary for new events).

---

## Migration Path

1. **Sprint 1**: Schema + all 8 extractors + correlation engine + pulse service + cron + `/api/pulse/events`
2. **Sprint 2**: Admin Pulse dashboard (full page + widget) + event management (acknowledge/resolve/false-alarm) + notification system
3. **Sprint 3**: Sandy integration (system prompt + agent tool) + faculty briefing integration + `PulseBriefingCard`

---

## What This Does NOT Do

- Does not collect new data — reads exclusively from existing models
- Does not use embeddings for v1 theme matching (keyword overlap is sufficient; embeddings can be added later)
- Does not predict future events — detects current convergences only
- Does not auto-resolve crises — surfaces intelligence for humans to act on
- Does not expose individual student data in pulse events — signals are aggregated
- Does not replace Reputation Pulse — consumes its output as one of 8 signal streams

---

## Privacy & FERPA

| Concern | Mitigation |
|---|---|
| **Student at-risk signals** | PulseEvent stores course-level counts, never individual student names/IDs |
| **Email content** | Only email subjects are analyzed for topic clustering — never email bodies |
| **Signal source IDs** | Admin can drill into source records (with appropriate auth), but the PulseEvent card shows only aggregated evidence |
| **Non-admin visibility** | Non-admin users see only events matching their role, with reduced detail (summary only, no source IDs) |
| **Wellness data** | Not used by Campus Pulse — wellness signals feed only into the Engagement Fingerprint |

---

## Patent Claims

1. **Multi-stream signal fusion** — 8 independent data streams correlated through keyword-based theme matching to detect emergent institutional concerns
2. **Proactive Agency pillar** — the system detects and surfaces concerns before any human reports them
3. **Severity escalation** — automatic severity upgrade when new signals converge on an existing event
4. **AI-generated institutional intelligence** — Haiku produces actionable summaries and suggested actions from raw convergence data
5. **Role-scoped awareness** — the same pulse event surfaces differently to admins (full dashboard), faculty (course-specific briefing), and students (Sandy mentions)

---

## Success Criteria

1. **Detection speed.** A convergence event is detected within 2 hours of the second signal appearing (cron frequency).
2. **Signal accuracy.** False alarm rate < 20% (measured by admin "false alarm" clicks).
3. **Admin awareness.** Heath (admin) opens the Pulse dashboard and says "I didn't know this was happening" — and the system did.
4. **Sandy integration.** A student asks Sandy about exam accommodations, and Sandy responds with awareness of the active pulse event — without being asked about it.
5. **Faculty briefing.** Katie (educator) sees in her morning briefing that 3 students in her course are affected by a campus-wide concern, with suggested actions.
