# Hub Overhaul — Execution Plan & Handoff Prompts

> **Total phases:** 12 (Hub: P1-P6, Workshop Tools: W1-W6)
> **Constraint:** Max 2 tasks per phase. Each phase generates the next handoff prompt.

---

## Phase Sequence

### Hub Overhaul (P1-P6)

| Phase | Task A | Task B |
|-------|--------|--------|
| **P1** | Hero section expansion (4→8 cards, 2-tier layout) | Playground Templates deep-link support (`?template=`) |
| **P2** | Remove 3 redundant portal CTAs | Fix search to index hero items |
| **P3** | Reorder Tier 2 tools to bottom of sections | Degree Plan AI suggestion banner + API |
| **P4** | Bounties trending summary + API | Datasets inline preview |
| **P5** | Apps Gallery Staff Pick badges | Workshop tab update (new array + status badges) |
| **P6** | Detail page: extract shared overview component | Detail page: verify all hero-linked pages load clean |

### Workshop Tools (W1-W6)

| Phase | Task A | Task B |
|-------|--------|--------|
| **W1** | Shared workshop infrastructure (`lib/workshop/index.ts`, API routes) | Shared `[slug]/page.tsx` chat page |
| **W2** | Grant Finder config + system prompt | Space Optimizer config + system prompt |
| **W3** | Grant Writing Assistant config + dedicated upload page | Grant Writing Assistant upload API |
| **W4** | Faculty Command Center config + system prompt | Command Center dashboard page layout |
| **W5** | Command Center data APIs (deadlines, course-health, students) | Command Center AI chat sidebar |
| **W6** | Hub Workshop tab integration (link new tools) | Workshop landing page (`app/workshop/page.tsx`) |

---

## Handoff Prompt: Phase P1

Copy and paste this into a new Claude Code instance to begin execution:

```markdown
## Context

You are continuing the Hub Overhaul for "The Sandbox" — an AI-powered educational marketplace at `c:\AA Code\Educator marketplace\the-sandbox\`.

**Architecture docs:**
- Hub overhaul: `c:\AA Code\Educator marketplace\Blueprints\HUB-OVERHAUL-ARCHITECTURE.md`
- Workshop tools: `c:\AA Code\Educator marketplace\Blueprints\WORKSHOP-TOOLS-ARCHITECTURE.md`
- Full execution plan: `c:\AA Code\Educator marketplace\Blueprints\HUB-OVERHAUL-EXECUTION-PLAN.md`

**Always read first:** `c:\AA Code\Educator marketplace\the-sandbox\CLAUDE.md` for project constraints (Tailwind v4, Prisma v7, lucide-react only, auth guards, etc.)

**What has been completed so far:** Phase 1 spec locked, architecture documents written, demo playbook created. No code changes yet.

## The Goal — Phase P1 (2 tasks only, then STOP)

### Task 1: Hero Section Expansion (4 → 8 cards)

**File:** `app/hub/page.tsx`

Replace the current "Featured Experience" section (lines 589-654) with an 8-card hero showcase in a 2-tier layout:

**Tier A — "Headline Experiences" (top row, 2 large cards):**
1. The Bracket (`/bracket`) — Trophy icon, amber theme
2. Cardiac Arrest Simulator (`/playground-templates?template=cardiac-arrest`) — Heart icon, red theme

**Tier B — "Featured Tools" (bottom row, 6 compact cards):**
3. Debate Arena (`/debate`) — Gavel icon, blue
4. Quiz Bowl Blitz (`/quiz-bowl`) — Zap icon, yellow
5. Case Pitch (`/pitch`) — Briefcase icon, emerald
6. Moot Court (`/playground-templates?template=moot-court`) — Gavel/Scale icon, indigo
7. Ask Wil (`/student-services/academic-advisor`) — GraduationCap icon, purple
8. UKNow (`/uknow`) — Newspaper icon, sky

**Layout:**
- Top row: `grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4` — large horizontal cards with size-16 icons, `text-lg font-extrabold` titles
- Bottom row: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3` — compact vertical cards with size-10 icons

