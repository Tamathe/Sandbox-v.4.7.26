# AI Literacy & Training Hub — Master Blueprint

> **Sprint scope:** Master architecture + shared infrastructure (8 child modules built separately)
> **Depends on:** Faculty Homepage, Sandy Universal Agent, Policy Navigator, Tool Builder
> **Unlocks:** All 8 AI Literacy modules

---

## Context

### The Problem

A Spring 2026 survey of 51 Directors of Undergraduate Studies at UK revealed a campus in crisis around generative AI. The findings are stark:

- **78%** report high academic integrity concern (median: 5/5 — the maximum)
- **48%** acknowledge students use AI "without explicit guidance"
- **~50%** of programs have no written AI policy of any kind
- **88%** have zero guidance on AI in advising/mentoring
- **71%** want workshops/training, **62%** want assignment redesign help
- Faculty who know AI best are *not* less concerned — familiarity doesn't reduce anxiety
- The most experienced respondents said "I don't know" when asked what would help
- **12 high-concern respondents refused follow-up** — they've given up on institutional support
- Detection tools don't work. Faculty who catch obvious AI misuse still "lose" in conduct proceedings
- UK Core requirements lock programs into assessment formats faculty say no longer hold up
- Humanities faculty feel their disciplines are existentially threatened

The survey identifies **three distinct populations** needing different support:
1. **Integrators** — advisory boards expect graduates to use AI well; need curriculum design help
2. **Cautious middle** — allowing brainstorming/editing but haven't rethought pedagogy; need examples and peer learning
3. **Besieged** — primarily humanities/writing-intensive; feel the institution doesn't back them; need validation and enforcement infrastructure

A single support menu will not serve all three. the platform can.

### The Vision

The **AI Literacy & Training Hub** is a unified home for every faculty member, DUS, advisor, and student to navigate the AI transition — not by pushing adoption or prohibition, but by meeting each person where they are and giving them tools that match their stance, discipline, and needs.

This is not a workshop series. It is a **living, intelligent, role-aware training ecosystem** wired into Sandy and every surface of the platform. It delivers:

- **For faculty:** Assignment redesign tools, policy builders, peer examples, discipline-grounded frameworks, process-based assessment infrastructure
- **For DUS leaders:** Program-level dashboards, policy gap analysis, cross-faculty coordination
- **For advisors:** AI-aware advising guidance, conversation frameworks, student briefing context
- **For students:** AI literacy modules, responsible-use training, discipline-specific guidance tied to their courses

The hub doesn't just teach *about* AI — it models responsible AI use by being built on it.

---

## Architecture

### Hub Entry Point

**Route:** `/ai-literacy`
**Access:** All roles (content adapts by role)
**Navigation:** Top-level sidebar item under a "Training" or "Learn" section group

The hub is a **single landing page** that routes users to role-appropriate content:

```
/ai-literacy                     ← Hub landing (role-adaptive dashboard)
/ai-literacy/assignments         ← Module 1: Assignment Redesign Studio
/ai-literacy/policy              ← Module 2: Policy Framework Builder
/ai-literacy/process             ← Module 3: Process-Based Assessment Tools
/ai-literacy/student             ← Module 4: Student AI Literacy Modules
/ai-literacy/pedagogy            ← Module 5: Faculty AI Pedagogy Hub
/ai-literacy/discipline          ← Module 6: Discipline Identity Workshop
/ai-literacy/advising            ← Module 7: AI-Assisted Advising Framework
/ai-literacy/stance              ← Module 8: Instructor Stance Navigator
```

### Hub Landing Page — Layout

The landing page is **not** a static menu. It is a personalized, Sandy-powered triage surface.

