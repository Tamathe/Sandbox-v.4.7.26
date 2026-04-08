# Blueprint: Navigation Consolidation — 7 Phases

> **Sprint Scope:** Eliminate navigation redundancies, merge overlapping concepts, and create a single-threaded mental model for all users. 7 sequential phases from quick label fixes to structural IA redesign.
> **Depends On:** Nothing — each phase is self-contained and independently shippable.
> **Estimated Size:** Large (7 phases, ~35 file modifications total, 0 schema changes, 0 new API routes)
> **Audit Steps Addressed:** Overlapping terminology, duplicate access paths, split definitions, shadow navigation
> **Origin:** Principal UX Architecture Audit, 2026-03-28

---

## Context

the platform has grown from a tool marketplace into a full campus operating system with 237 pages and 14 swim lanes. Growth was feature-first, and the navigation layer accrued structural debt:

1. **"Hub"** is a meaningless label for the platform's primary discovery surface
2. **"Apps" vs "Tools"** splits an implementation detail into two user-facing concepts
3. **3 campus service surfaces** (`/university-systems`, `/student-services`, `/campus-navigator`) serve overlapping audiences with no shared entry point
4. **13 flat quick links** in the user dropdown create a shadow navigation that competes with the header
5. **3 analytics entry points** fragment a single system into disconnected destinations
6. **"Tools" tab on courses** collides with the global marketplace label
7. **Elevated suites** (16 Sandy Interview experiences) are buried at the same depth as simple flashcard generators

**Design principle:** Every concept should have **one name**, **one entry point**, and **one mental model**. If a user has to wonder "is this the same thing I saw over there?" — we failed.

**Risk profile:** All 7 phases are **UI-only** — no schema migrations, no new API routes, no backend changes. Phases 1–6 are safe label/redirect/restructure operations. Phase 7 is a deeper IA discussion.

---

## Phase 1: Rename "Hub" → "Explore"

> **Effort:** Small (label changes across ~10 files)
> **Risk:** Low — no route changes, no backend changes
> **Test:** Verify all 4 roles see "Explore" in nav. Staff tiered nav "More" dropdown still works.

### Problem

"Hub" communicates nothing. The marketplace is the primary discovery surface — 14 swim lanes, 78+ tools, department storefronts, search, AI recommendations. Users need a verb that tells them what they'll do there.

### What Changes

**Rule:** Every user-facing instance of "Hub" that refers to the `/hub` marketplace becomes "Explore". Internal code identifiers (`hub-config.ts`, `HubPage`, `/hub` route) stay unchanged — we're renaming the label, not the route.

### Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | `app/components/Header.tsx:189` | `label: 'Hub'` → `label: 'Explore'` |
| 2 | `app/components/Header.tsx` | Staff tiered nav: change "Hub" in primary items array to "Explore" |
| 3 | `app/components/hub/HeroBanner.tsx` | If any visible heading says "Hub", rename to "Explore" |
| 4 | `app/components/hub/StaffToolkit.tsx` | Section heading "Your Toolkit" is fine (no "Hub" text). Verify "Browse all tools" CTA text stays. |
| 5 | `app/hub/browse/page.tsx` | Page title "Browse" with subtitle "Explore all tools and storefronts" — already consistent, no change needed |
| 6 | `app/hub/departments/page.tsx` | Subtitle "Browse all university storefronts" — no change needed |
| 7 | `app/lib/concierge-service.ts:20` | `PAGE_DESCRIPTIONS['/hub']` — change "Hub — the central directory" to "Explore — the central directory" |
| 8 | `app/lib/concierge-service.ts` | Any Sandy prompt text referencing "the Hub" → "Explore" |
| 9 | `app/lib/agent/tools/sandy-tools.ts` | `search_platform` tool description — if it says "Hub", update |
| 10 | `app/lib/demo/demo-beats.ts` | If any beat narration references "Hub", update |
| 11 | `app/lib/proactive-suggestions.ts` | Any suggestion text mentioning "Hub" → "Explore" |
| 12 | `app/components/hub/HubSearchBar.tsx` | Placeholder text — if it says "Search the Hub", change to "Search tools & resources" |

