# Blueprint: Syllabus Architect Enhancement Sprint

> **Created:** 2026-03-22
> **Goal:** Extend the Magic Course Builder's 3-pass Haiku pipeline with 4 new capabilities across 4 phases (A→D).
> **Scope:** Schema additions, DOCX support, explicit objective extraction, policy/grading extraction, apply route, and UI integration.
> **Status:** ✅ ALL PHASES COMPLETE (A–D, Tasks 1–8)

---

## Phase Summary

| Phase | Name | Tasks | Status |
|-------|------|-------|--------|
| A | Schema Migration + DOCX Support | 1–2 | ✅ Done |
| B | Objective Extraction + Sync Logic | 3–4 | ✅ Done |
| C | Pass 4 (Policy + Grading Extraction) + Apply Route | 5–6 | ✅ Done |
| D | UI Integration | 7–8 | ✅ Done |

---

## Detailed Task Breakdown

### Phase A: Schema Migration + DOCX Support ✅

#### Task 1: Prisma Schema Migration ✅
**Files changed:**
- `prisma/schema.prisma`

**What was done:**
1. Added `CoursePolicy` model:
   - `id` String @id @default(cuid())
   - `courseId` String (FK → Course, onDelete: Cascade)
   - `policyType` String — stores "LATE" | "ATTENDANCE" | "GRADING" | "ACADEMIC_INTEGRITY" | "COMMUNICATION" | "OTHER"
   - `title` String
   - `content` String @db.Text
   - `source` String @default("syllabus")
   - `createdAt` DateTime @default(now())
   - `@@index([courseId])` and `@@index([courseId, policyType])`

2. Added `GradingWeight` model:
   - `id` String @id @default(cuid())
   - `courseId` String (FK → Course, onDelete: Cascade)
   - `category` String
   - `weight` Float (0–100)
   - `description` String? (optional)
   - `source` String @default("syllabus")
   - `createdAt` DateTime @default(now())
   - `@@index([courseId])`

3. Added relations on `Course` model (under `// Syllabus Architect` comment):
   - `policies CoursePolicy[]`
   - `gradingWeights GradingWeight[]`

4. Applied via `prisma db push` (migration history had drift; db push was used instead of `migrate dev`)
5. `prisma generate` succeeded

#### Task 2: DOCX Support ✅
**Files changed:**
- `app/components/courses/SyllabusUploadStep.tsx`
- `app/api/courses/[id]/parse-syllabus/route.ts`
- `app/lib/syllabus-architect/pdf-parser.ts`

**What was done:**
- **SyllabusUploadStep.tsx:** `accept=".pdf,.docx"`, MIME Set check, drop zone text updated ("Drop your syllabus here", "PDF or DOCX, max 10 MB")
- **route.ts:** Same MIME Set check, passes `file.type` as third arg to `parseSyllabusBuffer()`
- **pdf-parser.ts:** Added `mimeType: string = 'application/pdf'` parameter (backward-compatible), imported `extractText` from `../syllabus-parser-service`, routes DOCX buffers through `extractText()` while keeping `extractTextFromPdf()` for PDF path

**Decision:** Migration history drift — used `prisma db push` instead of `prisma migrate dev`. Future phases should also use `db push` unless drift is resolved.

---

### Phase B: Objective Extraction + Sync Logic ✅

#### Task 3: Extend Pass 1 to Extract Explicit Learning Objectives ✅
**Files to touch:**
- `app/lib/syllabus-architect/pdf-parser.ts`

**Specs:**
1. Add `explicitObjectives: string[]` to the `ExtractedUnit` interface
2. Add `explicitObjectives: string[]` to the `RawSection` internal interface
3. Extend the Pass 1 prompt in `detectStructure()`:
   - Add instruction #7: extract explicitly stated learning objectives, outcomes, or competencies per section. Look for "Students will be able to...", "By the end of this unit...", "Learning objectives:", "Course outcomes:", "Competencies:". Capture as complete sentences. Empty array if none found.
   - Add `"explicitObjectives": ["string array of verbatim objectives"]` to the JSON schema in the prompt
4. Bump `max_tokens` from `4096` to `6144` in the `detectStructure()` Haiku call
5. Update the fallback return in the `catch` block to include `explicitObjectives: []`
6. In `parseSyllabusBuffer()`, pass through in the `structure.sections.map()`:
   ```typescript
   explicitObjectives: section.explicitObjectives ?? [],
   ```

#### Task 4: Explicit-Objective-First Priority in Assignment-Objective Sync ✅
**Files changed:**
- `app/lib/syllabus-architect/assignment-objective-sync.ts`

