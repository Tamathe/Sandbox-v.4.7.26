# Architecture: Study Buddy v2 — World-Class AI Tutor

> **Goal:** Make Study Buddy the most effective, most accessible, highest-yield AI-powered tutor in higher education. Grounded in learning science. Every feature measurable.
>
> **Status: ALL 9 SPRINTS COMPLETE (2026-03-25). 0 TypeScript errors.**

---

## Implementation Status

All 12 phases implemented across 9 sprints. Study Buddy is now a persistent, adaptive, evidence-based AI tutor with cross-session memory, spaced repetition, error taxonomy, metacognitive calibration, pre-exam mode, scored modes, analytics, concept map, voice output, accessibility features, Pomodoro timer, and real-time adaptation.

### Backend Infrastructure (ALL wired to Study Buddy)

| Service | File | What It Does | Wired? |
|---------|------|-------------|--------|
| SM-2 Spaced Repetition | `sr-scheduler.ts` | Forgetting curves, next-review scheduling, due concepts | **Yes** — Sprint 1 (prompt) + Sprint 2 (flashcard UI) |
| Concept Mastery | `concept-mastery-service.ts` | Per-concept cross-course mastery with encounter counts | **Yes** — Sprint 1 (context) + Sprint 6 (dashboard) |
| Mastery Decay | `mastery-decay.ts` | 90-day half-life decay at read time | **Yes** — Sprint 1 + 6 (concept bars) |
| Learning Observer | `learning-observer.ts` | Bloom level, cognitive load, frustration, misconceptions (every 3rd turn) | **Yes** — Sprint 1 + 9 (7 adaptive behaviors) |
| Student Context API | `student-context-api.ts` | Structured profile: weak/strong concepts, modality, risk, due concepts | **Yes** — Sprint 1 (context route + prompt injection) |
| Study Plan Service | `study-plan-service.ts` | AI-generated personalized study plans (Sonnet) | **Yes** — Sprint 4 (exam prep mode) |
| Episodic Memory | `episodic-memory-service.ts` | Surfaces relevant past sessions by concept overlap | **Yes** — Sprint 1 (cross-session memory in prompt) |
| Graph RAG | `graph-rag-service.ts` | Multi-hop knowledge graph queries | **Yes** — via chat-service + Sprint 7 (concept map) |
| Misconception Taxonomy | Schema + observer | Regex-triggered misconception detection + remediation hints | **Yes** — Sprint 1 (remediation hints in SR-due prompt) |
| Effectiveness Engine | `effectiveness-engine.ts` | Session interaction patterns, cohort mastery snapshots | **Yes** — Sprint 6 (analytics dashboard) |
| Student Profile | `student-profile-service.ts` | Risk score, velocity, bloom level, peak hour, modality | **Yes** — Sprint 1 (learner signals in prompt) + Sprint 6 (habits) |
| Mastery Profile | `chat-service.ts:buildMasteryProfile()` | Injects mastered/struggling objectives into system prompt | **Yes** — original + enhanced across all sprints |

**All services now wired. Implementation complete.**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Study Buddy v2 — UI Layer                   │
├────────────┬────────────┬──────────────┬────────────────────────┤
│ Pre-Session│ In-Session │ Post-Session │ Analytics              │
│ ┌────────┐ │ ┌────────┐ │ ┌──────────┐ │ ┌──────────────────┐  │
│ │Adaptive│ │ │Metacog │ │ │Teach-Back│ │ │Mastery Timeline  │  │
│ │Mode    │ │ │Calibr. │ │ │Scoring   │ │ │SR Forecast       │  │
│ │Suggest │ │ │        │ │ │          │ │ │Session History   │  │
│ ├────────┤ │ ├────────┤ │ ├──────────┤ │ │Weak Spots        │  │
│ │Pre-Exam│ │ │Error   │ │ │Enhanced  │ │ │Concept Map       │  │
│ │Mode    │ │ │Taxonomy│ │ │Wrap-Up   │ │ └──────────────────┘  │
│ ├────────┤ │ ├────────┤ │ ├──────────┤ │                       │
│ │SR Due  │ │ │Elabor. │ │ │SR Update │ │                       │
│ │Cards   │ │ │Interr. │ │ │          │ │                       │
│ ├────────┤ │ ├────────┤ │ └──────────┘ │                       │
│ │Episodic│ │ │Real-   │ │              │                       │
│ │Context │ │ │Time    │ │              │                       │
│ │        │ │ │Adapt.  │ │              │                       │
│ └────────┘ │ └────────┘ │              │                       │
├────────────┴────────────┴──────────────┴────────────────────────┤
│                    Existing Services Layer                       │
│  sr-scheduler · concept-mastery · learning-observer · episodic  │
│  student-context-api · study-plan · graph-rag · misconceptions  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Wire the Brain (Learner Model Integration)

