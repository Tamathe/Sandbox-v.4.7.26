# Blueprint: Student Journey Genome — Holistic Learner Timeline

> **Status:** SPRINT 1 COMPLETE (2026-04-04) — Schema, snapshot engine, milestone detector, cron, API routes, journey page, Sandy tool. Integration merge pending (Header nav + registrar drawer tab).
> **Sprint Scope:** Build a comprehensive, visual timeline of a student's entire university experience — not just grades, but study patterns, wellness arcs, social engagement, concept mastery evolution, Sandy interactions, and campus involvement. Give advisors the story, not just the transcript.
> **Depends On:** Engagement Fingerprint (Blueprint 9) for behavioral classification. Can launch independently with reduced richness.
> **Estimated Size:** Large (3 sprints)
> **Deploy Order:** 5 of 10 (Cross-Data Series)
> **Patent Relevance:** HIGH — "Holistic multi-dimensional learner journey synthesis for adaptive academic advising"

---

## Context

Academic advisors currently see transcripts: courses, grades, GPA. This tells them *what happened* but not *how* or *why*. The Student Journey Genome weaves every platform signal into a single temporal narrative:

- When did the student's engagement shift?
- What study mode drove their breakthrough in organic chemistry?
- Did their wellness entries correlate with their mid-semester grade dip?
- How did joining a study group change their social trajectory?
- What does Sandy know about this student that the transcript doesn't show?

### Data Layers (All Existing)

| Layer | Source | Timeline Contribution |
|---|---|---|
| **Academic** | `CourseEnrollment`, `GradebookEntry`, `Submission` | Enrollment arcs, grades, submission patterns |
| **Mastery** | `StudentConceptMastery`, `ConceptState` | Concept mastery curves over time |
| **Study** | `ToolSession`, `FlashcardState` | Session frequency, mode evolution, retention curves |
| **Social** | `ChatMembership`, `StudyGroupMember`, `LiveRoomParticipant` | Group joins, room participation, messaging arcs |
| **Wellness** | `WellnessEntry` (count only, not content) | Engagement frequency as proxy for self-care attention |
| **Campus** | `CampusEvent` attendance, `Organization` membership | Campus involvement timeline |
| **Sandy** | `SandyExecutionTrace`, `UserMemory` | Key Sandy interactions, saved insights |
| **Milestones** | `StudentMilestone`, `CourseMilestone` | Tracked achievements and completions |
| **Interventions** | `InterventionLog` | When help was offered and whether accepted |
| **Fingerprint** | `EngagementFingerprint` | Behavioral classification snapshots over time |

---

## Schema Changes

### New Model: `JourneySnapshot`

Periodic snapshots that form the timeline backbone. Computed weekly.

```prisma
model JourneySnapshot {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  weekOf      DateTime // Monday of the snapshot week

  // ── Academic ──
  activeCoursesCount  Int
  avgGrade            Float?
  submissionsOnTime   Int
  submissionsLate     Int

  // ── Learning ──
  studySessions       Int
  avgSessionMinutes   Float
  flashcardsReviewed  Int
  conceptsGained      Int     // Concepts that crossed proficiency threshold
  topStudyMode        String?

  // ── Social ──
  messagesSent        Int
  liveRoomsJoined     Int
  studyGroupsActive   Int

  // ── Engagement ──
  totalPlatformMinutes  Float
  uniqueToolsUsed       Int
  sandyInteractions     Int
  nudgesActedOn         Int
  nudgesReceived        Int

  // ── Wellness ──
  wellnessEntryCount    Int   // Frequency only, not content

  // ── Campus ──
  eventsAttended        Int
  orgsActive            Int

  // ── Derived ──
  engagementScore       Float  // 0-1 composite
  trajectoryLabel       String // "ascending" | "stable" | "dipping" | "recovering" | "declining"

  @@unique([userId, weekOf])
  @@index([userId, weekOf])
}
```

### New Model: `JourneyMilestone`

Significant moments detected in the journey — inflection points, breakthroughs, struggles.