Define a `HERO_ITEMS` array with the `HeroItem` interface from the architecture doc. Keep the existing section header "Featured Experiences".

**Technical approach:**
- Define `HeroItem` interface and `HERO_ITEMS` const at the top of the file (near the existing `HubTool` interface)
- Replace the JSX block between lines 589-654 with the new 2-tier grid
- Each card is a `<Link>` with hover effects matching existing style: `hover:shadow-md hover:-translate-y-0.5`
- Headline cards get `hover:shadow-lg hover:-translate-y-1` for more dramatic effect
- Use lucide-react icons only. All icons are already imported or available.

### Task 2: Playground Templates Deep-Link

**File:** Find the playground templates page (likely `app/playground-templates/page.tsx` or similar)

Add support for `?template=cardiac-arrest` and `?template=moot-court` query params:
- Read `searchParams.get('template')` on mount
- Find the matching template by slug
- Auto-scroll to it and give it a visual highlight (blue ring)
- Optionally auto-expand/launch it

**Technical approach:**
- Use `useSearchParams()` hook
- Add `id={`template-${template.slug}`}` to each template card
- On mount, if `template` param exists, scroll into view with `scrollIntoView({ behavior: 'smooth' })`
- Add a temporary highlight class: `ring-2 ring-[#0033A0]`

## The Next Link

After completing both tasks, verify the page renders correctly. Then generate a new handoff prompt for **Phase P2** following the same format. Phase P2 tasks are:
- Task 1: Remove the 3 redundant portal CTAs (lines 768-825 of hub/page.tsx — Campus Navigator CTA, Research Hub CTA, Try a Template CTA)
- Task 2: Fix the search index to include hero items in the `filteredCards` memo (lines 452-465)

