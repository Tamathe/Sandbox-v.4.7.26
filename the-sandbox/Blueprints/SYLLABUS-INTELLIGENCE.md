# Blueprint: Syllabus Intelligence — AI-Powered Syllabus Design, Analysis & Adaptation

> **Sprint Scope:** Transform the syllabus from a static document into a living, AI-powered design partner. Three layers: Analyze (audit uploaded syllabi), Generate (scaffold from outcomes), Adapt (mid-semester intelligence).
> **Depends On:** Syllabus Architect (complete: pdf-parser.ts, validator.ts, apply-syllabus route). CourseMap model (complete). Syllabus Drop (complete: 6-step wizard). Assignment model + Rubric generator (complete).
> **Unlocks:** Curriculum Intelligence Network (cross-course analysis), Student Smart Gap Planner (personalized recovery), Faculty Homepage Intelligence (pacing alerts)
> **Estimated Size:** Large (3-4 sprints across 7 phases)
> **Patent Relevance:** HIGH — "Multi-pass AI syllabus analysis with pedagogical taxonomy alignment, generative scaffolding from learning outcomes, and adaptive mid-semester course structure optimization"

---

## Context

### The Problem

Faculty interact with syllabi in two broken modes:

1. **Upload & forget** — Syllabus Drop extracts structure but doesn't *evaluate* it. An educator could have misaligned assessments, crush weeks, or Bloom's gaps and never know.
2. **Blank slate paralysis** — New educators or new courses have no starting structure. They must design from scratch with no AI assistance.
3. **Mid-semester blindness** — Once the syllabus is applied as a CourseMap, it's frozen. No system monitors actual vs. planned pacing or flags bottlenecks from student performance data.

### The Vision

The syllabus becomes the **intelligent layer that orchestrates learning** — not a description of it, but an active participant in course design. Three layers:

| Layer | When | What |
|---|---|---|
| **Analyze** | After upload | Bloom's audit, workload analysis, prerequisite validation, gap report card |
| **Generate** | Before upload (or from scratch) | Scaffold from outcomes, suggest assessments, draft alternative pathways |
| **Adapt** | Mid-semester | Pacing advisor, bottleneck detection, student syllabus agent, semester diff |

### Integration with Existing Systems

```
Existing Feature           →  Syllabus Intelligence Extension
──────────────────────────────────────────────────────────────
Syllabus Drop (parse)      →  + Bloom's audit, workload analysis, gap report card
Syllabus Architect (3-pass)→  + Pass 4 (analysis), Pass 5 (generation)
CourseMap (graph)           →  + Variant pathways, prerequisite inference
Assignment model           →  + AI-suggested assessments, Bloom's tagging
Rubric generator           →  + Auto-generates from syllabus objectives
Sandy agent tools          →  + ask_syllabus, suggest_assessments, pacing_advisor
Horizon Rail               →  + Pacing alerts, bottleneck warnings
Course overview page       →  + Syllabus Report Card dashboard
LearningObjective model    →  + bloomsLevel, alignmentScore, assessedBy
Faculty Intelligence       →  + Workload/pacing data feeds into briefing
Engagement Fingerprint     →  + Learning velocity informs pacing advisor
```

---

## Key Files

### Files to Create

| File | Purpose |
|------|---------|
| `app/lib/syllabus-architect/analysis-service.ts` | Pass 4: Bloom's audit, workload analysis, gap detection |
| `app/lib/syllabus-architect/scaffold-generator.ts` | Generate CourseMap from learning outcomes (no existing syllabus) |
| `app/lib/syllabus-architect/assessment-suggester.ts` | Per-unit assessment options aligned to objectives |
| `app/lib/syllabus-architect/pacing-advisor.ts` | Mid-semester pacing comparison + recommendations |
| `app/lib/syllabus-architect/workload-calculator.ts` | Research-based student hour estimation per unit |
| `app/lib/syllabus-architect/pathway-generator.ts` | Alternative pathway variants (accelerated, supported, applied) |
| `app/lib/syllabus-architect/semester-diff-service.ts` | End-of-semester intent vs. delivery comparison |
| `app/api/courses/[id]/syllabus-analysis/route.ts` | GET: run analysis, return report card |
| `app/api/courses/[id]/generate-scaffold/route.ts` | POST: generate CourseMap from outcomes |
| `app/api/courses/[id]/suggest-assessments/route.ts` | POST: suggest assessments for a unit |
| `app/api/courses/[id]/pacing-check/route.ts` | GET: mid-semester pacing report |
| `app/api/courses/[id]/pathway-variants/route.ts` | POST: generate alternative pathways |
| `app/api/courses/[id]/semester-diff/route.ts` | GET: end-of-semester comparison |
| `app/components/courses/SyllabusReportCard.tsx` | Dashboard: scores, heat map, recommendations |
| `app/components/courses/BloomsHeatMap.tsx` | Visual: objectives × Bloom's levels matrix |
| `app/components/courses/WorkloadChart.tsx` | Visual: weekly student hours bar chart |
| `app/components/courses/ScaffoldWizard.tsx` | 3-step wizard: outcomes → preferences → review |
| `app/components/courses/PacingAdvisor.tsx` | Mid-semester pacing dashboard |
| `app/components/courses/AssessmentSuggestions.tsx` | Per-unit assessment option cards |

### Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `bloomsLevel` to LearningObjective, `SyllabusAnalysis` model, `CourseMapVariant` model, `WorkloadEstimate` fields |
| `app/lib/syllabus-architect/pdf-parser.ts` | Export types for reuse; add optional Pass 4 hook |
| `app/lib/syllabus-architect/validator.ts` | Add validation rules 8-10 (Bloom's gap, workload spike, assessment variety) |
| `app/lib/agent/tools/content-tools.ts` | Register `suggest_assessments`, `ask_syllabus`, `check_pacing` Sandy tools |
| `app/(pages)/courses/[id]/page.tsx` | Add "Syllabus Intelligence" tab or section |
| `app/lib/concierge-service.ts` | Add syllabus analysis context to Sandy's page awareness |
| `app/lib/proactive-suggestions.ts` | Add `syllabus-unanalyzed` nudge for educators |

### Files to Read (context, not modify)

| File | Why |
|------|-----|
| `app/lib/ai-literacy/syllabus-drop-service.ts` | Understand existing extraction + scan pipeline |
| `app/lib/assignment-builder.ts` | Rubric generation patterns to reuse |
| `app/lib/analytics/briefing.ts` | Faculty briefing narrative patterns |
| `app/lib/fingerprint/fingerprint-engine.ts` | Engagement data access patterns |
| `app/api/courses/[id]/apply-syllabus/route.ts` | CourseMap creation flow to extend |
| `Blueprints/CURRICULUM-INTELLIGENCE-NETWORK.md` | Downstream consumer of syllabus analysis |

---

## Schema Changes

### Extend `LearningObjective`

```prisma
model LearningObjective {
  // ... existing fields ...

  // NEW — Syllabus Intelligence
  bloomsLevel       BloomsLevel?       // AI-classified taxonomy level
  bloomsConfidence  Float?             // 0.0–1.0 classification confidence
  assessedBy        Assignment[]       @relation("ObjectiveAssessments")
  alignmentScore    Float?             // 0.0–1.0 how well assessments match the objective level
  alignmentNotes    String?            // AI explanation of gaps
}

enum BloomsLevel {
  REMEMBER
  UNDERSTAND
  APPLY
  ANALYZE
  EVALUATE
  CREATE
}
```

### New Model: `SyllabusAnalysis`

Persists the report card so it doesn't need re-computation on every page view.

```prisma
model SyllabusAnalysis {
  id               String    @id @default(cuid())
  courseId          String
  course           Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  createdAt        DateTime  @default(now())

  // ── Scores (0.0–1.0) ──
  bloomsAlignment  Float     // How well assessments match objective Bloom's levels
  workloadBalance  Float     // Evenness of weekly student hours
  assessmentVariety Float    // Diversity of assessment types
  prerequisiteClarity Float  // Completeness of prerequisite graph
  dateConfidence   Float     // Average date parsing confidence

  // ── Overall ──
  overallScore     Float     // Weighted composite
  overallGrade     String    // A/B/C/D/F letter for quick display

  // ── Detail ──
  bloomsDetail     Json      // Per-objective breakdown: { objectiveId, level, assessmentLevels[], gap }
  workloadDetail   Json      // Per-week: { week, estimatedHours, breakdown[], isCrush }
  gapDetail        Json      // Array of { type, message, severity, suggestion }
  recommendations  Json      // Sorted action items: { priority, category, title, description, quickFix? }

  // ── Metadata ──
  syllabusHash     String?   // Hash of source syllabus text (invalidation)
  modelVersion     String    @default("v1")

  @@unique([courseId])       // One analysis per course (overwrite on re-analysis)
  @@index([overallScore])
}
```

### New Model: `CourseMapVariant`

Alternative pathway through the same course content.

```prisma
model CourseMapVariant {
  id            String    @id @default(cuid())
  courseMapId    String
  courseMap      CourseMap  @relation(fields: [courseMapId], references: [id], onDelete: Cascade)
  label         String    // "Accelerated", "Supported", "Applied"
  description   String
  createdAt     DateTime  @default(now())

  // Which nodes are optional/required/added in this variant
  nodeOverrides Json      // Array<{ nodeId, status: 'required'|'optional'|'added'|'removed', notes? }>
  // Modified prerequisite paths
  edgeOverrides Json      // Array<{ edgeId?, sourceLabel, targetLabel, action: 'add'|'remove'|'weaken' }>
  // Estimated weeks to complete (may differ from base CourseMap)
  estimatedWeeks Int?

  @@index([courseMapId])
}
```

---

## Phase 1: Bloom's Alignment Audit + Gap Report Card

> **Estimated size:** Small-Medium (0.5 sprint)
> **Why first:** Highest value, lowest effort. Extends existing parse pipeline with one more Haiku pass. Gives educators immediate, actionable feedback they can't get anywhere else.

### Service: `app/lib/syllabus-architect/analysis-service.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import { withErrorHandling } from '../api-utils'
import type { BloomsLevel } from '../../generated/prisma'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const HAIKU = 'claude-haiku-4-5-20251001'

// ── Types ──────────────────────────────────────────────────────────────────────

interface BloomsAuditItem {
  objectiveId: string
  objectiveText: string
  classifiedLevel: BloomsLevel
  confidence: number
  assessments: Array<{
    assignmentId: string
    title: string
    testedLevel: BloomsLevel
    aligned: boolean
  }>
  alignmentScore: number
  gap: string | null  // null if aligned, explanation if misaligned
}

interface WorkloadWeek {
  week: number
  unitLabel: string
  estimatedHours: number
  breakdown: Array<{ activity: string; hours: number }>
  isCrush: boolean     // > 1.5x average
  suggestion: string | null
}

interface GapItem {
  type: 'blooms-mismatch' | 'untested-objective' | 'assessment-cluster' | 'missing-prereq' | 'low-variety'
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  suggestion: string
  affectedUnits: string[]
}

interface ReportCard {
  bloomsAlignment: number
  workloadBalance: number
  assessmentVariety: number
  prerequisiteClarity: number
  dateConfidence: number
  overallScore: number
  overallGrade: string
  bloomsDetail: BloomsAuditItem[]
  workloadDetail: WorkloadWeek[]
  gaps: GapItem[]
  recommendations: Array<{
    priority: number
    category: string
    title: string
    description: string
    quickFix?: string  // one-line action the educator can take immediately
  }>
}

// ── Main Entry Point ────────────────────────────────────────────────────────

export async function analyzeSyllabus(courseId: string): Promise<ReportCard> {
  // 1. Load course with full map, objectives, assignments
  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    include: {
      courseMap: {
        include: {
          units: {
            include: { modules: { include: { lessons: true } } },
            orderBy: { position: 'asc' },
          },
          edges: true,
        },
      },
      objectives: true,
      assignments: { include: { rubric: true } },
    },
  })

  if (!course.courseMap) {
    throw new Error('Course has no CourseMap — upload a syllabus first')
  }

  // 2. Run analysis passes in parallel where possible
  const [bloomsResult, workloadResult] = await Promise.all([
    classifyBloomsLevels(course.objectives, course.assignments),
    estimateWorkload(course.courseMap.units, course.assignments, course.creditHours),
  ])

  // 3. Detect gaps
  const gaps = detectGaps(bloomsResult, workloadResult, course)

  // 4. Compute scores
  const scores = computeScores(bloomsResult, workloadResult, gaps, course.courseMap)

  // 5. Generate recommendations (sorted by priority)
  const recommendations = generateRecommendations(gaps, scores)

  // 6. Persist
  await prisma.syllabusAnalysis.upsert({
    where: { courseId },
    create: {
      courseId,
      ...scores,
      bloomsDetail: bloomsResult as any,
      workloadDetail: workloadResult as any,
      gapDetail: gaps as any,
      recommendations: recommendations as any,
    },
    update: {
      ...scores,
      bloomsDetail: bloomsResult as any,
      workloadDetail: workloadResult as any,
      gapDetail: gaps as any,
      recommendations: recommendations as any,
    },
  })

  // 7. Update individual LearningObjective records with Bloom's classification
  await Promise.all(
    bloomsResult.map(item =>
      prisma.learningObjective.update({
        where: { id: item.objectiveId },
        data: {
          bloomsLevel: item.classifiedLevel,
          bloomsConfidence: item.confidence,
          alignmentScore: item.alignmentScore,
          alignmentNotes: item.gap,
        },
      })
    )
  )

  return {
    ...scores,
    bloomsDetail: bloomsResult,
    workloadDetail: workloadResult,
    gaps,
    recommendations,
  }
}

