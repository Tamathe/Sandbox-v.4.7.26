# Blueprint: Sandy Behavioral Meta-Intelligence — AI as Research Instrument

> **Sprint Scope:** Mine patterns across all Sandy interaction surfaces to discover correlations between AI assistant usage and academic outcomes. Turn Sandy from a tool into a research instrument that reveals what actually works in education.
> **Depends On:** Engagement Fingerprint (Blueprint 9) for behavioral classification. Sandy Universal Agent (complete). Study Buddy v2 (complete).
> **Estimated Size:** Medium (2 sprints)
> **Deploy Order:** 9 of 10 (Cross-Data Series)
> **Patent Relevance:** VERY HIGH — "AI assistant interaction mining for evidence-based educational practice discovery"

---

## Context

Sandy interacts with every user across 12+ surfaces — concierge, study buddy (7 modes), tool builder, research hub, academic advisor, campus navigator, UKNow analyst, course map TA, 16 elevated tool interviews, and more. Each interaction is logged in `SandyExecutionTrace`. Combined with outcome data (grades, mastery, session scores, retention), this creates a unique dataset:

**What patterns of AI assistant usage actually correlate with better outcomes?**

This isn't a dashboard — it's a discovery engine. It asks questions like:
- "Students who use Sandy for study coaching 48h before exams score 15% higher"
- "Faculty who use the Agenda Builder before committee meetings have 30% shorter meetings"
- "Students who engage with Sandy proactive nudges have 2x the concept mastery gain"
- "The most effective study mode for night-owl crammers is Flashcard, not Tutor"

### Data Available

| Sandy Surface | Interaction Data | Outcome Data |
|---|---|---|
| **Study Buddy** | Mode, duration, turns, concept focus | Session score, concept mastery delta, flashcard retention |
| **Concierge** | Page context, question type, tool suggestions accepted | Subsequent engagement, tool session outcomes |
| **Elevated Tools** | Interview turns, phase progression, output quality | User rating, output downloads, follow-up usage |
| **Course Map TA** | Concept questions, help requests | Quiz scores, assignment performance |
| **Office Hours** | Question topics, session duration | Concept mastery change, grade impact |
| **Email Intelligence** | Urgency handling, compose assistance | Response time, thread resolution |
| **Research Hub** | Research queries, methodology guidance | Research session completion, citation count |

---

## Schema Changes

### New Model: `SandyInsightDiscovery`

Stores discovered correlations between Sandy usage and outcomes.

```prisma
model SandyInsightDiscovery {
  id           String   @id @default(cuid())
  discoveredAt DateTime @default(now())

  // ── The Insight ──
  title         String   // "Pre-exam study coaching correlates with 15% higher scores"
  description   String   // Full description with methodology
  insightType   String   // "correlation" | "pattern" | "segment-difference" | "trend"
  category      String   // "study-effectiveness" | "tool-usage" | "engagement" | "faculty" | "timing"

  // ── Statistical Backing ──
  sampleSize    Int      // How many data points
  effectSize    Float    // Cohen's d or correlation coefficient
  confidence    Float    // 0-1 statistical confidence
  methodology   String   // "cohort-comparison" | "before-after" | "time-series" | "segment-analysis"

  // ── Segments ──
  segmentA      String?  // e.g., "students who used Sandy coaching 48h before exam"
  segmentB      String?  // e.g., "students who did not"
  metricCompared String  // "avg_score" | "mastery_gain" | "retention_rate" | "engagement_score"
  segmentAValue  Float   // e.g., 82.5 (avg score)
  segmentBValue  Float   // e.g., 71.3

  // ── Actionability ──
  actionable      Boolean  @default(true)
  recommendation  String?  // "Sandy should proactively suggest study coaching 48h before exams"
  implemented     Boolean  @default(false) // Has this insight been wired into Sandy's behavior?

  // ── Meta ──
  status       String   @default("draft") // "draft" | "verified" | "published" | "retracted"
  verifiedBy   String?  // Admin who verified
  tags         String[]

  @@index([category])
  @@index([status])
  @@index([effectSize])
}
```

### New Model: `SandyEffectivenessMetric`

Pre-computed per-surface effectiveness metrics, refreshed weekly.

