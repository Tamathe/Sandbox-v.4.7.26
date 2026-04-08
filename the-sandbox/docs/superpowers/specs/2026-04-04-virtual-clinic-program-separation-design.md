# Virtual Clinic: DNP / COM Program Separation

**Date:** 2026-04-04
**Status:** Approved
**Approach:** Program Config Registry (Approach A)

## Problem

DNP (Doctor of Nursing Practice — Psychiatry) and COM (College of Medicine) share the same 8-phase encounter flow, the same scoring rubric interpretation, the same patient prompt instructions, and the same case data fields. Psychiatric clinical encounters have fundamentally different structure than general medicine encounters — different phases, different evaluation criteria, different student artifacts. The current system treats program as a cosmetic filter rather than a behavioral configuration.

## Decision Summary

| Question | Decision |
|---|---|
| Phase flow | DNP gets its own sequence: replaces PHYSICAL_EXAM with MENTAL_STATUS_EXAM, DIAGNOSTIC_PLAN with TREATMENT_PLAN |
| Scoring domains | Same 5 domain keys (`history`, `exam`, `differential`, `plan`, `communication`), program-aware prompts and display labels |
| Case data model | New dedicated fields for DNP (`mentalStatusFindings`, `keyMSEDomains`, `treatmentPlanKey`); COM keeps existing fields |
| Architecture | Program Config Registry — single source of truth per program, no scattered conditionals |

## Phase Sequences

### COM (College of Medicine) — unchanged

```
OPENING → HISTORY_TAKING → PROBLEM_REPRESENTATION → DIFFERENTIAL_DIAGNOSIS → PHYSICAL_EXAM → DIAGNOSTIC_PLAN → FEEDBACK → COMPLETED
```

### DNP (Doctor of Nursing Practice — Psychiatry)

```
OPENING → HISTORY_TAKING → MENTAL_STATUS_EXAM → PROBLEM_REPRESENTATION → DIFFERENTIAL_DIAGNOSIS → TREATMENT_PLAN → FEEDBACK → COMPLETED
```

Key differences:
- **MENTAL_STATUS_EXAM** replaces PHYSICAL_EXAM. Student asks questions to elicit MSE findings: appearance, behavior, mood/affect, thought process, thought content, perception, cognition, insight/judgment. Interactive like PHYSICAL_EXAM but for psychiatric domains.
- **TREATMENT_PLAN** replaces DIAGNOSTIC_PLAN. Student submits medication recommendations, therapy modality recommendations, safety planning elements, and follow-up frequency — instead of labs/imaging/referrals.
- Phase ordering differs: MSE comes before PROBLEM_REPRESENTATION (student observes before formulating), TREATMENT_PLAN comes after DIFFERENTIAL_DIAGNOSIS.

## 1. Program Config Registry

New file: `app/lib/virtual-clinic/program-config.ts`

### Config Shape

```typescript
interface ProgramConfig {
  program: ClinicalProgram
  label: string
  color: string // tailwind badge classes

  // Phase sequence
  phases: EncounterPhase[]
  phaseLabels: Record<EncounterPhase, string>

  // Artifact → required-phase mapping
  artifactPhaseMap: Record<string, EncounterPhase>

  // Which phase triggers scoring eligibility
  scorableFromPhase: EncounterPhase

  // Scoring domain display labels
  scoringDomainLabels: {
    history: string
    exam: string
    differential: string
    plan: string
    communication: string
  }

  // Publish validation: which case fields are required
  requiredCaseFields: string[]

  // Patient prompt: phase-specific instructions
  phaseInstructions: Record<EncounterPhase, string>
}
```

### DNP Config