// ── Bloom's Classification ──────────────────────────────────────────────────

async function classifyBloomsLevels(
  objectives: Array<{ id: string; description: string }>,
  assignments: Array<{ id: string; title: string; description: string | null; rubric: any }>
): Promise<BloomsAuditItem[]> {
  if (objectives.length === 0) return []

  // Single Haiku call: classify all objectives AND assignments simultaneously
  const prompt = `You are an expert instructional designer. Classify each item by Bloom's Revised Taxonomy level.

## Learning Objectives
${objectives.map((o, i) => `${i + 1}. [OBJ-${o.id}] ${o.description}`).join('\n')}

## Assessments
${assignments.map((a, i) => `${i + 1}. [ASN-${a.id}] ${a.title}${a.description ? ': ' + a.description : ''}`).join('\n')}

Return JSON:
{
  "objectives": [{ "id": "OBJ-xxx", "level": "REMEMBER|UNDERSTAND|APPLY|ANALYZE|EVALUATE|CREATE", "confidence": 0.0-1.0, "reasoning": "brief" }],
  "assessments": [{ "id": "ASN-xxx", "level": "REMEMBER|UNDERSTAND|APPLY|ANALYZE|EVALUATE|CREATE", "confidence": 0.0-1.0 }]
}

Classification rules:
- REMEMBER: recall facts, definitions, lists
- UNDERSTAND: explain, summarize, interpret
- APPLY: use procedures in new situations
- ANALYZE: break down, compare, contrast, examine relationships
- EVALUATE: judge, critique, justify, defend
- CREATE: design, construct, produce, synthesize original work

Respond with ONLY the JSON object.`

  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const parsed = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim())

  // Build objective → assessment alignment map
  const assessmentLevels = new Map(
    parsed.assessments.map((a: any) => [a.id.replace('ASN-', ''), a.level])
  )

  return parsed.objectives.map((obj: any) => {
    const objectiveId = obj.id.replace('OBJ-', '')
    const objectiveLevel = obj.level as BloomsLevel

    // Find assignments that assess this objective (by course linkage)
    const relatedAssessments = assignments.map(a => ({
      assignmentId: a.id,
      title: a.title,
      testedLevel: (assessmentLevels.get(a.id) || 'REMEMBER') as BloomsLevel,
      aligned: isBloomsAligned(objectiveLevel, assessmentLevels.get(a.id) || 'REMEMBER'),
    }))

    const alignedCount = relatedAssessments.filter(a => a.aligned).length
    const alignmentScore = relatedAssessments.length > 0
      ? alignedCount / relatedAssessments.length
      : 0

    return {
      objectiveId,
      objectiveText: objectives.find(o => o.id === objectiveId)?.description || '',
      classifiedLevel: objectiveLevel,
      confidence: obj.confidence,
      assessments: relatedAssessments,
      alignmentScore,
      gap: alignmentScore < 0.5
        ? `Objective requires ${objectiveLevel} but most assessments test at lower levels`
        : null,
    }
  })
}