```prisma
model SandyEffectivenessMetric {
  id           String   @id @default(cuid())
  surface      String   // "study-buddy" | "concierge" | "elevated-tool" | "office-hours" | etc.
  period       String   // "2026-W12" (ISO week)
  computedAt   DateTime @default(now())

  // ── Usage ──
  totalSessions      Int
  uniqueUsers        Int
  avgTurns           Float
  avgDurationMinutes Float

  // ── Outcomes ──
  avgOutcomeScore      Float?  // Surface-specific (score, mastery gain, etc.)
  outcomeImprovement   Float?  // Delta vs. non-Sandy users
  nudgeAcceptanceRate  Float?  // For proactive suggestions

  // ── Segmented ──
  byChronotype     Json?  // { "night-owl": { sessions: 40, avgScore: 78 }, ... }
  byCadence        Json?  // { "crammer": { sessions: 30, avgScore: 72 }, ... }
  byStudyMode      Json?  // Only for study-buddy surface

  @@unique([surface, period])
  @@index([surface, period])
}
```

---

## Service Architecture

### Discovery Engine: `app/lib/sandy-meta/discovery-engine.ts`

Runs a set of pre-defined analysis queries to discover correlations.

```typescript
export async function runDiscoveryPipeline(): Promise<DiscoveryResult> {
  const analyses = [
    analyzePreExamCoaching,
    analyzeStudyModeEffectiveness,
    analyzeNudgeImpact,
    analyzeFacultyToolCorrelations,
    analyzeChronotypeStudyFit,
    analyzeCollaborativeVsSolo,
    analyzeTimingPatterns,
    analyzeElevatedToolCompletion,
  ]

  const insights: SandyInsightDiscoveryData[] = []
  for (const analysis of analyses) {
    const result = await analysis()
    if (result && result.confidence >= 0.6 && result.sampleSize >= 20) {
      insights.push(result)
    }
  }

  // Persist new insights
  for (const insight of insights) {
    const existing = await prisma.sandyInsightDiscovery.findFirst({
      where: { title: insight.title, status: { not: 'retracted' } },
    })
    if (!existing) {
      await prisma.sandyInsightDiscovery.create({ data: insight })
    }
  }

  return { newInsights: insights.length }
}

// Example analysis: Pre-exam study coaching
async function analyzePreExamCoaching(): Promise<SandyInsightDiscoveryData | null> {
  // Segment A: students who had a study buddy session within 48h of an exam
  // Segment B: students who did not
  // Metric: exam score

  const examsWithScores = await prisma.submission.findMany({
    where: {
      assignment: { category: { in: ['EXAM', 'MIDTERM', 'FINAL', 'QUIZ'] } },
      score: { not: null },
    },
    select: {
      studentId: true,
      score: true,
      assignment: { select: { dueDate: true, courseId: true } },
      submittedAt: true,
    },
  })

  const segmentA: number[] = [] // Scores of students who used Sandy
  const segmentB: number[] = [] // Scores of students who didn't

  for (const exam of examsWithScores) {
    if (!exam.assignment.dueDate || exam.score == null) continue

    const windowStart = new Date(exam.assignment.dueDate.getTime() - 48 * 60 * 60 * 1000)
    const hadSandySession = await prisma.toolSession.count({
      where: {
        userId: exam.studentId,
        createdAt: { gte: windowStart, lte: exam.assignment.dueDate },
        metadata: { path: ['studyMode'], not: Prisma.DbNull },
      },
    })

    if (hadSandySession > 0) {
      segmentA.push(exam.score)
    } else {
      segmentB.push(exam.score)
    }
  }

  if (segmentA.length < 10 || segmentB.length < 10) return null

  const avgA = mean(segmentA)
  const avgB = mean(segmentB)
  const effectSize = cohensD(segmentA, segmentB)
  const improvement = ((avgA - avgB) / avgB) * 100

  if (Math.abs(improvement) < 5) return null // Not significant enough

  return {
    title: `Pre-exam Sandy coaching correlates with ${improvement.toFixed(0)}% higher scores`,
    description: `Students who used Study Buddy within 48 hours of an exam averaged ${avgA.toFixed(1)} vs. ${avgB.toFixed(1)} for non-users (n=${segmentA.length + segmentB.length}).`,
    insightType: 'correlation',
    category: 'study-effectiveness',
    sampleSize: segmentA.length + segmentB.length,
    effectSize,
    confidence: effectSize > 0.5 ? 0.85 : effectSize > 0.2 ? 0.7 : 0.6,
    methodology: 'cohort-comparison',
    segmentA: 'Students who used Sandy coaching within 48h of exam',
    segmentB: 'Students who did not',
    metricCompared: 'avg_score',
    segmentAValue: avgA,
    segmentBValue: avgB,
    recommendation: 'Sandy should proactively suggest study coaching when exams are within 48 hours',
    tags: ['study-buddy', 'pre-exam', 'coaching'],
  }
}

// Example: Study mode effectiveness by chronotype
async function analyzeChronotypeStudyFit(): Promise<SandyInsightDiscoveryData | null> {
  // For each chronotype, which study mode produces the highest scores?
  const fingerprints = await prisma.engagementFingerprint.findMany({
    select: { userId: true, chronotype: true, preferredStudyModes: true },
  })

  const results: Record<string, Record<string, { scores: number[]; count: number }>> = {}

  for (const fp of fingerprints) {
    const sessions = await prisma.toolSession.findMany({
      where: {
        userId: fp.userId,
        score: { not: null },
        metadata: { path: ['studyMode'], not: Prisma.DbNull },
      },
      select: { score: true, metadata: true },
    })

    for (const s of sessions) {
      const mode = (s.metadata as any)?.studyMode as string
      if (!mode) continue

      if (!results[fp.chronotype]) results[fp.chronotype] = {}
      if (!results[fp.chronotype][mode]) results[fp.chronotype][mode] = { scores: [], count: 0 }

      results[fp.chronotype][mode].scores.push(s.score!)
      results[fp.chronotype][mode].count++
    }
  }

  // Find the most striking chronotype-mode combination
  let bestInsight: SandyInsightDiscoveryData | null = null
  let bestEffect = 0

  for (const [chronotype, modes] of Object.entries(results)) {
    const modeAvgs = Object.entries(modes)
      .filter(([, v]) => v.count >= 10)
      .map(([mode, v]) => ({ mode, avg: mean(v.scores), count: v.count }))
      .sort((a, b) => b.avg - a.avg)

    if (modeAvgs.length >= 2) {
      const best = modeAvgs[0]
      const worst = modeAvgs[modeAvgs.length - 1]
      const delta = best.avg - worst.avg

      if (delta > bestEffect) {
        bestEffect = delta
        bestInsight = {
          title: `${chronotype}s score ${delta.toFixed(0)}% higher in ${best.mode} mode vs. ${worst.mode}`,
          description: `For ${chronotype} learners, ${best.mode} mode averages ${best.avg.toFixed(1)} vs. ${worst.avg.toFixed(1)} for ${worst.mode}.`,
          insightType: 'segment-difference',
          category: 'study-effectiveness',
          sampleSize: best.count + worst.count,
          effectSize: delta / 15, // Rough normalization
          confidence: 0.7,
          methodology: 'segment-analysis',
          segmentA: `${chronotype}s using ${best.mode}`,
          segmentB: `${chronotype}s using ${worst.mode}`,
          metricCompared: 'avg_score',
          segmentAValue: best.avg,
          segmentBValue: worst.avg,
          recommendation: `Sandy should suggest ${best.mode} mode to ${chronotype} learners`,
          tags: ['chronotype', 'study-mode', 'personalization'],
        }
      }
    }
  }

  return bestInsight
}
```

