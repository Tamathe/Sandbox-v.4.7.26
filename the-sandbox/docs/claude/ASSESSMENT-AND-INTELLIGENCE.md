# Assessment & Intelligence Systems — Claude Code Reference

> **This file is a Claude Code reference doc**, extracted from the main CLAUDE.md to reduce context window usage. Canonical source: `the-sandbox/CLAUDE.md`.

---

## Assessment Reimagined (7 Phases)

Assessment operating system spanning evidence, process, commons performance, portfolio mastery, authentic audience impact, and faculty design tooling. Blueprint: `Blueprints/ASSESSMENT-REIMAGINED.md`.

### Core Directories

- `app/lib/assessment/`
- `app/components/assessment/`
- `app/api/assessment/`
- `app/assessment/`
- `app/courses/[id]/assessment-canvas/`

### 7 Phases

| Phase | Name | Key Files |
|-------|------|-----------|
| 1 | Evidence Layer | `evidence-service.ts`, `AssessmentEvidencePanel.tsx`, shared evidence typing in `types.ts` |
| 2 | Process Assessment | `process-scoring-service.ts`, `ProcessAnnotator.tsx`, `ProcessReviewView.tsx` |
| 3 | Commons Assessment | `divergence-service.ts`, `teachback-assessment-service.ts`, `cross-exam-scoring-service.ts`, `commons-assessment-service.ts`, `DivergenceTree.tsx`, `DivergenceReviewView.tsx`, `TeachbackAssessmentOverlay.tsx`, `CrossExamScorecard.tsx` |
| 4 | Competency Portfolio | `competency-portfolio-service.ts`, `CompetencyDashboard.tsx`, `CompetencyFacultyView.tsx`, student portfolio page at `/assessment/portfolio` |
| 5 | Mastery Gates | `mastery-gate-service.ts`, `MasteryGateDesigner.tsx`, `MasteryGatePanel.tsx`, student progression page at `/assessment/mastery/[courseId]` |
| 6 | Authentic Audience Assessment | `authentic-assessment-service.ts`, `AuthenticMetricsCard.tsx` |
| 7 | Faculty Assessment Canvas | `assessment-canvas.ts`, `assessment-canvas-service.ts`, `AssessmentCanvasDesigner.tsx`, faculty page at `/courses/[id]/assessment-canvas` |

### Compatibility / Config / Sync Rules

- **Compatibility rule**: `Assignment.assessmentMode` must stay populated for legacy flows. For canvas-backed assignments it is synced to the highest-weight enabled mode.
- **Config rule**: `Assignment.assessmentConfig` may now be either legacy mode-specific JSON or a Phase 7 canvas config. Use `resolveCanvasConfigFromAssignment()`, `assignmentSupportsAssessmentMode()`, and `extractAssessmentModeConfig()` instead of assuming raw single-mode JSON.
- **Sync rule**: `evidenceTypes` must be derived from enabled canvas modes and `processWeight` must track the PROCESS mode weight when enabled.
- **Hub lane**: EDUCATOR and ADMIN have an Assessment swim lane with Assessment Canvas, Mastery Gates, and Competency Dashboard.
- **Scope note**: This blueprint has 7 phases only. There is no Phase 8 for Assessment Reimagined.

---

## Classroom Intelligence Loop (5 Phases)

Closed-loop system: concept difficulty detection -> insight cards -> intervention recommendations -> outcome tracking -> weekly Teaching Pulse. Blueprint: `Blueprints/CLASSROOM-INTELLIGENCE-LOOP.md`.

### Schema (3 enums + 6 models)

- **Enums**: `ConceptDifficultyLevel`, `InsightCardType`, `InterventionApproach`
- **Models**: `ConceptDifficultySnapshot` (per-concept per-course difficulty analysis), `InstructorInsightCard` (actionable intelligence cards), `TeachingIntervention` (recorded teaching adjustments with pre/post metrics), `TeachingPulse` (weekly aggregated report), `CrossSectionComparison` (anonymized section comparisons), `TeachingEffectivenessSignal` (per-concept teaching effectiveness)

### Services (7 in `app/lib/classroom-intelligence/`)

`types.ts`, `concept-difficulty-engine.ts` (multi-signal difficulty computation from mastery, Sandy, flashcards), `insight-generator.ts` (4 card types with AI-suggested interventions), `intervention-tracker.ts` (record + measure outcomes after 7+ days), `weekly-pulse.ts` (Haiku narrative + concept heatmap), `cross-section-service.ts` (anonymized section comparison), `classroom-intelligence-service.ts` (orchestrator + Sandy context)

### API (12 routes)

Under `/api/classroom-intelligence/`: concepts/[courseId], insights (list/[id]/view/[id]/respond), interventions (list+create/[id]), effectiveness, pulse/[courseId], cross-section/[courseCode], teaching-signals/[courseId]

**2 cron routes**: `cron/classroom-intelligence` (weekly pulse), `cron/classroom-intervention-outcomes` (outcome measurement)

### Components (15 in `app/components/classroom-intelligence/`)