const BLOOMS_ORDER: BloomsLevel[] = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE']

function isBloomsAligned(objectiveLevel: BloomsLevel, assessmentLevel: string): boolean {
  const objIdx = BLOOMS_ORDER.indexOf(objectiveLevel)
  const asnIdx = BLOOMS_ORDER.indexOf(assessmentLevel as BloomsLevel)
  // Assessment should be at or above the objective level
  // Allow one level below as "close enough"
  return asnIdx >= objIdx - 1
}
```

### Service: `app/lib/syllabus-architect/workload-calculator.ts`

```typescript
/**
 * Research-based student workload estimation.
 *
 * Heuristics from:
 *   - Carnegie unit: 2-3 hours outside class per credit hour per week
 *   - Rice University Center for Teaching Excellence workload estimator
 *   - Pace & Middendorf (2004) cognitive load research
 */

import type { CourseUnit, CourseModule, CourseLessonItem, Assignment } from '../../generated/prisma'

// Hours per activity type (conservative estimates)
const ACTIVITY_HOURS: Record<string, number> = {
  lecture: 1.5,          // Attending + reviewing notes
  lab: 2.0,              // Lab time + write-up
  discussion: 1.0,       // Preparation + participation
  reading: 0.05,         // Per page (20 pages/hour)
  quiz: 0.5,             // Short quiz + review
  exam: 4.0,             // Study time for a major exam
  midterm: 6.0,          // Heavier study load
  final: 8.0,            // Comprehensive review
  essay: 3.0,            // Per 1000 words of writing
  'short-paper': 2.0,    // 500-word response
  project: 5.0,          // Major project work session
  'project-milestone': 3.0,
  presentation: 3.0,     // Preparation + practice
  'problem-set': 2.0,    // Typical homework set
  'case-study': 2.5,     // Read + analyze + write-up
  'peer-review': 1.0,    // Reviewing classmate work
  other: 1.5,            // Default fallback
}

export interface WorkloadBreakdown {
  activity: string
  hours: number
  source: string  // unit label or assignment title
}

export interface WeeklyWorkload {
  week: number
  unitLabel: string
  estimatedHours: number
  breakdown: WorkloadBreakdown[]
  isCrush: boolean
  suggestion: string | null
}

export function estimateWeeklyWorkload(
  units: Array<CourseUnit & { modules: Array<CourseModule & { lessons: CourseLessonItem[] }> }>,
  assignments: Assignment[],
  creditHours: number | null
): WeeklyWorkload[] {
  const expectedWeeklyHours = (creditHours || 3) * 3  // Carnegie standard

  const weeks: WeeklyWorkload[] = units.map((unit, idx) => {
    const breakdown: WorkloadBreakdown[] = []

    // Base unit type hours
    const baseType = unit.unitType?.toLowerCase() || 'other'
    breakdown.push({
      activity: baseType,
      hours: ACTIVITY_HOURS[baseType] || ACTIVITY_HOURS.other,
      source: unit.label,
    })

    // Lessons within modules
    for (const mod of unit.modules) {
      for (const lesson of mod.lessons) {
        const lessonType = inferActivityType(lesson.label)
        breakdown.push({
          activity: lessonType,
          hours: ACTIVITY_HOURS[lessonType] || ACTIVITY_HOURS.other,
          source: lesson.label,
        })
      }
    }

    // Assignments due this week
    const weekAssignments = assignments.filter(a => {
      if (!a.dueDate || !unit.startDate) return false
      const due = new Date(a.dueDate)
      const start = new Date(unit.startDate)
      const end = unit.endDate ? new Date(unit.endDate) : new Date(start.getTime() + 7 * 86400000)
      return due >= start && due <= end
    })

    for (const assignment of weekAssignments) {
      const aType = inferActivityType(assignment.title)
      breakdown.push({
        activity: aType,
        hours: ACTIVITY_HOURS[aType] || ACTIVITY_HOURS.other,
        source: assignment.title,
      })
    }

    const estimatedHours = breakdown.reduce((sum, b) => sum + b.hours, 0)

    return {
      week: idx + 1,
      unitLabel: unit.label,
      estimatedHours,
      breakdown,
      isCrush: false,  // computed after all weeks calculated
      suggestion: null,
    }
  })

  // Compute crush weeks (> 1.5x the average)
  const avgHours = weeks.reduce((s, w) => s + w.estimatedHours, 0) / Math.max(weeks.length, 1)
  const crushThreshold = avgHours * 1.5

  for (const week of weeks) {
    week.isCrush = week.estimatedHours > crushThreshold
    if (week.isCrush) {
      const overBy = ((week.estimatedHours - avgHours) / avgHours * 100).toFixed(0)
      week.suggestion = `This week is ${overBy}% above average (${week.estimatedHours.toFixed(1)}h vs ${avgHours.toFixed(1)}h avg). Consider moving an assignment to an adjacent week or making a reading optional.`
    }
  }

  return weeks
}

