# Blueprint: Classroom Intelligence Loop — Closing the Gap Between Data and Pedagogy

> **Sprint Scope:** A closed-loop system that detects which specific concepts students struggle with, identifies which teaching approaches work best, delivers actionable insight cards to instructors, recommends evidence-based interventions, and tracks whether adjustments improve outcomes — turning the platform into a continuous pedagogical improvement engine
> **Depends On:** Engagement Fingerprint Engine (BUILT), Faculty Intelligence (morning briefing), StudentConceptMastery, RubricBreakdown, GradebookEntry, ToolSession, FlashcardState, The Commons
> **Unlocks:** Teaching effectiveness evidence for accreditation (Accreditation Autopilot Standard 8.2a), intervention recommendations for Student Success Early Warning, data-driven curriculum improvement for Curriculum Intelligence Network, evidence-based pedagogical research
> **Estimated Size:** Large — 5 phases, each independently deployable (recommend 1 phase per sprint)
> **Patent Relevance:** **HIGH** — "Closed-loop classroom intelligence system with automated concept difficulty detection, pedagogical intervention recommendation, and teaching effectiveness tracking in an AI-mediated educational platform"

---

## Context

### The Problem

Universities collect enormous amounts of learning data but almost none of it flows back to the instructor in actionable form:

1. **Aggregate blindness.** An instructor sees that the class average on Assignment 3 was 67%. But they don't know *which specific concepts* caused the failures, what misconceptions drove incorrect answers, or which students struggled with what. The grade is a black box.
2. **Intuition-based teaching adjustments.** When something isn't working, instructors rely on gut feeling: "I think they didn't get recursion, so I'll re-explain it." No data on whether re-explaining works better than adding a practice exercise, creating a study group, or building a visual tool.
3. **No cross-section learning.** When 3 sections of the same course are taught by different instructors, there's no mechanism to discover that Section B's students mastered recursion 34% faster — and that the instructor used a trace-through exercise. That knowledge stays locked in one classroom.
4. **Delayed feedback.** End-of-semester evaluations tell you what went wrong 4 months too late. Mid-semester evaluations are better but coarse-grained. Instructors need weekly or per-assignment intelligence.
5. **No intervention tracking.** When an instructor adjusts their teaching, there's no way to measure if it helped. Did the concept map exercise actually improve mastery? Did the extra office hours session reduce confusion? Without measurement, there's no evidence base for what works.

### The Vision

| Old Model | New Model | Platform Feature |
|-----------|-----------|-----------------|
| Class average on assignments | Per-concept difficulty map with misconception taxonomy | Concept Difficulty Engine |
| Gut-feel teaching adjustments | Data-driven intervention suggestions with historical effectiveness | Adaptive Suggestion Engine |
| End-of-semester evaluations | Weekly Teaching Pulse with concept heatmap | Teaching Pulse Dashboard |
| No cross-section comparison | Anonymized approach comparison across sections | Cross-Section Intelligence |
| Intuition about what works | Intervention → outcome tracking with statistical evidence | Intervention Tracker |
| Grades as the only signal | Sandy questions, Commons confusion, flashcard failures, rubric dimensions | Multi-Signal Concept Analysis |

### Why This Works

1. **the platform already captures concept-level data.** `StudentConceptMastery` tracks per-student per-concept mastery. `RubricBreakdown` scores per-dimension. Sandy conversations reveal confusion signals. Flashcard states show which cards students struggle with. This data exists — it just isn't synthesized for instructors.
2. **The Engagement Fingerprint provides learner context.** We know each student's learning patterns, so we can distinguish "the whole class is confused about recursion" from "three night-owl students missed the lecture."
3. **Faculty Intelligence already delivers insights.** The morning briefing and faculty dashboard are built. This system enriches them with pedagogical intelligence rather than just administrative updates.
4. **The Commons creates natural experiments.** When some students use a Teach-Back room and others don't, we can compare mastery gains — creating observational evidence of what interventions work.

### Integration with Existing Systems

| Existing Feature | How It's Connected |
|-----------------|-------------------|
| `StudentConceptMastery` | Primary signal: mastery scores, encounter/success counts, timestamps |
| `RubricBreakdown` | Per-dimension scores reveal which assessment dimensions cause difficulty |
| `GradebookEntry` | Grade patterns and trends per assignment |
| `ToolSession` + chatMessages | Sandy conversation analysis for confusion signals and common questions |
| `FlashcardState` | Cards with low ease factors and high failure rates indicate struggling concepts |
| `LiveRoom` / Commons | Participation patterns, Teach-Back scores, Study session topics |
| `FacultyBriefing` | Teaching Pulse injected into morning briefing |
| `EngagementFingerprint` (BUILT) | Learner context for distinguishing individual vs class-wide struggles |
| `CourseFingerprint` (BUILT) | Class-level patterns feed concept difficulty analysis |
| Student Success Early Warning | At-risk students flagged → instructor receives concept-specific suggestions |
| Accreditation Autopilot | Teaching effectiveness data = evidence for Standard 8.2a (continuous improvement) |
| Curriculum Intelligence Network | Concept difficulty data feeds cross-course curriculum analysis |
| Assessment Reimagined | Rubric breakdown data powers per-dimension concept analysis |

---

## Schema Changes

### New Enum: `ConceptDifficultyLevel`

```prisma
enum ConceptDifficultyLevel {
  EASY              // 80%+ mastery rate, low misconception count
  MODERATE          // 60-80% mastery rate
  DIFFICULT         // 40-60% mastery rate
  VERY_DIFFICULT    // 20-40% mastery rate
  CRITICAL          // <20% mastery rate — class-wide failure
}
```

### New Enum: `InsightCardType`

```prisma
enum InsightCardType {
  CONCEPT_STRUGGLE     // Specific concept where students are struggling
  MISCONCEPTION        // Common misconception pattern detected
  ENGAGEMENT_DROP      // Class-wide engagement decline
  INTERVENTION_RESULT  // Previous teaching adjustment outcome
  CROSS_SECTION        // Insight from another section's approach
  STUDENT_FEEDBACK     // Synthesized student feedback theme
  WEEKLY_PULSE         // Weekly summary report
}
```

### New Enum: `InterventionApproach`

```prisma
enum InterventionApproach {
  RE_EXPLAIN           // Re-teach the concept with different framing
  VISUAL_AID           // Add visual/interactive demonstration
  PRACTICE_EXERCISE    // Assign additional practice problems
  STUDY_GROUP          // Create Commons study session on the topic
  PEER_TEACHING        // Set up Teach-Back room
  OFFICE_HOURS         // Open targeted office hours session
  FLASHCARD_SET        // Create or recommend flashcards
  SCAFFOLD_TASK        // Break complex concept into smaller steps
  REAL_WORLD_EXAMPLE   // Connect concept to concrete application
  ASSESSMENT_ADJUST    // Modify upcoming assessment approach
  SANDY_REVIEW         // Sandy-guided review session
  CUSTOM               // Instructor's own approach
}
```

### New Model: `ConceptDifficultySnapshot`

Per-concept per-course difficulty analysis, recomputed after each assessment.

```prisma
model ConceptDifficultySnapshot {
  id              String                 @id @default(cuid())
  courseId         String
  course           Course                @relation(fields: [courseId], references: [id])
  concept         String                 // Concept slug from StudentConceptMastery
  conceptLabel    String                 // Human-readable concept name

  // Difficulty metrics
  difficulty      ConceptDifficultyLevel
  masteryRate     Float                  // 0-1: % of students with mastery > 0.7
  avgMastery      Float                  // 0-1: class average mastery for this concept
  medianMastery   Float?                 // 0-1: class median mastery
  encounterCount  Int                    // Total encounters across all students
  successRate     Float                  // 0-1: success/encounter ratio

  // Misconception analysis
  commonErrors    Json?                  // [{type: "confusing_base_case", count: 12, description: "..."}]
  misconceptionCount Int  @default(0)

  // Sandy signal analysis
  sandyQuestionCount Int  @default(0)    // How many Sandy questions about this concept
  sandyConfusionScore Float? @default(0) // 0-1: AI-assessed confusion level from Sandy conversations
  commonQuestions  Json?                  // [{question: "...", count: N}]

  // Flashcard signal
  flashcardFailRate Float?               // 0-1: % of flashcard reviews marked "Again" for this concept
  overdueCardCount  Int?                 // Cards for this concept that are overdue

  // Trend
  difficultyDelta7d Float? @default(0)   // Change in difficulty over 7 days (-1 to 1)
  previousDifficulty String?             // Previous difficulty level for trend comparison

  // Temporal
  weekId          String?
  week            CourseWeek?            @relation(fields: [weekId], references: [id])
  semesterCode    String?

  computedAt      DateTime @default(now())

  @@unique([courseId, concept, computedAt])
  @@index([courseId, difficulty])
  @@index([courseId, computedAt])
}
```

### New Model: `InstructorInsightCard`

Actionable intelligence delivered to faculty after assessments.

