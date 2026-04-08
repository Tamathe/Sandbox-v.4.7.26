# Student AI Literacy Experience — Architecture Blueprint

## Overview

Transform the student AI Literacy experience from 4 static content pages + 2 shared tools into a 5-module interactive system with onboarding, a student-specific progressive profile, branching decision scenarios, discipline-aware content, and Sandy integration.

**Build order:** Foundation → Onboarding + Profile → My AI Policies → Judgment Calls → Prompt Craft → Output Detective → AI Study Coach → Sandy Integration + Polish

---

## Approved Decisions

| Decision | Choice |
|----------|--------|
| 5 modules | My AI Policies, Judgment Calls, Prompt Craft, Output Detective, AI Study Coach |
| Build order | Policies → Judgment → Prompt → Output → Study Coach |
| Sandy role | Sandy-prominent header + CTA (not full orchestrator) for v1 |
| Data model | NEW `StudentLiteracyProfile` model (separate from AILiteracyProfile) |
| Profile dimensions | Practical Skill, Communication, Skepticism, Judgment (equal 0.25 weight) |
| Judgment Calls | Pre-authored branching decision trees with consequences |
| Shared models | Add `context` + `disciplineFamily` discriminator to PromptLabAttempt + OutputEvalAttempt |
| Onboarding | Lightweight 4-question student Quick Start |
| Assessment | No grades, no mandatory cert. Optional "AI Ready" badge at readiness > 75 |
| Advisor visibility | Opt-in only |

---

## Data Models (Prisma Schema Additions)

### New: StudentLiteracyProfile

```prisma
model StudentLiteracyProfile {
  id                  String            @id @default(cuid())
  userId              String            @unique
  user                User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Onboarding
  onboardingCompleted Boolean           @default(false)
  onboardingStep      Int               @default(0)
  onboardingResponses Json?             // { year, priorAIUse, biggestQuestion, comfortLevel }

  // 4 Dimensions (0-100)
  practicalSkill      Int               @default(0)
  communication       Int               @default(0)
  skepticism          Int               @default(0)
  judgment            Int               @default(0)

  // Readiness
  readiness           Int               @default(0)
  modulesCompleted    Int               @default(0)
  profileMaterialized Boolean           @default(false)
  lastScoredAt        DateTime?

  // Inferred context
  disciplineFamily    DisciplineFamily?

  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  @@index([userId])
}
```

### New: JudgmentCallScenario

```prisma
model JudgmentCallScenario {
  id               String              @id @default(cuid())
  title            String
  description      String
  category         JudgmentCategory
  disciplineFamily DisciplineFamily?   // null = universal
  difficulty       ScenarioDifficulty
  scenarioTree     Json                // ScenarioTree structure (see below)
  isActive         Boolean             @default(true)
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  attempts         JudgmentCallAttempt[]
}

enum JudgmentCategory {
  ETHICS
  CITATION
  BOUNDARIES
  RESPONSIBLE_USE
}

enum ScenarioDifficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}
```

### New: JudgmentCallAttempt

```prisma
model JudgmentCallAttempt {
  id             String               @id @default(cuid())
  userId         String
  user           User                 @relation("UserJudgmentCallAttempts", fields: [userId], references: [id], onDelete: Cascade)
  scenarioId     String
  scenario       JudgmentCallScenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  choicesMade    Json                 // [{ nodeId, choiceId, timestamp }]
  reflections    Json?                // [{ nodeId, text }]
  ethicalScore   Int                  // 0-100
  judgmentScore  Int                  // 0-100
  feedback       String               @db.Text
  completedAt    DateTime?
  createdAt      DateTime             @default(now())

  @@index([userId])
  @@index([scenarioId])
  @@index([userId, scenarioId])
}
```

### New: StudyCoachSession

```prisma
model StudyCoachSession {
  id               String            @id @default(cuid())
  userId           String
  user             User              @relation("UserStudyCoachSessions", fields: [userId], references: [id], onDelete: Cascade)
  courseId          String?
  course           Course?           @relation(fields: [courseId], references: [id])
  topic            String
  disciplineFamily DisciplineFamily?
  messages         Json              // [{ role, content, coachingNote?, timestamp }]
  techniqueScores  Json?             // { followUpQuality, verificationHabits, thinkingPauses, contextProvision }
  overallScore     Int?              // 0-100
  completedAt      DateTime?
  createdAt        DateTime          @default(now())

  @@index([userId])
  @@index([userId, courseId])
}
```