function inferActivityType(label: string): string {
  const l = label.toLowerCase()
  if (/\bexam\b|\bfinal\b/.test(l)) return 'exam'
  if (/\bmidterm\b/.test(l)) return 'midterm'
  if (/\bquiz\b/.test(l)) return 'quiz'
  if (/\bessay\b|\bpaper\b|\bwrite\b/.test(l)) return 'essay'
  if (/\bproject\b|\bportfolio\b/.test(l)) return 'project'
  if (/\bpresent/.test(l)) return 'presentation'
  if (/\bcase.?study\b/.test(l)) return 'case-study'
  if (/\blab\b/.test(l)) return 'lab'
  if (/\bdiscuss/.test(l)) return 'discussion'
  if (/\bread/.test(l)) return 'reading'
  if (/\bpeer.?review\b/.test(l)) return 'peer-review'
  if (/\bproblem.?set\b|\bhomework\b/.test(l)) return 'problem-set'
  return 'other'
}
```

### API Route: `app/api/courses/[id]/syllabus-analysis/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { analyzeSyllabus } from '../../../lib/syllabus-architect/analysis-service'
import { prisma } from '../../../lib/prisma'

// GET — return cached analysis or compute fresh
export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id: courseId } = await params

  // Check for cached analysis
  const existing = await prisma.syllabusAnalysis.findUnique({ where: { courseId } })
  if (existing) {
    return NextResponse.json(existing)
  }

  // No cached analysis — compute fresh
  const report = await analyzeSyllabus(courseId)
  return NextResponse.json(report)
})

// POST — force re-analysis (e.g., after syllabus update)
export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id: courseId } = await params

  const report = await analyzeSyllabus(courseId)
  return NextResponse.json(report)
})
```

### Component: `app/components/courses/SyllabusReportCard.tsx`

```
┌──────────────────────────────────────────────────────────────────┐
│  Syllabus Report Card                              [Re-analyze] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────┐ │
│  │  B+  │  │ Bloom's  │  │ Workload  │  │ Assess.  │  │Prereq│ │
│  │      │  │  7/10    │  │   5/10    │  │  8/10    │  │ 6/10 │ │
│  │overall│  │ ●●●●●●●○○○│ │ ●●●●●○○○○○│ │ ●●●●●●●●○○│ │●●●●●●○│ │
│  └──────┘  └──────────┘  └───────────┘  └──────────┘  └──────┘ │
│                                                                  │
│  ┌─ Bloom's Heat Map ─────────────────────────────────────────┐ │
│  │           REM  UND  APP  ANA  EVA  CRE                     │ │
│  │  Obj 1:   ░░   ░░   ██   ░░   ░░   ░░  ← assessed at APP │ │
│  │  Obj 2:   ░░   ░░   ░░   ██   ░░   ░░  ← assessed at ANA │ │
│  │  Obj 3:   ██   ░░   ░░   ░░   ░░   ░░  ⚠ obj says CREATE │ │
│  │  Obj 4:   ░░   ░░   ░░   ░░   ██   ░░  ✓ aligned         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Weekly Workload ──────────────────────────────────────────┐ │
│  │  Wk1  ████░░░░░░  4.5h                                    │ │
│  │  Wk2  ██████░░░░  6.0h                                    │ │
│  │  Wk3  ████░░░░░░  4.0h                                    │ │
│  │  Wk4  ████████████████  12.5h  🔴 CRUSH WEEK              │ │
│  │  Wk5  ██████░░░░  5.5h                                    │ │
│  │  ─── avg: 5.2h ─── expected: 9.0h (3 credits) ────────── │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Recommendations ─────────────────────────────────────────┐ │
│  │  🔴 1. Move Week 4 essay to Week 5 (crush week detected)  │ │
│  │  🟡 2. Add formative quiz before midterm (no checkpoints)  │ │
│  │  🟡 3. Objective 3 ("Create...") tested only at REMEMBER   │ │
│  │  🔵 4. Consider adding a peer review assessment            │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**UI Implementation Notes:**
- Pattern A header: `PageHeader` with "Syllabus Report Card" title
- Score tiles: `border rounded-2xl shadow-sm` cards with progress bars (recharts or CSS)
- Heat map: HTML table with `bg-blue-600` filled cells, `bg-gray-100` empty, `bg-red-100` misaligned
- Workload chart: `recharts` horizontal `BarChart`, crush weeks in `fill="#dc2626"`
- Recommendations: sorted cards with severity dot (red/amber/blue), each expandable for detail

---

## Phase 2: Scaffold Builder (Generate from Outcomes)

> **Estimated size:** Medium (1 sprint)
> **Why second:** Unlocks the "no syllabus yet" use case — biggest new user path. Biggest expansion of who can use the platform.

### Service: `app/lib/syllabus-architect/scaffold-generator.ts`

```typescript
interface ScaffoldInput {
  courseId: string
  title: string
  creditHours: number
  semester: string              // "Fall 2026" → derives week count (15 or 16)
  outcomes: string[]            // 3-8 learning outcomes
  discipline: string            // For domain-appropriate assessment types
  preferences: {
    assessmentStyle: 'traditional' | 'project-based' | 'portfolio' | 'mixed'
    weeklyPattern: 'lecture-lab' | 'seminar' | 'flipped' | 'async'
    includeFinalsWeek: boolean
  }
}

interface ScaffoldResult {
  units: GeneratedUnit[]        // Week-by-week breakdown
  assessmentPlan: GeneratedAssessment[]
  prerequisiteEdges: GeneratedEdge[]
  estimatedTotalHours: number
  warnings: string[]            // e.g., "16 weeks is tight for 8 outcomes"
}
```