Include the same Context section, updated to reflect what P1 completed, and provide specific file/line references for P2.
```

---

## Notes for Subsequent Handoff Prompts

Each handoff prompt follows the same structure:
1. **Context** — Architecture docs, CLAUDE.md, what's been completed
2. **The Goal** — Exactly 2 tasks with specific files, lines, and technical approach
3. **The Next Link** — Instructions to generate the next handoff prompt with P(N+1) tasks

The executing instance should:
- Read the architecture doc for full spec
- Read CLAUDE.md for constraints
- Execute exactly 2 tasks
- Verify the build compiles (`npx tsc --noEmit`)
- Generate the next handoff prompt
- STOP

---

## Phase P2 Tasks (for reference)

**Task 1:** Remove lines 768-825 from `app/hub/page.tsx` — the 3 portal CTAs (Campus Navigator, Research Hub, Try a Template).

**Task 2:** Update the `filteredCards` memo (lines 452-465) to also search `HERO_ITEMS` by label and tagline. Deduplicate results where a hero item also appears in an accordion section.

---

## Phase P3 Tasks (for reference)

**Task 1:** Reorder the tools arrays in `ACADEMIC_PLANNING`, `COMMUNITY_RESOURCES`, etc. so that Tier 2 items (Degree Planner, Bounty Board, Community Datasets, Public App Gallery) appear last in their respective section arrays.

**Task 2:** Add AI course suggestion to `/degree-plan`:
- New API route: `app/api/degree-plan/suggestions/route.ts` — auth `requireRequestUser`, fetch student's courses, call Haiku for 2-3 suggestions, return JSON
- New UI: Dismissible blue banner at top of `app/degree-plan/page.tsx` showing AI suggestions

---

## Phase P4 Tasks (for reference)

**Task 1:** Add trending summary to `/bounties`:
- New API route: `app/api/bounties/trending/route.ts` — fetch top 5 open bounties, call Haiku to generate 2-sentence summary
- Add gradient card at top of `app/bounties/page.tsx` showing the summary

**Task 2:** Add inline data preview to `/datasets`:
- In `app/datasets/page.tsx`, add an expandable "Preview" section to each dataset card
- Show 3-5 sample data rows in a compact table (data can be hardcoded per dataset)

---

## Phase P5 Tasks (for reference)

**Task 1:** Add Staff Pick badges to `/apps`:
- In `app/apps/page.tsx`, define a `STAFF_PICKS` set of app IDs (hardcoded 3-5 picks)
- Render a "⭐ Staff Pick" badge on matching cards
- Sort staff picks to top of default view

**Task 2:** Update Workshop tab in `app/hub/page.tsx`:
- Replace `COMING_SOON_TOOLS` array with new 8-item array (4 new + 4 retained)
- Add `status: 'building' | 'planned'` field to `ComingSoonTool` interface
- Update rendering to show blue "In Development" badge for `building` and gray "Planned" for `planned`

---

## Phase P6 Tasks (for reference)

**Task 1:** In `app/tools/[id]/page.tsx`, extract the duplicate student/non-student overview JSX (two near-identical blocks) into a shared component. Accept `isStudent: boolean` prop.

**Task 2:** Verify every hero-linked page loads without errors:
- `/bracket`, `/debate`, `/quiz-bowl`, `/pitch`
- `/playground-templates?template=cardiac-arrest`, `/playground-templates?template=moot-court`
- `/student-services/academic-advisor`, `/uknow`
- Fix any missing imports, broken links, or empty states.

---

## Phase W1 Tasks (for reference)

**Task 1:** Create shared workshop infrastructure:
- `app/lib/workshop/index.ts` — `WorkshopTool` interface, registry, `getWorkshopTool()` function
- `app/api/workshop/route.ts` — streaming chat endpoint (follows Research Hub pattern)
- `app/api/workshop/upload/route.ts` — file upload endpoint with PDF extraction

**Task 2:** Create shared `app/workshop/[slug]/page.tsx`:
- Full-height chat page following Research Hub `[slug]/page.tsx` pattern
- Support `tool.supportsUpload` — show file attach button if true
- Welcome message, starter questions, ReactMarkdown rendering, mic support

---

## Phase W2 Tasks (for reference)

**Task 1:** Create `app/lib/workshop/grant-finder.ts` — full config with system prompt, verify it renders via `[slug]` page at `/workshop/grant-finder`.

**Task 2:** Create `app/lib/workshop/space-optimizer.ts` — full config with system prompt including simulated room inventory data, verify at `/workshop/space-optimizer`.

---

## Phase W3 Tasks (for reference)

**Task 1:** Create `app/lib/workshop/grant-writer.ts` — config with system prompt for document-in/document-out grant writing.

**Task 2:** Create dedicated `app/workshop/grant-writer/page.tsx` — two-pane layout (upload pane + chat pane). Support multi-file upload (CV + RFP). Show document analysis summary after both files uploaded.

---

## Phase W4 Tasks (for reference)

**Task 1:** Create `app/lib/workshop/faculty-command-center.ts` — config with system prompt referencing injected context.

**Task 2:** Create dedicated `app/workshop/faculty-command-center/page.tsx` — dashboard layout (left 2/3 dashboard, right 1/3 AI chat). Show Upcoming Deadlines, Course Health, Quick Actions sections. Integration status badges for Outlook/SharePoint ("coming soon").

---

## Phase W5 Tasks (for reference)

**Task 1:** Create 3 data API routes for Command Center:
- `app/api/workshop/command-center/deadlines/route.ts`
- `app/api/workshop/command-center/course-health/route.ts`
- `app/api/workshop/command-center/students/route.ts`

**Task 2:** Wire the dashboard to fetch from these APIs on mount. Wire the AI chat sidebar to include dashboard data in the system prompt context.

---

## Phase W6 Tasks (for reference)

**Task 1:** Update Hub Workshop tab to link to the 4 new tools:
- Change the 4 "building" status cards from non-interactive to clickable `<Link>` elements
- Link to: `/workshop/grant-finder`, `/workshop/space-optimizer`, `/workshop/grant-writer`, `/workshop/faculty-command-center`

**Task 2:** Create `app/workshop/page.tsx` — landing page showing all 4 tools with descriptions, status badges, and links. Follow Research Hub hub page pattern.