### What Does NOT Change

- Route stays `/hub` — URL stability for bookmarks, shared links, analytics
- Component names stay `HubPage`, `HubSearchBar`, `SwimLane` — internal naming is fine
- Config file stays `hub-config.ts` — developer-facing, not user-facing
- Mobile nav mirrors desktop — both get "Explore"
- Staff "More" dropdown section labeled "Explore" (currently contains Courses/Build/Analytics/AI Literacy/University Systems) — this is coincidentally the same word but refers to the dropdown section name. Keep it as-is; context makes it clear.

### Verification Checklist

- [ ] Switch to each of the 4 demo users (ADMIN, EDUCATOR, STUDENT, STAFF)
- [ ] Confirm "Explore" appears in desktop nav for non-STAFF roles
- [ ] Confirm STAFF tiered nav shows "Explore" as a primary link (replacing "Hub")
- [ ] Confirm mobile hamburger menu shows "Explore"
- [ ] Confirm `/hub` page still loads normally
- [ ] Confirm Sandy references "Explore" (not "Hub") when suggesting tool discovery
- [ ] Grep codebase for remaining user-facing "Hub" strings (exclude code identifiers)

---

## Phase 2: Merge "Apps" into the Explore Surface

> **Effort:** Medium (2 redirects, 1 new swim lane, minor refactors)
> **Risk:** Low — Apps gallery is low-traffic; redirects are graceful
> **Test:** `/apps` redirects to Explore with portfolio filter. `/my-apps` redirects to Build tab.

### Problem

"Published Apps" (`/apps`) and "My Apps" (`/my-apps`) are separate galleries for PORTFOLIO-type tools. But tools and apps are the same database model (`Tool`), differing only by `toolType`. Users don't know whether to browse "tools" or "apps" — they're looking for the same thing: software to use.

### What Changes

**Principle:** A portfolio app is just a tool with `toolType: PORTFOLIO`. It belongs in the same discovery surface as every other tool.

### Step 2a: Add "Community Projects" swim lane to Hub

| # | File | Change |
|---|------|--------|
| 1 | `app/hub/hub-config.ts` | Add a new `SwimLane` entry: `{ id: 'community-projects', title: 'Community Projects', tools: [...], visibleTo: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF'] }`. Populate with existing PORTFOLIO tools from `prisma/seed-portfolio-apps.ts` (4 demo apps). Position after "Innovation & IP" lane. |
| 2 | `app/hub/page.tsx` | If swim lanes are fetched dynamically, ensure PORTFOLIO-type tools appear in the new lane. If hardcoded from `hub-config.ts`, the config change is sufficient. |

### Step 2b: Redirect `/apps` → `/hub/browse?type=portfolio`

| # | File | Change |
|---|------|--------|
| 3 | `app/apps/page.tsx` | Replace entire file with a client-side redirect: `router.replace('/hub/browse?type=portfolio')`. Same pattern as existing `app/tools/page.tsx` redirect. |
| 4 | `app/hub/browse/page.tsx` | Add support for `?type=portfolio` query param. When present, pre-filter the tool list to `toolType === 'PORTFOLIO'` and show a "Community Projects" heading instead of generic "Browse". Add a "View all tools" link to clear the filter. |

### Step 2c: Redirect `/my-apps` → `/build?tab=my-apps`

| # | File | Change |
|---|------|--------|
| 5 | `app/my-apps/page.tsx` | Replace entire file with redirect: `router.replace('/build?tab=my-apps')` |
| 6 | `app/build/page.tsx` | Rename the existing "My Unpublished Tools" tab to "My Creations". Add filtering to show both unpublished tools AND portfolio apps owned by the current user. If `?tab=my-apps` is in the URL, auto-select this tab. |

### Step 2d: Clean up references

| # | File | Change |
|---|------|--------|
| 7 | `app/my-apps/page.tsx` (action button) | The "Browse Public Gallery" link currently points to `/apps` — now redirect handles this. No change needed if the redirect is in place. |
| 8 | `app/lib/concierge-service.ts` | Update any PAGE_DESCRIPTIONS for `/apps` and `/my-apps` to note they redirect |
| 9 | `app/build/page.tsx` | "Browse Public Gallery" link → change to `/hub/browse?type=portfolio` |