### Extend: PromptLabAttempt (add 2 fields)

```prisma
context          String            @default("educator")  // "student" | "educator"
disciplineFamily DisciplineFamily?
```

### Extend: OutputEvalAttempt (add 2 fields)

```prisma
context          String            @default("educator")  // "student" | "educator"
disciplineFamily DisciplineFamily?
```

### Extend: User model (add 3 relations)

```prisma
studentLiteracyProfile  StudentLiteracyProfile?
judgmentCallAttempts     JudgmentCallAttempt[]    @relation("UserJudgmentCallAttempts")
studyCoachSessions      StudyCoachSession[]      @relation("UserStudyCoachSessions")
```

### Extend: Course model (add 1 relation)

```prisma
studyCoachSessions      StudyCoachSession[]
```

---

## ScenarioTree JSON Schema

```typescript
interface ScenarioTree {
  startNodeId: string
  nodes: ScenarioNode[]
}

interface ScenarioNode {
  id: string
  type: 'situation' | 'choice' | 'consequence' | 'reflection'
  content: string
  choices?: ScenarioChoice[]     // only on 'choice' nodes
  nextNodeId?: string            // linear progression
  isTerminal?: boolean           // true = end of branch
  scores?: { ethical: number; judgment: number }  // on terminal consequence nodes
  reflectionPrompt?: string      // on reflection nodes
}

interface ScenarioChoice {
  id: string
  label: string
  description?: string
  nextNodeId: string
}
```

---

## API Routes

All new student routes under `/api/ai-literacy/student/`. Auth: `requireRequestUser(req)` on all.

| Route | Method | Service Call | Returns |
|-------|--------|-------------|---------|
| `/student/onboarding` | GET | `getOnboardingStatus(userId)` | `{ completed, step, responses }` |
| `/student/onboarding` | POST | `submitOnboardingStep(userId, step, data)` | `{ completed, step, profile }` |
| `/student/profile` | GET | `getStudentProfile(userId)` | `{ profile, materialized, readinessBand }` |
| `/student/profile` | POST | `recalculateStudentProfile(userId)` | Same as GET |
| `/student/policies` | GET | `getEnrolledCoursePolicies(userId)` | `{ courses: [{ course, policy, clarityScore }] }` |
| `/student/judgment-calls` | GET | `getAvailableScenarios(discipline?, difficulty?)` | `{ scenarios, userAttempts }` |
| `/student/judgment-calls/[scenarioId]` | GET | `getScenario(scenarioId)` | `{ scenario, userAttempts }` |
| `/student/judgment-calls/[scenarioId]` | POST | `submitAttempt(userId, scenarioId, choices, reflections)` | `{ attempt, scores, feedback }` |
| `/student/study-coach` | POST | `startSession(userId, courseId?, topic)` | `{ session }` |
| `/student/study-coach/[sessionId]` | GET | `getSession(sessionId)` | `{ session }` |
| `/student/study-coach/[sessionId]` | POST | `processMessage(sessionId, message)` | Streaming response |
| `/student/study-coach/[sessionId]/complete` | POST | `scoreSession(sessionId)` | `{ techniqueScores, overallScore }` |
| `/student/progress` | GET | `getStudentModuleProgress(userId)` | `{ progress: ModuleProgressMap }` |

Existing routes extended (add query param handling):
- `/api/ai-literacy/prompt-lab/challenges` — accept `?context=student&discipline=STEM`
- `/api/ai-literacy/prompt-lab/attempt` — accept `context` + `disciplineFamily` in POST body
- `/api/ai-literacy/output-eval/scenarios` — accept `?context=student&discipline=STEM`
- `/api/ai-literacy/output-eval/attempt` — accept `context` + `disciplineFamily` in POST body

---

## Service Layer

All new services in `app/lib/ai-literacy/`:

### student-onboarding-service.ts