```prisma
model InstructorInsightCard {
  id              String          @id @default(cuid())
  courseId         String
  course           Course         @relation(fields: [courseId], references: [id])
  instructorId    String
  instructor      User           @relation(fields: [instructorId], references: [id])

  type            InsightCardType
  title           String          // "72% of students struggled with recursion this week"
  body            String @db.Text // Detailed insight with evidence
  evidence        Json            // Supporting data: [{source: "concept_mastery", data: {...}}, {source: "sandy_questions", data: {...}}]

  // Recommendations
  suggestedActions Json?          // [{approach: "VISUAL_AID", reason: "...", detail: "..."}, ...]
  urgency         String @default("normal") // "immediate" | "this_week" | "informational"

  // Related concepts
  concepts        String[]        // Concept slugs involved
  assignmentId    String?         // Triggering assignment, if any
  weekId          String?

  // Instructor response
  viewed          Boolean @default(false)
  viewedAt        DateTime?
  actionTaken     String?         // What the instructor decided to do
  actionApproach  InterventionApproach?
  actionNotes     String? @db.Text
  respondedAt     DateTime?

  // Outcome linkage
  interventionId  String?         // Links to TeachingIntervention if instructor acts

  createdAt       DateTime @default(now())
  expiresAt       DateTime         // Insight cards expire after 14 days

  @@index([instructorId, viewed, createdAt])
  @@index([courseId, type, createdAt])
}
```

### New Model: `TeachingIntervention`

Tracks what the instructor changed and whether it improved outcomes.

```prisma
model TeachingIntervention {
  id              String               @id @default(cuid())
  courseId         String
  course           Course              @relation(fields: [courseId], references: [id])
  instructorId    String
  instructor      User                @relation(fields: [instructorId], references: [id])

  // What was done
  approach        InterventionApproach
  description     String  @db.Text     // What the instructor actually did
  targetConcepts  String[]             // Concept slugs this intervention addresses
  targetWeekId    String?              // Which course week this targets

  // Triggered by
  insightCardId   String?              // Insight card that prompted this
  insightCard     InstructorInsightCard? @relation(fields: [insightCardId], references: [id])

  // Pre/post measurement
  preMetrics      Json                 // {avgMastery: 0.35, masteryRate: 0.22, commonErrors: [...]}
  postMetrics     Json?                // Same shape, measured 7-14 days later
  effectSize      Float?               // Cohen's d effect size (computed when postMetrics available)
  improved        Boolean?             // Did the target concepts improve?

  // Metadata
  studentsAffected Int?                // How many students were in the class at time of intervention
  measurementDate  DateTime?           // When post-metrics were taken
  status           String @default("active") // "active" | "measured" | "inconclusive" | "effective" | "ineffective"

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([courseId, status])
  @@index([approach, improved])
  @@index([instructorId])
}
```

### New Model: `TeachingPulse`

Weekly aggregated report per course section.

```prisma
model TeachingPulse {
  id              String   @id @default(cuid())
  courseId         String
  course           Course  @relation(fields: [courseId], references: [id])
  instructorId    String

  weekNumber      Int                  // ISO week number
  yearNumber      Int

  // Concept mastery heatmap data
  conceptHeatmap  Json                 // [{concept, label, mastery, difficulty, delta, misconceptions}]

  // Engagement summary
  avgEngagement   Float?               // 0-1: class average engagement from fingerprints
  engagementDelta Float?               // Change from previous week
  attendanceRate  Float?               // If attendance tracked

  // Assessment summary
  assignmentsThisWeek Int @default(0)
  avgScore        Float?
  submissionRate  Float?

  // Key insights
  topStruggle     String?              // Top struggling concept
  topImprovement  String?              // Most improved concept
  insightCount    Int @default(0)      // How many insight cards generated this week
  interventionCount Int @default(0)    // How many interventions logged

  // Intervention effectiveness (rolling)
  activeInterventions Int @default(0)
  effectiveInterventions Int @default(0)

  // AI-generated narrative summary
  narrativeSummary String? @db.Text    // "This week, students showed strong improvement in linked lists (+15% mastery) but continued to struggle with recursion..."

  computedAt      DateTime @default(now())

  @@unique([courseId, weekNumber, yearNumber])
  @@index([instructorId, yearNumber, weekNumber])
}
```

### New Model: `CrossSectionComparison`

Anonymized comparison of teaching approaches across sections of the same course.

```prisma
model CrossSectionComparison {
  id              String   @id @default(cuid())
  courseCode      String               // e.g., "CS 101" — matches across sections
  concept         String               // Concept slug compared
  semesterCode    String               // "FA2025"

  // Section data (anonymized — no instructor names)
  sections        Json                 // [{sectionId, anonymousLabel: "Section A", masteryRate, avgMastery, approachUsed, studentsCount}]
  sectionCount    Int

  // Comparison metrics
  bestMasteryRate Float                // Highest mastery rate among sections
  worstMasteryRate Float               // Lowest mastery rate
  spreadPercent   Float                // Difference between best and worst
  bestApproach    String?              // What approach the best section used (if known)

  // Statistical significance
  isSignificant   Boolean @default(false) // True if spread > 15% and sample sizes adequate
  effectSize      Float?               // Cohen's d between best and worst section

  computedAt      DateTime @default(now())

  @@unique([courseCode, concept, semesterCode])
  @@index([courseCode, semesterCode])
  @@index([isSignificant])
}
```

### New Model: `TeachingEffectivenessSignal`

Per-concept teaching effectiveness measurement. "For this concept, taught this way, students achieved this mastery."

```prisma
model TeachingEffectivenessSignal {
  id              String   @id @default(cuid())
  courseId         String
  concept         String                // Concept slug
  
  // What was taught and how
  approach        InterventionApproach?  // How the concept was addressed
  approachDetail  String?  @db.Text     // Free-text description of approach

  // Outcomes
  masteryGainRate Float                 // 0-1: average mastery gain after exposure
  timeToMastery   Float?               // Days from first encounter to mastery (> 0.7)
  errorPatternDistribution Json?       // [{type, percentage}]
  retentionRate   Float?               // 0-1: mastery retention after 14 days

  // Student signals
  sandyConfusionDelta Float?           // Change in Sandy confusion score after intervention
  flashcardEaseDelta  Float?           // Change in average flashcard ease factor

  // Sample
  studentCount    Int                  // How many students measured
  semesterCode    String?

  computedAt      DateTime @default(now())

  @@index([courseId, concept])
  @@index([concept, approach])
}
```

---

## Service Architecture

### Service: `app/lib/classroom-intelligence/types.ts`

```typescript
// ─── Shared types for Classroom Intelligence Loop ─────────────────────────

export type DifficultyLevel = 'EASY' | 'MODERATE' | 'DIFFICULT' | 'VERY_DIFFICULT' | 'CRITICAL'
export type InsightType = 'CONCEPT_STRUGGLE' | 'MISCONCEPTION' | 'ENGAGEMENT_DROP' | 'INTERVENTION_RESULT' | 'CROSS_SECTION' | 'STUDENT_FEEDBACK' | 'WEEKLY_PULSE'
export type Approach = 'RE_EXPLAIN' | 'VISUAL_AID' | 'PRACTICE_EXERCISE' | 'STUDY_GROUP' | 'PEER_TEACHING' | 'OFFICE_HOURS' | 'FLASHCARD_SET' | 'SCAFFOLD_TASK' | 'REAL_WORLD_EXAMPLE' | 'ASSESSMENT_ADJUST' | 'SANDY_REVIEW' | 'CUSTOM'

export interface ConceptDifficulty {
  concept: string
  conceptLabel: string
  difficulty: DifficultyLevel
  masteryRate: number
  avgMastery: number
  encounterCount: number
  successRate: number
  misconceptions: MisconceptionPattern[]
  sandyQuestionCount: number
  sandyConfusionScore: number
  flashcardFailRate: number | null
  delta7d: number
}

export interface MisconceptionPattern {
  type: string
  count: number
  description: string
  exampleErrors: string[]
}

export interface InsightCardData {
  type: InsightType
  title: string
  body: string
  evidence: { source: string; data: Record<string, unknown> }[]
  suggestedActions: { approach: Approach; reason: string; detail: string }[]
  urgency: 'immediate' | 'this_week' | 'informational'
  concepts: string[]
}

export interface WeeklyPulseData {
  courseId: string
  weekNumber: number
  conceptHeatmap: ConceptDifficulty[]
  avgEngagement: number | null
  avgScore: number | null
  submissionRate: number | null
  topStruggle: string | null
  topImprovement: string | null
  insightCount: number
  interventionCount: number
  narrative: string
}

export interface InterventionEffectiveness {
  approach: Approach
  totalUsed: number
  effective: number
  ineffective: number
  inconclusive: number
  avgEffectSize: number | null
  bestConcept: string | null     // Where this approach worked best
  worstConcept: string | null    // Where it worked least
}

export interface CrossSectionInsight {
  courseCode: string
  concept: string
  sections: {
    label: string
    masteryRate: number
    avgMastery: number
    approach: string | null
    studentCount: number
  }[]
  spread: number
  bestApproach: string | null
  isSignificant: boolean
}

// Difficulty thresholds
export const DIFFICULTY_THRESHOLDS = {
  EASY: 0.8,
  MODERATE: 0.6,
  DIFFICULT: 0.4,
  VERY_DIFFICULT: 0.2,
  CRITICAL: 0, // Below 0.2
} as const

// Minimum sample sizes for statistical claims
export const MIN_SAMPLE_SIZE = 10
export const MIN_CROSS_SECTION_SIZE = 15
export const SIGNIFICANT_SPREAD = 0.15 // 15% mastery rate difference
```

