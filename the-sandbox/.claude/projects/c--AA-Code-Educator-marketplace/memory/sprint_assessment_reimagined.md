---
name: Assessment Reimagined
description: Seven-phase multi-modal assessment system spanning evidence, process, commons assessment, competency portfolio, mastery gates, authentic audience assessment, and the faculty assessment canvas
type: project
---

**Assessment Reimagined** - 7 phases, capstone blueprint: `Blueprints/ASSESSMENT-REIMAGINED.md`.

**Why:** Move the platform beyond single-artifact grading into a multi-modal assessment system that can score evidence, process, judgment, teaching, authentic impact, and adaptive mastery.

**Status:** The repo now has all 7 phases represented across `app/lib/assessment/`, `app/components/assessment/`, `app/api/assessment/`, `app/assessment/`, and `app/courses/[id]/assessment-canvas/`. There is no Phase 8 in this blueprint.

**Phase map**
- Phase 1 - Evidence Layer: `evidence-service.ts`, shared assessment types, evidence linking UI in `AssessmentEvidencePanel.tsx`
- Phase 2 - Process Assessment: `process-scoring-service.ts`, `ProcessAnnotator.tsx`, `ProcessReviewView.tsx`
- Phase 3 - Commons Assessment: `divergence-service.ts`, `teachback-assessment-service.ts`, `cross-exam-scoring-service.ts`, `commons-assessment-service.ts`, `DivergenceTree.tsx`, `DivergenceReviewView.tsx`, `TeachbackAssessmentOverlay.tsx`, `CrossExamScorecard.tsx`
- Phase 4 - Competency Portfolio: `competency-portfolio-service.ts`, `CompetencyDashboard.tsx`, `CompetencyFacultyView.tsx`, student portfolio page under `app/assessment/portfolio/`
- Phase 5 - Mastery Gates: `mastery-gate-service.ts`, `MasteryGateDesigner.tsx`, `MasteryGatePanel.tsx`, student progression page under `app/assessment/mastery/[courseId]/`
- Phase 6 - Authentic Audience Assessment: `authentic-assessment-service.ts`, `AuthenticMetricsCard.tsx`
- Phase 7 - Faculty Assessment Canvas: `assessment-canvas.ts`, `assessment-canvas-service.ts`, `AssessmentCanvasDesigner.tsx`, faculty page `app/courses/[id]/assessment-canvas/page.tsx`

**Key implementation decisions**
- `Assignment.assessmentMode` remains the compatibility field for legacy assignment, grading, and student flows. For canvas-backed assignments it is synced to the highest-weight enabled mode.
- `Assignment.assessmentConfig` may contain either legacy mode-specific JSON or the Phase 7 canvas config. Prefer `resolveCanvasConfigFromAssignment()` and `extractAssessmentModeConfig()` over reading raw JSON directly.
- `evidenceTypes` are derived from enabled canvas modes. `processWeight` is derived from the PROCESS slice when enabled.
- Services that need mode-specific config inside mixed-mode assignments should use the canvas helpers so legacy single-mode assignments and canvas-backed assignments both work.

**Current caution**
- The canvas now supports design, persistence, instructions, and compatibility syncing, but most downstream student/grading experiences still fundamentally behave like a single-primary-mode system. Expand runtime multi-mode behavior carefully.
