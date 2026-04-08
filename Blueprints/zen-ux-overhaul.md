# Zen UX Overhaul — Deep Architecture Plan

A comprehensive UX audit and redesign of The Sandbox, targeting cognitive load reduction, friction elimination, and delight. This blueprint covers 15 audit findings across three phases: Friction Hunting, Zen Pass, and Awesome Factor.

**Scope:** Frontend-only. Zero schema changes. Zero new API routes (except one optional recommendations wire-up). All changes are in existing `.tsx` files + `globals.css`.

**Build validation after every phase:** `npm run lint && npx tsc --noEmit && npm run build`

---

## Existing Infrastructure Inventory

### Files Modified (Primary)

| File | Current State | What Changes |
|---|---|---|
| `app/lib/auth-context.tsx` | 6 demo users in `DEMO_USERS` array (lines 14–63) | Reduce to 3 users (1 admin, 1 educator, 1 student) |
| `app/components/Header.tsx` | ~584 lines; avatar dropdown renders all `DEMO_USERS` + 18 quick-access links + demo-mode section | Slim dropdown to 5 items; demo switcher becomes separate modal |
| `app/hub/page.tsx` | Two-tab hub; Campus Resources has 6 sections + 11 Coming Soon cards (lines 273–347, rendered 597–631) | Move Coming Soon to new "Workshop" tab; add search to Campus Resources |
| `app/components/ToolsBrowser.tsx` | 7 filtering dimensions (category tabs, sub-categories, search, sort, type, difficulty, audio) | Collapse to 2 primary (search + category); lead with recommendations; hide advanced |
| `app/components/ToolCard.tsx` | Compact card with emoji + border accent + "Open →" | Add quick-launch button; remove emoji from compact mode |
| `app/components/ToolLaunchModal.tsx` | Confirmation modal before tool launch | Delete entirely (zero-risk action doesn't need confirmation) |
| `app/page.tsx` | Student home: 6–8 sections; educator home: 6 sections | Collapse secondary sections; improve empty states; add session context to Jump Back In |
| `app/components/ClientProviders.tsx` | Sandy proactive on 8s fixed timer | Change to scroll-idle trigger (3s no-scroll) |
| `app/components/ConciergePanel.tsx` | Informational proactive messages | Add personality micro-moments (time/score-aware) |
| `app/courses/[id]/page.tsx` (or equivalent course detail) | 8–12 tabs per role | Consolidate to 5 tabs max |
| `app/globals.css` | Base styles, scrollbar, prose | Add fade transition utility; adjust spacing variables |

### Files Deleted

| File | Reason |
|---|---|
| `app/components/ToolLaunchModal.tsx` | F4: Launch modal removed; quick-launch replaces it |

### Key Constants & Variables

| Name | Location | Current Value | New Value |
|---|---|---|---|
| `DEMO_USERS` | `auth-context.tsx:14` | 6 entries (admin, 2 educators, 2 students, registrar) | 3 entries (admin, 1 educator, 1 student) |
| `COMING_SOON_TOOLS` | `hub/page.tsx:273` | 11 items rendered inline in Campus Resources tab | Moved to "Workshop" tab |
| `CATEGORY_MAPPING` | `ToolsBrowser.tsx` | 4 top-level + conditional sub-categories | Keep 4 top-level; remove sub-categories |

---

## Phase 0 — Demo User Reduction (F1)

### Task ZEN-00: Reduce DEMO_USERS to 3

**File:** `app/lib/auth-context.tsx`

Remove Hubie Ballard (EDUCATOR), Tiana The (STUDENT), and Sara Registrar (REGISTRAR) from the `DEMO_USERS` array. Keep:

```typescript
export const DEMO_USERS: DemoUser[] = [
  {
    id: 'user-admin',
    name: 'Alex Thompson',
    email: 'admin@uky.edu',
    role: 'ADMIN',
    department: 'Center for AI and Academics Innovation',
    college: 'CATS-AI',
  },
  {
    id: 'user-price',
    name: 'Heath Price',
    email: 'heath.price@uky.edu',
    role: 'EDUCATOR',
    department: 'College of Engineering',
    college: 'College of Engineering',
  },
  {
    id: 'user-mcclure-student',
    name: 'Ian McClure',
    email: 'ian.mcclure.student@uky.edu',
    role: 'STUDENT',
    department: 'J. David Rosenberg College of Law',
    college: 'J. David Rosenberg College of Law',
  },
]
```

**Note:** The `REGISTRAR` role type stays in the `DemoUser` type union — those users still exist in the DB and the role is still valid. We're only removing them from the quick-switch list.

### Task ZEN-01: Slim the Header Dropdown

**File:** `app/components/Header.tsx`

**Desktop dropdown (lines ~287–308 area):** The demo user list now shows only 3 users. No code change needed beyond ZEN-00 since it iterates `DEMO_USERS`.

**Quick Access links:** Reduce from 18 to 5 max:
- My Courses → `/courses`
- My Library → `/library` (students) / Research Hub → `/research-hub` (educators/admins)
- Analytics → role-appropriate analytics page
- Settings (placeholder)
- Sign Out (placeholder)

Move all other links (Portfolio, My Apps, Publish, Service Bots, Registrar Portal, etc.) to a dedicated `/settings` or `/more` page, or rely on existing nav items that already reach these destinations.

**Mobile menu (lines ~527–550 area):** Same reduction. Show only: primary nav items + 3-user switcher + notifications. Remove the duplicated Quick Access section entirely.

---

## Phase 1 — Hub Restructure (F2)

### Task ZEN-02: Add "Workshop" Tab to Hub

**File:** `app/hub/page.tsx`

Convert the hub from 2 tabs to 3 tabs:
1. **Campus Resources** (default, `?tab=campus-resources`) — existing service sections, minus Coming Soon
2. **Tools** (`?tab=tools`) — existing ToolsBrowser, unchanged
3. **Workshop** (`?tab=workshop`) — new tab for half-built / coming-soon tools

Move `COMING_SOON_TOOLS` array rendering from the Campus Resources tab into the Workshop tab. Update the styling:
- Remove `opacity-50 cursor-default select-none` — these should look like real cards, just with a "Coming Soon" or "In Development" badge
- Add a brief intro paragraph: "Tools that are in development or not yet ready for the full platform. Check back soon."
- Keep the Lock icon but make it a small badge, not the dominant visual
- Keep the audience tags (Research, Faculty, Students, Everyone, Admin)

Update the tab strip ARIA attributes to include the third tab. Update `?tab=` query param handling to support `workshop`.

### Task ZEN-03: Add Search to Campus Resources Tab

**File:** `app/hub/page.tsx`

Add a search input at the top of the Campus Resources tab (above the first section). Filter service cards by `label` and `description` fields. Use the same search pattern as ToolsBrowser (debounced 300ms, `text-sm` input with Search icon).

When search is active, flatten all sections into a single results list (don't show section headers for filtered results). Show "No services match your search" empty state when 0 results.

### Task ZEN-04: Collapse Service Sections into Accordions

**File:** `app/hub/page.tsx`

Each of the 6 service sections currently renders all cards expanded. Change to an accordion pattern:
- Section header shows: icon + title + card count badge (e.g., "Student Support Services (6)")
- First section starts expanded; all others collapsed by default
- Click header to toggle expand/collapse with a ChevronDown → ChevronUp rotation
- Smooth height transition (200ms ease)

This reduces the initial visible elements from ~45 to ~6 section headers + 1 expanded section's cards.

---

## Phase 2 — ToolsBrowser Simplification (F3)

### Task ZEN-05: Lead with Recommendations

**File:** `app/components/ToolsBrowser.tsx`

Before the filter bar and tool grid, add a "Recommended for You" section (only for STUDENT role). Call `GET /api/recommendations` (already exists) and render up to 4 tool cards in a horizontal row with a subtle blue-tinted background (`bg-blue-50/50 rounded-2xl p-4`). Each card shows the `reason` string from the API in italic `text-xs text-gray-500`.

If the API returns 0 recommendations or the user is not a student, skip the section entirely.

### Task ZEN-06: Collapse Advanced Filters

**File:** `app/components/ToolsBrowser.tsx`

**Keep visible:**
- 4 top-level category tabs (All, Academic, Campus Services, Creative)
- Search input
- Sort dropdown

**Remove entirely:**
- Sub-category conditional pills (the secondary row that appears when a top-level category is selected)
- The "Filters" button and its collapsible advanced panel (tool type, difficulty, audio toggle)

If advanced filtering is still desired later, it can be re-added behind a single "More filters" link. For now, search + category + sort covers 95% of use cases.

Update the "Clear" button to only appear when search has text or category is not "All".

---

## Phase 3 — Quick Launch (F4)

### Task ZEN-07: Add Quick Launch Button to ToolCard

**File:** `app/components/ToolCard.tsx`

In compact mode, add a small play button (Play icon, `size-4`) to the right side of the footer row (next to "Open →"). On click, navigate directly to the tool's chat interface (same as what the launch modal's "Launch Tool" button does).

The "Open →" text link remains and navigates to the detail page. The play button is the fast path.

Styling: `rounded-full bg-[#0033A0] text-white size-7 flex items-center justify-center hover:bg-[#002580] transition-colors`. Use `e.preventDefault()` + `e.stopPropagation()` on the button click to prevent the parent `<Link>` from firing.

### Task ZEN-08: Remove ToolLaunchModal

**Files:** `app/components/ToolLaunchModal.tsx` (delete), all consumers

Find all imports of `ToolLaunchModal` and remove them. The tool detail page's "Launch" button should navigate directly to the tool's chat interface (or open in new tab for EXTERNAL type) without a confirmation modal.

Search for `ToolLaunchModal` across the codebase and clean up all references.

---

## Phase 4 — Course Tab Consolidation (F5)

### Task ZEN-09: Consolidate Course Tabs from 12 → 5

**File:** Course detail page (likely `app/courses/[id]/page.tsx` or the component rendering tabs on `/courses`)

**New tab structure:**

| Tab | Merges | Visible To |
|---|---|---|
| **Overview** | Materials + Learning Path + Progress | Everyone |
| **Tools** | Tools (unchanged) | Everyone |
| **Assignments** | Assignments + Submissions + My Grades + Gradebook | Everyone (content varies by role) |
| **Discussion** | Discussion (unchanged) | Everyone |
| **Course Map** | Course Map + Analytics (educator-only content) | Educators/Admins only |

**Implementation approach:**
- The "Overview" tab renders MaterialsTab content at top, then a collapsible "Learning Path" section below, then a collapsible "Progress" section below that
- The "Assignments" tab renders AssignmentsTab for everyone; for students, includes a "My Grades" section below; for educators, includes the Gradebook section below
- The "Course Map" tab is educator-only and combines the existing CourseMapTab with any educator analytics
- Remove the Study tab (its functionality is covered by the CourseStudyPanel right-rail sidebar)
- Remove the Submissions tab (merged into Assignments)
- Remove the standalone Progress tab (merged into Overview)
- Remove the standalone My Grades tab (merged into Assignments)

**ARIA:** Maintain `role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`, `aria-labelledby` on the new reduced tab strip.

---

## Phase 5 — Spacing & Typography (Zen Pass: Z1–Z5)

### Task ZEN-10: Increase Grid Gaps and Section Spacing

**Files:** `app/hub/page.tsx`, `app/components/ToolsBrowser.tsx`, `app/page.tsx`

Global changes:
- All tool/service card grids: `gap-3` → `gap-5`
- Dashboard section spacing: `space-y-6` / `mb-4` → `space-y-10` with `border-t border-gray-100 pt-10` between major sections
- Hub section spacing: add `space-y-8` between accordion sections

### Task ZEN-11: Differentiate Border Weight

**Files:** `app/page.tsx`, various dashboard components

Apply this rule:
- **Interactive cards** (tools, services, courses — anything clickable): Keep `border-2 border-gray-200 rounded-2xl`
- **Informational sections** (stats strips, calendar, notes widget, vitals grid): Change to `border border-gray-100 rounded-2xl`

This creates a visual hierarchy: heavier borders = "click me," lighter borders = "read me."

### Task ZEN-12: Remove Emoji from Compact ToolCards

**File:** `app/components/ToolCard.tsx`

In compact mode (`compact={true}`), remove the `text-3xl` emoji from the card. The category-colored border already signals the category. Keep the emoji on the full detail page where there's room.

Replace the emoji space with nothing — let the title + description take up the full card height.

### Task ZEN-13: Typography Tier Reduction

**Files:** Multiple (global pass)

Audit all pages and standardize to 4 tiers:
- **Display:** `text-2xl font-extrabold text-gray-900` (page titles only)
- **Heading:** `text-base font-bold text-gray-900` (section headers, card titles)
- **Body:** `text-sm text-gray-500` (descriptions, content)
- **Meta:** `text-xs text-gray-400` (timestamps, counts)

Eliminate `text-[11px]` wherever it appears (replace with `text-xs`). Eliminate `text-lg` in card contexts (replace with `text-base font-bold`).

**Note:** This is a large pass. Prioritize the home dashboard, hub, and tools pages. Other pages can be cleaned up incrementally.

---

## Phase 6 — Sandy Improvements (F7 + A2)

### Task ZEN-14: Scroll-Idle Sandy Trigger

**File:** `app/components/ClientProviders.tsx`

Replace the fixed `setTimeout(8000)` for home proactive messages with a scroll-idle detector:
- On mount, set up a scroll listener on `window`
- Track `lastScrollTime` via ref
- Use a `setInterval(1000)` to check: if `Date.now() - lastScrollTime > 3000` (3 seconds of no scrolling) AND the proactive hasn't fired yet, fire it
- Clean up listeners on unmount
- Fallback: if user never scrolls at all, fire after 5s (shorter than current 8s)

### Task ZEN-15: Sandy Personality Micro-Moments

**File:** `app/lib/concierge-service.ts` (or wherever `getProactiveConfig` builds messages)

Add time-aware and context-aware personality lines to Sandy's proactive messages. These prepend a short personality line before the existing helpful content:

```typescript
const PERSONALITY_LINES: Record<string, string[]> = {
  '/build': ['What are we building today?', 'Ready when you are.'],
  '/courses': [
    new Date().getHours() >= 22 ? 'Burning the midnight oil? Let\'s make it count.' : '',
    'Need help finding something in your course?',
  ].filter(Boolean),
  '/': [
    new Date().getDay() === 1 ? 'New week. Clean slate. What\'s first?' : '',
    'Welcome back.',
  ].filter(Boolean),
}
```

Also: after a tool session with score > 90, Sandy's next proactive should include "That was a strong session. Seriously." (check `lastSessionScore` from the student intelligence context already injected into Sandy).

---

## Phase 7 — Delight Features (A1, A3, A4, A5)

### Task ZEN-16: "You Earned This Moment" Empty States

**File:** `app/page.tsx`

Update the student "Due Soon" section empty state from:
> "You're all caught up. Check your courses for upcoming work."

To a rotating message from this pool:
```typescript
const CAUGHT_UP_MESSAGES = [
  'Nothing due. You earned this moment.',
  'Clear skies ahead.',
  'Your future self thanks you.',
  'Zero deadlines. Take a breath.',
]
```

Pick one based on `Date.now() % CAUGHT_UP_MESSAGES.length` (stable per page load, changes daily).

Style: `text-gray-400 text-sm italic` with a subtle `Smile` icon (lucide-react) above the text.

### Task ZEN-17: Jump Back In with Session Context

**File:** `app/page.tsx`

In the "Jump Back In" section, add a single line of context below each tool name. Pull from the tool's most recent `ToolSession` data (already fetched by the dashboard API):
- If session has a `summary`: show first sentence of summary in `text-xs text-gray-400 italic line-clamp-1`
- If session has a `score`: show "Last score: {score}%" in `text-xs text-gray-400`
- If neither: show "Last used {formatDistanceToNow(session.endedAt)}" as fallback

### Task ZEN-18: Page Fade Transitions

**File:** `app/globals.css` + `app/layout.tsx` (or `ClientProviders.tsx`)

Add a CSS-only fade-in on the main content area. In `globals.css`:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-fade-in {
  animation: fadeIn 200ms ease-out;
}
```

Apply `className="page-fade-in"` to the `<main>` wrapper. Since Next.js App Router re-renders `children` on route change, this animation fires on each navigation.

**Note:** If this causes issues with streaming content or modals, scope it more narrowly (e.g., only on the `page.tsx` default export wrapper, not the layout).

### Task ZEN-19: Contextual Empty States

**Files:** `app/build/page.tsx` (My Drafts), `app/page.tsx` (Jump Back In), course discussion component

Update empty states to be specific and actionable:

| Surface | Current | New Copy | CTA |
|---|---|---|---|
| My Drafts (Build) | "No drafts yet" | "Your first tool is one prompt away." | Pre-filled example prompt (clickable, launches builder) |
| Jump Back In (no sessions) | "Tools you save will appear here" | "Pick a tool from your course page and it'll show up here next time." | Link to first enrolled course |
| Discussion (empty) | "No posts yet" | "Be the first to start a conversation." | Focus the reply textarea |
| Tool search (0 results) | "No tools match" (SearchX icon) | "No matches yet. Try a broader search or browse by category." | "Clear filters" button (already exists) |

---

## Phase 8 — Mobile & Breadcrumbs (F8, F9)

### Task ZEN-20: Breadcrumbs on Deep Pages

**File:** New component `app/components/Breadcrumb.tsx` + consumers

Create a lightweight breadcrumb component:

```tsx
interface BreadcrumbProps {
  items: { label: string; href?: string }[]
}
```

Renders as: `text-xs text-gray-400` with `ChevronRight` separators (`size-3`). Last item has no link (current page). Max 3 levels.

Add to:
- `/courses/[id]` pages: Home > Courses > {course.code}
- `/tools/[id]`: Home > Tools > {tool.name}
- `/analytics/*`: Home > Analytics > {page name}
- `/admin/*`: Home > Admin > {tab name}

Place above `PageHeader` in each page.

### Task ZEN-21: Mobile Nav Cleanup

**File:** `app/components/Header.tsx`

In the mobile slide-in menu:
- Show only: primary nav items (Home, Courses, Hub, Build, + role-specific items)
- Show user switcher (3 users)
- Show notification + message icons with badges
- Remove the entire "Quick Access" section
- Remove the "Demo Mode" explanation text (it's in the dropdown on desktop; mobile doesn't need it)

Target: mobile menu should fit on one screen without scrolling for any role.

---

## Constraints & Guardrails

- **No schema changes.** Everything is frontend.
- **No new API routes** except optionally wiring `/api/recommendations` into ToolsBrowser (it already exists).
- **Tailwind v4 only.** No `@apply`. Use `size-N` not `w-N h-N`.
- **lucide-react only** for icons.
- **`border-2 rounded-2xl`** on interactive cards (per PLATFORM-CONSISTENCY-MANIFEST). `border border-gray-100 rounded-2xl` on informational sections.
- **`max-w-6xl mx-auto`** on all page containers.
- **ARIA accessibility** must be maintained on all tab strips, buttons, and interactive elements.
- **Do NOT rebuild gamification** (XP, Sand, Quests, Leagues) — Tier 4 prohibition.
- **REGISTRAR role** still exists in the type system and DB. We're only removing the registrar demo user from the quick-switch list.
- **Header auth guards** — all `requireRequestUser` guards in API routes are unaffected by this sprint.

---

## Task List

| ID | Phase | Task | Files |
|---|---|---|---|
| ZEN-00 | 0 | Reduce `DEMO_USERS` from 6 → 3 (admin, educator, student) | `app/lib/auth-context.tsx` |
| ZEN-01 | 0 | Slim Header dropdown: 5 quick-access links max; clean mobile menu | `app/components/Header.tsx` |
| ZEN-02 | 1 | Add "Workshop" tab to Hub; move `COMING_SOON_TOOLS` there | `app/hub/page.tsx` |
| ZEN-03 | 1 | Add search bar to Campus Resources tab | `app/hub/page.tsx` |
| ZEN-04 | 1 | Collapse service sections into accordions (6 headers, 1 expanded) | `app/hub/page.tsx` |
| ZEN-05 | 2 | Lead ToolsBrowser with "Recommended for You" section (STUDENT) | `app/components/ToolsBrowser.tsx` |
| ZEN-06 | 2 | Remove sub-category pills + advanced filter panel from ToolsBrowser | `app/components/ToolsBrowser.tsx` |
| ZEN-07 | 3 | Add quick-launch Play button to compact ToolCard footer | `app/components/ToolCard.tsx` |
| ZEN-08 | 3 | Delete `ToolLaunchModal.tsx`; remove all imports/references | `ToolLaunchModal.tsx` (delete), consumers |
| ZEN-09 | 4 | Consolidate course tabs from 8–12 → 5 | Course detail page/component |
| ZEN-10 | 5 | Increase grid gaps (`gap-3` → `gap-5`) and section spacing (`space-y-10`) | `hub/page.tsx`, `ToolsBrowser.tsx`, `page.tsx` |
| ZEN-11 | 5 | Differentiate border weight: interactive = `border-2`, informational = `border` | `page.tsx`, dashboard components |
| ZEN-12 | 5 | Remove emoji from compact ToolCards | `app/components/ToolCard.tsx` |
| ZEN-13 | 5 | Typography audit: eliminate `text-[11px]`, reduce to 4 tiers | Multiple files (home, hub, tools priority) |
| ZEN-14 | 6 | Replace 8s Sandy timer with scroll-idle trigger (3s no-scroll) | `app/components/ClientProviders.tsx` |
| ZEN-15 | 6 | Add Sandy personality micro-moments (time/score/page-aware) | `app/lib/concierge-service.ts` or proactive config |
| ZEN-16 | 7 | "You earned this moment" rotating empty state for Due Soon | `app/page.tsx` |
| ZEN-17 | 7 | Add session context line to Jump Back In cards | `app/page.tsx` |
| ZEN-18 | 7 | CSS page fade-in transition (200ms ease-out) | `app/globals.css`, layout wrapper |
| ZEN-19 | 7 | Contextual empty states across Build, Home, Discussion, Tools | `build/page.tsx`, `page.tsx`, discussion component |
| ZEN-20 | 8 | Breadcrumb component + wire to deep pages | New `Breadcrumb.tsx`, course/tool/analytics pages |
| ZEN-21 | 8 | Mobile nav cleanup: remove Quick Access, fit one screen | `app/components/Header.tsx` |

---

## Implementation Prompts

### Prompt 1 — Phase 0: ZEN-00 + ZEN-01

> Read `app/lib/auth-context.tsx`. Remove Hubie Ballard, Tiana The, and Sara Registrar from the `DEMO_USERS` array. Keep Alex Thompson (ADMIN), Heath Price (EDUCATOR), and Ian McClure (STUDENT). Do NOT change the `DemoUser` type — REGISTRAR stays in the union.
>
> Then read `app/components/Header.tsx`. In the desktop avatar dropdown, reduce "Quick Access" links to 5 max: My Courses (`/courses`), My Library or Research Hub (role-gated), Analytics (role-gated), Settings (placeholder `#`), Sign Out (placeholder `#`). Remove all other quick links. In the mobile slide-in menu, remove the entire Quick Access section and the "Demo Mode — View As" explanation text. Keep only: primary nav items, 3-user switcher, notification/message icons.
>
> Verify: `npm run lint && npx tsc --noEmit && npm run build`

### Prompt 2 — Phase 1: ZEN-02 + ZEN-03 + ZEN-04

> Read `app/hub/page.tsx`. Make these changes:
>
> 1. Add a third tab: "Workshop" (`?tab=workshop`). Update the tab strip (3 tabs now), ARIA attributes, and `useSearchParams` routing.
> 2. Move the `COMING_SOON_TOOLS` array rendering from the Campus Resources section into the Workshop tab. In Workshop, remove `opacity-50 cursor-default select-none` from cards. Add a brief intro: "Tools in development — not yet ready for the full platform." Keep Lock icon as a small badge and audience tags.
> 3. Add a search input above the Campus Resources sections. Debounce 300ms. Filter service cards by label + description. When searching, flatten sections into a single list.
> 4. Wrap each service section in an accordion: clickable header (icon + title + count badge + ChevronDown), first section expanded by default, others collapsed. Smooth 200ms height transition.
>
> Verify: `npm run lint && npx tsc --noEmit && npm run build`

### Prompt 3 — Phase 2: ZEN-05 + ZEN-06

> Read `app/components/ToolsBrowser.tsx`.
>
> 1. At the top of the component (before the filter bar), add a "Recommended for You" section visible only to STUDENT users. Fetch from `GET /api/recommendations`. Render up to 4 ToolCards in a horizontal row with `bg-blue-50/50 rounded-2xl p-4 mb-6`. Show each tool's `reason` in `text-xs text-gray-400 italic`. If 0 results or non-student, render nothing.
> 2. Remove the sub-category conditional pills (the secondary row under category tabs).
> 3. Remove the "Filters" button and the entire advanced filters collapsible panel (tool type pills, difficulty pills, audio toggle).
> 4. Keep only: 4 category tabs + search input + sort dropdown + "Clear" button (shown when search has text or category is not "All").
>
> Verify: `npm run lint && npx tsc --noEmit && npm run build`

### Prompt 4 — Phase 3: ZEN-07 + ZEN-08

> Read `app/components/ToolCard.tsx`. In compact mode, add a quick-launch Play button in the footer row (right side, next to "Open →"). Use `Play` icon from lucide-react, `size-4`, wrapped in a `rounded-full bg-[#0033A0] text-white size-7` container. On click: `e.preventDefault(); e.stopPropagation(); router.push(\`/tools/${tool.id}\`)` (same destination as the launch modal's action). Keep the "Open →" link for detail page navigation.
>
> Then find `app/components/ToolLaunchModal.tsx`. Delete the file entirely. Search codebase for all imports of `ToolLaunchModal` and remove them. Where the modal was being triggered (likely on `/tools/[id]`), change the "Launch" button to navigate directly to the tool chat interface or open in new tab for EXTERNAL tools.
>
> Verify: `npm run lint && npx tsc --noEmit && npm run build`

### Prompt 5 — Phase 4: ZEN-09

> Find and read the course detail page that renders tabs (search for the tab strip with Materials, Study, Tools, Learning Path, Discussion, Submissions, Assignments, My Grades, Progress, Course Map). Consolidate to 5 tabs:
>
> 1. **Overview** — renders MaterialsTab at top; below it, a collapsible "Learning Path" section (existing LearningPathTab content); below that, a collapsible "Progress" section.
> 2. **Tools** — unchanged ToolsTab.
> 3. **Assignments** — renders AssignmentsTab for everyone. For students: add "My Grades" section below (existing StudentGradesTab content). For educators: add Gradebook section below (existing GradebookTab content).
> 4. **Discussion** — unchanged DiscussionTab.
> 5. **Course Map** — educators/admins only. Existing CourseMapTab + any educator analytics content.
>
> Remove Study, Submissions, standalone My Grades, standalone Progress, and standalone Learning Path tabs. Maintain ARIA tab attributes.
>
> Verify: `npm run lint && npx tsc --noEmit && npm run build`

### Prompt 6 — Phase 5: ZEN-10 + ZEN-11 + ZEN-12 + ZEN-13

> **Spacing (ZEN-10):** In `app/hub/page.tsx`, `app/components/ToolsBrowser.tsx`, and `app/page.tsx` — change all card grid `gap-3` to `gap-5`. Change dashboard section spacing to `space-y-10` with `border-t border-gray-100 pt-10` dividers between major sections.
>
> **Border weight (ZEN-11):** In `app/page.tsx` — change informational sections (stats strips, calendar widget, notes widget, vitals grid) from `border-2 border-gray-200` to `border border-gray-100`. Keep `border-2 border-gray-200` on clickable cards (course cards, tool cards, service cards).
>
> **Emoji removal (ZEN-12):** In `app/components/ToolCard.tsx` — when `compact` is true, do not render the category emoji. Remove the `text-3xl` emoji element. Let title + description fill the space.
>
> **Typography (ZEN-13):** Across `app/page.tsx`, `app/hub/page.tsx`, `app/components/ToolCard.tsx`, `app/components/ToolsBrowser.tsx` — replace all `text-[11px]` with `text-xs`. Standardize to 4 tiers: Display (`text-2xl font-extrabold`), Heading (`text-base font-bold`), Body (`text-sm`), Meta (`text-xs text-gray-400`).
>
> Verify: `npm run lint && npx tsc --noEmit && npm run build`

### Prompt 7 — Phase 6: ZEN-14 + ZEN-15

> **Scroll-idle trigger (ZEN-14):** In `app/components/ClientProviders.tsx`, find the `setTimeout` that fires the home proactive Sandy message (currently 8s). Replace with a scroll-idle detector: track `lastScrollTime` via `useRef`, set up `window.addEventListener('scroll', ...)` to update it, use `setInterval(1000)` to check if `Date.now() - lastScrollTime > 3000`. If idle for 3s and proactive hasn't fired, fire it. Fallback: fire after 5s if user never scrolls. Clean up on unmount.
>
> **Personality micro-moments (ZEN-15):** In the proactive config (find where `getProactiveConfig` or proactive messages are defined — likely `ClientProviders.tsx` or `concierge-service.ts`), prepend a short personality line before the helpful content. Use page path and time-of-day conditionals: `/build` → "What are we building today?"; `/courses` after 10pm → "Burning the midnight oil? Let's make it count."; `/` on Mondays → "New week. Clean slate. What's first?"; default → "Welcome back." Rotate via `Math.random()` from a small pool per path.
>
> Verify: `npm run lint && npx tsc --noEmit && npm run build`

### Prompt 8 — Phase 7: ZEN-16 + ZEN-17 + ZEN-18 + ZEN-19

> **Empty state (ZEN-16):** In `app/page.tsx`, find the student "Due Soon" / "Due Dates" section empty state. Replace with rotating messages: `['Nothing due. You earned this moment.', 'Clear skies ahead.', 'Your future self thanks you.', 'Zero deadlines. Take a breath.']`. Pick by `Math.floor(Date.now() / 86400000) % messages.length`. Add a `Smile` icon (`size-5 text-gray-300`) above the text. Style: `text-gray-400 text-sm italic text-center py-6`.
>
> **Jump Back In context (ZEN-17):** In `app/page.tsx`, in the Jump Back In section, add a context line below each tool name. If the session data includes `summary`, show first sentence (`summary.split('.')[0] + '.'`) in `text-xs text-gray-400 italic line-clamp-1`. If it has `score`, show `Last score: ${score}%`. Fallback: `Last used ${formatDistanceToNow(endedAt)}`.
>
> **Fade transition (ZEN-18):** In `app/globals.css`, add: `@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }` and `.page-fade-in { animation: fadeIn 200ms ease-out; }`. In the root layout or `ClientProviders.tsx`, apply `className="page-fade-in"` to the `<main>` content wrapper. Use a `key={pathname}` on the wrapper so the animation re-triggers on route change.
>
> **Contextual empty states (ZEN-19):** Update empty states: My Drafts tab in `/build` → "Your first tool is one prompt away. Try: 'A study buddy for intro biology'" (make the example clickable, linking to `/builder?prompt=A+study+buddy+for+intro+biology`). Jump Back In with no sessions → "Pick a tool from your course page and it'll show up here next time." with a link to `/courses`. Discussion empty → "Be the first to start a conversation."
>
> Verify: `npm run lint && npx tsc --noEmit && npm run build`

### Prompt 9 — Phase 8: ZEN-20 + ZEN-21

> **Breadcrumbs (ZEN-20):** Create `app/components/Breadcrumb.tsx`:
> ```tsx
> 'use client'
> import Link from 'next/link'
> import { ChevronRight } from 'lucide-react'
>
> interface BreadcrumbProps {
>   items: { label: string; href?: string }[]
> }
>
> export default function Breadcrumb({ items }: BreadcrumbProps) {
>   return (
>     <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-gray-400 mb-2">
>       {items.map((item, i) => (
>         <span key={i} className="flex items-center gap-1">
>           {i > 0 && <ChevronRight className="size-3" />}
>           {item.href && i < items.length - 1 ? (
>             <Link href={item.href} className="hover:text-gray-600 transition-colors">{item.label}</Link>
>           ) : (
>             <span className="text-gray-500">{item.label}</span>
>           )}
>         </span>
>       ))}
>     </nav>
>   )
> }
> ```
> Add to: `/courses/[id]` (Home > Courses > {code}), `/tools/[id]` (Home > Tools > {name}), analytics pages (Home > Analytics > {page}). Place above `PageHeader` in each.
>
> **Mobile nav (ZEN-21):** In `app/components/Header.tsx`, in the mobile slide-in menu section, remove: the Quick Access links section, the "Demo Mode — View As" explanation text, and any legal/settings links. Keep only: primary nav items (role-gated), user switcher (3 users), and notification + message icons with badges. Target: fits on one screen without scrolling.
>
> Verify: `npm run lint && npx tsc --noEmit && npm run build`

---

## Priority Order (Implementation Sequence)

| Order | Phase | Tasks | Impact | Effort |
|:-----:|:-----:|-------|:------:|:------:|
| 1 | 0 | ZEN-00, ZEN-01 | High | Low |
| 2 | 1 | ZEN-02, ZEN-03, ZEN-04 | High | Medium |
| 3 | 5 | ZEN-10, ZEN-11, ZEN-12, ZEN-13 | High | Low-Medium |
| 4 | 3 | ZEN-07, ZEN-08 | High | Medium |
| 5 | 7 | ZEN-16, ZEN-17, ZEN-18, ZEN-19 | Medium | Low |
| 6 | 2 | ZEN-05, ZEN-06 | High | Medium |
| 7 | 4 | ZEN-09 | High | High |
| 8 | 6 | ZEN-14, ZEN-15 | Medium | Low |
| 9 | 8 | ZEN-20, ZEN-21 | Low | Medium |

---

## Success Criteria

After all 22 tasks:
- **Decision count per screen:** Hub drops from ~45 visible elements to ~6 accordion headers + search. ToolsBrowser drops from 7 filter axes to 2. Course tabs drop from 12 to 5.
- **Clicks to launch a tool:** Drops from 4 (Hub → card → detail → modal → launch) to 2 (Hub → quick-launch).
- **Demo user switching:** 3 clear options instead of 6 + 18 links.
- **Mobile nav:** Fits on one screen without scrolling.
- **Visual density:** Noticeably calmer with increased spacing and differentiated border weights.
- **Personality:** Sandy feels like a companion, not a chatbot. Empty states feel warm, not sterile.
- **Build:** 0 TS errors. 0 lint warnings. All ARIA maintained.