### Service: `app/lib/classroom-intelligence/concept-difficulty-engine.ts`

Computes per-concept difficulty from multiple signal sources.

```typescript
import { prisma } from '../prisma'
import type { ConceptDifficulty, MisconceptionPattern, DifficultyLevel } from './types'
import { DIFFICULTY_THRESHOLDS, MIN_SAMPLE_SIZE } from './types'

/** Compute concept difficulty for all concepts in a course */
export async function computeConceptDifficulty(courseId: string): Promise<ConceptDifficulty[]> {
  // Get all concept mastery records for this course
  const masteryRecords = await prisma.studentConceptMastery.findMany({
    where: { courseId },
    orderBy: { concept: 'asc' },
  })

  // Group by concept
  const byConceptMap = new Map<string, typeof masteryRecords>()
  for (const record of masteryRecords) {
    if (!byConceptMap.has(record.concept)) byConceptMap.set(record.concept, [])
    byConceptMap.get(record.concept)!.push(record)
  }

  const difficulties: ConceptDifficulty[] = []

  for (const [concept, records] of byConceptMap) {
    if (records.length < MIN_SAMPLE_SIZE) continue // Skip concepts with too few students

    const masteryScores = records.map(r => r.masteryScore)
    const avgMastery = masteryScores.reduce((a, b) => a + b, 0) / masteryScores.length
    const masteryRate = masteryScores.filter(s => s >= 0.7).length / masteryScores.length
    const totalEncounters = records.reduce((sum, r) => sum + r.encounterCount, 0)
    const totalSuccesses = records.reduce((sum, r) => sum + r.successCount, 0)
    const successRate = totalEncounters > 0 ? totalSuccesses / totalEncounters : 0

    // Sandy confusion signals
    const sandyData = await computeSandyConfusion(courseId, concept)

    // Flashcard failure rate
    const flashcardData = await computeFlashcardFailRate(courseId, concept)

    // Difficulty classification
    const difficulty = classifyDifficulty(masteryRate)

    // Misconception patterns (from error taxonomy if available)
    const misconceptions = await detectMisconceptions(courseId, concept, records)

    // 7-day trend
    const previousSnapshot = await prisma.conceptDifficultySnapshot.findFirst({
      where: {
        courseId,
        concept,
        computedAt: { gte: new Date(Date.now() - 10 * 86400000), lte: new Date(Date.now() - 5 * 86400000) },
      },
      orderBy: { computedAt: 'desc' },
    })
    const delta7d = previousSnapshot ? avgMastery - previousSnapshot.avgMastery : 0

    difficulties.push({
      concept,
      conceptLabel: formatConceptLabel(concept),
      difficulty,
      masteryRate,
      avgMastery,
      encounterCount: totalEncounters,
      successRate,
      misconceptions,
      sandyQuestionCount: sandyData.questionCount,
      sandyConfusionScore: sandyData.confusionScore,
      flashcardFailRate: flashcardData.failRate,
      delta7d,
    })
  }

  // Sort by difficulty (hardest first)
  return difficulties.sort((a, b) => a.avgMastery - b.avgMastery)
}

function classifyDifficulty(masteryRate: number): DifficultyLevel {
  if (masteryRate >= DIFFICULTY_THRESHOLDS.EASY) return 'EASY'
  if (masteryRate >= DIFFICULTY_THRESHOLDS.MODERATE) return 'MODERATE'
  if (masteryRate >= DIFFICULTY_THRESHOLDS.DIFFICULT) return 'DIFFICULT'
  if (masteryRate >= DIFFICULTY_THRESHOLDS.VERY_DIFFICULT) return 'VERY_DIFFICULT'
  return 'CRITICAL'
}

async function computeSandyConfusion(courseId: string, concept: string): Promise<{
  questionCount: number
  confusionScore: number
}> {
  const now = new Date()
  const d14 = new Date(now.getTime() - 14 * 86400000)

  // Count Sandy sessions that mention this concept
  // Use a simple keyword match on chat messages (concept slug as keyword)
  const sessions = await prisma.toolSession.findMany({
    where: {
      createdAt: { gte: d14 },
      chatMessages: {
        some: {
          content: { contains: concept.replace(/-/g, ' '), mode: 'insensitive' },
          role: 'user',
        },
      },
    },
    select: { id: true },
  })

  const questionCount = sessions.length
  // Confusion score: normalized by expected baseline
  const confusionScore = Math.min(1, questionCount / 20) // 20+ questions = max confusion

  return { questionCount, confusionScore }
}

async function computeFlashcardFailRate(courseId: string, concept: string): Promise<{
  failRate: number | null
}> {
  // FlashcardState doesn't directly link to concepts, but we can match by content
  // This is an approximation — in practice, flashcards would be tagged with concepts
  const cards = await prisma.flashcardState.findMany({
    where: {
      front: { contains: concept.replace(/-/g, ' '), mode: 'insensitive' },
    },
    select: { easeFactor: true, repetitions: true, interval: true },
  })

  if (cards.length === 0) return { failRate: null }

  // Low ease factor = high difficulty
  const avgEase = cards.reduce((sum, c) => sum + c.easeFactor, 0) / cards.length
  const failRate = Math.max(0, 1 - (avgEase - 1.3) / (2.5 - 1.3)) // Normalize: 1.3 = hard, 2.5 = easy

  return { failRate }
}

async function detectMisconceptions(
  courseId: string,
  concept: string,
  records: { userId: string; masteryScore: number; encounterCount: number; successCount: number }[]
): Promise<MisconceptionPattern[]> {
  // Identify students with low success rates for this concept
  const strugglers = records.filter(r => r.encounterCount >= 3 && r.successCount / r.encounterCount < 0.5)

  if (strugglers.length < 3) return []

  // In a full implementation, this would analyze Sandy conversation logs and error patterns.
  // For now, we return the count as a "generic misconception" pattern.
  return [{
    type: 'knowledge_gap',
    count: strugglers.length,
    description: `${strugglers.length} students show repeated difficulty with ${formatConceptLabel(concept)}`,
    exampleErrors: [],
  }]
}

function formatConceptLabel(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/** Persist concept difficulty snapshot */
export async function persistDifficultySnapshot(courseId: string, difficulties: ConceptDifficulty[]) {
  const now = new Date()
  for (const d of difficulties) {
    await prisma.conceptDifficultySnapshot.create({
      data: {
        courseId,
        concept: d.concept,
        conceptLabel: d.conceptLabel,
        difficulty: d.difficulty,
        masteryRate: d.masteryRate,
        avgMastery: d.avgMastery,
        medianMastery: null,
        encounterCount: d.encounterCount,
        successRate: d.successRate,
        commonErrors: d.misconceptions,
        misconceptionCount: d.misconceptions.length,
        sandyQuestionCount: d.sandyQuestionCount,
        sandyConfusionScore: d.sandyConfusionScore,
        flashcardFailRate: d.flashcardFailRate,
        difficultyDelta7d: d.delta7d,
        computedAt: now,
      },
    })
  }
}
```

### Service: `app/lib/classroom-intelligence/insight-generator.ts`

Generates actionable insight cards from concept difficulty data and other signals.

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import type { ConceptDifficulty, InsightCardData, Approach } from './types'

const anthropic = new Anthropic()

