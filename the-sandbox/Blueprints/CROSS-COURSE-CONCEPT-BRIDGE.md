# Blueprint: Cross-Course Concept Bridge — Knowledge Without Borders

> **Sprint Scope:** When a student struggles with a concept in one course, connect them to resources, flashcards, study groups, and peers from other courses that teach the same concept. Break department silos so knowledge flows freely across the curriculum.
> **Depends On:** Concept mastery system (complete), Study Buddy (complete), Study Match (complete). Engagement Fingerprint (Blueprint 9) for collaboration preference.
> **Estimated Size:** Medium (2 sprints)
> **Deploy Order:** 4 of 10 (Cross-Data Series)
> **Patent Relevance:** HIGH — "Cross-curricular concept graph traversal for adaptive resource bridging in higher education"

---

## Context

The platform already tracks concept mastery per student per course (`StudentConceptMastery`, `ConceptState`, `ConceptPrerequisite`). But this graph is course-scoped. A student struggling with "statistical inference" in PSY 301 doesn't know that STAT 200 has excellent flashcards for the same concept, or that 5 students in STAT 200 mastered it last week and might be great study partners.

The Cross-Course Concept Bridge builds a **concept equivalence layer** on top of the existing concept graph, linking identical or overlapping concepts across courses. When a student struggles, the system traverses this layer to find help from anywhere in the university.

### What Gets Bridged

| Resource Type | Source | Cross-Course Value |
|---|---|---|
| **Flashcards** | `FlashcardState` | Cards created for STAT 200's "confidence intervals" work for PSY 301's "confidence intervals" |
| **Study groups** | `StudyGroup`, `StudyMatch` | A study group focused on regression analysis is relevant to any course teaching regression |
| **Course materials** | `CourseMaterial`, `DocumentChunk` | A lecture PDF on "normal distribution" from STAT 200 helps a BIO student struggling with biostatistics |
| **Peer experts** | `StudentConceptMastery` | Students who recently mastered a concept are ideal tutors — regardless of which course they learned it in |
| **Study sessions** | `ToolSession` | "12 students used Flashcard mode for statistical inference last week" — social proof across courses |
| **Live Rooms** | `LiveRoom` | A Challenge Room on "hypothesis testing" is relevant to anyone studying that concept |

---

## Schema Changes

### New Model: `ConceptBridge`

Maps equivalent concepts across courses.

```prisma
model ConceptBridge {
  id              String   @id @default(cuid())
  conceptA        String   // Concept name/ID in course A
  courseA         String   // Course ID A
  conceptB        String   // Concept name/ID in course B
  courseB         String   // Course ID B
  similarity      Float    // 0-1: how equivalent are these concepts
  bridgeType      String   // "identical" | "overlapping" | "prerequisite" | "extension"
  createdBy       String   // "auto" (AI-detected) | "manual" (faculty-created)
  verified        Boolean  @default(false) // Faculty-verified bridge
  createdAt       DateTime @default(now())

  @@unique([conceptA, courseA, conceptB, courseB])
  @@index([conceptA, courseA])
  @@index([conceptB, courseB])
  @@index([similarity])
}
```

### New Model: `BridgeRecommendation`

When a student struggles, the system generates bridge recommendations.

```prisma
model BridgeRecommendation {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  concept     String   // The concept they're struggling with
  courseId    String   // The course context

  // Recommended resources from other courses
  resources   Json     // Array of { type, sourceId, sourceCourse, reason, score }

  status      String   @default("pending") // "pending" | "viewed" | "acted" | "dismissed"
  actedOn     String?  // Which resource they used
  helpful     Boolean? // User feedback

  createdAt   DateTime @default(now())
  expiresAt   DateTime // Recommendations expire after 7 days

  @@index([userId, status])
  @@index([concept, courseId])
}
```

---

## Service Architecture

### Bridge Discovery: `app/lib/concept-bridge/bridge-discovery.ts`

