# Blueprint: Accreditation Autopilot — Continuous Compliance Intelligence

> **Sprint Scope:** Continuous accreditation evidence collection system mapped to SACSCOC standards. Automatically harvests platform data as compliance evidence, detects gaps, generates draft narratives, and tracks readiness across the entire accreditation cycle — replacing the traditional last-minute scramble with always-on compliance intelligence.
> **Depends On:** Assessment Reimagined (evidence layer), ADA Compliance Automation (accessibility evidence), Curriculum Intelligence Network (program quality data), Faculty Intelligence (teaching quality signals), Course/Assignment/Submission data
> **Unlocks:** Self-study acceleration, peer review preparation, program-level compliance dashboards, institutional research automation, Student Success Early Warning evidence export, Classroom Intelligence Loop teaching effectiveness evidence
> **Estimated Size:** Large — 5 phases, each independently deployable (recommend 1 phase per sprint)
> **Patent Relevance:** **HIGH** — "Continuous automated accreditation evidence harvesting, gap detection, and compliance narrative generation for higher education institutions using AI-mediated educational platform data"

---

## Context

### The Problem

Accreditation is the existential requirement for every university — lose it and you lose federal financial aid eligibility, which means you effectively close. Yet the process for demonstrating compliance is stuck in the 1990s:

1. **The 2-year scramble.** SACSCOC reaffirmation happens every 10 years, but institutions typically start serious preparation 2-3 years before the site visit. This means years of operating without knowing where gaps exist, followed by a frantic evidence-gathering sprint.
2. **Evidence archaeology.** When it's time to compile the self-study, teams spend months hunting for evidence that should already exist: "Who has assessment data from Fall 2024?" "Where are the faculty credential files?" "Did anyone save the syllabus review outcomes?" Evidence lives in file cabinets, email threads, shared drives, and people's heads.
3. **Narrative drudgery.** Each standard requires a compliance narrative — a structured argument that the institution meets the requirement, supported by evidence. These narratives are written by committees over months, often from scratch, even when the evidence is straightforward.
4. **Gap discovery at the worst time.** Institutions discover compliance gaps 6 months before the site visit, when it's too late to fix them properly. A gap in assessment data that's discovered in year 8 should have been caught in year 2.
5. **No feedback loop.** After a successful reaffirmation, the evidence collection process stops until the next cycle begins. The institution has no continuous signal about whether new programs, policy changes, or personnel turnover have created new gaps.

### The Vision

| Old Model | New Model | Platform Feature |
|-----------|-----------|-----------------|
| Hunt for evidence at reaffirmation time | Evidence auto-collected as platform activity occurs | Evidence Harvester |
| Unknown gaps until self-study begins | Continuous gap detection with monthly reports | Gap Detector |
| Narratives written from scratch by committees | AI-drafted narratives from collected evidence, human-reviewed | Narrative Generator |
| Binary "compliant / not compliant" | Quality-scored evidence with recency and completeness metrics | Evidence Quality Scoring |
| Department chairs compile their own reports | Program-level dashboards with roll-up to dean and provost | Compliance Dashboard |
| Self-study is a 2-year project | 80%+ evidence pre-collected, draft self-study sections ready | Self-Study Accelerator |
| Hope for the best at site visit | AI simulates peer reviewer questions based on gap analysis | Peer Review Prep |

### Why This Works

1. **the platform already has the data.** Assessment outcomes, course syllabi, faculty credentials, student learning evidence, accessibility reports, student support interventions, course evaluations — SACSCOC standards 6-14 are largely evidenced by data already flowing through the platform.
2. **Evidence is continuous, not episodic.** Because the platform is used daily, evidence accrues naturally. A course that uses rubric-based grading automatically generates Standard 8.2a evidence every time a student is assessed.
3. **AI can map and draft.** The mapping from "this gradebook entry" to "Standard 8.2a evidence" is mechanical. The narrative from "we collected 1,247 rubric-scored assessments across 34 programs" to a compliance argument is a straightforward AI writing task.
4. **Gap detection is cheap.** Comparing "what we have" against "what we need" is a database query, not a committee meeting.
5. **UK's accreditor is SACSCOC.** All 90+ standards are public and well-structured. The mapping is finite and enumerable.

### SACSCOC Standards Coverage

The system focuses on standards where the platform has direct evidence. Not all 90+ standards are platform-relevant — some (like financial stability or physical facilities) require off-platform data.

| SACSCOC Section | Standard | Evidence Source in the platform |
|----------------|----------|-------------------------------|
| 6.1 | Full-time faculty | Faculty profiles, course assignments |
| 6.2a | Faculty qualifications | Faculty credentials (future: HR integration) |
| 8.1 | Student achievement | `GradebookEntry`, `StudentConceptMastery`, completion rates |
| 8.2a | Student learning outcomes | `RubricBreakdown`, `AssessmentEvidence`, `CompetencyRecord` |
| 8.2b | Student outcomes: general education | Cross-course competency aggregation |
| 9.1 | Program content | Course syllabi, `CourseMaterial`, `CourseWeek` structure |
| 9.2 | Program length | Credit hour mapping, program requirements |
| 10.2 | Public information | Published course catalogs, program pages |
| 10.7 | Policies for awarding credit | Grading policies, rubric transparency |
| 12.1 | Student support services | `SuccessIntervention`, advisor interactions, Sandy usage |
| 12.4 | Student complaints | Feedback system, `ContentFeedback`, `ImprovementSuggestion` |
| 13.7 | Physical resources (digital) | `AccessibilityReport`, ADA compliance data |
| 14.1 | Publication of accreditation status | Public website content |

### Integration with Existing Systems

| Existing Feature | Evidence Produced |
|-----------------|-------------------|
| `GradebookEntry` + `RubricBreakdown` | Standard 8.2a: Direct assessment with dimensional scoring |
| `AssessmentEvidence` (Assessment Reimagined) | Standard 8.2a: Multi-modal evidence of student learning |
| `CompetencyRecord` (Assessment Reimagined) | Standard 8.2b: Cross-course competency demonstration |
| `Course` + `CourseWeek` + `CourseMaterial` | Standard 9.1: Program content structure and materials |
| `AccessibilityReport` (ADA Compliance) | Standard 12.4/13.7: Accessibility compliance evidence |
| `SuccessIntervention` (Student Success Early Warning) | Standard 12.1: Student support service documentation |
| `ContentFeedback` + `ImprovementSuggestion` (Contribute) | Standard 12.4: Student complaint/feedback mechanisms |
| `CurriculumNode` + `CurriculumEdge` (Curriculum Intelligence Network) | Standards 8-9: Program quality and curriculum mapping |
| `FacultyBriefing` + Classroom Intelligence Loop | Standard 6/8: Teaching quality and continuous improvement |
| `CourseAIPolicy` (AI Literacy) | Standard 10.7: Policy transparency for AI-augmented learning |
| `DegreeProgram` + `DegreeAuditResult` | Standards 8-9: Program requirements and student progression |

---

## Schema Changes

### New Enum: `AccreditationBody`

```prisma
enum AccreditationBody {
  SACSCOC          // Southern Association of Colleges and Schools Commission on Colleges
  ABET             // Engineering/CS programs
  AACSB            // Business programs
  NCATE_CAEP       // Education programs
  ABA              // Law programs
  CUSTOM           // Institution-defined standards
}
```

### New Enum: `EvidenceQuality`

```prisma
enum EvidenceQuality {
  EXCELLENT        // Recent, complete, well-aligned, reviewed
  GOOD             // Adequate evidence with minor gaps
  FAIR             // Evidence exists but may be outdated or incomplete
  WEAK             // Minimal evidence, needs supplementation
  MISSING          // No evidence collected
}
```

### New Enum: `NarrativeStatus`

```prisma
enum NarrativeStatus {
  NOT_STARTED      // No narrative exists
  AI_DRAFT         // AI generated first draft
  IN_REVIEW        // Under human review
  REVISION_NEEDED  // Reviewer requested changes
  APPROVED         // Approved by responsible party
  FINAL            // Locked for submission
}
```

### New Enum: `AccreditationCyclePhase`

```prisma
enum AccreditationCyclePhase {
  MAINTENANCE      // Years 1-7: Routine evidence collection
  PREPARATION      // Years 8-9: Active self-study preparation
  SELF_STUDY       // Year 9-10: Writing and compiling the report
  SITE_VISIT       // Site visit window
  RESPONSE         // Post-visit response period
  COMPLETE         // Cycle complete, next cycle begins
}
```

### New Model: `AccreditationStandard`

The standards registry. Hierarchical: sections contain standards, standards contain sub-requirements.

