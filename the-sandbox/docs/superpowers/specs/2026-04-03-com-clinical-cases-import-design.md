# COM Clinical Reasoning Cases — Virtual Clinic Import

**Date:** 2026-04-03
**Status:** Approved
**Scope:** Bulk import 18 College of Medicine clinical reasoning case documents into the Virtual Clinic case library

---

## Context

The UK College of Medicine has 18 draft clinical reasoning cases in .docx format at:
```
C:/AA Code/Educator marketplace/Test documents/COM Simulator/Draft Clinical Reasoning Cases/
```

These cases cover adult and pediatric presentations: Abdominal Pain, Bleeding, Chest Pain, Confusion, Cough, Headache, Mood, SOA (Shortness of Air), Amenorrhea, Back Pain, Edema, Exertional Dyspnea, Fever, Infant Wheezing, Palpitations, Joint Pain, Jaundice.

The Virtual Clinic is fully built (10/10 sprints) with an existing Sonnet-powered import service (`app/lib/virtual-clinic/import-service.ts`) that parses raw text into structured `ClinicalCaseInput` JSON.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Organization | Standalone case library | Cases published globally, not bound to a specific course. Any educator can assign them. |
| Case+key merging | Merge pairs before import | Give Sonnet the richest possible input for populating answer key fields. |
| Difficulty | Sonnet auto-detect | Per-case AI judgment based on differential complexity and finding subtlety. |
| Creator | Katie Thompson (EDUCATOR) | Natural owner for authored educational content. |

## Approach

Bulk import script (`scripts/seed-clinical-cases.ts`) that reads .docx files, merges case+key pairs, feeds through the existing Sonnet import pipeline, and creates+publishes each case.

### File Pairing Logic

The 18 files fall into 3 categories:

**Paired cases (case + separate answer key):**

| Case File | Key File | Strategy |
|-----------|----------|----------|
| Adult Headache.docx | Adult Headache Key.docx | Concatenate with `--- ANSWER KEY ---` separator |

**Key/facilitator files without matching case (contain full case + answers):**

| File | Strategy |
|------|----------|
| Adult SOA Key.docx | Import standalone |
| C. Edema - Facilitator.docx | Import standalone |
| Pediatrics Joint Pain Key.docx | Import standalone |

**Self-contained cases (14):**

Adult Abdominal Pain, Adult Bleeding, Adult Chest Pain, Adult Confusion, Adult Cough, Adult Mood, Amenorrhea, Back Pain, Exertional Dyspnea, Fever, Infant Wheezing, Palpitations, Peds Jaundice — each imported directly.

**Pairing heuristic:** If `Foo.docx` and `Foo Key.docx` both exist, merge them and skip the key file from standalone import. Files named `*Key.docx` or `*Facilitator*` without a matching base file are imported as standalone cases.

### Script Architecture

**File:** `scripts/seed-clinical-cases.ts`

**Flow:**
1. Scan source directory for all .docx files
2. Build pair map using the pairing heuristic
3. For each case (sequential — rate limit friendly):
   a. `mammoth.extractRawText(docxBuffer)` to get plain text
   b. If paired with a key file, concatenate: case text + `\n\n--- ANSWER KEY ---\n\n` + key text
   c. `parseRawTextToCase(mergedText)` — Sonnet API call, returns `ClinicalCaseInput`
   d. `createCase(input, creatorId)` — persist to database
   e. `publishCase(caseId, creatorId)` — mark as published (passes validation)
   f. Log success: title, difficulty, organ systems
4. Print summary: total imported, total published, any failures

**Error handling:** If a single case fails (Sonnet timeout, JSON parse error, validation failure), log the error with the filename and continue with remaining cases. Print a failure summary at the end for manual retry.

**Run command:** `npx tsx scripts/seed-clinical-cases.ts`

### Dependencies

| Dependency | Purpose | Notes |
|------------|---------|-------|
| `mammoth` | .docx to text extraction | Mature, no native deps, dev dependency |

### Configuration

- **Source path:** Hardcoded constant in the script
- **Creator:** Looked up by email (`katie.thompson@uky.edu`)
- **Environment:** Requires `ANTHROPIC_API_KEY` (already set in dev)
- **No schema changes** — uses existing `ClinicalCase` model
- **No new API routes** — script calls service functions directly

## What This Does NOT Include

- No UI changes
- No new API routes
- No schema migrations
- No course binding (cases are library-only)
- No adaptive difficulty system (see Future Direction below)

## Future Direction: Adaptive Difficulty by Learner Level

Captured for future implementation. Same patient, same presentation, calibrated expectations by medical school year.

Concept: a `yearExpectations` JSON field on `ClinicalCase` containing year-keyed scoring tiers:

```typescript
{
  "Y1": {
    historyDomainsRequired: 3,
    differentialCount: 2,
    skipPhases: ["DIAGNOSTIC_PLAN"],
    biasDetection: false,
    rubricWeights: { history: 0.40, exam: 0.20, differential: 0.25, plan: 0.0, communication: 0.15 }
  },
  "Y4": {
    historyDomainsRequired: 7,
    differentialCount: 5,
    skipPhases: [],
    biasDetection: true,
    rubricWeights: { history: 0.25, exam: 0.20, differential: 0.25, plan: 0.20, communication: 0.10 }
  }
}
```

The encounter service would read the student's year and select the matching tier. The 18 imported cases become the foundation that tiered expectations layer onto. This will be designed as a separate blueprint when the COM faculty define year-specific expectations.
