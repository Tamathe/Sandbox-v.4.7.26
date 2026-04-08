# Blueprint: Assessment Reimagined — Seven Ways to Prove What You Know

> **Sprint Scope:** Replace artifact-only grading with process, judgment, mastery, and impact-based assessment — using infrastructure the platform already has
> **Depends On:** The Commons (13 room types), Study Buddy v2 (7 modes), Grading Service, Concept Mastery, Rubric system, Engagement Fingerprint
> **Unlocks:** Competency-based transcripts, accreditation-ready outcome mapping, cheat-proof assessment at scale, employer-facing portfolios
> **Estimated Size:** Large — 7 phases, each independently deployable (recommend 1 phase per sprint)
> **Patent Relevance:** **HIGH** — "AI-mediated multi-modal assessment system that evaluates cognitive process, decision coherence, teaching ability, and adaptive mastery through conversational agents, branching simulations, and cross-course competency aggregation"

---

## Context

### The Problem

University assessment is stuck in the 1950s. Nearly every course follows the same pattern:

1. Student produces an artifact in isolation (exam, paper, project)
2. Faculty scores it against a rubric
3. Number goes in gradebook
4. Everyone moves on

This model has three fatal flaws in 2026:

**Flaw 1: AI makes artifact grading meaningless.** If a student can paste a prompt into Claude and get an A-quality essay, the essay doesn't prove the student learned anything. Universities are playing whack-a-mole with AI detection tools instead of designing assessments that AI can't fake.

**Flaw 2: Feedback arrives too late.** By the time a student gets midterm results, the learning moment is gone. Assessment happens *after* learning instead of *during* it.

**Flaw 3: Grades measure proxies, not competence.** An A in Biology means "performed well on Biology assessments" — not "can analyze conflicting research findings under time pressure." Employers and graduate programs know this, which is why they interview extensively despite having transcripts.

### The Vision

| Old Model | New Model | Platform Feature |
|-----------|-----------|-----------------|
| Grade the paper | Grade the thinking process that produced it | Process Assessment (Sandy transcript annotation) |
| Right/wrong answers | Decision coherence under ambiguity | Divergence Mapping (Simulation Room) |
| Recall on exams | Can you teach it to someone else? | Teaching Assessment (Teach-Back + Sandy-as-confused-learner) |
| Course-siloed grades | Cross-course competency portfolio | Competency Portfolio (mastery aggregation) |
| Perform for professor | Build something real people use | Authentic Audience Assessment (Tool Builder) |
| Write in isolation | Defend your position under pressure | Cross-Examination Assessment (Debate/Fishbowl) |
| Fixed exam dates | Prove mastery when ready | Adaptive Mastery Gates (SR-powered progression) |

### Why This Is Nearly Cheat-Proof

Every assessment mode evaluates something AI cannot fake:

| Mode | What's Assessed | Why AI Can't Fake It |
|------|----------------|---------------------|
| Process | Journey, revision, metacognition | Requires real-time Sandy interaction over time |
| Divergence | Judgment under ambiguity | No answer key — coherence of reasoning is the metric |
| Teaching | Depth of understanding | Must respond to live Socratic pressure |
| Portfolio | Cross-course competency growth | Aggregated from hundreds of micro-interactions |
| Authentic | Real-world impact | Measured by actual usage from real users |
| Cross-exam | Argument defense | Adversarial, real-time, peer-witnessed |
| Mastery gates | Adaptive, concept-level proficiency | Personalized question paths based on learner model |

### Integration with Existing Systems

| Existing Feature | How It's Extended |
|-----------------|-------------------|
| `GradebookEntry` + `Rubric` system | New `AssessmentEvidence` model links diverse evidence types to gradebook entries |
| `ToolSession.chatMessages` | Sandy transcripts become annotatable assessment evidence |
| `SimulationThread` | Divergence trees become faculty-reviewable assessment artifacts |
| Teach-Back engine | New "formal assessment" mode with gradebook connection |
| Debate + Fishbowl engines | Multi-source scoring (AI + peer + self) feeds rubric breakdown |
| `StudentConceptMastery` + `mastery-decay.ts` | Aggregated across courses into competency portfolio |
| `sr-scheduler.ts` (SM-2) | Powers adaptive mastery gate question selection |
| `process-assessment-service.ts` | Expanded from 4 templates to full process evidence capture |
| `grading-service.ts` (Sonnet scoring) | Extended to score process quality, teaching quality, argument quality |
| `rubric-breakdown-service.ts` | New breakdown dimensions for each assessment mode |
| Tool Builder + Contribute (Horizon 6) | Usage metrics become assessment evidence |
| Engagement Fingerprint | Feeds competency portfolio + mastery gate readiness signals |

---

## Key Files

### Files to Create

| File | Purpose |
|------|---------|
| `app/lib/assessment/evidence-service.ts` | Core: links any activity to a gradebook entry as evidence |
| `app/lib/assessment/process-scoring-service.ts` | AI scoring of Sandy transcript process quality |
| `app/lib/assessment/divergence-service.ts` | Builds divergence trees from SimulationThreads, computes coherence |
| `app/lib/assessment/teachback-assessment-service.ts` | Sandy-as-confused-learner mode, 4D rubric scoring |
| `app/lib/assessment/cross-exam-scoring-service.ts` | Multi-source scoring for Debate/Fishbowl assessments |
| `app/lib/assessment/competency-portfolio-service.ts` | Cross-course mastery aggregation + evidence linking |
| `app/lib/assessment/mastery-gate-service.ts` | Gate definition, adaptive question selection, gap diagnosis |
| `app/lib/assessment/authentic-assessment-service.ts` | Tool usage tracking + impact metrics for assessment |
| `app/lib/assessment/assessment-canvas-service.ts` | Faculty assessment design surface — ties modes to assignments |
| `app/lib/assessment/types.ts` | Shared types, enums, constants for all assessment services |
| `app/api/assessment/evidence/route.ts` | CRUD for assessment evidence |
| `app/api/assessment/process/[sessionId]/route.ts` | Process assessment: annotate, score, review |
| `app/api/assessment/divergence/[roomId]/route.ts` | Divergence assessment: tree, coherence, review |
| `app/api/assessment/teachback/[roomId]/route.ts` | Teach-back assessment: start, score, review |
| `app/api/assessment/cross-exam/[roomId]/route.ts` | Cross-exam assessment: multi-source scores |
| `app/api/assessment/portfolio/route.ts` | Competency portfolio: student view, faculty view |
| `app/api/assessment/mastery-gate/[gateId]/route.ts` | Gate attempts: start, answer, diagnose, unlock |
| `app/api/assessment/canvas/[assignmentId]/route.ts` | Assessment canvas: configure modes per assignment |
| `app/components/assessment/AssessmentEvidencePanel.tsx` | Slide-out panel showing all evidence for a submission |
| `app/components/assessment/ProcessAnnotator.tsx` | Student annotates own Sandy transcript |
| `app/components/assessment/ProcessReviewView.tsx` | Faculty reviews annotated transcript + AI pre-scores |
| `app/components/assessment/DivergenceTree.tsx` | Visual tree of simulation decision paths |
| `app/components/assessment/DivergenceReviewView.tsx` | Faculty reviews divergence with rubric overlay |
| `app/components/assessment/TeachbackAssessmentOverlay.tsx` | Commons overlay for formal teach-back assessment |
| `app/components/assessment/CrossExamScorecard.tsx` | Multi-source score aggregation view |
| `app/components/assessment/CompetencyDashboard.tsx` | Student-facing cross-course mastery map |
| `app/components/assessment/CompetencyFacultyView.tsx` | Faculty/program view of class competency distribution |
| `app/components/assessment/MasteryGatePanel.tsx` | Student gate attempt interface |
| `app/components/assessment/MasteryGateDesigner.tsx` | Faculty designs gates per unit |
| `app/components/assessment/AuthenticMetricsCard.tsx` | Shows tool usage/impact metrics as assessment |
| `app/components/assessment/AssessmentCanvasDesigner.tsx` | Faculty picks assessment modes per assignment |
| `app/assessment/portfolio/page.tsx` | Student competency portfolio page |
| `app/assessment/mastery/[courseId]/page.tsx` | Student mastery gate progression page |
| `app/courses/[id]/assessment-canvas/page.tsx` | Faculty assessment canvas design page |

### Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add 6 new models, 2 enums, extend Assignment + GradebookEntry |
| `app/lib/grading-service.ts` | Accept evidence-based submissions (not just text/file/transcript) |
| `app/lib/commons/simulation-engine.ts` | Add `assessmentMode` flag, persist divergence snapshot on room end |
| `app/lib/commons/teachback-engine.ts` | Add formal assessment flow with gradebook connection |
| `app/lib/commons/debate-engine.ts` | Add multi-source scoring aggregation |
| `app/lib/commons/fishbowl-engine.ts` | Add annotation-based scoring for outer circle |
| `app/lib/concept-mastery-service.ts` | Add cross-course aggregation query |
| `app/lib/sr-scheduler.ts` | Add adaptive gate question selection mode |
| `app/lib/agent/tools/` | New Sandy tools for assessment (6 tools) |
| `app/lib/concierge-service.ts` | Page descriptions for new assessment pages |
| `app/components/StudyBuddyInterface.tsx` | Add mastery gate attempt mode |
| `app/hub/hub-config.ts` | Add Assessment swim lane |
| `app/components/commons/CommonsOverlayRouter.tsx` | Route assessment-mode overlays |

### Files to Read (context, not modify)

| File | Why |
|------|-----|
| `app/lib/process-assessment-service.ts` | Existing 4 templates — extend, don't replace |
| `app/lib/analytics/rubric-breakdown-service.ts` | Reuse `DimensionScore` pattern for new assessment types |
| `app/lib/mastery-decay.ts` | Decay formula for portfolio staleness indicators |
| `app/lib/fingerprint/learning.ts` | Learner profile feeds gate readiness + portfolio |
| `app/lib/commons/peer-review-engine.ts` | Peer scoring pattern to reuse in cross-exam |
| `app/lib/builder-service.ts` | Tool usage data for authentic assessment |

---

## Schema Changes

### New Enum: `AssessmentMode`

```prisma
enum AssessmentMode {
  TRADITIONAL        // Standard submission-based (existing behavior)
  PROCESS            // Sandy transcript + student annotation
  DIVERGENCE         // Simulation Room branching assessment
  TEACHBACK          // Teach-back with Sandy-as-confused-learner
  CROSS_EXAM         // Debate or Fishbowl formal assessment
  AUTHENTIC          // Tool Builder usage + impact
  MASTERY_GATE       // Adaptive mastery checkpoint
}
```

### New Enum: `EvidenceType`

```prisma
enum EvidenceType {
  SANDY_TRANSCRIPT       // ToolSession with chatMessages
  SIMULATION_THREAD      // SimulationThread divergence path
  TEACHBACK_SESSION      // LiveRoom TEACHBACK with AI scores
  PEER_REVIEW_SESSION    // LiveRoom PEER_REVIEW with rubric scores
  DEBATE_SESSION         // LiveRoom DEBATE with fact-checks
  FISHBOWL_SESSION       // LiveRoom FISHBOWL with annotations
  TOOL_USAGE             // Tool Builder published tool metrics
  FLASHCARD_MASTERY      // FlashcardState SR data
  CONCEPT_MASTERY        // StudentConceptMastery snapshot
  STUDENT_ANNOTATION     // Student's own metacognitive reflection
}
```

