# ABPM Clinical Informatics — V2 Expansion Architecture

**Status:** Planning
**Date:** 2026-04-07
**Driver:** Audit (2026-04-07) found course at 8.5/10 standalone board-prep readiness. This document plans the work to reach 9.5/10.

## Goals

1. Close the five critical coverage gaps: imaging informatics, UMLS, healthcare financing, telemedicine/PGHD, modern AI/ML CDS.
2. Expand the question bank from 120 → 400 items, weighted to ABPM blueprint.
3. Preserve house style: Reading → Concrete example → Uncomfortable question; wrong-answer rationales as the teaching surface; Friedman corollary as ethical anchor; concept ID stability.
4. Do not renumber or rename existing concept IDs. Additions only.

## Non-Goals

- Rewriting any existing lesson prose. Existing lessons audit as strong.
- Changing the platform schema. All additions conform to current `course.json` / module / lesson / mastery-gate / concepts file structure.
- Replacing the final project or rubrics.

## Target End State

| Metric | Current | Target |
|---|---|---|
| Modules | 8 | 9 |
| Lessons | 38 | 60 |
| Mastery-gate questions | 120 | 400 |
| Capstones | 8 | 9 |
| Concept IDs | 288 | ~360 |
| Voice sessions | 3 | 4 |
| Study groups | 2 | 3 |

## Structural Decisions

### D1 — New Module 9, not scattered lessons
Imaging + telemedicine + PGHD + DTx are three distinct blueprint areas with shared regulatory framing (FDA SaMD, Cures Act). They cohere as a module. Scattering them across M3/M4/M8 would dilute the cross-cutting SaMD/Cures thread and inflate already-large modules.

**Module 9 — Imaging, Virtual Care & Patient-Generated Data** (5 lessons)
1. `01-imaging-informatics-dicom-pacs-vna.md`
2. `02-telemedicine-and-virtual-care.md`
3. `03-rpm-wearables-and-pghd.md`
4. `04-fhir-bulk-data-and-patient-facing-apis.md`
5. `05-digital-therapeutics-fda-samd-cures-cds-exemption.md`

Mastery gate: 15 items. Capstone: enterprise imaging + virtual care strategy memo. Prereqs: M2, M3, M7.

### D2 — Expand existing modules in place
Other gaps live inside existing modules and should be added as new lessons appended to those modules, not as a new module. This preserves prereq graph topology.

| Module | New lessons | Rationale |
|---|---|---|
| M1 Foundations | +2 (orgs/roles, AMIA competencies) | Definitional content belongs at the start |
| M2 Data Standards | +4 (UMLS, C-CDA+USCDI, IHE, X12+NCPDP) | Vocabulary/standards module is the natural home |
| M3 EHR/HIS | +4 (imaging→moved to M9; departmental systems, hosting/cloud/TCO, portals/PHR/SMART) | Architecture content. Imaging extracted to M9 to avoid M3 bloat |
| M4 CDS | +2 (diagnostic DSS history; order sets/templates/infobutton) | Modern AI-CDS goes to M9 lesson 5 to keep SaMD content unified |
| M5 Workflow/HF | +2 (cognitive informatics; burnout/doc burden) | Brings thinnest module to 6 lessons |
| M6 Quality/Analytics | +4 (QI methods/SPC, common data models, RCA/FMEA, ML validation) | Methods track |
| M7 Privacy/Policy | +2 (42 CFR Part 2 + state preemption; OCR enforcement) + expand existing security lesson | Enforcement and adjacent-law gaps |
| M8 Leadership | +3 (healthcare financing; vendor mgmt/RFP; governance committees) | Brings 2nd-thinnest module to 7 lessons |

**Total new lessons: 22 across M1–M8 + 5 in M9 = 27 new. Final lesson count: 60.** (Audit said 22 + new module; recount: M1+2, M2+4, M3+3 [imaging extracted], M4+2, M5+2, M6+4, M7+2, M8+3 = 22; +5 in M9 = 27 new lessons; 38+22 = 60 in M1–M8+M9 lessons total. Note: imaging informatics lives in M9 not M3.)

### D3 — AI/ML CDS placement
Two valid homes: M4 (CDS module) or M9 (SaMD-unified). Choosing M9 because:
- The 21st Century Cures CDS-not-a-device four criteria are FDA SaMD law, not CDS pedagogy.
- HTI-1 DSI requirements (2024) are an ONC certification rule, parallel to Cures info-blocking — fits the regulatory thread of M9.
- M4 stays focused on CDS *design* (Five Rights, Arden, CDS Hooks, CQL).

A short forward-reference paragraph in M4 lesson 5 will point to M9 lesson 5.