```prisma
model JourneyMilestone {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  occurredAt  DateTime

  type        String   // "breakthrough" | "struggle-start" | "recovery" | "engagement-shift" | "social-expansion" | "milestone-reached" | "intervention-success"
  title       String   // "Mastered Organic Chemistry Fundamentals"
  description String   // "After 3 weeks of declining mastery, concept proficiency jumped from 0.3 to 0.8 following 12 flashcard sessions"
  layer       String   // "academic" | "mastery" | "study" | "social" | "wellness" | "campus"

  relatedCourseId  String?
  relatedConcept   String?
  significance     Float    // 0-1: how notable is this milestone

  @@index([userId, occurredAt])
  @@index([type])
}
```

---

## Service Architecture

### Snapshot Engine: `app/lib/journey/snapshot-engine.ts`

```typescript
export async function computeWeeklySnapshot(userId: string, weekOf: Date): Promise<JourneySnapshotData> {
  const weekStart = startOfWeek(weekOf)
  const weekEnd = endOfWeek(weekOf)

  const [
    sessions, flashcards, concepts, messages, liveRooms,
    studyGroups, submissions, grades, sandyTraces,
    interventions, wellness, events, orgs,
  ] = await Promise.all([
    prisma.toolSession.count({ where: { userId, createdAt: { gte: weekStart, lte: weekEnd } } }),
    prisma.flashcardState.count({ where: { userId, lastReviewedAt: { gte: weekStart, lte: weekEnd } } }),
    countConceptGains(userId, weekStart, weekEnd),
    prisma.channelMessage.count({ where: { authorId: userId, createdAt: { gte: weekStart, lte: weekEnd } } }),
    prisma.liveRoomParticipant.count({ where: { userId, joinedAt: { gte: weekStart, lte: weekEnd } } }),
    prisma.studyGroupMember.count({ where: { userId } }),
    countSubmissions(userId, weekStart, weekEnd),
    getAvgGrade(userId, weekStart, weekEnd),
    prisma.sandyExecutionTrace.count({ where: { userId, createdAt: { gte: weekStart, lte: weekEnd } } }),
    countInterventions(userId, weekStart, weekEnd),
    prisma.wellnessEntry.count({ where: { userId, createdAt: { gte: weekStart, lte: weekEnd } } }),
    countEventsAttended(userId, weekStart, weekEnd),
    prisma.organization.count({ where: { members: { some: { userId } } } }),
  ])

  const sessionDurations = await prisma.toolSession.aggregate({
    where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
    _avg: { durationMinutes: true },
    _sum: { durationMinutes: true },
  })

  const topMode = await getTopStudyMode(userId, weekStart, weekEnd)
  const engagementScore = computeEngagementScore(sessions, messages, liveRooms, flashcards)
  const trajectoryLabel = await computeTrajectory(userId, weekOf, engagementScore)

  return {
    userId,
    weekOf: weekStart,
    activeCoursesCount: await prisma.courseEnrollment.count({ where: { userId, role: 'STUDENT' } }),
    avgGrade: grades,
    submissionsOnTime: submissions.onTime,
    submissionsLate: submissions.late,
    studySessions: sessions,
    avgSessionMinutes: sessionDurations._avg?.durationMinutes || 0,
    flashcardsReviewed: flashcards,
    conceptsGained: concepts,
    topStudyMode: topMode,
    messagesSent: messages,
    liveRoomsJoined: liveRooms,
    studyGroupsActive: studyGroups,
    totalPlatformMinutes: sessionDurations._sum?.durationMinutes || 0,
    uniqueToolsUsed: await countUniqueTools(userId, weekStart, weekEnd),
    sandyInteractions: sandyTraces,
    nudgesActedOn: interventions.actedOn,
    nudgesReceived: interventions.total,
    wellnessEntryCount: wellness,
    eventsAttended: events,
    orgsActive: orgs,
    engagementScore,
    trajectoryLabel,
  }
}

function computeTrajectory(
  userId: string,
  currentWeek: Date,
  currentScore: number
): string {
  // Compare to previous 2 weeks
  // ascending: current > prev > prevPrev
  // recovering: current > prev but prev < prevPrev
  // dipping: current < prev but prev > prevPrev
  // declining: current < prev < prevPrev
  // stable: within 10% variance
  // (Implementation reads prior JourneySnapshots)
}
```

