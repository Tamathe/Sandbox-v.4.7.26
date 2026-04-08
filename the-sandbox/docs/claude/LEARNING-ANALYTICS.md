# Learning Analytics — Claude Code Reference

> **This file is a Claude Code reference doc**, extracted from the main CLAUDE.md to reduce context window usage. Canonical source: `the-sandbox/CLAUDE.md`.

---

## Study Buddy v2 (9/9 Sprints Complete)

AI-powered tutoring system with 7 study modes, persistent learner model, and real-time adaptation. Architecture doc: `ARCHITECTURE-STUDY-BUDDY-V2.md`.

### Landing & UI

- **Landing page**: `app/study/page.tsx` — dedicated `/study` hub with mode picker (7 modes), course picker (from enrollments), feature highlights. Header nav link (STUDENT), quick link (all roles), featured hero on Explore, first swim lane for STUDENT
- **Component**: `app/components/StudyBuddyInterface.tsx` — 4 screens (select, chat, wrapup, insights)
- **Sub-components**: `app/components/study-buddy/ConceptMap.tsx`, `PomodoroTimer.tsx`
- **Hook**: `app/hooks/useStudyBuddyContext.ts` — fetches learner model on mount

### Schema

`FlashcardState` model (SM-2 spaced repetition per card)

### 7 Study Modes

Tutor, Quiz, Flashcards, Socratic, Teach-Back, Debate, Essay Coach

### API Routes (8 under `/api/study/[toolId]/`)

`context`, `observation`, `flashcard-review`, `flashcard-stats`, `exam-prep`, `insights`, `concept-map`, plus existing `sessions`/`upload`/`documents`

### Learner Model

Wires existing `student-context-api.ts`, `episodic-memory-service.ts`, `sr-scheduler.ts`, `concept-mastery-service.ts`, `learning-observer.ts` into Study Buddy's system prompt and UI.

### Spaced Repetition

SM-2 algorithm on flashcards (Again/Good/Easy buttons), SR dashboard widget, due-card scheduling.

### Error Taxonomy (5 categories)

misconception, knowledge-gap, careless, transfer-failure, partial — with `<!--ERROR:type|description-->` signals

### Metacognitive Calibration

Confidence rating before quiz answers, calibration tracking in wrap-up.

### Pre-Exam Mode (6 phases)

intake -> diagnostic -> plan -> execution -> final-check -> results — with `examPrepPhase`/`examPrepContext` in ChatRequestSchema

### Enhanced Modes

- Teach-back scoring rubric (4 dimensions -> letter grade)
- Debate scoring rubric
- Elaborative interrogation in all modes

### Analytics Dashboard

Mastery trend chart (recharts), concept bars, SR forecast, study habits, session history, concept map.

### Voice Output

TTS via `AudioPlayerProvider` + `/api/audio/synthesize`, smart text cleaning, speed control (0.75x-1.5x).

### Accessibility

`role="radiogroup"` on modes, `<article>` messages, `role="log"` + `aria-live="polite"` on chat, `role="alert"` on rate limit, dyslexia mode (wider spacing + cream tint, persisted to localStorage).

### Pomodoro

4x25min focus / 5min break / 15min long break, Sandy messages at phase transitions.

### Real-Time Adaptation

Observer polling every 2nd turn, 7 adaptive behaviors (frustration escalation, cognitive overload, bloom drop/jump, low metacognition, reformulation loops, break suggestion), color-coded hint banners, mid-session mode suggestion.

---

## Engagement Fingerprint Engine (6/6 Phases)

Per-user learner profile computed from session, flashcard, mastery, social, and responsiveness signals. Aggregated per-course for faculty. Blueprint: `Blueprints/ENGAGEMENT-FINGERPRINT-ENGINE.md`.

### Schema

- `EngagementFingerprint` (per user)
- `CourseFingerprint` (per course)

### Services (12 in `app/lib/fingerprint/`)

`types.ts`, `data-fetchers.ts` (14 Prisma wrappers), `temporal.ts`, `learning.ts`, `engagement.ts`, `social.ts`, `responsiveness.ts` (5 pure computation modules), `fingerprint-engine.ts` (orchestrator), `fingerprint-service.ts` (cache/refresh/aggregate), `sandy-context.ts` (`<learner-profile>` XML for Sandy), `hub-personalization.ts` (tool affinity scoring), `notification-timing.ts` (peak-hour nudge gating)