**Goal:** Study Buddy becomes aware of who the student is across sessions.

### 1A. Session Start — Load Student Context

When Study Buddy mounts, fetch the student's full context before showing the mode picker.

**New hook: `useStudyBuddyContext`**

```typescript
// app/hooks/useStudyBuddyContext.ts
interface StudyBuddyContext {
  profile: {
    preferredModality: string | null
    riskScore: number
    learningVelocity: number
    dominantBloomLevel: number | null
    avgCognitiveLoad: number | null
    peakEngagementHour: number | null
    lastSessionAt: string | null
    srDueCount: number
  }
  weakConcepts: { concept: string; effectiveMastery: number; isStale: boolean }[]
  strongConcepts: { concept: string; effectiveMastery: number }[]
  dueConcepts: { conceptSlug: string; missedReviews: number; bloomHighWater: number; remediationHint?: string }[]
  recentSessions: { toolName: string; score: number; conceptsTouched: string[]; createdAt: string }[]
  episodicMemory: { summary: string; conceptsOverlap: string[]; score: number; createdAt: string }[]
  suggestedMode: Mode | null
  suggestedReason: string | null
}
```

**API route: `GET /api/study/[toolId]/context`**

Calls existing services:
- `getStudentContextJSON(userId, courseId)` — profile, weak/strong concepts, due concepts
- `getEpisodicMemory(userId, currentConcepts)` — relevant past sessions
- `getDueConcepts(userId, courseId)` — SR-scheduled concepts
- New: `suggestStudyMode(context)` — deterministic mode recommendation (see 1C)

**Integration point in StudyBuddyInterface:**
- Fetch on mount (parallel with document fetch)
- Display on select screen: "Sandy suggests Quiz Mode — you have 5 concepts due for review"
- Pass to chat system prompt: Sandy knows your history without re-asking

### 1B. Session End — Update Learner Model

Already happens via `scoreSession()` cascade, but Study Buddy should:
1. Show the student what was learned (concepts touched, mastery changes)
2. Surface what's due next ("3 concepts need review by Thursday")
3. Suggest the next study action

**Enhanced wrap-up payload** (returned from `PUT /api/sessions/[id]`):
```typescript
{
  summary: string
  conceptsTouched: string[]
  masteryChanges: { concept: string; before: number; after: number; direction: 'up' | 'down' | 'new' }[]
  nextReview: { concept: string; dueAt: string }[]
  suggestedNextAction: string  // "Review flashcards for [X]" or "Take a break — you've earned it"
}
```

### 1C. Adaptive Mode Suggestion

Deterministic function (no AI call needed):

```
suggestStudyMode(context):
  if dueConcepts.length >= 3        → flashcards ("You have N cards due for review")
  if weakConcepts any isStale       → quiz ("Time to refresh [concept] — last seen N days ago")
  if riskScore > 0.6                → tutor ("Let's work through the basics together")
  if dominantBloomLevel >= 4        → debate or teach-back ("You're ready to go deeper")
  if recentSessions all quiz        → teach-back ("You've been quizzing — try explaining it")
  if no sessions ever               → tutor ("Let's start with what you're working on")
  else                              → null (student chooses)
```

Shown as a highlighted card on the select screen with Sandy's reasoning. Student can always override.

### 1D. Episodic Context in System Prompt

When building the chat system prompt, append episodic memory:

```
## CROSS-SESSION CONTEXT
In a previous session (3 days ago, score: 0.72), this student worked on [photosynthesis, ATP cycle].
They showed strong understanding of light reactions but struggled with the Calvin cycle.
Misconception detected: student confused CO2 fixation with oxygen release.
Build on their light reaction knowledge. Don't re-explain it. Focus on where they left off.
```

This comes from `getEpisodicMemory()` + `ConceptState.firedMisconceptions`.

---

## Phase 2: Spaced Repetition in Flashcards

**Goal:** Flashcard mode becomes a real SR system, not random card generation.

### 2A. SR-Aware Flashcard Generation

**Current flow:** Student says "give me flashcards" → Claude generates random cards from materials.

**New flow:**
1. On flashcard mode start, fetch `getDueConcepts(userId, courseId)`
2. If due concepts exist → inject into system prompt:
   ```
   PRIORITY CONCEPTS FOR REVIEW (spaced repetition schedule):
   These concepts are due or overdue. Generate flashcards for these FIRST:
   1. "Calvin Cycle" — last reviewed 7 days ago, stability factor 3.2, 1 missed review
      Remediation hint: Student previously confused CO2 fixation with O2 release
   2. "ATP Synthase" — last reviewed 14 days ago, stability factor 6.1
   After covering due concepts, generate cards for new material from the course.
   ```