### New Enum: `GateStatus`

```prisma
enum GateStatus {
  LOCKED           // Prerequisites not met
  AVAILABLE        // Ready to attempt
  IN_PROGRESS      // Currently attempting
  PASSED           // Mastery demonstrated
  FAILED_RETRY     // Failed, can retry after cooldown
}
```

### New Model: `AssessmentEvidence`

The bridge table. Links *any* platform activity to a gradebook entry as evidence.

```prisma
model AssessmentEvidence {
  id              String        @id @default(cuid())
  gradebookEntryId String
  gradebookEntry  GradebookEntry @relation(fields: [gradebookEntryId], references: [id])

  evidenceType    EvidenceType
  sourceId        String       // polymorphic: ToolSession.id, LiveRoom.id, Tool.id, etc.
  sourceLabel     String       // human-readable: "Simulation Room: CEO Crisis", "Study Buddy: Quiz Mode"

  // Student metacognition layer
  studentAnnotation String?    @db.Text  // student's reflection on this evidence
  annotatedAt       DateTime?

  // AI pre-scoring
  aiProcessScore    Float?     // 0-1: quality of thinking process
  aiCoherenceScore  Float?     // 0-1: internal consistency of reasoning
  aiDepthScore      Float?     // 0-1: depth of engagement
  aiScoringRationale String?   @db.Text

  // Faculty review
  facultyScore      Float?     // faculty override score for this evidence
  facultyNotes      String?    @db.Text
  reviewedAt        DateTime?

  weight            Float      @default(1.0)  // relative weight in composite score
  createdAt         DateTime   @default(now())

  @@index([gradebookEntryId])
  @@index([sourceId, evidenceType])
}
```

### New Model: `DivergenceSnapshot`

Persists the decision tree from a Simulation Room for faculty review after the room ends.

```prisma
model DivergenceSnapshot {
  id          String   @id @default(cuid())
  roomId      String
  room        LiveRoom @relation(fields: [roomId], references: [id])

  scenario    String   @db.Text          // opening scenario text
  totalTurns  Int
  treeJson    Json                       // full divergence tree: nodes[], edges[], clusters[]
  clusterCount Int                       // number of distinct ending clusters
  keyDecisionPoints Json                 // turns where paths diverged most [{turn, divergenceScore}]

  // Per-participant summary (denormalized for fast faculty view)
  participantPaths Json                  // [{userId, name, decisions[], endState, coherenceScore}]

  createdAt   DateTime @default(now())

  @@unique([roomId])
}
```

### New Model: `MasteryGate`

Faculty-defined mastery checkpoints per course unit.

```prisma
model MasteryGate {
  id          String   @id @default(cuid())
  courseId     String
  course       Course   @relation(fields: [courseId], references: [id])
  weekId       String?
  week         CourseWeek? @relation(fields: [weekId], references: [id])

  title        String            // "Unit 3 Mastery Gate: Cellular Respiration"
  description  String? @db.Text
  concepts     String[]          // concept slugs that must be mastered
  bloomFloor   Int     @default(3)  // minimum Bloom's level required (1-6)
  passThreshold Float  @default(0.8) // 0-1: required mastery level
  maxAttempts  Int     @default(3)  // 0 = unlimited
  cooldownHours Int    @default(24) // hours between retries
  orderIndex   Int     @default(0)

  // What it unlocks
  unlocksWeekId  String?          // next unit unlocked on pass
  unlocksGateId  String?          // chained gate

  isPublished  Boolean @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  attempts     MasteryGateAttempt[]

  @@index([courseId])
  @@unique([courseId, orderIndex])
}
```

### New Model: `MasteryGateAttempt`

Tracks each student's attempt at a mastery gate.

```prisma
model MasteryGateAttempt {
  id          String      @id @default(cuid())
  gateId      String
  gate        MasteryGate @relation(fields: [gateId], references: [id])
  userId      String
  user        User        @relation(fields: [userId], references: [id])

  status      GateStatus  @default(IN_PROGRESS)
  attemptNumber Int

  // Adaptive assessment data
  questionsAsked   Json    // [{concept, bloomLevel, question, studentAnswer, isCorrect, followUp}]
  totalQuestions   Int     @default(0)
  correctCount     Int     @default(0)
  masteryByConceptJson Json  // {conceptSlug: {score, attempts, gaps[]}}

  // Diagnosis
  gapDiagnosis     Json?   // [{concept, gapType, recommendation, practiceResource}]
  overallScore     Float?  // 0-1 composite mastery

  startedAt    DateTime @default(now())
  completedAt  DateTime?

  @@index([gateId, userId])
  @@unique([gateId, userId, attemptNumber])
}
```

### New Model: `CompetencyRecord`

Cross-course competency aggregation for portfolio view.

```prisma
model CompetencyRecord {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])

  competency    String            // "Critical Thinking", "Quantitative Reasoning", etc.
  category      String            // "Core", "Domain", "Professional"
  level         String            // "Developing", "Proficient", "Advanced", "Expert"
  score         Float             // 0-1 composite
  evidenceCount Int    @default(0)

  // Source aggregation
  courseIds        String[]        // courses that contributed evidence
  evidenceIds      String[]        // AssessmentEvidence ids
  conceptSlugs     String[]        // underlying concept mastery slugs
  bloomHighWater   Int?            // highest Bloom's level demonstrated

  // Temporal
  firstDemonstrated DateTime
  lastDemonstrated  DateTime
  decayedScore      Float?         // score after mastery decay applied

  computedAt    DateTime @default(now())

  @@unique([userId, competency])
  @@index([userId])
}
```

### Extend: `Assignment`

```prisma
// Add to existing Assignment model:
  assessmentMode    AssessmentMode @default(TRADITIONAL)
  assessmentConfig  Json?          // mode-specific config (e.g., simulation scenario, gate concepts)
  evidenceTypes     EvidenceType[] // which evidence types are accepted
  processWeight     Float?         // weight of process vs product (0-1, null = mode default)
```

### Extend: `GradebookEntry`

```prisma
// Add to existing GradebookEntry model:
  evidence          AssessmentEvidence[]
  compositeMethod   String?        // "weighted_average", "highest", "portfolio" — how evidence combines
  processScore      Float?         // AI-scored process quality (separate from content score)
```

### Extend: `LiveRoom`

```prisma
// Add to existing LiveRoom model:
  assessmentMode    Boolean  @default(false)  // true = this room is a formal assessment
  assignmentId      String?                   // links to Assignment for gradebook
  assignment        Assignment? @relation(fields: [assignmentId], references: [id])
  divergenceSnapshot DivergenceSnapshot?
```

---

## Phase 1: Assessment Evidence Layer ✅ COMPLETE (2026-03-31)

> **Estimated size:** Small (foundation — schema + service + API, ~300 lines new code)
> **Why first:** Every subsequent phase needs a way to link activities to gradebook entries. This is the bridge.

### The Concept

Today, a `GradebookEntry` connects to exactly one `Submission`, which contains text, a file, or a tool session transcript. That's it. The entire assessment universe is "submit one thing, get one grade."

The Evidence Layer breaks this open. A single gradebook entry can now accumulate *multiple pieces of evidence* from different platform activities — a Sandy conversation, a Simulation Room path, a Teach-Back score, a tool's real-world usage data. Each piece has its own AI pre-score and optional student annotation. Faculty sees the full picture.

### Service: `app/lib/assessment/types.ts`

```typescript
// ─── Shared types for all assessment services ─────────────────────────

export type AssessmentMode =
  | 'TRADITIONAL'
  | 'PROCESS'
  | 'DIVERGENCE'
  | 'TEACHBACK'
  | 'CROSS_EXAM'
  | 'AUTHENTIC'
  | 'MASTERY_GATE'

export type EvidenceType =
  | 'SANDY_TRANSCRIPT'
  | 'SIMULATION_THREAD'
  | 'TEACHBACK_SESSION'
  | 'PEER_REVIEW_SESSION'
  | 'DEBATE_SESSION'
  | 'FISHBOWL_SESSION'
  | 'TOOL_USAGE'
  | 'FLASHCARD_MASTERY'
  | 'CONCEPT_MASTERY'
  | 'STUDENT_ANNOTATION'

export interface EvidenceInput {
  gradebookEntryId: string
  evidenceType: EvidenceType
  sourceId: string
  sourceLabel: string
  weight?: number
}

export interface ProcessScores {
  processScore: number    // 0-1: did they revise, iterate, engage with pushback?
  coherenceScore: number  // 0-1: is the reasoning internally consistent?
  depthScore: number      // 0-1: surface-level or genuine engagement?
  rationale: string
}

export interface CompetencySnapshot {
  competency: string
  category: 'Core' | 'Domain' | 'Professional'
  level: 'Developing' | 'Proficient' | 'Advanced' | 'Expert'
  score: number
  evidenceCount: number
  courseNames: string[]
  bloomHighWater: number
  trend: 'improving' | 'stable' | 'declining'
}

// Score thresholds for competency levels
export const COMPETENCY_THRESHOLDS = {
  Developing: 0.0,
  Proficient: 0.5,
  Advanced: 0.75,
  Expert: 0.9,
} as const

// Gap types for mastery gate diagnosis
export type GapType = 'misconception' | 'knowledge_gap' | 'transfer_failure' | 'procedural' | 'recall_decay'
```

### Service: `app/lib/assessment/evidence-service.ts`

```typescript
import { prisma } from '../prisma'
import type { EvidenceInput, ProcessScores } from './types'

/** Attach a piece of evidence to a gradebook entry */
export async function createEvidence(input: EvidenceInput) {
  return prisma.assessmentEvidence.create({
    data: {
      gradebookEntryId: input.gradebookEntryId,
      evidenceType: input.evidenceType,
      sourceId: input.sourceId,
      sourceLabel: input.sourceLabel,
      weight: input.weight ?? 1.0,
    },
  })
}

/** Get all evidence for a gradebook entry, ordered by weight desc */
export async function getEvidenceForEntry(gradebookEntryId: string) {
  return prisma.assessmentEvidence.findMany({
    where: { gradebookEntryId },
    orderBy: { weight: 'desc' },
  })
}

/** Student annotates a piece of evidence with metacognitive reflection */
export async function annotateEvidence(
  evidenceId: string,
  userId: string,
  annotation: string
) {
  // Verify the evidence belongs to the student's gradebook entry
  const evidence = await prisma.assessmentEvidence.findUnique({
    where: { id: evidenceId },
    include: { gradebookEntry: { include: { submission: true } } },
  })
  if (!evidence) throw new Error('Evidence not found')
  if (evidence.gradebookEntry.submission.studentId !== userId) {
    throw new Error('Not your evidence')
  }
  return prisma.assessmentEvidence.update({
    where: { id: evidenceId },
    data: { studentAnnotation: annotation, annotatedAt: new Date() },
  })
}

/** Faculty scores a single piece of evidence */
export async function reviewEvidence(
  evidenceId: string,
  facultyId: string,
  score: number,
  notes?: string
) {
  return prisma.assessmentEvidence.update({
    where: { id: evidenceId },
    data: { facultyScore: score, facultyNotes: notes, reviewedAt: new Date() },
  })
}

/** Compute composite score from all evidence for a gradebook entry */
export async function computeCompositeScore(gradebookEntryId: string): Promise<{
  composite: number
  breakdown: { evidenceId: string; label: string; score: number; weight: number }[]
}> {
  const evidence = await getEvidenceForEntry(gradebookEntryId)
  let totalWeight = 0
  let weightedSum = 0
  const breakdown: { evidenceId: string; label: string; score: number; weight: number }[] = []

  for (const e of evidence) {
    const score = e.facultyScore ?? e.aiProcessScore ?? 0
    if (score > 0) {
      totalWeight += e.weight
      weightedSum += score * e.weight
      breakdown.push({
        evidenceId: e.id,
        label: e.sourceLabel,
        score,
        weight: e.weight,
      })
    }
  }

  return {
    composite: totalWeight > 0 ? weightedSum / totalWeight : 0,
    breakdown,
  }
}
```