```typescript
export interface OnboardingResponses {
  year: 'freshman' | 'sophomore' | 'junior' | 'senior' | 'graduate'
  priorAIUse: 'never' | 'casual' | 'regular' | 'daily'
  biggestQuestion: string
  comfortLevel: 1 | 2 | 3 | 4 | 5
}

export async function getOnboardingStatus(userId: string)
export async function submitOnboardingStep(userId: string, step: number, data: Partial<OnboardingResponses>)
export async function completeOnboarding(userId: string, responses: OnboardingResponses)
// completeOnboarding also calls inferDisciplineFromCourses and seeds initial profile dimensions
```

### student-literacy-profile-service.ts

```typescript
export function getStudentReadinessBand(score: number): { label: string; key: string }
// Bands: "Getting Started" (<=25), "Building Skills" (<=50), "Growing Confidence" (<=75), "AI Ready" (>75)

export async function getOrCreateProfile(userId: string): Promise<StudentLiteracyProfile>
export async function inferDisciplineFromCourses(userId: string): Promise<DisciplineFamily | null>

export async function recalculateStudentProfile(userId: string): Promise<StudentLiteracyProfile>
// Scoring signals:
//   practicalSkill <- PromptLabAttempt (context='student') scores + StudyCoachSession overallScores
//   communication  <- PromptLabAttempt clarity+specificity dimensions + StudyCoachSession contextProvision
//   skepticism     <- OutputEvalAttempt (context='student') detectionScore + JudgmentCallAttempt ethicalScore
//   judgment       <- ClarityCheckResponse scores + JudgmentCallAttempt judgmentScore
//   readiness      = equal-weighted average (0.25 each)
//   profileMaterialized = modulesCompleted >= 2
```

### student-policies-service.ts

```typescript
export interface CourseWithPolicy {
  course: { id: string; title: string; code: string; instructor: string }
  policy: CourseAIPolicy | null
  clarityScore: number | null
  hasTakenClarityCheck: boolean
}

export async function getEnrolledCoursePolicies(userId: string): Promise<CourseWithPolicy[]>
```

### judgment-calls-service.ts

```typescript
export async function getAvailableScenarios(disciplineFamily?: DisciplineFamily, difficulty?: ScenarioDifficulty): Promise<JudgmentCallScenario[]>
export async function getScenario(scenarioId: string): Promise<JudgmentCallScenario>
export async function submitAttempt(userId: string, scenarioId: string, choicesMade: ChoiceMade[], reflections: Reflection[]): Promise<JudgmentCallAttempt>
export function scoreChoicePath(choicesMade: ChoiceMade[], scenarioTree: ScenarioTree): { ethicalScore: number; judgmentScore: number }
export async function generateFeedback(scenarioTitle: string, choicesMade: ChoiceMade[], reflections: Reflection[], scores: Scores): Promise<string>
// generateFeedback uses Claude Haiku for personalized feedback
```

### study-coach-service.ts

```typescript
export async function startSession(userId: string, topic: string, courseId?: string, disciplineFamily?: DisciplineFamily): Promise<StudyCoachSession>
export async function processMessage(sessionId: string, userMessage: string): AsyncGenerator<string>
// Streaming from Claude Haiku. System prompt coaches on HOW to use AI for learning.
export async function scoreSession(sessionId: string): Promise<{ techniqueScores: TechniqueScores; overallScore: number }>
// Claude Haiku analyzes transcript, scores: followUpQuality, verificationHabits, thinkingPauses, contextProvision
```

### student-prompt-craft-service.ts

```typescript
export interface StudentPromptChallenge {
  id: string; title: string; discipline: DisciplineFamily; level: 1|2|3|4|5
  scenario: string; originalPrompt: string; evaluationCriteria: string
}
export const STUDENT_CHALLENGES: StudentPromptChallenge[]
// 15-20 pre-authored challenges across 6 discipline families
export function getStudentChallenges(discipline?: DisciplineFamily, level?: number)
```

### student-output-detective-service.ts

```typescript
export interface StudentOutputScenario {
  id: string; title: string; discipline: DisciplineFamily; tier: 1|2|3
  context: string; aiResponse: string
  plantedErrors: { start: number; end: number; type: string; explanation: string }[]
}
export const STUDENT_SCENARIOS: StudentOutputScenario[]
// 15-20 pre-authored scenarios across disciplines
export function getStudentScenarios(discipline?: DisciplineFamily, tier?: number)
```