3. If no due concepts → normal generation from materials

### 2B. Card-Level Tracking

**New model: `FlashcardState`**

```prisma
model FlashcardState {
  id             String   @id @default(cuid())
  userId         String
  courseId        String
  conceptSlug    String   // normalized concept identifier
  cardFront      String   // term text (for dedup)
  stabilityDays  Float    @default(1.0)  // SM-2 stability factor
  nextReviewAt   DateTime @default(now())
  easeFactor     Float    @default(2.5)
  reviewCount    Int      @default(0)
  lastQuality    Int      @default(0)  // 0-5 SM-2 quality rating
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user    User   @relation(fields: [userId], references: [id])
  @@unique([userId, courseId, conceptSlug, cardFront])
  @@index([userId, courseId, nextReviewAt])
}
```

### 2C. Review Buttons → SR Updates

Replace current "Got it" / "Review again" with a 3-button quality rating:

| Button | Label | SM-2 Quality | Color | Effect |
|--------|-------|-------------|-------|--------|
| Again | "Didn't know it" | 1 | Red | Reset interval to 1 day |
| Good | "Got it with effort" | 3 | Amber | Normal interval growth |
| Easy | "Knew it instantly" | 5 | Green | Accelerated interval |

On each button press:
1. `POST /api/study/[toolId]/flashcard-review` with `{ conceptSlug, cardFront, quality }`
2. Server computes next review via `computeNextReview()` from `sr-scheduler.ts`
3. Upserts `FlashcardState`
4. Client shows next card (due cards first, then new)

### 2D. SR Dashboard Widget

On the select screen, show:
```
┌─ Spaced Repetition ──────────────────┐
│ 📊 12 cards due today                │
│     3 overdue · 5 due · 4 new        │
│                                      │
│ This week: ████████░░ 80% reviewed   │
│ Streak: 5 days                       │
│                                      │
│ [Start Review →]                     │
└──────────────────────────────────────┘
```

Clicking "Start Review" enters flashcard mode with only due cards queued.

---

## Phase 3: Pre-Exam Mode

**Goal:** "I have an exam in 2 days" → optimal study plan executed inside Study Buddy.

### 3A. Entry Point

New option on select screen (above mode cards):

```
┌─ 🎯 Exam Prep Mode ─────────────────────────────┐
│ "I have an exam coming up"                        │
│ Sandy will diagnose your gaps and build a plan.   │
│ [Start Exam Prep →]                               │
└───────────────────────────────────────────────────┘
```

### 3B. Flow

```
Step 1: INTAKE (Sandy asks)
  → "What's the exam on? Which chapters/topics?"
  → "When is it?"
  → "How confident do you feel (1-5)?"

Step 2: DIAGNOSTIC QUIZ (automatic)
  → Sandy generates 8-10 broad questions covering the exam scope
  → Mix of recall, application, analysis (Bloom levels 1-4)
  → Student answers each (quiz mode scoring applies)
  → Sandy identifies weak/strong areas from results + learner model

Step 3: STUDY PLAN (generated via study-plan-service.ts)
  → Prioritized list of concepts to review
  → Time estimates per concept
  → Recommended mode for each (flashcards for memorization, teach-back for understanding, etc.)
  → Total estimated time vs. time available

Step 4: GUIDED EXECUTION
  → Sandy walks through the plan step by step
  → Each step uses the appropriate mode's pedagogy
  → Progress bar shows plan completion
  → Adaptive: if student nails a concept, skip ahead; if struggling, spend more time
  → Periodic check-ins: "We've been going 25 minutes. Break or keep going?"

Step 5: FINAL CHECK
  → Re-quiz on initially weak areas
  → Compare before/after scores
  → "You're ready" or "Focus on [X] tomorrow morning"
```

### 3C. Implementation

**New state in StudyBuddyInterface:**
```typescript
type Screen = 'select' | 'chat' | 'wrapup' | 'exam-prep'

interface ExamPrepState {
  phase: 'intake' | 'diagnostic' | 'plan' | 'execution' | 'final-check'
  examTopic: string | null
  examDate: string | null
  confidenceRating: number | null
  diagnosticResults: { concept: string; correct: boolean; bloomLevel: number }[]
  studyPlan: StudyPlanItem[]
  currentPlanStep: number
  preScore: number   // diagnostic accuracy
  postScore: number  // final check accuracy
}
```

**API route: `POST /api/study/[toolId]/exam-prep`**
- Calls `generateStudyPlan(userId, courseId)` with exam context
- Returns prioritized plan with time estimates