### API: `app/api/assessment/evidence/route.ts`

```
GET  /api/assessment/evidence?gradebookEntryId=...   → getEvidenceForEntry
POST /api/assessment/evidence                         → createEvidence
PUT  /api/assessment/evidence/[id]/annotate           → annotateEvidence (student)
PUT  /api/assessment/evidence/[id]/review             → reviewEvidence (faculty)
GET  /api/assessment/evidence/[id]/composite          → computeCompositeScore
```

### Component: `AssessmentEvidencePanel.tsx`

Slide-out panel (reuses existing drawer pattern from Student 360). Shows:
- Evidence cards stacked by weight, each showing: type icon, source label, AI pre-scores (3 bars), student annotation (if present), faculty score (if reviewed)
- Composite score at top with weighted breakdown chart
- "Add Evidence" button (links to Sandy, Commons, Tool Builder)
- "Annotate" button on each card (student view)
- "Score" button on each card (faculty view)

---

## Phase 2: Process Assessment — "Show Me How You Think" ✅ COMPLETE (2026-03-31)

> **Estimated size:** Medium (~500 lines new code + component)
> **Why second:** Lowest engineering lift of the 7 modes, highest pedagogical impact. Uses Sandy transcripts that already exist.

### The Concept

Faculty assigns a task where the deliverable isn't a paper — it's a **Sandy session transcript annotated by the student**. The student works through a problem with Sandy (any mode: Socratic, Essay Coach, Tutor, Quiz Master). Afterward, they review their own transcript, highlight key moments, and write reflections: "Here's where I got stuck. Here's where my thinking changed. Here's what I'd do differently."

An AI pre-scores the process on three dimensions:
1. **Revision depth** — Did they iterate? Accept pushback? Change their mind?
2. **Coherence** — Is the reasoning internally consistent across the session?
3. **Metacognitive quality** — Do the student's annotations show genuine self-awareness?

Faculty reviews the annotated transcript alongside the AI pre-scores.

### Service: `app/lib/assessment/process-scoring-service.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import type { ProcessScores } from './types'

const anthropic = new Anthropic()

/** Build a scorable representation of a Sandy session */
export async function buildProcessTranscript(sessionId: string): Promise<{
  messages: { role: string; content: string; timestamp: Date }[]
  annotations: { messageIndex: number; text: string }[]
  sessionMeta: { mode: string; duration: number; messageCount: number }
}> {
  const session = await prisma.toolSession.findUnique({
    where: { id: sessionId },
    include: {
      chatMessages: { orderBy: { createdAt: 'asc' } },
      tool: { select: { name: true } },
    },
  })
  if (!session) throw new Error('Session not found')

  const evidence = await prisma.assessmentEvidence.findFirst({
    where: { sourceId: sessionId, evidenceType: 'SANDY_TRANSCRIPT' },
  })

  return {
    messages: session.chatMessages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.createdAt,
    })),
    annotations: evidence?.studentAnnotation
      ? JSON.parse(evidence.studentAnnotation)
      : [],
    sessionMeta: {
      mode: session.tool?.name ?? 'Unknown',
      duration: session.durationSeconds ?? 0,
      messageCount: session.messageCount,
    },
  }
}

/** AI-score a process transcript on 3 dimensions */
export async function scoreProcess(sessionId: string): Promise<ProcessScores> {
  const transcript = await buildProcessTranscript(sessionId)

  const conversationText = transcript.messages
    .map(m => `[${m.role}]: ${m.content}`)
    .join('\n\n')

  const annotationText = transcript.annotations.length > 0
    ? transcript.annotations
        .map(a => `[Annotation on message ${a.messageIndex}]: ${a.text}`)
        .join('\n')
    : '(No student annotations provided yet)'

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are scoring a student's THINKING PROCESS — not their final answer.

## Conversation Transcript
${conversationText}

## Student Annotations
${annotationText}

## Session Info
Mode: ${transcript.sessionMeta.mode}
Duration: ${Math.round(transcript.sessionMeta.duration / 60)} minutes
Messages: ${transcript.sessionMeta.messageCount}

## Score these three dimensions (0.0 to 1.0 each):

1. **revision_depth**: Did the student iterate on their thinking? Accept pushback? Change their mind when presented with new information? Revise their approach? (0 = never revised, 1 = deep iterative engagement)

2. **coherence**: Is the student's reasoning internally consistent? Do later statements build on earlier ones? Do they connect ideas logically? (0 = contradictory/scattered, 1 = tightly reasoned throughout)

3. **metacognition**: Do the student's annotations (if present) show genuine self-awareness? Can they identify where they struggled and why? (0 = no reflection / superficial, 1 = deep self-awareness with specific insights)

Respond in JSON only:
{"revision_depth": 0.X, "coherence": 0.X, "metacognition": 0.X, "rationale": "2-3 sentence explanation"}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Failed to parse process scores')

  const parsed = JSON.parse(jsonMatch[0])
  const clamp = (v: number) => Math.max(0, Math.min(1, v))

  return {
    processScore: clamp(parsed.revision_depth),
    coherenceScore: clamp(parsed.coherence),
    depthScore: clamp(parsed.metacognition),
    rationale: parsed.rationale ?? '',
  }
}

/** Score and persist to evidence record */
export async function scoreAndPersistProcess(evidenceId: string, sessionId: string) {
  const scores = await scoreProcess(sessionId)
  return prisma.assessmentEvidence.update({
    where: { id: evidenceId },
    data: {
      aiProcessScore: scores.processScore,
      aiCoherenceScore: scores.coherenceScore,
      aiDepthScore: scores.depthScore,
      aiScoringRationale: scores.rationale,
    },
  })
}
```

### API Routes

```
GET  /api/assessment/process/[sessionId]           → buildProcessTranscript
POST /api/assessment/process/[sessionId]/score      → scoreAndPersistProcess
PUT  /api/assessment/process/[sessionId]/annotate   → save inline annotations (array of {messageIndex, text})
```

### Components

**`ProcessAnnotator.tsx`** — Student view:
- Full Sandy transcript displayed as chat bubbles (reuses existing chat bubble styling)
- Each message has a "+" annotation button on hover → inline text field expands below the message
- Annotations are highlighted with a left border accent (amber)
- Summary reflection textarea at bottom: "What did you learn about your own thinking process?"
- Submit button creates `STUDENT_ANNOTATION` evidence + `SANDY_TRANSCRIPT` evidence linked to the assignment's gradebook entry

**`ProcessReviewView.tsx`** — Faculty view:
- Left column: annotated transcript (read-only, annotations visible)
- Right column: AI pre-scores as 3 horizontal bars (Revision Depth, Coherence, Metacognition) + rationale
- Faculty override fields: score slider + notes per dimension
- "Approve AI Score" quick-action button (accepts AI scores as-is)
- Flagging: if AI scores diverge >0.3 from each other, show amber "Review recommended" badge

### Sandy Tools

```
'review_my_process' — Student asks Sandy to preview how their process would score before formal submission.
  Sandy reads the transcript, gives formative feedback: "You revised your thesis twice — great.
  But you didn't engage with my counter-argument in message 7. Consider why."
```

---

## Phase 3: Commons-Based Assessment — Divergence, Teaching, Cross-Examination

> **Estimated size:** Large (~900 lines across 3 sub-modes + components)
> **Why third:** The Commons rooms already run. This phase adds `assessmentMode` flag + gradebook wiring + faculty review views.

### 3A: Divergence Assessment (Simulation Room)

#### The Concept

An educator starts a Simulation Room in **assessment mode**. All students enter the same scenario. Over N turns, they make private decisions. When the room ends, the system:

1. Persists a `DivergenceSnapshot` with the full decision tree
2. Clusters students by ending state
3. Computes a **coherence score** per student (did their decisions follow a consistent logic, or were they random?)
4. Links each student's `SimulationThread` as `AssessmentEvidence` to their gradebook entry
5. Faculty reviews a visual divergence tree with rubric overlay

The assessment is NOT "who got the right answer" — it's "can you articulate a coherent decision framework under ambiguity?"

#### Service: `app/lib/assessment/divergence-service.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'

const anthropic = new Anthropic()

interface TreeNode {
  turn: number
  prompt: string
  branches: { choice: string; participantIds: string[]; childNode?: TreeNode }[]
}

interface ParticipantPath {
  userId: string
  name: string
  decisions: { turn: number; choice: string; narrative: string }[]
  endState: string
  coherenceScore: number
}

/** Build divergence tree from SimulationThreads after room ends */
export async function buildDivergenceTree(roomId: string): Promise<{
  tree: TreeNode
  participants: ParticipantPath[]
  clusterCount: number
  keyDecisionPoints: { turn: number; divergenceScore: number }[]
}> {
  const threads = await prisma.simulationThread.findMany({
    where: { roomId },
    include: { participant: { include: { user: { select: { id: true, name: true } } } } },
    orderBy: [{ participantId: 'asc' }, { turnNumber: 'asc' }],
  })

  // Group threads by participant
  const byParticipant = new Map<string, typeof threads>()
  for (const t of threads) {
    const key = t.participantId
    if (!byParticipant.has(key)) byParticipant.set(key, [])
    byParticipant.get(key)!.push(t)
  }

  // Build participant paths
  const participants: ParticipantPath[] = []
  for (const [, pThreads] of byParticipant) {
    const first = pThreads[0]
    participants.push({
      userId: first.participant.user.id,
      name: first.participant.user.name ?? 'Anonymous',
      decisions: pThreads.map(t => ({
        turn: t.turnNumber,
        choice: t.choice,
        narrative: t.narrative,
      })),
      endState: pThreads[pThreads.length - 1].narrative,
      coherenceScore: 0, // filled by scoreCoherence
    })
  }

  // Compute divergence per turn (how many unique choices)
  const maxTurns = Math.max(...threads.map(t => t.turnNumber))
  const keyDecisionPoints: { turn: number; divergenceScore: number }[] = []
  for (let turn = 1; turn <= maxTurns; turn++) {
    const choicesThisTurn = threads.filter(t => t.turnNumber === turn).map(t => t.choice)
    const unique = new Set(choicesThisTurn).size
    const divergenceScore = unique / Math.max(choicesThisTurn.length, 1)
    keyDecisionPoints.push({ turn, divergenceScore })
  }

  // Cluster by final-turn choice
  const endChoices = new Set(participants.map(p => p.decisions[p.decisions.length - 1]?.choice))
  const clusterCount = endChoices.size

  // Build tree recursively (simplified — turn-by-turn branching)
  const rootPrompt = threads.find(t => t.turnNumber === 1)?.prompt ?? ''
  const tree = buildTreeNode(threads, 1, maxTurns, rootPrompt)

  return { tree, participants, clusterCount, keyDecisionPoints }
}