### Milestone Detector: `app/lib/journey/milestone-detector.ts`

```typescript
export async function detectMilestones(userId: string, weekOf: Date): Promise<JourneyMilestoneData[]> {
  const milestones: JourneyMilestoneData[] = []
  const weekStart = startOfWeek(weekOf)
  const weekEnd = endOfWeek(weekOf)

  // Breakthrough: concept proficiency jumped > 0.3 in one week
  const masteryJumps = await findMasteryJumps(userId, weekStart, weekEnd)
  for (const jump of masteryJumps) {
    milestones.push({
      type: 'breakthrough',
      title: `Mastered ${jump.concept}`,
      description: `Proficiency jumped from ${(jump.from * 100).toFixed(0)}% to ${(jump.to * 100).toFixed(0)}% this week`,
      layer: 'mastery',
      relatedConcept: jump.concept,
      significance: jump.delta,
      occurredAt: jump.date,
    })
  }

  // Engagement shift: weekly engagement score changed > 0.2
  const prevSnapshot = await getPreviousSnapshot(userId, weekOf)
  const currentSnapshot = await prisma.journeySnapshot.findUnique({
    where: { userId_weekOf: { userId, weekOf: weekStart } },
  })
  if (prevSnapshot && currentSnapshot) {
    const delta = currentSnapshot.engagementScore - prevSnapshot.engagementScore
    if (Math.abs(delta) > 0.2) {
      milestones.push({
        type: delta > 0 ? 'engagement-shift' : 'struggle-start',
        title: delta > 0 ? 'Engagement surge' : 'Engagement dip',
        description: `Weekly engagement ${delta > 0 ? 'increased' : 'decreased'} by ${(Math.abs(delta) * 100).toFixed(0)}%`,
        layer: delta > 0 ? 'study' : 'academic',
        significance: Math.abs(delta),
        occurredAt: weekEnd,
      })
    }
  }

  // Social expansion: joined first study group or live room
  const firstGroup = await detectFirstTimeEvents(userId, weekStart, weekEnd)
  for (const event of firstGroup) {
    milestones.push({
      type: 'social-expansion',
      title: event.title,
      description: event.description,
      layer: 'social',
      significance: 0.7,
      occurredAt: event.date,
    })
  }

  // Intervention success: nudge accepted + subsequent improvement
  const successfulInterventions = await findSuccessfulInterventions(userId, weekStart, weekEnd)
  for (const intervention of successfulInterventions) {
    milestones.push({
      type: 'intervention-success',
      title: 'Help accepted — improvement followed',
      description: intervention.description,
      layer: 'academic',
      significance: 0.8,
      occurredAt: intervention.date,
    })
  }

  return milestones
}
```

### Journey Service: `app/lib/journey/journey-service.ts`