### What Does NOT Change

- `/app/[appId]` (singular, individual app detail page) — this route stays as-is
- The `PORTFOLIO` toolType — no schema changes
- The `ImportAppForm` component — stays on `/build?tab=import`
- Staff Pick badges — migrate logic to Hub browse filter view
- Tool approval flow — unchanged

### Verification Checklist

- [ ] Navigate to `/apps` → lands on `/hub/browse?type=portfolio` with filtered view
- [ ] Navigate to `/my-apps` → lands on `/build?tab=my-apps` showing user's creations
- [ ] "Community Projects" swim lane appears on `/hub` for all roles
- [ ] Portfolio apps show "Student Project" / "Faculty Project" badges in the swim lane
- [ ] Individual app detail pages (`/app/[appId]`) still work

---

## Phase 3: Consolidate Campus Services

> **Effort:** Medium (1 page restructure, 2 redirects, label updates)
> **Risk:** Low-Medium — Student Services has 22 tools; absorbing them requires careful tab design
> **Test:** All 3 former entry points resolve to a single unified surface

### Problem

Three separate surfaces serve campus service needs:

| Surface | Route | Content |
|---------|-------|---------|
| University Systems | `/university-systems` | 7 institutional integrations (SIS, rooms, travel, etc.) |
| Student Services | `/student-services` | 22 AI-powered guidance tools (immigration, financial aid, etc.) |
| Campus Navigator | `/campus-navigator` | 5 AI-powered planning tools (course planner, degree audit, etc.) |

A student looking for "degree audit help" has no way to know whether it's in University Systems, Student Services, or Campus Navigator. All three are AI chat tools backed by Sandy — there's no user-facing reason for the split.

### What Changes

**Principle:** One surface called "Campus Services" absorbs all three. The existing `/university-systems` page becomes the host (it already has a tabbed layout), gaining two new tab groups.

### Step 3a: Expand University Systems into Campus Services

| # | File | Change |
|---|------|--------|
| 1 | `app/(pages)/university-systems/page.tsx` | Rename page title from "University Systems" to "Campus Services". Add subtitle: "AI-powered guidance, campus tools, and institutional integrations — all in one place." |
| 2 | `app/(pages)/university-systems/page.tsx` | Add 3 top-level tabs: **Guidance** (22 student services), **Planning** (5 campus navigator tools), **Systems** (existing 7 integrations). Default tab: Guidance for STUDENT, Systems for STAFF/ADMIN. |
| 3 | `app/(pages)/university-systems/page.tsx` | Import `STUDENT_SERVICES_TOOLS` from `student-services/page.tsx` (extract to shared config if needed) and render the card grid under the Guidance tab. Import `CAMPUS_TOOLS` from `app/lib/campus-navigator.ts` and render under the Planning tab. |

### Step 3b: Redirect old routes

| # | File | Change |
|---|------|--------|
| 4 | `app/student-services/page.tsx` | Replace with redirect: `router.replace('/university-systems?tab=guidance')` |
| 5 | `app/campus-navigator/page.tsx` | Replace with redirect: `router.replace('/university-systems?tab=planning')` |

**Important:** Individual sub-routes (`/student-services/[slug]`, `/campus-navigator/[slug]`) stay as-is — they are standalone Sandy chat pages that don't need to move. Only the index/directory pages redirect.

### Step 3c: Update navigation labels

| # | File | Change |
|---|------|--------|
| 6 | `app/components/Header.tsx:206` | Quick link label: "University Systems" → "Campus Services" (keep route `/university-systems`) |
| 7 | `app/components/hub/StaffToolkit.tsx` | Card label: "University Systems" → "Campus Services", description: "Grades, travel, attendance" → "Guidance, planning & integrations" |
| 8 | `app/hub/hub-config.ts` | Rename "Campus Life" swim lane (or whichever contains campus tools) — verify which lane has Campus Map, Dining, etc. If the swim lane is "campus-life", rename title to "Campus Services & Life". Or keep separate — the swim lane and the page serve different purposes. |
| 9 | `app/lib/concierge-service.ts` | Update PAGE_DESCRIPTIONS for `/university-systems` to reflect the expanded scope. Remove or redirect descriptions for `/student-services` and `/campus-navigator`. |
| 10 | `app/lib/agent/tools/university-systems-tools.ts` | Tool descriptions stay — they're internal to Sandy. No user-facing text here. |