**Faculty/DUS view:**
```
┌─────────────────────────────────────────────────────────────┐
│  AI Literacy & Training Hub                                 │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  YOUR AI READINESS SNAPSHOT              Sandy 🔵   │   │
│  │                                                     │   │
│  │  Stance: Cautious Integrator                        │   │
│  │  Policies: 2 of 4 courses have AI policy  ⚠️        │   │
│  │  Assignments: 6 of 14 are AI-resilient    ──────    │   │
│  │  Training: 3 modules completed            ████░░    │   │
│  │                                                     │   │
│  │  Sandy says: "Your ENG 101 essay prompts are       │   │
│  │  highly AI-completable. Want to explore             │   │
│  │  process-based alternatives?"          [Let's go →] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  RECOMMENDED FOR YOU                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Policy   │ │ Assign.  │ │ Process  │ │ Pedagogy │      │
│  │ Builder  │ │ Redesign │ │ Assess.  │ │ Hub      │      │
│  │          │ │          │ │          │ │          │      │
│  │ 1 course │ │ 6 assign │ │ NEW      │ │ 2 new    │      │
│  │ needs    │ │ flagged  │ │          │ │ articles │      │
│  │ policy   │ │          │ │          │ │          │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │Discipline│ │ Advising │ │ Stance   │ │ Student  │      │
│  │ Identity │ │ Frame.   │ │ Navig.   │ │ Modules  │      │
│  │          │ │          │ │          │ │          │      │
│  │ For your │ │ 12       │ │ Explore  │ │ 84%      │      │
│  │ dept     │ │ advisees │ │ options  │ │ enrolled │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  CAMPUS AI PULSE                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Programs with AI policies: 52% → track over time   │   │
│  │  Faculty completing training: 127 / 1,200           │   │
│  │  Assignment redesigns this semester: 43              │   │
│  │  Top concern: Academic integrity (78% high)          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Student view:**
```
┌─────────────────────────────────────────────────────────────┐
│  AI Literacy & Training                                     │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  YOUR COURSES & AI EXPECTATIONS                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ENG 101  │ Prohibited (except brainstorming)       │   │
│  │  PHY 211  │ Required for simulations                │   │
│  │  BUS 300  │ Guided — must disclose & cite           │   │
│  │  HIS 108  │ Limited — editing only                  │   │
│  │           │                                         │   │
│  │  ⚠️ 1 course has no AI policy posted               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  AI LITERACY MODULES                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Using AI │ │ When NOT │ │ Citing   │ │ Critical │      │
│  │ Respons. │ │ to Use   │ │ AI Work  │ │ Eval of  │      │
│  │          │ │ AI       │ │          │ │ AI Output│      │
│  │ ████░░   │ │ NEW      │ │ ████░░   │ │ NEW      │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Shared Data Models

These models support the hub infrastructure and are used across multiple modules.

### Prisma Schema Additions