function buildTreeNode(
  threads: { turnNumber: number; prompt: string; choice: string; participantId: string }[],
  turn: number,
  maxTurns: number,
  prompt: string
): TreeNode {
  const turnThreads = threads.filter(t => t.turnNumber === turn)
  const choiceGroups = new Map<string, string[]>()
  for (const t of turnThreads) {
    if (!choiceGroups.has(t.choice)) choiceGroups.set(t.choice, [])
    choiceGroups.get(t.choice)!.push(t.participantId)
  }

  const branches = [...choiceGroups.entries()].map(([choice, participantIds]) => {
    const nextPrompt = threads.find(
      t => t.turnNumber === turn + 1 && participantIds.includes(t.participantId)
    )?.prompt ?? ''
    return {
      choice,
      participantIds,
      childNode: turn < maxTurns ? buildTreeNode(threads, turn + 1, maxTurns, nextPrompt) : undefined,
    }
  })

  return { turn, prompt, branches }
}

/** AI-score coherence of a single participant's decision path */
export async function scoreCoherence(
  participantPath: ParticipantPath,
  scenario: string
): Promise<{ coherenceScore: number; rationale: string }> {
  const decisionText = participantPath.decisions
    .map(d => `Turn ${d.turn}: Chose "${d.choice}" → ${d.narrative}`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Scenario: ${scenario}

Participant "${participantPath.name}" made these decisions:
${decisionText}

Score the COHERENCE of their decision-making (0.0 to 1.0):
- Did their decisions follow a consistent internal logic or philosophy?
- Did later decisions build on earlier ones?
- Could you articulate the framework they were using?

This is NOT about right/wrong — it's about whether the decisions form a coherent strategy.

Respond JSON only: {"coherence": 0.X, "rationale": "1-2 sentences"}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)![0])
  return {
    coherenceScore: Math.max(0, Math.min(1, parsed.coherence)),
    rationale: parsed.rationale,
  }
}

/** Persist divergence snapshot after room ends */
export async function persistDivergenceSnapshot(roomId: string) {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: { config: true },
  })
  const config = room?.config as { customScenario?: string } | null
  const result = await buildDivergenceTree(roomId)

  // Score each participant's coherence
  const scenario = config?.customScenario ?? '(scenario from room)'
  for (const p of result.participants) {
    const scored = await scoreCoherence(p, scenario)
    p.coherenceScore = scored.coherenceScore
  }

  return prisma.divergenceSnapshot.create({
    data: {
      roomId,
      scenario,
      totalTurns: result.keyDecisionPoints.length,
      treeJson: result.tree as object,
      clusterCount: result.clusterCount,
      keyDecisionPoints: result.keyDecisionPoints as object[],
      participantPaths: result.participants as object[],
    },
  })
}
```

#### Modification: `simulation-engine.ts`

When `room.assessmentMode === true` and room phase transitions to `COMPLETE`:
1. Call `persistDivergenceSnapshot(roomId)`
2. For each participant, call `createEvidence()` linking their `SimulationThread` to the assignment's gradebook entry

#### Component: `DivergenceTree.tsx`

Visual tree using nested expandable nodes (no external graph library — simple indented tree with colored branches):
- Each turn is a horizontal row
- Branches fan out where choices diverge
- Student count per branch shown as pill badge
- Color intensity = divergence score (red = high divergence turn)
- Click a participant name → highlights their path through the tree
- Coherence score shown next to each participant name

#### Component: `DivergenceReviewView.tsx`

Faculty view:
- Left: `DivergenceTree` component
- Right: Selected participant's full narrative + coherence score + rationale
- Rubric overlay: faculty can score "Decision Framework Articulation" (did the student's post-simulation reflection explain their reasoning?)
- Cluster summary: "5 students ended in Cluster A (transparency), 3 in Cluster B (damage control)"

---

### 3B: Teaching Assessment (Teach-Back)

#### The Concept

Faculty creates a **formal Teach-Back assessment** from the course page. Instead of a random concept assignment, faculty specifies exact concepts per student (or randomized from a pool). Sandy plays a **confused learner** who asks increasingly pointed follow-up questions based on the course's known misconception taxonomy.

The scoring rubric has 4 dimensions (matching existing Teaching Coach): **Clarity**, **Depth**, **Engagement**, **Accuracy**. AI scores in real-time. Faculty reviews.

#### Service: `app/lib/assessment/teachback-assessment-service.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'

const anthropic = new Anthropic()

/** Build Sandy's confused-learner system prompt for a specific concept */
export function buildConfusedLearnerPrompt(
  concept: string,
  courseTitle: string,
  commonMisconceptions: string[]
): string {
  return `You are Sandy, playing the role of a confused but eager student in "${courseTitle}".
The student teaching you is being ASSESSED on their ability to explain "${concept}".

Your job:
1. Start genuinely confused. Ask a basic "I don't get it" question.
2. As they explain, ask increasingly specific follow-up questions.
3. Introduce common misconceptions naturally: ${commonMisconceptions.map(m => `"${m}"`).join(', ')}
4. If their explanation is shallow, push deeper: "But WHY does that work?"
5. If their explanation contradicts itself, gently point it out: "Wait, earlier you said X but now you're saying Y?"
6. When they've demonstrated genuine understanding (or clearly haven't), signal readiness to wrap up.

IMPORTANT: You are NOT trying to trick them. You are trying to find out if they TRULY understand.
Be warm, curious, and encouraging — but don't let shallow answers slide.

After each student message, emit a hidden scoring marker:
<!--TEACHBACK_SCORE:{"clarity":X,"depth":X,"engagement":X,"accuracy":X}-->
where each dimension is 1-5.

Also emit <!--PHASE:teaching--> during active teaching and <!--PHASE:wrapup--> when ready to conclude.`
}

/** Score a completed teach-back session */
export async function scoreTeachback(roomId: string, participantId: string): Promise<{
  clarity: number
  depth: number
  engagement: number
  accuracy: number
  composite: number
  feedback: string
}> {
  // Extract scoring markers from chat history
  const messages = await prisma.channelMessage.findMany({
    where: { liveRoomId: roomId },
    orderBy: { createdAt: 'asc' },
  })

  const scoreMarkers: { clarity: number; depth: number; engagement: number; accuracy: number }[] = []
  for (const msg of messages) {
    const match = msg.content.match(/<!--TEACHBACK_SCORE:(\{.*?\})-->/)
    if (match) {
      try {
        scoreMarkers.push(JSON.parse(match[1]))
      } catch { /* skip malformed */ }
    }
  }

  // Average the per-message scores (later messages weighted more — student may improve as they go)
  const weights = scoreMarkers.map((_, i) => 1 + i * 0.5)  // increasing weight
  const totalWeight = weights.reduce((a, b) => a + b, 0)

  const avg = (dim: 'clarity' | 'depth' | 'engagement' | 'accuracy') =>
    scoreMarkers.reduce((sum, s, i) => sum + s[dim] * weights[i], 0) / totalWeight

  const clarity = avg('clarity')
  const depth = avg('depth')
  const engagement = avg('engagement')
  const accuracy = avg('accuracy')
  const composite = (clarity + depth + engagement + accuracy) / 4

  // Generate holistic feedback
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `A student just completed a teach-back assessment. Scores (1-5):
Clarity: ${clarity.toFixed(1)}, Depth: ${depth.toFixed(1)}, Engagement: ${engagement.toFixed(1)}, Accuracy: ${accuracy.toFixed(1)}

Write 2-3 sentences of specific, constructive feedback for the student. What did they do well? What should they work on? Be encouraging but honest.`,
    }],
  })

  const feedback = response.content[0].type === 'text' ? response.content[0].text : ''

  return {
    clarity: Math.round(clarity * 10) / 10,
    depth: Math.round(depth * 10) / 10,
    engagement: Math.round(engagement * 10) / 10,
    accuracy: Math.round(accuracy * 10) / 10,
    composite: Math.round(composite * 10) / 10,
    feedback,
  }
}
```

#### Modification: `teachback-engine.ts`

When `room.assessmentMode === true`:
- Use `buildConfusedLearnerPrompt()` for Sandy's system prompt instead of default
- On room `COMPLETE`, call `scoreTeachback()` per participant
- Create `TEACHBACK_SESSION` evidence linked to the assignment's gradebook entry
- Persist scores in evidence `aiProcessScore` (composite normalized to 0-1)

#### Component: `TeachbackAssessmentOverlay.tsx`

Extends existing `CommonsOverlayRouter` with assessment-specific UI:
- Same chat interface, but header shows "Assessment Mode" badge in amber
- Live 4-dimension score radar chart updates as student teaches (visible only to faculty)
- Concept shown in sticky header: "Teach Sandy about: Cellular Respiration"
- Timer optional (faculty can set time limit in assignment config)

---

### 3C: Cross-Examination Assessment (Debate + Fishbowl)

#### The Concept

Faculty creates a Debate or Fishbowl room in **assessment mode**. Three scoring sources are combined:

1. **AI scoring** — Sandy fact-checks claims, scores argument quality
2. **Peer scoring** — Other participants rate arguments (already exists in Debate engine)
3. **Self-assessment** — Student reflects on their own performance post-session

Each source gets a configurable weight (default: AI 40%, Peer 40%, Self 20%). The composite feeds the gradebook.

#### Service: `app/lib/assessment/cross-exam-scoring-service.ts`

```typescript
import { prisma } from '../prisma'

interface MultiSourceScore {
  ai: { argumentQuality: number; evidenceUse: number; rebuttals: number; overall: number }
  peer: { ratings: number[]; average: number }
  self: { score: number; reflection: string }
  composite: number
  weights: { ai: number; peer: number; self: number }
}