```typescript
{
  program: 'DNP_PSYCHIATRY',
  label: 'DNP Psychiatry',
  color: 'bg-purple-100 text-purple-700',
  phases: ['OPENING', 'HISTORY_TAKING', 'MENTAL_STATUS_EXAM', 'PROBLEM_REPRESENTATION', 'DIFFERENTIAL_DIAGNOSIS', 'TREATMENT_PLAN', 'FEEDBACK', 'COMPLETED'],
  phaseLabels: {
    OPENING: 'Opening',
    HISTORY_TAKING: 'History',
    MENTAL_STATUS_EXAM: 'Mental Status Exam',
    PROBLEM_REPRESENTATION: 'Problem Rep',
    DIFFERENTIAL_DIAGNOSIS: 'Differential',
    TREATMENT_PLAN: 'Treatment Plan',
    FEEDBACK: 'Feedback',
    COMPLETED: 'Completed',
    // COM-only phases (unused but typed)
    PHYSICAL_EXAM: 'Physical Exam',
    DIAGNOSTIC_PLAN: 'Diagnostic Plan',
  },
  artifactPhaseMap: {
    problem_representation: 'PROBLEM_REPRESENTATION',
    differential_list: 'DIFFERENTIAL_DIAGNOSIS',
    treatment_plan: 'TREATMENT_PLAN',
  },
  scorableFromPhase: 'TREATMENT_PLAN',
  scoringDomainLabels: {
    history: 'Psychiatric History',
    exam: 'Mental Status Exam',
    differential: 'Differential Diagnosis',
    plan: 'Treatment Plan',
    communication: 'Therapeutic Communication',
  },
  requiredCaseFields: [
    'historyOfPresentIllness', 'pastMedicalHistory', 'medications', 'allergies',
    'socialHistory', 'familyHistory', 'reviewOfSystems', 'vitalSigns',
    'mentalStatusFindings', 'keyMSEDomains', 'treatmentPlanKey',
    'correctDifferentials', 'keyHistoryQuestions',
  ],
}
```

### COM Config

Mirrors current hardcoded behavior exactly:

```typescript
{
  program: 'COLLEGE_OF_MEDICINE',
  label: 'College of Medicine',
  color: 'bg-teal-100 text-teal-700',
  phases: ['OPENING', 'HISTORY_TAKING', 'PROBLEM_REPRESENTATION', 'DIFFERENTIAL_DIAGNOSIS', 'PHYSICAL_EXAM', 'DIAGNOSTIC_PLAN', 'FEEDBACK', 'COMPLETED'],
  phaseLabels: {
    OPENING: 'Opening',
    HISTORY_TAKING: 'History',
    PROBLEM_REPRESENTATION: 'Problem Rep',
    DIFFERENTIAL_DIAGNOSIS: 'Differential',
    PHYSICAL_EXAM: 'Physical Exam',
    DIAGNOSTIC_PLAN: 'Diagnostic Plan',
    FEEDBACK: 'Feedback',
    COMPLETED: 'Completed',
    MENTAL_STATUS_EXAM: 'Mental Status Exam',
    TREATMENT_PLAN: 'Treatment Plan',
  },
  artifactPhaseMap: {
    problem_representation: 'PROBLEM_REPRESENTATION',
    differential_list: 'DIFFERENTIAL_DIAGNOSIS',
    diagnostic_plan: 'DIAGNOSTIC_PLAN',
  },
  scorableFromPhase: 'DIAGNOSTIC_PLAN',
  scoringDomainLabels: {
    history: 'History Taking',
    exam: 'Physical Exam',
    differential: 'Differential Diagnosis',
    plan: 'Diagnostic Plan',
    communication: 'Communication',
  },
  requiredCaseFields: [
    'historyOfPresentIllness', 'pastMedicalHistory', 'medications', 'allergies',
    'socialHistory', 'familyHistory', 'reviewOfSystems',
    'physicalExamFindings', 'vitalSigns', 'availableLabs', 'availableImaging',
    'correctDifferentials', 'keyHistoryQuestions', 'keyExamManeuvers', 'criticalActions',
  ],
}
```

### Lookup Function

```typescript
const PROGRAM_CONFIGS: Record<ClinicalProgram, ProgramConfig> = { DNP_PSYCHIATRY: ..., COLLEGE_OF_MEDICINE: ... }

export function getProgramConfig(program: ClinicalProgram): ProgramConfig {
  return PROGRAM_CONFIGS[program]
}
```

## 2. Schema Changes

### New Enum Values (Prisma)

Add to `enum EncounterPhase`:
- `MENTAL_STATUS_EXAM`
- `TREATMENT_PLAN`

Existing values unchanged. COM encounters never enter the new phases; DNP encounters never enter `PHYSICAL_EXAM` or `DIAGNOSTIC_PLAN`.

### New ClinicalCase Fields

```prisma
// Mental Status Exam (DNP)
mentalStatusFindings    Json?    // MSE data: appearance, behavior, mood, affect, thought process, thought content, perception, cognition, insight/judgment
keyMSEDomains           Json?    // Answer key: expected MSE domains student should assess
treatmentPlanKey        Json?    // Answer key: expected meds, therapy, safety plan, follow-up
```