### API (5 routes under `/api/fingerprint/`)

`me` (GET student profile), `course/[courseId]` (GET class aggregate), `refresh` (POST recompute), `sandy-context` (GET prompt block), `optimal-timing` (GET peak hours)

### Cron

`POST /api/cron/fingerprint-refresh` — nightly batch refresh of all user + course fingerprints

### Sandy Integration

Fingerprint block injected into `concierge-service.ts` + `chat-service.ts` system prompts. SR nudge gated by `isWithinPeakWindow()`. 2 Sandy agent tools: `get_learner_profile`, `get_class_profile` in `fingerprint-tools.ts`.

### Hub Personalization

`personalizeCollectionOrder()` reorders tools within collections by modality/mode/collab/cadence affinity. Wired into `/api/hub/personalized`.

### Student UI

`LearningProfileCard.tsx` on homepage (6-tile grid: chronotype, cadence, velocity, social, deadline, study modes + confidence meter).

### Faculty UI

`ClassFingerprintPanel.tsx` on analytics page "Class Profile" tab (recharts bar charts, social breakdown, risk badges, stat cards, engagement trend). FERPA-safe — distributions only, no individual students.

### Confidence Gates

Profile suppressed if confidence < 0.2 (Sandy) or < 0.3 (hub/timing). Peak window returns true (permissive) when no data available.

---

## Student Success Early Warning (6/6 Phases)

Per-student success prediction system. Distinct from Campus Pulse (institutional crises). Blueprint: `Blueprints/STUDENT-SUCCESS-EARLY-WARNING.md`.

### Schema (5 enums + 5 models)

- **Enums**: `SuccessSignalType`, `SuccessAlertSeverity`, `AlertRouteTarget`, `InterventionType`, `InterventionOutcome`
- **Models**: `StudentSuccessScore` (composite 0-100 per student per course), `SuccessAlert` (routed alerts with pattern classification), `SuccessIntervention` (outcome-tracked actions), `SuccessScoreHistory` (daily snapshots, 120-day retention), `SuccessAlertPreference` (per-instructor notification prefs)

### 10 Signal Collectors

In `app/lib/success/signal-collectors.ts`: login frequency, assignment submission patterns, Sandy usage decay, study session cadence, concept mastery slope, Commons participation, flashcard consistency, grade trends, tool engagement, content access.

### Services (6 in `app/lib/success/`)

`types.ts`, `signal-collectors.ts`, `score-engine.ts` (composite + trajectory + inflection detection + pattern classification), `alert-service.ts` (generate/route/manage alerts, record interventions, evaluate outcomes), `nudge-service.ts` (gentle, never shame-based nudges), `success-service.ts` (batch compute, heatmap, Sandy context, briefing injection), `weight-personalizer.ts` (fingerprint-based signal weight personalization)

### API (13 routes + 2 cron)

Under `/api/success/`: score (GET), course heatmap/alerts/students (GET), alert acknowledge/intervene/dismiss (POST), history (GET), preferences (GET/PUT), interventions (GET), nudge (GET)

- `cron/success-scores` (POST nightly batch)
- `cron/intervention-outcomes` (POST weekly)

### Components (15 in `app/components/success/`)

`FacultyRiskDashboard`, `CourseRiskHeatmap`, `StudentRiskTable`, `StudentRiskRow`, `AlertPanel`, `AlertCard`, `InterventionForm`, `InterventionTimeline`, `SuccessScoreChart`, `SignalBreakdown`, `TrajectoryBadge`, `SeverityBadge`, `BulkOutreachModal`, `AlertPreferences`, `StudentSuccessWidget`

### Pages (3)

- `/analytics/success` (faculty dashboard)
- `/analytics/success/[courseId]/[userId]` (student detail)
- `/analytics/success/alerts` (cross-course alert inbox)

### Sandy Tools (4 in `app/lib/agent/tools/success-tools.ts`)

`get_student_success_score`, `get_course_risk_summary`, `get_intervention_effectiveness`, `suggest_intervention`. Registered in `tool-registry.ts`.

### FERPA Rules

Faculty only see own courses. Advisors only see assigned advisees. Sandy never tells students their score — only provides gentle, actionable support.

### Patent (5 claims)

Multi-signal prediction with personalized baseline, trajectory inflection detection, pattern-classified alert routing, non-punitive AI intervention, closed-loop outcome tracking.