```prisma
model AccreditationStandard {
  id              String             @id @default(cuid())
  body            AccreditationBody  @default(SACSCOC)

  // Hierarchy
  sectionNumber   String             // "8", "12", "6"
  sectionTitle    String             // "Student Achievement", "Student Support"
  standardNumber  String             // "8.2a", "12.1", "6.2a"
  standardTitle   String             // "Student Learning Outcomes"
  subRequirements Json?              // [{id: "8.2a.1", title: "...", description: "..."}]

  // Requirements
  description     String   @db.Text  // Full standard text
  evidenceTypes   String[]           // What kinds of evidence satisfy this: ["assessment_data", "syllabi", "faculty_credentials"]
  collectionFrequency String         // "continuous" | "annual" | "per_cycle" | "on_change"
  qualityThreshold String @default("GOOD") // Minimum acceptable evidence quality

  // Platform mapping
  autoHarvestable Boolean  @default(false) // Can evidence be auto-collected from platform data?
  harvestSources  Json?              // [{model: "GradebookEntry", query: "...", field: "..."}]
  manualRequired  Boolean  @default(false) // Does this standard need manual evidence upload?

  // Metadata
  notes           String?  @db.Text  // Internal notes about this standard
  lastReviewedAt  DateTime?
  isActive        Boolean  @default(true)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  evidence        AccreditationEvidence[]
  narratives      ComplianceNarrative[]
  gaps            ComplianceGap[]

  @@unique([body, standardNumber])
  @@index([body, sectionNumber])
}
```

### New Model: `AccreditationCycle`

Tracks the institution's accreditation timeline.

```prisma
model AccreditationCycle {
  id              String                @id @default(cuid())
  body            AccreditationBody     @default(SACSCOC)
  cycleName       String                // "2024-2034 Reaffirmation Cycle"

  // Timeline
  cycleStartDate  DateTime              // When this cycle began
  cycleEndDate    DateTime              // Expected completion
  siteVisitDate   DateTime?             // Scheduled or estimated site visit
  selfStudyDue    DateTime?             // Self-study submission deadline
  responseDeadline DateTime?            // Post-visit response deadline

  phase           AccreditationCyclePhase @default(MAINTENANCE)

  // Status
  overallReadiness Float  @default(0)   // 0-1: composite readiness score
  standardsMet     Int    @default(0)
  standardsTotal   Int    @default(0)
  gapCount         Int    @default(0)

  notes           String?  @db.Text
  isActive        Boolean  @default(true)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  evidence        AccreditationEvidence[]
  narratives      ComplianceNarrative[]
  gaps            ComplianceGap[]

  @@index([body, isActive])
}
```

### New Model: `AccreditationEvidence`

Individual pieces of evidence linked to standards. Auto-harvested or manually uploaded.

```prisma
model AccreditationEvidence {
  id              String               @id @default(cuid())
  standardId      String
  standard        AccreditationStandard @relation(fields: [standardId], references: [id])
  cycleId         String
  cycle           AccreditationCycle   @relation(fields: [cycleId], references: [id])

  // Evidence content
  title           String               // "Fall 2025 CS 101 Rubric Assessment Data"
  description     String   @db.Text    // What this evidence demonstrates
  evidenceType    String               // "assessment_data" | "syllabus" | "faculty_credential" | "policy_document" | "accessibility_report" | "student_support" | "feedback" | "custom"

  // Source tracking
  sourceType      String               // "auto_harvest" | "manual_upload" | "linked_record"
  sourceModel     String?              // Prisma model name: "GradebookEntry", "AccessibilityReport", etc.
  sourceQuery     String?  @db.Text    // Query used to harvest this evidence
  sourceIds       String[]             // IDs of source records
  sourceCount     Int      @default(1) // How many source records

  // Content
  dataSnapshot    Json?                // Cached data at time of harvest (for historical reference)
  fileUrl         String?              // For manual uploads
  fileName        String?

  // Quality assessment
  quality         EvidenceQuality      @default(MISSING)
  qualityScore    Float?               // 0-1: AI-assessed quality
  qualityNotes    String?  @db.Text    // AI explanation of quality assessment
  completeness    Float?               // 0-1: how complete is this evidence
  recency         Float?               // 0-1: how recent (1.0 = this semester, 0.5 = last year, 0.1 = 3+ years)
  alignment       Float?               // 0-1: how well does this evidence align with the standard

  // Review
  reviewedBy      String?
  reviewedAt      DateTime?
  reviewNotes     String?  @db.Text
  isApproved      Boolean  @default(false)

  // Scope
  programCode     String?              // If program-specific: "CS-BS", "BIO-MS"
  departmentId    String?              // If department-specific
  courseId         String?              // If course-specific
  semesterCode    String?              // "FA2025", "SP2026"

  harvestedAt     DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([standardId, cycleId])
  @@index([programCode])
  @@index([quality])
  @@index([evidenceType])
}
```

### New Model: `ComplianceGap`

Detected gaps between required and collected evidence.

```prisma
model ComplianceGap {
  id              String               @id @default(cuid())
  standardId      String
  standard        AccreditationStandard @relation(fields: [standardId], references: [id])
  cycleId         String
  cycle           AccreditationCycle   @relation(fields: [cycleId], references: [id])

  // Gap description
  title           String               // "Missing assessment data for Music Education program"
  description     String   @db.Text    // Detailed gap analysis
  severity        String               // "critical" | "major" | "minor" | "informational"

  // What's missing
  missingEvidenceTypes String[]        // What types of evidence are needed
  affectedPrograms    String[]         // Program codes affected
  estimatedEffort     String?          // "1 hour" | "1 week" | "1 semester" — how long to fix

  // Remediation
  suggestedActions    Json              // [{action: "Collect rubric data from...", responsible: "Department Chair", deadline: "..."}]
  remediationStatus   String  @default("open") // "open" | "in_progress" | "resolved" | "accepted_risk"
  assignedTo          String?
  resolvedAt          DateTime?
  resolutionNotes     String?  @db.Text

  detectedAt      DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([standardId, severity])
  @@index([cycleId, remediationStatus])
}
```

### New Model: `ComplianceNarrative`

AI-drafted and human-reviewed compliance narratives per standard.

```prisma
model ComplianceNarrative {
  id              String               @id @default(cuid())
  standardId      String
  standard        AccreditationStandard @relation(fields: [standardId], references: [id])
  cycleId         String
  cycle           AccreditationCycle   @relation(fields: [cycleId], references: [id])

  // Content
  status          NarrativeStatus      @default(NOT_STARTED)
  draftContent    String?  @db.Text    // AI-generated draft
  finalContent    String?  @db.Text    // Human-approved final version
  version         Int      @default(1) // Increments on each revision

  // AI generation metadata
  aiModel         String?              // Which model generated the draft
  evidenceUsed    String[]             // Evidence IDs used in generation
  confidenceScore Float?               // 0-1: how confident the AI is in the narrative
  generatedAt     DateTime?

  // Review workflow
  reviewerId      String?
  reviewer        User?    @relation(fields: [reviewerId], references: [id])
  reviewComments  String?  @db.Text
  reviewedAt      DateTime?
  approvedBy      String?
  approvedAt      DateTime?

  // Version history (stored as JSON for simplicity)
  versionHistory  Json?               // [{version: 1, content: "...", author: "ai|userId", timestamp: "..."}]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([standardId, cycleId, version])
  @@index([cycleId, status])
}
```

### New Model: `AccreditationReadinessSnapshot`

Daily/weekly snapshot for trend tracking.

```prisma
model AccreditationReadinessSnapshot {
  id              String   @id @default(cuid())
  cycleId         String
  
  overallReadiness Float              // 0-1
  standardsMet     Int
  standardsPartial Int
  standardsGapped  Int
  gapsBySeverity   Json               // {critical: 2, major: 5, minor: 12}
  evidenceCount    Int
  narrativesApproved Int

  snapshotAt      DateTime @default(now())

  @@index([cycleId, snapshotAt])
}
```

---

## Service Architecture

### Service: `app/lib/accreditation/types.ts`

```typescript
// ─── Shared types for Accreditation Autopilot ─────────────────────────

export type EvidenceQualityLevel = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'WEAK' | 'MISSING'
export type GapSeverity = 'critical' | 'major' | 'minor' | 'informational'
export type NarrativeStatusType = 'NOT_STARTED' | 'AI_DRAFT' | 'IN_REVIEW' | 'REVISION_NEEDED' | 'APPROVED' | 'FINAL'

export interface StandardCompliance {
  standardId: string
  standardNumber: string
  standardTitle: string
  evidenceCount: number
  evidenceQuality: EvidenceQualityLevel
  qualityScore: number        // 0-1
  gapCount: number
  criticalGaps: number
  narrativeStatus: NarrativeStatusType
  isAutoHarvestable: boolean
  lastHarvestedAt: Date | null
  programs: ProgramCompliance[]
}

export interface ProgramCompliance {
  programCode: string
  programName: string
  evidenceCount: number
  qualityScore: number
  gaps: string[]              // Gap titles
}

export interface ComplianceDashboard {
  cycleId: string
  cycleName: string
  phase: string
  overallReadiness: number    // 0-1
  siteVisitDate: Date | null
  daysUntilSiteVisit: number | null
  standardsSummary: {
    total: number
    met: number
    partial: number
    gapped: number
  }
  gapSummary: {
    critical: number
    major: number
    minor: number
    informational: number
  }
  narrativeSummary: {
    notStarted: number
    aiDraft: number
    inReview: number
    approved: number
    final: number
  }
  recentActivity: { date: Date; action: string; standard: string }[]
  trendData: { date: Date; readiness: number }[]
}

export interface EvidenceHarvestResult {
  standardId: string
  harvested: number
  skipped: number
  errors: string[]
}

export interface GapAnalysisResult {
  standardId: string
  standardNumber: string
  gaps: {
    title: string
    severity: GapSeverity
    missingTypes: string[]
    affectedPrograms: string[]
    suggestedActions: string[]
    estimatedEffort: string
  }[]
}

export interface NarrativeGenerationInput {
  standardId: string
  cycleId: string
  evidence: {
    title: string
    description: string
    dataSnapshot: Record<string, unknown>
    quality: string
    semesterCode: string | null
  }[]
  gaps: { title: string; severity: string }[]
  previousNarrative: string | null
}

// SACSCOC standard seed data structure
export interface StandardSeedData {
  sectionNumber: string
  sectionTitle: string
  standardNumber: string
  standardTitle: string
  description: string
  evidenceTypes: string[]
  collectionFrequency: string
  autoHarvestable: boolean
  harvestSources: { model: string; description: string }[] | null
}
```

