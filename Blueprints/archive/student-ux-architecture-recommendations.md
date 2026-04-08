# Student UX — Architect's Response & Implementation Plan
### Based on: Student Journey Audit (Landing Page → Studio)
### Date: 2026-03-18
### Updated: Decisions confirmed via Q&A session

---

## Confirmed Decisions (From Q&A)

| Question | Answer | Implication |
|---|---|---|
| Is real SSO on the roadmap? | Yes, eventually | Build the onboarding wizard once — design it for real auth from the start, just feature-flag it off in demo mode |
| Are Academy/Hub/Campus/Studio intentional branding? | No — lose it | Rename all four. No tooltip band-aids, just fix the labels |
| Should Sandy be page-aware on Studio? | Yes (confirmed) | She already has the architecture; Studio is just missing from the config — two-line fix |
| Mobile vs desktop split? | Desktop primary; mobile for specific features (e.g. audio/podcast) | Main nav stays desktop-first; flag audio/podcast features for mobile-prominent treatment |
| Is Studio a student feature? | Yes — students should be able to build anything with faculty-shared data | Studio is a first-class student surface; redesign its copy and entry points for a student audience |

---

## The Root Cause (Unchanged)

> **The platform was designed outside-in: sections first, users second.**

Academy, Hub, Campus, Studio are organizational metaphors that made sense to the builders. No student arrives thinking in those terms. Since these labels are now confirmed as non-intentional branding, **rename them all**. Do not patch — replace.

---

## Navigation Rename — The Foundation

This is the single change with the highest downstream leverage. Every other fix becomes simpler once the labels are honest.

### Student Nav
```
Home  |  Courses  |  Tools  |  Services  |  Community  |  Build
```

### Educator Nav
```
Home  |  My Courses  |  Build  |  Analytics  |  Services
```

### Admin Nav
```
Home  |  Admin Panel  |  Build  |  Analytics  |  Services
```

**Rename mapping:**

| Current Label | New Label | Rationale |
|---|---|---|
| Academy | Courses (student) / My Courses (educator) | Students think in courses, not academies |
| Hub | Services | It is literally a service directory — advising, financial aid, registrar |
| Campus | Community | The content is leagues, games, social features — not a map |
| Studio | Build | One word. Maximum clarity. Confirmed as a student feature |

**Critical addition for students:** `/tools` (the tool marketplace) is currently **not in the nav at all**. It needs its own nav item. "Tools" is the right label. Students browse Tools the same way they browse an app store — it is a primary destination, not buried under another section.

**Implementation:** `app/components/Header.tsx`, the `NAV_ITEMS` array (lines 126–132). Add role filtering (the `roles` field already exists but is unused — all items are `always: true`). Approximately 20 lines changed. Then update:
- Each page's `<h1>` hero copy
- Each page's `<title>` metadata in `export const metadata`
- Any cross-links within page copy that reference the old names

Files affected: `app/studio/page.tsx`, `app/hub/page.tsx`, `app/campus/page.tsx`, `app/academy/page.tsx` (if it exists as its own page), `app/components/Header.tsx`, any marketing copy in `page.tsx` hero sections.

---

## Implementation Plan — Ordered by Priority

---

### P0 — Do These First (All Low Effort, High Impact)

---

#### 1. Rename the Nav (the foundation for everything else)

Already described above. Do this before anything else — every other change below references the new labels. If you ship the other fixes with the old labels still in place you create inconsistency.

**Effort:** ~2 hours. Mostly string changes across 6 files.

---

#### 2. Add "Tools" to the Student Nav

`/tools` is the tool marketplace. It is currently invisible in the nav. A student who was told "go find a tool for your class" has no obvious path.

```typescript
// In NAV_ITEMS, student-visible addition:
{ href: '/tools', label: 'Tools', roles: ['STUDENT'] },
```

Between "Courses" and "Services" in the student nav order.

**Effort:** 2 lines in `Header.tsx`.

---

#### 3. Fix Sandy's Missing Studio Context

Sandy is fully page-aware on both the client (suggested starters) and server (system prompt via `PAGE_DESCRIPTIONS`). But `/studio` is missing from both configs, so she falls back to a generic response for students on the Build page.

**Fix 1 — `app/api/concierge/route.ts`, `PAGE_DESCRIPTIONS` object (line 8):**
```typescript
'/studio': 'Build — the tool creation hub. Students and educators can build AI-powered learning tools here using the Tool Builder (no code required) or the Playground (code editor). Faculty-shared datasets can be attached to any tool.',
```

