# Virtual Clinic — AI-Powered Clinical Reasoning Simulation

> **Sprint Scope:** 10 sprints, 2 tasks each
> **Depends On:** Existing Tool Builder, Sandy Agent, Streaming infrastructure
> **Estimated Size:** Large
> **Patent-Relevant:** Yes — FSM-constrained AI patient, silent competency tracking, cognitive bias detection, OSCE rubric integration

## Context

Medical students need structured clinical reasoning practice beyond "chat with a medical AI." Free-form chat produces hallucination-prone, unscaffolded conversations with no pedagogical structure. Virtual Clinic uses a finite state machine (FSM) to walk students through 7 deterministic encounter phases while an LLM generates natural language *within* each phase. Educators author structured cases with answer keys; the AI patient retrieves from case data rather than parametric knowledge.

### Three Simulation Modes (MVP = Mode 1 only)
- **Mode 1: Clinical Reasoning Encounter** — structured 7-phase patient encounter (MVP)
- **Mode 2: Longitudinal Virtual Clinic** — persistent patients across encounters (Phase 2)
- **Mode 3: Cross-Cover / Night Call** — audio-first nurse triage simulation (Phase 3)

---

## System Overview

```
EDUCATOR AUTHORS CASE
  (demographics, history, exam findings, labs, answer key)
                    │
                    ▼
          ENCOUNTER STATE MACHINE

  OPENING ──▶ HISTORY ──▶ PROBLEM_REP ──▶ DIFFERENTIAL
                                              │
                                              ▼
             PLAN ◀── DIAGNOSTIC_PLAN ◀── PHYSICAL_EXAM
               │
               ▼
          FEEDBACK (rubric-mapped, cognitive debrief)
```

### Seven Encounter Phases

| # | Phase | Mode | Student Action | System Action |
|---|-------|------|---------------|---------------|
| 1 | `OPENING` | AI chat | Reads chief complaint, begins inquiry | AI patient presents with complaint |
| 2 | `HISTORY_TAKING` | AI chat | Asks questions freely, NO guidance | AI patient answers from case definition only. System silently tracks domain coverage |
| 3 | `PROBLEM_REPRESENTATION` | Form | Writes summary statement | System stores artifact for scoring |
| 4 | `DIFFERENTIAL_DIAGNOSIS` | Form | Ranks 3+ diagnoses with supporting/opposing evidence | System stores artifact |
| 5 | `PHYSICAL_EXAM` | AI chat | Requests specific maneuvers in natural language | AI asks for specificity when vague, returns case-defined findings. Undefined = age-appropriate normals |
| 6 | `DIAGNOSTIC_PLAN` | Form | Orders labs, imaging, next steps | System stores artifact |
| 7 | `FEEDBACK` | Read-only | Reviews performance | AI scores against rubric, identifies cognitive biases, provides specific misses |

### Phase Transition Rules
- `OPENING → HISTORY_TAKING`: Automatic after AI patient delivers chief complaint (1-2 exchanges)
- `HISTORY_TAKING → PROBLEM_REPRESENTATION`: Student clicks "I'm ready to summarize" — NO hints, NO progress bar
- `PROBLEM_REPRESENTATION → DIFFERENTIAL_DIAGNOSIS`: Student submits summary statement
- `DIFFERENTIAL_DIAGNOSIS → PHYSICAL_EXAM`: Student submits ranked differential
- `PHYSICAL_EXAM → DIAGNOSTIC_PLAN`: Student clicks "I'm ready for my plan"
- `DIAGNOSTIC_PLAN → FEEDBACK`: Student submits plan
- `FEEDBACK`: Terminal state. Student can review or start new case.

---

## Data Models

### New Enums

```prisma
enum EncounterPhase {
  OPENING
  HISTORY_TAKING
  PROBLEM_REPRESENTATION
  DIFFERENTIAL_DIAGNOSIS
  PHYSICAL_EXAM
  DIAGNOSTIC_PLAN
  FEEDBACK
  COMPLETED
}

enum CaseDifficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  EXPERT
}

enum CompetencyLevel {
  NOVICE
  DEVELOPING
  COMPETENT
  PROFICIENT
}
```

### ClinicalCase (Educator-Authored)

```prisma
model ClinicalCase {
  id                  String          @id @default(cuid())
  title               String
  chiefComplaint      String
  difficulty          CaseDifficulty  @default(INTERMEDIATE)
  targetYear          Int?
  organSystems        String[]
  learningObjectives  String[]
  tags                String[]
  courseId            String?

  // Patient identity
  patientName         String
  patientAge          Int
  patientSex          String
  patientPronouns     String          @default("she/her")
  personalityNotes    String?         @db.Text

  // Clinical content (structured JSON)
  historyOfPresentIllness   Json
  pastMedicalHistory        Json
  medications               Json
  allergies                 Json
  socialHistory             Json
  familyHistory             Json
  reviewOfSystems           Json

  // Physical exam
  physicalExamFindings      Json      // keyed by maneuver
  vitalSigns                Json
  defaultNormalFindings     Json?

  // Diagnostics
  availableLabs             Json
  availableImaging          Json

  // Answer key
  correctDifferentials      Json
  keyHistoryQuestions       Json
  keyExamManeuvers          Json
  criticalActions           Json
  scoringRubric             Json

  // Metadata
  creatorId           String
  creator             User            @relation(fields: [creatorId], references: [id])
  course              Course?         @relation(fields: [courseId], references: [id])
  published           Boolean         @default(false)
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  encounters          ClinicalEncounter[]

  @@index([creatorId])
  @@index([courseId])
  @@index([difficulty])
}
```

