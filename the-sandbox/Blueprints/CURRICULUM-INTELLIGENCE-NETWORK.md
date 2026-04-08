# Blueprint: Curriculum Intelligence Network — Knowledge Flow Across the University

> **Sprint Scope:** Visualize and analyze how knowledge flows across the entire university by mapping learning objectives, concept prerequisite chains, mastery data, and tool effectiveness across all courses. Find gaps, redundancies, and the most effective teaching pathways.
> **Depends On:** Cross-Course Concept Bridge (Blueprint 3) for concept equivalences. Concept mastery system (complete). Learning objectives system (complete).
> **Estimated Size:** Large (3 sprints)
> **Deploy Order:** 10 of 10 (Cross-Data Series)
> **Patent Relevance:** HIGH — "Institutional curriculum intelligence through cross-course knowledge graph analysis and outcome-driven pathway optimization"

---

## Context

Universities design curricula in department silos. No one has a system-wide view of how knowledge flows from introductory courses through advanced courses across departments. The Curriculum Intelligence Network builds that view by connecting:

1. **Learning objectives** across all courses
2. **Concept prerequisite chains** (what depends on what)
3. **Student mastery data** (where students actually succeed or fail)
4. **Tool effectiveness** (which teaching tools produce the best outcomes for which concepts)
5. **Bloom taxonomy distribution** (is the curriculum appropriately scaffolded?)

This produces institutional intelligence that no department can generate alone.

### Questions This System Answers

- **Gap detection:** "No course teaches 'research methodology' as a primary objective, but 4 upper-level courses require it as a prerequisite"
- **Redundancy detection:** "3 different departments teach 'statistical hypothesis testing' independently — students may take all 3"
- **Pathway optimization:** "Students who take BIO 200 before CHEM 301 have 23% higher mastery of molecular concepts than those who take CHEM 301 first"
- **Tool effectiveness mapping:** "Flashcards are the most effective tool for vocabulary-heavy concepts; Teach-Back mode is best for synthesis-level concepts"
- **Bloom scaffolding:** "The freshman curriculum is 60% knowledge-level — insufficient application and analysis opportunities"

---

## Schema Changes

### New Model: `CurriculumNode`

Represents a learning objective or concept in the curriculum graph.

```prisma
model CurriculumNode {
  id          String   @id @default(cuid())
  label       String   // "Statistical Hypothesis Testing"
  type        String   // "objective" | "concept" | "skill"
  bloomLevel  String?  // "knowledge" | "comprehension" | "application" | "analysis" | "synthesis" | "evaluation"
  department  String?  // Owning department

  // ── Source ──
  courses     CurriculumNodeCourse[]  // Which courses teach this node

  // ── Graph Edges ──
  prerequisites   CurriculumEdge[] @relation("EdgeTarget")
  dependents      CurriculumEdge[] @relation("EdgeSource")

  // ── Mastery Metrics ──
  avgMastery       Float?   // Average student mastery across all courses (0-1)
  masteryVariance  Float?   // Variance across courses (high = inconsistent teaching)
  bestCourse       String?  // Course ID with highest mastery outcome
  bestTool         String?  // Tool/mode with highest effectiveness for this node

  computedAt       DateTime?

  @@index([type])
  @@index([department])
  @@index([avgMastery])
}

model CurriculumNodeCourse {
  id          String   @id @default(cuid())
  nodeId      String
  node        CurriculumNode @relation(fields: [nodeId], references: [id], onDelete: Cascade)
  courseId    String
  role        String   // "teaches" | "requires" | "reinforces"
  bloomLevel  String?  // At what bloom level this course engages the node

  @@unique([nodeId, courseId])
}

model CurriculumEdge {
  id          String   @id @default(cuid())
  sourceId    String   // Prerequisite node
  source      CurriculumNode @relation("EdgeSource", fields: [sourceId], references: [id], onDelete: Cascade)
  targetId    String   // Dependent node
  target      CurriculumNode @relation("EdgeTarget", fields: [targetId], references: [id], onDelete: Cascade)
  strength    Float    @default(1.0)  // How critical is this prerequisite (0-1)
  evidence    String?  // "mastery correlation: r=0.72" or "catalog prerequisite"

  @@unique([sourceId, targetId])
  @@index([sourceId])
  @@index([targetId])
}
```

### New Model: `CurriculumInsight`

Discovered gaps, redundancies, and optimizations.

```prisma
model CurriculumInsight {
  id            String   @id @default(cuid())
  discoveredAt  DateTime @default(now())
  type          String   // "gap" | "redundancy" | "pathway-optimization" | "bloom-imbalance" | "tool-effectiveness"
  severity      String   // "info" | "moderate" | "significant"
  title         String
  description   String
  affectedNodes String[] // CurriculumNode IDs
  affectedCourses String[] // Course IDs
  recommendation String?
  status        String   @default("new") // "new" | "reviewed" | "acted" | "dismissed"

  @@index([type])
  @@index([severity])
  @@index([status])
}
```