`ConceptHeatmap` (color-coded grid), `ConceptDetailPanel` (slide-out detail), `InsightCardList`/`InsightCard`/`InsightResponseForm` (insight card system), `InterventionTimeline`/`InterventionForm` (intervention tracking), `EffectivenessChart` (recharts bar chart), `WeeklyPulseView`/`PulseHistoryChart` (pulse reports), `CrossSectionTable`/`CrossSectionDetail` (section comparison), `TeachingIntelligenceDashboard` (main assembly), `MiniInsightBanner` (homepage widget), `SandyPulseChip` (starter chip)

### Pages (4)

- `/analytics/teaching` (dashboard)
- `/analytics/teaching/[courseId]/concept/[concept]` (concept deep dive)
- `/analytics/teaching/interventions` (intervention lab)
- `/analytics/teaching/cross-section` (cross-section insights)

Added to AnalyticsSubNav as "Teaching Intelligence" tab.

### Sandy Tools (5 in `classroom-intelligence-tools.ts`)

`get_concept_difficulty`, `get_teaching_insights`, `get_weekly_pulse`, `get_teaching_intervention_effectiveness`, `log_teaching_intervention`. Registered in `tool-registry.ts`.

### Proactive Nudges (3)

- `classroom-intel-unread-insights` (priority 7)
- `classroom-intel-critical-concept` (priority 9)
- `classroom-intel-intervention-result` (priority 5)

### Privacy

Class-level aggregates only (no individual student data surfaced). Cross-section data anonymized. Sandy question analysis is aggregate. FERPA-safe.

---

## Accreditation Autopilot

Automated accreditation readiness system. Evidence harvesting, gap detection, narrative generation, peer-review preparation. Blueprint: `Blueprints/ACCREDITATION-AUTOPILOT.md`.

### Schema (27 models/enums)

- **Enums**: `AccreditationBody`, `EvidenceQuality`, `NarrativeStatus`, `AccreditationCyclePhase`
- **Models**: `AccreditationStandard`, `AccreditationCycle`, `EvidenceItem`, `ComplianceNarrative`, `AccreditationReadinessSnapshot`, and related models

### Services (8 in `app/lib/accreditation/`)

`types.ts`, `standards-registry.ts` (standard definitions per body), `evidence-harvester.ts` (12 harvest functions across platform data), `gap-detector.ts` (evidence gap analysis per standard), `quality-scorer.ts` (evidence quality assessment), `narrative-generator.ts` (AI-powered compliance narratives), `peer-review-prep.ts` (mock site-visit preparation), `dashboard-service.ts` (readiness scoring + trend analysis)

### API (12 routes under `/api/accreditation/`)

cycle, dashboard, evidence (list+upload), gaps (list+detail), narrative (get/generate/review per standard), peer-review-prep, standards (list+detail)

### Components (16 in `app/components/accreditation/`)

`AccreditationDashboard`, `ComplianceTrendChart`, `CycleTimeline`, `EvidenceTable`, `EvidenceUploadModal`, `GapDetailCard`, `GapList`, `HarvestStatusBanner`, `NarrativeEditor`, `NarrativeVersionHistory`, `PeerReviewPrepPanel`, `ProgramRollupTable`, `ReadinessGauge`, `StandardCard`, `StandardDetailPanel`, `StandardsGrid`

### Pages (6)

- `/accreditation` (dashboard)
- `/accreditation/evidence`
- `/accreditation/narratives`
- `/accreditation/peer-review`
- `/accreditation/programs`
- `/accreditation/standard/[id]`

### Sandy Tools (4 in `accreditation-tools.ts`)

`get_accreditation_readiness`, `get_compliance_gaps`, `generate_compliance_narrative`, `simulate_peer_review`

### Patent

Closed loop between daily classroom practice and institutional accreditation compliance.

---

## Faculty Course Intelligence (7/7 Phases)

Narrative-first analytics with three layers on a single page at `/analytics/faculty-intelligence`. Architecture: Morning Briefing -> Assignment Scorecard -> Action Panel.

### Schema

- `FacultyBriefing` (24h rolling window, stale flag)
- `RubricBreakdown` (per-submission dimensional AI scoring, 1:1 with Submission)

### Services (4 in `app/lib/analytics/`)

- `briefing.ts` (Haiku narrative generation)
- `rubric-breakdown-service.ts` (3 exports: generate, scorecard, backfill)
- `action-panel-service.ts` (4 sources -> sorted ActionItem[])

### API (5 routes under `/api/analytics/faculty-intelligence/`)

briefing (GET/POST refresh), scorecard (GET/POST backfill), actions (GET). All `requireEducatorUser`.

### Cron (2 jobs)

- `POST /api/cron/faculty-briefing` (daily refresh, skips fresh <24h, concurrency 3)
- `POST /api/cron/rubric-backfill` (backfills missing breakdowns for graded submissions)

### Sandy Tool

`get_faculty_intelligence` in `analytics-tools.ts` — combined briefing + actions + scorecard. Gives Sandy course intelligence awareness on any page.

### Frontend

- Page: `app/analytics/faculty-intelligence/page.tsx` — three-panel layout with course selector, loading skeletons, empty states
- Hook: `useFacultyIntelligence.ts`
- Nav: AnalyticsSubNav tab (EDUCATOR + ADMIN). Sandy starter chips on page. PAGE_DESCRIPTIONS updated

### Post-scoring Cascade

`grading-service.ts` fires `generateRubricBreakdown(submissionId)` non-blocking after AI scoring.