/** Generate insight cards for a course after an assessment event */
export async function generateInsightCards(
  courseId: string,
  instructorId: string,
  difficulties: ConceptDifficulty[],
  assignmentId?: string
): Promise<InsightCardData[]> {
  const cards: InsightCardData[] = []

  // Card 1: Top struggling concepts
  const critical = difficulties.filter(d => d.difficulty === 'CRITICAL' || d.difficulty === 'VERY_DIFFICULT')
  if (critical.length > 0) {
    for (const concept of critical.slice(0, 3)) {
      const suggestions = await suggestInterventions(concept, courseId)
      cards.push({
        type: 'CONCEPT_STRUGGLE',
        title: `${Math.round((1 - concept.masteryRate) * 100)}% of students struggling with ${concept.conceptLabel}`,
        body: buildConceptStruggleBody(concept),
        evidence: [
          { source: 'concept_mastery', data: { masteryRate: concept.masteryRate, avgMastery: concept.avgMastery } },
          { source: 'sandy_questions', data: { count: concept.sandyQuestionCount, confusion: concept.sandyConfusionScore } },
          ...(concept.flashcardFailRate != null ? [{ source: 'flashcard', data: { failRate: concept.flashcardFailRate } }] : []),
        ],
        suggestedActions: suggestions,
        urgency: concept.difficulty === 'CRITICAL' ? 'immediate' : 'this_week',
        concepts: [concept.concept],
      })
    }
  }

  // Card 2: Misconception alerts
  const withMisconceptions = difficulties.filter(d => d.misconceptions.length > 0)
  for (const concept of withMisconceptions.slice(0, 2)) {
    cards.push({
      type: 'MISCONCEPTION',
      title: `Common misconception detected in ${concept.conceptLabel}`,
      body: `${concept.misconceptions[0].count} students show a pattern: ${concept.misconceptions[0].description}`,
      evidence: [{ source: 'error_pattern', data: { misconceptions: concept.misconceptions } }],
      suggestedActions: [{
        approach: 'RE_EXPLAIN',
        reason: 'Address the specific misconception directly',
        detail: `Consider creating a targeted exercise that forces students to confront the ${concept.misconceptions[0].type} directly`,
      }],
      urgency: 'this_week',
      concepts: [concept.concept],
    })
  }

  // Card 3: Improvement celebrations
  const improving = difficulties.filter(d => d.delta7d > 0.1)
  if (improving.length > 0) {
    const topImprovement = improving.sort((a, b) => b.delta7d - a.delta7d)[0]
    cards.push({
      type: 'INTERVENTION_RESULT',
      title: `${topImprovement.conceptLabel} mastery improved by ${Math.round(topImprovement.delta7d * 100)}%`,
      body: `Students are making progress on ${topImprovement.conceptLabel}. Average mastery is now ${Math.round(topImprovement.avgMastery * 100)}%.`,
      evidence: [{ source: 'mastery_trend', data: { delta: topImprovement.delta7d, current: topImprovement.avgMastery } }],
      suggestedActions: [{
        approach: 'PRACTICE_EXERCISE',
        reason: 'Reinforce the gains',
        detail: 'Consider a follow-up exercise to solidify this improvement before moving to the next topic',
      }],
      urgency: 'informational',
      concepts: [topImprovement.concept],
    })
  }

  // Card 4: Sandy question clusters
  const highSandyQuestions = difficulties.filter(d => d.sandyQuestionCount >= 5)
  if (highSandyQuestions.length > 0) {
    const topAsked = highSandyQuestions.sort((a, b) => b.sandyQuestionCount - a.sandyQuestionCount)[0]
    cards.push({
      type: 'STUDENT_FEEDBACK',
      title: `${topAsked.sandyQuestionCount} students asked Sandy about ${topAsked.conceptLabel} this week`,
      body: `High question volume suggests this concept needs additional attention. Sandy's confusion score: ${Math.round(topAsked.sandyConfusionScore * 100)}%.`,
      evidence: [{ source: 'sandy_questions', data: { count: topAsked.sandyQuestionCount, confusion: topAsked.sandyConfusionScore } }],
      suggestedActions: [{
        approach: 'OFFICE_HOURS',
        reason: 'Students are actively seeking help',
        detail: 'Consider a targeted office hours session or review lecture on this topic',
      }],
      urgency: topAsked.sandyConfusionScore > 0.7 ? 'this_week' : 'informational',
      concepts: [topAsked.concept],
    })
  }

  return cards
}

function buildConceptStruggleBody(concept: ConceptDifficulty): string {
  const parts: string[] = []
  parts.push(`**Mastery rate:** ${Math.round(concept.masteryRate * 100)}% of students have achieved mastery.`)
  parts.push(`**Average mastery:** ${Math.round(concept.avgMastery * 100)}%.`)
  parts.push(`**Success rate:** ${Math.round(concept.successRate * 100)}% on encounters.`)

  if (concept.sandyQuestionCount > 0) {
    parts.push(`**Sandy questions:** ${concept.sandyQuestionCount} students asked Sandy about this topic.`)
  }
  if (concept.flashcardFailRate != null && concept.flashcardFailRate > 0.5) {
    parts.push(`**Flashcard difficulty:** ${Math.round(concept.flashcardFailRate * 100)}% failure rate on related flashcards.`)
  }
  if (concept.misconceptions.length > 0) {
    parts.push(`**Common errors:** ${concept.misconceptions.map(m => m.description).join('; ')}`)
  }

  const trend = concept.delta7d > 0.05 ? 'Improving' : concept.delta7d < -0.05 ? 'Declining' : 'Stable'
  parts.push(`**7-day trend:** ${trend} (${concept.delta7d > 0 ? '+' : ''}${Math.round(concept.delta7d * 100)}%)`)

  return parts.join('\n')
}

/** Generate intervention suggestions using AI + historical effectiveness data */
async function suggestInterventions(
  concept: ConceptDifficulty,
  courseId: string
): Promise<{ approach: Approach; reason: string; detail: string }[]> {
  // Check historical intervention effectiveness for this concept
  const pastInterventions = await prisma.teachingIntervention.findMany({
    where: {
      targetConcepts: { has: concept.concept },
      status: { in: ['effective', 'ineffective', 'measured'] },
    },
    orderBy: { effectSize: 'desc' },
    take: 5,
  })

  const suggestions: { approach: Approach; reason: string; detail: string }[] = []

  // If we have effectiveness data, recommend what's worked before
  const effective = pastInterventions.filter(i => i.improved === true)
  if (effective.length > 0) {
    const best = effective[0]
    suggestions.push({
      approach: best.approach as Approach,
      reason: `This approach was effective previously (effect size: ${best.effectSize?.toFixed(2)})`,
      detail: best.description.slice(0, 200),
    })
  }

  // Default suggestions based on signal pattern
  if (concept.sandyConfusionScore > 0.5 && !suggestions.some(s => s.approach === 'RE_EXPLAIN')) {
    suggestions.push({
      approach: 'RE_EXPLAIN',
      reason: 'High confusion level in Sandy conversations suggests the initial explanation didn\'t land',
      detail: `Consider re-teaching ${concept.conceptLabel} with a different framing or analogy`,
    })
  }

  if (concept.flashcardFailRate != null && concept.flashcardFailRate > 0.6 && !suggestions.some(s => s.approach === 'SCAFFOLD_TASK')) {
    suggestions.push({
      approach: 'SCAFFOLD_TASK',
      reason: 'High flashcard failure rate suggests students need smaller building blocks',
      detail: 'Break this concept into 2-3 sub-concepts and have students master each before combining',
    })
  }

  if (concept.misconceptions.length > 0 && !suggestions.some(s => s.approach === 'VISUAL_AID')) {
    suggestions.push({
      approach: 'VISUAL_AID',
      reason: 'Misconception patterns suggest students have a flawed mental model',
      detail: `A visual demonstration that directly contrasts the correct model with the common misconception may help`,
    })
  }

  // Always include a Sandy option
  suggestions.push({
    approach: 'SANDY_REVIEW',
    reason: 'Sandy can deliver targeted review to individual struggling students',
    detail: `Sandy can identify students below mastery and proactively offer a review session on ${concept.conceptLabel}`,
  })

  return suggestions.slice(0, 4)
}

/** Persist insight cards */
export async function persistInsightCards(
  courseId: string,
  instructorId: string,
  cards: InsightCardData[],
  assignmentId?: string
) {
  for (const card of cards) {
    await prisma.instructorInsightCard.create({
      data: {
        courseId,
        instructorId,
        type: card.type,
        title: card.title,
        body: card.body,
        evidence: card.evidence,
        suggestedActions: card.suggestedActions,
        urgency: card.urgency,
        concepts: card.concepts,
        assignmentId,
        expiresAt: new Date(Date.now() + 14 * 86400000),
      },
    })
  }
}
```

### Service: `app/lib/classroom-intelligence/intervention-tracker.ts`

Tracks teaching interventions and measures their outcomes.

```typescript
import { prisma } from '../prisma'
import type { Approach } from './types'

/** Record a teaching intervention */
export async function recordIntervention(input: {
  courseId: string
  instructorId: string
  approach: Approach
  description: string
  targetConcepts: string[]
  targetWeekId?: string
  insightCardId?: string
}): Promise<string> {
  // Capture pre-metrics for target concepts
  const preMetrics = await captureConceptMetrics(input.courseId, input.targetConcepts)

  const intervention = await prisma.teachingIntervention.create({
    data: {
      courseId: input.courseId,
      instructorId: input.instructorId,
      approach: input.approach,
      description: input.description,
      targetConcepts: input.targetConcepts,
      targetWeekId: input.targetWeekId,
      insightCardId: input.insightCardId,
      preMetrics,
      studentsAffected: await getEnrolledCount(input.courseId),
    },
  })

  // If triggered by an insight card, link it
  if (input.insightCardId) {
    await prisma.instructorInsightCard.update({
      where: { id: input.insightCardId },
      data: {
        actionTaken: input.description,
        actionApproach: input.approach,
        respondedAt: new Date(),
        interventionId: intervention.id,
      },
    })
  }

  return intervention.id
}