**Specs:**
1. Find `createObjectivesFromParse()` (or equivalent function creating `LearningObjective` records)
2. Add explicit-objective-first priority:
   - Before Bloom's inference, check `unit.explicitObjectives`
   - If non-empty, create `LearningObjective` records with `source: 'explicit'`
   - Dedup via `existingTitles` Set
   - Only fall back to Bloom's inference for units with NO explicit objectives
3. For explicit objectives:
   - `title`: verbatim objective string
   - `source`: `'explicit'`
   - `bloomLevel`: detect from verb using existing `detectBloomLevel()` or `BLOOMS_VERB_MAP`, default `'UNDERSTAND'`
4. Note: `assignment-objective-sync.ts` already has `BLOOM_VERBS` and `detectBloomLevel()` — reuse those rather than creating new ones. The existing `detectBloomLevel()` returns `string | null`, so use `?? 'understand'` for the default.

---

### Phase C: Pass 4 (Policy + Grading Extraction) + Apply Route ✅

#### Task 5: Add Pass 4 to pdf-parser.ts ✅
**Files changed:**
- `app/lib/syllabus-architect/pdf-parser.ts`

**Specs:**
1. Add new function `extractPoliciesAndGrading(text: string)` that calls Haiku to extract:
   - Course policies: late work, attendance, grading scale, academic integrity, communication, other
   - Grading weights: category name, percentage weight, optional description
2. Add to `ParseResult` interface:
   ```typescript
   policies: Array<{ policyType: string; title: string; content: string }>
   gradingWeights: Array<{ category: string; weight: number; description: string | null }>
   ```
3. Call Pass 4 in `parseSyllabusBuffer()` after Pass 3
4. Include results in the returned `ParseResult`
5. Fallback: empty arrays if extraction fails

#### Task 6: Create Apply Route ✅
**Files changed:**
- `app/api/courses/[id]/apply-syllabus/route.ts`

**Specs:**
1. POST endpoint accepting a `ParseResult` body (or `jobId` referencing a completed parse job)
2. Auth: `requireCourseOwner`
3. Upsert pattern: delete existing `CoursePolicy` and `GradingWeight` for the course, then bulk-create from parse result
4. Return `{ applied: true, policiesCount: number, gradingWeightsCount: number }`
5. Follow route-logic constraint: auth → parse → call lib → return

---

### Phase D: UI Integration ✅

#### Task 7: Policy & Grading Display in Course Map ✅
**Files changed:**
- `app/components/courses/CoursePolicySummaryCard.tsx`

**What was done:**
- CoursePolicySummaryCard already displayed policy chips + grading weight stacked bar on Overview tab
- CoursePoliciesTab already provided full policy editing, templates, ACK tracking, and change history
- Added "From Syllabus" source badge (emerald chip with FileCheck icon) to the summary card header
- Full CRUD for policies/weights was already implemented via apply-policies route

#### Task 8: Objective Source Indicator in UI ✅
**Files changed:**
- `app/api/courses/[id]/objectives/route.ts`
- `app/components/courses/course-types.ts`
- `app/components/courses/LearningMapTab.tsx`