/** Aggregate multi-source scores for a debate/fishbowl participant */
export async function aggregateCrossExamScores(
  roomId: string,
  userId: string,
  config: { aiWeight?: number; peerWeight?: number; selfWeight?: number } = {}
): Promise<MultiSourceScore> {
  const aiWeight = config.aiWeight ?? 0.4
  const peerWeight = config.peerWeight ?? 0.4
  const selfWeight = config.selfWeight ?? 0.2

  // AI scores from Sandy's fact-check markers in chat
  const messages = await prisma.channelMessage.findMany({
    where: { liveRoomId: roomId },
    orderBy: { createdAt: 'asc' },
  })

  // Extract <!--DEBATE_SCORE:{...}--> markers attributed to this user
  const aiScores = { argumentQuality: 0, evidenceUse: 0, rebuttals: 0, count: 0 }
  for (const msg of messages) {
    const match = msg.content.match(/<!--DEBATE_SCORE:(\{.*?\})-->/)
    if (match) {
      try {
        const s = JSON.parse(match[1])
        if (s.userId === userId) {
          aiScores.argumentQuality += s.argumentQuality ?? 0
          aiScores.evidenceUse += s.evidenceUse ?? 0
          aiScores.rebuttals += s.rebuttals ?? 0
          aiScores.count++
        }
      } catch { /* skip */ }
    }
  }

  const aiOverall = aiScores.count > 0
    ? ((aiScores.argumentQuality + aiScores.evidenceUse + aiScores.rebuttals) / (aiScores.count * 3)) / 5
    : 0

  // Peer scores from LiveRoomResponse (votes) — normalized to 0-1
  const responses = await prisma.liveRoomResponse.findMany({
    where: { round: { roomId } },
    include: { participant: true },
  })
  const peerRatings = responses
    .filter(r => r.participant.userId === userId)
    .map(r => r.selectedIndex / 5) // normalize assuming 1-5 scale
  const peerAvg = peerRatings.length > 0
    ? peerRatings.reduce((a, b) => a + b, 0) / peerRatings.length
    : 0

  // Self-assessment stored as evidence annotation
  const evidence = await prisma.assessmentEvidence.findFirst({
    where: { sourceId: roomId, evidenceType: 'DEBATE_SESSION' },
  })
  const selfScore = evidence?.studentAnnotation
    ? JSON.parse(evidence.studentAnnotation).selfScore ?? 0
    : 0

  const composite = aiOverall * aiWeight + peerAvg * peerWeight + selfScore * selfWeight

  return {
    ai: {
      argumentQuality: aiScores.count > 0 ? aiScores.argumentQuality / aiScores.count : 0,
      evidenceUse: aiScores.count > 0 ? aiScores.evidenceUse / aiScores.count : 0,
      rebuttals: aiScores.count > 0 ? aiScores.rebuttals / aiScores.count : 0,
      overall: aiOverall,
    },
    peer: { ratings: peerRatings, average: peerAvg },
    self: { score: selfScore, reflection: evidence?.studentAnnotation ?? '' },
    composite,
    weights: { ai: aiWeight, peer: peerWeight, self: selfWeight },
  }
}
```

#### Component: `CrossExamScorecard.tsx`

Three-column layout:
- **AI Assessment** — argument quality, evidence use, rebuttal quality (3 bars + overall)
- **Peer Assessment** — distribution chart of peer ratings + average
- **Self-Assessment** — student's self-score + reflection text
- **Composite** — weighted total with adjustable weight sliders (faculty can rebalance)
- **Transcript excerpts** — key moments highlighted (strongest argument, weakest rebuttal)

---

## Phase 4: Competency Portfolio — "Your Degree Is a Living Document"

> **Estimated size:** Medium (~600 lines: service + 2 components + API)
> **Why fourth:** Requires evidence layer (Phase 1) + at least one assessment mode generating evidence. Delivers the highest-visibility student-facing feature.

### The Concept

A student opens their **Competency Portfolio** and sees not "A in Biology, B+ in Chemistry" but:

> **Critical Thinking: Advanced** (demonstrated in NURS 301 Simulation, CHEM 201 Case Study, BIO 110 Teach-Back)
> **Patient Communication: Developing** (1 Teach-Back session, no Simulation evidence — consider NURS 310 practice)
> **Quantitative Reasoning: Proficient** (15 mastery gate passes across MATH 113, STAT 200, ECON 101)

Each competency links to real evidence. Click "Critical Thinking" → see the Simulation Room transcript where they navigated an ethical dilemma, the Case Study room where they revised their hypothesis 3 times, the Teach-Back where they explained gene expression to Sandy.

### Service: `app/lib/assessment/competency-portfolio-service.ts`

```typescript
import { prisma } from '../prisma'
import { applyMasteryDecay } from '../mastery-decay'
import type { CompetencySnapshot } from './types'
import { COMPETENCY_THRESHOLDS } from './types'

/** Institutional competency framework — maps concepts to competencies */
const COMPETENCY_MAP: Record<string, { category: 'Core' | 'Domain' | 'Professional'; concepts: string[] }> = {
  'Critical Thinking': {
    category: 'Core',
    concepts: ['analysis', 'evaluation', 'synthesis', 'logical-reasoning', 'evidence-assessment'],
  },
  'Quantitative Reasoning': {
    category: 'Core',
    concepts: ['statistics', 'data-interpretation', 'mathematical-modeling', 'probability'],
  },
  'Written Communication': {
    category: 'Core',
    concepts: ['argumentation', 'clarity', 'structure', 'revision', 'audience-awareness'],
  },
  'Oral Communication': {
    category: 'Core',
    concepts: ['presentation', 'teaching', 'debate', 'articulation', 'responsiveness'],
  },
  'Ethical Reasoning': {
    category: 'Core',
    concepts: ['ethical-frameworks', 'stakeholder-analysis', 'moral-reasoning', 'decision-coherence'],
  },
  'Collaborative Problem-Solving': {
    category: 'Professional',
    concepts: ['teamwork', 'peer-feedback', 'conflict-resolution', 'delegation'],
  },
  'Information Literacy': {
    category: 'Core',
    concepts: ['source-evaluation', 'research-methodology', 'citation', 'ai-literacy'],
  },
  'Adaptability': {
    category: 'Professional',
    concepts: ['transfer-learning', 'novel-problem-solving', 'cross-domain', 'resilience'],
  },
}

function scoreToLevel(score: number): 'Developing' | 'Proficient' | 'Advanced' | 'Expert' {
  if (score >= COMPETENCY_THRESHOLDS.Expert) return 'Expert'
  if (score >= COMPETENCY_THRESHOLDS.Advanced) return 'Advanced'
  if (score >= COMPETENCY_THRESHOLDS.Proficient) return 'Proficient'
  return 'Developing'
}

/** Recompute all competency records for a user */
export async function recomputePortfolio(userId: string): Promise<CompetencySnapshot[]> {
  // 1. Load all concept masteries
  const masteries = await prisma.studentConceptMastery.findMany({
    where: { userId },
    include: { firstCourse: { select: { id: true, title: true } } },
  })

  // 2. Load all assessment evidence
  const evidence = await prisma.assessmentEvidence.findMany({
    where: { gradebookEntry: { submission: { studentId: userId } } },
    include: { gradebookEntry: { include: { submission: { select: { assignment: { select: { courseId: true, course: { select: { title: true } } } } } } } } },
  })

  const snapshots: CompetencySnapshot[] = []

  for (const [competency, def] of Object.entries(COMPETENCY_MAP)) {
    // Find matching masteries
    const relevant = masteries.filter(m =>
      def.concepts.some(c => m.concept.toLowerCase().includes(c))
    )

    if (relevant.length === 0) {
      // No evidence yet — skip (don't create empty records)
      continue
    }

    // Apply decay and average
    const decayedScores = relevant.map(m => {
      const decayed = applyMasteryDecay(m)
      return { score: decayed, courseId: m.firstCourseId, courseName: m.firstCourse?.title }
    })
    const avgScore = decayedScores.reduce((s, d) => s + d.score, 0) / decayedScores.length

    // Count evidence pieces
    const relevantEvidence = evidence.filter(e => {
      const courseId = e.gradebookEntry.submission.assignment?.courseId
      return courseId && decayedScores.some(d => d.courseId === courseId)
    })

    // Bloom's high water
    const blooms = relevant.map(m => {
      const sessions = masteries.filter(s => s.concept === m.concept)
      return sessions.length // rough proxy; real impl would query ToolSession.bloomLevel
    })
    const bloomHigh = Math.max(...blooms, 1)

    // Determine trend from first/last mastery timestamps
    const sorted = relevant.sort((a, b) => a.firstSeenAt.getTime() - b.firstSeenAt.getTime())
    const firstHalf = sorted.slice(0, Math.ceil(sorted.length / 2))
    const secondHalf = sorted.slice(Math.ceil(sorted.length / 2))
    const firstAvg = firstHalf.reduce((s, m) => s + m.masteryLevel, 0) / firstHalf.length
    const secondAvg = secondHalf.length > 0
      ? secondHalf.reduce((s, m) => s + m.masteryLevel, 0) / secondHalf.length
      : firstAvg
    const trend = secondAvg > firstAvg + 0.1 ? 'improving' : secondAvg < firstAvg - 0.1 ? 'declining' : 'stable'

    const courseNames = [...new Set(decayedScores.map(d => d.courseName).filter(Boolean))] as string[]

    snapshots.push({
      competency,
      category: def.category,
      level: scoreToLevel(avgScore),
      score: Math.round(avgScore * 100) / 100,
      evidenceCount: relevantEvidence.length + relevant.length,
      courseNames,
      bloomHighWater: bloomHigh,
      trend,
    })

    // Upsert CompetencyRecord
    await prisma.competencyRecord.upsert({
      where: { userId_competency: { userId, competency } },
      create: {
        userId,
        competency,
        category: def.category,
        level: scoreToLevel(avgScore),
        score: avgScore,
        evidenceCount: relevantEvidence.length + relevant.length,
        courseIds: [...new Set(decayedScores.map(d => d.courseId).filter(Boolean))] as string[],
        evidenceIds: relevantEvidence.map(e => e.id),
        conceptSlugs: relevant.map(m => m.concept),
        bloomHighWater: bloomHigh,
        firstDemonstrated: sorted[0].firstSeenAt,
        lastDemonstrated: sorted[sorted.length - 1].lastSeenAt,
        decayedScore: avgScore,
      },
      update: {
        level: scoreToLevel(avgScore),
        score: avgScore,
        evidenceCount: relevantEvidence.length + relevant.length,
        courseIds: [...new Set(decayedScores.map(d => d.courseId).filter(Boolean))] as string[],
        evidenceIds: relevantEvidence.map(e => e.id),
        conceptSlugs: relevant.map(m => m.concept),
        bloomHighWater: bloomHigh,
        lastDemonstrated: sorted[sorted.length - 1].lastSeenAt,
        decayedScore: avgScore,
        computedAt: new Date(),
      },
    })
  }

  return snapshots.sort((a, b) => b.score - a.score)
}

/** Get portfolio for student (reads cached records, recomputes if stale) */
export async function getPortfolio(userId: string): Promise<CompetencySnapshot[]> {
  const records = await prisma.competencyRecord.findMany({
    where: { userId },
    orderBy: { score: 'desc' },
  })

  // If no records or oldest is >24h stale, recompute
  const oldest = records.length > 0
    ? Math.min(...records.map(r => r.computedAt.getTime()))
    : 0
  if (Date.now() - oldest > 24 * 60 * 60 * 1000) {
    return recomputePortfolio(userId)
  }

  return records.map(r => ({
    competency: r.competency,
    category: r.category as 'Core' | 'Domain' | 'Professional',
    level: r.level as 'Developing' | 'Proficient' | 'Advanced' | 'Expert',
    score: r.decayedScore ?? r.score,
    evidenceCount: r.evidenceCount,
    courseNames: [], // would need join; OK for cached view
    bloomHighWater: r.bloomHighWater ?? 1,
    trend: 'stable', // would need temporal analysis; OK for cached view
  }))
}