/** Measure outcomes for interventions that are 7+ days old */
export async function measureInterventionOutcomes() {
  const pending = await prisma.teachingIntervention.findMany({
    where: {
      status: 'active',
      createdAt: { lte: new Date(Date.now() - 7 * 86400000) },
    },
  })

  let measured = 0

  for (const intervention of pending) {
    const postMetrics = await captureConceptMetrics(intervention.courseId, intervention.targetConcepts)
    const preMetrics = intervention.preMetrics as { avgMastery: number; masteryRate: number }

    // Compute effect size (simplified Cohen's d)
    const preMastery = preMetrics.avgMastery ?? 0
    const postMastery = (postMetrics as any).avgMastery ?? 0
    const delta = postMastery - preMastery

    // Rough effect size: delta / estimated pooled SD (use 0.15 as reasonable SD)
    const effectSize = delta / 0.15
    const improved = delta > 0.05

    let status: string
    if (delta > 0.1) status = 'effective'
    else if (delta < -0.05) status = 'ineffective'
    else status = 'inconclusive'

    await prisma.teachingIntervention.update({
      where: { id: intervention.id },
      data: {
        postMetrics,
        effectSize,
        improved,
        status,
        measurementDate: new Date(),
      },
    })

    measured++
  }

  return { measured }
}

async function captureConceptMetrics(courseId: string, concepts: string[]): Promise<Record<string, unknown>> {
  const records = await prisma.studentConceptMastery.findMany({
    where: { courseId, concept: { in: concepts } },
  })

  const scores = records.map(r => r.masteryScore)
  const avgMastery = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const masteryRate = scores.length > 0 ? scores.filter(s => s >= 0.7).length / scores.length : 0

  return {
    avgMastery,
    masteryRate,
    studentCount: new Set(records.map(r => r.userId)).size,
    conceptCount: concepts.length,
    capturedAt: new Date().toISOString(),
  }
}

async function getEnrolledCount(courseId: string): Promise<number> {
  return prisma.courseEnrollment.count({
    where: { courseId, status: 'ACTIVE' },
  })
}

/** Get intervention effectiveness statistics for a course */
export async function getInterventionEffectiveness(courseId: string): Promise<{
  byApproach: Record<string, { total: number; effective: number; avgEffect: number }>
  bestApproach: string | null
  totalInterventions: number
}> {
  const interventions = await prisma.teachingIntervention.findMany({
    where: {
      courseId,
      status: { in: ['effective', 'ineffective', 'measured', 'inconclusive'] },
    },
  })

  const byApproach: Record<string, { total: number; effective: number; effects: number[] }> = {}

  for (const i of interventions) {
    const key = i.approach
    if (!byApproach[key]) byApproach[key] = { total: 0, effective: 0, effects: [] }
    byApproach[key].total++
    if (i.improved) byApproach[key].effective++
    if (i.effectSize != null) byApproach[key].effects.push(i.effectSize)
  }

  const result: Record<string, { total: number; effective: number; avgEffect: number }> = {}
  let bestApproach: string | null = null
  let bestRate = 0

  for (const [approach, data] of Object.entries(byApproach)) {
    const avgEffect = data.effects.length > 0 ? data.effects.reduce((a, b) => a + b, 0) / data.effects.length : 0
    result[approach] = { total: data.total, effective: data.effective, avgEffect }
    const rate = data.total > 0 ? data.effective / data.total : 0
    if (rate > bestRate && data.total >= 2) {
      bestRate = rate
      bestApproach = approach
    }
  }

  return {
    byApproach: result,
    bestApproach,
    totalInterventions: interventions.length,
  }
}
```

### Service: `app/lib/classroom-intelligence/weekly-pulse.ts`

Generates the weekly Teaching Pulse report.

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import { computeConceptDifficulty, persistDifficultySnapshot } from './concept-difficulty-engine'
import { generateInsightCards, persistInsightCards } from './insight-generator'
import type { WeeklyPulseData } from './types'

const anthropic = new Anthropic()

/** Generate weekly Teaching Pulse for a course */
export async function generateWeeklyPulse(courseId: string): Promise<WeeklyPulseData> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { creatorId: true, title: true },
  })
  if (!course) throw new Error('Course not found')

  const now = new Date()
  const weekNumber = getISOWeekNumber(now)
  const yearNumber = now.getFullYear()

  // 1. Compute concept difficulty
  const difficulties = await computeConceptDifficulty(courseId)
  await persistDifficultySnapshot(courseId, difficulties)

  // 2. Generate insight cards
  const cards = await generateInsightCards(courseId, course.creatorId, difficulties)
  await persistInsightCards(courseId, course.creatorId, cards)

  // 3. Engagement summary
  const fingerprint = await prisma.courseFingerprint.findUnique({ where: { courseId } })
  const avgEngagement = fingerprint ? (fingerprint as any).avgEngagement ?? null : null

  // 4. Assessment summary
  const weekStart = getWeekStart(now)
  const assignments = await prisma.assignment.findMany({
    where: { courseId, dueDate: { gte: weekStart, lte: now } },
    include: { submissions: { include: { gradebookEntry: true } } },
  })

  const allScores = assignments
    .flatMap(a => a.submissions)
    .map(s => s.gradebookEntry?.releasedScore)
    .filter(Boolean) as number[]

  const avgScore = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null
  const enrolledCount = await prisma.courseEnrollment.count({ where: { courseId, status: 'ACTIVE' } })
  const submissionCount = assignments.flatMap(a => a.submissions).length
  const expectedSubmissions = assignments.length * enrolledCount
  const submissionRate = expectedSubmissions > 0 ? submissionCount / expectedSubmissions : null

  // 5. Identify top struggle and improvement
  const topStruggle = difficulties.length > 0 ? difficulties[0].conceptLabel : null
  const improving = difficulties.filter(d => d.delta7d > 0.05).sort((a, b) => b.delta7d - a.delta7d)
  const topImprovement = improving.length > 0 ? improving[0].conceptLabel : null

  // 6. Intervention counts
  const interventionCount = await prisma.teachingIntervention.count({
    where: { courseId, createdAt: { gte: weekStart } },
  })

  // 7. Generate narrative summary
  const narrative = await generatePulseNarrative(course.title, difficulties, avgScore, submissionRate, interventionCount)

  // 8. Persist pulse
  await prisma.teachingPulse.upsert({
    where: { courseId_weekNumber_yearNumber: { courseId, weekNumber, yearNumber } },
    create: {
      courseId,
      instructorId: course.creatorId,
      weekNumber,
      yearNumber,
      conceptHeatmap: difficulties.map(d => ({
        concept: d.concept,
        label: d.conceptLabel,
        mastery: d.avgMastery,
        difficulty: d.difficulty,
        delta: d.delta7d,
        misconceptions: d.misconceptions.length,
      })),
      avgEngagement,
      avgScore,
      submissionRate,
      topStruggle: topStruggle ?? null,
      topImprovement: topImprovement ?? null,
      insightCount: cards.length,
      interventionCount,
      narrativeSummary: narrative,
    },
    update: {
      conceptHeatmap: difficulties.map(d => ({
        concept: d.concept,
        label: d.conceptLabel,
        mastery: d.avgMastery,
        difficulty: d.difficulty,
        delta: d.delta7d,
        misconceptions: d.misconceptions.length,
      })),
      avgEngagement,
      avgScore,
      submissionRate,
      topStruggle: topStruggle ?? null,
      topImprovement: topImprovement ?? null,
      insightCount: cards.length,
      interventionCount,
      narrativeSummary: narrative,
    },
  })

  return {
    courseId,
    weekNumber,
    conceptHeatmap: difficulties,
    avgEngagement,
    avgScore,
    submissionRate,
    topStruggle,
    topImprovement,
    insightCount: cards.length,
    interventionCount,
    narrative,
  }
}

async function generatePulseNarrative(
  courseTitle: string,
  difficulties: { conceptLabel: string; avgMastery: number; delta7d: number; difficulty: string }[],
  avgScore: number | null,
  submissionRate: number | null,
  interventionCount: number
): Promise<string> {
  const top3Struggle = difficulties.slice(0, 3)
  const top3Improving = difficulties.filter(d => d.delta7d > 0.03).sort((a, b) => b.delta7d - a.delta7d).slice(0, 3)

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Write a 2-3 sentence weekly teaching pulse summary for "${courseTitle}".

Top struggles: ${top3Struggle.map(d => `${d.conceptLabel} (${Math.round(d.avgMastery * 100)}% mastery)`).join(', ') || 'None notable'}
Most improved: ${top3Improving.map(d => `${d.conceptLabel} (+${Math.round(d.delta7d * 100)}%)`).join(', ') || 'None notable'}
Average score: ${avgScore != null ? `${avgScore.toFixed(0)}%` : 'N/A'}
Submission rate: ${submissionRate != null ? `${Math.round(submissionRate * 100)}%` : 'N/A'}
Interventions this week: ${interventionCount}

Write as a supportive teaching coach. Be specific about concepts. Use data points.`,
    }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : 'Weekly pulse generation failed.'
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}
```

### Service: `app/lib/classroom-intelligence/cross-section-service.ts`

Compares outcomes across sections of the same course (anonymized).

```typescript
import { prisma } from '../prisma'
import type { CrossSectionInsight } from './types'
import { MIN_CROSS_SECTION_SIZE, SIGNIFICANT_SPREAD } from './types'