**Three-pass generation (mirrors existing parse pipeline):**

| Pass | Model | Input | Output |
|---|---|---|---|
| Pass 1: Structure | Haiku | outcomes + preferences + week count | Unit labels, descriptions, sequencing rationale |
| Pass 2: Assessment Placement | Haiku | Pass 1 output + assessment style | Assessment schedule with Bloom's-aligned types and weights |
| Pass 3: Prerequisite Edges | Haiku | Pass 1+2 output | Edge graph + bridging content suggestions |

**UX Flow: `ScaffoldWizard.tsx`**

```
Step 1: Outcomes                 Step 2: Preferences              Step 3: Review
┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────────────┐
│ Learning Outcomes     │        │ How do you teach?    │        │ Generated Structure  │
│                       │        │                       │        │                       │
│ 1. [Analyze...]    [x]│   →   │ ○ Traditional          │   →   │ Week 1: Intro to...  │
│ 2. [Evaluate...]   [x]│        │ ● Project-based       │        │ Week 2: Foundations   │
│ 3. [Create...]     [x]│        │ ○ Portfolio            │        │   └─ Quiz 1          │
│                       │        │ ○ Mixed                │        │ Week 3: Core methods  │
│ [+ Add outcome]       │        │                       │        │   └─ Project M1       │
│                       │        │ Weekly pattern:        │        │ ...                   │
│ Credit hours: [3]     │        │ ○ Lecture + Lab        │        │                       │
│ Semester: [Fall 2026] │        │ ● Seminar              │        │ [Edit any week]       │
│ Discipline: [___]     │        │ ○ Flipped              │        │ [Accept & Create Map] │
│                       │        │ ○ Async                │        │ [Regenerate]          │
│        [Next →]       │        │        [Next →]       │        │                       │
└──────────────────────┘        └──────────────────────┘        └──────────────────────┘
```

**Integration point:** After "Accept & Create Map," call the existing `createCourseMap()` function from `apply-syllabus/route.ts` with the generated ParseResult. This means the scaffold flows into the exact same CourseMap + validation pipeline as uploaded syllabi. No separate code path.

---

## Phase 3: Student Syllabus Agent (Sandy Tool)

> **Estimated size:** Small (0.5 sprint)
> **Why third:** Immediate daily value for students. Straightforward RAG over existing CourseMap + Assignment + CoursePolicy data. Students are the largest user population.

### Sandy Tool Registration: `content-tools.ts`

```typescript
{
  name: 'ask_syllabus',
  description: 'Answer student questions about course structure, due dates, grading policies, and requirements from the syllabus',
  input_schema: {
    type: 'object' as const,
    properties: {
      courseId: { type: 'string', description: 'The course to query' },
      question: { type: 'string', description: 'The student question about the syllabus' },
    },
    required: ['courseId', 'question'],
  },
  handler: async (input: { courseId: string; question: string }) => {
    // 1. Load CourseMap + units + assignments + policies for this course
    const course = await prisma.course.findUniqueOrThrow({
      where: { id: input.courseId },
      include: {
        courseMap: { include: { units: { include: { modules: { include: { lessons: true } } } } } },
        assignments: { orderBy: { dueDate: 'asc' } },
        policies: true,
        objectives: true,
      },
    })

    // 2. Build context document from structured data
    const syllabusContext = buildSyllabusContext(course)

    // 3. Answer question with Haiku (fast, cheap, accurate for factual retrieval)
    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1024,
      system: `You are Sandy, answering a student's question about their course "${course.title}".
Use ONLY the syllabus data provided. If the answer isn't in the data, say so honestly.
Be concise and helpful. Use dates and specifics when available.

${syllabusContext}`,
      messages: [{ role: 'user', content: input.question }],
    })

    return {
      status: 'success',
      message: response.content[0].type === 'text' ? response.content[0].text : 'Unable to answer.',
      data: {
        courseTitle: course.title,
        courseCode: course.courseCode,
      },
    }
  },
  permission: 'auto' as const,
  roles: ['STUDENT', 'EDUCATOR', 'ADMIN'],
  reliability: 'high' as const,
}
```

**Example student queries Sandy can now answer:**
- "What's due next week in TEK-100?" → queries assignments by date range
- "How is my grade calculated?" → queries CoursePolicy records
- "What's the late work policy?" → queries policies
- "I'm behind on the project — what should I prioritize?" → generates recovery plan from remaining assignments weighted by grade impact
- "What are the prereqs for Unit 7?" → queries CourseMap edges
- "Can I skip the reading and still pass?" → analyzes grade weights

---

## Phase 4: Workload Visualization + Assessment Variety

> **Estimated size:** Small (0.5 sprint)
> **Why fourth:** Compelling visual, uses data already computed in Phase 1. Low code, high impact.

### Component: `app/components/courses/WorkloadChart.tsx`

- `recharts` `BarChart` with weekly hours
- Horizontal red dashed line at crush threshold (1.5x average)
- Crush weeks rendered in `fill="#dc2626"` with tooltip: "12.5h — 140% above average"
- Below chart: credit hour ratio indicator ("Your course averages 5.2h/week for 3 credits. Carnegie standard suggests 9h. Students may be underloaded.")

