# Blueprint: Staff Navigation & Hub Overhaul (Scope D)

> **Sprint Scope:** Make the navigation staff-shaped and the Hub staff-useful — restructure header for staff role, curate Hub lanes, elevate recommendations, and build a "Your Toolkit" quick-access grid.
> **Depends On:** None — independent of Scopes A, B, C.
> **Estimated Size:** Medium (4 handoff prompts, 8 tasks)
> **Audit Steps Addressed:** 15 (Navigation), 17 (Hub Experience)
> **Origin:** Morgan Rivera day-in-the-life UX audit, 2026-03-26

---

## Context

The Header shows 11+ nav links to staff with no hierarchy. The Hub shows 13 swim lanes with 76 tools — most irrelevant to Morgan's daily work. The audit scored Navigation at 4/10 and Hub Experience at 4/10.

### Current Architecture (What Exists)

**Header.tsx** (546 lines):
- `NAV_ITEMS` array: 13 links, role-gated via `canSeeLink()` (checks `link.always || link.roles?.includes(role)`)
- Staff sees 11 links: Home, Courses, Hub, Build, Analytics, AI Literacy, Policies, Communications, Committees, Surveys, Action Center
- Quick links: 13 items, priority-sorted per role (Staff: Documents #0, Tasks #1, University Systems #2)
- Mobile: hamburger → full drawer with all items flat (no grouping)

**Hub page** (`hub/page.tsx`, 346 lines):
- 3-tier lane system: static swim lanes (hub-config.ts) → DB collections (personalized) → recommendations
- Staff Hero: "Tasks & Action Center"
- Staff lane order: staff-tools first, then meetings, data, writing, registrar, etc.
- No staff-specific filtering — all 13 lanes visible, just reordered

**hub-config.ts** (1,176 lines):
- 13 swim lanes with `visibleTo` arrays
- `ROLE_LANE_ORDER` per role
- "Staff & Operations" lane has 11 tools — visible to ALL roles, not staff-exclusive

**hub-personalization.ts** (112 lines):
- College-based collection ordering
- No role-specific logic

**fingerprint/hub-personalization.ts** (104 lines):
- Tool affinity scoring by modality/study mode/cadence
- Confidence gate at 0.3

### Problems

1. **11 flat nav links** — no hierarchy. Morgan scans past Courses, Build, AI Literacy every time to find Policies.
2. **Mobile nav** — 11+ items in flat list, no grouping. Staff-specific items buried at bottom.
3. **Hub hero** — "Tasks & Action Center" is redundant with the homepage action queue.
4. **13 swim lanes** — most are student/faculty tools (AI Simulates, Live & Interactive, Campus Life). Morgan never uses them.
5. **No "Your Toolkit"** — Morgan's 6-8 daily tools are scattered across lanes. No quick-access grid.
6. **Recommendations** — same algorithm for all roles. Staff gets student-popular tools recommended.

---

## What Changes

### 1. Staff Header Navigation Restructure

**Primary tier (always visible in header bar):**
- Home, Action Center, Hub, Sandy (4 items — the daily drivers)

**Secondary tier ("More" dropdown for staff):**
- Policies, Communications, Committees, Surveys, University Systems, Analytics, AI Literacy, Courses, Build

**Implementation:**
- New `STAFF_NAV_PRIMARY` and `STAFF_NAV_SECONDARY` arrays (or add `tier` field to NAV_ITEMS)
- When `role === 'STAFF'`: render primary items inline, secondary in a dropdown
- Other roles: unchanged behavior (existing `NAV_ITEMS` array)

### 2. Mobile Staff Navigation

**Grouped drawer for staff:**
- **Primary section** (top, no collapse): Home, Action Center, Hub
- **Work Tools section** (collapsible, default open): Policies, Communications, Committees, Surveys, Action Center
- **Explore section** (collapsible, default closed): Courses, Build, Analytics, AI Literacy, University Systems
- **Account section** (bottom): same as current

### 3. Staff Hub Hero Replacement

**Current:** "Tasks & Action Center" card (redundant with homepage)
**New:** "Your Toolkit" — grid of Morgan's 8 most-used tools with large tap targets

- 2×4 grid on desktop, 2×4 scrollable on mobile
- Each cell: icon + label + one-line hook
- Static initial set for staff: Policy Navigator, Communications, Committees, Action Center, Surveys, Documents, Room Reservation, University Systems
- Future: personalize from usage data (engagement fingerprint)

### 4. Staff Lane Curation

**Visible to staff (5 lanes):**
1. Staff & Operations (existing, keep as-is)
2. Meetings & Collaboration
3. Data & Analysis
4. Writing Studio
5. Productivity & Planning

**Hidden from staff (8 lanes):**
- AI Teaches, AI Simulates, Live & Interactive, Faculty Intelligence, Campus Life, Crisis Comms, Registrar & Compliance, Innovation & IP, Wellness

**Implementation:** Update `visibleTo` arrays in hub-config.ts. Staff who want hidden tools can find them via search or "Browse full catalog."

### 5. Staff Recommendations

Add role-aware logic to `/api/hub/recommendations`:
- When `role === 'STAFF'`: boost tools from staff-tools, meetings, data-analysis lanes
- Suppress student-oriented tools (simulations, study tools, campus life)
- Add "Popular with staff" reason category

### 6. Quick Links Cleanup for Staff

Reorder and filter quick links for staff:
- **Show:** Documents, My Tasks, University Systems, Room Reservation, Campus Map
- **Hide from quick links (still accessible via nav):** My Library, Research Hub, Explore Majors, My Progress, Community Pulse, Campus Life

---

## Schema Changes

None. All changes are client-side configuration and component logic.

---

## Task Decomposition (2-Task Handoff Chains)

### Handoff 1: Header Restructure
**Task 1:** Add tiered navigation for staff role in `Header.tsx`. Define `STAFF_PRIMARY` items (Home, Action Center, Hub) and `STAFF_SECONDARY` items (everything else). When `role === 'STAFF'`: render primary inline, secondary in a "More" dropdown (ChevronDown icon, click to open, click-outside to close). Other roles: unchanged. Ensure keyboard accessibility (Escape closes dropdown, arrow keys navigate).

**Task 2:** Restructure mobile nav for staff. When `role === 'STAFF'`: group into 3 collapsible sections (Primary, Work Tools, Explore) with section headers and chevron toggles. Default: Primary and Work Tools open, Explore collapsed. Other roles: unchanged flat list. Ensure smooth expand/collapse animation.

### Handoff 2: Hub Staff Toolkit + Lane Curation
**Task 3:** Build "Your Toolkit" grid component (`StaffToolkit.tsx`). 2×4 grid of 8 staff tools (icon, label, one-line description, link). Render at top of Hub page when `role === 'STAFF'`, replacing the hero banner. Style: `border rounded-2xl shadow-sm` cards per item, hover highlight, `font-extrabold` title.

**Task 4:** Update `hub-config.ts` lane visibility for staff. Remove STAFF from `visibleTo` on 8 non-essential lanes (ai-teaches, ai-simulates, live-interactive, faculty-intelligence, campus-life, crisis-comms, innovation, wellness). Keep 5 relevant lanes. Add "Browse all tools" CTA link below the visible lanes for discoverability.

### Handoff 3: Recommendations + Quick Links
**Task 5:** Add role-aware logic to recommendation service. When `role === 'STAFF'`: boost scores for tools in staff-relevant lanes (staff-tools, meetings, data-analysis, writing-studio, productivity). Suppress tools from student-oriented lanes. Add "Popular with staff" as a reason category. Modify `/api/hub/recommendations` to pass role to service.

**Task 6:** Update quick links for staff in `Header.tsx`. Add `staffOnly` and `hideForStaff` flags to quick link items. Staff sees: Documents, My Tasks, University Systems, Room Reservation, Campus Map. Non-staff: unchanged. Ensure mobile quick links section also respects these flags.

### Handoff 4: Polish + UX Audit
**Task 7:** Visual polish: ensure "More" dropdown aligns properly on all screen sizes, transitions smoothly, has proper z-index above page content. Verify Hub toolkit grid is responsive (stacks to 1-column on very small screens, 2×4 on tablet+). Verify "Browse all tools" link navigates to `/hub/browse`.

**Task 8:** End-to-end UX audit across all 4 roles: verify STUDENT, EDUCATOR, ADMIN nav is completely unchanged. Verify STAFF sees tiered nav, grouped mobile, toolkit grid, curated lanes, staff-relevant recommendations. Check keyboard navigation (Tab through primary → More dropdown → dropdown items). Clean up unused imports, dead code. `npx tsc --noEmit` and `npm run lint` must pass.

---

## Acceptance Criteria

1. Staff header shows 3 primary links + "More" dropdown with secondary links
2. Other roles see unchanged navigation
3. Mobile staff nav has 3 grouped sections (Primary, Work Tools, Explore)
4. Hub shows "Your Toolkit" grid (8 tools) instead of hero for staff
5. Staff sees 5 relevant Hub lanes (not 13)
6. "Browse all tools" link provides access to hidden lanes
7. Recommendations are staff-relevant (no student simulations)
8. Quick links curated for staff role
9. Keyboard accessible throughout
10. `npx tsc --noEmit` and `npm run lint` pass after every handoff