### Service: `app/lib/accreditation/standards-registry.ts`

Seeds and manages the SACSCOC standards hierarchy.

```typescript
import { prisma } from '../prisma'
import type { StandardSeedData } from './types'

/** SACSCOC standards relevant to the platform data */
export const SACSCOC_STANDARDS: StandardSeedData[] = [
  {
    sectionNumber: '6',
    sectionTitle: 'Faculty',
    standardNumber: '6.1',
    standardTitle: 'Full-time Faculty',
    description: 'The institution employs an adequate number of full-time faculty members to support the mission and goals of the institution.',
    evidenceTypes: ['faculty_credential', 'course_assignment'],
    collectionFrequency: 'annual',
    autoHarvestable: false,
    harvestSources: null,
  },
  {
    sectionNumber: '6',
    sectionTitle: 'Faculty',
    standardNumber: '6.2a',
    standardTitle: 'Faculty Qualifications',
    description: 'For each of its educational programs, the institution employs a sufficient number of full-time faculty members to ensure curriculum and program quality, improvement, and student learning.',
    evidenceTypes: ['faculty_credential', 'course_assignment', 'teaching_evaluation'],
    collectionFrequency: 'annual',
    autoHarvestable: false,
    harvestSources: null,
  },
  {
    sectionNumber: '8',
    sectionTitle: 'Student Achievement',
    standardNumber: '8.1',
    standardTitle: 'Student Achievement',
    description: 'The institution identifies, evaluates, and publishes goals and outcomes for student achievement appropriate to the institution\'s mission, the nature of the students it serves, and the kinds of programs offered.',
    evidenceTypes: ['assessment_data', 'completion_rates', 'retention_data'],
    collectionFrequency: 'continuous',
    autoHarvestable: true,
    harvestSources: [
      { model: 'GradebookEntry', description: 'Course grade distributions and pass rates' },
      { model: 'CourseEnrollment', description: 'Enrollment and completion counts' },
    ],
  },
  {
    sectionNumber: '8',
    sectionTitle: 'Student Achievement',
    standardNumber: '8.2a',
    standardTitle: 'Student Learning Outcomes',
    description: 'The institution identifies expected outcomes, assesses the extent to which it achieves these outcomes, and provides evidence of seeking improvement based on analysis of the results.',
    evidenceTypes: ['assessment_data', 'rubric_data', 'competency_data', 'improvement_actions'],
    collectionFrequency: 'continuous',
    autoHarvestable: true,
    harvestSources: [
      { model: 'RubricBreakdown', description: 'Per-submission dimensional AI scoring' },
      { model: 'AssessmentEvidence', description: 'Multi-modal assessment evidence' },
      { model: 'CompetencyRecord', description: 'Cross-course competency aggregation' },
      { model: 'StudentConceptMastery', description: 'Per-concept mastery tracking' },
    ],
  },
  {
    sectionNumber: '8',
    sectionTitle: 'Student Achievement',
    standardNumber: '8.2b',
    standardTitle: 'Student Outcomes: General Education',
    description: 'The institution identifies expected outcomes for its general education program, assesses the extent to which it achieves these outcomes, and provides evidence of seeking improvement.',
    evidenceTypes: ['competency_data', 'general_education_assessment'],
    collectionFrequency: 'annual',
    autoHarvestable: true,
    harvestSources: [
      { model: 'CompetencyRecord', description: 'Cross-course competency for gen-ed outcomes' },
    ],
  },
  {
    sectionNumber: '9',
    sectionTitle: 'Educational Program Structure',
    standardNumber: '9.1',
    standardTitle: 'Program Content',
    description: 'Educational programs are appropriate in content, rigor, and expected learning outcomes and are consistent with the institution\'s mission.',
    evidenceTypes: ['syllabi', 'course_materials', 'program_structure'],
    collectionFrequency: 'per_cycle',
    autoHarvestable: true,
    harvestSources: [
      { model: 'Course', description: 'Course catalog and descriptions' },
      { model: 'CourseWeek', description: 'Weekly content structure' },
      { model: 'CourseMaterial', description: 'Uploaded course materials' },
    ],
  },
  {
    sectionNumber: '10',
    sectionTitle: 'Educational Policies, Procedures, and Practices',
    standardNumber: '10.7',
    standardTitle: 'Policies for Awarding Credit',
    description: 'The institution publishes and implements policies for determining the amount and level of credit awarded for courses.',
    evidenceTypes: ['policy_document', 'grading_policy', 'ai_policy'],
    collectionFrequency: 'on_change',
    autoHarvestable: true,
    harvestSources: [
      { model: 'CourseAIPolicy', description: 'AI usage policies per course' },
    ],
  },
  {
    sectionNumber: '12',
    sectionTitle: 'Academic and Student Support Services',
    standardNumber: '12.1',
    standardTitle: 'Student Support Services',
    description: 'The institution provides appropriate academic and student support programs, services, and activities consistent with its mission.',
    evidenceTypes: ['student_support', 'intervention_data', 'advising_data'],
    collectionFrequency: 'continuous',
    autoHarvestable: true,
    harvestSources: [
      { model: 'SuccessIntervention', description: 'Student success intervention records' },
      { model: 'ToolSession', description: 'AI tutoring and study support usage' },
    ],
  },
  {
    sectionNumber: '12',
    sectionTitle: 'Academic and Student Support Services',
    standardNumber: '12.4',
    standardTitle: 'Student Complaints',
    description: 'The institution publishes and follows an established process for addressing student complaints.',
    evidenceTypes: ['feedback', 'complaint_process', 'resolution_data'],
    collectionFrequency: 'continuous',
    autoHarvestable: true,
    harvestSources: [
      { model: 'ContentFeedback', description: 'Student feedback on tools and courses' },
      { model: 'ImprovementSuggestion', description: 'Student improvement suggestions' },
    ],
  },
  {
    sectionNumber: '13',
    sectionTitle: 'Financial and Physical Resources',
    standardNumber: '13.7',
    standardTitle: 'Physical Resources',
    description: 'The institution ensures adequate physical facilities and resources, both on and off campus, that support its mission and programs.',
    evidenceTypes: ['accessibility_report', 'digital_accessibility'],
    collectionFrequency: 'continuous',
    autoHarvestable: true,
    harvestSources: [
      { model: 'AccessibilityReport', description: 'ADA compliance scan reports' },
    ],
  },
]

/** Seed standards into the database */
export async function seedStandards() {
  let created = 0
  for (const std of SACSCOC_STANDARDS) {
    await prisma.accreditationStandard.upsert({
      where: { body_standardNumber: { body: 'SACSCOC', standardNumber: std.standardNumber } },
      create: {
        body: 'SACSCOC',
        sectionNumber: std.sectionNumber,
        sectionTitle: std.sectionTitle,
        standardNumber: std.standardNumber,
        standardTitle: std.standardTitle,
        description: std.description,
        evidenceTypes: std.evidenceTypes,
        collectionFrequency: std.collectionFrequency,
        autoHarvestable: std.autoHarvestable,
        harvestSources: std.harvestSources,
      },
      update: {
        description: std.description,
        evidenceTypes: std.evidenceTypes,
        autoHarvestable: std.autoHarvestable,
        harvestSources: std.harvestSources,
      },
    })
    created++
  }
  return { created }
}
```

### Service: `app/lib/accreditation/evidence-harvester.ts`

Automatically collects evidence from platform data mapped to standards.