### Component: `app/components/courses/BloomsHeatMap.tsx`

- HTML table: rows = objectives, columns = Bloom's levels (6)
- Cell fills: `bg-blue-600` where objective is classified, `bg-emerald-500` where assessment aligns, `bg-red-200` where misaligned
- Row click → expands to show which specific assignments assess that objective
- Header shows distribution bar: "Your course: 20% Remember, 30% Apply, 50% Create"

### Assessment Variety Score

Computed from the set of assignment types present:

```typescript
function assessmentVarietyScore(assignments: Assignment[]): number {
  const types = new Set(assignments.map(a => inferActivityType(a.title)))
  // Score based on distinct types (max reasonable variety = 6-8 types)
  // 1 type = 0.2, 2 = 0.4, 3 = 0.5, 4 = 0.6, 5 = 0.7, 6 = 0.8, 7+ = 0.9, includes high Bloom's = 1.0
  const typeCount = types.size
  const hasHighBlooms = assignments.some(a => {
    const t = inferActivityType(a.title)
    return ['project', 'presentation', 'essay', 'case-study'].includes(t)
  })
  const base = Math.min(typeCount / 8, 0.9)
  return hasHighBlooms ? Math.min(base + 0.1, 1.0) : base
}
```

---

## Phase 5: Assessment Suggestions per Unit

> **Estimated size:** Small-Medium (0.5 sprint)
> **Why fifth:** Builds on existing rubric generator. Natural extension of the report card — when a gap is found, offer to fix it.

### Service: `app/lib/syllabus-architect/assessment-suggester.ts`

```typescript
interface AssessmentSuggestion {
  title: string
  type: string                  // essay, quiz, project, etc.
  bloomsLevel: BloomsLevel
  rationale: string             // Why this assessment for this unit
  estimatedStudentHours: number
  alignedObjectives: string[]   // Which LearningObjective IDs this assesses
  rubricPreview: {              // Lightweight preview (not full rubric)
    criteria: string[]
    totalPoints: number
  }
}

export async function suggestAssessments(
  courseId: string,
  unitId: string,
  count: number = 3
): Promise<AssessmentSuggestion[]> {
  // Load unit context + course objectives + existing assessments
  // Call Haiku with assessment design prompt
  // Return ranked suggestions at different Bloom's levels
  // Each suggestion includes a "Create this assessment" action that calls
  // the existing generateAndSaveRubric() from assignment-builder.ts
}
```

**Sandy tool:** `suggest_assessments` — educator says "Sandy, what assessment should I add to Week 6?" → Sandy calls this service, presents options as chip-selectable cards.

**UX:** On the CourseMap view, each unit card gets a `+` button → "Suggest Assessment" → shows 3 cards (e.g., "Case Study Analysis" at ANALYZE level, "Reflective Essay" at EVALUATE level, "Group Project Milestone" at CREATE level). Educator picks one → creates Assignment + Rubric in one click.

---

## Phase 6: Pacing Advisor + Bottleneck Detection

> **Estimated size:** Medium (1 sprint)
> **Why sixth:** Requires mid-semester data accumulation. Most powerful when students have 4-6 weeks of activity data.

### Service: `app/lib/syllabus-architect/pacing-advisor.ts`

```typescript
interface PacingReport {
  currentWeek: number
  plannedWeek: number           // Where the syllabus says class should be
  delta: number                 // Positive = ahead, negative = behind
  completionRate: number        // % of assignments submitted on time this unit
  bottlenecks: Bottleneck[]
  recommendations: PacingRecommendation[]
}

interface Bottleneck {
  unitId: string
  unitLabel: string
  signal: 'low-submission-rate' | 'high-late-rate' | 'low-scores' | 'high-time-on-task'
  severity: 'info' | 'warning' | 'critical'
  metric: number                // The actual measured value
  expected: number              // What was expected
  description: string
}

interface PacingRecommendation {
  type: 'compress' | 'expand' | 'reorder' | 'add-checkpoint' | 'make-optional'
  unitId: string
  description: string
  impact: string                // "Recovers ~2 days of schedule"
}
```

**Data sources:**
- Assignment submission timestamps → are students turning things in on time?
- `GradebookEntry` scores → are students passing?
- `ToolSession` durations for Study Buddy → how long are students spending?
- `EngagementFingerprint` learning velocity → is the class faster or slower than predicted?
- CourseMap unit dates → planned schedule

**Cron integration:** `POST /api/cron/pacing-check` — weekly, generates `PacingReport` for all active courses, creates Horizon Rail items for educators with `delta < -2` (more than 2 days behind).

**Sandy tool:** `check_pacing` — educator asks "How's TEK-100 tracking?" → returns narrative summary + action options.

---

## Phase 7: Alternative Pathways + Semester Diff

> **Estimated size:** Medium (1 sprint)
> **Why last:** Most advanced features. Pathways need the full CourseMap + analysis infrastructure. Semester diff needs end-of-semester data.

### Alternative Pathways

For a given CourseMap, AI generates 2-3 variant pathways:

| Pathway | Description | Implementation |
|---|---|---|
| **Accelerated** | For students who demonstrate mastery early | Mark formative assessments as optional, add challenge problems, compress review weeks |
| **Supported** | Extra scaffolding for struggling students | Add bridging lessons, more formative checkpoints, extend deadlines |
| **Applied** | Project-based alternative | Replace traditional assessments with project milestones, add peer review |

