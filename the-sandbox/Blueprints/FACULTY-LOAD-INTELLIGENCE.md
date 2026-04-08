# Blueprint: Faculty Load Intelligence — Holistic Faculty Strain Detection

> **Sprint Scope:** Cross-reference course health, committee workload, email urgency, advisee count, AI literacy stance, lecture debrief sentiment, and recommendation letter queues to detect faculty approaching burnout. Surface intelligence to department chairs and Sandy for proactive support.
> **Depends On:** Engagement Fingerprint (Blueprint 9) for behavioral baselines. Email Intelligence (complete). Committee system (complete).
> **Estimated Size:** Medium (2 sprints)
> **Deploy Order:** 6 of 10 (Cross-Data Series)
> **Patent Relevance:** MEDIUM — "Multi-signal faculty workload intelligence for proactive institutional support"

---

## Context

Faculty burnout is invisible in traditional systems. A professor with declining lecture debrief sentiment + rising email urgency + 4 pending rec letters + 3 committee assignments is approaching a breaking point, but no single system shows the full picture. Faculty Load Intelligence synthesizes 9 workload signals into a holistic strain index.

### Signal Sources (All Existing)

| Signal | Source | Weight |
|---|---|---|
| **Course load** | `Course` (count, enrollment totals) | 0.15 |
| **Course health** | Course analytics (at-risk student count, avg engagement) | 0.15 |
| **Committee workload** | `Committee`, `CommitteeActionItem` (count, overdue items) | 0.10 |
| **Email urgency** | `AssistantEmail` (respond-today volume, total volume) | 0.15 |
| **Advisee load** | `FacultyAdvisee` (count, at-risk advisees) | 0.10 |
| **Rec letter queue** | `RecommendationRequest` (pending count, overdue count) | 0.10 |
| **Lecture debrief sentiment** | `LectureDebrief` (sentiment trend over last 4 debriefs) | 0.10 |
| **Assessment deadlines** | `AssessmentDeadline` (upcoming grading load in next 14 days) | 0.10 |
| **Platform engagement** | `ToolSession` (faculty's own tool usage decline = signal) | 0.05 |

---

## Schema Changes

### New Model: `FacultyLoadProfile`

```prisma
model FacultyLoadProfile {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  computedAt  DateTime @default(now())

  // ── Load Dimensions ──
  courseCount          Int
  totalStudents        Int
  atRiskStudentCount   Int
  committeeCount       Int
  overdueActionItems   Int
  urgentEmailCount     Int     // respond-today bucket in last 7 days
  totalEmailVolume     Int     // all emails in last 7 days
  adviseeCount         Int
  atRiskAdvisees       Int
  pendingRecLetters    Int
  overdueRecLetters    Int
  upcomingDeadlines    Int     // Assessment deadlines in next 14 days
  debriefSentimentTrend String // "improving" | "stable" | "declining" | "no-data"

  // ── Composite Scores ──
  strainIndex         Float   // 0-1: composite workload strain
  strainLevel         String  // "low" | "moderate" | "elevated" | "high" | "critical"
  strainTrend         String  // "improving" | "stable" | "worsening"
  topStressors        String[] // Top 3 contributing factors

  // ── Meta ──
  confidence          Float   // 0-1: data completeness
  weeklyTrend         Float[] // Last 4 weeks of strain indices (sparkline)

  @@unique([userId])
  @@index([strainLevel])
}
```

---

## Service Architecture

### Load Engine: `app/lib/faculty-load/load-engine.ts`

```typescript
export async function computeFacultyLoad(userId: string): Promise<FacultyLoadData> {
  const now = new Date()
  const weekAgo = daysAgo(7)
  const twoWeeksAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const [
    courses, committees, emails, advisees,
    recLetters, debriefs, deadlines, engagement,
  ] = await Promise.all([
    fetchCourseLoad(userId),
    fetchCommitteeLoad(userId),
    fetchEmailLoad(userId, weekAgo),
    fetchAdviseeLoad(userId),
    fetchRecLetterLoad(userId),
    fetchDebriefSentiment(userId),
    fetchUpcomingDeadlines(userId, twoWeeksAhead),
    fetchEngagementTrend(userId, weekAgo),
  ])

  // Normalize each dimension to 0-1
  const signals = {
    courseLoad: normalize(courses.totalStudents, 0, 200), // 200+ students = max
    courseHealth: normalize(courses.atRiskCount, 0, 10),   // 10+ at-risk = max
    committeeLoad: normalize(committees.count + committees.overdueItems * 2, 0, 10),
    emailStress: normalize(emails.urgentCount, 0, 20),     // 20+ urgent/week = max
    adviseeLoad: normalize(advisees.count + advisees.atRisk * 3, 0, 30),
    recLetterLoad: normalize(recLetters.pending + recLetters.overdue * 3, 0, 10),
    debriefDecline: debriefs.trend === 'declining' ? 0.8 : debriefs.trend === 'stable' ? 0.3 : 0.1,
    deadlinePressure: normalize(deadlines.count, 0, 8),   // 8+ deadlines in 2 weeks = max
    engagementDrop: engagement.declining ? 0.6 : 0.1,
  }

  // Weighted composite
  const weights = { courseLoad: 0.15, courseHealth: 0.15, committeeLoad: 0.10, emailStress: 0.15, adviseeLoad: 0.10, recLetterLoad: 0.10, debriefDecline: 0.10, deadlinePressure: 0.10, engagementDrop: 0.05 }

  const strainIndex = Object.entries(signals).reduce(
    (sum, [key, value]) => sum + value * (weights[key as keyof typeof weights] || 0), 0
  )

  // Top stressors
  const sorted = Object.entries(signals).sort((a, b) => b[1] - a[1])
  const topStressors = sorted.slice(0, 3).map(([key]) => formatStressorLabel(key))

  // Classify
  const strainLevel = classifyStrain(strainIndex)
  const strainTrend = await computeStrainTrend(userId, strainIndex)

  return {
    courseCount: courses.count,
    totalStudents: courses.totalStudents,
    atRiskStudentCount: courses.atRiskCount,
    committeeCount: committees.count,
    overdueActionItems: committees.overdueItems,
    urgentEmailCount: emails.urgentCount,
    totalEmailVolume: emails.totalCount,
    adviseeCount: advisees.count,
    atRiskAdvisees: advisees.atRisk,
    pendingRecLetters: recLetters.pending,
    overdueRecLetters: recLetters.overdue,
    upcomingDeadlines: deadlines.count,
    debriefSentimentTrend: debriefs.trend,
    strainIndex,
    strainLevel,
    strainTrend,
    topStressors,
    confidence: computeConfidence(signals),
  }
}

function classifyStrain(index: number): string {
  if (index >= 0.8) return 'critical'
  if (index >= 0.65) return 'high'
  if (index >= 0.45) return 'elevated'
  if (index >= 0.25) return 'moderate'
  return 'low'
}
```

### Faculty Load Service: `app/lib/faculty-load/load-service.ts`

```typescript
export async function getFacultyLoad(userId: string): Promise<FacultyLoadProfile> {
  const existing = await prisma.facultyLoadProfile.findUnique({ where: { userId } })
  if (existing && !isStale(existing.computedAt, 24)) return existing

  return refreshFacultyLoad(userId)
}

export async function getDepartmentLoadOverview(): Promise<DepartmentLoadOverview> {
  const profiles = await prisma.facultyLoadProfile.findMany({
    include: { user: { select: { name: true, email: true, role: true } } },
    where: { user: { role: 'EDUCATOR' } },
    orderBy: { strainIndex: 'desc' },
  })

  return {
    faculty: profiles.map(p => ({
      name: p.user.name,
      email: p.user.email,
      strainLevel: p.strainLevel,
      strainIndex: p.strainIndex,
      topStressors: p.topStressors,
      courses: p.courseCount,
      students: p.totalStudents,
    })),
    avgStrain: profiles.reduce((sum, p) => sum + p.strainIndex, 0) / (profiles.length || 1),
    criticalCount: profiles.filter(p => p.strainLevel === 'critical').length,
    highCount: profiles.filter(p => p.strainLevel === 'high').length,
  }
}
```

---

## API Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/faculty-load/me` | GET | `requireRequestUser` | Faculty views own load profile |
| `/api/faculty-load/department` | GET | `requireAdminUser` | Admin views all faculty loads |
| `/api/faculty-load/sandy-context` | GET | `requireRequestUser` | Sandy reads faculty load for context |
| `/api/cron/faculty-load-refresh` | POST | `verifyCronSecret` | Nightly refresh |

---

## UI Components

### Faculty Self-View: Load Dashboard Card

On the faculty homepage or analytics page:

```
┌──────────────────────────────────────────┐
│  MY WORKLOAD PULSE              Moderate  │
│  ▁▂▃▃▂ ← 4-week trend                   │
│                                           │
│  📚 3 courses · 87 students              │
│  📧 12 urgent emails this week           │
│  📝 2 pending rec letters                │
│  📅 4 deadlines in next 2 weeks          │
│                                           │
│  Top stressors: Email volume, Grading    │
│  Sandy tip: "Consider batch-grading      │
│  Thursday morning when email is lighter." │
└──────────────────────────────────────────┘
```

### Admin Department Overview

```
┌──────────────────────────────────────────────────────────┐
│  FACULTY WORKLOAD — DEPARTMENT OVERVIEW                   │
│                                                           │
│  Avg Strain: 0.42 (Moderate)  🔴 1 Critical  🟠 2 High  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Dr. Smith       ████████░░  0.72 HIGH               │ │
│  │   Email volume + 5 at-risk students + 3 rec letters │ │
│  │                                                     │ │
│  │ Dr. Johnson     ████░░░░░░  0.38 MODERATE           │ │
│  │   Committee deadlines + grading pressure            │ │
│  │                                                     │ │
│  │ Dr. Williams    ██░░░░░░░░  0.21 LOW                │ │
│  │   Balanced load                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  💡 SANDY: "Consider redistributing Dr. Smith's          │
│     committee assignments this month."                    │
└──────────────────────────────────────────────────────────┘
```

---

## Sandy Integration

```typescript
// Sandy tool: get_faculty_load
{
  name: 'get_faculty_load',
  description: 'Check the current workload profile for a faculty member, including strain level, top stressors, and Sandy recommendations.',
  parameters: {
    type: 'object',
    properties: {
      facultyId: { type: 'string', description: 'Optional: specific faculty ID (admin only)' }
    }
  },
  permission: 'auto',
  handler: async ({ facultyId }, context) => {
    const targetId = facultyId || context.userId
    if (facultyId && context.userRole !== 'ADMIN') {
      return { is_error: true, message: 'Only admins can view other faculty loads.' }
    }
    const load = await getFacultyLoad(targetId)
    return {
      strainLevel: load.strainLevel,
      strainIndex: load.strainIndex,
      topStressors: load.topStressors,
      courses: load.courseCount,
      students: load.totalStudents,
      urgentEmails: load.urgentEmailCount,
      pendingRecs: load.pendingRecLetters,
      upcomingDeadlines: load.upcomingDeadlines,
      trend: load.strainTrend,
    }
  }
}
```

Sandy system prompt injection for faculty context:

```typescript
// In concierge-service.ts
async function buildFacultyLoadBlock(userId: string): Promise<string> {
  const load = await getFacultyLoad(userId)
  if (!load || load.strainLevel === 'low') return ''

  return `
<faculty-workload strain="${load.strainLevel}">
This faculty member's workload strain is ${load.strainLevel} (${(load.strainIndex * 100).toFixed(0)}%).
Top stressors: ${load.topStressors.join(', ')}.
${load.strainLevel === 'critical' ? 'IMPORTANT: Be extra helpful, offer to prioritize tasks, and suggest delegation.' : ''}
${load.strainLevel === 'high' ? 'Be proactive about helping them batch or triage their work.' : ''}
</faculty-workload>
`
}
```

---

## Files to Create

| File | Purpose |
|---|---|
| `app/lib/faculty-load/load-engine.ts` | Multi-signal strain computation |
| `app/lib/faculty-load/load-service.ts` | Read/cache/refresh faculty loads |
| `app/lib/faculty-load/data-fetchers.ts` | Prisma query wrappers for each signal |
| `app/lib/faculty-load/types.ts` | Shared types |
| `app/api/faculty-load/me/route.ts` | GET — self-view |
| `app/api/faculty-load/department/route.ts` | GET — admin department overview |
| `app/api/faculty-load/sandy-context/route.ts` | GET — Sandy injection |
| `app/api/cron/faculty-load-refresh/route.ts` | POST — nightly refresh |
| `app/components/faculty-load/LoadDashboardCard.tsx` | Faculty self-view card |
| `app/components/faculty-load/DepartmentLoadOverview.tsx` | Admin department view |
| `app/components/faculty-load/StrainBar.tsx` | Horizontal strain meter |
| `app/components/faculty-load/StressorList.tsx` | Top stressors with icons |

## Files to Modify

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `FacultyLoadProfile` model |
| `app/lib/concierge-service.ts` | Inject faculty load context for educator users |
| `app/lib/agent/tools/faculty-tools.ts` | Add `get_faculty_load` tool |
| `app/lib/agent/tool-registry.ts` | Register new tool |
| `app/analytics/faculty/page.tsx` | Add load dashboard card |
| `app/admin/page.tsx` | Add department load overview widget |

---

## Privacy

- Faculty see only their own load profile (unless admin)
- Admin sees department overview — no raw email content, only counts
- Sandy adapts tone based on strain level — never reveals the metric to the faculty member unprompted
- No data shared with students — purely administrative intelligence

---

## Cron Schedule

| Job | Schedule | Route |
|---|---|---|
| Faculty load refresh | Nightly 5 AM ET | `POST /api/cron/faculty-load-refresh` |

---

## Migration Path

1. **Sprint 1**: Schema + load engine + data fetchers + service + cron + `/api/faculty-load/me` + self-view card
2. **Sprint 2**: Admin department overview + Sandy integration (system prompt + tool) + notification for critical strain

---

## Success Criteria

1. **Invisible strain becomes visible.** A department chair sees that Dr. Smith is at "critical" strain — something no existing system could surface.
2. **Sandy adapts.** When Katie (educator at high strain) asks Sandy for help, Sandy proactively offers to prioritize her tasks and suggest delegation.
3. **Actionable.** The top stressors list tells the admin *exactly* what to redistribute — not just "they're busy" but "email volume + 5 at-risk students + 3 overdue rec letters."