/** Faculty view: class-level competency distribution (FERPA-safe — no individual students) */
export async function getClassCompetencyDistribution(courseId: string): Promise<{
  competency: string
  developing: number
  proficient: number
  advanced: number
  expert: number
}[]> {
  // Get all students in this course
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    select: { studentId: true },
  })
  const studentIds = enrollments.map(e => e.studentId)

  const records = await prisma.competencyRecord.findMany({
    where: { userId: { in: studentIds }, courseIds: { has: courseId } },
  })

  // Group by competency and count levels
  const grouped = new Map<string, { developing: number; proficient: number; advanced: number; expert: number }>()
  for (const r of records) {
    if (!grouped.has(r.competency)) {
      grouped.set(r.competency, { developing: 0, proficient: 0, advanced: 0, expert: 0 })
    }
    const g = grouped.get(r.competency)!
    const level = r.level.toLowerCase() as 'developing' | 'proficient' | 'advanced' | 'expert'
    g[level]++
  }

  return [...grouped.entries()].map(([competency, dist]) => ({
    competency,
    ...dist,
  }))
}
```

### API Routes

```
GET  /api/assessment/portfolio                   → getPortfolio (student's own)
POST /api/assessment/portfolio/recompute          → recomputePortfolio (force refresh)
GET  /api/assessment/portfolio/class/[courseId]    → getClassCompetencyDistribution (faculty)
```

### Component: `CompetencyDashboard.tsx` (student page at `/assessment/portfolio`)

Layout:
- **Hero strip**: 8 competency cards in a 2×4 grid, each showing: competency name, level badge (color-coded: gray→blue→purple→gold), score bar, trend arrow, evidence count
- **Detail panel** (click a card): list of evidence sources with links to transcripts/sessions, course names, Bloom's level indicator, mastery decay curve visualization
- **Gaps section** at bottom: competencies with < 3 evidence pieces highlighted with "Build evidence in..." suggestions (links to relevant Commons rooms, Study Buddy modes)
- **Share button**: generates a read-only portfolio URL (future: employer/program view)

### Component: `CompetencyFacultyView.tsx`

Stacked horizontal bar chart per competency showing class distribution (Developing/Proficient/Advanced/Expert). No individual student names (FERPA). Click a competency → see which assessment activities contributed most evidence.

### Sandy Tools

```
'check_my_competencies' — Student asks Sandy where they stand. Sandy reads portfolio,
  highlights strengths and gaps, suggests specific actions: "Your Oral Communication is
  Developing — try a Teach-Back session in your Biology study group this week."

'suggest_evidence_opportunity' — Sandy recommends the best next activity to build
  evidence for a weak competency. Considers course enrollments, upcoming assignments,
  and available Commons rooms.
```

---

## Phase 5: Adaptive Mastery Gates — "Prove It When You're Ready"

> **Estimated size:** Large (~700 lines: service + gate designer + student gate UI + SR integration)
> **Why fifth:** Requires concept mastery infrastructure + SR scheduler. The biggest pedagogical shift — replaces fixed exam dates with mastery-based progression.

### The Concept

Instead of "Midterm on October 15," a faculty member defines **mastery gates** per unit:

> **Gate: Cellular Respiration** — Demonstrate proficiency on 5 concepts (glycolysis, Krebs cycle, ETC, ATP synthesis, fermentation) at Bloom's Level 3+ to unlock Unit 4.

When a student is ready, they enter the gate. Sandy administers an **adaptive assessment** that:
1. Starts at the expected Bloom's level
2. Gets harder if the student answers correctly (probes deeper understanding)
3. Gets easier if they struggle (finds the boundary of their knowledge)
4. Covers all required concepts (no skipping)
5. Diagnoses specific gap types when they fail: misconception, knowledge gap, transfer failure, procedural error, or recall decay

If they pass, they move on. If not, Sandy prescribes targeted practice and they can retry after a cooldown period.

### Service: `app/lib/assessment/mastery-gate-service.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import { computeNextReview, getDueConcepts } from '../sr-scheduler'
import type { GapType } from './types'

const anthropic = new Anthropic()

const BLOOM_LABELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']

interface AdaptiveQuestion {
  concept: string
  bloomLevel: number
  question: string
  expectedAnswer: string  // for AI grading, not shown to student
}

interface GapDiagnosis {
  concept: string
  gapType: GapType
  explanation: string
  recommendation: string
}

/** Check if a student can attempt a gate */
export async function checkGateAvailability(gateId: string, userId: string): Promise<{
  available: boolean
  reason?: string
  nextAvailableAt?: Date
}> {
  const gate = await prisma.masteryGate.findUnique({
    where: { id: gateId },
    include: { attempts: { where: { userId }, orderBy: { startedAt: 'desc' } } },
  })
  if (!gate) return { available: false, reason: 'Gate not found' }
  if (!gate.isPublished) return { available: false, reason: 'Gate not yet published' }

  const attempts = gate.attempts
  const completedAttempts = attempts.filter(a => a.status !== 'IN_PROGRESS')

  // Already passed?
  if (completedAttempts.some(a => a.status === 'PASSED')) {
    return { available: false, reason: 'Already passed' }
  }

  // Max attempts reached?
  if (gate.maxAttempts > 0 && completedAttempts.length >= gate.maxAttempts) {
    return { available: false, reason: `Maximum ${gate.maxAttempts} attempts reached` }
  }

  // Cooldown active?
  const lastAttempt = completedAttempts[0]
  if (lastAttempt) {
    const cooldownEnd = new Date(lastAttempt.completedAt!.getTime() + gate.cooldownHours * 60 * 60 * 1000)
    if (new Date() < cooldownEnd) {
      return { available: false, reason: 'Cooldown active', nextAvailableAt: cooldownEnd }
    }
  }

  return { available: true }
}

/** Start a gate attempt — generate first adaptive question */
export async function startGateAttempt(gateId: string, userId: string): Promise<{
  attemptId: string
  firstQuestion: AdaptiveQuestion
}> {
  const gate = await prisma.masteryGate.findUnique({ where: { id: gateId } })
  if (!gate) throw new Error('Gate not found')

  const existingAttempts = await prisma.masteryGateAttempt.count({
    where: { gateId, userId },
  })

  const attempt = await prisma.masteryGateAttempt.create({
    data: {
      gateId,
      userId,
      attemptNumber: existingAttempts + 1,
      status: 'IN_PROGRESS',
      questionsAsked: [],
      masteryByConceptJson: {},
    },
  })

  // Start with the first concept at the gate's bloom floor
  const firstConcept = gate.concepts[0]
  const question = await generateAdaptiveQuestion(firstConcept, gate.bloomFloor, gate.courseId)

  return { attemptId: attempt.id, firstQuestion: question }
}

/** Generate an adaptive question for a concept at a specific Bloom's level */
async function generateAdaptiveQuestion(
  concept: string,
  bloomLevel: number,
  courseId: string
): Promise<AdaptiveQuestion> {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } })

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Generate ONE assessment question for a university student.

Course: ${course?.title ?? 'Unknown'}
Concept: ${concept}
Bloom's Level: ${BLOOM_LABELS[bloomLevel - 1]} (Level ${bloomLevel}/6)

The question must genuinely require Level ${bloomLevel} thinking — not just recall dressed up as analysis.

Bloom's level guide:
1-Remember: Recall facts
2-Understand: Explain in own words
3-Apply: Use in a new situation
4-Analyze: Break down, compare, identify patterns
5-Evaluate: Judge, critique, defend a position
6-Create: Design, synthesize, propose original solution

Respond JSON only:
{"question": "...", "expected_answer": "key points the student should hit"}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)![0])

  return {
    concept,
    bloomLevel,
    question: parsed.question,
    expectedAnswer: parsed.expected_answer,
  }
}