```typescript
import { prisma } from '../prisma'
import type { EvidenceHarvestResult } from './types'

/** Harvest evidence for all auto-harvestable standards */
export async function harvestAllEvidence(cycleId: string): Promise<EvidenceHarvestResult[]> {
  const standards = await prisma.accreditationStandard.findMany({
    where: { autoHarvestable: true, isActive: true },
  })

  const results: EvidenceHarvestResult[] = []

  for (const standard of standards) {
    const result = await harvestForStandard(standard.id, cycleId, standard)
    results.push(result)
  }

  return results
}

/** Harvest evidence for a single standard */
async function harvestForStandard(
  standardId: string,
  cycleId: string,
  standard: { standardNumber: string; harvestSources: unknown }
): Promise<EvidenceHarvestResult> {
  const sources = (standard.harvestSources as { model: string; description: string }[]) ?? []
  let harvested = 0
  let skipped = 0
  const errors: string[] = []

  for (const source of sources) {
    try {
      switch (source.model) {
        case 'GradebookEntry':
          harvested += await harvestGradebookEvidence(standardId, cycleId)
          break
        case 'RubricBreakdown':
          harvested += await harvestRubricEvidence(standardId, cycleId)
          break
        case 'AssessmentEvidence':
          harvested += await harvestAssessmentEvidence(standardId, cycleId)
          break
        case 'CompetencyRecord':
          harvested += await harvestCompetencyEvidence(standardId, cycleId)
          break
        case 'StudentConceptMastery':
          harvested += await harvestConceptMasteryEvidence(standardId, cycleId)
          break
        case 'Course':
          harvested += await harvestCourseEvidence(standardId, cycleId)
          break
        case 'CourseWeek':
        case 'CourseMaterial':
          harvested += await harvestCourseMaterialEvidence(standardId, cycleId)
          break
        case 'AccessibilityReport':
          harvested += await harvestAccessibilityEvidence(standardId, cycleId)
          break
        case 'SuccessIntervention':
          harvested += await harvestInterventionEvidence(standardId, cycleId)
          break
        case 'ContentFeedback':
        case 'ImprovementSuggestion':
          harvested += await harvestFeedbackEvidence(standardId, cycleId)
          break
        case 'ToolSession':
          harvested += await harvestToolSessionEvidence(standardId, cycleId)
          break
        case 'CourseAIPolicy':
          harvested += await harvestAIPolicyEvidence(standardId, cycleId)
          break
        case 'CourseEnrollment':
          harvested += await harvestEnrollmentEvidence(standardId, cycleId)
          break
        default:
          skipped++
      }
    } catch (err) {
      errors.push(`${source.model}: ${(err as Error).message}`)
    }
  }

  return { standardId, harvested, skipped, errors }
}

/** Harvest rubric-based assessment data as Standard 8.2a evidence */
async function harvestRubricEvidence(standardId: string, cycleId: string): Promise<number> {
  const currentSemester = getCurrentSemester()

  // Check if we already harvested this semester
  const existing = await prisma.accreditationEvidence.findFirst({
    where: { standardId, cycleId, evidenceType: 'rubric_data', semesterCode: currentSemester },
  })
  if (existing) return 0

  // Aggregate rubric data
  const rubrics = await prisma.rubricBreakdown.count({
    where: { createdAt: { gte: getSemesterStart(currentSemester) } },
  })

  const byProgram = await prisma.rubricBreakdown.groupBy({
    by: ['assignmentId'],
    where: { createdAt: { gte: getSemesterStart(currentSemester) } },
    _count: true,
  })

  if (rubrics === 0) return 0

  await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId,
      title: `${currentSemester} Rubric-Based Assessment Data`,
      description: `${rubrics} rubric-scored assessments collected across ${byProgram.length} assignments during ${currentSemester}. Each assessment includes dimensional AI scoring with faculty review.`,
      evidenceType: 'rubric_data',
      sourceType: 'auto_harvest',
      sourceModel: 'RubricBreakdown',
      sourceCount: rubrics,
      quality: rubrics >= 100 ? 'EXCELLENT' : rubrics >= 20 ? 'GOOD' : 'FAIR',
      qualityScore: Math.min(1, rubrics / 100),
      completeness: Math.min(1, rubrics / 50),
      recency: 1.0,
      alignment: 0.9,
      semesterCode: currentSemester,
      dataSnapshot: {
        totalRubrics: rubrics,
        assignmentCount: byProgram.length,
        harvestedAt: new Date().toISOString(),
      },
    },
  })

  return 1
}

/** Harvest gradebook data for Standard 8.1 */
async function harvestGradebookEvidence(standardId: string, cycleId: string): Promise<number> {
  const currentSemester = getCurrentSemester()
  const existing = await prisma.accreditationEvidence.findFirst({
    where: { standardId, cycleId, evidenceType: 'assessment_data', semesterCode: currentSemester },
  })
  if (existing) return 0

  const entries = await prisma.gradebookEntry.count({
    where: {
      releasedScore: { not: null },
      gradedAt: { gte: getSemesterStart(currentSemester) },
    },
  })

  if (entries === 0) return 0

  // Score distribution
  const allEntries = await prisma.gradebookEntry.findMany({
    where: {
      releasedScore: { not: null },
      gradedAt: { gte: getSemesterStart(currentSemester) },
    },
    select: { releasedScore: true },
  })

  const scores = allEntries.map(e => e.releasedScore!)
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  const passRate = scores.filter(s => s >= 60).length / scores.length

  await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId,
      title: `${currentSemester} Student Achievement Data`,
      description: `${entries} graded assessments. Average score: ${avg.toFixed(1)}%. Pass rate: ${(passRate * 100).toFixed(1)}%.`,
      evidenceType: 'assessment_data',
      sourceType: 'auto_harvest',
      sourceModel: 'GradebookEntry',
      sourceCount: entries,
      quality: entries >= 200 ? 'EXCELLENT' : entries >= 50 ? 'GOOD' : 'FAIR',
      qualityScore: Math.min(1, entries / 200),
      completeness: Math.min(1, entries / 100),
      recency: 1.0,
      alignment: 0.85,
      semesterCode: currentSemester,
      dataSnapshot: {
        totalEntries: entries,
        avgScore: avg,
        passRate,
        harvestedAt: new Date().toISOString(),
      },
    },
  })

  return 1
}

// Additional harvest functions follow the same pattern:
// harvestAssessmentEvidence, harvestCompetencyEvidence, harvestConceptMasteryEvidence,
// harvestCourseEvidence, harvestCourseMaterialEvidence, harvestAccessibilityEvidence,
// harvestInterventionEvidence, harvestFeedbackEvidence, harvestToolSessionEvidence,
// harvestAIPolicyEvidence, harvestEnrollmentEvidence

async function harvestAccessibilityEvidence(standardId: string, cycleId: string): Promise<number> {
  const currentSemester = getCurrentSemester()
  const existing = await prisma.accreditationEvidence.findFirst({
    where: { standardId, cycleId, evidenceType: 'accessibility_report', semesterCode: currentSemester },
  })
  if (existing) return 0

  const reports = await prisma.accessibilityReport.count({
    where: { createdAt: { gte: getSemesterStart(currentSemester) } },
  })

  if (reports === 0) return 0

  await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId,
      title: `${currentSemester} ADA Compliance Scan Reports`,
      description: `${reports} accessibility compliance scans conducted on course materials, tools, and content.`,
      evidenceType: 'accessibility_report',
      sourceType: 'auto_harvest',
      sourceModel: 'AccessibilityReport',
      sourceCount: reports,
      quality: reports >= 50 ? 'EXCELLENT' : reports >= 10 ? 'GOOD' : 'FAIR',
      qualityScore: Math.min(1, reports / 50),
      completeness: Math.min(1, reports / 20),
      recency: 1.0,
      alignment: 0.95,
      semesterCode: currentSemester,
      dataSnapshot: { totalReports: reports, harvestedAt: new Date().toISOString() },
    },
  })

  return 1
}

async function harvestInterventionEvidence(standardId: string, cycleId: string): Promise<number> {
  const currentSemester = getCurrentSemester()
  const existing = await prisma.accreditationEvidence.findFirst({
    where: { standardId, cycleId, evidenceType: 'student_support', semesterCode: currentSemester },
  })
  if (existing) return 0

  const interventions = await prisma.successIntervention.count({
    where: { createdAt: { gte: getSemesterStart(currentSemester) } },
  })

  if (interventions === 0) return 0

  const outcomes = await prisma.successIntervention.groupBy({
    by: ['outcome'],
    where: { createdAt: { gte: getSemesterStart(currentSemester) } },
    _count: true,
  })

  await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId,
      title: `${currentSemester} Student Support Intervention Data`,
      description: `${interventions} student support interventions recorded. Outcome tracking: ${outcomes.map(o => `${o.outcome}: ${o._count}`).join(', ')}.`,
      evidenceType: 'student_support',
      sourceType: 'auto_harvest',
      sourceModel: 'SuccessIntervention',
      sourceCount: interventions,
      quality: interventions >= 20 ? 'EXCELLENT' : interventions >= 5 ? 'GOOD' : 'FAIR',
      qualityScore: Math.min(1, interventions / 20),
      completeness: 0.8,
      recency: 1.0,
      alignment: 0.9,
      semesterCode: currentSemester,
      dataSnapshot: { totalInterventions: interventions, outcomes, harvestedAt: new Date().toISOString() },
    },
  })

  return 1
}

// Utility functions
function getCurrentSemester(): string {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  if (month >= 0 && month <= 4) return `SP${year}`
  if (month >= 5 && month <= 7) return `SU${year}`
  return `FA${year}`
}

function getSemesterStart(code: string): Date {
  const year = parseInt(code.slice(2))
  if (code.startsWith('SP')) return new Date(year, 0, 1)
  if (code.startsWith('SU')) return new Date(year, 5, 1)
  return new Date(year, 7, 1)
}
```