### D4 — Question bank growth
Target +280 items. Distribution per audit table:

| Blueprint area | Modules | Add | Notes |
|---|---|---|---|
| Fundamentals (12%) | M1 | +35 | Includes new orgs/competencies items |
| Clinical Decision Making & CPI (30%) | M4, M6 | +90 | Heavy on QI methods, SPC, ML validation, AI-CDS |
| Health Information Systems (38%) | M2, M3, M9 | +120 | Heavy on imaging, IHE, UMLS, USCDI, telemedicine |
| Leading & Managing Change (20%) | M5, M7, M8 | +35 | Financing, governance, Part 2, OCR enforcement |

**Mechanics:** Existing mastery gates stay at 15 items each (do not rebalance — preserves prereq snapshots). New items go into a new artifact per module: `mastery-gate-extended.json` with the same schema. Platform consumes both. This avoids rewriting `mastery-gate.json` files and keeps git diffs clean.

**Snippet-reading items (≥10):** new item type using existing MCQ schema with a `stemAttachment` field (HL7 v2 segment, FHIR JSON, CDA section, CDS Hooks card). Schema addition documented separately if platform doesn't already support free-form stem markdown — most likely it does (lesson markdown shows JSON inline today), so no schema change needed.

### D5 — Short-answer scoring fix
Current short-answer items use `expectedKeywords` arrays. Add a sibling field `referenceAnswer` (full model answer prose) and a `gradingMode: "rubric"` flag. Existing keyword field stays for backward compatibility. Grader (LLM) prompted to score against `referenceAnswer` with the rubric, falling back to keywords only if reference is absent.

### D6 — Concept ID hygiene
- New concept IDs are kebab-case, descriptive, namespaced loosely by topic (e.g., `dicom-modality-worklist`, `umls-metathesaurus`, `tripod-ai`, `macra-mips-qpp`, `cures-cds-exemption`).
- No renaming of existing 288 IDs.
- New IDs aggregated into course-root `concepts.json` via the same generator used in Sprint 9.
- Cross-module references where natural (e.g., `friedmans-fundamental-theorem` recurs in new M9 lesson 5 in the SaMD bias discussion — keeps the Friedman thread alive).

### D7 — Prereq graph additions
- M9 prereqs: M2 (standards), M3 (architecture), M7 (privacy/policy). Multi-prereq node — exercises the same platform feature M8 already exercises.
- New M2/M3/M4/M6 lessons inherit the existing module prereqs; no graph edits needed.

### D8 — Platform stress-test additions
Since the original course was a deliberate platform stress test, V2 should add at least one new platform surface to exercise:
- **New voice session in M9** (FDA SaMD policy roundtable) — brings voice session count to 4.
- **New study group in M6** organized around the QI methods lessons — brings study group count to 3.
- **Snippet-attachment item type** in mastery gates (if platform supports inline markdown in stems, no work; otherwise minor schema addition).

## Sprint Plan

Sequenced by audit priority. Each sprint is one fresh Claude Code session driven by an updated `SPRINT_RUNBOOK.md`. Sprints are independently committable.

### Sprint 10 — Critical coverage, part 1 (Imaging + UMLS + Financing)
**Scope:** The three CRIT items from the audit's prioritized list.
- Create Module 9 skeleton (`module.json`, `concepts.json`, lessons dir, empty mastery gate).
- Author M9 lesson 1 (`imaging-informatics-dicom-pacs-vna.md`).
- Author M2 new lesson `07-umls-and-the-meta-vocabulary.md`.
- Author M8 new lesson `05-healthcare-financing-and-the-payment-environment.md` (renumber M8 existing lesson 5 → 8 IF lesson numbering matters; otherwise append as next available number — verify in runbook).
- +30 mastery items distributed across the three lessons in `mastery-gate-extended.json` artifacts.
- Update course-root `concepts.json` aggregator.

**Exit criteria:** Three CRIT gaps closed. Course readiness: 8.5 → 9.0.

### Sprint 11 — Critical coverage, part 2 (M9 buildout + AI-CDS)
**Scope:** Finish Module 9.
- M9 lessons 2 (telemedicine), 3 (RPM/wearables/PGHD), 4 (FHIR Bulk Data + patient APIs), 5 (DTx + FDA SaMD + Cures CDS exemption + HTI-1 DSI).
- M9 mastery gate (15 items) + extended items targeting +30 more.
- M9 capstone: enterprise imaging + virtual care strategy memo.
- M9 voice session.
- Forward-reference paragraph added to M4 lesson 5.

**Exit criteria:** Module 9 complete and prereq-wired. AI-CDS gap closed.