### ClinicalEncounter (Student Session)

```prisma
model ClinicalEncounter {
  id                  String          @id @default(cuid())
  caseId              String
  userId              String
  courseId             String?
  assignmentId        String?

  phase               EncounterPhase  @default(OPENING)
  startedAt           DateTime        @default(now())
  completedAt         DateTime?

  transcript          Json            @default("[]")
  historyDomainsHit   Json            @default("{}")
  examManeuversRequested String[]     @default([])

  problemRepresentation  String?      @db.Text
  differentialDiagnosis  Json?
  diagnosticPlan         Json?

  scores              Json?
  overallLevel        CompetencyLevel?
  overallScore        Float?
  cognitiveBiases     Json?
  feedbackNarrative   String?         @db.Text

  clinicalCase        ClinicalCase    @relation(fields: [caseId], references: [id])
  user                User            @relation(fields: [userId], references: [id])
  course              Course?         @relation(fields: [courseId], references: [id])

  @@index([userId])
  @@index([caseId])
  @@index([courseId])
  @@index([userId, caseId])
}
```

---

## API Routes

```
app/api/virtual-clinic/
├── cases/
│   ├── route.ts                    GET (list), POST (create)
│   ├── [caseId]/
│   │   ├── route.ts                GET, PATCH, DELETE
│   │   └── import/
│   │       └── route.ts            POST (AI text → structured case)
├── encounters/
│   ├── route.ts                    POST (start encounter)
│   ├── [encounterId]/
│   │   ├── route.ts                GET (state + transcript)
│   │   ├── chat/
│   │   │   └── route.ts            POST (streaming patient chat)
│   │   ├── advance/
│   │   │   └── route.ts            POST (phase transition)
│   │   ├── submit/
│   │   │   └── route.ts            POST (artifact submission)
│   │   └── feedback/
│   │       └── route.ts            POST (generate scoring)
├── analytics/
│   ├── student/
│   │   └── route.ts                GET (student history + growth)
│   └── case/
│       └── route.ts                GET (case analytics for educators)
```

---

## Service Layer

```
app/lib/virtual-clinic/
├── types.ts                    All interfaces and type definitions
├── case-service.ts             CRUD for ClinicalCase, import pipeline
├── encounter-service.ts        State machine, phase transitions, artifact storage
├── patient-agent.ts            System prompt assembly, guardrail enforcement
├── exam-mapper.ts              Natural language → exam maneuver mapping
├── history-tracker.ts          Silent domain coverage classification
├── scoring-engine.ts           Rubric scoring, bias detection, feedback generation
└── analytics-service.ts        Student growth, case analytics, cohort comparison
```

### patient-agent.ts — Dynamic Prompt Assembly

The AI patient's system prompt is rebuilt on every request based on encounter state:
- Base: patient identity + personality
- Phase-specific constraints (OPENING: deliver complaint; HISTORY: answer from case only; EXAM: parse requests)
- Guardrails: never volunteer info, never use medical terminology unprompted, never suggest diagnosis, never contradict case definition

### exam-mapper.ts — Natural Language → Maneuver Resolution

Uses Haiku to classify free-text exam requests into maneuver keys.
- Mapped + defined finding → return case finding
- Mapped + undefined → return age-appropriate normal
- Vague request → ask patient to clarify ("What specifically would you like to examine?")

### history-tracker.ts — Silent Domain Classification

After each student message in HISTORY_TAKING: Haiku classifies which domains were touched (HPI, PMH, MEDICATIONS, ALLERGIES, SOCIAL, FAMILY, ROS, CONSTITUTIONAL). Updates encounter without student visibility.

### scoring-engine.ts — Rubric + Cognitive Bias Detection

Domain scoring (weights from case rubric):
- HISTORY: % of key questions asked + domain coverage
- EXAM: % of key maneuvers + appropriateness
- DIFFERENTIAL: correct diagnosis present + ranking + justification quality
- PLAN: alignment with answer key + completeness
- COMMUNICATION: empathy, clarity, patient-centeredness from transcript

Bias detection:
- ANCHORING: first diagnosis = only well-supported one
- PREMATURE_CLOSURE: stopped history early, few domains covered
- AVAILABILITY: chose common diagnosis despite atypical features
- CONFIRMATION: exam maneuvers only support leading diagnosis

