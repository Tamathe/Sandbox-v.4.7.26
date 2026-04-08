# Build & Tools Reference

> **Claude Code reference doc** -- extracted from the project's CLAUDE.md for on-demand lookup when working on build/tool-related features. Not the source of truth; defer to `the-sandbox/CLAUDE.md` if anything conflicts.

---

## Build Hub (`/build`) -- Tool Authoring Experience

The Build page is the primary authoring surface for educators and students to create AI learning tools. Five tabs: **Create | My Drafts | Requests | Playground | Import**.

### Create tab layout (top to bottom)

1. **Progress bar** -- 4-step: Describe > Refine > Review > Publish (`BuildProgressBar.tsx`)
2. **Hero prompt** -- role-adaptive textarea ("What experience do you want to create?" / "Build a study tool"). Evaluator mode shows 3 preset prompt chips instead.
3. **Tool type picker** -- 4x2 grid of 8 tool types imported from `BuilderChatPanel.TOOL_TYPES`: Chatbot Tutor, Simulation, Debate Partner, Adaptive Quiz, Mock Interview, Writing Coach, Case Analyzer, Auto-Grader. Click opens builder pre-filled.
4. **Start from learning outcomes** -- educator/admin only. Text input for desired learning outcome; AI recommends best tool type and builds backward-design-aligned experience. Emerald accent, `Target` icon.
5. **Course Build Workspace** -- select a course > "Find what's missing" AI gap analysis > suggestion cards with "Build with AI" links
6. **Branching flow** -- 3-question wizard ("Not sure where to start?"): activity > structure > length > matched templates (`BuildBranchingFlow.tsx`)
7. **Playground + Template CTAs** -- two cards linking to `/playground` and `/hub`

### Builder panel

Slide-up full-screen panel (`BuilderLayout.tsx`). Left: chat with Sandy (`BuilderChatPanel.tsx`); Right: tabbed Preview/Details/Files. Spec completeness scoring (name 25 + systemPrompt 35 + welcome 20 + starters 20). Confetti on first build. Course linking post-build. `beforeunload` guard on unsaved work.

### Key files

| File | Purpose |
|---|---|
| `app/build/page.tsx` | Build page (5-tab layout) |
| `app/components/BuilderLayout.tsx` | Full-screen builder panel |
| `app/components/BuilderChatPanel.tsx` | Sandy chat panel (left side of builder) |
| `app/components/BuildBranchingFlow.tsx` | 3-question "Not sure where to start?" wizard |
| `app/components/BuildProgressBar.tsx` | 4-step progress indicator |
| `app/lib/builder-service.ts` | Tool builder business logic |

---

## Tool Elevation (Sandy Interview Mode) -- 16/16 Complete

All 16 collection tools elevated from form-based to Sandy Interview Mode with three standards:

1. **Sandy Interview Mode** -- conversational guided flow replaces blank forms; split-panel layout (output left 7 cols, Sandy right 5 cols)
2. **Smart Preloading** -- `/api/{collection}/{tool}/preflight` pattern; aggregates user profile, entries, courses before render; Sandy never re-asks known info
3. **Quick-Reply Chips** -- `<!--CHIPS:[...]-->` in Sandy's stream rendered as `ChipBar` pill buttons; `<!--PHASE:name-->` markers drive client state machine

### Shared components

| Component | Purpose |
|---|---|
| `app/components/SandyInterviewPanel.tsx` | Right-panel chat with messages, chips, typing indicator, step dots |
| `app/components/ChipBar.tsx` | Quick-reply pill buttons (disappear after use) |
| `app/components/StepIndicator.tsx` | Dot-based progress indicator |

### Write Room (4/4)

**Tools:** Resume Builder, Cover Letter, Email Rewriter, LinkedIn Optimizer

- Per-tool hooks (`useResumeBuilder.ts`, `useCoverLetterInterview.ts`, `useEmailRewriter.ts`, `useLinkedInOptimizer.ts`)
- Per-tool services + preflight files
- 4 API routes each: `{preflight, generate, interview, refine}`
- `[slug]/page.tsx` redirects all 4 slugs to dedicated pages

### Meeting Machine (4/4)

**Tools:** Agenda Builder, Minutes Taker, Action Items, Follow-up Drafter

- Shared hook: `app/hooks/useMeetingMachineTool.ts`
- Shared service: `app/lib/meeting-machine-elevation-service.ts`
- Shared preflight: `app/lib/meeting-machine-preflight.ts`
- Cross-tool pipeline via sessionStorage