### Sprint 12 — Methods track (M6 expansion)
**Scope:** Four new M6 lessons.
- `06-qi-methods-pdsa-lean-six-sigma-spc.md`
- `07-common-data-models-and-research-informatics.md`
- `08-patient-safety-rca-fmea-and-the-pso-framework.md`
- `09-ml-model-validation-and-monitoring.md`
- New M6 study group around QI methods.
- +40 mastery items.

**Exit criteria:** QI/research/safety/ML methods covered. Bank +100 cumulative.

### Sprint 13 — Standards completion (M2 expansion)
**Scope:** Three remaining M2 lessons.
- `08-c-cda-and-uscdi.md`
- `09-ihe-profiles-and-the-integration-stack.md`
- `10-billing-and-eprescribing-transactions.md`
- +30 mastery items including ≥5 snippet-reading items (HL7 v2, FHIR JSON, CDA section).

**Exit criteria:** Standards module complete. Snippet item type proven.

### Sprint 14 — Architecture + workflow gaps (M3 + M5)
**Scope:**
- M3 new lessons: departmental systems, hosting/cloud/TCO, portals/PHR/SMART.
- M5 new lessons: cognitive informatics, burnout/documentation burden.
- +30 mastery items.

**Exit criteria:** M5 no longer thinnest module. M3 architecture coverage complete.

### Sprint 15 — Privacy/policy + leadership gaps (M7 + M8)
**Scope:**
- M7 new lessons: 42 CFR Part 2 + state preemption; OCR enforcement + CMP tiers.
- Expand existing M7 security lesson with NIST CSF, 405(d), MFA/zero-trust/EDR.
- M8 new lessons: vendor management/RFP/BAA; governance committees.
- +30 mastery items.

**Exit criteria:** M7 enforcement and adjacent-law gaps closed. M8 at 7 lessons.

### Sprint 16 — CDS depth + foundations polish (M4 + M1)
**Scope:**
- M4 new lessons: diagnostic DSS history (DXplain/QMR/Iliad); order sets/templates/infobutton.
- Worked CQL snippet added to existing M4 lesson 5.
- M1 new lessons: informatics organizations and roles; AMIA core competencies.
- +20 mastery items.

**Exit criteria:** All audit lesson additions complete.

### Sprint 17 — Question bank to 400 + quality fixes
**Scope:**
- Audit cumulative item count, fill remaining gap to 400.
- Convert short-answer items to `referenceAnswer` + `gradingMode: rubric`.
- Rewrite the ~5 telegraphing items identified in the audit.
- Add spaced-recall export from concepts.json (flashcard-style JSON).

**Exit criteria:** Bank at 400 items. Quality fixes done. Course readiness: 9.5/10.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Concept ID collisions when adding ~70 new IDs | Generator script runs uniqueness check on aggregation; sprint runbook requires running it before commit |
| Mastery-gate-extended.json not consumed by platform | Verify platform loader in Sprint 10 with a single extended item before authoring 280 |
| M9 prereq graph break (multi-prereq with M2+M3+M7) | M8 already exercises multi-prereq; same code path |
| Lesson numbering collision when appending to existing modules | Sprint runbook specifies "append next integer, do not insert" |
| Author drift across sprints (tone, depth, house style) | SPRINT_RUNBOOK.md updated with explicit references to exemplar lessons (Sittig-Singh M5L3, statistical traps M6L4, info-blocking M7L3) |
| Friedman thread weakening as course doubles in size | M9 lesson 5 explicitly invokes Friedman corollary in SaMD bias discussion; final project rubric unchanged |

## Open Questions

1. Should the snippet-reading item type require a platform schema change, or does the existing markdown stem field suffice? **Resolve in Sprint 10** with a single test item before bulk authoring.
2. Should the new M6 study group replace one of the existing two (M2, M6) or add a third? **Recommendation: add as third — exercises N=3 study groups as a new platform stress.**
3. Are there ABPM blueprint areas the audit missed entirely? **Recommendation: re-audit after Sprint 13 against the official 2024 content outline before committing to Sprints 14–17 scope.**
4. Does the platform's mastery-gate loader support `mastery-gate-extended.json` as a sibling, or does everything need to live in one file? **Resolve in Sprint 10.** Fallback: append to existing `mastery-gate.json` with a `set: "extended"` tag.

## Definition of Done

- 9 modules, 60 lessons, 400 mastery items, ~360 concept IDs.
- All five CRIT audit gaps closed with both lesson content and mastery items.
- New M9 voice session, new M6 study group, snippet-reading items present.
- Course-root `concepts.json` regenerated and unique.
- Prereq graph validated end-to-end.
- Final project and rubrics unchanged.
- Re-audit scores 9.5/10 or above.