```prisma
// ─── AI Literacy Hub Core ───

model AILiteracyProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])

  // Faculty stance assessment (Module 8 output)
  stance        AIStance?           // PROHIBIT, CAUTIOUS, GUIDED, INTEGRATE, REQUIRE
  stanceUpdatedAt DateTime?
  stanceRationale String?           // Why they chose this — informs Sandy's tone

  // Discipline context
  disciplineFamily DisciplineFamily? // STEM, HUMANITIES, SOCIAL_SCI, ARTS, PROFESSIONAL, HEALTH
  disciplineNotes  String?          // Free-text discipline-specific concerns

  // Readiness tracking
  policyCoverage   Float   @default(0)  // % of courses with AI policy
  assignmentScore  Float   @default(0)  // % of assignments rated AI-resilient
  trainingProgress Float   @default(0)  // % of relevant modules completed

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum AIStance {
  PROHIBIT       // No AI use allowed
  CAUTIOUS       // Limited tasks (brainstorming, editing)
  GUIDED         // Structured use with disclosure
  INTEGRATE      // Active pedagogical use
  REQUIRE        // AI as required tool
}

enum DisciplineFamily {
  STEM
  HUMANITIES
  SOCIAL_SCIENCES
  ARTS
  PROFESSIONAL     // Business, Engineering, Education
  HEALTH_SCIENCES
}

model AILiteracyModule {
  id            String   @id @default(cuid())
  slug          String   @unique     // "responsible-use", "citation-practices", etc.
  title         String
  description   String
  targetRole    Role[]               // Which roles see this module
  category      ModuleCategory
  estimatedMinutes Int   @default(15)
  sortOrder     Int      @default(0)

  // Content
  contentBlocks Json                 // Ordered array of {type, content} blocks
  quizQuestions Json?                // Optional assessment

  // Relationships
  completions   AIModuleCompletion[]
  prerequisites AIModulePrerequisite[] @relation("requires")
  requiredBy    AIModulePrerequisite[] @relation("requiredBy")

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum ModuleCategory {
  FUNDAMENTALS         // What is AI, how it works
  RESPONSIBLE_USE      // When/how to use ethically
  ASSESSMENT_DESIGN    // Building AI-resilient assignments
  POLICY_DEVELOPMENT   // Creating and enforcing policies
  DISCIPLINE_SPECIFIC  // Tailored to field
  ADVISING             // AI in student advising
  STUDENT_FACING       // For students
}

model AIModuleCompletion {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  moduleId      String
  module        AILiteracyModule @relation(fields: [moduleId], references: [id])

  completedAt   DateTime @default(now())
  score         Float?              // Quiz score if applicable
  timeSpentSec  Int?

  @@unique([userId, moduleId])
}

model AIModulePrerequisite {
  id            String   @id @default(cuid())
  moduleId      String
  module        AILiteracyModule @relation("requiredBy", fields: [moduleId], references: [id])
  prerequisiteId String
  prerequisite  AILiteracyModule @relation("requires", fields: [prerequisiteId], references: [id])

  @@unique([moduleId, prerequisiteId])
}

// ─── Assignment AI Analysis ───

model AssignmentAIAnalysis {
  id              String   @id @default(cuid())
  assignmentId    String
  assignment      Assignment @relation(fields: [assignmentId], references: [id])

  // AI vulnerability assessment
  aiCompletability  Float             // 0-1: how easily AI can complete this
  vulnerabilities   Json              // [{type, description, severity}]
  redesignSuggestions Json            // [{suggestion, effort, impact}]

  // Process-based alternatives
  processAlternatives Json            // [{description, components, bloomLevel}]

  analyzedAt      DateTime @default(now())
  analyzedBy      String              // "sandy" or userId who triggered

  @@unique([assignmentId])
}

// ─── Course AI Policy ───

model CourseAIPolicy {
  id              String   @id @default(cuid())
  courseId         String
  course          Course   @relation(fields: [courseId], references: [id])
  createdById     String
  createdBy       User     @relation(fields: [createdById], references: [id])

  // Policy framework (Module 2 output)
  stance          AIStance
  frameworkLevel  PolicyFrameworkLevel  // BOILERPLATE, STRUCTURED, DISCIPLINE_GROUNDED
  policyText      String               // The actual policy language
  policyJson      Json                 // Structured: {prohibited: [...], limited: [...], guided: [...], required: [...]}

  // Per-assignment overrides
  assignmentOverrides Json?            // [{assignmentId, stance, rationale}]

  // Metadata
  basedOnTemplate String?              // Template ID if generated from template
  syllabusIncluded Boolean @default(false)
  publishedToStudents Boolean @default(false)
  publishedAt     DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([courseId])                  // One policy per course
}

enum PolicyFrameworkLevel {
  BOILERPLATE          // Copy-paste syllabus language
  STRUCTURED           // 4-level framework (prohibited/limited/guided/required)
  DISCIPLINE_GROUNDED  // Rooted in discipline's intellectual commitments
}

// ─── Advising AI Context ───

model AdvisingAIGuidance {
  id              String   @id @default(cuid())
  departmentId    String?
  department      Department? @relation(fields: [departmentId], references: [id])
  createdById     String
  createdBy       User     @relation(fields: [createdById], references: [id])

  // Guidance content
  conversationFrameworks Json         // [{scenario, suggestedApproach, doNots}]
  studentBriefingTemplate String?     // What to tell students about AI in this program
  escalationPaths Json?               // [{situation, escalateTo, process}]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// ─── Campus AI Pulse (aggregated, anonymized) ───

model CampusAIPulse {
  id              String   @id @default(cuid())
  snapshotDate    DateTime @default(now())

  // Aggregate metrics (no PII)
  totalPolicies   Int                  // Courses with AI policy
  totalCourses    Int                  // Total active courses
  policyCoverage  Float                // totalPolicies / totalCourses
  stanceDistribution Json              // {PROHIBIT: n, CAUTIOUS: n, ...}
  trainingCompletions Int              // Total module completions this period
  assignmentRedesigns Int              // Assignments analyzed + redesigned
  topConcerns     Json                 // Aggregated from feedback

  @@unique([snapshotDate])
}
```

