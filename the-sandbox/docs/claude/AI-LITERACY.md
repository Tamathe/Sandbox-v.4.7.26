# AI Literacy & Training Hub — Claude Code Reference

> **This file is a Claude Code reference doc**, extracted from the main CLAUDE.md to reduce context window usage. Canonical source: `the-sandbox/CLAUDE.md`.

---

## Overview

Survey-driven faculty and student training ecosystem at `/ai-literacy`. Built from Spring 2026 DUS survey of 51 Directors of Undergraduate Studies. Architecture doc: `Blueprints/AI-LITERACY-TRAINING-HUB.md`.

- **Hub Landing**: `/ai-literacy` — role-adaptive with Quick Start wizard for first-time educators, "Guide Me" (Sandy coach) / "I'll Browse" two-tier entry, 4 module rows (Start Here, Accelerators, AI Skills Training, Learn & Reflect), admin-only cards (Pulse, Cohort)
- **Nav**: "AI Literacy" in Header.tsx for all roles

---

## Schema

`AILiteracyProfile` (+ `quickStartCompleted`, `quickStartStep`), `StanceHistory`, `CourseAIPolicy` (+ `fromStarterPack`, `fromSyllabusDrop`), `CaseStudySubmission`, `ClarityCheckResponse`, `DepartmentAICampaign`, `StarterPackAdoption`, `PromptLabAttempt`, `PromptLabSandboxEntry`, `OutputEvalAttempt`, `StudentLiteracyProfile` (4 dimensions: practicalSkill, communication, skepticism, judgment), `JudgmentCallScenario`, `JudgmentCallAttempt`, `StudyCoachSession` models

Enums: `AIStance`, `DisciplineFamily`, `CaseStudyStatus`, `CampaignStatus`, `JudgmentCategory`, `ScenarioDifficulty`

---

## 10 Core Modules

| # | Module | Route | Key Files |
|---|--------|-------|-----------|
| 8 | Stance Navigator | `/ai-literacy/stance` | `stance-service.ts`, 7 components in `ai-literacy/` |
| 2 | Policy Framework Builder | `/ai-literacy/policy` | `policy-builder-service.ts`, PolicyWizard (4-step), AssignmentLevelMatrix, PolicyPreview, PolicyGapDashboard |
| 1 | Assignment Redesign Studio | `/ai-literacy/assignments` | `assignment-redesign-service.ts` (Haiku-powered scan + heuristic fallback), 6 redesign templates, VulnerabilityReport, rescan with before/after comparison (ScanComparison) |
| 3 | Process-Based Assessment | `/ai-literacy/process` | `process-assessment-service.ts`, 4 checkpoint templates |
| 4 | Student AI Literacy | `/ai-literacy/student` | 5 interactive modules + 4 content lessons (see Student AI Literacy Experience below) |
| 5 | Faculty Pedagogy Hub | `/ai-literacy/pedagogy` | `pedagogy-hub-service.ts`, 5 static + community-submitted case studies (CaseStudySubmitForm), training resources |
| 6 | Discipline Identity Workshop | `/ai-literacy/discipline` | 5 guided reflections, peer voices, commitment statement builder |
| 7 | AI-Assisted Advising | `/ai-literacy/advising` | 5 scenario-based conversation frameworks + "Practice with Sandy" roleplay at `/ai-literacy/advising/practice` |
| 9 | Prompt Lab | `/ai-literacy/prompt-lab` | `prompt-lab-service.ts`, `prompt-lab-constants.ts` (5 levels, 25 challenges), 4 components (LevelNav, Challenge, Sandbox, Progress), side-by-side prompt comparison with Sonnet scoring (4 dimensions), free-form sandbox with Sandy tips |
| 10 | Output Evaluator | `/ai-literacy/output-eval` | `output-eval-service.ts`, `output-eval-constants.ts` (3 tiers, 15 seeded scenarios), 4 components (TierNav, Scenario, Results, Progress), text highlighting UX for error detection, fuzzy span matching + Haiku justification scoring, AI-generated novel scenarios |

---

## 14 Optimizations