Automatically finds equivalent concepts across courses using keyword matching and Haiku verification.

```typescript
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

export async function discoverBridges(): Promise<{ created: number; verified: number }> {
  // 1. Get all unique concepts across all courses
  const concepts = await prisma.conceptState.findMany({
    distinct: ['name', 'courseId'],
    select: { name: true, courseId: true, description: true },
  })

  // 2. Find potential matches using normalized name comparison
  const candidates: Array<{ a: typeof concepts[0]; b: typeof concepts[0]; similarity: number }> = []

  for (let i = 0; i < concepts.length; i++) {
    for (let j = i + 1; j < concepts.length; j++) {
      if (concepts[i].courseId === concepts[j].courseId) continue // Same course — skip

      const similarity = computeConceptSimilarity(concepts[i], concepts[j])
      if (similarity >= 0.6) {
        candidates.push({ a: concepts[i], b: concepts[j], similarity })
      }
    }
  }

  // 3. For high-similarity candidates, verify with Haiku (batch)
  let created = 0
  for (const candidate of candidates) {
    const existing = await prisma.conceptBridge.findUnique({
      where: {
        conceptA_courseA_conceptB_courseB: {
          conceptA: candidate.a.name,
          courseA: candidate.a.courseId,
          conceptB: candidate.b.name,
          courseB: candidate.b.courseId,
        },
      },
    })
    if (existing) continue

    const bridgeType = classifyBridgeType(candidate.similarity, candidate.a, candidate.b)

    await prisma.conceptBridge.create({
      data: {
        conceptA: candidate.a.name,
        courseA: candidate.a.courseId,
        conceptB: candidate.b.name,
        courseB: candidate.b.courseId,
        similarity: candidate.similarity,
        bridgeType,
        createdBy: 'auto',
      },
    })
    created++
  }

  return { created, verified: 0 }
}

function computeConceptSimilarity(
  a: { name: string; description?: string | null },
  b: { name: string; description?: string | null }
): number {
  // Normalized name comparison
  const nameA = normalizeConcept(a.name)
  const nameB = normalizeConcept(b.name)

  // Exact match after normalization
  if (nameA === nameB) return 1.0

  // Keyword overlap
  const wordsA = new Set(nameA.split(/\s+/))
  const wordsB = new Set(nameB.split(/\s+/))
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)))
  const union = new Set([...wordsA, ...wordsB])
  const jaccard = union.size > 0 ? intersection.size / union.size : 0

  // Description similarity boost
  let descBoost = 0
  if (a.description && b.description) {
    const descWordsA = new Set(normalizeConcept(a.description).split(/\s+/))
    const descWordsB = new Set(normalizeConcept(b.description).split(/\s+/))
    const descIntersection = new Set([...descWordsA].filter(w => descWordsB.has(w)))
    descBoost = descIntersection.size / Math.max(descWordsA.size, descWordsB.size) * 0.3
  }

  return Math.min(1, jaccard + descBoost)
}

function normalizeConcept(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function classifyBridgeType(similarity: number, a: any, b: any): string {
  if (similarity >= 0.95) return 'identical'
  if (similarity >= 0.7) return 'overlapping'
  return 'overlapping' // Further classification with Haiku in Sprint 2
}
```

### Bridge Recommender: `app/lib/concept-bridge/bridge-recommender.ts`

When a student struggles, finds cross-course resources.

