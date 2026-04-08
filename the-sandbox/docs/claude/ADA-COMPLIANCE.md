# ADA Compliance Automation Reference Doc

> **Claude Code reference document** extracted from the project's `CLAUDE.md`.
> Read this file when working on accessibility scanning, remediation, compliance dashboard, or ADA-related features.

---

## ADA Compliance Automation (7 Phases, All Built 2026-03-30)

Full-stack accessibility pipeline. Every content creation touchpoint has an AI accessibility layer. Patent-relevant.

| Phase | What | Key Files |
|---|---|---|
| 1. Alt-Text | Claude Vision generates alt text for images | `app/lib/accessibility/alt-text-service.ts`, `app/api/accessibility/alt-text/` |
| 2. Transcripts | Audio scripts persisted as captions | `app/components/accessibility/TranscriptPanel.tsx` |
| 3. Readability | Flesch-Kincaid scoring, jargon detection, AI simplification | `app/lib/accessibility/readability-service.ts`, `app/api/accessibility/readability/` |
| 4. Doc Scanner | Heading structure, tables, images, links, WCAG-mapped issues | `app/lib/accessibility/document-scanner.ts`, `app/api/accessibility/scan/` |
| 5. Contrast | WCAG AA color contrast for Playground apps | `app/lib/accessibility/contrast-checker.ts`, `app/api/accessibility/contrast/` |
| 6. Dashboard | University-wide compliance metrics, department breakdown, trends | `app/lib/accessibility/compliance-aggregator.ts`, `app/ada-tool/page.tsx` (Dashboard tab) |
| 7. Remediation | AI auto-fix headings/readability/structure with before/after review | `app/lib/accessibility/remediation-service.ts`, `app/api/accessibility/remediate/` |

---

## Key Entry Points

- **ADA Tool page**: `/ada-tool` -- single-page scan+fix flow for educators (`app/ada-tool/page.tsx`). Tabbed UI: Scan & Fix + Compliance Dashboard.
- **Types**: `app/lib/accessibility/types.ts` -- all shared interfaces
- **Prisma model**: `AccessibilityReport` (polymorphic: course_material / tool / playground_app / audio_episode)

---

## Sandy Integration

**Sandy tools (6):**
| Tool | Purpose |
|---|---|
| `generate_alt_text` | Generate alt text for an image using Claude Vision |
| `check_readability` | Run Flesch-Kincaid scoring and jargon detection |
| `check_contrast` | WCAG AA color contrast check for Playground apps |
| `accessibility_scan` | Full document scan (headings, tables, images, links, WCAG issues) |
| `compliance_report` | University/department/course compliance metrics |
| `remediate_content` | AI auto-fix with before/after review |

---

## Platform Integrations

- **Builder Ready Gate**: Criterion 8 checks systemPrompt readability at/below grade 14
- **Upload hook**: PDF uploads auto-trigger background accessibility scan (`app/api/upload/course-material/route.ts`)
- **Proactive nudges**: `readability-gap` + `accessibility-issues-pending` in `proactive-suggestions.ts`
- **Hub placement**: #1 featured hero card for all roles. ADA Compliance swim lane removed (2026-03-31) -- all functionality consolidated into `/ada-tool` with tabbed UI. `/accessibility-compliance` redirects to `/ada-tool?tab=dashboard`

---

## Data Flow

Educator pastes text or uploads PDF --> `/ada-tool` --> `document-scanner.ts` (local heuristics + Haiku AI) --> WCAG 2.1 AA report --> one-click `remediation-service.ts` (headings, readability, structure) --> copy/download accessible version. Dashboard tab on same page aggregates all reports (university/department/course scope).