/** Find and compare sections of the same course for a given semester */
export async function compareSections(courseCode: string, semesterCode: string): Promise<CrossSectionInsight[]> {
  // Find all sections of this course code
  const courses = await prisma.course.findMany({
    where: {
      courseCode,
      // Filter by semester if your Course model has semester tracking
    },
    select: { id: true, title: true },
  })

  if (courses.length < 2) return [] // Need at least 2 sections

  const insights: CrossSectionInsight[] = []

  // Get all concepts taught across sections
  const allConcepts = await prisma.studentConceptMastery.findMany({
    where: { courseId: { in: courses.map(c => c.id) } },
    select: { concept: true },
    distinct: ['concept'],
  })

  for (const { concept } of allConcepts) {
    const sections: {
      label: string
      masteryRate: number
      avgMastery: number
      approach: string | null
      studentCount: number
    }[] = []

    for (let i = 0; i < courses.length; i++) {
      const courseId = courses[i].id
      const records = await prisma.studentConceptMastery.findMany({
        where: { courseId, concept },
      })

      if (records.length < MIN_CROSS_SECTION_SIZE) continue

      const scores = records.map(r => r.masteryScore)
      const avgMastery = scores.reduce((a, b) => a + b, 0) / scores.length
      const masteryRate = scores.filter(s => s >= 0.7).length / scores.length

      // Check if there's a logged intervention for this concept in this section
      const intervention = await prisma.teachingIntervention.findFirst({
        where: { courseId, targetConcepts: { has: concept }, status: 'effective' },
        orderBy: { effectSize: 'desc' },
      })

      sections.push({
        label: `Section ${String.fromCharCode(65 + i)}`, // Anonymized: Section A, B, C...
        masteryRate,
        avgMastery,
        approach: intervention?.approach ?? null,
        studentCount: records.length,
      })
    }

    if (sections.length < 2) continue

    const masteryRates = sections.map(s => s.masteryRate)
    const best = Math.max(...masteryRates)
    const worst = Math.min(...masteryRates)
    const spread = best - worst

    const bestSection = sections.find(s => s.masteryRate === best)
    const isSignificant = spread >= SIGNIFICANT_SPREAD && sections.every(s => s.studentCount >= MIN_CROSS_SECTION_SIZE)

    if (spread > 0.05) { // Only report meaningful differences
      insights.push({
        courseCode,
        concept,
        sections,
        spread,
        bestApproach: bestSection?.approach ?? null,
        isSignificant,
      })
    }
  }

  // Sort by spread (biggest differences first)
  return insights.sort((a, b) => b.spread - a.spread)
}

/** Persist cross-section comparisons */
export async function persistCrossSectionComparisons(
  courseCode: string,
  semesterCode: string,
  insights: CrossSectionInsight[]
) {
  for (const insight of insights) {
    await prisma.crossSectionComparison.upsert({
      where: {
        courseCode_concept_semesterCode: {
          courseCode,
          concept: insight.concept,
          semesterCode,
        },
      },
      create: {
        courseCode,
        concept: insight.concept,
        semesterCode,
        sections: insight.sections,
        sectionCount: insight.sections.length,
        bestMasteryRate: Math.max(...insight.sections.map(s => s.masteryRate)),
        worstMasteryRate: Math.min(...insight.sections.map(s => s.masteryRate)),
        spreadPercent: insight.spread,
        bestApproach: insight.bestApproach,
        isSignificant: insight.isSignificant,
      },
      update: {
        sections: insight.sections,
        sectionCount: insight.sections.length,
        bestMasteryRate: Math.max(...insight.sections.map(s => s.masteryRate)),
        worstMasteryRate: Math.min(...insight.sections.map(s => s.masteryRate)),
        spreadPercent: insight.spread,
        bestApproach: insight.bestApproach,
        isSignificant: insight.isSignificant,
      },
    })
  }
}
```

### Service: `app/lib/classroom-intelligence/classroom-intelligence-service.ts`

Main orchestration service.

```typescript
import { prisma } from '../prisma'
import { computeConceptDifficulty, persistDifficultySnapshot } from './concept-difficulty-engine'
import { generateInsightCards, persistInsightCards } from './insight-generator'
import { measureInterventionOutcomes, getInterventionEffectiveness } from './intervention-tracker'
import { generateWeeklyPulse } from './weekly-pulse'
import { compareSections, persistCrossSectionComparisons } from './cross-section-service'

/** Run the full classroom intelligence loop for all active courses (cron entry) */
export async function runClassroomIntelligenceLoop() {
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    select: { id: true, courseCode: true, creatorId: true },
  })

  let pulsesGenerated = 0
  let insightsGenerated = 0
  let interventionsMeasured = 0

  // 1. Generate weekly pulses
  for (const course of courses) {
    try {
      const pulse = await generateWeeklyPulse(course.id)
      pulsesGenerated++
      insightsGenerated += pulse.insightCount
    } catch (err) {
      console.error(`Failed to generate pulse for ${course.id}:`, err)
    }
  }

  // 2. Measure intervention outcomes
  const measured = await measureInterventionOutcomes()
  interventionsMeasured = measured.measured

  // 3. Cross-section comparisons
  const courseCodes = [...new Set(courses.map(c => c.courseCode).filter(Boolean))]
  const semester = getCurrentSemester()
  for (const code of courseCodes) {
    if (!code) continue
    try {
      const insights = await compareSections(code, semester)
      if (insights.length > 0) {
        await persistCrossSectionComparisons(code, semester, insights)
      }
    } catch (err) {
      console.error(`Failed cross-section comparison for ${code}:`, err)
    }
  }

  return { pulsesGenerated, insightsGenerated, interventionsMeasured, crossSectionCodes: courseCodes.length }
}

/** Get insight cards for an instructor, filtered and sorted */
export async function getInsightCards(
  instructorId: string,
  options: { courseId?: string; type?: string; viewed?: boolean; limit?: number }
) {
  return prisma.instructorInsightCard.findMany({
    where: {
      instructorId,
      ...(options.courseId && { courseId: options.courseId }),
      ...(options.type && { type: options.type }),
      ...(options.viewed !== undefined && { viewed: options.viewed }),
      expiresAt: { gte: new Date() },
    },
    orderBy: [
      { urgency: 'asc' }, // 'immediate' sorts first
      { createdAt: 'desc' },
    ],
    take: options.limit ?? 20,
    include: {
      course: { select: { title: true } },
    },
  })
}

/** Mark an insight card as viewed */
export async function viewInsightCard(cardId: string) {
  return prisma.instructorInsightCard.update({
    where: { id: cardId },
    data: { viewed: true, viewedAt: new Date() },
  })
}

/** Get teaching pulse history for a course */
export async function getPulseHistory(courseId: string, weeks: number = 12) {
  return prisma.teachingPulse.findMany({
    where: { courseId },
    orderBy: [{ yearNumber: 'desc' }, { weekNumber: 'desc' }],
    take: weeks,
  })
}

/** Build Sandy context block for classroom intelligence */
export async function buildSandyClassroomContext(courseId: string, instructorId: string): Promise<string> {
  const cards = await getInsightCards(instructorId, { courseId, viewed: false, limit: 3 })
  const pulse = await prisma.teachingPulse.findFirst({
    where: { courseId },
    orderBy: [{ yearNumber: 'desc' }, { weekNumber: 'desc' }],
  })

  if (cards.length === 0 && !pulse) return ''

  const lines: string[] = ['<classroom-intelligence>']

  if (pulse) {
    lines.push(`  <latest-pulse>`)
    lines.push(`    <summary>${pulse.narrativeSummary}</summary>`)
    if (pulse.topStruggle) lines.push(`    <top-struggle>${pulse.topStruggle}</top-struggle>`)
    if (pulse.topImprovement) lines.push(`    <top-improvement>${pulse.topImprovement}</top-improvement>`)
    lines.push(`  </latest-pulse>`)
  }

  if (cards.length > 0) {
    lines.push(`  <unread-insights count="${cards.length}">`)
    for (const card of cards) {
      lines.push(`    <insight urgency="${card.urgency}">${card.title}</insight>`)
    }
    lines.push(`  </unread-insights>`)
  }

  lines.push('</classroom-intelligence>')
  return lines.join('\n')
}