```typescript
export async function generateBridgeRecommendations(
  userId: string,
  concept: string,
  courseId: string
): Promise<BridgeRecommendationData> {
  // 1. Find bridge concepts from other courses
  const bridges = await prisma.conceptBridge.findMany({
    where: {
      OR: [
        { conceptA: concept, courseA: courseId },
        { conceptB: concept, courseB: courseId },
      ],
      similarity: { gte: 0.6 },
    },
    orderBy: { similarity: 'desc' },
  })

  if (bridges.length === 0) {
    return { resources: [], concept, courseId }
  }

  // 2. For each bridge, find resources in the bridged course
  const resources: CrossCourseResource[] = []

  for (const bridge of bridges) {
    const bridgedConcept = bridge.conceptA === concept ? bridge.conceptB : bridge.conceptA
    const bridgedCourseId = bridge.courseA === courseId ? bridge.courseB : bridge.courseA

    // Find flashcards with high retention for this concept
    const flashcards = await prisma.flashcardState.findMany({
      where: {
        concept: { contains: bridgedConcept, mode: 'insensitive' },
        quality: { gte: 3 }, // Good or better retention
      },
      select: { id: true, userId: true, concept: true },
      take: 5,
    })
    if (flashcards.length > 0) {
      resources.push({
        type: 'flashcards',
        sourceCourse: bridgedCourseId,
        bridgedConcept,
        count: flashcards.length,
        reason: `${flashcards.length} flashcards with high retention for "${bridgedConcept}"`,
        score: bridge.similarity * 0.9,
      })
    }

    // Find peer experts — students who mastered this concept in the bridged course
    const experts = await prisma.studentConceptMastery.findMany({
      where: {
        concept: { contains: bridgedConcept, mode: 'insensitive' },
        proficiency: { gte: 0.8 },
        userId: { not: userId }, // Not the struggling student
      },
      select: { userId: true, proficiency: true },
      take: 5,
    })
    if (experts.length > 0) {
      resources.push({
        type: 'peer-experts',
        sourceCourse: bridgedCourseId,
        bridgedConcept,
        count: experts.length,
        reason: `${experts.length} students mastered "${bridgedConcept}" and could help`,
        score: bridge.similarity * 0.85,
        peerIds: experts.map(e => e.userId),
      })
    }

    // Find study groups focused on this concept
    const groups = await prisma.studyGroup.findMany({
      where: {
        topic: { contains: bridgedConcept, mode: 'insensitive' },
        status: 'ACTIVE',
      },
      select: { id: true, name: true, _count: { select: { members: true } } },
      take: 3,
    })
    if (groups.length > 0) {
      resources.push({
        type: 'study-groups',
        sourceCourse: bridgedCourseId,
        bridgedConcept,
        count: groups.length,
        reason: `${groups.length} active study groups on "${bridgedConcept}"`,
        score: bridge.similarity * 0.8,
        groupIds: groups.map(g => g.id),
      })
    }

    // Find relevant course materials
    const materials = await prisma.documentChunk.findMany({
      where: {
        courseId: bridgedCourseId,
        content: { contains: bridgedConcept, mode: 'insensitive' },
      },
      select: { id: true, documentId: true, content: true },
      take: 3,
    })
    if (materials.length > 0) {
      resources.push({
        type: 'materials',
        sourceCourse: bridgedCourseId,
        bridgedConcept,
        count: materials.length,
        reason: `Course materials covering "${bridgedConcept}" from another course`,
        score: bridge.similarity * 0.75,
      })
    }

    // Find recent Live Rooms on this concept
    const liveRooms = await prisma.liveRoom.findMany({
      where: {
        topic: { contains: bridgedConcept, mode: 'insensitive' },
        status: 'COMPLETE',
        endedAt: { gte: daysAgo(7) },
      },
      select: { id: true, topic: true, _count: { select: { participants: true } } },
      take: 2,
    })
    if (liveRooms.length > 0) {
      resources.push({
        type: 'live-rooms',
        sourceCourse: bridgedCourseId,
        bridgedConcept,
        count: liveRooms.length,
        reason: `Recent Challenge Rooms on "${bridgedConcept}"`,
        score: bridge.similarity * 0.7,
      })
    }
  }

  // Sort by score and deduplicate
  const sorted = resources.sort((a, b) => b.score - a.score).slice(0, 10)

  // Persist recommendation
  await prisma.bridgeRecommendation.upsert({
    where: { id: `${userId}-${concept}-${courseId}` }, // Composite lookup
    create: {
      userId,
      concept,
      courseId,
      resources: sorted as any,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    update: {
      resources: sorted as any,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    },
  })

  return { resources: sorted, concept, courseId }
}
```