**What was done:**
1. Added `bloomLevel` and `source` to objectives API select clause
2. Added `bloomLevel: string | null` and `source: string | null` to `LearningObjective` type
3. In LearningMapTab objective rows, added:
   - Emerald "From Syllabus" badge (FileCheck icon) for `source: 'explicit'` objectives
   - Violet "Inferred" badge (Brain icon) for `source: 'syllabus'` (Bloom's-inferred) objectives
   - Gray Bloom's level pill showing the taxonomy level (capitalize, e.g., "Analyze")
   - Material link button moved into the same badge row for cleaner layout

---

## Key Files Reference

| File | Role |
|------|------|
| `prisma/schema.prisma` | Schema — `CoursePolicy`, `GradingWeight` models (added Phase A) |
| `app/lib/syllabus-architect/pdf-parser.ts` | 3-pass Haiku pipeline (Phases A, B, C modify) |
| `app/lib/syllabus-architect/assignment-objective-sync.ts` | Objective creation from parse data (Phase B modifies) |
| `app/lib/syllabus-parser-service.ts` | Shared `extractText()` for PDF+DOCX (used by pdf-parser) |
| `app/lib/pdf-extract.ts` | Low-level pdf-parse v2 wrapper (do not import pdf-parse directly) |
| `app/api/courses/[id]/parse-syllabus/route.ts` | Parse endpoint (Phase A modified) |
| `app/api/courses/[id]/apply-syllabus/route.ts` | Apply endpoint (Phase C creates) |
| `app/components/courses/SyllabusUploadStep.tsx` | Upload UI (Phase A modified) |

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-22 | Used `prisma db push` instead of `migrate dev` | Migration history has significant drift from actual DB state; push syncs without requiring clean migration history |
| 2026-03-22 | DOCX routes through existing `extractText()` in `syllabus-parser-service.ts` | Already handles DOCX via JSZip; PDF path kept separate via `extractTextFromPdf()` for backward compat |
| 2026-03-22 | `mimeType` param has default `'application/pdf'` | Backward compatibility — existing callers don't need to change |

---

## Resume Prompt (copy into new session if interrupted)

```
You are resuming the Syllabus Architect Enhancement sprint on "The Sandbox" — an AI-powered
educational tool marketplace for the University of Kentucky.

## Sprint
Name: Syllabus Architect Enhancement
Blueprint: c:\AA Code\Educator marketplace\Blueprints\SYLLABUS-ARCHITECT-ENHANCEMENT.md

## Completed so far
✅ Task 1: Prisma schema — added CoursePolicy + GradingWeight models (prisma db push + generate)
✅ Task 2: DOCX support — SyllabusUploadStep, parse-syllabus route, pdf-parser all accept DOCX
✅ Task 3: Pass 1 explicitObjectives extraction in pdf-parser.ts (prompt, interface, fallback, passthrough)
✅ Task 4: Explicit-objective-first priority in assignment-objective-sync.ts (detectBloomLevelFromObjective, source:'explicit', dedup, Bloom's fallback)
✅ Task 5: Pass 4 extractPoliciesAndGrading() in pdf-parser.ts (policies + grading weights, 12K char window, Haiku call, wired into parseSyllabusBuffer)
✅ Task 6: Apply routes — apply-syllabus (full CourseMap + assignments + objectives + policy diff) and apply-policies (Zod-validated upsert returning { applied, policiesCount, gradingWeightsCount })

## What to do next
- Phase D (Tasks 7–8): UI integration
  - Task 7: Policy & Grading Display in Course Map — collapsible section, grading breakdown, "source: syllabus" badge, editor CRUD
  - Task 8: Objective Source Indicator — visual indicator for source:'explicit' vs Bloom's-inferred, explicit prioritized

## Files modified this sprint (read before touching)
- prisma/schema.prisma (CoursePolicy + GradingWeight models, relations on Course)
- app/components/courses/SyllabusUploadStep.tsx (DOCX accept, MIME Set, drop zone text)
- app/components/courses/SyllabusReviewStep.tsx (ExtractedUnit mirror type synced with explicitObjectives)
- app/api/courses/[id]/parse-syllabus/route.ts (MIME Set, passes file.type to parseSyllabusBuffer)
- app/api/courses/[id]/apply-syllabus/route.ts (full CourseMap creation + sync + policy diff)
- app/api/courses/[id]/apply-policies/route.ts (GET + POST for policy/grading upsert)
- app/lib/syllabus-architect/pdf-parser.ts (4-pass pipeline: structure+objectives, dates, prereqs, policies+grading; DOCX support)
- app/lib/syllabus-architect/assignment-objective-sync.ts (explicit-objective-first priority, detectBloomLevelFromObjective)

## Decisions already made
- Use prisma db push (not migrate dev) due to migration history drift
- DOCX extraction routes through existing extractText() in syllabus-parser-service.ts
- mimeType param defaults to 'application/pdf' for backward compat
- assignment-objective-sync.ts reuses BLOOMS_VERB_MAP for explicit objective Bloom's detection
- Pass 4 uses 12K char window (policies often at end of syllabus)
- apply-policies route uses Zod validation + transactional delete-then-createMany pattern
- apply-syllabus route detects policy diff (notification only — no auto-overwrite)

## Architecture constraints (non-negotiable)
- Prisma v7 — no url in datasource; use prisma.config.ts; PrismaPg adapter at runtime
- Tailwind v4 — no @apply; utility classes in JSX only
- Auth — requireCourseOwner() on course-scoped routes
- Icons — lucide-react only
- Route logic — thin routes: auth → parse → call lib → return
- Generated Prisma client import: ../generated/prisma (relative to app/lib/)
- UK Blue: #0033A0
- Build: npm run build from c:\AA Code\Educator marketplace\the-sandbox\

## Instructions
1. Read CLAUDE.md at c:\AA Code\Educator marketplace\the-sandbox\CLAUDE.md
2. Read the blueprint at c:\AA Code\Educator marketplace\Blueprints\SYLLABUS-ARCHITECT-ENHANCEMENT.md
3. Read each file in "Files modified this sprint" to understand current state
4. Execute Task 7 (Policy & Grading UI) → run npx tsc --noEmit → fix errors
5. Execute Task 8 (Objective Source Indicators) → run npx tsc --noEmit → fix errors
6. Update the blueprint: mark Tasks 7–8 ✅, mark Phase D ✅
```