---

## Shared Services

### `ai-literacy-service.ts`

Central service for cross-module operations.

```typescript
// app/lib/ai-literacy-service.ts

export interface AIReadinessSnapshot {
  stance: AIStance | null;
  policyCoverage: number;          // 0-1
  assignmentScore: number;         // 0-1
  trainingProgress: number;        // 0-1
  coursesWithoutPolicy: string[];  // courseIds
  flaggedAssignments: number;      // High AI-completability
  recommendedModules: string[];    // moduleIds
  sandyInsight: string;            // Personalized one-liner
}

export async function getReadinessSnapshot(userId: string): Promise<AIReadinessSnapshot>;
export async function getOrCreateProfile(userId: string): Promise<AILiteracyProfile>;
export async function updateStance(userId: string, stance: AIStance, rationale: string): Promise<void>;
export async function getCampusPulse(): Promise<CampusAIPulse>;
export async function getModulesForRole(role: Role, disciplineFamily?: DisciplineFamily): Promise<AILiteracyModule[]>;
export async function completeModule(userId: string, moduleId: string, score?: number, timeSpent?: number): Promise<void>;
export async function analyzeAssignment(assignmentId: string): Promise<AssignmentAIAnalysis>;
export async function getCoursePolicyGaps(instructorId: string): Promise<{ courseId: string; courseName: string; hasPolicy: boolean }[]>;
```

### `ai-literacy-content-service.ts`

Manages module content, templates, and discipline-specific resources.

```typescript
// app/lib/ai-literacy-content-service.ts

export interface PolicyTemplate {
  id: string;
  name: string;
  disciplineFamily: DisciplineFamily;
  stance: AIStance;
  frameworkLevel: PolicyFrameworkLevel;
  template: string;                    // Mustache-style template with {{course}}, {{discipline}} etc.
  examples: string[];                  // Real examples from survey (anonymized)
}

export interface AssignmentRedesignTemplate {
  id: string;
  originalType: string;                // "take-home-essay", "homework-problem-set", etc.
  redesignApproach: string;            // "process-portfolio", "in-class-defense", etc.
  description: string;
  bloomLevelShift: string;             // "Remember → Analyze" etc.
  effort: 'low' | 'medium' | 'high';
  examples: AssignmentExample[];
}

export async function getPolicyTemplates(filters?: { discipline?: DisciplineFamily; stance?: AIStance }): Promise<PolicyTemplate[]>;
export async function getRedesignTemplates(assignmentType: string): Promise<AssignmentRedesignTemplate[]>;
export async function getDisciplineFramework(family: DisciplineFamily): Promise<DisciplineFramework>;
```

---

## Sandy Integration

### New Sandy Tools (registered in tool registry)

The AI Literacy Hub adds **6 new tools** to Sandy's MCP-lite registry:

```typescript
// app/lib/agent/tools/ai-literacy-tools.ts

export const tools: ToolDefinition[] = [
  {
    name: 'check_ai_readiness',
    description: 'Show the faculty member their AI readiness snapshot — policy coverage, assignment vulnerability, training progress',
    parameters: {},
    permission: 'auto',
    roles: ['EDUCATOR', 'ADMIN'],
    handler: async (params, context) => {
      const snapshot = await getReadinessSnapshot(context.userId);
      return formatReadinessCard(snapshot);
    }
  },
  {
    name: 'analyze_assignment_ai_risk',
    description: 'Analyze an assignment for AI completability and suggest redesign options',
    parameters: {
      assignmentId: { type: 'string', required: false },
      description: { type: 'string', required: false }  // Free-text if no assignmentId
    },
    permission: 'auto',
    roles: ['EDUCATOR'],
    handler: async (params, context) => {
      // Uses Claude to assess: "Given this assignment, how easily could a student
      // use AI to complete it? What specific vulnerabilities exist?"
      return analyzeAndSuggest(params);
    }
  },
  {
    name: 'generate_ai_policy',
    description: 'Generate a course AI policy based on instructor stance, discipline, and course type',
    parameters: {
      courseId: { type: 'string', required: true },
      stance: { type: 'string', enum: ['PROHIBIT', 'CAUTIOUS', 'GUIDED', 'INTEGRATE', 'REQUIRE'] },
      includeExamples: { type: 'boolean', default: true }
    },
    permission: 'confirm',    // Faculty reviews before saving
    roles: ['EDUCATOR'],
    handler: async (params, context) => {
      // Pulls discipline, course objectives, existing assignments
      // Generates structured policy with per-assignment stance
      return generatePolicy(params, context);
    }
  },
  {
    name: 'suggest_process_assessment',
    description: 'Suggest process-based assessment alternatives that make the learning journey visible',
    parameters: {
      assignmentId: { type: 'string', required: false },
      currentFormat: { type: 'string', required: false },  // "essay", "problem-set", "research-paper"
      discipline: { type: 'string', required: false }
    },
    permission: 'auto',
    roles: ['EDUCATOR'],
    handler: async (params, context) => {
      return suggestProcessAlternatives(params, context);
    }
  },
  {
    name: 'get_student_ai_expectations',
    description: 'Show a student what AI policies apply to each of their enrolled courses',
    parameters: {},
    permission: 'auto',
    roles: ['STUDENT'],
    handler: async (params, context) => {
      return getStudentPolicyView(context.userId);
    }
  },
  {
    name: 'get_campus_ai_pulse',
    description: 'Show anonymized campus-wide AI adoption metrics (policy coverage, training completion, stance distribution)',
    parameters: {},
    permission: 'auto',
    roles: ['EDUCATOR', 'ADMIN', 'STAFF'],
    handler: async (params, context) => {
      const pulse = await getCampusPulse();
      return formatPulseCard(pulse);
    }
  }
];
```

### Sandy Proactive Triggers

Sandy should surface AI Literacy Hub content at natural moments:

| Trigger | Context | Sandy Action |
|---------|---------|-------------|
| Faculty creates new assignment | `/tasks` or course page | "This looks like a take-home essay. Want me to check how AI-resilient it is?" |
| Faculty opens course settings | Course page, start of semester | "This course doesn't have an AI policy yet. Want to build one in 5 minutes?" |
| Student opens assignment | Assignment detail | "This course allows AI for brainstorming only. Here's what that means." |
| Faculty views at-risk student | Advisee detail | "Would you like AI-aware talking points for your meeting with this student?" |
| DUS views department dashboard | Department admin | "3 of 12 courses in your department have AI policies. Want to see the gap?" |
| Faculty idle on homepage | Morning briefing | Include AI readiness nudge in daily briefing if policy gaps exist |

---

## The Eight Modules — Summary

Each module gets its own blueprint. Here is the scope and purpose of each:

### Module 1: Assignment Redesign Studio
**Route:** `/ai-literacy/assignments`
**Primary user:** Faculty
**Problem:** Traditional assessments are AI-completable. Faculty need help redesigning without starting from scratch.
**Core features:**
- Assignment AI vulnerability scanner (paste or select existing assignment → get risk score + specific vulnerabilities)
- Redesign suggestion engine (for each vulnerability, offer concrete alternatives with effort ratings)
- Template library organized by discipline and assignment type
- Before/after examples from real faculty (anonymized from survey data + curated)
- Sandy-guided redesign workflow: "Walk me through redesigning this assignment"
- Export redesigned assignment to course/Canvas