### What Does NOT Change

- `/student-services/[slug]` pages — individual AI advisor chat pages stay at their URLs
- `/campus-navigator/[slug]` pages — individual planning tool chat pages stay at their URLs
- All API routes under `/api/university-systems/` — unchanged
- The underlying `university-systems-service.ts` — unchanged
- Sandy agent tools — they work regardless of which page the user is on

### Tab Layout Design

```
Campus Services
├── [Guidance]  [Planning]  [Systems]
│
├── Guidance (default for STUDENT)
│   ├── Search bar
│   ├── 22 service cards (same grid as current /student-services)
│   ├── Crisis/confidential badges preserved
│   └── Footer disclaimer preserved
│
├── Planning (default for no one — manual selection)
│   ├── 5 campus navigator tool cards
│   ├── Starter questions preview on cards
│   └── Footer disclaimer preserved
│
└── Systems (default for STAFF/ADMIN)
    ├── 7 integration tabs (existing UX unchanged)
    └── Sticky sub-tabs within this section
```

### Verification Checklist

- [ ] `/university-systems` shows "Campus Services" title with 3 tabs
- [ ] `/student-services` redirects to `/university-systems?tab=guidance`
- [ ] `/campus-navigator` redirects to `/university-systems?tab=planning`
- [ ] `/student-services/academic-advisor` (individual tool) still works directly
- [ ] `/campus-navigator/course-planner` (individual tool) still works directly
- [ ] Quick link in Header says "Campus Services"
- [ ] Staff Toolkit card says "Campus Services"
- [ ] All 4 demo users see appropriate default tab

---

## Phase 4: Restructure Quick Links into Grouped Sections

> **Effort:** Small (1 file, ~30 lines restructured)
> **Risk:** Low — visual-only change to dropdown menu
> **Test:** Dropdown shows 2 labeled sections instead of flat list

### Problem

The user dropdown contains 13 quick links in a flat, unsorted list. This creates a "shadow navigation" that competes with the header:
- "Analytics" duplicates the top nav Analytics item
- "My Progress" is actually `/analytics/student` — the student view of the same system
- Major features like Research Hub and Explore Majors are **only** reachable through this dropdown
- Utility features (Documents, My Tasks) sit alongside full experiences (Research Hub, Community Pulse)

### What Changes

Replace the flat list with two labeled groups and remove duplicates.

### File to Modify

**`app/components/Header.tsx`** — the `quickLinksBase` array (lines 203–217) and the rendering logic.

### New Structure

```typescript
const quickLinkGroups = [
  {
    label: 'Personal',
    links: [
      { href: '/library', label: 'My Library', icon: BookMarked },
      { href: '/analytics/student', label: 'My Progress', icon: Compass },
      { href: '/tasks', label: 'My Tasks', icon: CheckSquare },
      { href: '/documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    label: 'Campus',
    links: [
      { href: '/explore-majors', label: 'Explore Majors', icon: Sunrise },
      { href: '/campus-map', label: 'Campus Map', icon: MapPin },
      { href: '/university-systems', label: 'Campus Services', icon: Building2 },
      { href: '/community', label: 'Community Pulse', icon: Users },
      { href: '/research-hub', label: 'Research Hub', icon: FlaskConical },
      { href: '/rooms', label: 'Room Reservation', icon: DoorOpen },
    ],
  },
]
```

### What Gets Removed from Quick Links

| Item | Reason |
|------|--------|
| "Analytics" (`/analytics/faculty`) | Already in top nav for EDUCATOR/ADMIN. Students have "My Progress" in Personal group. |
| "Campus Life" (`/campus-life`) | Low-value standalone link. Reachable from student homepage and Community Pulse. |

### What Gets Added (from nowhere else)

Nothing new — we're reorganizing existing links and removing duplicates.

