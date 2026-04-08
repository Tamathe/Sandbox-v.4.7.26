# Module 1: Assignment Redesign Studio — Blueprint

> **Sprint scope:** 1 sprint (~20 files)
> **Depends on:** Hub infra, Module 8 (stance), Module 2 (policy)
> **Route:** `/ai-literacy/assignments`

---

## Context

62% of DUS respondents want assignment redesign help. Traditional homework, take-home essays, and research papers are "routinely AI-completable." Faculty know this but lack structured support for redesigning without starting from scratch.

## Features

### Feature 1: Assignment AI Vulnerability Scanner
Faculty paste an assignment prompt OR select an existing assignment → Claude Haiku analyzes it for:
- AI completability score (0-100)
- Specific vulnerabilities (e.g., "generic prompt easily answered by AI", "no process visibility", "output-only assessment")
- Bloom's taxonomy level assessment

### Feature 2: Redesign Suggestion Engine
For each vulnerability, offer 2-3 concrete alternatives:
- Add process checkpoints (draft → revision → defense)
- Add in-class component (presentation, oral exam, peer review)
- Add reflection/metacognition layer
- Shift Bloom's level (Remember→Analyze, Apply→Evaluate)
Each suggestion has effort rating (low/medium/high) and example text.

### Feature 3: Before/After Preview
Side-by-side view showing original assignment vs. redesigned version with highlighted changes.

### Feature 4: Template Library
Pre-built redesign templates by assignment type:
- Take-home essay → Process portfolio
- Problem set → In-class + take-home hybrid
- Research paper → Staged submission with checkpoints
- Group project → Individual accountability layers

## Key Files

| File | Purpose |
|------|---------|
| `app/(pages)/ai-literacy/assignments/page.tsx` | Main page |
| `app/components/ai-literacy/AssignmentScanner.tsx` | Paste/select + scan UI |
| `app/components/ai-literacy/VulnerabilityReport.tsx` | Scan results display |
| `app/components/ai-literacy/RedesignSuggestions.tsx` | Suggestion cards |
| `app/components/ai-literacy/RedesignTemplates.tsx` | Template library |
| `app/lib/assignment-redesign-service.ts` | Haiku analysis + suggestions |
| `app/api/ai-literacy/assignments/scan/route.ts` | POST scan assignment |

## Acceptance Criteria

- [ ] Faculty can paste assignment text OR select existing assignment to scan
- [ ] Haiku returns vulnerability score + specific vulnerabilities
- [ ] Each vulnerability has 2-3 redesign suggestions with effort ratings
- [ ] Template library shows pre-built redesigns by type
- [ ] Before/after preview for redesigned assignments
- [ ] Sandy tool `analyze_assignment_ai_risk` works
- [ ] Mobile responsive