### Service: `app/lib/accreditation/gap-detector.ts`

Compares collected evidence against requirements to find compliance gaps.

```typescript
import { prisma } from '../prisma'
import type { GapAnalysisResult, GapSeverity } from './types'

/** Run gap analysis for all standards in a cycle */
export async function analyzeAllGaps(cycleId: string): Promise<GapAnalysisResult[]> {
  const standards = await prisma.accreditationStandard.findMany({
    where: { isActive: true },
    include: {
      evidence: { where: { cycleId } },
      gaps: { where: { cycleId, remediationStatus: { not: 'resolved' } } },
    },
  })

  const results: GapAnalysisResult[] = []

  for (const standard of standards) {
    const gaps = detectGapsForStandard(standard, cycleId)
    results.push({
      standardId: standard.id,
      standardNumber: standard.standardNumber,
      gaps,
    })

    // Upsert gaps into database
    for (const gap of gaps) {
      const existingGap = await prisma.complianceGap.findFirst({
        where: { standardId: standard.id, cycleId, title: gap.title, remediationStatus: { not: 'resolved' } },
      })

      if (!existingGap) {
        await prisma.complianceGap.create({
          data: {
            standardId: standard.id,
            cycleId,
            title: gap.title,
            description: `Gap detected: ${gap.title}. ${gap.suggestedActions.join(' ')}`,
            severity: gap.severity,
            missingEvidenceTypes: gap.missingTypes,
            affectedPrograms: gap.affectedPrograms,
            estimatedEffort: gap.estimatedEffort,
            suggestedActions: gap.suggestedActions.map(a => ({
              action: a,
              responsible: 'Department Chair',
              deadline: null,
            })),
          },
        })
      }
    }
  }

  return results
}

function detectGapsForStandard(
  standard: {
    standardNumber: string
    evidenceTypes: string[]
    collectionFrequency: string
    evidence: { evidenceType: string; quality: string; semesterCode: string | null; programCode: string | null }[]
  },
  cycleId: string
): GapAnalysisResult['gaps'] {
  const gaps: GapAnalysisResult['gaps'] = []
  const collectedTypes = new Set(standard.evidence.map(e => e.evidenceType))
  const requiredTypes = standard.evidenceTypes

  // Check for missing evidence types
  for (const required of requiredTypes) {
    if (!collectedTypes.has(required)) {
      gaps.push({
        title: `Missing ${required} evidence for Standard ${standard.standardNumber}`,
        severity: determineSeverity(required, standard.collectionFrequency),
        missingTypes: [required],
        affectedPrograms: [],
        suggestedActions: [`Collect ${required} evidence for Standard ${standard.standardNumber}`],
        estimatedEffort: estimateEffort(required),
      })
    }
  }

  // Check evidence quality
  const weakEvidence = standard.evidence.filter(e => e.quality === 'WEAK' || e.quality === 'FAIR')
  if (weakEvidence.length > 0 && standard.evidence.length > 0) {
    const weakRatio = weakEvidence.length / standard.evidence.length
    if (weakRatio > 0.5) {
      gaps.push({
        title: `Low quality evidence for Standard ${standard.standardNumber}`,
        severity: 'major',
        missingTypes: [],
        affectedPrograms: [],
        suggestedActions: [
          'Review and supplement weak evidence items',
          'Consider collecting additional evidence sources',
        ],
        estimatedEffort: '1-2 weeks',
      })
    }
  }

  // Check recency for continuous-collection standards
  if (standard.collectionFrequency === 'continuous') {
    const currentSemester = getCurrentSemester()
    const hasCurrentEvidence = standard.evidence.some(e => e.semesterCode === currentSemester)
    if (!hasCurrentEvidence && standard.evidence.length > 0) {
      gaps.push({
        title: `Stale evidence for Standard ${standard.standardNumber} — no data from current semester`,
        severity: 'minor',
        missingTypes: [],
        affectedPrograms: [],
        suggestedActions: ['Run evidence harvester for current semester data'],
        estimatedEffort: '1 hour',
      })
    }
  }

  return gaps
}

function determineSeverity(evidenceType: string, frequency: string): GapSeverity {
  if (frequency === 'continuous' && ['assessment_data', 'rubric_data'].includes(evidenceType)) return 'critical'
  if (['assessment_data', 'student_support'].includes(evidenceType)) return 'major'
  return 'minor'
}

function estimateEffort(evidenceType: string): string {
  switch (evidenceType) {
    case 'assessment_data': return '1-2 weeks (requires assessment cycle)'
    case 'faculty_credential': return '2-4 weeks (requires HR coordination)'
    case 'syllabi': return '1 week (requires faculty collection)'
    case 'accessibility_report': return '1 day (automated scan)'
    case 'student_support': return '1 semester (requires intervention data accumulation)'
    default: return '1-2 weeks'
  }
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

### Service: `app/lib/accreditation/narrative-generator.ts`

AI-powered compliance narrative drafting.

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import type { NarrativeGenerationInput } from './types'

const anthropic = new Anthropic()

/** Generate or regenerate a compliance narrative for a standard */
export async function generateNarrative(input: NarrativeGenerationInput): Promise<{
  content: string
  confidenceScore: number
  evidenceUsed: string[]
}> {
  const standard = await prisma.accreditationStandard.findUnique({
    where: { id: input.standardId },
  })
  if (!standard) throw new Error('Standard not found')

  const evidenceSummary = input.evidence.map(e =>
    `- **${e.title}** (${e.quality}): ${e.description}`
  ).join('\n')

  const gapSummary = input.gaps.length > 0
    ? `\n\n## Known Gaps\n${input.gaps.map(g => `- ${g.title} (${g.severity})`).join('\n')}`
    : ''

  const previousContext = input.previousNarrative
    ? `\n\n## Previous Narrative (for reference — improve, don't copy)\n${input.previousNarrative.slice(0, 2000)}`
    : ''

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are writing a SACSCOC accreditation compliance narrative for a university. Write a clear, evidence-based narrative that demonstrates compliance with the given standard.

## Standard
**${standard.standardNumber}: ${standard.standardTitle}**
${standard.description}

## Collected Evidence
${evidenceSummary}
${gapSummary}
${previousContext}

## Instructions
1. Write a 2-4 paragraph narrative in formal academic prose
2. Reference specific evidence by title
3. Use quantitative data from evidence descriptions where available
4. If gaps exist, acknowledge them and describe remediation plans
5. Focus on continuous improvement — SACSCOC values process over perfection
6. End with a forward-looking statement about ongoing evidence collection

## Format
Return ONLY the narrative text. No headers, no metadata. Write as if this will be inserted directly into the self-study report.

Also include a confidence line at the very end in this format:
<!--CONFIDENCE:0.X-->
where 0.X is your confidence (0.0-1.0) that this narrative would satisfy a peer reviewer.`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Extract confidence
  const confidenceMatch = text.match(/<!--CONFIDENCE:([\d.]+)-->/)
  const confidenceScore = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5
  const content = text.replace(/<!--CONFIDENCE:[\d.]+-->/, '').trim()

  return {
    content,
    confidenceScore,
    evidenceUsed: input.evidence.map(e => e.title),
  }
}

/** Generate and persist a narrative draft */
export async function generateAndSaveNarrative(standardId: string, cycleId: string) {
  // Gather evidence
  const evidence = await prisma.accreditationEvidence.findMany({
    where: { standardId, cycleId },
    orderBy: { qualityScore: 'desc' },
  })

  const gaps = await prisma.complianceGap.findMany({
    where: { standardId, cycleId, remediationStatus: { not: 'resolved' } },
  })

  // Check for existing narrative
  const existing = await prisma.complianceNarrative.findFirst({
    where: { standardId, cycleId },
    orderBy: { version: 'desc' },
  })

  const result = await generateNarrative({
    standardId,
    cycleId,
    evidence: evidence.map(e => ({
      title: e.title,
      description: e.description,
      dataSnapshot: e.dataSnapshot as Record<string, unknown>,
      quality: e.quality,
      semesterCode: e.semesterCode,
    })),
    gaps: gaps.map(g => ({ title: g.title, severity: g.severity })),
    previousNarrative: existing?.draftContent ?? null,
  })

  const newVersion = (existing?.version ?? 0) + 1

  await prisma.complianceNarrative.create({
    data: {
      standardId,
      cycleId,
      status: 'AI_DRAFT',
      draftContent: result.content,
      version: newVersion,
      aiModel: 'claude-sonnet-4-6',
      evidenceUsed: result.evidenceUsed,
      confidenceScore: result.confidenceScore,
      generatedAt: new Date(),
      versionHistory: [
        ...(existing?.versionHistory as any[] ?? []),
        { version: newVersion, content: result.content, author: 'ai', timestamp: new Date().toISOString() },
      ],
    },
  })

  return { version: newVersion, confidenceScore: result.confidenceScore }
}
```

### Service: `app/lib/accreditation/quality-scorer.ts`