### Rendering Change

```tsx
{/* Current: flat list */}
{visibleQuickLinks.map(link => <DropdownItem ... />)}

{/* New: grouped with section headers */}
{quickLinkGroups.map(group => (
  <>
    <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
      {group.label}
    </div>
    {group.links.filter(canSeeLink).map(link => <DropdownItem ... />)}
  </>
))}
```

### Staff Override

Staff quick links remain separately handled (5 curated items via `hideForStaff`). The grouped structure only applies to non-STAFF roles. For STAFF, keep the existing flat list of 5 items (Documents, Tasks, Campus Services, Room Reservation, Campus Map) — already concise enough.

### Admin Extra

`Compliance Portal` link for ADMIN goes at the bottom as a standalone item, outside the groups.

### Verification Checklist

- [ ] STUDENT dropdown shows "Personal" (4 items) and "Campus" (6 items) sections
- [ ] EDUCATOR dropdown shows same groups
- [ ] ADMIN dropdown shows same groups + Compliance Portal at bottom
- [ ] STAFF dropdown shows flat 5-item list (unchanged)
- [ ] "Analytics" no longer appears in dropdown for any role
- [ ] "Campus Life" no longer appears in dropdown
- [ ] All links navigate correctly

---

## Phase 5: Unify Analytics Entry Points

> **Effort:** Small (1 new redirect page, 2 quick link removals — already done in Phase 4)
> **Risk:** Low — adding a smart redirect, not removing any page
> **Test:** `/analytics` routes to the correct sub-page per role

### Problem

Analytics has 3 disconnected entry points:
1. Top nav "Analytics" → `/analytics/faculty` (EDUCATOR/ADMIN only)
2. Quick link "Analytics" → same route (available to all — duplicate, removed in Phase 4)
3. Quick link "My Progress" → `/analytics/student` (student view of the same system)

A student clicking "Analytics" in the old nav got the faculty page. An educator has no awareness that `/analytics/student` exists.

### What Changes

Create a role-aware landing page at `/analytics` that redirects to the appropriate sub-view.

### Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | `app/analytics/page.tsx` | **Create new file.** Client-side redirect based on role: STUDENT → `/analytics/student`, EDUCATOR → `/analytics/faculty`, ADMIN → `/analytics/faculty`, STAFF → `/analytics/faculty`, REGISTRAR → `/analytics/faculty`. |
| 2 | `app/components/Header.tsx:192` | Change nav item route from `/analytics/faculty` to `/analytics`. Label stays "Analytics". |
| 3 | `app/components/AnalyticsSubNav.tsx` | No changes needed — it already handles sub-page navigation within the analytics section. |

### New File: `app/analytics/page.tsx`

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '../lib/auth-context'