/** Process student's answer and determine next question or conclude */
export async function processGateAnswer(
  attemptId: string,
  answer: string
): Promise<{
  correct: boolean
  feedback: string
  nextQuestion?: AdaptiveQuestion
  completed?: boolean
  passed?: boolean
  gapDiagnosis?: GapDiagnosis[]
}> {
  const attempt = await prisma.masteryGateAttempt.findUnique({
    where: { id: attemptId },
    include: { gate: true },
  })
  if (!attempt) throw new Error('Attempt not found')

  const questions = attempt.questionsAsked as {
    concept: string; bloomLevel: number; question: string;
    studentAnswer?: string; isCorrect?: boolean; expectedAnswer: string
  }[]
  const currentQ = questions[questions.length - 1]
  if (!currentQ) throw new Error('No current question')

  // Grade the answer with AI
  const gradeResponse = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Question (Bloom's Level ${currentQ.bloomLevel}): ${currentQ.question}
Expected key points: ${currentQ.expectedAnswer}
Student's answer: ${answer}

Grade this answer. Did the student demonstrate Level ${currentQ.bloomLevel} (${BLOOM_LABELS[currentQ.bloomLevel - 1]}) understanding?

Respond JSON only:
{"correct": true/false, "feedback": "1-2 sentence specific feedback", "gap_type": "misconception|knowledge_gap|transfer_failure|procedural|recall_decay|none"}`,
    }],
  })

  const gradeText = gradeResponse.content[0].type === 'text' ? gradeResponse.content[0].text : ''
  const grade = JSON.parse(gradeText.match(/\{[\s\S]*\}/)![0])

  // Update the question record
  currentQ.studentAnswer = answer
  currentQ.isCorrect = grade.correct

  // Track mastery by concept
  const masteryByConcept = attempt.masteryByConceptJson as Record<string, {
    score: number; attempts: number; gaps: string[]
  }>
  if (!masteryByConcept[currentQ.concept]) {
    masteryByConcept[currentQ.concept] = { score: 0, attempts: 0, gaps: [] }
  }
  const cm = masteryByConcept[currentQ.concept]
  cm.attempts++
  if (grade.correct) cm.score++
  if (grade.gap_type !== 'none') cm.gaps.push(grade.gap_type)

  // Adaptive logic: determine next question
  const gate = attempt.gate
  const allConcepts = gate.concepts
  const questionsPerConcept = 2  // ask 2 questions per concept for reliability
  const totalNeeded = allConcepts.length * questionsPerConcept

  // How many questions asked per concept so far?
  const askedPerConcept = new Map<string, number>()
  for (const q of questions) {
    askedPerConcept.set(q.concept, (askedPerConcept.get(q.concept) ?? 0) + 1)
  }

  // Find next concept that needs more questions
  let nextConcept: string | null = null
  for (const c of allConcepts) {
    if ((askedPerConcept.get(c) ?? 0) < questionsPerConcept) {
      nextConcept = c
      break
    }
  }

  // Determine Bloom's level for next question (adapt based on performance)
  let nextBloom = gate.bloomFloor
  if (nextConcept && masteryByConcept[nextConcept]) {
    const conceptPerf = masteryByConcept[nextConcept]
    if (conceptPerf.score === conceptPerf.attempts && conceptPerf.attempts > 0) {
      nextBloom = Math.min(6, gate.bloomFloor + 1)  // probe higher if perfect
    } else if (conceptPerf.score === 0 && conceptPerf.attempts > 0) {
      nextBloom = Math.max(1, gate.bloomFloor - 1)  // drop if struggling
    }
  }

  // Update attempt
  const correctTotal = questions.filter(q => q.isCorrect).length
  await prisma.masteryGateAttempt.update({
    where: { id: attemptId },
    data: {
      questionsAsked: questions as object[],
      totalQuestions: questions.length,
      correctCount: correctTotal,
      masteryByConceptJson: masteryByConcept as object,
    },
  })

  // If all concepts covered with enough questions, evaluate pass/fail
  if (!nextConcept) {
    const overallScore = correctTotal / questions.length
    const passed = overallScore >= gate.passThreshold

    // Build gap diagnosis for failed concepts
    const gaps: GapDiagnosis[] = []
    for (const [concept, data] of Object.entries(masteryByConcept)) {
      const conceptScore = data.attempts > 0 ? data.score / data.attempts : 0
      if (conceptScore < gate.passThreshold) {
        const primaryGap = data.gaps.length > 0
          ? data.gaps.sort((a, b) =>
              data.gaps.filter(g => g === b).length - data.gaps.filter(g => g === a).length
            )[0]
          : 'knowledge_gap'
        gaps.push({
          concept,
          gapType: primaryGap as GapType,
          explanation: `Score: ${data.score}/${data.attempts}. Primary gap: ${primaryGap}`,
          recommendation: buildRecommendation(primaryGap as GapType, concept),
        })
      }
    }

    await prisma.masteryGateAttempt.update({
      where: { id: attemptId },
      data: {
        status: passed ? 'PASSED' : 'FAILED_RETRY',
        overallScore,
        gapDiagnosis: gaps as object[],
        completedAt: new Date(),
      },
    })

    return {
      correct: grade.correct,
      feedback: grade.feedback,
      completed: true,
      passed,
      gapDiagnosis: gaps.length > 0 ? gaps : undefined,
    }
  }

  // Generate next question
  const nextQuestion = await generateAdaptiveQuestion(nextConcept, nextBloom, gate.courseId)
  questions.push({ ...nextQuestion, studentAnswer: undefined, isCorrect: undefined })

  await prisma.masteryGateAttempt.update({
    where: { id: attemptId },
    data: { questionsAsked: questions as object[] },
  })

  return {
    correct: grade.correct,
    feedback: grade.feedback,
    nextQuestion,
  }
}

function buildRecommendation(gapType: GapType, concept: string): string {
  switch (gapType) {
    case 'misconception':
      return `You have a misconception about ${concept}. Try the Socratic mode in Study Buddy — Sandy will help you uncover where your mental model diverges from the correct one.`
    case 'knowledge_gap':
      return `You're missing foundational knowledge about ${concept}. Use Tutor mode in Study Buddy for a focused explanation, then practice with Flashcards.`
    case 'transfer_failure':
      return `You understand ${concept} in theory but struggle to apply it. Try a Simulation Room or Case Study room to practice in realistic contexts.`
    case 'procedural':
      return `You understand the concept but make errors in the procedure. Practice with Quiz Master mode focusing on step-by-step problems.`
    case 'recall_decay':
      return `You likely knew this before but it's faded. Your spaced repetition cards for ${concept} are overdue — a quick Flashcard session should bring it back.`
  }
}
```

### API Routes

```
GET  /api/assessment/mastery-gate/[gateId]            → gate details + availability check
POST /api/assessment/mastery-gate/[gateId]/start       → startGateAttempt
POST /api/assessment/mastery-gate/[gateId]/answer      → processGateAnswer
GET  /api/assessment/mastery-gate/[gateId]/attempts    → student's attempt history
GET  /api/assessment/mastery-gate/course/[courseId]     → all gates for a course (student progression view)
POST /api/assessment/mastery-gate/[gateId]/design      → faculty creates/updates gate
```

### Component: `MasteryGateDesigner.tsx` (Faculty)

- List of course units (weeks) with "Add Gate" button per unit
- Gate editor: title, select concepts from course objectives, set Bloom's floor (dropdown 1-6), pass threshold (slider 50-100%), max attempts, cooldown hours
- Preview mode: faculty can attempt their own gate to test difficulty
- Publish toggle

### Component: `MasteryGatePanel.tsx` (Student)

- Gate card showing: title, required concepts (pills), your current mastery per concept (mini bars), availability status
- "Begin Assessment" button (disabled if cooldown active — shows countdown)
- During attempt: Sandy-style chat interface. Question appears as Sandy message. Student types answer. Immediate feedback after each answer. Progress indicator: "Concept 3/5, Question 2/2"
- On pass: celebration animation, "Unit 4 Unlocked" notification, evidence auto-linked to gradebook
- On fail: gap diagnosis cards. Each card shows concept, gap type icon, explanation, and "Practice This" button linking to the recommended Study Buddy mode

### Component: `app/assessment/mastery/[courseId]/page.tsx` (Student Progression)

Full-page view of all gates in a course, shown as a vertical progression:
- Gates rendered as connected nodes (locked/available/passed)
- Each node shows concept pills, mastery bars, attempt count
- Passed gates: green checkmark + date passed
- Available gates: blue "Ready to attempt" with mastery readiness indicator
- Locked gates: gray with "Complete [previous gate] first"

### Sandy Tools

```
'check_gate_readiness' — Student asks "Am I ready for the Unit 3 gate?"
  Sandy checks concept mastery scores, SR due dates, recent session performance.
  Returns honest assessment: "Your glycolysis and Krebs cycle are solid (0.85+), but
  ETC is at 0.52 — I'd recommend one more Flashcard session before attempting."

'diagnose_my_gaps' — After a failed gate attempt, student asks Sandy for help.
  Sandy reads the gap diagnosis, explains each gap in plain language, and creates
  a personalized study plan: "Let's start with your misconception about electron
  transport. Can you tell me what you think happens to the proton gradient?"
```

---

## Phase 6: Authentic Audience Assessment — "Build Something Real People Use"

> **Estimated size:** Medium (~400 lines: service + component + API)
> **Why sixth:** Requires Tool Builder infrastructure (already built). Adds assessment metrics on top of existing usage data.

### The Concept

A faculty member assigns: "Build a tool in the platform that solves a real problem for students on this campus. It will be published. Real students will use it."

The assessment criteria:
1. **Functionality** (40%) — Does it work? AI-scored from tool session quality signals.
2. **Usage** (30%) — Did anyone use it? Measured by real session counts.
3. **Impact** (20%) — Did users find it helpful? Measured by qualitySignal ratings.
4. **Iteration** (10%) — Did the builder improve it based on feedback? Measured by edit history.

### Service: `app/lib/assessment/authentic-assessment-service.ts`

```typescript
import { prisma } from '../prisma'

interface AuthenticMetrics {
  toolId: string
  toolName: string
  // Functionality
  isPublished: boolean
  hasWorkingChat: boolean
  sessionCount: number
  avgSessionDuration: number
  // Usage
  uniqueUsers: number
  totalSessions: number
  repeatUsers: number  // users who came back >1 time
  // Impact
  avgQualitySignal: number | null
  positiveRatings: number
  totalRatings: number
  // Iteration
  editCount: number
  lastEditedAt: Date | null
  feedbackResponseRate: number  // % of feedback the builder acknowledged
  // Composite
  scores: {
    functionality: number  // 0-1
    usage: number          // 0-1
    impact: number         // 0-1
    iteration: number      // 0-1
    composite: number      // weighted
  }
}

/** Compute authentic assessment metrics for a student-built tool */
export async function computeAuthenticMetrics(
  toolId: string,
  assignmentStartDate: Date
): Promise<AuthenticMetrics> {
  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    include: { creator: true },
  })
  if (!tool) throw new Error('Tool not found')

  // Sessions since assignment start (only count usage after publication)
  const sessions = await prisma.toolSession.findMany({
    where: { toolId, startedAt: { gte: assignmentStartDate } },
    select: {
      userId: true,
      durationSeconds: true,
      qualitySignal: true,
      startedAt: true,
    },
  })

  // Filter out the creator's own sessions
  const creatorId = tool.creatorId
  const userSessions = sessions.filter(s => s.userId !== creatorId)

  // Unique users
  const uniqueUserIds = new Set(userSessions.map(s => s.userId).filter(Boolean))
  const userSessionCounts = new Map<string, number>()
  for (const s of userSessions) {
    if (s.userId) {
      userSessionCounts.set(s.userId, (userSessionCounts.get(s.userId) ?? 0) + 1)
    }
  }
  const repeatUsers = [...userSessionCounts.values()].filter(c => c > 1).length

  // Quality signals
  const rated = userSessions.filter(s => s.qualitySignal)
  const positive = rated.filter(s => s.qualitySignal === 'positive' || s.qualitySignal === 'excellent')
  const avgDuration = userSessions.length > 0
    ? userSessions.reduce((s, sess) => s + (sess.durationSeconds ?? 0), 0) / userSessions.length
    : 0

  // Edit history (tool updates after initial publish)
  const editCount = await prisma.toolVersion?.count?.({ where: { toolId } }) ?? 0

  // Scoring
  const functionality = tool.isPublished ? (userSessions.length > 0 ? 0.8 : 0.5) + (avgDuration > 60 ? 0.2 : 0) : 0
  const usage = Math.min(1, uniqueUserIds.size / 10)  // 10 unique users = full marks
  const impact = rated.length > 0 ? positive.length / rated.length : 0
  const iteration = Math.min(1, editCount / 3)  // 3+ edits = full marks

  const composite = functionality * 0.4 + usage * 0.3 + impact * 0.2 + iteration * 0.1

  return {
    toolId,
    toolName: tool.name,
    isPublished: tool.isPublished ?? false,
    hasWorkingChat: userSessions.length > 0,
    sessionCount: userSessions.length,
    avgSessionDuration: Math.round(avgDuration),
    uniqueUsers: uniqueUserIds.size,
    totalSessions: userSessions.length,
    repeatUsers,
    avgQualitySignal: rated.length > 0 ? positive.length / rated.length : null,
    positiveRatings: positive.length,
    totalRatings: rated.length,
    editCount,
    lastEditedAt: tool.updatedAt,
    feedbackResponseRate: 0, // future: connect to Contribute feedback
    scores: {
      functionality: Math.round(functionality * 100) / 100,
      usage: Math.round(usage * 100) / 100,
      impact: Math.round(impact * 100) / 100,
      iteration: Math.round(iteration * 100) / 100,
      composite: Math.round(composite * 100) / 100,
    },
  }
}
```

### Component: `AuthenticMetricsCard.tsx`

Dashboard card showing:
- 4 metric rings (Functionality, Usage, Impact, Iteration) in a 2×2 grid
- Composite score prominently displayed
- Real numbers: "23 sessions from 8 unique users, 4 returned"
- Timeline: "Published March 15, last updated March 22, 3 iterations"
- Faculty view adds: override score fields, notes

---

## Phase 7: Faculty Assessment Canvas — "Design Your Assessment"

> **Estimated size:** Medium (~500 lines: service + designer component + hub integration)
> **Why last:** The capstone. Ties all 6 assessment modes into a unified design surface. Only makes sense after the modes exist.

### The Concept

Faculty opens the **Assessment Canvas** for an assignment and sees all 7 assessment modes as cards they can toggle on/off and configure:

| Mode | Toggle | Config |
|------|--------|--------|
| Traditional | ✅ Default | File upload, text submission |
| Process | ⬜ | Which Sandy modes allowed, annotation required? |
| Divergence | ⬜ | Scenario, turn count, coherence weight |
| Teach-Back | ⬜ | Concept pool, time limit, misconception list |
| Cross-Exam | ⬜ | Debate or Fishbowl, source weights |
| Authentic | ⬜ | Usage period, metric weights |
| Mastery Gate | ⬜ | Concepts, Bloom's floor, pass threshold |

Multiple modes can be active simultaneously. The composite grade is computed from all active modes' evidence, weighted by the faculty's configuration.

### Service: `app/lib/assessment/assessment-canvas-service.ts`

```typescript
import { prisma } from '../prisma'
import type { AssessmentMode } from './types'