All three nullable. Required for DNP at publish time; ignored for COM.

### No ClinicalEncounter Changes

- `diagnosticPlan` Json field stores whatever the student submits for their program's plan phase (labs/imaging for COM, meds/therapy for DNP)
- `examManeuversRequested` String[] stores physical exam maneuvers (COM) or MSE domains assessed (DNP)
- Program config tells code how to interpret these fields

### New Artifact Type

`treatment_plan` added alongside `diagnostic_plan` in encounter-service. Mapped to `TREATMENT_PLAN` phase via DNP's `artifactPhaseMap`. The `treatment_plan` artifact writes to the same `diagnosticPlan` Json column on ClinicalEncounter — the column stores whatever the student's plan-phase output is (labs/imaging for COM, meds/therapy for DNP). The program config determines interpretation.

## 3. Service Layer Changes

### encounter-service.ts

- Replace hardcoded `PHASE_ORDER` with lookup: `getProgramConfig(program).phases`
- `nextPhase(current, program)` — takes program parameter, walks that program's phase sequence
- `startEncounter()` — loads case to get program, uses program's first phase (always OPENING)
- `advancePhase()` — loads encounter with clinicalCase, resolves config from `clinicalCase.program`
- `saveArtifact()` — resolves `artifactPhaseMap` from program config instead of hardcoded map

### scoring-service.ts

`scoreEncounter()` reads program from `clinicalCase.program`:

- **`scoreExam()`**: For DNP, scores MSE domain coverage against `keyMSEDomains`. Same ratio-based logic. AI prompt context says "mental status examination" and lists MSE domains (appearance, mood, thought process, cognition, etc.) instead of physical exam maneuvers.
- **`scoreDiagnosticPlan()`**: For DNP, scores treatment plan against `treatmentPlanKey`. AI prompt evaluates medication appropriateness, therapy modality selection, safety planning completeness, and follow-up adequacy — instead of labs/imaging/referrals.
- **`scoreCommunication()`**: AI prompt gains program context. For DNP, emphasizes therapeutic alliance and psychiatric interviewing skills.
- **All other scorers** (`scoreHistory`, `scoreDifferential`, `detectCognitiveBiases`, illness script, near-misses, key moments, learning objectives, question strategy, clinical reasoning) — unchanged. They are already program-agnostic.

### patient-prompt-service.ts

`PHASE_INSTRUCTIONS` becomes a function: `getPhaseInstructions(program)` returns the right map. Two new phase instruction entries:

- **MENTAL_STATUS_EXAM**: Patient responds to MSE queries. Observable aspects (appearance, psychomotor activity) described without prompting. Mood/affect, thought process, cognition answered when specifically asked. Emits `<!--MANEUVER:mse-domain-->` markers (e.g., `<!--MANEUVER:mood-affect-->`, `<!--MANEUVER:thought-process-->`, `<!--MANEUVER:cognition-orientation-->`).
- **TREATMENT_PLAN**: Patient reacts in character to treatment recommendations. Asks questions like "Will I need to take medication every day?", "What's therapy like?", "Is this going to make me feel different?"

`buildPatientSystemPrompt()` reads program from the case data (needs program added to `CaseData` interface) and selects the right phase instructions.

### case-service.ts

`publishCase()`:
- Loads program config
- Validates `requiredCaseFields` from that config instead of the current hardcoded list
- Rubric weight validation unchanged (same 5 weights must sum to 1)

`createCase()` and `updateCase()`:
- Accept and persist the three new optional fields (`mentalStatusFindings`, `keyMSEDomains`, `treatmentPlanKey`)

## 4. Frontend Changes

### Encounter Page (encounter/[encounterId]/page.tsx)

- Hardcoded `PHASES` array at line 36 replaced by `getProgramConfig(program).phases` and `.phaseLabels`
- `PhaseBar` receives program, renders the correct phase dot sequence
- `canScore` checks against `config.scorableFromPhase` instead of hardcoded `'DIAGNOSTIC_PLAN'`
- Scoring results section uses `config.scoringDomainLabels` for radar chart and domain cards

### PhasePanel

