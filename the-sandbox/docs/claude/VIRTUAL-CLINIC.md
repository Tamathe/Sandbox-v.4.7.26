# Virtual Clinic — Claude Code Reference

> **Claude Code reference doc** extracted from `CLAUDE.md` for focused context loading.
> Covers: Virtual Clinic (all 10/10 sprints). **Patent-relevant.**

---

## Virtual Clinic (ALL 10/10 Sprints Complete)

AI-powered clinical simulation with FSM-constrained AI patients.

### Schema (3 enums + 2 models)

**Enums:**

| Enum | Values |
|------|--------|
| `EncounterPhase` | 8 values |
| `CaseDifficulty` | 4 values |
| `CompetencyLevel` | 4 values |

**Models:**

- `ClinicalCase`
- `ClinicalEncounter`

**Assignment integration:**

- Added `VIRTUAL_CLINIC` to `AssignmentType` enum
- Added `clinicalCaseId` on `Assignment`

### Services (7 in `app/lib/virtual-clinic/`)

| File | Purpose |
|------|---------|
| `types.ts` | Type definitions |
| `case-service.ts` | Case management |
| `encounter-service.ts` | FSM engine |
| `import-service.ts` | Sonnet parser |
| `patient-prompt-service.ts` | Patient prompt generation |
| `scoring-service.ts` | 5-domain rubric + cognitive bias detection |
| `analytics-service.ts` | Analytics |

### API

- 18 routes under `/api/virtual-clinic/`

### Components

- 5 + analytics components

### Pages

- 3 pages

### Sandy Tools (4)

1. `launch_virtual_clinic`
2. `start_clinical_case`
3. `get_encounter_results`
4. `create_clinical_case`

### Assignment Integration

- Integrated with `briefing-service` and `proactive-suggestions`

### DNP-Psychiatry Case Library

- 6 seeded cases via `scripts/seed-virtual-clinic-cases.ts`
- 30-case roadmap in `Blueprints/VIRTUAL-CLINIC-PSYCH-CASES.md`