### Module 2: Policy Framework Builder
**Route:** `/ai-literacy/policy`
**Primary user:** Faculty, DUS
**Problem:** 50% of programs have no AI policy. Those that do mostly use copy-paste boilerplate.
**Core features:**
- Guided policy builder: 5-question wizard → generates structured policy
- 4-level framework (Prohibited / Limited / Guided / Required) with per-assignment granularity
- Discipline-aware templates (what works for physics ≠ what works for creative writing)
- Policy gap dashboard for DUS (which courses in your program have policies?)
- Syllabus export (formatted for Canvas syllabus section)
- Sandy integration: "Help me write an AI policy for my organic chemistry lab"

### Module 3: Process-Based Assessment Tools
**Route:** `/ai-literacy/process`
**Primary user:** Faculty
**Problem:** Detection doesn't work. Faculty need assessments where the learning process is visible.
**Core features:**
- Process portfolio builder (define checkpoints: brainstorm → outline → draft → revision → defense)
- Checkpoint templates for common assignment types
- In-class component designer (pair AI take-home work with in-class presentations/defenses)
- Revision history viewer (if student submits through platform, show edit timeline)
- Reflection prompt generator (meta-cognitive prompts about *how* student used/didn't use AI)
- Sandy: "Design a process-based version of this research paper assignment"

### Module 4: Student AI Literacy Modules
**Route:** `/ai-literacy/student`
**Primary user:** Students
**Problem:** Students use AI without understanding expectations, ethics, or limitations.
**Core features:**
- 6 interactive modules: Responsible Use, When NOT to Use AI, Citing AI Work, Critical Evaluation of AI Output, AI Limitations & Hallucinations, Your Discipline's Relationship with AI
- Course-linked: instructor can assign specific modules; completion tracked
- Per-course AI expectations dashboard ("Here's what each of your professors allows")
- Sandy study buddy integration: Study Buddy models responsible AI use in every interaction
- Badge/completion tracking (visible to student and advisor)
- Discipline-specific variants (AI in writing ≠ AI in engineering ≠ AI in healthcare)

### Module 5: Faculty AI Pedagogy Hub
**Route:** `/ai-literacy/pedagogy`
**Primary user:** Faculty
**Problem:** CELT does great work but can't scale to every faculty member. Faculty need on-demand peer learning.
**Core features:**
- Curated case library: real examples of innovative AI pedagogy (physics Socratic bot, co-written policies, etc.)
- Peer practice gallery: faculty can share what's working (moderated, anonymized option)
- Sandy as CELT multiplier: "How are other STEM faculty handling AI in lab courses?"
- Training modules: AI fundamentals, prompt engineering for educators, designing AI-enhanced activities
- Community of practice: threaded discussion tied to specific case studies
- CELT integration: surface CELT events, link to consultation booking

### Module 6: Discipline Identity Workshop
**Route:** `/ai-literacy/discipline`
**Primary user:** Faculty (especially humanities, writing-intensive)
**Problem:** Faculty feel their disciplines are existentially threatened. This is not a training gap — it's a professional identity crisis.
**Core features:**
- Guided reflection: "What does your discipline uniquely value that AI cannot replicate?"
- Discipline commitment statement builder (like the history department's hermeneutics statement)
- AI capability mapping: "Here's what AI can do in your field. Here's what it can't."
- Assignment grounding: connect discipline values → learning objectives → assessment design
- Peer voices: curated statements from faculty who've navigated this successfully
- Sandy: "Help me articulate why close reading still matters in the age of AI"

### Module 7: AI-Assisted Advising Framework
**Route:** `/ai-literacy/advising`
**Primary user:** Faculty advisors, academic advisors
**Problem:** 88% of programs have no AI guidance for advising. The AI conversation has been entirely classroom-focused.
**Core features:**
- Conversation frameworks: scenario-based guides (student admits using AI, student asks about AI tools, student struggling because they relied on AI)
- Student AI briefing: what Sandy knows about this student's AI engagement (FERPA-scoped)
- Department-level advising guidance builder
- Escalation paths: when to involve DUS, when to involve academic integrity office
- Sandy integration: "I'm about to meet with a student who I think used AI on their thesis proposal. What should I say?"
- Training modules specific to advising context

### Module 8: Instructor Stance Navigator
**Route:** `/ai-literacy/stance`
**Primary user:** Faculty (especially new-to-AI or conflicted)
**Problem:** Faculty feel institutional pressure to adopt AI while also being told "instructor discretion." They need help finding and articulating their own position.
**Core features:**
- Guided self-assessment: 10-question reflection → suggested stance with rationale
- Stance spectrum explainer: what Prohibit/Cautious/Guided/Integrate/Require actually look like in practice
- "What does this mean for my course?" simulator: given your stance, here's what your syllabus should say, what assignments need changing, what to tell students
- Peer stance distribution (anonymized): "Here's where faculty in your department/discipline land"
- Stance evolution tracker: revisit and update as comfort grows
- Sandy: "I'm not sure where I stand on AI in my classroom. Can you help me think through it?"
- No institutional pressure — the tool explicitly supports all stances equally

---

## Shared Components

### `AILiteracyLayout.tsx`
Wrapper layout for all `/ai-literacy/*` routes. Provides:
- Consistent header with hub navigation tabs
- Sandy context injection (tells Sandy the user is in the AI Literacy Hub)
- Breadcrumb trail
- Role-based content filtering

### `ReadinessSnapshotCard.tsx`
Compact card showing faculty AI readiness (policy coverage, assignment score, training progress). Used on:
- AI Literacy Hub landing
- Faculty homepage (optional widget)
- Sandy proactive suggestions

### `ModuleCard.tsx`
Reusable card for displaying a training module with progress indicator, estimated time, and launch button.

### `PolicyStanceBadge.tsx`
Visual badge showing a course's AI stance (color-coded: red=Prohibit, amber=Cautious, blue=Guided, green=Integrate, purple=Require).

### `AssignmentRiskBadge.tsx`
Visual indicator of AI completability (0-1 score → Low/Medium/High/Critical risk).

### `CampusPulseWidget.tsx`
Anonymized campus-wide metrics widget. Shown on hub landing and admin dashboard.

### `DisciplineFamilySelector.tsx`
Dropdown/radio for selecting discipline family. Used across multiple modules for content filtering.

---

## Key Files

| File | Purpose |
|------|---------|
| `app/(pages)/ai-literacy/page.tsx` | Hub landing page (role-adaptive) |
| `app/(pages)/ai-literacy/layout.tsx` | Shared layout with tabs/breadcrumbs |
| `app/components/ai-literacy/ReadinessSnapshotCard.tsx` | Faculty readiness widget |
| `app/components/ai-literacy/ModuleCard.tsx` | Training module card |
| `app/components/ai-literacy/PolicyStanceBadge.tsx` | Stance indicator |
| `app/components/ai-literacy/AssignmentRiskBadge.tsx` | Assignment vulnerability indicator |
| `app/components/ai-literacy/CampusPulseWidget.tsx` | Campus metrics |
| `app/components/ai-literacy/DisciplineFamilySelector.tsx` | Discipline picker |
| `app/lib/ai-literacy-service.ts` | Core hub service |
| `app/lib/ai-literacy-content-service.ts` | Templates, content, discipline frameworks |
| `app/lib/agent/tools/ai-literacy-tools.ts` | Sandy tool definitions (6 tools) |
| `app/api/ai-literacy/readiness/route.ts` | GET readiness snapshot |
| `app/api/ai-literacy/profile/route.ts` | GET/PUT literacy profile |
| `app/api/ai-literacy/modules/route.ts` | GET available modules |
| `app/api/ai-literacy/modules/[id]/complete/route.ts` | POST module completion |
| `app/api/ai-literacy/pulse/route.ts` | GET campus pulse |
| `prisma/schema.prisma` | New models (see above) |

---

## Implementation Order

The 8 modules should be built in this order, based on survey urgency and dependency:

| Priority | Module | Rationale |
|----------|--------|-----------|
| **1** | Module 8: Instructor Stance Navigator | Foundation — every other module adapts to the faculty member's stance. Build this first so all downstream modules can personalize. |
| **2** | Module 2: Policy Framework Builder | Loudest gap (50% no policy). Produces immediate, tangible output (syllabus language). |
| **3** | Module 1: Assignment Redesign Studio | Second-loudest need (62% want redesign help). Depends on stance for personalization. |
| **4** | Module 3: Process-Based Assessment Tools | Natural extension of Module 1. Shifts the paradigm from detection → visibility. |
| **5** | Module 4: Student AI Literacy Modules | Depends on policies existing (Module 2) to show per-course expectations. |
| **6** | Module 5: Faculty AI Pedagogy Hub | Content-heavy; can be seeded early but matures over time with faculty contributions. |
| **7** | Module 6: Discipline Identity Workshop | Serves the most distressed population. Needs careful, empathetic design. |
| **8** | Module 7: AI-Assisted Advising Framework | Greenfield (88% have nothing). Can be built independently but benefits from all prior modules. |

**Sprint 0 (this blueprint):** Hub infrastructure — layout, shared components, data models, Sandy tools, landing page.
Then one sprint per module, in priority order.

---

## Acceptance Criteria (Hub Infrastructure — Sprint 0)

- [ ] `/ai-literacy` route renders role-adaptive landing page
- [ ] Faculty see: readiness snapshot, 8 module cards with contextual counts, campus pulse
- [ ] Students see: course AI expectations list, student-facing module cards with progress
- [ ] `AILiteracyProfile` created on first visit (lazy)
- [ ] `ReadinessSnapshotCard` pulls real data: policy coverage from `CourseAIPolicy`, training from `AIModuleCompletion`
- [ ] All 6 Sandy tools registered and functional (even if modules not yet built, tools return "coming soon" gracefully)
- [ ] Sandy proactive trigger fires when faculty creates assignment without AI policy on course
- [ ] `CampusPulseWidget` renders with seed data; cron job snapshots daily
- [ ] Navigation: AI Literacy Hub appears in sidebar for all roles
- [ ] Mobile responsive: cards stack vertically, Sandy panel collapses
- [ ] No PII in campus pulse metrics — all aggregated
- [ ] FERPA: student completion data visible only to student + their enrolled-course instructors

---

## Privacy & FERPA Notes

- **Student module completions** are visible to the student and to instructors of courses the student is enrolled in (same FERPA scope as grades)
- **Faculty stance and readiness data** is private to the individual faculty member. DUS sees only aggregated, anonymized department-level metrics (e.g., "7 of 12 courses have policies" — not which 7)
- **Campus AI Pulse** is fully anonymized — counts only, no program/department identification at the public level
- **Advising AI context** follows existing FERPA scoping in `FacultyAdvisee` — advisor sees only their own advisees
- **Peer practice gallery** (Module 5) is opt-in, with option to share anonymously
- **Discipline identity statements** (Module 6) are private drafts unless faculty explicitly publishes to department

---

## Design Principles

These principles come directly from the DUS survey findings and should guide every module:

1. **Meet faculty where they are.** The hub supports all stances equally — from prohibition to required use. It never pushes a direction. If a faculty member in English wants to prohibit AI entirely, the hub helps them do that effectively.

2. **Don't detect — design.** The survey proves detection is a dead end. Every module should shift the conversation from "how do I catch cheating?" to "how do I design learning that's visible and meaningful?"

3. **Tangible output on every visit.** Faculty are drowning. Every interaction should produce something usable: a policy paragraph, a redesigned assignment, a conversation framework, a reflection. No abstract training without concrete deliverables.

4. **Differentiate support.** The three populations (integrators, cautious middle, besieged) need different content, different tone, and different outcomes. The stance system enables this personalization.

5. **Scale what CELT does.** CELT is trusted. The hub is not replacing CELT — it's making CELT's wisdom available 24/7 through Sandy, templates, and peer examples. Always surface CELT resources when relevant.

6. **Name the hard truths.** The survey respondents were honest about hard realities (assignments collapsing, disciplines under threat, institutional mixed signals). The hub should match that honesty. Sandy should never be dismissive or falsely optimistic.

7. **Process over policing.** Build tools that make the learning journey visible — not tools that surveil students. Revision histories, reflection prompts, checkpoint portfolios, in-class defenses. The goal is learning, not catching.
