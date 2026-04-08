# Module 2: Policy Framework Builder — Blueprint

> **Sprint scope:** 1 sprint (~25 files touched)
> **Depends on:** AI Literacy Hub master infra, Module 8 (Stance Navigator)
> **Route:** `/ai-literacy/policy`

---

## Context

### The Problem

50% of programs have no written AI policy. Among those that do, most are copy-paste syllabus boilerplate. One respondent said guidance "offers no real solutions when there are issues." The existing `CoursePoliciesTab` handles general course policies (late, attendance, grading, academic_integrity, communication, other) but has no AI-specific framework.

### The Vision

A guided, stance-aware policy builder that generates structured AI policies for each course. It connects the instructor's stance (from Module 8) to concrete, per-course, per-assignment policy language — and wires the output into the existing `CoursePolicy` system so it actually appears in the syllabus.

---

## Features

### Feature 1: Stance-Aware Policy Wizard

5-step wizard:
1. **Select course** (from instructor's courses)
2. **Confirm/adjust stance** (pre-filled from Module 8 profile)
3. **Configure per-assignment levels** (Prohibited/Limited/Guided/Required per assignment)
4. **Review generated policy** (editable rich text)
5. **Save & publish** (creates `CourseAIPolicy` + optionally adds to `CoursePolicy` as academic_integrity type)

### Feature 2: Per-Assignment AI Level Matrix

Table showing all assignments for the course with a dropdown per assignment:
- Prohibited: No AI use
- Limited: Brainstorming/editing only
- Guided: Structured use with disclosure
- Required: AI is mandatory

Pre-populated based on stance + assignment type heuristics (same logic as Module 8 course impact).

### Feature 3: Policy Generation

Uses the instructor's stance + discipline + per-assignment levels to generate:
1. A **main policy paragraph** for the syllabus (pre-written per stance, not LLM-generated)
2. A **per-assignment table** showing AI levels
3. **Disclosure requirements** appropriate to the stance
4. **Consequences language** for violations

All editable before saving.

### Feature 4: Policy Gap Dashboard (DUS/Admin view)

Aggregate view showing which courses in a program have AI policies:
- Total courses vs courses with `CourseAIPolicy`
- Color-coded list (green = has policy, amber = no policy)
- "Nudge" button to send Sandy prompt to faculty without policies

### Feature 5: Sandy Integration

Sandy tool: `generate_ai_policy` (confirm permission) — generates policy for a specific course based on stance.

---

## Key Files

| File | Purpose |
|------|---------|
| `app/(pages)/ai-literacy/policy/page.tsx` | Policy builder page |
| `app/components/ai-literacy/PolicyWizard.tsx` | 5-step wizard |
| `app/components/ai-literacy/AssignmentLevelMatrix.tsx` | Per-assignment AI level grid |
| `app/components/ai-literacy/PolicyPreview.tsx` | Generated policy preview/editor |
| `app/components/ai-literacy/PolicyGapDashboard.tsx` | DUS aggregate view |
| `app/lib/policy-builder-service.ts` | Policy generation + gap analysis |
| `app/api/ai-literacy/policy/route.ts` | GET gap data, POST generate policy |
| `app/api/ai-literacy/policy/[courseId]/route.ts` | GET/PUT course AI policy |

---

## Acceptance Criteria

- [ ] 5-step wizard generates stance-appropriate AI policy for a selected course
- [ ] Per-assignment AI level matrix pre-populated from stance + assignment type
- [ ] Generated policy text is editable before saving
- [ ] Saving creates `CourseAIPolicy` record and optionally adds to `CoursePolicy`
- [ ] Policy gap dashboard shows coverage for admin/DUS
- [ ] Sandy `generate_ai_policy` tool works with confirm permission
- [ ] Copy-to-clipboard on all generated text
- [ ] Mobile responsive