### Wellness Hub (4/4)

**Tools:** Mindfulness Coach, Habit Tracker, Sleep Log, Symptom Journal

- Shared hook: `app/hooks/useWellnessHubTool.ts`
- Shared service: `app/lib/wellness-hub-elevation-service.ts`
- Shared preflight: `app/lib/wellness-hub-preflight.ts`
- 12 API routes: `app/api/wellness-hub/{mindfulness,habits,sleep,journal}/{preflight,interview,generate}`
- 4 pages: `app/wellness-hub/{mindfulness,habits,sleep,journal}/page.tsx`
- Crisis detection (UK Counseling + 988 + Crisis Text Line) in all 4 prompts
- Old form-based `[slug]/page.tsx` still works as fallback

### Data Desk (4/4)

**Tools:** Chart Explainer, Survey Analyzer, Report Summarizer, Presentation Outliner

- Shared hook: `app/hooks/useDataDeskTool.ts`
- Shared service: `app/lib/data-desk-elevation-service.ts` (framing-aware: same data > different analysis angle)
- Shared preflight: `app/lib/data-desk-preflight.ts`
- 12 API routes: `app/api/data-desk/{chart-explainer,survey-analyzer,report-summarizer,presentation-outliner}/{preflight,interview,generate}`
- 4 pages with per-tool input types: image drop, text paste, PDF drop, Sandy interview
- Dynamic section headers change based on framing choice (understand / support-argument / find-flaws / teach / hypothesis / etc.)

### Architecture docs

Per-tool `*-ELEVATION-ARCHITECTURE.md` files at repo root for Write Room + Meeting Machine; v1 docs `DATA-DESK-ARCHITECTURE.md` + `WELLNESS-HUB-ARCHITECTURE.md` for remaining collections.

---

## Portfolio / Import App (BYOA)

Students and faculty can import their own deployed web apps as first-class tool cards. The `PORTFOLIO` tool type opens in a new tab (no chat interface).

| Component | Location |
|---|---|
| Import form | `app/components/ImportAppForm.tsx` -- on Build page (`/build?tab=import`) |
| API route | `app/api/tools/import/route.ts` -- `POST`, validates HTTPS, creates Tool |
| Service | `app/lib/portfolio-import-service.ts` -- approval routing (students > PENDING, faculty > APPROVED) |
| Seed data | `prisma/seed-portfolio-apps.ts` -- 4 demo apps |

**Schema additions:** `Tool.techStack` (string[]), `Tool.repoUrl` (string?), `Tool.isPortfolio` (boolean), `ToolType.PORTFOLIO` enum value.

**ToolCard badges:** "Student Project" (green) or "Faculty Project" (blue) based on `creator.role` when `isPortfolio === true`.

---

## Playground Templates (18 total)

Self-contained HTML/React/Tailwind apps in `app/lib/playground-templates/`. Each exports `TEMPLATE_META` + `TEMPLATE_HTML`. Loaded via `?template=<key>&warm=true`.

| Key | Title | Category |
|---|---|---|
| `cardiac-arrest` | ACLS Cardiac Arrest Simulator | simulation |
| `pediatric-sepsis` | Pediatric Sepsis Triage | simulation |
| `moot-court` | Constitutional Law Moot Court | quiz |
| `lab-safety` | Chemistry Lab Safety Walkthrough | simulation |
| `budget-allocation` | University Budget Allocation | dashboard |
| `ear-training` | Music Theory Ear Training | training |
| `circuit-simulator` | Interactive Circuit Simulator | simulation |
| `molecular-viewer` | 3D Molecular Viewer | simulation |
| `physics-sandbox` | Physics Sandbox (3 modes) | simulation |
| `drug-interaction` | Drug Interaction Checker | dashboard |
| `vitals-dashboard` | Patient Vitals Dashboard | simulation |
| `startup-financial-model` | Startup Financial Model | dashboard |
| `supply-chain` | Supply Chain Disruption Visualizer | simulation |
| `case-brief-builder` | Case Brief Builder (IRAC) | quiz |
| `statute-annotator` | Statute Annotator | training |
| `timeline-builder` | Interactive Timeline Builder | dashboard |
| `poetry-meter` | Poetry Meter & Rhyme Analyzer | training |
| `event-budget-planner` | Student Org Event Budget Planner | dashboard |