### Struggle Detection: `app/lib/concept-bridge/struggle-detector.ts`

Triggers bridge recommendations when a student shows signs of struggling.

```typescript
/**
 * Called after concept mastery updates, flashcard reviews, and quiz completions.
 * Detects struggle patterns and triggers bridge recommendations.
 */
export async function checkForStruggle(
  userId: string,
  concept: string,
  courseId: string,
  signal: 'low-mastery' | 'flashcard-again' | 'low-score' | 'repeated-error'
): Promise<BridgeRecommendationData | null> {
  // Check if we already have a recent recommendation for this concept
  const existing = await prisma.bridgeRecommendation.findFirst({
    where: {
      userId,
      concept,
      courseId,
      status: { not: 'dismissed' },
      expiresAt: { gt: new Date() },
    },
  })
  if (existing) return null // Don't spam

  // Verify the student is actually struggling (not just one bad session)
  const mastery = await prisma.studentConceptMastery.findFirst({
    where: { userId, concept: { contains: concept, mode: 'insensitive' } },
  })
  if (mastery && mastery.proficiency > 0.5) return null // Not struggling enough

  // Check if bridges exist for this concept
  const bridgeCount = await prisma.conceptBridge.count({
    where: {
      OR: [
        { conceptA: { contains: concept, mode: 'insensitive' } },
        { conceptB: { contains: concept, mode: 'insensitive' } },
      ],
    },
  })
  if (bridgeCount === 0) return null // No cross-course resources available

  return generateBridgeRecommendations(userId, concept, courseId)
}
```

---

## API Routes

### GET `/api/concept-bridge/recommendations`

Student views their active bridge recommendations.

```typescript
// app/api/concept-bridge/recommendations/route.ts
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const recs = await prisma.bridgeRecommendation.findMany({
    where: {
      userId: auth.user.id,
      status: { in: ['pending', 'viewed'] },
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return NextResponse.json(recs)
})
```

### POST `/api/concept-bridge/recommendations/[id]/feedback`

Student provides feedback on a recommendation.

```typescript
// app/api/concept-bridge/recommendations/[id]/feedback/route.ts
export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await params
  const { helpful, actedOn } = await req.json()

  await prisma.bridgeRecommendation.update({
    where: { id },
    data: {
      status: 'acted',
      helpful,
      actedOn,
    },
  })

  return NextResponse.json({ success: true })
})
```

### GET `/api/concept-bridge/map`

Visualization data — the concept bridge graph across courses.

```typescript
// app/api/concept-bridge/map/route.ts
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const bridges = await prisma.conceptBridge.findMany({
    where: { similarity: { gte: 0.7 } },
    select: {
      conceptA: true,
      courseA: true,
      conceptB: true,
      courseB: true,
      similarity: true,
      bridgeType: true,
    },
    take: 200,
  })

  return NextResponse.json({ bridges })
})
```

### POST `/api/cron/concept-bridge-discovery`

Weekly bridge discovery — finds new concept equivalences.

```typescript
// app/api/cron/concept-bridge-discovery/route.ts
export const POST = withErrorHandling(async (req: NextRequest) => {
  const cronAuth = verifyCronSecret(req)
  if (cronAuth) return cronAuth

  const result = await discoverBridges()
  return NextResponse.json(result)
})
```

---

## Consumer Integrations

### Study Buddy Integration

When Study Buddy detects a concept struggle, it offers cross-course resources:

```typescript
// In study-buddy system prompt injection
const bridgeRecs = await checkForStruggle(userId, currentConcept, courseId, 'low-mastery')

if (bridgeRecs && bridgeRecs.resources.length > 0) {
  // Sandy says: "I found some help from other courses — 5 flashcards with high retention
  // for this concept, and 3 students who mastered it recently. Want me to connect you?"
}
```