interface CanvasConfig {
  modes: {
    mode: AssessmentMode
    enabled: boolean
    weight: number  // relative weight in composite
    config: Record<string, unknown>  // mode-specific settings
  }[]
  compositeMethod: 'weighted_average' | 'highest' | 'portfolio'
}

const DEFAULT_CANVAS: CanvasConfig = {
  modes: [
    { mode: 'TRADITIONAL', enabled: true, weight: 1.0, config: {} },
    { mode: 'PROCESS', enabled: false, weight: 0.3, config: { annotationRequired: true, minMessages: 10 } },
    { mode: 'DIVERGENCE', enabled: false, weight: 0.3, config: { turns: 5, scenario: '' } },
    { mode: 'TEACHBACK', enabled: false, weight: 0.3, config: { timeLimit: 600, concepts: [] } },
    { mode: 'CROSS_EXAM', enabled: false, weight: 0.3, config: { format: 'DEBATE', aiWeight: 0.4 } },
    { mode: 'AUTHENTIC', enabled: false, weight: 0.3, config: { usagePeriodDays: 14 } },
    { mode: 'MASTERY_GATE', enabled: false, weight: 0.3, config: { concepts: [], bloomFloor: 3 } },
  ],
  compositeMethod: 'weighted_average',
}

/** Get or initialize canvas config for an assignment */
export async function getCanvasConfig(assignmentId: string): Promise<CanvasConfig> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { assessmentConfig: true, assessmentMode: true },
  })
  if (!assignment) throw new Error('Assignment not found')

  if (assignment.assessmentConfig) {
    return assignment.assessmentConfig as unknown as CanvasConfig
  }

  return DEFAULT_CANVAS
}

/** Save canvas config */
export async function saveCanvasConfig(assignmentId: string, config: CanvasConfig) {
  // Validate: at least one mode enabled
  const enabled = config.modes.filter(m => m.enabled)
  if (enabled.length === 0) throw new Error('At least one assessment mode must be enabled')

  // Determine primary mode for the enum field
  const primary = enabled.sort((a, b) => b.weight - a.weight)[0]

  return prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      assessmentConfig: config as object,
      assessmentMode: primary.mode as string,
      evidenceTypes: enabled.flatMap(m => modeToEvidenceTypes(m.mode)),
      processWeight: config.modes.find(m => m.mode === 'PROCESS')?.weight ?? null,
    },
  })
}

function modeToEvidenceTypes(mode: AssessmentMode): string[] {
  switch (mode) {
    case 'PROCESS': return ['SANDY_TRANSCRIPT', 'STUDENT_ANNOTATION']
    case 'DIVERGENCE': return ['SIMULATION_THREAD']
    case 'TEACHBACK': return ['TEACHBACK_SESSION']
    case 'CROSS_EXAM': return ['DEBATE_SESSION', 'FISHBOWL_SESSION']
    case 'AUTHENTIC': return ['TOOL_USAGE']
    case 'MASTERY_GATE': return ['CONCEPT_MASTERY', 'FLASHCARD_MASTERY']
    default: return []
  }
}

/** Generate student-facing instructions from canvas config */
export function buildAssessmentInstructions(config: CanvasConfig): string {
  const enabled = config.modes.filter(m => m.enabled)
  const lines: string[] = ['## How You\'ll Be Assessed\n']

  for (const m of enabled) {
    switch (m.mode) {
      case 'TRADITIONAL':
        lines.push(`- **Submission** (${Math.round(m.weight * 100)}%): Submit your work directly`)
        break
      case 'PROCESS':
        lines.push(`- **Thinking Process** (${Math.round(m.weight * 100)}%): Work through the problem with Sandy, then annotate your transcript to show where your thinking evolved`)
        break
      case 'DIVERGENCE':
        lines.push(`- **Decision-Making** (${Math.round(m.weight * 100)}%): Navigate a simulation scenario — you'll be assessed on the coherence of your reasoning, not whether you got the "right" answer`)
        break
      case 'TEACHBACK':
        lines.push(`- **Teaching** (${Math.round(m.weight * 100)}%): Teach the concept to Sandy (who will play confused). If you can teach it clearly, you understand it`)
        break
      case 'CROSS_EXAM':
        lines.push(`- **Argumentation** (${Math.round(m.weight * 100)}%): Defend your position in a ${m.config.format === 'FISHBOWL' ? 'Fishbowl' : 'Debate'} — scored by AI, peers, and self-reflection`)
        break
      case 'AUTHENTIC':
        lines.push(`- **Real-World Impact** (${Math.round(m.weight * 100)}%): Build something that real people use. Graded on functionality, adoption, and iteration`)
        break
      case 'MASTERY_GATE':
        lines.push(`- **Mastery Demonstration** (${Math.round(m.weight * 100)}%): Pass an adaptive assessment when you're ready — no fixed deadline`)
        break
    }
  }

  return lines.join('\n')
}
```

### API Routes

```
GET  /api/assessment/canvas/[assignmentId]        → getCanvasConfig
PUT  /api/assessment/canvas/[assignmentId]        → saveCanvasConfig
GET  /api/assessment/canvas/[assignmentId]/instructions → buildAssessmentInstructions
```

### Component: `AssessmentCanvasDesigner.tsx`

The main faculty design surface:
- 7 mode cards in a grid, each toggleable with a switch
- Active modes expand to show configuration options (inline, not a separate page)
- Weight sliders for each active mode (auto-normalize to sum = 1.0)
- Composite method selector: Weighted Average, Highest Score, Portfolio (all evidence, no single composite)
- Live preview panel: shows student-facing instructions generated from current config
- "Assessment Mode Mix" visual: donut chart showing weight distribution across active modes
- Save + Publish flow (publishing generates student notification)

### Page: `app/courses/[id]/assessment-canvas/page.tsx`

Accessible from course management sidebar. Lists all assignments with their current assessment mode badges. Click an assignment → opens `AssessmentCanvasDesigner` in a slide-out panel.

### Hub Integration: `hub-config.ts`

Add an "Assessment" swim lane visible to EDUCATOR and ADMIN:

```typescript
{
  id: 'assessment-lab',
  title: 'Assessment Lab',
  tools: [
    { id: 'assessment-canvas', label: 'Assessment Canvas', hook: 'Design multi-modal assessments', route: '/courses', icon: Compass, gradient: '...' },
    { id: 'mastery-gates', label: 'Mastery Gates', hook: 'Build adaptive mastery checkpoints', route: '/courses', icon: GraduationCap, gradient: '...' },
    { id: 'competency-dashboard', label: 'Competency Dashboard', hook: 'Cross-course competency distribution', route: '/assessment/portfolio', icon: BarChart3, gradient: '...' },
  ],
  visibleTo: ['EDUCATOR', 'ADMIN'],
}
```

### Sandy Tools (Global)

```
'explain_assessment' — Student asks "How am I being graded on this assignment?"
  Sandy reads the assignment's canvas config and explains each active mode,
  weights, and what the student should focus on. Generates actionable next steps.

'suggest_assessment_design' — Faculty asks Sandy to help design an assessment.
  Sandy asks about learning objectives, class size, Bloom's level targets,
  and recommends which modes to enable with suggested weights.
  "For a 300-level ethics course with 30 students, I'd recommend Divergence (40%)
  + Process (30%) + Cross-Exam (30%). Here's why..."

'assessment_health_check' — Faculty asks Sandy to review their assessment design.
  Sandy analyzes: Are Bloom's levels aligned? Is the weight distribution reasonable?
  Are there enough evidence sources? Does the mix cover diverse learner strengths?
```

---

## Implementation Sequence

| Phase | Sprint | Dependencies | Deliverable |
|-------|--------|-------------|-------------|
| 1. Evidence Layer | Sprint 1 ✅ | None (foundational) | Schema + service + API. All subsequent phases build on this. |
| 2. Process Assessment | Sprint 2 ✅ | Phase 1 | Students submit annotated Sandy transcripts. Faculty reviews with AI pre-scores. |
| 3. Commons Assessment | Sprint 3 | Phase 1 | Simulation, Teach-Back, Debate, Fishbowl rooms gain `assessmentMode` flag + gradebook wiring. |
| 4. Competency Portfolio | Sprint 4 | Phase 1 + at least one of Phase 2/3 | Student-facing cross-course mastery dashboard. Faculty class distribution view. |
| 5. Mastery Gates | Sprint 5 | Phase 1 + concept mastery | Adaptive mastery checkpoints replace fixed exam dates. |
| 6. Authentic Assessment | Sprint 6 | Phase 1 + Tool Builder | Tool usage metrics become gradebook evidence. |
| 7. Assessment Canvas | Sprint 7 | Phases 1-6 | Unified faculty design surface tying all modes together. |

Each phase is independently deployable and immediately useful. Phase 7 is the capstone that unifies them, but phases 2-6 work standalone with manual evidence linking through Phase 1.

---

## Patent Claims This Enables

1. **Multi-modal evidence aggregation** — A system that combines Sandy conversation transcripts, simulation decision paths, peer teaching scores, debate fact-checks, tool usage metrics, and adaptive assessment results into a single weighted gradebook entry.

2. **AI-mediated process assessment** — A method for scoring a student's cognitive process (revision depth, coherence, metacognitive quality) from AI agent conversation transcripts, distinct from scoring the final artifact.

3. **Divergence-based assessment** — A system where multiple students navigate the same AI-generated branching scenario independently, and assessment is based on decision coherence rather than convergence to a single correct answer.

4. **Adaptive mastery gates with gap diagnosis** — A method for administering assessments that adapt question difficulty in real-time based on student responses, diagnose specific gap types (misconception, knowledge gap, transfer failure, procedural error, recall decay), and prescribe targeted remediation activities.

5. **Cross-course competency aggregation with temporal decay** — A system that automatically aggregates mastery signals across courses into institutional competency records, applying forgetting-curve decay to older evidence and maintaining Bloom's taxonomy high-water marks.

6. **AI-as-confused-learner assessment** — A method where an AI agent deliberately presents misconceptions and asks pointed follow-up questions to assess depth of understanding through the student's ability to teach, correct, and explain.

---

## FERPA & Privacy Considerations

- **Competency Portfolio** is student-controlled. Faculty sees class-level distributions only (no individual names in aggregated views). Students choose what to share externally.
- **Process transcripts** contain Sandy conversations. Students must opt-in to annotation-based assessment (the assignment description makes the mode clear before they begin).
- **Simulation threads** are private during the room. Only the student's own path is linked to their gradebook entry. The divergence tree shown to faculty uses anonymized participant labels unless students consent.
- **Peer scores** in Cross-Examination are aggregated (mean/median), not individually attributed.
- **Mastery gate attempts** are visible only to the student and the course instructor.
- All assessment evidence can be contested through existing academic appeals processes.