Evaluates evidence quality along three dimensions: completeness, recency, and alignment.

```typescript
import { prisma } from '../prisma'

/** Re-score quality for all evidence in a cycle */
export async function rescoreAllEvidence(cycleId: string): Promise<{ rescored: number }> {
  const evidence = await prisma.accreditationEvidence.findMany({
    where: { cycleId },
    include: { standard: true },
  })

  let rescored = 0
  for (const e of evidence) {
    const quality = computeQuality(e)
    await prisma.accreditationEvidence.update({
      where: { id: e.id },
      data: {
        quality: quality.level,
        qualityScore: quality.score,
        completeness: quality.completeness,
        recency: quality.recency,
        alignment: quality.alignment,
        qualityNotes: quality.notes,
      },
    })
    rescored++
  }

  return { rescored }
}

function computeQuality(evidence: {
  sourceCount: number
  semesterCode: string | null
  evidenceType: string
  dataSnapshot: unknown
  standard: { evidenceTypes: string[]; standardNumber: string }
}): {
  level: string
  score: number
  completeness: number
  recency: number
  alignment: number
  notes: string
} {
  // Completeness: based on source count
  const completeness = Math.min(1, evidence.sourceCount / getExpectedCount(evidence.evidenceType))

  // Recency: based on semester code
  const recency = computeRecency(evidence.semesterCode)

  // Alignment: how well this evidence type matches the standard's needs
  const alignment = evidence.standard.evidenceTypes.includes(evidence.evidenceType) ? 0.9 : 0.5

  // Composite quality score
  const score = completeness * 0.4 + recency * 0.35 + alignment * 0.25

  let level: string
  if (score >= 0.8) level = 'EXCELLENT'
  else if (score >= 0.6) level = 'GOOD'
  else if (score >= 0.4) level = 'FAIR'
  else if (score >= 0.2) level = 'WEAK'
  else level = 'MISSING'

  const notes = [
    `Completeness: ${(completeness * 100).toFixed(0)}%`,
    `Recency: ${(recency * 100).toFixed(0)}%`,
    `Alignment: ${(alignment * 100).toFixed(0)}%`,
  ].join('. ')

  return { level, score, completeness, recency, alignment, notes }
}

function getExpectedCount(evidenceType: string): number {
  switch (evidenceType) {
    case 'assessment_data': return 200
    case 'rubric_data': return 100
    case 'competency_data': return 50
    case 'syllabi': return 30
    case 'accessibility_report': return 50
    case 'student_support': return 20
    case 'feedback': return 50
    default: return 10
  }
}

function computeRecency(semesterCode: string | null): number {
  if (!semesterCode) return 0.5
  const now = new Date()
  const year = parseInt(semesterCode.slice(2))
  const currentYear = now.getFullYear()
  const yearDiff = currentYear - year

  if (yearDiff === 0) return 1.0
  if (yearDiff === 1) return 0.8
  if (yearDiff === 2) return 0.5
  if (yearDiff === 3) return 0.3
  return 0.1
}
```

### Service: `app/lib/accreditation/dashboard-service.ts`

Builds the compliance dashboard data at multiple levels: institution, college, department, program.

```typescript
import { prisma } from '../prisma'
import type { ComplianceDashboard, StandardCompliance } from './types'

/** Get institution-level compliance dashboard */
export async function getComplianceDashboard(cycleId: string): Promise<ComplianceDashboard> {
  const cycle = await prisma.accreditationCycle.findUnique({
    where: { id: cycleId },
  })
  if (!cycle) throw new Error('Cycle not found')

  const standards = await prisma.accreditationStandard.findMany({
    where: { isActive: true, body: cycle.body },
    include: {
      evidence: { where: { cycleId } },
      gaps: { where: { cycleId, remediationStatus: { not: 'resolved' } } },
      narratives: {
        where: { cycleId },
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  })

  // Classify standards
  let met = 0, partial = 0, gapped = 0
  for (const std of standards) {
    if (std.evidence.length > 0 && std.gaps.length === 0) {
      const avgQuality = std.evidence.reduce((sum, e) => sum + (e.qualityScore ?? 0), 0) / std.evidence.length
      if (avgQuality >= 0.6) met++
      else partial++
    } else if (std.evidence.length > 0) {
      partial++
    } else {
      gapped++
    }
  }

  // Gap summary
  const allGaps = standards.flatMap(s => s.gaps)
  const gapSummary = {
    critical: allGaps.filter(g => g.severity === 'critical').length,
    major: allGaps.filter(g => g.severity === 'major').length,
    minor: allGaps.filter(g => g.severity === 'minor').length,
    informational: allGaps.filter(g => g.severity === 'informational').length,
  }

  // Narrative summary
  const allNarratives = standards.map(s => s.narratives[0]).filter(Boolean)
  const narrativeSummary = {
    notStarted: standards.length - allNarratives.length,
    aiDraft: allNarratives.filter(n => n.status === 'AI_DRAFT').length,
    inReview: allNarratives.filter(n => n.status === 'IN_REVIEW').length,
    approved: allNarratives.filter(n => n.status === 'APPROVED').length,
    final: allNarratives.filter(n => n.status === 'FINAL').length,
  }

  // Overall readiness
  const overallReadiness = standards.length > 0 ? met / standards.length : 0

  // Days until site visit
  const daysUntilSiteVisit = cycle.siteVisitDate
    ? Math.ceil((cycle.siteVisitDate.getTime() - Date.now()) / 86400000)
    : null

  // Recent activity (last 30 days)
  const recentEvidence = await prisma.accreditationEvidence.findMany({
    where: { cycleId, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { standard: { select: { standardNumber: true } } },
  })

  // Trend data (last 90 days)
  const snapshots = await prisma.accreditationReadinessSnapshot.findMany({
    where: { cycleId },
    orderBy: { snapshotAt: 'desc' },
    take: 90,
  })

  return {
    cycleId,
    cycleName: cycle.cycleName,
    phase: cycle.phase,
    overallReadiness,
    siteVisitDate: cycle.siteVisitDate,
    daysUntilSiteVisit,
    standardsSummary: { total: standards.length, met, partial, gapped },
    gapSummary,
    narrativeSummary,
    recentActivity: recentEvidence.map(e => ({
      date: e.createdAt,
      action: `Evidence harvested: ${e.title}`,
      standard: e.standard.standardNumber,
    })),
    trendData: snapshots.map(s => ({ date: s.snapshotAt, readiness: s.overallReadiness })).reverse(),
  }
}

/** Get per-standard compliance detail */
export async function getStandardCompliance(standardId: string, cycleId: string): Promise<StandardCompliance> {
  const standard = await prisma.accreditationStandard.findUnique({
    where: { id: standardId },
    include: {
      evidence: { where: { cycleId }, orderBy: { qualityScore: 'desc' } },
      gaps: { where: { cycleId, remediationStatus: { not: 'resolved' } } },
      narratives: { where: { cycleId }, orderBy: { version: 'desc' }, take: 1 },
    },
  })
  if (!standard) throw new Error('Standard not found')

  const avgQuality = standard.evidence.length > 0
    ? standard.evidence.reduce((sum, e) => sum + (e.qualityScore ?? 0), 0) / standard.evidence.length
    : 0

  const qualityLevel = avgQuality >= 0.8 ? 'EXCELLENT' :
    avgQuality >= 0.6 ? 'GOOD' :
    avgQuality >= 0.4 ? 'FAIR' :
    avgQuality >= 0.2 ? 'WEAK' : 'MISSING'

  // Group by program
  const byProgram = new Map<string, typeof standard.evidence>()
  for (const e of standard.evidence) {
    const code = e.programCode ?? 'institution-wide'
    if (!byProgram.has(code)) byProgram.set(code, [])
    byProgram.get(code)!.push(e)
  }

  return {
    standardId: standard.id,
    standardNumber: standard.standardNumber,
    standardTitle: standard.standardTitle,
    evidenceCount: standard.evidence.length,
    evidenceQuality: qualityLevel as any,
    qualityScore: avgQuality,
    gapCount: standard.gaps.length,
    criticalGaps: standard.gaps.filter(g => g.severity === 'critical').length,
    narrativeStatus: (standard.narratives[0]?.status ?? 'NOT_STARTED') as any,
    isAutoHarvestable: standard.autoHarvestable,
    lastHarvestedAt: standard.evidence[0]?.harvestedAt ?? null,
    programs: Array.from(byProgram.entries()).map(([code, evidence]) => ({
      programCode: code,
      programName: code, // Would be enriched from DegreeProgram lookup
      evidenceCount: evidence.length,
      qualityScore: evidence.reduce((sum, e) => sum + (e.qualityScore ?? 0), 0) / evidence.length,
      gaps: standard.gaps.filter(g => g.affectedPrograms.includes(code)).map(g => g.title),
    })),
  }
}

/** Build Sandy context block for accreditation readiness */
export function buildSandyAccreditationContext(dashboard: ComplianceDashboard): string {
  const lines: string[] = ['<accreditation-status>']
  lines.push(`  <cycle>${dashboard.cycleName}</cycle>`)
  lines.push(`  <phase>${dashboard.phase}</phase>`)
  lines.push(`  <readiness>${(dashboard.overallReadiness * 100).toFixed(0)}%</readiness>`)
  lines.push(`  <standards-met>${dashboard.standardsSummary.met}/${dashboard.standardsSummary.total}</standards-met>`)
  if (dashboard.gapSummary.critical > 0) {
    lines.push(`  <critical-gaps>${dashboard.gapSummary.critical}</critical-gaps>`)
  }
  if (dashboard.daysUntilSiteVisit && dashboard.daysUntilSiteVisit < 365) {
    lines.push(`  <days-until-site-visit>${dashboard.daysUntilSiteVisit}</days-until-site-visit>`)
  }
  lines.push('</accreditation-status>')
  return lines.join('\n')
}
```