### student-progress-service.ts

```typescript
export type StudentModuleKey = 'policies' | 'judgment-calls' | 'prompt-craft' | 'output-detective' | 'study-coach'
export async function getStudentModuleProgress(userId: string): Promise<Record<StudentModuleKey, ModuleStatus>>
// policies: completed if hasTakenClarityCheck for any course
// judgment-calls: completed if 3+ scenarios, in-progress if 1+
// prompt-craft: completed if level 3+, in-progress if any attempts
// output-detective: completed if tier 2+, in-progress if any attempts
// study-coach: completed if 2+ sessions scored, in-progress if any
```

---

## Component Hierarchy

### Hub Page (student branch of existing ai-literacy/page.tsx)

```
[Student View]
+-- StudentLiteracyOnboarding (if !onboardingCompleted)
|   +-- Step 1: "What year are you?" (radio buttons)
|   +-- Step 2: "How often do you use AI tools?" (radio buttons)
|   +-- Step 3: "What's your biggest question about AI in school?" (text input)
|   +-- Step 4: "How comfortable are you with AI?" (1-5 scale)
|   +-- Completion animation -> transitions to hub
|
+-- StudentLiteracyHub (if onboardingCompleted)
    +-- SandyStudentGreeting
    |   +-- Sandy avatar (size-7 bg-[#0033A0] rounded-full)
    |   +-- Personalized message (courses, policies, profile state) — data-assembled, NOT LLM-generated
    |   +-- "Ask Sandy" button -> opens SandyPanel
    |
    +-- StudentProfileCard (if profileMaterialized)
    |   +-- 4 dimension bars (Practical Skill, Communication, Skepticism, Judgment)
    |   +-- Readiness badge
    |   +-- "AI Ready" badge (if readiness > 75)
    |
    +-- ModuleGrid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4)
        +-- ModuleCard: My AI Policies (FileCheck, blue-50)
        +-- ModuleCard: Judgment Calls (Scale, amber-50)
        +-- ModuleCard: Prompt Craft (PenTool, green-50)
        +-- ModuleCard: Output Detective (Search, purple-50)
        +-- ModuleCard: AI Study Coach (GraduationCap, rose-50)
```

### Module Pages

**My AI Policies** — `app/(pages)/ai-literacy/student/policies/page.tsx`
- PageHeader, CoursePolicyList, CoursePolicyCard (per enrolled course), ClarityCheck reuse, NoPolicyCoursesSection

**Judgment Calls Hub** — `app/(pages)/ai-literacy/student/judgment-calls/page.tsx`
- PageHeader, CategoryFilter tabs, ScenarioGrid with ScenarioCards

**Judgment Call Player** — `app/(pages)/ai-literacy/student/judgment-calls/[scenarioId]/page.tsx`
- ProgressBar, NarrativePanel, ChoiceSelector (2-3 cards), ConsequenceReveal, ReflectionPrompt (textarea), AttemptSummary (scores + feedback)

**Prompt Craft** — `app/(pages)/ai-literacy/student/prompt-craft/page.tsx`
- PageHeader, DisciplinePicker, LevelSelector, ChallengeList, ChallengePlayer (scenario, original prompt, editor, output comparison, score card)

**Output Detective** — `app/(pages)/ai-literacy/student/output-detective/page.tsx`
- PageHeader, DisciplinePicker, TierSelector, ScenarioList, ScenarioPlayer (context, AI response with highlight tool, rating, feedback reveal)

**AI Study Coach Hub** — `app/(pages)/ai-literacy/student/study-coach/page.tsx`
- PageHeader, NewSessionForm (course dropdown, topic input), PastSessionsList

**AI Study Coach Session** — `app/(pages)/ai-literacy/student/study-coach/[sessionId]/page.tsx`
- SessionHeader, CoachingChat (streaming messages), CoachingHints (sidebar technique tips), SessionScorecard (radar/bar chart, 4 technique scores, takeaways)

---

## Sandy Integration

### New Tools (add to ai-literacy-tools.ts)