---

## Service Architecture

### Graph Builder: `app/lib/curriculum-intel/graph-builder.ts`

Constructs the curriculum graph from existing data.

```typescript
export async function buildCurriculumGraph(): Promise<{ nodes: number; edges: number }> {
  // 1. Build nodes from learning objectives
  const objectives = await prisma.learningObjective.findMany({
    select: { id: true, description: true, courseId: true, bloomLevel: true },
  })

  // 2. Build nodes from concept states
  const concepts = await prisma.conceptState.findMany({
    distinct: ['name'],
    select: { name: true, courseId: true, description: true },
  })

  // 3. Build edges from ConceptPrerequisite
  const prerequisites = await prisma.conceptPrerequisite.findMany({
    select: { conceptName: true, prerequisiteName: true },
  })

  // 4. Build edges from ConceptBridge (cross-course equivalences)
  const bridges = await prisma.conceptBridge.findMany({
    where: { similarity: { gte: 0.7 } },
    select: { conceptA: true, courseA: true, conceptB: true, courseB: true },
  })

  // 5. Upsert nodes
  let nodeCount = 0
  for (const obj of objectives) {
    await upsertCurriculumNode({
      label: obj.description,
      type: 'objective',
      bloomLevel: obj.bloomLevel,
      courses: [{ courseId: obj.courseId, role: 'teaches', bloomLevel: obj.bloomLevel }],
    })
    nodeCount++
  }

  for (const concept of concepts) {
    await upsertCurriculumNode({
      label: concept.name,
      type: 'concept',
      courses: [{ courseId: concept.courseId, role: 'teaches' }],
    })
    nodeCount++
  }

  // 6. Upsert edges
  let edgeCount = 0
  for (const prereq of prerequisites) {
    await upsertCurriculumEdge(prereq.prerequisiteName, prereq.conceptName, 'catalog prerequisite')
    edgeCount++
  }

  return { nodes: nodeCount, edges: edgeCount }
}
```

### Gap Detector: `app/lib/curriculum-intel/gap-detector.ts`

```typescript
export async function detectCurriculumGaps(): Promise<CurriculumInsightData[]> {
  const insights: CurriculumInsightData[] = []

  // Gap: nodes that are prerequisites for 2+ other nodes but no course teaches them
  const orphanPrereqs = await prisma.$queryRaw`
    SELECT ce."sourceId", cn."label", COUNT(ce."targetId") as dependent_count
    FROM "CurriculumEdge" ce
    JOIN "CurriculumNode" cn ON cn.id = ce."sourceId"
    LEFT JOIN "CurriculumNodeCourse" cnc ON cnc."nodeId" = cn.id AND cnc."role" = 'teaches'
    WHERE cnc.id IS NULL
    GROUP BY ce."sourceId", cn."label"
    HAVING COUNT(ce."targetId") >= 2
    ORDER BY dependent_count DESC
  `

  for (const gap of orphanPrereqs as any[]) {
    insights.push({
      type: 'gap',
      severity: gap.dependent_count >= 4 ? 'significant' : 'moderate',
      title: `No course teaches "${gap.label}" — required by ${gap.dependent_count} courses`,
      description: `The concept "${gap.label}" is a prerequisite for ${gap.dependent_count} upper-level concepts, but no course in the curriculum teaches it as a primary objective.`,
      affectedNodes: [gap.sourceId],
      recommendation: `Consider adding "${gap.label}" as a learning objective to an appropriate introductory course.`,
    })
  }

  // Redundancy: same concept taught at same bloom level in 3+ courses
  const redundancies = await findRedundancies()
  insights.push(...redundancies)

  // Bloom imbalance: department with >50% knowledge-level objectives
  const bloomImbalances = await findBloomImbalances()
  insights.push(...bloomImbalances)

  return insights
}
```

### Pathway Optimizer: `app/lib/curriculum-intel/pathway-optimizer.ts`