### Service: `app/lib/accreditation/peer-review-prep.ts`

AI simulates peer reviewer questions based on gap analysis and evidence quality.

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'

const anthropic = new Anthropic()

export interface PeerReviewQuestion {
  standard: string
  question: string
  difficulty: 'routine' | 'probing' | 'critical'
  context: string
  suggestedResponse: string
}

/** Generate simulated peer reviewer questions based on current compliance state */
export async function generatePeerReviewQuestions(cycleId: string): Promise<PeerReviewQuestion[]> {
  const standards = await prisma.accreditationStandard.findMany({
    where: { isActive: true },
    include: {
      evidence: { where: { cycleId } },
      gaps: { where: { cycleId, remediationStatus: { not: 'resolved' } } },
      narratives: { where: { cycleId }, orderBy: { version: 'desc' }, take: 1 },
    },
  })

  // Build a summary of compliance state for the AI
  const complianceSummary = standards.map(std => {
    const evidenceCount = std.evidence.length
    const avgQuality = evidenceCount > 0
      ? (std.evidence.reduce((sum, e) => sum + (e.qualityScore ?? 0), 0) / evidenceCount).toFixed(2)
      : '0.00'
    const gapCount = std.gaps.length
    const narrative = std.narratives[0]

    return `Standard ${std.standardNumber} (${std.standardTitle}): ${evidenceCount} evidence items (avg quality: ${avgQuality}), ${gapCount} gaps, narrative: ${narrative?.status ?? 'NOT_STARTED'}`
  }).join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are simulating a SACSCOC peer review team visiting the University of Kentucky. Based on the compliance data below, generate 8-12 questions that peer reviewers would likely ask. Focus on:
1. Standards with gaps or weak evidence (these get the most scrutiny)
2. Standards where the narrative is missing or only AI-drafted
3. Cross-cutting themes (assessment, faculty qualifications, student support)
4. Follow-up questions that probe deeper than surface compliance

## Compliance State
${complianceSummary}

For each question, return JSON array:
[{
  "standard": "8.2a",
  "question": "...",
  "difficulty": "routine|probing|critical",
  "context": "Why a reviewer would ask this",
  "suggestedResponse": "Key points to include in the response"
}]

Return ONLY the JSON array.`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  return JSON.parse(jsonMatch[0])
}
```

---

## Data Fetch Layer

### Query Patterns

| Query | Frequency | Optimization |
|-------|-----------|-------------|
| Harvest all evidence | Weekly cron | Sequential per standard, batched DB writes |
| Run gap analysis | Weekly cron (after harvest) | Reads all standards + evidence in one query |
| Generate narratives | On demand / monthly cron | Per-standard, Sonnet API call |
| Dashboard load | On page load | Single query with includes, cached 5 min |
| Standard detail | On drill-down | findUnique with includes |
| Readiness snapshot | Daily cron | Computed from dashboard, single insert |
| Peer review questions | On demand | Sonnet API call, no caching |
| Quality rescoring | Monthly cron | Batch update all evidence |

---

## API Routes

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/accreditation/dashboard` | GET | `requireAdminUser` | Institution-level compliance dashboard |
| `/api/accreditation/standards` | GET | `requireStaffOrAdminUser` | List all standards with compliance status |
| `/api/accreditation/standards/[id]` | GET | `requireStaffOrAdminUser` | Standard detail with evidence, gaps, narrative |
| `/api/accreditation/evidence` | GET | `requireStaffOrAdminUser` | List evidence, filterable by standard/type/quality |
| `/api/accreditation/evidence/upload` | POST | `requireStaffOrAdminUser` | Manual evidence upload |
| `/api/accreditation/gaps` | GET | `requireStaffOrAdminUser` | All open gaps, filterable by severity |
| `/api/accreditation/gaps/[id]` | PUT | `requireStaffOrAdminUser` | Update gap remediation status |
| `/api/accreditation/narrative/[standardId]` | GET | `requireStaffOrAdminUser` | Get narrative for a standard |
| `/api/accreditation/narrative/[standardId]/generate` | POST | `requireAdminUser` | Generate/regenerate AI narrative draft |
| `/api/accreditation/narrative/[standardId]/review` | PUT | `requireAdminUser` | Submit review comments, approve, or request revision |
| `/api/accreditation/peer-review-prep` | POST | `requireAdminUser` | Generate simulated peer reviewer questions |
| `/api/accreditation/cycle` | GET/POST | `requireAdminUser` | Get or create accreditation cycle |
| `/api/cron/accreditation-harvest` | POST | `verifyCronSecret` | Weekly evidence harvesting |
| `/api/cron/accreditation-snapshot` | POST | `verifyCronSecret` | Daily readiness snapshot |

---

## UI Components

| Component | File | Purpose | Dependencies |
|-----------|------|---------|-------------|
| `AccreditationDashboard` | `app/components/accreditation/AccreditationDashboard.tsx` | Full dashboard assembly: readiness gauge, standards grid, gap summary, narrative progress, timeline | All below |
| `ReadinessGauge` | `app/components/accreditation/ReadinessGauge.tsx` | Circular progress gauge showing overall readiness percentage with phase label | recharts |
| `StandardsGrid` | `app/components/accreditation/StandardsGrid.tsx` | Grid of standard cards color-coded by compliance level, clickable for detail | — |
| `StandardCard` | `app/components/accreditation/StandardCard.tsx` | Individual standard: number, title, evidence count, quality badge, gap count, narrative status | — |
| `StandardDetailPanel` | `app/components/accreditation/StandardDetailPanel.tsx` | Slide-out panel: evidence list, gap list, narrative viewer, actions | — |
| `EvidenceTable` | `app/components/accreditation/EvidenceTable.tsx` | Sortable/filterable table of evidence items with quality badges, source links, approval status | — |
| `EvidenceUploadModal` | `app/components/accreditation/EvidenceUploadModal.tsx` | Manual evidence upload: file drop, standard picker, description, program scope | ModalShell |
| `GapList` | `app/components/accreditation/GapList.tsx` | Severity-sorted gap cards with remediation status, assigned-to, and action buttons | — |
| `GapDetailCard` | `app/components/accreditation/GapDetailCard.tsx` | Expanded gap: description, suggested actions, assignment, status workflow | — |
| `NarrativeEditor` | `app/components/accreditation/NarrativeEditor.tsx` | Side-by-side: AI draft (left), review panel (right) with inline comments and approve/revise buttons | — |
| `NarrativeVersionHistory` | `app/components/accreditation/NarrativeVersionHistory.tsx` | Version timeline with diff view between versions | — |
| `PeerReviewPrepPanel` | `app/components/accreditation/PeerReviewPrepPanel.tsx` | List of simulated questions with difficulty badges, context, and suggested responses | — |
| `ComplianceTrendChart` | `app/components/accreditation/ComplianceTrendChart.tsx` | Line chart of readiness over time from snapshots | recharts |
| `CycleTimeline` | `app/components/accreditation/CycleTimeline.tsx` | Horizontal timeline showing cycle phases, deadlines, and current position | — |
| `ProgramRollupTable` | `app/components/accreditation/ProgramRollupTable.tsx` | Grouped by college/department: program compliance status roll-up for deans | — |
| `HarvestStatusBanner` | `app/components/accreditation/HarvestStatusBanner.tsx` | Shows last harvest time, items collected, next scheduled harvest | — |

---

## Pages

| Page | Route | Role | Description |
|------|-------|------|-------------|
| Accreditation Dashboard | `/accreditation` | ADMIN | Main dashboard with readiness gauge, standards grid, timeline, gap summary |
| Standard Detail | `/accreditation/standard/[id]` | ADMIN, STAFF | Evidence, gaps, narrative for one standard |
| Evidence Browser | `/accreditation/evidence` | ADMIN, STAFF | Filterable evidence table with upload capability |
| Narrative Workbench | `/accreditation/narratives` | ADMIN | All narratives with status workflow, side-by-side editor |
| Peer Review Prep | `/accreditation/peer-review` | ADMIN | Simulated questions with response practice |
| Program Compliance | `/accreditation/programs` | ADMIN, STAFF | Program-level roll-up view for department chairs and deans |

---

## Sandy Integration

### Agent Tools (4 tools in `app/lib/agent/tools/accreditation-tools.ts`)

```typescript
export const ACCREDITATION_TOOLS = [
  {
    name: 'get_accreditation_readiness',
    description: 'Get overall accreditation readiness status including standards met, gaps, and timeline.',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      // Returns readiness %, standards met/total, critical gaps, days until site visit
    },
  },
  {
    name: 'get_compliance_gaps',
    description: 'List current compliance gaps sorted by severity. For admin/staff use.',
    parameters: {
      type: 'object',
      properties: {
        severity: { type: 'string', enum: ['critical', 'major', 'minor', 'all'], description: 'Filter by severity' },
      },
    },
    handler: async (params: { severity?: string }) => {
      // Returns gap list with remediation suggestions
    },
  },
  {
    name: 'generate_compliance_narrative',
    description: 'Generate an AI draft compliance narrative for a specific SACSCOC standard.',
    parameters: {
      type: 'object',
      properties: {
        standardNumber: { type: 'string', description: 'SACSCOC standard number (e.g., "8.2a")' },
      },
      required: ['standardNumber'],
    },
    handler: async (params: { standardNumber: string }) => {
      // Triggers narrative generation, returns draft preview
    },
  },
  {
    name: 'simulate_peer_review',
    description: 'Generate simulated peer reviewer questions based on current compliance state.',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      // Returns 8-12 simulated questions with suggested responses
    },
  },
]
```

### Proactive Nudges (in `proactive-suggestions.ts`)

```typescript
// Admin-facing nudges
{
  id: 'accreditation-critical-gaps',
  type: 'admin-alert',
  priority: 9,
  condition: (data) => data.role === 'ADMIN' && data.accreditationGaps?.critical > 0,
  message: `${data.accreditationGaps.critical} critical accreditation gaps need attention`,
  action: { type: 'link', href: '/accreditation' },
}