**Fix 2 — `app/components/ConciergePanel.tsx`, `getPageStarters()` function:**
```typescript
if (pathname.startsWith('/studio')) {
  return [
    'What kind of tool do I want to build?',
    'What data has my professor shared that I can use?',
    'Show me example tools similar to what I have in mind',
    'Walk me through the Tool Builder step by step',
  ]
}
```

Since Studio is confirmed as a student feature, these starters should be student-first. The existing `/builder` starters already cover educator-specific prompt engineering questions.

**Effort:** ~10 lines across 2 files.

---

#### 4. Studio Page — Student Redirect Banner

The most dangerous UX failure in the current journey: a student who arrived at Build looking for their assigned homework tool has no escape hatch.

Add to `app/studio/page.tsx`, **above** the hero section (renders for students only):

```tsx
{isStudent && (
  <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between gap-4">
    <p className="text-sm text-amber-800">
      <span className="font-semibold">Looking for a tool your professor assigned?</span>
      {' '}That lives in your Courses, not here.
    </p>
    <Link
      href="/courses"
      className="flex-shrink-0 text-xs font-bold text-amber-900 border border-amber-400 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
    >
      Go to Courses →
    </Link>
  </div>
)}
```

This renders above the hero, not inside it — so it is the very first thing a lost student sees, before the dark atmospheric banner distracts them.

**Effort:** ~12 lines in `app/studio/page.tsx`.

---

#### 5. Replace Jargon in Build Page Cards

In `app/studio/page.tsx`, the `STUDIO_TOOLS` array (lines 13–36):

| Field | Current | Change to |
|---|---|---|
| Tool Builder description | "...picks the experience type, and scaffolds your tool" | Remove "scaffolds." Say: "...picks the format, and sets it up for you." |
| Tool Builder description | "...The AI writes the system prompt..." | Change to: "The AI writes the instructions..." |
| Playground description | "A live code editor for building and testing..." | Change to: "A visual code editor for building custom AI apps from scratch." Add a `difficulty` badge: `Intermediate — some coding helpful` |

**Effort:** 3 string changes. Under 10 minutes.

---

#### 6. Remove "Demo" Badge From Avatar Button

`app/components/Header.tsx`, line 284. Wrap in a `DEMO_MODE` check or delete entirely.

```tsx
// Current:
<span className="hidden sm:inline-flex items-center text-[10px] font-bold ...">Demo</span>

// Change to:
{process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
  <span className="hidden sm:inline-flex items-center text-[10px] font-bold ...">Demo</span>
)}
```

This requires adding `NEXT_PUBLIC_DEMO_MODE=true` to the demo `.env`. When real auth lands, flip to `false` and the badge disappears everywhere automatically.

**Effort:** 3 lines.

---

#### 7. Update Welcome Modal Copy

The modal currently leads with "Interactive Demo" and spends its entire body explaining persona-switching. Since the abstract section names are being dropped, the modal also needs its role descriptions updated.

**Proposed rewrite for `app/page.tsx` (lines 306–336):**

```tsx
<div className="mb-1 inline-flex items-center gap-2 rounded-full bg-[#0033A0]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0033A0]">
  Live Demo
</div>
<h2 className="mt-3 text-2xl font-extrabold text-gray-900">Welcome to The Sandbox</h2>
<p className="mt-3 text-sm leading-relaxed text-gray-600">
  An AI-powered learning platform for the University of Kentucky — built by CATS-AI.
  Professors build practice tools. Students use and build them too.
</p>
<p className="mt-3 text-sm leading-relaxed text-gray-600">
  You're viewing as <span className="font-semibold text-gray-900">{currentUser.name}</span>.
  Switch perspectives using the avatar menu in the top-right corner.
</p>
<ul className="mt-3 space-y-2 text-sm text-gray-700">
  <li className="flex items-center gap-2">
    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-purple-500" />
    <span><span className="font-semibold">Ian or Tiana</span> — student view: courses, tools, building</span>
  </li>
  <li className="flex items-center gap-2">
    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
    <span><span className="font-semibold">Heath Price</span> — educator view: analytics, courses, publishing</span>
  </li>
  <li className="flex items-center gap-2">
    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#0033A0]" />
    <span><span className="font-semibold">Dr. DiPaola</span> — admin view: platform stats, service bots</span>
  </li>
</ul>
<button ...>Explore The Sandbox</button>
```

The key changes: lead with what the product IS (not that it is a demo), and update role descriptions to use the new section names.

**Effort:** ~20 lines changed in one component.