CompetencyLevel mapping: 0-0.39 NOVICE, 0.4-0.59 DEVELOPING, 0.6-0.79 COMPETENT, 0.8-1.0 PROFICIENT

---

## Component Hierarchy

```
app/virtual-clinic/
├── page.tsx                           Case library + encounter history
├── [caseId]/
│   └── page.tsx                       Encounter page (the simulation)
├── author/
│   └── page.tsx                       Case authoring (EDUCATOR/ADMIN)

app/components/virtual-clinic/
├── CaseLibrary.tsx                    Filterable grid
├── CaseCard.tsx                       Preview card
├── EncounterShell.tsx                 Phase-aware container
├── phases/
│   ├── OpeningPhase.tsx
│   ├── HistoryTakingPhase.tsx
│   ├── ProblemRepPhase.tsx
│   ├── DifferentialPhase.tsx
│   ├── PhysicalExamPhase.tsx
│   ├── DiagnosticPlanPhase.tsx
│   └── FeedbackPhase.tsx
├── PatientChat.tsx                    Shared chat for HISTORY + EXAM
├── PhaseProgressBar.tsx               Shows completed phases only
├── DifferentialForm.tsx               Drag-sortable diagnosis entry
├── DiagnosticPlanForm.tsx             Structured order entry
├── ScoreRadar.tsx                     Radar chart of domain competencies
├── BiasCallout.tsx                    Cognitive bias card
├── CaseAuthor/
│   ├── CaseAuthorForm.tsx
│   ├── CaseImportPanel.tsx
│   └── CasePreview.tsx
├── analytics/
│   ├── StudentGrowthChart.tsx
│   ├── CaseAnalyticsPanel.tsx
│   └── CohortComparison.tsx
```

---

## Sandy Integration

New tool module: `app/lib/agent/tools/virtual-clinic-tools.ts`

4 tools:
- `launch_virtual_clinic` — navigate to /virtual-clinic (STUDENT, EDUCATOR, ADMIN)
- `start_clinical_case` — start specific case or recommend by filters (STUDENT)
- `get_encounter_results` — view scores and feedback (STUDENT, EDUCATOR, ADMIN)
- `create_clinical_case` — create/import case (EDUCATOR, ADMIN)

---

## Navigation & Entry Points

- Header nav: `{ href: '/virtual-clinic', label: 'Virtual Clinic', roles: ['STUDENT', 'EDUCATOR'] }`
- Sandy action: `<!--ACTION:{"type":"navigate","href":"/virtual-clinic","label":"Open Virtual Clinic"}-->`
- Course assignments: educator assigns case → surfaces on student course page
- Homepage briefing: "You have 2 assigned clinical cases"
- Explore/Hub: featured card

---

## AI Model Usage

| Task | Model | Why |
|------|-------|-----|
| Patient conversation | Haiku | High volume, low latency, case constrains output |
| Exam request mapping | Haiku | Simple classification |
| History domain tracking | Haiku | Simple classification |
| Case import | Sonnet | Complex structured extraction |
| Feedback generation | Sonnet | Reasoning for bias detection |
| Case auto-generation | Sonnet | Clinical accuracy matters |

---

## Patent-Relevant Differentiators

1. FSM-constrained AI patient — LLM within deterministic phases
2. Educator-authored case retrieval — AI answers from case definition, not parametric knowledge
3. Silent competency tracking — domain coverage without student visibility
4. Cognitive bias detection — anchoring, premature closure, confirmation bias
5. Natural language exam with specificity enforcement
6. OSCE rubric integration — feedback in real clinical assessment framework
7. Integrated university OS — courses, analytics, Sandy agent

---

## MVP Boundary (NOT building)

- Longitudinal patient persistence (Phase 2)
- Student-created cases (Phase 2)
- Voice/audio cross-cover (Phase 3)
- Real-time multiplayer encounters
- Avatar/visual patient representation
- External EMR integration
- USMLE/COMLEX question bank import

---

## Execution Plan (10 Sprints, 2 Tasks Each)

| Sprint | Tasks | Deliverable |
|--------|-------|-------------|
| 1 | Prisma models + Case authoring API | Cases can be created and stored |
| 2 | AI case import + Case author UI | Educators can paste text → structured case |
| 3 | Encounter state machine + Patient agent | Core FSM engine with phase transitions |
| 4 | History-taking chat + Silent tracker | Students converse with AI patient |
| 5 | Physical exam chat + Exam mapper | Natural language exam with specificity prompting |
| 6 | Structured artifact forms (problem rep, differential, plan) | Clinical reasoning artifacts |
| 7 | Scoring engine + Feedback generation | Rubric scoring, bias detection, narrative feedback |
| 8 | Encounter UI shell + Phase components | Full encounter page with all 7 phases |
| 9 | Case library page + Student encounter history | /virtual-clinic landing page |
| 10 | Sandy tools + Nav integration + Analytics | Fully integrated into the platform |