| Tool | Args | Returns |
|------|------|---------|
| `get_student_ai_policies` | none | Enrolled course policies with stance, summary, clarity scores |
| `check_assignment_ai_policy` | `{ courseName, assignmentDescription }` | Whether AI allowed + policy excerpts |
| `get_student_literacy_profile` | none | 4 dimensions, readiness band, modules completed |
| `suggest_ai_strategy_for_course` | `{ courseName }` | 3-5 ways to use AI in this course |
| `start_study_coach_session` | `{ topic, courseName? }` | Creates session, returns URL |
| `get_student_module_recommendations` | none | Next best module(s) based on profile gaps |

### Proactive Suggestions (add to proactive-suggestions.ts)

- `student-policies-unreviewed` (priority 7): "You have {n} courses with AI policies you haven't reviewed yet."
- `student-literacy-gap` (priority 5): "Your {lowestDimension} could use some practice — try {module}?"

### Sandy Greeting

Data-assembled (zero LLM calls). Fetches enrolled courses, policies, profile state, module progress. Constructs greeting like: "Hey Tiana — you're in BIO 301 and ENG 204 this semester. Professor Chen allows AI for research but not drafts."

---

## Seed Data

### Judgment Call Scenarios (12 for v1)

| # | Title | Category | Difficulty | Discipline |
|---|-------|----------|-----------|------------|
| 1 | The Group Project Shortcut | ETHICS | BEGINNER | Universal |
| 2 | The Midnight Essay | BOUNDARIES | BEGINNER | Universal |
| 3 | The Uncited Summary | CITATION | BEGINNER | Universal |
| 4 | The Lab Report Fabrication | ETHICS | INTERMEDIATE | STEM |
| 5 | The Code Review | BOUNDARIES | INTERMEDIATE | STEM |
| 6 | The Literature Analysis | CITATION | INTERMEDIATE | HUMANITIES |
| 7 | The Clinical Case Study | RESPONSIBLE_USE | INTERMEDIATE | HEALTH_SCIENCES |
| 8 | The Data Analysis Dilemma | ETHICS | INTERMEDIATE | SOCIAL_SCIENCES |
| 9 | The Design Brief | BOUNDARIES | INTERMEDIATE | ARTS |
| 10 | The Whistleblower | ETHICS | ADVANCED | Universal |
| 11 | The Thesis Advisor | RESPONSIBLE_USE | ADVANCED | Universal |
| 12 | The Job Application | BOUNDARIES | ADVANCED | PROFESSIONAL |

Each scenario: 3-5 decision nodes, 2-3 branches per choice, 15-20 total nodes per tree.

### Student Prompt Challenges: 18 (3 per discipline x 3 levels)
### Student Output Scenarios: 18 (3 per discipline x 3 tiers)

---

## UI Standards (from PLATFORM-CONSISTENCY-MANIFEST.md)

- PageHeader component (mandatory, sole pattern)
- `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8`
- Cards: `border-2 border-gray-200 rounded-2xl shadow-sm`
- Hover: `hover:shadow-md hover:-translate-y-0.5 transition-all`
- Typography: h1 `text-2xl font-extrabold`, h2 `text-base font-extrabold`, h3 `text-sm font-bold`
- Icons: lucide-react ONLY, `size-4` for nav, `size-5` for feature icons
- Colors: UK Blue `#0033A0` primary. No gradient card fills.
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`

---

## Build Phases (8 phases, 2 tasks each)

| Phase | Task 1 | Task 2 |
|-------|--------|--------|
| 1: Foundation | Prisma schema (all models, enums, extensions, migration) | Student Literacy Hub skeleton + Sandy greeting + module grid |
| 2: Onboarding + Profile | Student onboarding (service + API + component) | Student Progressive Profile (service + API + card) |
| 3: My AI Policies | Policies service + API route | Policies page + CoursePolicyCard + ClarityCheck |
| 4: Judgment Calls | Judgment service + API + seed script (12 scenarios) | Judgment hub + player (branching UI) |
| 5: Prompt Craft | Prompt Craft service (challenges) + extend prompt-lab API | Prompt Craft page + discipline picker + player |
| 6: Output Detective | Output Detective service (scenarios) + extend output-eval API | Output Detective page + highlight tool + feedback |
| 7: AI Study Coach | Study Coach service + API (streaming, scoring) | Study Coach pages + CoachingChat + scorecard |
| 8: Sandy + Polish | Sandy tools (6) + proactive suggestions (2) | Progress service + module hook + profile triggers |