Stored as `CourseMapVariant` records. Educator can assign pathways to individual students (future: auto-assign based on `EngagementFingerprint` learning velocity + `ConceptState` mastery data).

### Semester Diff Report

End-of-semester auto-generated comparison:

```typescript
interface SemesterDiff {
  courseId: string
  semester: string
  // What changed
  unitsCompleted: number
  unitsPlanned: number
  unitsSkipped: string[]
  unitsExtended: string[]        // Took longer than planned
  // Performance correlation
  bestUnit: { label: string; avgScore: number; engagement: number }
  worstUnit: { label: string; avgScore: number; engagement: number }
  // Recommendations for next semester
  nextSemesterSuggestions: Array<{
    type: 'keep' | 'expand' | 'replace' | 'reorder' | 'add'
    unit: string
    reason: string
  }>
}
```

**Integration:** The `nextSemesterSuggestions` array pre-populates the Scaffold Builder when the educator creates the same course for a new semester. This creates a **continuous improvement loop**: teach → measure → adjust → teach better.

---

## Sandy Integration Summary

### New Sandy Agent Tools (6 total)

| Tool | Description | Roles | Phase |
|---|---|---|---|
| `analyze_syllabus` | Run/return syllabus report card for a course | EDUCATOR, ADMIN | 1 |
| `ask_syllabus` | Answer student questions from course syllabus data | STUDENT, EDUCATOR, ADMIN | 3 |
| `suggest_assessments` | Suggest assessments for a course unit | EDUCATOR, ADMIN | 5 |
| `check_pacing` | Get mid-semester pacing report for a course | EDUCATOR, ADMIN | 6 |
| `generate_scaffold` | Generate course structure from learning outcomes | EDUCATOR, ADMIN | 2 |
| `get_semester_diff` | Get end-of-semester comparison report | EDUCATOR, ADMIN | 7 |

### Proactive Suggestions (2 new signals)

| Signal | Priority | Condition | Message |
|---|---|---|---|
| `syllabus-unanalyzed` | 6 | Educator has CourseMap but no SyllabusAnalysis | "Your TEK-100 syllabus hasn't been analyzed yet. Want me to check it for gaps?" |
| `pacing-behind` | 8 | PacingReport.delta < -2 days | "TEK-100 is falling behind schedule. Want to see adjustment options?" |

### Concierge Page Context

On `/courses/[id]` pages, inject syllabus analysis summary into Sandy's context:

```typescript
// In concierge-service.ts PAGE_DESCRIPTIONS or describeCurrentPage()
if (pathname.match(/\/courses\/[^/]+$/)) {
  const analysis = await prisma.syllabusAnalysis.findUnique({ where: { courseId } })
  if (analysis) {
    context += `\n<syllabus-analysis grade="${analysis.overallGrade}" blooms="${analysis.bloomsAlignment}" workload="${analysis.workloadBalance}" />`
  }
}
```

---

## Validation Rule Extensions

Add to `app/lib/syllabus-architect/validator.ts`:

| # | Rule | Severity | Description |
|---|---|---|---|
| 8 | `BLOOMS_GAP` | warning | Any objective classified ≥ ANALYZE has no assessment at that level |
| 9 | `WORKLOAD_SPIKE` | warning | Any week exceeds 1.5x the semester average in estimated hours |
| 10 | `ASSESSMENT_CLUSTER` | warning | 3+ assignments due within the same 7-day window |
| 11 | `NO_FORMATIVE` | warning | More than 4 weeks between any two graded items (no formative checkpoints) |
| 12 | `SINGLE_ASSESSMENT_TYPE` | info | All assessments are the same type (e.g., all essays) |

---

## Patent Claims (Strengthened)

This blueprint strengthens the utility patent filing with these novel, interdependent claims:

1. **Multi-pass AI syllabus analysis** producing pedagogical taxonomy alignment scores (Bloom's), not just structure extraction — evaluative, not merely extractive
2. **Automated workload estimation** using research-based heuristics (Carnegie unit) applied to AI-parsed syllabus structure, with crush-week detection
3. **Generative syllabus scaffolding** from declarative learning outcomes with domain-aware assessment placement and prerequisite graph inference
4. **Living syllabus adaptation** where AI monitors actual student performance against planned structure and recommends mid-semester modifications
5. **Cross-semester improvement loop** where end-of-semester analysis automatically informs next-semester scaffold generation
6. **Student-facing syllabus agent** that transforms static course policy into an interactive, queryable knowledge base

**Interdependency chain (Section 101 defense):** Parse → Analyze → Generate → Adapt → Diff → next semester's Generate. Each layer depends on the one below it. The analysis feeds the generation which feeds the adaptation which feeds the next generation cycle. This is a *system*, not a collection of independent features.

---

## Build Order Summary

| Phase | What | Size | Depends On |
|---|---|---|---|
| **1** | Bloom's Audit + Gap Report Card | S-M | Existing syllabus parse pipeline |
| **2** | Scaffold Builder | M | Phase 1 (reuses scoring for validation) |
| **3** | Student Syllabus Agent | S | Existing CourseMap + Assignment data |
| **4** | Workload Visualization | S | Phase 1 (renders computed data) |
| **5** | Assessment Suggestions | S-M | Phase 1 + existing rubric generator |
| **6** | Pacing Advisor + Bottleneck Detection | M | Phase 1 + mid-semester student data |
| **7** | Alternative Pathways + Semester Diff | M | Phases 1-6 (full infrastructure) |