**System prompt injection:**
```
## EXAM PREP MODE — ACTIVE PLAN
The student has an exam on [date] covering [topics].
Diagnostic results: [concept scores].
Current plan step: Review "Calvin Cycle" via flashcard-style Q&A.
Time remaining: ~45 minutes of study planned.
Stay focused on the plan. Don't let the conversation drift to unrelated topics.
After this concept, transition to: [next step].
```

---

## Phase 4: Metacognitive Calibration

**Goal:** Teach students to accurately assess their own knowledge — the strongest predictor of academic success.

### 4A. Confidence Rating (Quiz Mode)

Before each quiz answer, insert a confidence prompt:

```
┌─ Sandy's Question ──────────────────────────────┐
│ What is the primary function of ATP synthase     │
│ in the electron transport chain?                 │
├──────────────────────────────────────────────────┤
│ How confident are you?                           │
│ [😟 Guessing] [🤔 Somewhat] [😊 Pretty sure] [💪 Certain] │
└──────────────────────────────────────────────────┘
```

After the answer is evaluated:
- **Overconfident** (said "Certain", got it wrong): Sandy calls it out gently: "You felt certain about this one but it wasn't quite right. That's a signal to revisit this concept — overconfidence here could hurt you on exam day."
- **Underconfident** (said "Guessing", got it right): "You knew more than you thought! Trust your understanding here."
- **Calibrated**: No comment (don't interrupt flow).

### 4B. Tracking

**New fields on quiz log entries:**
```typescript
interface QuizLogEntry {
  question: string
  userAnswer: string
  correct: boolean
  confidenceBefore: 1 | 2 | 3 | 4  // guessing → certain
  calibrationScore: number           // |confidence - accuracy| (0 = perfect calibration)
}
```

**Wrap-up addition:**
```
Calibration: You were overconfident on 2/5 questions.
Tip: When you feel "certain," double-check by asking yourself
"what's one way this could be wrong?"
```

### 4C. Calibration Over Time

Stored per user per course. Shown in analytics:
- Calibration trend (are they getting more accurate at self-assessment?)
- Overconfidence rate vs. underconfidence rate
- Most miscalibrated topics

---

## Phase 5: Error Taxonomy

**Goal:** When a student gets something wrong, categorize *why* and respond differently.

### 5A. Error Categories

| Category | Signal | Sandy's Response |
|----------|--------|-----------------|
| **Misconception** | Answer contains a specific false belief | Directly address the misconception. "A lot of students think [X], but actually [Y]. Here's why..." |
| **Knowledge Gap** | Answer shows they never encountered the prerequisite | Backfill. "Before we can understand [X], we need to cover [prerequisite]. Let me walk you through it." |
| **Careless Error** | Answer is close but has a minor mistake | Light touch. "Almost! You've got the right idea. Just watch out for [detail]." |
| **Transfer Failure** | Answer shows knowledge of concept but can't apply it in context | Practice. "You know the concept well. Let's try applying it to a different scenario..." |
| **Partial Understanding** | Answer is partly right, missing depth | Deepen. "Good start. You've got [part]. Now, what about [missing piece]?" |

### 5B. Implementation

**Prompt engineering** — add to quiz and tutor mode system prompts:

```
## ERROR ANALYSIS PROTOCOL
When the student gives an incorrect or incomplete answer, BEFORE providing feedback,
classify the error into exactly ONE of these categories and emit a hidden signal:

<!--ERROR:misconception|[brief description of the false belief]-->
<!--ERROR:knowledge-gap|[prerequisite concept they're missing]-->
<!--ERROR:careless|[what they almost had right]-->
<!--ERROR:transfer-failure|[concept they know but can't apply here]-->
<!--ERROR:partial|[what's missing from their understanding]-->

Then tailor your response to the error type:
- Misconception: Directly correct the false belief with evidence
- Knowledge gap: Teach the prerequisite before returning to the question
- Careless: Acknowledge their understanding, point out the specific mistake
- Transfer failure: Provide a worked example in the new context
- Partial: Build on what they got right, guide them to the rest
```

### 5C. Client-Side Parsing

Detect `<!--ERROR:type|description-->` signals (same pattern as QUIZ signals):
- Strip from displayed text
- Log error type per question in `quizLog`
- Show in wrap-up: "Error patterns: 2 knowledge gaps, 1 misconception"
- Feed to SR system: misconceptions get shorter review intervals

---

## Phase 6: Enhanced Modes

### 6A. Teach-Back Scoring Rubric

After Phase 2 feedback, emit structured scores:

```
<!--TEACHBACK_SCORE:{
  "accuracy": 0.8,
  "completeness": 0.6,
  "depth": 0.7,
  "clarity": 0.9,
  "overallGrade": "B"
}-->
```

**Rubric (shown to student):**

| Dimension | What It Measures | Weight |
|-----------|-----------------|--------|
| Accuracy | Did they get the facts right? | 30% |
| Completeness | Did they cover all key points? | 25% |
| Depth | Did they explain *why*, not just *what*? | 25% |
| Clarity | Could a peer understand this explanation? | 20% |

**Wrap-up for teach-back:** Show rubric breakdown with specific feedback per dimension.

### 6B. Debate Scoring

After 4+ exchanges, emit:

```
<!--DEBATE_SCORE:{
  "argumentStrength": 0.7,
  "evidenceUse": 0.5,
  "logicalConsistency": 0.8,
  "counterargumentHandling": 0.6,
  "overallGrade": "B-"
}-->
```

### 6C. Elaborative Interrogation (All Modes)

Add to all mode system prompts:

```
## ELABORATIVE INTERROGATION
After explaining a concept, periodically ask ONE of these deepening questions:
- "Why does this make sense given what you know about [related concept]?"
- "Can you think of a real-world example where this applies?"
- "What would happen if [assumption] were different?"
- "How is this similar to or different from [related concept]?"

Use these sparingly (every 3-4 exchanges). They force deeper processing and
improve long-term retention by 2-3x compared to passive re-reading.
Do not announce that you're using this technique — just ask naturally.
```

---

## Phase 7: Study Analytics Dashboard

**Goal:** Show the student their learning trajectory — mastery, habits, and what needs attention.

### 7A. New Screen: `insights`

Add a 4th screen to StudyBuddyInterface: `type Screen = 'select' | 'chat' | 'wrapup' | 'insights'`

Accessible via "My Progress" button on select screen.

### 7B. Dashboard Layout

```
┌─ Study Insights ─────────────────────────────────────────────┐
│                                                               │
│ ┌─ Mastery Timeline ───────────────────────────────────────┐ │
│ │ [Line chart: overall mastery % over last 30 days]        │ │
│ │ ████████████████████████████░░░░                          │ │
│ │ 72% → 84% (+12% this month)                              │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─ Concept Mastery Map ────────┐ ┌─ SR Forecast ──────────┐ │
│ │ ● Photosynthesis    ████ 92% │ │ Today:    5 cards due  │ │
│ │ ● Calvin Cycle      ███░ 68% │ │ Tomorrow: 3 cards due  │ │
│ │ ● ATP Synthase      ██░░ 45% │ │ This week: 12 total    │ │
│ │ ● Cell Respiration  █░░░ 23% │ │                        │ │
│ │ [▼ Show all 12 concepts]     │ │ Review rate: 85%       │ │
│ └──────────────────────────────┘ └────────────────────────┘ │
│                                                               │
│ ┌─ Weak Spots ─────────────────────────────────────────────┐ │
│ │ ⚠️ ATP Synthase — mastery decaying (last reviewed 18d ago) │
│ │    → Sandy suggests: Flashcard review (est. 8 min)       │ │
│ │ ⚠️ Cell Respiration — misconception detected:             │
│ │    "Confused aerobic/anaerobic conditions"                │ │
│ │    → Sandy suggests: Tutor mode with focus on [X]        │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─ Study Habits ───────────────┐ ┌─ Calibration ──────────┐ │
│ │ Sessions this week: 4        │ │ Accuracy: 76%          │ │
│ │ Avg session: 18 min          │ │ Calibration: 62%       │ │
│ │ Peak hour: 9 PM              │ │ Overconfident: 3 Qs    │ │
│ │ Most-used mode: Quiz         │ │ Underconfident: 1 Q    │ │
│ │ Streak: 5 days               │ │ [Trend: improving ↑]   │ │
│ └──────────────────────────────┘ └────────────────────────┘ │
│                                                               │
│ ┌─ Session History ────────────────────────────────────────┐ │
│ │ Today    Quiz Mode     12 min   Score: 4/5 (80%)        │ │
│ │ Yesterday Flashcards   8 min    15 cards reviewed        │ │
│ │ Mar 21   Teach-Back    22 min   Grade: B+ (accuracy 85%)│ │
│ │ Mar 20   Exam Prep     45 min   Pre: 60% → Post: 82%   │ │
│ └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### 7C. API Route: `GET /api/study/[toolId]/insights`

Aggregates from existing services:
- `getConceptMasteries(userId)` → concept bars with decay applied
- `getDueConcepts(userId, courseId)` → SR forecast
- `StudentProfile` → habits, peak hour, velocity
- `ToolSession` where toolType = STUDY_BUDDY → session history
- `FlashcardState` → review rate, due counts
- New: `getCalibrationStats(userId, courseId)` → from quiz log entries

---

## Phase 8: Concept Map Visualization

**Goal:** Visual representation of what the student knows and how concepts connect.

### 8A. Data Source

`graph-rag-service.ts` already builds `GraphEntity` + `GraphEdge` models with entity types and relationships. The concept map reads these and overlays the student's mastery:

```typescript
interface ConceptMapNode {
  id: string
  label: string
  mastery: number        // 0-1 from StudentConceptMastery (with decay)
  isStale: boolean       // from mastery-decay.ts
  isDue: boolean         // from sr-scheduler.ts
  bloomHighWater: number // from ConceptState
}

interface ConceptMapEdge {
  source: string
  target: string
  relationship: 'depends_on' | 'is_type_of' | 'contradicts' | 'precedes' | 'exemplifies'
}
```

### 8B. Visualization

Simple force-directed graph (lightweight — no heavy lib). Each node:
- **Color**: Green (mastered) → Yellow (partial) → Red (struggling) → Gray (not encountered)
- **Size**: Proportional to encounter count
- **Pulse animation**: On nodes that are due for SR review
- **Edge labels**: Relationship type on hover

Render with `<canvas>` or a minimal force layout. Not interactive (read-only visualization for now).

### 8C. Placement

- Tab on the insights screen
- Also shown in wrap-up when new concepts are touched (highlights what was added/strengthened)

---

## Phase 9: Voice Output (TTS)

**Goal:** Full voice conversation — students who learn better by listening get equal access.

### 9A. Wiring

`AUDIO_PERSONA_PRESETS` in `audio-experience.ts` already defines Sandy's voice. OpenAI TTS is in the stack.

**Flow:**
1. Student toggles "Voice mode" (speaker icon in chat header)
2. Each Sandy response → `POST /api/audio/tts` with response text
3. Server: OpenAI TTS (`tts-1`, voice: `nova`) → audio buffer
4. Client: Play audio via `<audio>` element, auto-advance when done
5. Voice input continues via existing `useSpeechRecognition`

### 9B. Smart TTS

Don't read everything — that's annoying. Smart rules:
- Read the main explanation, skip markdown formatting
- Don't read flashcard XML tags — read "Term: [X]. Definition: [Y]."
- Don't read hidden signals (`<!--QUIZ:...-->`)
- Don't read code blocks verbatim
- For quiz mode: read the question, pause for answer, then read feedback

### 9C. Speed Control

Playback speed toggle: 0.75x / 1x / 1.25x / 1.5x (via `HTMLAudioElement.playbackRate`)

---

## Phase 10: Accessibility

**Goal:** WCAG 2.1 AA compliance. Every student can use Study Buddy regardless of ability.

### 10A. Semantic HTML

Replace in StudyBuddyInterface:
- Mode cards: `<div>` → `<button role="radio">` in `<div role="radiogroup">`
- Chat messages: `<div>` → `<article>` with `aria-label="Sandy's response"` / `"Your message"`
- Flashcards: `<div>` → `<div role="region" aria-label="Flashcard">`
- Documents panel: `<div>` → `<aside aria-label="Study materials">`

### 10B. Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Navigate between mode cards, chat input, buttons |
| `Enter` / `Space` | Select mode, send message, flip flashcard |
| `Escape` | Close documents panel, cancel mode switch, dismiss banner |
| `Arrow Up/Down` | Navigate chat history (for screen readers) |
| `Ctrl+Enter` | Send message (already supported) |

### 10C. Screen Reader Support

- `aria-live="polite"` on chat message container (new messages announced)
- `aria-live="assertive"` on quiz score changes and error messages
- `role="status"` on loading indicators
- `role="alert"` on rate limit and upload error banners
- Hidden text for visual-only elements (quiz score dots, mastery colors)

### 10D. Dyslexia-Friendly Mode

Toggle in Study Buddy settings (gear icon):
- **Font**: Switch to OpenDyslexic (loaded via `@font-face`, only when toggled)
- **Line spacing**: `leading-relaxed` → `leading-loose` (1.75 → 2.0)
- **Letter spacing**: `tracking-wide`
- **Background tint**: Slight cream (`bg-amber-50/30`) — reduces contrast glare
- **Paragraph width**: Cap at `max-w-prose` (65ch) — shorter lines are easier to track

Persisted to `localStorage`: `study-buddy-a11y-dyslexia`

### 10E. High Contrast Mode

Toggle alongside dyslexia mode:
- All text: `text-black` on `bg-white` (no subtle grays)
- Borders: `border-2 border-black` (no light borders)
- Focus rings: `ring-4 ring-blue-600` (thick, visible)
- Buttons: High contrast fills (no subtle hover states)

---

## Phase 11: Real-Time Adaptation

**Goal:** Sandy adjusts mid-session based on learning observer signals.

### 11A. Observer Signal Consumption

The learning observer already fires every 3rd turn and writes to `LearnerObservationLog`. Currently, Study Buddy ignores these signals.

**New: Poll observer signals during session.**

After each Sandy response, check the latest observation:
```typescript
// In sendMessage(), after streaming completes:
if (messageCount % 3 === 0 && sessionId) {
  const obs = await fetch(`/api/study/${toolId}/observation?sessionId=${sessionId}`)
  // Returns latest LearnerObservationLog entry
}
```

### 11B. Adaptive Behaviors

| Signal | Threshold | Sandy's Adjustment |
|--------|-----------|-------------------|
| `frustrationScore > 0.7` | 2 consecutive readings | Insert encouragement. Simplify language. Offer hint button. |
| `cognitiveLoad > 0.8` | 1 reading | Break complex explanation into smaller pieces. Pause: "That was a lot. Want me to break it down?" |
| `bloomLevel drops` | From 4+ to ≤2 | Material got too hard. Step back: "Let me approach this differently." |
| `metacognitionScore < 0.3` | 2 readings | Add calibration prompts. "Before I tell you, what do you think the answer is?" |
| `reformulationCount > 2` | 1 reading | Student is going in circles. Change approach: "Let me try explaining this with an analogy." |
| `isProductiveStruggle = true` | 1 reading | Don't intervene — this is good! Sandy stays quiet or asks a guiding question. |

### 11C. Client-Side Indicators

Subtle, non-intrusive signals to the student:
- **Difficulty auto-adjust**: If cognitive load high for 2 turns, auto-shift difficulty bias to "easier" with a small toast: "I'm adjusting the pace."
- **Break suggestion**: After 25 minutes OR frustration escalation: "We've been going a while. 5-minute break?"
- **Mode suggestion**: After 3+ consecutive wrong quiz answers: "Want to switch to Tutor mode to review this topic first?"

---

## Phase 12: Pomodoro Integration

**Goal:** Structured study sessions with timed focus blocks and breaks.

### 12A. Pomodoro Timer

Optional toggle on chat screen header:

```
┌─ 🍅 Focus Timer ──────────┐
│ ████████████░░░░░ 18:42    │
│ Focus block 2/4 · 5min break next │
└────────────────────────────┘
```

**Settings (pre-session):**
- Focus duration: 25 / 30 / 45 / 60 min
- Break duration: 5 / 10 / 15 min
- Long break (every 4th): 15 / 20 / 30 min

**Behavior:**
- Timer counts down during chat
- At focus end: Sandy says "Great focus session! Take your break. I'll be here when you're back."
- Chat input disabled during break (gentle enforcement)
- At break end: Chime + "Ready to go again?"
- Session wrap-up shows total focus time vs. break time

---

## Implementation Plan — Build Order

### Sprint 1: Wire the Brain (Phases 1 + 11A)
**Files modified:** `StudyBuddyInterface.tsx`, new `useStudyBuddyContext.ts` hook, new `GET /api/study/[toolId]/context` route
**Files created:** None (all services exist)
**Impact:** Study Buddy becomes context-aware. Sandy knows your history. Biggest single improvement.

### Sprint 2: Spaced Repetition (Phase 2)
**Schema:** New `FlashcardState` model
**Files:** New `POST /api/study/[toolId]/flashcard-review`, modify flashcard UI in StudyBuddyInterface
**Impact:** Flashcards become 10x more effective. Evidence-based learning.

### Sprint 3: Error Taxonomy + Metacognition (Phases 4 + 5)
**Schema:** None (prompt engineering + client state)
**Files:** Modify `chat-service.ts` (prompts), `StudyBuddyInterface.tsx` (confidence UI, error parsing)
**Impact:** Smarter feedback. Students learn *why* they're wrong. Calibration training.

### Sprint 4: Pre-Exam Mode (Phase 3)
**Schema:** None (uses existing `StudyPlanLog`)
**Files:** New exam-prep state machine in StudyBuddyInterface, new `POST /api/study/[toolId]/exam-prep`
**Impact:** The killer feature. "I have an exam Friday" → optimal study plan.

### Sprint 5: Enhanced Modes + Elaborative Interrogation (Phase 6)
**Schema:** None (prompt engineering + signal parsing)
**Files:** Modify `chat-service.ts`, `StudyBuddyInterface.tsx`
**Impact:** Teach-back and debate become scored. All modes deepen retention.

### Sprint 6: Study Analytics Dashboard (Phase 7)
**Schema:** None (reads existing data)
**Files:** New insights screen in StudyBuddyInterface, new `GET /api/study/[toolId]/insights`
**Impact:** Students see their growth. Motivation + self-directed learning.

### Sprint 7: Concept Map + Voice Output (Phases 8 + 9)
**Schema:** None
**Files:** New ConceptMap component, TTS integration
**Impact:** Dual coding (visual + verbal). Accessibility for auditory learners.

### Sprint 8: Accessibility + Pomodoro (Phases 10 + 12)
**Schema:** None
**Files:** Modify StudyBuddyInterface (semantic HTML, ARIA, keyboard nav, dyslexia mode, timer)
**Impact:** WCAG compliance. Timed study. Polish.

### Sprint 9: Real-Time Adaptation (Phase 11B + 11C)
**Schema:** None (reads existing `LearnerObservationLog`)
**Files:** New observation polling, adaptive UI in StudyBuddyInterface
**Impact:** Sandy feels alive — adjusts to you in real-time.

---

## Schema Changes Summary

Only ONE new model needed:

```prisma
model FlashcardState {
  id             String   @id @default(cuid())
  userId         String
  courseId        String
  conceptSlug    String
  cardFront      String
  stabilityDays  Float    @default(1.0)
  nextReviewAt   DateTime @default(now())
  easeFactor     Float    @default(2.5)
  reviewCount    Int      @default(0)
  lastQuality    Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
  @@unique([userId, courseId, conceptSlug, cardFront])
  @@index([userId, courseId, nextReviewAt])
}
```

Everything else is wiring, prompts, and UI.

---

## New API Routes Summary

| Route | Method | Phase | Purpose |
|-------|--------|-------|---------|
| `/api/study/[toolId]/context` | GET | 1 | Load full student context for Study Buddy |
| `/api/study/[toolId]/flashcard-review` | POST | 2 | Record SR quality rating for a card |
| `/api/study/[toolId]/exam-prep` | POST | 3 | Generate exam prep study plan |
| `/api/study/[toolId]/insights` | GET | 7 | Aggregate analytics for dashboard |
| `/api/study/[toolId]/observation` | GET | 11 | Poll latest learning observer signals |

5 new routes. All thin handlers calling existing services.

---

## New Components Summary

| Component | Phase | Purpose |
|-----------|-------|---------|
| `useStudyBuddyContext.ts` | 1 | Hook: fetch + cache student context |
| `ConfidenceRating.tsx` | 4 | Inline confidence prompt (4 buttons) |
| `ExamPrepFlow.tsx` | 3 | Multi-step exam prep state machine |
| `StudyInsights.tsx` | 7 | Analytics dashboard screen |
| `ConceptMap.tsx` | 8 | Force-directed concept visualization |
| `PomodoroTimer.tsx` | 12 | Focus/break timer widget |

6 new components + 1 hook. Most work happens inside existing `StudyBuddyInterface.tsx`.

---

## Metrics — How We Know It's Working

| Metric | Baseline | Target | Source |
|--------|----------|--------|--------|
| Avg quiz accuracy (returning users) | ~65% (est.) | 80%+ | `quizScore` in session data |
| Concept retention at 7 days | Unknown | 75%+ | SR review success rate |
| Session-over-session improvement | Flat | Positive slope | `ToolSession.score` trend |
| Calibration accuracy | Unknown | 70%+ | Confidence vs. correctness correlation |
| SR review completion rate | N/A (new) | 80%+ daily | `FlashcardState` due vs. reviewed |
| Sessions per student per week | ~2 (est.) | 4+ | `ToolSession` counts |
| Exam prep pre→post improvement | N/A (new) | +20 points | Diagnostic vs. final check scores |
| Accessibility: keyboard-only completion | 0% | 100% | Manual testing |

---

## What This Does NOT Include (Deferred)

- **Collaborative Study Buddy** (multi-user sessions) — Year 2
- **Predictive struggle alerts** (proactive intervention before student falls behind) — needs more data
- **Bayesian Knowledge Tracing** (probabilistic overlay on SM-2) — overkill for current scale
- **Multi-modal generation** (Sandy creates diagrams, not just text) — needs image generation API
- **Peer learning analytics** (anonymized cohort comparisons) — FERPA complexity
- **Mobile-first redesign** — deferred per build sequence
- **Gamification** (XP, badges, leaderboards) — **DO NOT REBUILD per CLAUDE.md**

---

## Design Principles

1. **Sandy drives, student steers.** Sandy suggests modes, topics, and pacing. Student always has override.
2. **Every session makes the next one smarter.** The learner model grows. Sandy never asks what she already knows.
3. **Desirable difficulty, not frustration.** Push into the zone of proximal development. Back off before frustration.
4. **Show the work.** Students see their mastery, their gaps, their growth. Transparency builds trust.
5. **Accessibility is not a feature — it's the floor.** Keyboard, screen reader, dyslexia, high contrast. All modes, all the time.
6. **Measure everything, show only what matters.** Collect rich signals (observer, calibration, error taxonomy). Show students simple, actionable insights.