### Effectiveness Service: `app/lib/sandy-meta/effectiveness-service.ts`

```typescript
export async function computeWeeklyEffectiveness(): Promise<void> {
  const surfaces = [
    'study-buddy', 'concierge', 'elevated-tool', 'office-hours',
    'research-hub', 'campus-navigator', 'course-map-ta', 'uknow',
  ]
  const period = getCurrentISOWeek()

  for (const surface of surfaces) {
    const metrics = await computeSurfaceMetrics(surface, period)
    await prisma.sandyEffectivenessMetric.upsert({
      where: { surface_period: { surface, period } },
      create: { surface, period, ...metrics },
      update: { ...metrics, computedAt: new Date() },
    })
  }
}
```

---

## API Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/sandy-meta/insights` | GET | `requireAdminUser` | List discovered insights |
| `/api/sandy-meta/insights/[id]/verify` | POST | `requireAdminUser` | Admin verifies insight |
| `/api/sandy-meta/effectiveness` | GET | `requireAdminUser` | Weekly effectiveness metrics |
| `/api/sandy-meta/effectiveness/[surface]` | GET | `requireAdminUser` | Surface-specific deep dive |
| `/api/cron/sandy-meta-discovery` | POST | `verifyCronSecret` | Weekly discovery run |
| `/api/cron/sandy-meta-effectiveness` | POST | `verifyCronSecret` | Weekly effectiveness computation |