```typescript
export async function getStudentJourney(
  userId: string,
  options?: { weeks?: number; layer?: string }
): Promise<StudentJourney> {
  const weeks = options?.weeks || 16 // One semester default
  const since = weeksAgo(weeks)

  const [snapshots, milestones, fingerprint] = await Promise.all([
    prisma.journeySnapshot.findMany({
      where: { userId, weekOf: { gte: since } },
      orderBy: { weekOf: 'asc' },
    }),
    prisma.journeyMilestone.findMany({
      where: {
        userId,
        occurredAt: { gte: since },
        ...(options?.layer && { layer: options.layer }),
      },
      orderBy: { occurredAt: 'asc' },
    }),
    prisma.engagementFingerprint.findUnique({ where: { userId } }),
  ])

  // Generate AI narrative summary
  const narrative = await generateJourneyNarrative(snapshots, milestones, fingerprint)

  return {
    userId,
    timeRange: { from: since, to: new Date() },
    snapshots,
    milestones,
    fingerprint: fingerprint ? {
      chronotype: fingerprint.chronotype,
      cadence: fingerprint.sessionCadence,
      socialOrientation: fingerprint.socialOrientation,
      learningVelocity: fingerprint.learningVelocity,
    } : null,
    narrative,
    currentTrajectory: snapshots.length > 0
      ? snapshots[snapshots.length - 1].trajectoryLabel
      : 'insufficient-data',
  }
}

async function generateJourneyNarrative(
  snapshots: JourneySnapshot[],
  milestones: JourneyMilestone[],
  fingerprint: EngagementFingerprint | null
): Promise<string> {
  if (snapshots.length < 2) return 'Insufficient data for a journey narrative. Keep using the platform!'

  const anthropic = new Anthropic()
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: `You are an academic advisor summarizing a student's learning journey. Write a 3-4 sentence narrative that highlights trajectory, inflection points, and strengths. Be encouraging but honest. Do not mention specific scores or metrics — speak in terms of patterns and growth.`,
    messages: [{
      role: 'user',
      content: JSON.stringify({
        weeksOfData: snapshots.length,
        trajectoryArc: snapshots.map(s => s.trajectoryLabel),
        engagementArc: snapshots.map(s => s.engagementScore),
        milestoneCount: milestones.length,
        milestonesTypes: milestones.map(m => m.type),
        fingerprint: fingerprint ? {
          chronotype: fingerprint.chronotype,
          cadence: fingerprint.sessionCadence,
          socialOrientation: fingerprint.socialOrientation,
        } : null,
      }),
    }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : 'Journey data available.'
}
```

---

## API Routes

### GET `/api/journey/me`

Student views their own journey.

```typescript
// app/api/journey/me/route.ts
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const weeks = parseInt(req.nextUrl.searchParams.get('weeks') || '16')
  const layer = req.nextUrl.searchParams.get('layer') || undefined

  const journey = await getStudentJourney(auth.user.id, { weeks, layer })
  return NextResponse.json(journey)
})
```

### GET `/api/journey/student/[studentId]`

Advisor/faculty views a student's journey (FERPA-scoped).

```typescript
// app/api/journey/student/[studentId]/route.ts
export const GET = withErrorHandling(async (req: NextRequest, { params }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { studentId } = await params

  // Verify advisor has access to this student
  const hasAccess = await verifyAdvisorAccess(auth.user.id, studentId)
  if (!hasAccess && auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorized to view this student journey' }, { status: 403 })
  }

  const journey = await getStudentJourney(studentId)
  return NextResponse.json(journey)
})
```

### POST `/api/cron/journey-snapshots`

Weekly snapshot computation for all active students.

```typescript
// app/api/cron/journey-snapshots/route.ts
export const POST = withErrorHandling(async (req: NextRequest) => {
  const cronAuth = verifyCronSecret(req)
  if (cronAuth) return cronAuth

  const result = await computeAllWeeklySnapshots()
  return NextResponse.json(result)
})
```

---

## UI Components

### Journey Timeline Page: `/my-profile/journey`

Multi-layer timeline visualization using recharts.

```
┌──────────────────────────────────────────────────────────────────┐
│  MY LEARNING JOURNEY                                     16 weeks│
│                                                                    │
│  "You've shown steady growth this semester, with a notable        │
│   breakthrough in organic chemistry after shifting to flashcard   │
│   mode. Your social engagement expanded in week 8 when you       │
│   joined your first study group."                                 │
│                                                                    │
│  ┌─ ENGAGEMENT ──────────────────────────────────────────────┐   │
│  │  ▁▂▃▃▄▅▅▆▅▆▇▇███ ← ascending                            │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌─ MILESTONES ──────────────────────────────────────────────┐   │
│  │  W3: 🎯 Mastered "Cell Biology Fundamentals"              │   │
│  │  W5: ⚠️  Engagement dip (-22%)                            │   │
│  │  W6: 🌉 Found flashcards from BIO 200 (concept bridge)   │   │
│  │  W7: 🎯 Mastered "Organic Chemistry Reactions"            │   │
│  │  W8: 👥 Joined first study group                          │   │
│  │  W11: 🔥 Engagement surge (+35%)                          │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                    │
│  [Academic] [Mastery] [Study] [Social] [Wellness] [Campus]       │
│  ← Layer filter tabs                                               │
│                                                                    │
│  ┌─ WEEKLY BREAKDOWN ────────────────────────────────────────┐   │
│  │  📚 Study: 12 sessions/wk · Flashcards · 28 min avg      │   │
│  │  💬 Social: 45 messages · 2 live rooms · 1 study group    │   │
│  │  📊 Academic: 3 courses · 87% avg · 95% on-time          │   │
│  │  🧠 Mastery: 4 concepts gained · 78% retention           │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Advisor Journey Drawer