export default function AnalyticsPage() {
  const router = useRouter()
  const { currentUser } = useAuth()

  useEffect(() => {
    if (currentUser.role === 'STUDENT') {
      router.replace('/analytics/student')
    } else {
      router.replace('/analytics/faculty')
    }
  }, [router, currentUser.role])

  return null
}
```

### What Does NOT Change

- All existing analytics sub-pages (`/analytics/faculty`, `/analytics/student`, `/analytics/faculty-intelligence`, `/analytics/learning-science`, `/analytics/ab-outcomes`, `/analytics/platform`)
- `AnalyticsSubNav.tsx` — tab navigation within analytics pages
- API routes — no backend changes
- Quick link removals already handled in Phase 4

### Verification Checklist

- [ ] STUDENT clicks "Analytics" in nav → lands on `/analytics/student`
- [ ] EDUCATOR clicks "Analytics" in nav → lands on `/analytics/faculty`
- [ ] ADMIN clicks "Analytics" in nav → lands on `/analytics/faculty`
- [ ] Direct URL `/analytics/student` still works for all roles
- [ ] Direct URL `/analytics/faculty` still works for EDUCATOR/ADMIN
- [ ] AnalyticsSubNav tabs function normally after redirect

---

## Phase 6: Rename Course "Tools" Tab to "Course Tools"

> **Effort:** Trivial (1 line change)
> **Risk:** None
> **Test:** Course detail page shows "Course Tools" instead of "Tools"

### Problem

On `/courses/[id]`, the "Tools" tab lists tools linked to that specific course. But "Tools" is the same word users see in the global Explore marketplace (formerly "Hub"). A user looking at their course tabs thinks "Tools" means the same thing as the "Tools" they browse globally — it doesn't. Course tools are a curated subset attached by the educator.

### What Changes

One label change to disambiguate.

### File to Modify

| # | File | Change |
|---|------|--------|
| 1 | `app/courses/page.tsx:~296` | Change `{ id: 'tools' as const, label: 'Tools', visible: true }` → `{ id: 'tools' as const, label: 'Course Tools', visible: true }` |

### What Does NOT Change

- The tab `id` stays `'tools'` — used for URL state and internal logic
- The tab content — same linked tools display
- No other tabs affected
- No API changes

### Verification Checklist

- [ ] Navigate to any course detail page
- [ ] Tab bar shows "Course Tools" instead of "Tools"
- [ ] Clicking the tab works normally
- [ ] Tab alias mapping (`TAB_ALIAS`) still functions (no alias points to 'tools')

---

## Phase 7: Promote Elevated Suites in Navigation Hierarchy

> **Effort:** Medium-Large (IA redesign — requires design review before implementation)
> **Risk:** Medium — changes the primary information architecture
> **Test:** Elevated suites are visually distinct from simple tools in the Explore surface

### Problem

The 16 elevated Sandy Interview tools (across 4 suites: Write Room, Data Desk, Meeting Machine, Wellness Hub) are **full conversational AI experiences** with:
- Split-panel layouts (output + Sandy interview)
- Smart preloading (preflight aggregation)
- Quick-reply chip state machines
- Multi-phase interview flows

Yet they sit at the same depth as a flashcard generator in the Hub swim lanes. A Resume Builder (20-minute guided Sandy interview → polished document) looks identical to a simple quiz tool in the card grid.

### Design Options (Choose One Before Implementing)

#### Option A: Visual Differentiation in Explore (Recommended — lowest disruption)

Keep suites in the Explore swim lanes but visually distinguish them:

| # | File | Change |
|---|------|--------|
| 1 | `app/components/ToolCard.tsx` | Add a visual indicator for elevated tools. Options: "Sandy-Powered" badge, distinct card border (`border-[#0033A0]`), or a subtle gradient background. Detect via: tool belongs to a known elevated collection (write-room, meeting-machine, data-desk, wellness-hub). |
| 2 | `app/hub/hub-config.ts` | Add a `elevated: true` flag to swim lane definitions for the 4 elevated collections. |
| 3 | `app/components/hub/SwimLane.tsx` | Render elevated swim lanes with a distinct header treatment — e.g., "Sandy-Powered Suite" subtitle, different background, or a "Try the guided experience" CTA. |

#### Option B: "Workspaces" Section in Explore

Add a dedicated "Workspaces" section above the swim lanes on the Explore page:

| # | File | Change |
|---|------|--------|
| 1 | `app/hub/page.tsx` | Add a "Workspaces" section above swim lanes showing 4 suite cards (Write Room, Data Desk, Meeting Machine, Wellness Hub) as larger, featured cards with descriptions. |
| 2 | `app/hub/hub-config.ts` | Add a `WORKSPACES` config array with the 4 suites, each linking to their respective index routes. |
| 3 | `app/components/hub/WorkspaceCard.tsx` | New component — larger card (2-col span), suite description, tool count badge, "Sandy-Powered" indicator. |

#### Option C: "Work" Nav Section (Most Disruptive)

Add a "Work" top-level nav item for STAFF/EDUCATOR roles:

| # | File | Change |
|---|------|--------|
| 1 | `app/components/Header.tsx` | Add `{ href: '/work', label: 'Work', roles: ['STAFF', 'EDUCATOR', 'ADMIN'] }` to NAV_ITEMS |
| 2 | `app/work/page.tsx` | New page with 4 suite cards + "Productivity & Planning" tools. Serves as the "professional workspace" entry point. |
| 3 | Hub swim lanes | Remove elevated suites from swim lanes to avoid duplication |

### Recommendation

**Option A** (visual differentiation) is the right first step. It requires the least disruption, respects the existing IA, and gives users a visual signal that these tools are different. Option B can layer on top later if evaluation shows users still don't discover the suites.

Option C should wait until the platform grows enough that 6+ top-level nav items feel crowded — adding a "Work" section prematurely splits the discovery surface.

### Implementation (Option A)

| # | File | Change |
|---|------|--------|
| 1 | `app/hub/hub-config.ts` | Add `elevated?: boolean` to `SwimLane` type. Set `elevated: true` on `writing-studio`, `meetings`, `data-analysis`, `wellness` lanes. |
| 2 | `app/components/hub/SwimLane.tsx` | When `lane.elevated`, render a subtle visual distinction: e.g., `bg-blue-50/30 border border-blue-100 rounded-2xl p-4` wrapper around the lane, with a small "Sandy-Powered" pill badge next to the lane title. |
| 3 | `app/components/ToolCard.tsx` | When the tool belongs to an elevated collection (check via parent lane context or a prop), add a small `Bot` icon (lucide-react) in the top-right corner of the card. |
| 4 | `app/components/hub/HeroBanner.tsx` | Consider rotating the hero to feature an elevated suite for STUDENT/EDUCATOR roles, showing the Sandy interview experience. |

### What Does NOT Change

- No route changes
- No swim lane removal — suites stay discoverable in the normal flow
- No new pages
- Card click behavior — still navigates to the suite's tool page

### Verification Checklist

- [ ] Elevated swim lanes have visual distinction (background, badge, or border)
- [ ] Non-elevated swim lanes look unchanged
- [ ] ToolCards in elevated lanes show Sandy indicator
- [ ] ToolCards outside elevated lanes are unaffected
- [ ] All 4 elevated suites are correctly identified
- [ ] Mobile layout handles the visual distinction gracefully

---

## Execution Order

| Phase | Title | Depends On | Can Ship Independently |
|-------|-------|------------|----------------------|
| 1 | Rename Hub → Explore | Nothing | Yes |
| 2 | Merge Apps into Explore | Phase 1 (label consistency) | Yes (but better after Phase 1) |
| 3 | Consolidate Campus Services | Nothing | Yes |
| 4 | Restructure Quick Links | Phase 3 (needs "Campus Services" label) | Yes (but better after Phase 3) |
| 5 | Unify Analytics | Phase 4 (removes duplicate quick links) | Yes (but better after Phase 4) |
| 6 | Rename Course Tools Tab | Nothing | Yes |
| 7 | Promote Elevated Suites | Phase 1 (needs "Explore" label) | Yes |

**Recommended execution:** 1 → 6 → 3 → 2 → 4 → 5 → 7

Phase 6 is trivial and can be done alongside Phase 1. Phase 3 is independent and high-impact, so start it early. Phases 4 and 5 depend on prior label changes.

---

## CLAUDE.md Updates Required After All Phases

After all 7 phases are complete, update these sections of `CLAUDE.md`:

1. **Navigation table** — Replace "Hub" with "Explore" in the nav table
2. **Navigation section** — Update quick links description, note grouped structure
3. **Architecture notes** — Note that `/apps` and `/my-apps` redirect, `/student-services` and `/campus-navigator` redirect
4. **Sandy Concierge section** — Update PAGE_DESCRIPTIONS references

---

## Glossary of Terms (Post-Consolidation)

| Term | Meaning | Route |
|------|---------|-------|
| **Explore** | Primary discovery surface — all tools, apps, suites, storefronts | `/hub` |
| **Build** | Tool creation workspace (builder + playground + import) | `/build` |
| **Course Tools** | Tools linked to a specific course by the educator | Tab on `/courses/[id]` |
| **Campus Services** | All campus guidance, planning tools, and system integrations | `/university-systems` |
| **Community Projects** | User-created portfolio apps (BYOA) | Swim lane in Explore |
| **Elevated Suite** | Sandy Interview-powered tool collection (Write Room, etc.) | Distinct visual in Explore |
| **Analytics** | Role-aware analytics hub (student progress or faculty intelligence) | `/analytics` |