---

## UI: Sandy Intelligence Dashboard

New page at `/admin/sandy-intelligence`:

```
┌──────────────────────────────────────────────────────────────────┐
│  SANDY INTELLIGENCE — What Actually Works                         │
│                                                                    │
│  ┌─ TOP DISCOVERIES ────────────────────────────────────────┐    │
│  │ ⭐ Pre-exam coaching → +15% scores (n=340, d=0.62)      │    │
│  │    Students using Sandy 48h before exams score higher    │    │
│  │    [Verify] [Implement] [Details]                        │    │
│  │                                                          │    │
│  │ ⭐ Night-owls: Flashcard mode → +12% vs. Tutor mode     │    │
│  │    Chronotype-study mode fit matters (n=180)             │    │
│  │    [Verify] [Implement] [Details]                        │    │
│  │                                                          │    │
│  │ ⭐ Nudge responders: 2x mastery gain                    │    │
│  │    Students who act on Sandy nudges gain concepts faster │    │
│  │    [Verify] [Implement] [Details]                        │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─ SURFACE EFFECTIVENESS (This Week) ──────────────────────┐    │
│  │  Study Buddy     482 sessions  78.3 avg score  ↗ +3%   │    │
│  │  Concierge      1204 sessions   N/A            ↗ +8%   │    │
│  │  Elevated Tools  156 sessions  4.2★ avg rating → stable │    │
│  │  Office Hours    89 sessions   81.1 avg score  ↘ -2%   │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|---|---|
| `app/lib/sandy-meta/discovery-engine.ts` | 8+ analysis functions for pattern discovery |
| `app/lib/sandy-meta/effectiveness-service.ts` | Per-surface weekly metrics |
| `app/lib/sandy-meta/statistics.ts` | Mean, stdDev, Cohen's d, correlation helpers |
| `app/lib/sandy-meta/types.ts` | Shared types |
| `app/api/sandy-meta/insights/route.ts` | GET — list insights |
| `app/api/sandy-meta/insights/[id]/verify/route.ts` | POST — verify insight |
| `app/api/sandy-meta/effectiveness/route.ts` | GET — all surfaces |
| `app/api/sandy-meta/effectiveness/[surface]/route.ts` | GET — single surface |
| `app/api/cron/sandy-meta-discovery/route.ts` | POST — weekly discovery |
| `app/api/cron/sandy-meta-effectiveness/route.ts` | POST — weekly effectiveness |
| `app/admin/sandy-intelligence/page.tsx` | Dashboard page |
| `app/components/sandy-meta/InsightCard.tsx` | Discovery card with stats |
| `app/components/sandy-meta/EffectivenessTable.tsx` | Surface metrics table |
| `app/components/sandy-meta/DiscoveryChart.tsx` | Segment comparison chart |

## Files to Modify

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `SandyInsightDiscovery`, `SandyEffectivenessMetric` models |
| `app/components/Header.tsx` | Add admin nav link |

---

## Migration Path

1. **Sprint 1**: Schema + effectiveness service + discovery engine (4 analyses) + API routes + effectiveness table
2. **Sprint 2**: Full discovery pipeline (8 analyses) + insight dashboard + verify/implement workflow + Sandy auto-tuning from verified insights

---

## Success Criteria

1. **Discoveries are real.** At least 3 statistically backed insights discovered from platform data.
2. **Insights drive behavior.** A verified insight ("night-owls score better with flashcards") gets wired into Sandy's mode suggestions — closing the loop.
3. **Research value.** The insights are publishable — a university could write a paper on "AI Assistant Usage Patterns and Academic Outcomes."
4. **The system improves itself.** Sandy's recommendations get better over time because the meta-intelligence feeds back into her behavior.