| # | Feature | Route/File | What it does |
|---|---------|------------|--------------|
| 1 | Quick Start Flow | Hub landing + `/api/ai-literacy/quick-start` | 3-phase wizard (Stance->Policy->Scan) for first-time faculty, ~15 min |
| 2 | Sandy as Entry Point | `proactive-suggestions.ts` + 2 new nudge signals | Sandy proactively drives faculty to hub modules |
| 3 | Department Campaigns | `/api/ai-literacy/campaigns` + CampaignProgressBar | DUS sets coverage target + deadline, progress bar on storefront |
| 4 | Living Case Studies | `/api/ai-literacy/case-studies` + CaseStudySubmitForm | Faculty submit anonymized cases, admin approves, merged into Pedagogy Hub |
| 5 | Assignment Rescan | Assignments page + ScanComparison component | Before/after AI-completability scores after redesign |
| 6 | Discipline Starter Packs | `/ai-literacy/starter-packs` + `starter-packs-service.ts` | 6 pre-built bundles (STEM, Humanities, Social Sci, Arts, Professional, Health Sci), one-click adopt |
| 7 | Campus AI Pulse | `/ai-literacy/pulse` + `campus-pulse-service.ts` | KPIs, stance distribution, department breakdown, month-over-month trends |
| 8 | Stance Drift Tracking | StanceDriftChart + `stance-drift-service.ts` | Visualizes how faculty stances evolve over time (alluvial-style) |
| 9 | Student Clarity Check | ClarityCheck component + `/api/ai-literacy/clarity-check` | Haiku-generated quiz after viewing course AI expectations, feedback to faculty |
| 10 | Grading Queue Integration | `suggest_assignment_redesign_from_grading` Sandy tool | Sandy offers redesign when faculty flags suspicious AI during grading |
| 11 | Syllabus Drop | `/ai-literacy/syllabus-drop` + `syllabus-drop-service.ts` | Paste syllabus -> extract assignments -> bulk scan -> generate complete policy |
| 12 | Advising Roleplay | `/ai-literacy/advising/practice` + `start_advising_practice` tool | Sandy roleplays student in 5 advising scenarios, gives coaching feedback |
| 13 | Self-Service + Sandy Tiers | Hub landing two-tier entry | "Guide Me" (Sandy coaching) vs "I'll Browse" (self-service module grid) |
| 14 | Cohort Rollout | `/ai-literacy/cohort` + `/api/ai-literacy/cohort` | Admin tracks adoption by college, plans structured onboarding |

---

## Sandy Tools (25)

In `app/lib/agent/tools/ai-literacy-tools.ts`:

- **13 faculty tools**: `get_stance_profile`, `start_stance_assessment`, `get_stance_distribution`, `analyze_assignment_ai_risk`, `generate_ai_policy`, `ai_literacy_coach`, `get_campus_ai_pulse`, `suggest_assignment_redesign_from_grading`, `start_advising_practice`, `get_prompt_lab_progress`, `get_output_eval_progress`, `suggest_prompt_lab_challenge`, `get_output_eval_scenario`
- **6 student tools**: `get_student_ai_policies`, `check_assignment_ai_policy`, `get_student_literacy_profile`, `suggest_ai_strategy_for_course`, `start_study_coach_session`, `get_student_module_recommendations`
- **3 shared profile tools**: `get_progressive_profile`, `recalculate_profile`
- **3 starter pack tools**: `build_starter_pack`, `get_pack_status`, `suggest_next_assignment`

---

## Proactive Nudges (4)

In `proactive-suggestions.ts`:
- `ai-policy-gap` (priority 7) — faculty
- `no-stance` (priority 6) — faculty
- `student-policies-unreviewed` (priority 7) — students
- `student-literacy-gap` (priority 5) — students

---

## Services (21 total)

- **Original 6** in `app/lib/`: `stance-service.ts`, `policy-builder-service.ts`, `assignment-redesign-service.ts`, `process-assessment-service.ts`, `student-ai-literacy-service.ts`, `pedagogy-hub-service.ts`
- **8 faculty** in `app/lib/ai-literacy/`: `campus-pulse-service.ts`, `stance-drift-service.ts`, `starter-packs-service.ts`, `campaign-service.ts`, `case-study-service.ts`, `clarity-check-service.ts`, `syllabus-drop-service.ts`, `coaching-service.ts`
- **7 student** in `app/lib/ai-literacy/`: `student-policies-service.ts`, `student-literacy-profile-service.ts`, `student-onboarding-service.ts`, `student-prompt-craft-service.ts`, `student-output-detective-service.ts`, `student-progress-service.ts`, `study-coach-service.ts`

---

## API Routes (20 directories)