---

### P1 — Do These Next (Medium Effort, High Impact)

---

#### 8. Role-Differentiated Nav (Make It Real)

The `NAV_ITEMS` array has a `roles` field that currently goes unused — every item is `always: true`. This is the main structural change that makes students and educators see different navs.

```typescript
const NAV_ITEMS: NavLink[] = [
  { href: '/',          label: 'Home',       always: true },
  { href: '/courses',   label: 'Courses',    always: true },
  { href: '/tools',     label: 'Tools',      roles: ['STUDENT'] },
  { href: '/services',  label: 'Services',   always: true },   // was /hub
  { href: '/community', label: 'Community',  roles: ['STUDENT'] }, // was /campus
  { href: '/build',     label: 'Build',      always: true },   // was /studio
  { href: '/analytics/faculty', label: 'Analytics', roles: ['EDUCATOR', 'ADMIN'] },
  { href: '/admin',     label: 'Admin',      roles: ['ADMIN'] },
]
```

Students see: Home | Courses | Tools | Services | Community | Build
Educators see: Home | Courses | Services | Build | Analytics
Admins see: Home | Courses | Services | Build | Analytics | Admin

The `canSeeLink` filter at line 155 already handles this — it is just not being exercised.

**Effort:** ~15 lines in `Header.tsx`. Then update routing if `/hub` → `/services` and `/campus` → `/community` (or keep old URLs and just change the label — redirects are optional if you don't want to break existing links).

**Routing note:** You can keep the old URLs (`/hub`, `/campus`, `/studio`) and just change the nav labels pointing to them. No redirects needed unless you want clean URLs. The label is the user-facing surface; the URL is secondary.

---

#### 9. Build Page — Student-First Hero Copy

The current hero for students: *"You know exactly what your peers need. Build it here."*

This assumes intent. A student landing here cold does not know yet whether they want to build. The hero should describe before it motivates.

**Proposed student hero subheading in `app/studio/page.tsx`:**

```
Build your own AI tool — a tutor, a quiz, a debate partner, a simulator —
and attach it to your courses or share it with the whole university.
No coding required for the Tool Builder. Some coding for Playground.
Your professor's shared course data is available to power any tool you create.
```

This directly answers: *What is Build? What can I make? Do I need to code? What data can I use?* — the four questions the student journey audit found students were asking silently.

**Effort:** Copy edit in one JSX string, `app/studio/page.tsx` lines 207–212.

---

#### 10. Homepage Dashboard — "Explore" Empty State for New Students

When a student has zero library entries and zero sessions (new to the platform), the dashboard renders an awkward half-state: fake demo stats from the synthetic profile alongside an empty "Jump Back In" card telling them to browse tools.

For new-student empty state, replace the entire activity section with a **three-tile orientation panel:**

```
┌─────────────────┬─────────────────┬─────────────────┐
│  📚 Your Courses│  🔧 Browse Tools│  🔨 Build       │
│  See what your  │  Hundreds of AI │  Create your own│
│  professor has  │  tools across   │  AI tool — no   │
│  set up for you │  every subject  │  coding needed  │
│  → Go to Courses│  → Browse Tools │  → Open Builder │
└─────────────────┴─────────────────┴─────────────────┘
```

This renders only when `libraryEntries.length === 0 && studentProfile.recentSessions.length === 0`. Once the student has any activity, it disappears and the normal activity feed takes over.

**Effort:** ~40 lines of JSX in `app/page.tsx`. Conditional on existing `libraryEntries` and `studentProfile` state that is already fetched.

---

#### 11. Hide "Manage" Cards Progressively on Build Page

Do not hide all of Manage — Bounties in particular is a great discovery hook for students new to building. The right progressive disclosure:

| Card | Show When |
|---|---|
| Bounties | Always — it is a discovery hook |
| Datasets | Always — it is useful context for what tools can do |
| My Apps | Only when `myAppsCount > 0` |
| Publish a Tool | Only after the student has used Tool Builder at least once |

For My Apps and Publish, when the student has zero apps, replace the card with a locked/ghost state:

```tsx
<div className="opacity-40 cursor-not-allowed group flex flex-col gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100">
    <LayoutGrid className="w-4 h-4 text-gray-400" />
  </div>
  <div>
    <p className="text-sm font-bold text-gray-500">My Apps</p>
    <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
      Build your first tool to see it here.
    </p>
  </div>
</div>
```

**Effort:** Requires either a localStorage flag (set when Tool Builder completes) or a lightweight `GET /api/my-apps?count=true` call. localStorage flag is simpler and avoids a new API route.

---

### P2 — Next Sprint (Medium Effort, Medium-High Impact)

---

#### 12. Global Search / Command Palette (⌘K)

The single highest-leverage navigation feature not currently in the platform. Students think in terms of **what they want**, not **where it lives**. A student who wants "the Evidence Rules Simulator" should not have to know it is in Courses → Tools tab. They should be able to type it.

**Architecture:**
- Keyboard trigger: `⌘K` / `Ctrl+K`, plus a search icon in the header
- Data sources (client-side, no new API):
  - Tools list — already fetched on `/tools/page.tsx`, factor the fetch into a shared `useTools()` hook
  - Nav routes — static list
  - Enrolled courses — already fetched in `app/page.tsx`
- Fuzzy match using a lightweight lib (e.g. `fuse.js`, already likely in the JS ecosystem, or implement a simple `includes()` filter)
- Results grouped by type: Tools | Courses | Pages

**Implementation path:**
1. Create `app/components/CommandPalette.tsx` — the modal UI
2. Create `app/hooks/useCommandPalette.ts` — keyboard listener, open/close state
3. Factor the tools fetch into `app/hooks/useTools.ts` (currently duplicated across `/tools/page.tsx` and wherever Sandy fetches)
4. Register the keyboard listener in `ClientProviders.tsx`
5. Add a search icon button to `Header.tsx` next to the avatar button

**Effort:** ~200 lines of new code across 4 files. No new API routes.

---

#### 13. Sandy — Studio Starter Personalization Based on Role

Currently `getPageStarters` is static per route. Since Studio is confirmed as a student feature, the starters should be role-aware **and** sensitive to whether the student has built before.

```typescript
if (pathname.startsWith('/studio') || pathname.startsWith('/build')) {
  if (user.role === 'STUDENT') {
    return hasBuiltBefore ? [
      'Help me improve my last tool',
      'What data has my professor shared?',
      'How do I add a quiz to my tool?',
      'Show me tools similar to what I built',
    ] : [
      'What kind of tool should I build?',
      'What data has my professor shared?',
      'Walk me through the Tool Builder step by step',
      'Show me example student-built tools',
    ]
  }
  // educator starters (existing /builder starters already work for this)
  return [
    'What learning objectives should this tool target?',
    'How should I structure a Socratic-style prompt?',
    'Show me a finished tool similar to what I\'m building',
    'What does a good rubric look like for this type of tool?',
  ]
}
```

`hasBuiltBefore` can be read from `localStorage` (set when Tool Builder completes) or from a user XP/session check already available in the auth context.

**Effort:** ~20 lines in `ConciergePanel.tsx`.

---

#### 14. Sandy — Pulse Hint on Build Page for First-Time Student Visitors

Sandy already has the tooltip system (`showSandyTooltip`, lines 178–186 of `ConciergePanel.tsx`). It currently fires only on first login platform-wide. Extend it to also fire on first Studio visit with a Build-specific message.

```typescript
useEffect(() => {
  try {
    const studioKey = 'sandbox-studio-sandy-nudge'
    const isFirstStudioVisit = pathname.startsWith('/studio') && !localStorage.getItem(studioKey)
    if (isFirstStudioVisit && currentUser.role === 'STUDENT') {
      setShowSandyTooltip(true)
      localStorage.setItem(studioKey, '1')
      const timer = setTimeout(() => setShowSandyTooltip(false), 7000)
      return () => clearTimeout(timer)
    }
  } catch { /* ignore */ }
}, [pathname, currentUser.role])
```

The tooltip message should be Build-specific: *"New to Build? Ask Sandy what kind of tool you should make →"*

**Do not auto-open Sandy.** The pulse/tooltip is the right trigger level. Auto-opening panels trains users to dismiss them.

**Effort:** ~15 lines in `ConciergePanel.tsx`.

---

#### 15. Mobile Audio/Podcast Feature Prominence

Since audio/podcast features are identified as a good mobile use case: wherever audio content surfaces (AudioPlayerBar, any podcast-style tool), add `sm:hidden` prominence on mobile — i.e., pin the player higher in the mobile layout or add a bottom-nav shortcut for audio on mobile.

The `AudioPlayerBar` already renders platform-wide. The main change needed is ensuring the mobile nav (hamburger menu) has an "Audio" shortcut that only shows when audio content is active or available.

**Effort:** Dependent on how audio content is discovered — needs a separate design pass once the audio feature set is clearer.

---

### P3 — After Real Auth Lands

---

#### 16. First-Run Onboarding Wizard (Build Once, for Real Auth)

Do not build this as a demo patch. Build it once for the real SSO-authenticated user experience.

**Architecture:**
- Trigger condition: `user.hasCompletedOnboarding === false` (a new field on the User model)
- Renders as a full-screen modal overlay from `ClientProviders.tsx` (same pattern as the current welcome modal)
- Three steps, skippable:

**Step 1 — Orientation** (shown to all new users)
```
"Welcome. Here's what The Sandbox is."
[Three tiles: Use tools your professor set up | Browse the tool library | Build your own tools]
```

**Step 2 — Role-specific path**
- If STUDENT: *"Check if your professor has set up a course for you →"* → links to `/courses`
- If EDUCATOR: *"Set up your first course →"* → links to the Course Setup Wizard
- If ADMIN: *"Check the approval queue →"* → links to `/admin`

**Step 3 — Introduce Sandy**
```
"Sandy is your AI guide. She knows what's on every page and can navigate for you.
Ask her anything." [One sample question pre-filled → click to send]
```

After Step 3, set `user.hasCompletedOnboarding = true` via `PATCH /api/users/me`.

This replaces: the welcome modal, the homepage empty state orientation tiles (P1 above), and the Studio redirect banner (P0 above) — all three of which are compensating for the absence of a proper onboarding flow. Once this exists, the P0 and P1 compensations can be removed.

**Effort:** ~300 lines new code. One new API endpoint (`PATCH /api/users/me` to set the flag). One new Prisma field (`onboardingComplete Boolean @default(false)`).

---

## Things Not In the Audit That Are Still Worth Noting

**The "Manage" section copy on Build page talks about "Sand" (the platform currency) without ever explaining what Sand is.** The Bounties card reads: *"Fulfill one to earn Sand."* This is the first place most users encounter the currency name, with no explanation. Add a tooltip or parenthetical: *"Sand — the platform's reward currency"* until there is a proper currency explainer page.

**The Build page is shown to students in the Quick Access sidebar on the homepage.** This is correct behavior — keep it. But the label currently just says "Studio." Once renamed to "Build," add a micro-descriptor in parentheses: **Build (create AI tools)** — one line of text next to the icon in the Quick Access list.

**The `lg:pr-80` right margin for Sandy compresses the main content significantly on 1080p screens.** On Studio (Build) in particular, the two tool builder cards (`Tool Builder` and `Playground`) are displayed in a grid that gets narrow fast. Consider whether Sandy should be collapsible by default on Studio so students have full width to see what they are building toward before deciding to open it.

---

## Summary Table

| Priority | Change | Files | Effort |
|---|---|---|---|
| P0 | Rename nav labels + add Tools item | `Header.tsx` + 5 page files | 2h |
| P0 | Add Tools to student nav | `Header.tsx` | 5 min |
| P0 | Sandy: Add `/studio` to PAGE_DESCRIPTIONS | `api/concierge/route.ts` | 5 min |
| P0 | Sandy: Add studio starters to `getPageStarters` | `ConciergePanel.tsx` | 10 min |
| P0 | Studio student redirect banner | `studio/page.tsx` | 20 min |
| P0 | Replace jargon in Build page cards | `studio/page.tsx` | 10 min |
| P0 | Remove "Demo" badge (env-flag it) | `Header.tsx` | 5 min |
| P0 | Update welcome modal copy | `page.tsx` | 30 min |
| P1 | Role-differentiated nav (activate roles filter) | `Header.tsx` | 1h |
| P1 | Build page student-first hero copy | `studio/page.tsx` | 20 min |
| P1 | Homepage empty state for new students | `page.tsx` | 1h |
| P1 | Progressive Manage card disclosure | `studio/page.tsx` | 1h |
| P2 | Global search / command palette | 4 new/modified files | 1–2 days |
| P2 | Sandy studio starters — role + history aware | `ConciergePanel.tsx` | 30 min |
| P2 | Sandy pulse hint on first Build visit | `ConciergePanel.tsx` | 20 min |
| P2 | Mobile audio prominence | `AudioPlayerBar` + mobile nav | Design pass first |
| P3 | First-run onboarding wizard (wait for SSO) | New component + API | 2–3 days |

---

*Cross-reference: `codex-ux-friction-fixes.md`, `demo-to-product-architecture.md`*
*Sandy concierge implementation: `app/components/ConciergePanel.tsx`, `app/api/concierge/route.ts`*