{
  id: 'accreditation-harvest-stale',
  type: 'admin-alert',
  priority: 5,
  condition: (data) => data.role === 'ADMIN' && data.daysSinceLastHarvest > 14,
  message: 'Evidence harvest hasn\'t run in 2+ weeks — some evidence may be stale',
  action: { type: 'link', href: '/accreditation/evidence' },
}

{
  id: 'accreditation-narrative-review',
  type: 'admin-alert',
  priority: 6,
  condition: (data) => data.role === 'ADMIN' && data.narrativesAwaitingReview > 0,
  message: `${data.narrativesAwaitingReview} compliance narratives ready for your review`,
  action: { type: 'link', href: '/accreditation/narratives' },
}
```

### Sandy Context Injection

```typescript
// In concierge-service.ts, for ADMIN role on /accreditation pages:
const cycle = await prisma.accreditationCycle.findFirst({ where: { isActive: true } })
if (cycle) {
  const dashboard = await getComplianceDashboard(cycle.id)
  contextBlocks.push(buildSandyAccreditationContext(dashboard))
}
```

---

## Implementation Phases

### Phase 1: Standards Registry + Schema

> **Size:** Medium (~500 lines)
> **Delivers:** Schema models, standards seeded, accreditation cycle management

1. Add all schema models and enums to `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name add-accreditation-autopilot`
3. Implement `app/lib/accreditation/types.ts`
4. Implement `app/lib/accreditation/standards-registry.ts` with SACSCOC seed data
5. Create seed script: `npx tsx scripts/seed-accreditation-standards.ts`
6. Add cycle management API: `GET/POST /api/accreditation/cycle`

**Success Metric:** 10+ SACSCOC standards seeded. Cycle created with timeline. Schema validates.

### Phase 2: Evidence Harvester + Quality Scoring

> **Size:** Large (~800 lines)
> **Delivers:** Auto-harvesting from 8+ platform models, quality scoring, manual upload

1. Implement `app/lib/accreditation/evidence-harvester.ts` with 12 harvest functions
2. Implement `app/lib/accreditation/quality-scorer.ts`
3. Add cron route: `POST /api/cron/accreditation-harvest`
4. Add evidence API: `GET /api/accreditation/evidence`, `POST /api/accreditation/evidence/upload`
5. Run first harvest and verify evidence collection

**Success Metric:** Harvester collects evidence from at least 5 different platform models. Quality scores distributed across EXCELLENT/GOOD/FAIR range.

### Phase 3: Gap Detection + Dashboard

> **Size:** Large (~700 lines, 10 components)
> **Delivers:** Gap analysis, compliance dashboard, standard detail views

1. Implement `app/lib/accreditation/gap-detector.ts`
2. Implement `app/lib/accreditation/dashboard-service.ts`
3. Create all dashboard UI components
4. Create pages: `/accreditation`, `/accreditation/standard/[id]`, `/accreditation/evidence`
5. Add readiness snapshot cron: `POST /api/cron/accreditation-snapshot`
6. Add to admin navigation

**Success Metric:** Dashboard shows realistic readiness percentage. Gaps detected where evidence is missing. Standards grid is navigable.

### Phase 4: Narrative Generation + Review Workflow

> **Size:** Medium (~600 lines)
> **Delivers:** AI narrative drafts, human review workflow, version history

1. Implement `app/lib/accreditation/narrative-generator.ts`
2. Create NarrativeEditor and NarrativeVersionHistory components
3. Create narrative workbench page: `/accreditation/narratives`
4. Add narrative API routes: generate, review
5. Wire approval workflow

**Success Metric:** AI generates plausible compliance narratives. Version history tracks changes. Review workflow moves narratives through statuses.

### Phase 5: Sandy Integration + Peer Review Prep

> **Size:** Small (~400 lines)
> **Delivers:** Sandy tools, proactive nudges, simulated peer review questions

1. Implement `app/lib/accreditation/peer-review-prep.ts`
2. Add 4 Sandy agent tools
3. Register in `tool-registry.ts`
4. Add proactive nudge conditions
5. Wire Sandy context injection for ADMIN role
6. Create peer review prep page: `/accreditation/peer-review`
7. Create program roll-up page: `/accreditation/programs`

**Success Metric:** Sandy can answer "how's our accreditation readiness?" Peer review questions are realistic and actionable. Admin gets proactive gap alerts.

---

## Cross-System Data Flow

```
Platform Activity (daily)
  ├── GradebookEntry, RubricBreakdown → Standard 8.2a evidence
  ├── AccessibilityReport → Standard 13.7 evidence
  ├── SuccessIntervention → Standard 12.1 evidence
  ├── ContentFeedback → Standard 12.4 evidence
  └── CourseAIPolicy → Standard 10.7 evidence

Evidence Harvester (weekly cron)
  ├── Collects from all auto-harvestable sources
  ├── Quality Scorer rates each piece
  └── Stores in AccreditationEvidence

Gap Detector (weekly, after harvest)
  ├── Compares evidence vs requirements
  ├── Creates/updates ComplianceGap records
  └── Alerts admin of new critical gaps

Narrative Generator (on demand / monthly)
  ├── Reads evidence + gaps for a standard
  ├── Generates compliance narrative (Sonnet)
  └── Enters review workflow

Dashboard (continuous)
  ├── Readiness snapshot (daily cron)
  ├── Sandy context for ADMIN
  └── Morning briefing injection

Peer Review Prep (on demand)
  ├── Reads full compliance state
  ├── Generates simulated questions (Sonnet)
  └── Provides response coaching
```

---

## Patent Claims

**Primary Claim:** A computer-implemented system for continuous automated accreditation compliance management in a higher education institution, comprising:
1. A standards registry that models accreditation requirements as a hierarchical data structure with associated evidence types, collection frequencies, quality thresholds, and platform data source mappings
2. An automated evidence harvester that continuously extracts compliance evidence from heterogeneous educational platform data sources (assessment records, rubric evaluations, accessibility reports, student support interventions, course materials, and student feedback) and maps each piece to specific accreditation standards
3. An evidence quality scoring engine that evaluates each evidence item along three dimensions (completeness, recency, and alignment) and assigns a composite quality rating
4. A gap detection engine that continuously compares collected evidence against standard requirements, identifies compliance gaps by severity, estimates remediation effort, and generates actionable suggestions
5. An AI-powered compliance narrative generator that synthesizes collected evidence into structured compliance arguments suitable for self-study reports, with human review workflow and version control
6. A multi-level compliance dashboard providing real-time readiness visualization at institution, college, department, and program levels with trend tracking over the accreditation cycle
7. A peer review simulation engine that generates anticipated reviewer questions based on gap analysis and evidence quality, with suggested response frameworks

**Dependent Claims:**
- Claim 2: The system of claim 1, wherein the evidence harvester operates on a scheduled basis and de-duplicates evidence across collection cycles using semester-code partitioning
- Claim 3: The system of claim 1, wherein the compliance narrative generator references specific evidence items by title and incorporates quantitative data from evidence snapshots to produce verifiable compliance arguments
- Claim 4: The system of claim 1, further comprising a conversational AI agent interface that enables administrators to query accreditation readiness, request narrative generation, and receive proactive alerts about critical compliance gaps through natural language interaction
- Claim 5: The system of claim 1, wherein individual student success intervention data is automatically harvested as evidence for student support service standards, creating a closed loop between retention systems and accreditation compliance