```typescript
export async function analyzePathwayEffectiveness(): Promise<CurriculumInsightData[]> {
  const insights: CurriculumInsightData[] = []

  // For concept pairs (A prerequisite of B), compare mastery of B
  // based on where students learned A
  const edges = await prisma.curriculumEdge.findMany({
    where: { strength: { gte: 0.7 } },
    include: {
      source: { include: { courses: true } },
      target: { include: { courses: true } },
    },
  })

  for (const edge of edges) {
    if (edge.source.courses.length < 2) continue // Need 2+ courses teaching prereq

    const masteryByCourse = await compareMasteryByPrereqCourse(
      edge.source.courses.map(c => c.courseId),
      edge.target.label
    )

    if (masteryByCourse.length >= 2) {
      const best = masteryByCourse[0]
      const worst = masteryByCourse[masteryByCourse.length - 1]
      const delta = best.avgMastery - worst.avgMastery

      if (delta > 0.15) { // 15%+ difference = significant
        insights.push({
          type: 'pathway-optimization',
          severity: 'significant',
          title: `Students from ${best.courseTitle} master "${edge.target.label}" ${(delta * 100).toFixed(0)}% better`,
          description: `Students who learned "${edge.source.label}" in ${best.courseTitle} achieved ${(best.avgMastery * 100).toFixed(0)}% mastery of "${edge.target.label}" vs. ${(worst.avgMastery * 100).toFixed(0)}% from ${worst.courseTitle}.`,
          affectedNodes: [edge.sourceId, edge.targetId],
          affectedCourses: [best.courseId, worst.courseId],
          recommendation: `Consider recommending ${best.courseTitle} as the preferred pathway for students heading toward "${edge.target.label}"-dependent courses.`,
        })
      }
    }
  }

  return insights
}
```

### Tool Effectiveness Mapper: `app/lib/curriculum-intel/tool-effectiveness.ts`

```typescript
export async function analyzeToolEffectiveness(): Promise<CurriculumInsightData[]> {
  const insights: CurriculumInsightData[] = []

  // For each bloom level, which study mode produces the best mastery gains?
  const bloomLevels = ['knowledge', 'comprehension', 'application', 'analysis', 'synthesis', 'evaluation']

  for (const bloom of bloomLevels) {
    const modeEffectiveness = await prisma.$queryRaw`
      SELECT
        ts.metadata->>'studyMode' as mode,
        AVG(ts.score) as avg_score,
        COUNT(*) as session_count
      FROM "ToolSession" ts
      JOIN "StudentConceptMastery" scm ON scm."userId" = ts."userId"
      WHERE scm."bloomLevel" = ${bloom}
        AND ts.metadata->>'studyMode' IS NOT NULL
        AND ts.score IS NOT NULL
      GROUP BY mode
      HAVING COUNT(*) >= 10
      ORDER BY avg_score DESC
    `

    const modes = modeEffectiveness as any[]
    if (modes.length >= 2) {
      const best = modes[0]
      const delta = best.avg_score - modes[modes.length - 1].avg_score

      if (delta > 10) {
        insights.push({
          type: 'tool-effectiveness',
          severity: 'info',
          title: `${best.mode} mode is most effective for ${bloom}-level concepts (+${delta.toFixed(0)}%)`,
          description: `For ${bloom}-level concepts, ${best.mode} mode averages ${best.avg_score.toFixed(1)} vs. ${modes[modes.length - 1].avg_score.toFixed(1)} for ${modes[modes.length - 1].mode} (n=${modes.reduce((s: number, m: any) => s + Number(m.session_count), 0)}).`,
          recommendation: `Sandy should prefer ${best.mode} for ${bloom}-level study tasks.`,
        })
      }
    }
  }

  return insights
}
```

---

## API Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/curriculum-intel/graph` | GET | `requireAdminUser` | Full curriculum graph data for visualization |
| `/api/curriculum-intel/insights` | GET | `requireAdminUser` | Discovered insights |
| `/api/curriculum-intel/insights/[id]/action` | POST | `requireAdminUser` | Mark insight as reviewed/acted/dismissed |
| `/api/curriculum-intel/node/[nodeId]` | GET | `requireAdminUser` | Single node deep dive |
| `/api/curriculum-intel/department/[dept]` | GET | `requireAdminUser` | Department-scoped view |
| `/api/cron/curriculum-intel-refresh` | POST | `verifyCronSecret` | Monthly full rebuild |

---

## UI: Curriculum Network Visualization

New page at `/admin/curriculum-intelligence`:

```
┌──────────────────────────────────────────────────────────────────┐
│  CURRICULUM INTELLIGENCE NETWORK                                  │
│                                                                    │
│  ┌─ NETWORK GRAPH ──────────────────────────────────────────┐    │
│  │                                                          │    │
│  │        [Interactive force-directed SVG graph]             │    │
│  │                                                          │    │
│  │   Nodes: 340 concepts · 180 objectives                   │    │
│  │   Edges: 520 prerequisites · 85 bridges                  │    │
│  │                                                          │    │
│  │   Color: department  Size: student volume  Border: bloom  │    │
│  │   Red edges: gaps  Green edges: strong pathways           │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─ INSIGHTS (12) ──────────────────────────────────────────┐    │
│  │                                                          │    │
│  │ 🔴 GAP: "Research Methodology" not taught — needed by 4  │    │
│  │ 🟠 REDUNDANCY: "Hypothesis Testing" in 3 departments     │    │
│  │ 🟢 PATHWAY: BIO 200 → CHEM 301 is 23% more effective    │    │
│  │ 🔵 TOOL: Teach-Back best for synthesis; Flashcards for   │    │
│  │    knowledge                                              │    │
│  │ 🟡 BLOOM: Freshman curriculum 60% knowledge-level        │    │
│  │                                                          │    │
│  │ [View All]  [Filter: gaps only]  [Filter: my dept]       │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─ DEPARTMENT BLOOM BREAKDOWN ─────────────────────────────┐    │
│  │  Arts & Sci   ██████████████████░░░░░░░░ K:40 C:25 A:20 │    │
│  │  Engineering  ████████████░░░░░░░░░░░░░░ K:20 C:15 A:35 │    │
│  │  Business     ██████████████████████░░░░ K:30 C:30 A:25 │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Sandy Tool

```typescript
{
  name: 'query_curriculum_network',
  description: 'Query the curriculum intelligence network for gaps, redundancies, pathway recommendations, or concept information across courses.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Natural language query about curriculum' },
      type: { type: 'string', enum: ['gaps', 'redundancies', 'pathways', 'bloom', 'tool-effectiveness'] },
    },
  },
  permission: 'auto',
  handler: async ({ query, type }, context) => {
    if (!['ADMIN', 'EDUCATOR'].includes(context.userRole)) {
      return { message: 'Curriculum intelligence is available to educators and admins.' }
    }

    const insights = await prisma.curriculumInsight.findMany({
      where: {
        ...(type && { type }),
        status: { not: 'dismissed' },
      },
      orderBy: { severity: 'desc' },
      take: 5,
    })

    return {
      insightCount: insights.length,
      insights: insights.map(i => ({
        type: i.type,
        severity: i.severity,
        title: i.title,
        recommendation: i.recommendation,
      })),
    }
  },
}
```

---

## Files to Create

| File | Purpose |
|---|---|
| `app/lib/curriculum-intel/graph-builder.ts` | Build curriculum graph from objectives + concepts |
| `app/lib/curriculum-intel/gap-detector.ts` | Find teaching gaps and redundancies |
| `app/lib/curriculum-intel/pathway-optimizer.ts` | Compare pathway effectiveness via mastery data |
| `app/lib/curriculum-intel/tool-effectiveness.ts` | Map tool modes to bloom level effectiveness |
| `app/lib/curriculum-intel/curriculum-service.ts` | CRUD + query interface |
| `app/lib/curriculum-intel/types.ts` | Shared types |
| `app/api/curriculum-intel/graph/route.ts` | GET — full graph data |
| `app/api/curriculum-intel/insights/route.ts` | GET — insights list |
| `app/api/curriculum-intel/insights/[id]/action/route.ts` | POST — mark insight |
| `app/api/curriculum-intel/node/[nodeId]/route.ts` | GET — node deep dive |
| `app/api/curriculum-intel/department/[dept]/route.ts` | GET — department view |
| `app/api/cron/curriculum-intel-refresh/route.ts` | POST — monthly rebuild |
| `app/admin/curriculum-intelligence/page.tsx` | Dashboard page |
| `app/components/curriculum-intel/NetworkGraph.tsx` | SVG force-directed graph |
| `app/components/curriculum-intel/InsightList.tsx` | Insight cards |
| `app/components/curriculum-intel/BloomBreakdown.tsx` | Department bloom bar chart |
| `app/components/curriculum-intel/NodeDetail.tsx` | Single node deep dive panel |

## Files to Modify

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `CurriculumNode`, `CurriculumNodeCourse`, `CurriculumEdge`, `CurriculumInsight` models |
| `app/lib/agent/tools/faculty-tools.ts` | Add `query_curriculum_network` tool |
| `app/lib/agent/tool-registry.ts` | Register tool |
| `app/components/Header.tsx` | Add admin nav link |

---

## Migration Path

1. **Sprint 1**: Schema + graph builder + gap detector + API routes + basic insights page
2. **Sprint 2**: Pathway optimizer + tool effectiveness mapper + network graph visualization
3. **Sprint 3**: Department views + bloom breakdown + Sandy tool + integration with Cross-Course Concept Bridge data

---

## Success Criteria

1. **Gaps discovered.** The system finds at least 2 genuine curriculum gaps that no department was aware of.
2. **Pathways optimized.** Evidence-based recommendations for course sequencing based on actual mastery data.
3. **Bloom scaffolding.** Department chairs see their bloom distribution and can make informed decisions about curriculum balance.
4. **Cross-department insights.** The network reveals connections between departments that siloed planning could never find.
5. **Publishable.** The curriculum intelligence data is valuable enough to support a conference paper on "data-driven curriculum design."