### Sandy Concierge Integration

```typescript
// Sandy tool
{
  name: 'find_cross_course_help',
  description: 'Find resources from other courses to help with a concept the student is struggling with. Searches for flashcards, peer experts, study groups, and materials across all courses.',
  parameters: {
    type: 'object',
    properties: {
      concept: { type: 'string', description: 'The concept to find help for' },
      courseId: { type: 'string', description: 'The course context (optional)' },
    },
    required: ['concept'],
  },
  permission: 'auto',
  handler: async ({ concept, courseId }, context) => {
    const recs = await generateBridgeRecommendations(context.userId, concept, courseId || '')
    if (recs.resources.length === 0) {
      return { message: `No cross-course resources found for "${concept}". Try a broader search term.` }
    }
    return {
      concept,
      resourceCount: recs.resources.length,
      resources: recs.resources.slice(0, 5).map(r => ({
        type: r.type,
        count: r.count,
        reason: r.reason,
      })),
    }
  },
}
```

### Student Homepage Nudge

When bridge recommendations exist, show a nudge card:

```
┌──────────────────────────────────────────────┐
│  🌉 CONCEPT BRIDGE                           │
│                                               │
│  Struggling with "statistical inference"       │
│  in PSY 301?                                   │
│                                               │
│  5 flashcards from STAT 200 (78% retention)   │
│  3 students who mastered this recently         │
│  1 active study group on this topic            │
│                                               │
│  [Get Help]  [Dismiss]                         │
└──────────────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|---|---|
| `app/lib/concept-bridge/bridge-discovery.ts` | Auto-detect concept equivalences across courses |
| `app/lib/concept-bridge/bridge-recommender.ts` | Generate cross-course resource recommendations |
| `app/lib/concept-bridge/struggle-detector.ts` | Trigger recommendations on struggle detection |
| `app/lib/concept-bridge/types.ts` | Shared TypeScript types |
| `app/api/concept-bridge/recommendations/route.ts` | GET — student's active recommendations |
| `app/api/concept-bridge/recommendations/[id]/feedback/route.ts` | POST — feedback on recommendation |
| `app/api/concept-bridge/map/route.ts` | GET — bridge graph visualization data |
| `app/api/cron/concept-bridge-discovery/route.ts` | POST — weekly bridge discovery |
| `app/components/concept-bridge/BridgeNudgeCard.tsx` | Homepage nudge card |
| `app/components/concept-bridge/BridgeResourceList.tsx` | Resource list in Sandy / Study Buddy |
| `app/components/concept-bridge/ConceptBridgeMap.tsx` | SVG graph visualization of bridges |

## Files to Modify

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `ConceptBridge`, `BridgeRecommendation` models |
| `app/lib/agent/tools/sandy-tools.ts` | Add `find_cross_course_help` tool |
| `app/lib/agent/tool-registry.ts` | Register new tool |
| `app/components/StudyBuddyInterface.tsx` | Inject bridge recommendations on concept struggle |
| `app/components/student-home/StudentHomepage.tsx` | Add `BridgeNudgeCard` when recommendations exist |

---

## Migration Path

1. **Sprint 1**: Schema + bridge discovery engine + bridge recommender + struggle detector + API routes + cron
2. **Sprint 2**: Sandy tool + Study Buddy integration + homepage nudge card + bridge map visualization + feedback loop

---

## Success Criteria

1. **Cross-pollination.** A PSY 301 student finds flashcards created by STAT 200 students and finds them helpful.
2. **Peer connections.** Sandy connects a struggling student with a peer expert from a different course who mastered the same concept.
3. **Faculty visibility.** Faculty can see which concepts in their course are bridged to other departments — informing curriculum design.
4. **Low noise.** Recommendations only appear when the student is genuinely struggling AND cross-course resources actually exist. False positive rate < 15%.