/** Build briefing injection for faculty morning briefing */
export async function buildBriefingClassroomSummary(courseId: string): Promise<string | null> {
  const pulse = await prisma.teachingPulse.findFirst({
    where: { courseId },
    orderBy: [{ yearNumber: 'desc' }, { weekNumber: 'desc' }],
  })

  if (!pulse || !pulse.narrativeSummary) return null

  const unreadCards = await prisma.instructorInsightCard.count({
    where: {
      courseId,
      viewed: false,
      expiresAt: { gte: new Date() },
    },
  })

  let summary = pulse.narrativeSummary
  if (unreadCards > 0) {
    summary += ` You have ${unreadCards} unread insight card${unreadCards > 1 ? 's' : ''}.`
  }

  return summary
}

function getCurrentSemester(): string {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  if (month >= 0 && month <= 4) return `SP${year}`
  if (month >= 5 && month <= 7) return `SU${year}`
  return `FA${year}`
}
```

---

## Data Fetch Layer

### Query Patterns

| Query | Frequency | Optimization |
|-------|-----------|-------------|
| Compute concept difficulty for a course | Weekly cron + on-demand after grading | Batch `findMany` by courseId, group in memory |
| Generate insight cards | Weekly cron + post-assignment | After concept difficulty, parallel card generation |
| Weekly pulse generation | Weekly cron (Sunday night) | Per-course, sequential to manage AI API load |
| Measure intervention outcomes | Weekly cron | `findMany` active interventions 7+ days old |
| Cross-section comparison | Monthly cron | Per course code, batch concept queries |
| Get insight cards for instructor | On dashboard load | `findMany` filtered by instructor + not expired |
| Get pulse history | On analytics page load | `findMany` by courseId, last 12 weeks |
| Build Sandy context | On every Sandy message for faculty | Cached pulse + card count query |

---

## API Routes

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/classroom-intelligence/concepts/[courseId]` | GET | `requireEducatorUser` | Concept difficulty map for a course |
| `/api/classroom-intelligence/insights` | GET | `requireEducatorUser` | Insight cards for the instructor, filterable |
| `/api/classroom-intelligence/insights/[id]/view` | POST | `requireEducatorUser` | Mark an insight card as viewed |
| `/api/classroom-intelligence/insights/[id]/respond` | POST | `requireEducatorUser` | Record response to an insight card (what action taken) |
| `/api/classroom-intelligence/interventions` | GET/POST | `requireEducatorUser` | List or record a teaching intervention |
| `/api/classroom-intelligence/interventions/[id]` | GET | `requireEducatorUser` | Intervention detail with pre/post metrics |
| `/api/classroom-intelligence/effectiveness` | GET | `requireEducatorUser` | Intervention effectiveness stats for a course |
| `/api/classroom-intelligence/pulse/[courseId]` | GET | `requireEducatorUser` | Latest weekly pulse + history |
| `/api/classroom-intelligence/cross-section/[courseCode]` | GET | `requireEducatorUser` | Cross-section comparison (anonymized) |
| `/api/classroom-intelligence/teaching-signals/[courseId]` | GET | `requireEducatorUser` | Teaching effectiveness signals per concept |
| `/api/cron/classroom-intelligence` | POST | `verifyCronSecret` | Weekly classroom intelligence loop |
| `/api/cron/intervention-outcomes` | POST | `verifyCronSecret` | Intervention outcome measurement |

---

## UI Components

| Component | File | Purpose | Dependencies |
|-----------|------|---------|-------------|
| `ConceptHeatmap` | `app/components/classroom-intelligence/ConceptHeatmap.tsx` | Grid heatmap of concepts color-coded by difficulty level, click to drill down | recharts |
| `ConceptDetailPanel` | `app/components/classroom-intelligence/ConceptDetailPanel.tsx` | Slide-out: mastery distribution, misconceptions, Sandy question count, flashcard data, trend chart | recharts |
| `InsightCardList` | `app/components/classroom-intelligence/InsightCardList.tsx` | Scrollable list of insight cards with urgency badges and action buttons | — |
| `InsightCard` | `app/components/classroom-intelligence/InsightCard.tsx` | Individual card: type icon, title, body (collapsible), suggested actions, respond button | lucide-react |
| `InsightResponseForm` | `app/components/classroom-intelligence/InsightResponseForm.tsx` | Form to record response: approach dropdown, description, target week | — |
| `InterventionTimeline` | `app/components/classroom-intelligence/InterventionTimeline.tsx` | Vertical timeline of interventions with pre/post metrics and effectiveness badges | — |
| `InterventionForm` | `app/components/classroom-intelligence/InterventionForm.tsx` | Record a new intervention: approach, description, target concepts picker | — |
| `EffectivenessChart` | `app/components/classroom-intelligence/EffectivenessChart.tsx` | Bar chart of intervention effectiveness by approach type | recharts |
| `WeeklyPulseView` | `app/components/classroom-intelligence/WeeklyPulseView.tsx` | Full pulse report: narrative, heatmap, engagement trend, assessment summary, insight count | recharts |
| `PulseHistoryChart` | `app/components/classroom-intelligence/PulseHistoryChart.tsx` | Line chart of key pulse metrics over weeks | recharts |
| `CrossSectionTable` | `app/components/classroom-intelligence/CrossSectionTable.tsx` | Anonymized section comparison table with spread indicators and significance badges | — |
| `CrossSectionDetail` | `app/components/classroom-intelligence/CrossSectionDetail.tsx` | Expanded comparison: per-concept mastery rates by section, best approach highlight | recharts |
| `TeachingIntelligenceDashboard` | `app/components/classroom-intelligence/TeachingIntelligenceDashboard.tsx` | Full page assembly: course selector, pulse, heatmap, insights, interventions, cross-section | All above |
| `MiniInsightBanner` | `app/components/classroom-intelligence/MiniInsightBanner.tsx` | Compact banner for faculty homepage: unread insight count with top urgency | — |
| `SandyPulseChip` | `app/components/classroom-intelligence/SandyPulseChip.tsx` | Sandy starter chip that opens this week's pulse in Sandy conversation | — |

---

## Pages

| Page | Route | Role | Description |
|------|-------|------|-------------|
| Teaching Intelligence Dashboard | `/analytics/teaching` | EDUCATOR, ADMIN | Course selector + concept heatmap + insight cards + intervention tracker + pulse history. New tab in analytics sub-nav. |
| Concept Deep Dive | `/analytics/teaching/[courseId]/concept/[concept]` | EDUCATOR, ADMIN | Single concept: mastery distribution, trend, misconceptions, Sandy questions, related interventions |
| Intervention Lab | `/analytics/teaching/interventions` | EDUCATOR, ADMIN | Cross-course intervention effectiveness data — what works, organized by approach type |
| Cross-Section Insights | `/analytics/teaching/cross-section` | EDUCATOR, ADMIN | Anonymized comparison across sections of the same course code |

---

## Sandy Integration

### Agent Tools (5 tools in `app/lib/agent/tools/classroom-intelligence-tools.ts`)

```typescript
export const CLASSROOM_INTELLIGENCE_TOOLS = [
  {
    name: 'get_concept_difficulty',
    description: 'Get the concept difficulty map for a course — shows which concepts students are struggling with and why.',
    parameters: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'Course ID' },
      },
      required: ['courseId'],
    },
    handler: async (params: { courseId: string }) => {
      // Returns top 5 struggling concepts with mastery rates, misconceptions, and Sandy question counts
    },
  },
  {
    name: 'get_teaching_insights',
    description: 'Get unread teaching insight cards for your courses. Shows what needs attention and suggested interventions.',
    parameters: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'Optional: filter by course ID' },
      },
    },
    handler: async (params: { courseId?: string }) => {
      // Returns unread insight cards with suggested actions
    },
  },
  {
    name: 'get_weekly_pulse',
    description: 'Get this week\'s Teaching Pulse summary for a course — concept heatmap, engagement, and key takeaways.',
    parameters: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'Course ID' },
      },
      required: ['courseId'],
    },
    handler: async (params: { courseId: string }) => {
      // Returns latest pulse narrative + key metrics
    },
  },
  {
    name: 'get_intervention_effectiveness',
    description: 'See which teaching interventions have been most effective in your courses.',
    parameters: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'Course ID' },
      },
      required: ['courseId'],
    },
    handler: async (params: { courseId: string }) => {
      // Returns effectiveness by approach type with effect sizes
    },
  },
  {
    name: 'log_teaching_intervention',
    description: 'Record a teaching adjustment you made in response to student difficulty data.',
    parameters: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'Course ID' },
        approach: { type: 'string', description: 'Approach used (e.g., VISUAL_AID, PRACTICE_EXERCISE, STUDY_GROUP)' },
        description: { type: 'string', description: 'What you did' },
        concepts: { type: 'array', items: { type: 'string' }, description: 'Concept slugs targeted' },
      },
      required: ['courseId', 'approach', 'description', 'concepts'],
    },
    handler: async (params: { courseId: string; approach: string; description: string; concepts: string[] }) => {
      // Records intervention and returns confirmation
    },
  },
]
```