- New `MENTAL_STATUS_EXAM` panel: guidance about MSE domains, shows which domains the student has assessed so far (from `examManeuversRequested` interpreted as MSE domains)
- New `TREATMENT_PLAN` form: medications input, therapy modalities input, safety planning input, follow-up frequency input — submitted as `treatment_plan` artifact
- Which form renders depends on current phase (program-determined)

### InstructionCard

`getPhaseInstruction()` gains program parameter:
- `MENTAL_STATUS_EXAM`: "Assess the patient's mental status — appearance, mood, thought process, cognition, insight."
- `TREATMENT_PLAN`: "Recommend medications, therapy modalities, safety planning, and follow-up."

### Author Page

- Program selection determines which field groups appear in the case editor
- DNP: shows MSE findings, key MSE domains, treatment plan key fields; hides physical exam, labs, imaging, critical actions
- COM: current fields unchanged

### Virtual Clinic Listing Page

No changes. The `SegmentedControl` program switcher already works.

## 5. Data & Migration

### Prisma Migration

One migration:
1. Add `MENTAL_STATUS_EXAM` and `TREATMENT_PLAN` to `EncounterPhase` enum
2. Add `mentalStatusFindings Json?`, `keyMSEDomains Json?`, `treatmentPlanKey Json?` to `ClinicalCase`

Non-destructive. Existing data untouched.

### Existing DNP Cases (6 seeded)

The 6 seeded DNP-Psychiatry cases currently store psychiatric content in `physicalExamFindings` and `keyExamManeuvers`. Post-migration, a backfill script:
1. Copies `physicalExamFindings` → `mentalStatusFindings`
2. Copies `keyExamManeuvers` → `keyMSEDomains`
3. Copies `criticalActions` → `treatmentPlanKey` (reinterpreted as treatment plan key)
4. Nulls out `physicalExamFindings`, `keyExamManeuvers`, `criticalActions` on those cases

### Existing Encounters

Any in-progress DNP encounters continue on the old COM phase flow — they were started under the old rules. Only new encounters created after the change use the DNP-specific flow. No retroactive phase remapping.

### Seed Script Update

`seed-virtual-clinic-cases.ts` updated to populate `mentalStatusFindings`, `keyMSEDomains`, `treatmentPlanKey` for the 6 DNP cases instead of `physicalExamFindings`, `keyExamManeuvers`, `criticalActions`.

### Types Update

`ClinicalCaseInput` in `types.ts` gains optional fields:
- `mentalStatusFindings?: unknown`
- `keyMSEDomains?: unknown`
- `treatmentPlanKey?: unknown`

`EncounterPhase` type union gains `'MENTAL_STATUS_EXAM' | 'TREATMENT_PLAN'`.

## Files Changed

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add 2 enum values, 3 nullable Json fields |
| `app/lib/virtual-clinic/program-config.ts` | **NEW** — Program Config Registry |
| `app/lib/virtual-clinic/types.ts` | Add new phases to EncounterPhase, new fields to ClinicalCaseInput |
| `app/lib/virtual-clinic/encounter-service.ts` | Replace hardcoded PHASE_ORDER + ARTIFACT_PHASE_MAP with config lookups |
| `app/lib/virtual-clinic/scoring-service.ts` | Program-aware scoreExam, scoreDiagnosticPlan, scoreCommunication |
| `app/lib/virtual-clinic/patient-prompt-service.ts` | Program-aware phase instructions, new MSE + Treatment Plan prompts |
| `app/lib/virtual-clinic/case-service.ts` | Program-aware publish validation, accept new fields in create/update |
| `app/virtual-clinic/encounter/[encounterId]/page.tsx` | Dynamic phase bar, program-aware PhasePanel, scoring labels |
| `app/components/virtual-clinic/InstructionCard.tsx` | Program-aware phase instructions |
| `app/virtual-clinic/author/page.tsx` | Program-aware field groups in case editor |
| `scripts/seed-virtual-clinic-cases.ts` | Populate DNP-specific fields |
| `scripts/backfill-dnp-case-fields.ts` | **NEW** — One-time migration of existing 6 DNP cases |

## Non-Goals

- No new programs beyond DNP and COM in this spec (registry supports it, but not scoped)
- No changes to analytics/charts beyond label swaps
- No retroactive encounter remapping
- No changes to scaffolding-service (already program-agnostic)
- No changes to import-service or bulk import flow