Under `app/api/ai-literacy/`: `stance/{route,distribution,history,course-impact}`, `policy/{route,[courseId]}`, `assignments/scan`, `modules`, `quick-start`, `campaigns`, `case-studies`, `starter-packs`, `pulse`, `clarity-check`, `syllabus-drop`, `cohort`, `student/{onboarding,policies,profile,progress,judgment-calls,study-coach}`

---

## Components (24)

In `app/components/ai-literacy/`: StanceAssessment, StanceSpectrum, StanceDetailCard, StanceResult, StanceTimeline, CourseImpactPreview, PeerDistribution, PolicyWizard, AssignmentLevelMatrix, PolicyPreview, PolicyGapDashboard, AssignmentScanner, VulnerabilityReport, RedesignTemplates, QuickStartWizard, CampaignProgressBar, CaseStudySubmitForm, ScanComparison, StarterPackCard, ClarityCheck, StanceDriftChart, PathwayNav

---

## Pages (23)

In `app/(pages)/ai-literacy/`: hub landing, stance, policy, assignments, process, student (hub + 5 module pages: policies, judgment-calls, prompt-craft, output-detective, study-coach + 4 lesson pages: responsible-use, when-not-to-use, citing-ai, critical-evaluation), pedagogy, discipline, advising, advising/practice, starter-packs, pulse, syllabus-drop, cohort

---

## PathwayNav

`app/components/ai-literacy/PathwayNav.tsx` — Module-to-module navigation bar at the bottom of every AI Literacy module page. Auto-detects educator (10-step) vs student (5-step) pathway from URL.

- Shows clickable step dots, "Module X of Y" label, prev/next links with module names, center "All Modules" hub link
- **Educator pathway** (10 steps): Stance -> Policy -> Assignments -> Syllabus Drop -> Process -> Prompt Lab -> Output Eval -> Pedagogy -> Discipline -> Advising
- **Student pathway** (5 steps): Policies -> Judgment Calls -> Prompt Craft -> Output Detective -> Study Coach
- Added to all 15 module pages (10 educator + 5 student)

---

## Student AI Literacy Experience (8/8 Phases Complete)

Full student-facing AI Literacy system at `/ai-literacy/student`. Blueprint: `Blueprints/STUDENT-AI-LITERACY-EXPERIENCE.md`. Transforms the original 4 static lessons into a 5-module interactive system with onboarding, progressive profile, branching scenarios, discipline-aware content, and Sandy integration.

### 5 Interactive Modules

| # | Module | Route | Key Files |
|---|--------|-------|-----------|
| 1 | My AI Policies | `/ai-literacy/student/policies` | `student-policies-service.ts`, ClarityCheck (Haiku quiz per course policy) |
| 2 | Judgment Calls | `/ai-literacy/student/judgment-calls` | `judgment-calls-service.ts`, 12 branching decision scenarios, 4 categories (Ethics, Citation, Boundaries, Responsible Use) |
| 3 | Prompt Craft | `/ai-literacy/student/prompt-craft` | `student-prompt-craft-service.ts`, 18 student-contextualized challenges across 5 levels |
| 4 | Output Detective | `/ai-literacy/student/output-detective` | `student-output-detective-service.ts`, 18 student-contextualized scenarios across 3 tiers |
| 5 | AI Study Coach | `/ai-literacy/student/study-coach` | `study-coach-service.ts`, streaming Haiku sessions with 4-dimension technique scoring |

- **Student Profile**: `StudentLiteracyProfile` — 4 dimensions (Practical Skill, Communication, Skepticism, Judgment), materializes at 2+ modules completed, readiness bands (Getting Started -> AI Ready)
- **Onboarding**: 4-question Quick Start in `student-onboarding-service.ts` (year, prior AI use, biggest question, comfort level)
- **Progress Service**: `student-progress-service.ts` — per-module status (not-started / in-progress / completed) based on DB attempt counts
- **Hub Page**: Two sections — "Modules" (5 interactive with status badges) and "Lessons" (4 content). Fire-and-forget profile recalculation on load
- **Sandy Tools** (6): `get_student_ai_policies`, `check_assignment_ai_policy`, `get_student_literacy_profile`, `suggest_ai_strategy_for_course`, `start_study_coach_session`, `get_student_module_recommendations`
- **Proactive Nudges** (2): `student-policies-unreviewed` (priority 7), `student-literacy-gap` (priority 5) — student role only