### Proactive Nudges (in `proactive-suggestions.ts`)

```typescript
// Faculty-facing nudges
{
  id: 'classroom-intel-unread-insights',
  type: 'faculty-alert',
  priority: 7,
  condition: (data) => data.role === 'EDUCATOR' && data.unreadInsightCount > 0,
  message: `You have ${data.unreadInsightCount} new teaching insights from your courses`,
  action: { type: 'link', href: '/analytics/teaching' },
}

{
  id: 'classroom-intel-critical-concept',
  type: 'faculty-alert',
  priority: 9,
  condition: (data) => data.role === 'EDUCATOR' && data.criticalConceptCount > 0,
  message: `${data.criticalConceptCount} concept${data.criticalConceptCount > 1 ? 's' : ''} in critical difficulty — students need help`,
  action: { type: 'link', href: '/analytics/teaching' },
}

{
  id: 'classroom-intel-intervention-result',
  type: 'faculty-alert',
  priority: 5,
  condition: (data) => data.role === 'EDUCATOR' && data.interventionResultReady,
  message: 'Your recent teaching adjustment has been measured — see the results',
  action: { type: 'link', href: '/analytics/teaching/interventions' },
}
```

### Sandy Context Injection

```typescript
// In concierge-service.ts, for EDUCATOR role:
if (currentPage.startsWith('/courses/') || currentPage.startsWith('/analytics')) {
  const courseId = extractCourseIdFromPath(currentPage)
  if (courseId) {
    const classroomContext = await buildSandyClassroomContext(courseId, userId)
    if (classroomContext) contextBlocks.push(classroomContext)
  }
}

// In briefing.ts, for EDUCATOR role:
for (const course of instructorCourses) {
  const classroomSummary = await buildBriefingClassroomSummary(course.id)
  if (classroomSummary) briefingSections.push(classroomSummary)
}
```

---

## Implementation Phases

### Phase 1: Concept Difficulty Engine + Schema

> **Size:** Medium (~600 lines)
> **Delivers:** Schema models, concept difficulty computation, difficulty snapshots

1. Add all schema models and enums to `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name add-classroom-intelligence-loop`
3. Implement `app/lib/classroom-intelligence/types.ts`
4. Implement `app/lib/classroom-intelligence/concept-difficulty-engine.ts`
5. Add API: `GET /api/classroom-intelligence/concepts/[courseId]`
6. Create `ConceptHeatmap` and `ConceptDetailPanel` components

**Success Metric:** Concept difficulty map populated from StudentConceptMastery data. Difficulty levels distributed reasonably across concepts.

### Phase 2: Insight Generator + Cards

> **Size:** Medium (~500 lines, 5 components)
> **Delivers:** Insight cards generated after assessments, viewable by instructors

1. Implement `app/lib/classroom-intelligence/insight-generator.ts`
2. Create `InsightCardList`, `InsightCard`, `InsightResponseForm` components
3. Add insight API routes (list, view, respond)
4. Wire insight generation into weekly pulse (or post-grading trigger)
5. Add `MiniInsightBanner` to faculty homepage

**Success Metric:** Insight cards generated for courses with low-mastery concepts. Cards include specific concept data and suggested interventions.

### Phase 3: Intervention Tracker + Effectiveness

> **Size:** Medium (~500 lines, 4 components)
> **Delivers:** Intervention recording, outcome measurement, effectiveness analytics

1. Implement `app/lib/classroom-intelligence/intervention-tracker.ts`
2. Create `InterventionForm`, `InterventionTimeline`, `EffectivenessChart` components
3. Add intervention API routes (record, list, effectiveness)
4. Add cron for outcome measurement: `POST /api/cron/intervention-outcomes`
5. Create Intervention Lab page at `/analytics/teaching/interventions`

**Success Metric:** Interventions recorded with pre-metrics. Outcomes measured after 7+ days. Effectiveness data accumulates across courses.

### Phase 4: Weekly Pulse + Dashboard

> **Size:** Large (~700 lines, 6 components)
> **Delivers:** Weekly Teaching Pulse reports, full teaching intelligence dashboard

1. Implement `app/lib/classroom-intelligence/weekly-pulse.ts`
2. Create `WeeklyPulseView`, `PulseHistoryChart`, `TeachingIntelligenceDashboard` components
3. Add weekly pulse cron: `POST /api/cron/classroom-intelligence`
4. Create main page at `/analytics/teaching`
5. Add to analytics sub-nav
6. Wire pulse summary into faculty morning briefing

**Success Metric:** Weekly pulses generated with AI narrative summaries. Dashboard provides comprehensive view. Briefing includes classroom intelligence.

### Phase 5: Sandy Integration + Cross-Section

> **Size:** Medium (~500 lines, 3 components)
> **Delivers:** Sandy tools, proactive nudges, cross-section comparison

1. Implement `app/lib/classroom-intelligence/cross-section-service.ts`
2. Create `CrossSectionTable` and `CrossSectionDetail` components
3. Create cross-section page at `/analytics/teaching/cross-section`
4. Add 5 Sandy agent tools to `classroom-intelligence-tools.ts`
5. Register in `tool-registry.ts`
6. Add proactive nudge conditions
7. Wire Sandy context injection for EDUCATOR on course and analytics pages
8. Feed teaching effectiveness data to Accreditation Autopilot (Standard 8.2a evidence)
9. Feed concept difficulty data to Student Success Early Warning (intervention context)

**Success Metric:** Sandy can answer "which concepts are students struggling with?" Cross-section comparisons identify meaningful differences. Faculty receive proactive alerts about critical concepts.

---

## Privacy Considerations

| Data Point | Who Can See It | Notes |
|-----------|---------------|-------|
| Concept difficulty (class-level) | Course instructor, ADMIN | Aggregate — no individual students identified |
| Individual student mastery | Course instructor only (via existing Student 360) | Not surfaced in classroom intelligence directly |
| Cross-section comparison | All instructors of that course code | Sections anonymized as "Section A, B, C" — no instructor names |
| Intervention records | Logging instructor, ADMIN | Not shared across instructors unless anonymized |
| Sandy question counts | Aggregate only | "15 students asked about X" — no individual attribution |
| Teaching effectiveness signals | Course instructor, ADMIN | Historical data for evidence-based improvement |

**Key rules:**
- Cross-section data is for learning, not evaluation. Instructor names never appear.
- Individual student data flows through existing FERPA-safe channels (Student 360, course roster)
- Sandy question analysis is aggregate — never "Tiana asked about recursion"
- Intervention data is owned by the instructor who logged it
- Accreditation export is anonymized and aggregated

---

## Patent Claims

**Primary Claim:** A computer-implemented closed-loop classroom intelligence system for an AI-mediated educational platform, comprising:
1. A concept difficulty detection engine that aggregates multi-signal data (per-student concept mastery trajectories, rubric dimension scores, AI tutor conversation analysis, spaced repetition failure patterns, and collaborative learning session participation) to identify specific concepts where students struggle, classify difficulty levels, and detect common misconception patterns
2. An instructor insight card generation system that produces actionable, evidence-backed teaching recommendations delivered post-assessment, each including specific concept data, multi-source evidence, suggested intervention approaches ranked by historical effectiveness, and urgency classification
3. An adaptive suggestion engine that recommends specific pedagogical interventions based on concept difficulty patterns, historical intervention effectiveness data across courses, cross-section comparison outcomes, and AI-generated approach recommendations
4. A teaching intervention tracking system that captures pre-intervention concept mastery metrics, records the specific teaching adjustment made, measures post-intervention outcomes after a defined observation period, computes effect sizes, and builds a cumulative evidence base of intervention effectiveness
5. A weekly Teaching Pulse aggregation engine that synthesizes concept difficulty, engagement trends, assessment outcomes, intervention results, and AI-generated narrative summaries into a single instructor-facing intelligence report
6. A cross-section comparison engine that anonymizes and compares student outcomes across multiple sections of the same course, identifies statistically significant differences in concept mastery rates, and surfaces the teaching approaches associated with higher outcomes
7. Integration with a conversational AI agent that enables instructors to query concept difficulty, receive teaching suggestions, and log interventions through natural language interaction

**Dependent Claims:**
- Claim 2: The system of claim 1, wherein the concept difficulty detection incorporates conversation analysis of student interactions with an AI tutoring agent to quantify confusion signals and question frequency as additional difficulty indicators beyond direct assessment data
- Claim 3: The system of claim 1, wherein the intervention suggestion engine prioritizes approaches with demonstrated positive effect sizes from the cumulative intervention effectiveness database, enabling evidence-based pedagogical recommendations that improve over time
- Claim 4: The system of claim 1, further comprising a feedback loop where teaching intervention outcome data is harvested as accreditation evidence for continuous improvement standards, creating a closed loop between daily classroom practice and institutional accreditation compliance
- Claim 5: The system of claim 1, wherein individual student at-risk signals from a retention prediction system are enriched with concept-specific difficulty data to provide instructors with targeted intervention recommendations for specific students on specific concepts