Extends the existing Student 360 Drawer (registrar) with a "Journey" tab:

```
┌─ STUDENT 360: Tiana The ─────────────────┐
│  [Overview] [Degree] [Journey] [Notes]   │
│                                           │
│  JOURNEY — Last 16 Weeks                  │
│                                           │
│  Trajectory: ↗ Ascending                  │
│  Fingerprint: Night-Owl · Sprint-Rester   │
│                                           │
│  "Tiana showed strong recovery after a    │
│   mid-semester dip..."                    │
│                                           │
│  [engagement sparkline chart]             │
│                                           │
│  KEY MILESTONES:                          │
│  • Mastered 8 concepts                    │
│  • 2 engagement shifts detected           │
│  • Joined study group (Week 8)            │
│  • 1 successful intervention              │
│                                           │
│  [View full journey →]                    │
└───────────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|---|---|
| `app/lib/journey/snapshot-engine.ts` | Weekly snapshot computation |
| `app/lib/journey/milestone-detector.ts` | Detect inflection points and breakthroughs |
| `app/lib/journey/journey-service.ts` | Read/query journey data + AI narrative |
| `app/lib/journey/types.ts` | Shared TypeScript types |
| `app/api/journey/me/route.ts` | GET — student views own journey |
| `app/api/journey/student/[studentId]/route.ts` | GET — advisor views student journey |
| `app/api/cron/journey-snapshots/route.ts` | POST — weekly snapshot cron |
| `app/my-profile/journey/page.tsx` | Full journey timeline page |
| `app/components/journey/JourneyTimeline.tsx` | Multi-layer timeline (recharts) |
| `app/components/journey/MilestoneList.tsx` | Milestone cards with icons |
| `app/components/journey/JourneyNarrative.tsx` | AI-generated narrative card |
| `app/components/journey/EngagementSparkline.tsx` | Compact sparkline for drawer/cards |
| `app/components/journey/LayerFilterTabs.tsx` | Academic/Mastery/Study/Social/Wellness/Campus tabs |
| `app/components/journey/WeeklyBreakdown.tsx` | Expandable weekly detail panel |

## Files to Modify

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `JourneySnapshot`, `JourneyMilestone` models |
| `app/components/registrar/Student360Drawer.tsx` | Add "Journey" tab |
| `app/components/Header.tsx` | Add "My Journey" to student nav |
| `app/lib/agent/tools/faculty-tools.ts` | Add `get_student_journey` tool |

---

## Privacy & FERPA

| Concern | Mitigation |
|---|---|
| **Wellness data** | Only entry count (frequency) — never content. Proxy signal only. |
| **Advisor access** | Faculty see journey only for students in their courses/advisee list |
| **Student ownership** | Students see their full journey; can request deletion |
| **Narrative generation** | Haiku sees aggregate metrics, never raw personal content |
| **Sensitive sessions** | Excluded from journey snapshots (existing convention) |

---

## Cron Schedule

| Job | Schedule | Route |
|---|---|---|
| Journey snapshots | Weekly, Sunday 2 AM ET | `POST /api/cron/journey-snapshots` |

---

## Migration Path

1. **Sprint 1**: Schema + snapshot engine + milestone detector + cron + `/api/journey/me` + basic journey timeline page
2. **Sprint 2**: AI narrative + advisor journey drawer + Student 360 integration + faculty tool
3. **Sprint 3**: Full timeline visualization (recharts) + layer filters + weekly breakdown + homepage sparkline widget

---

## Success Criteria

1. **The story emerges.** An advisor reads Tiana's journey narrative and understands her semester arc in 10 seconds — something a transcript could never convey.
2. **Milestones resonate.** Students see "Mastered Organic Chemistry Fundamentals" on their timeline and feel recognized.
3. **Interventions are visible.** The journey shows when help was offered and whether it worked — closing the loop on the proactive agency pillar.
4. **Self-awareness.** Students viewing their own journey gain metacognitive insight: "I didn't realize I study best in sprints."
