# Student Journey UX — Engineering & Strategy Blueprint
### The Sandbox · University of Kentucky · CATS-AI
### Prepared: 2026-03-18

---

## Preface — Three Voices, One Document

This blueprint is the output of a three-perspective review process:

1. **Master Software Engineer** — Triages the student journey audit, scores each issue, and decides what to build vs. defer.
2. **Head Strategic & Culture Lead for UX** — Evaluates every recommendation through the lens of trust, identity, and long-term habit formation at a university.
3. **Head Software Engineer** — Optimizes for ease of implementation and maximum leverage per line of code changed.

The result is a sequenced, opinionated implementation plan tied to specific files, components, and design decisions.

---

## Part I — Master Software Engineer: Triage & Build Decision

### Evaluation Framework

Each issue from the student journey audit is scored on two axes:
- **Impact** (1–5): Effect on core activation, retention, and trust if fixed
- **Effort** (1–5): Engineering cost, where 1 = one-afternoon change, 5 = multi-sprint feature

**Decision rule:** Build anything with Impact ≥ 4 and Effort ≤ 3 immediately. Everything else is sequenced by Impact/Effort ratio.

---

### Issue Scorecard

| # | Issue | Impact | Effort | Ratio | Decision |
|---|---|---|---|---|---|
| 1 | Empty dashboard first login | 5 | 2 | 2.5 | **Build Now** |
| 2 | Dual AI surfaces (Sandy + Tool) | 5 | 1 | 5.0 | **Build Now** |
| 3 | No session end state / XP closure | 5 | 3 | 1.7 | **Build Now** |
| 4 | Sand & XP undefined everywhere | 4 | 1 | 4.0 | **Build Now** |
| 5 | Demo data bleeds across user roles | 4 | 1 | 4.0 | **Build Now** |
| 6 | Landing page value prop | 4 | 2 | 2.0 | **Build Now** |
| 7 | Course number search in marketplace | 4 | 2 | 2.0 | **Build Now** |
| 8 | Quest claim — no celebration | 3 | 1 | 3.0 | **Build Now** |
| 9 | Intent capture — course routing | 4 | 3 | 1.3 | **Build Now** |
| 10 | Profile confirmation — noise | 3 | 1 | 3.0 | **Build Now** |
| 11 | Tool card two-click launch | 3 | 2 | 1.5 | **Next Sprint** |
| 12 | Enrichment steps not student-aware | 3 | 3 | 1.0 | **Next Sprint** |
| 13 | Email step — UK email help text | 2 | 1 | 2.0 | **Build Now** (5-min fix) |
| 14 | Play tab unexplained | 2 | 1 | 2.0 | **Build Now** (5-min fix) |
| 15 | Fork button visible to students | 2 | 1 | 2.0 | **Next Sprint** |
| 16 | Sandy sidebar unlabeled | 3 | 1 | 3.0 | **Build Now** |

---

### What NOT to Build (and Why)

- **Full onboarding tour overlay (tooltips, spotlight walkthroughs):** These are high-effort and students dismiss them within seconds. The better investment is fixing the empty state (Issue 1) — show them *value* on first load, not instructions.
- **Separate "Sand Store" page:** The `Visit Sand Store` link in `StudentQuestWidget.tsx` currently goes to `/tools`. Until Sand has actual purchasing mechanics, don't build the store. Instead, rename the link to "Browse Tools" and explain Sand inline with a tooltip.
- **Rewriting the enrichment engine for student directories:** UK's student directory is not publicly searchable by design (FERPA). The low-confidence fallback (blank form) is the *correct* behavior for most students. Fix the *presentation* of that fallback, not the engine itself.

---

## Part II — Head Strategic & Culture Lead: UX & Trust Analysis

### The Core Trust Problem

Every friction point in the student journey has the same root: **the platform was designed from the educator's perspective first.** The enrichment engine searches a faculty directory. The dashboard shows metrics useful after 30 days of usage. The intent options assume the student knows what "a tool" is. The gamification mechanics use currency terminology ("Sand") without grounding it in any real-world analog.

Students arrive with a different mental model:
> *"My professor said to use this. I have 10 minutes. Show me something useful."*

The platform needs to meet that student in those 10 minutes and give them one undeniable moment of value. Everything else is secondary.

---

### The "First 10 Minutes" Doctrine

The strategic goal of every fix in this blueprint is to create one **anchoring moment** in the first session — a moment where the student thinks *"okay, this is actually useful."* This moment must happen before:
- They see a single zero-stat
- They encounter any unexplained jargon
- They click more than 3 times after landing

The anchoring moment is: **launching a tool and getting a useful AI response.** Every design decision should be evaluated by whether it shortens or lengthens the path to that moment.

---

### On Gamification in an Academic Context

The gamification layer (XP, Sand, Levels, Streaks, Quests) is genuinely engaging — but it carries a real risk in an academic environment. Students at a research university may resist a system that feels like a mobile game. The branding of this layer needs to feel *academic* not *Duolingo.*

**Recommendations:**
- Rename "Sand" to something that connects to UK identity. Options: **"Blue Bucks"** (ties to UK blue), **"Wildcats"** (mascot), **"XP Tokens"** (neutral). "Sand" is an internal metaphor ("The Sandbox") that leaks outward confusingly.
- "Level 1 Scholar" is exactly the right register — keep this. "Scholar" sounds academic.
- Frame quests as **"Today's Goals"** rather than "Daily Quests." Quests sound like video games; goals sound like coursework.
- The streak mechanic is high-value for habit formation but high-risk for anxiety. Add a "streak protect" or "grace day" note from day one: *"Miss a day? No problem — we'll hold your streak for 24 hours."*

---

### On the "Two AI" Problem — Sandy's Identity Crisis

Sandy is the platform's most strategic asset: a context-aware concierge that knows which page the student is on, which course they're in, and what they're trying to accomplish. But Sandy is being introduced as a *sidebar* inside a tool — which makes her feel like a help widget, not a trusted guide.

**Strategic repositioning:** Sandy should be introduced to the student **before** they enter any tool — ideally on the home dashboard, with a one-sentence explanation of what she does differently than the tool's AI. The mental model students need:

> *"The tool teaches you. Sandy helps you navigate."*

This distinction, stated once clearly, eliminates 90% of the dual-AI confusion.

---

### On Privacy and Institutional Trust

Students at a university are increasingly privacy-conscious, especially around AI. The enrichment step ("we found you") lands differently for students than faculty — it can feel invasive rather than helpful.

The privacy footer in `PrivacyFooter.tsx` exists but is buried at the bottom of the chat interface. It needs to be surfaced **during signup**, not after the student is already inside a session.

**Trust signal placement:**
- Signup page: Add "Your data stays within UK — never used to train AI models" near the Continue button
- Profile confirmation page: Add "Sourced from UK directory" footnote under enriched fields
- Tool launch: Keep the privacy footer but make it visible above the fold on first load only

---

## Part III — Head Software Engineer: Technical Optimization

### Principle: Maximum Impact, Minimum Surface Area

Every implementation recommendation below is designed to be:
1. **Contained** — touches the fewest possible files
2. **Reversible** — no schema migrations, no new tables required
3. **Testable** — can be verified by switching to a demo user and following the journey

---

### Implementation Plan — Build Now (Sprint 1)

---

#### FIX 1: Empty Dashboard — First-Time User State
**File:** `app/page.tsx`
**Approach:** Single conditional on `currentUser`. The User model already has `onboardingCompleted: Boolean`. Read this flag from auth context and render a `<FirstTimeHome />` component instead of the full dashboard for users where `onboardingCompleted === false` OR where all stats are zero.

**`<FirstTimeHome />` component spec:**
```
┌─────────────────────────────────────────────────────┐
│  Welcome to The Sandbox, [FirstName]. 👋             │
│  UK's AI learning environment — built for you.       │
│                                                     │
│  Start here:                                        │
│  ┌─────────────────┐  ┌─────────────────┐           │
│  │ 🔍 Find a tool  │  │ 🎯 Try something │           │
│  │ for my course   │  │ fun             │           │
│  └─────────────────┘  └─────────────────┘           │
│                                                     │
│  ──── What others are using right now ────          │
│  [Tool Card] [Tool Card] [Tool Card]                │
│  (top 3 most-used tools this week)                  │
│                                                     │
│  [Skip to full dashboard →]                         │
└─────────────────────────────────────────────────────┘
```

**Implementation detail:**
- Check: `currentUser.onboardingCompleted === false` → show `<FirstTimeHome />`
- After user launches first tool, flip flag via `PATCH /api/users/me` → `onboardingCompleted: true`
- Alternatively, use `localStorage` key `sandbox-first-visit-{userId}` if schema migration is not desired
- The "top 3 most-used tools" are a simple `GET /api/tools?sort=sessions&limit=3` — already supported by the tools API

**Effort:** 4 hours — new component, one conditional in page.tsx, one API call.

---

#### FIX 2: Sandy Sidebar — Label & Default State
**Files:** `app/components/ConciergePanel.tsx` (or equivalent), tool page layout
**Approach:**
1. Add a clear label at the top of the Sandy panel: *"Sandy — your platform guide (not the tool's AI)"*
2. Default Sandy to **collapsed** on first visit to any tool page. Persist open/closed state per user in `localStorage` key `sandbox-sandy-open`.
3. The toggle button (FAB) should be labeled on first render: *"Ask Sandy for help →"* — after first click, collapse to icon-only.

**Effort:** 1 hour — CSS state management and one localStorage read/write.

---

#### FIX 3: Session End State — Completion Modal
**File:** `app/components/ChatInterface.tsx`
**Approach:** Add an **"End Session"** button to the chat header (alongside existing back button). On click, fire a modal:

```
┌──────────────────────────────────────────────────┐
│  Great session! ✓                                │
│                                                  │
│  Tool: LAW 756: Evidence Rules Simulator         │
│  Time: 14 minutes                               │
│  Messages: 8 exchanges                          │
│  Score: 87 / 100                                │
│                                                  │
│  ┌─────────────────────┐                         │
│  │  +45 XP earned  ⭐  │                         │
│  │  +25 Sand earned 🪙  │                         │
│  └─────────────────────┘                         │
│                                                  │
│  Quest progress: "Use a tool today" ✓ Complete  │
│                                                  │
│  Suggested next:                                 │
│  → Cross-Examination Simulator (same course)    │
│                                                  │
│  [ Back to Dashboard ]    [ Try next tool → ]   │
└──────────────────────────────────────────────────┘
```

**Implementation detail:**
- Session duration: already tracked via `sessionId` and `useState` — compute `Date.now() - sessionStartTime`
- Message count: already available via `messages.length`
- XP/Sand earned: compute from session score (existing scoring logic) — display the delta, don't require a DB write to show it in the modal
- Quest completion: check `QUESTS` array against session completion — mark "Use a tool today" as complete
- "Suggested next": call `GET /api/tools?courseId={courseId}&limit=1&exclude={currentToolId}` — return one related tool

**Effort:** 4–6 hours — modal component, session timer, XP delta calculation. No schema changes required.

---

#### FIX 4: Sand & XP Tooltips — Define the Mechanics Inline
**Files:** `app/components/StudentQuestWidget.tsx`, `app/page.tsx` (vitals grid)
**Approach:** Add `title` attributes (or Radix `<Tooltip>`) to every gamification element that has no explanation:

| Element | Tooltip text |
|---|---|
| "Sand balance" | "Sand is the currency of The Sandbox. Earn it by completing quests and tools. Spend it in the Sand Store to unlock premium experiences." |
| "XP" | "Experience Points measure your learning activity. Earn XP every time you use a tool, hit a high score, or complete a quest." |
| "Level N Scholar" | "Your Scholar Level increases as you earn XP. Higher levels unlock new tools and Sandcastle experiences." |
| "Streak" | "Your streak counts consecutive days you've used at least one tool. You get a 24-hour grace period if you miss a day." |
| "Sand Store" link | Fix: rename to "Browse Tools & Rewards" — remove reference to a store that doesn't exist yet |

**Effort:** 1 hour — tooltip wrappers, no logic changes.

---

#### FIX 5: Demo Data Isolation
**File:** `app/page.tsx` — `STUDENT_PROFILES` record
**Problem:** `STUDENT_PROFILES` is keyed by email correctly — Ian sees Ian's data, Tiana sees Tiana's. But `ActionItems.tsx` and `upcomingDue` may be pulling from a shared source or defaulting to Ian's data when Tiana has no sessions.

**Approach:**
1. Add a full `STUDENT_PROFILES` entry for `tiana.the@uky.edu` with English/Arts & Sciences-appropriate data:
   - Recent sessions: "Essay Argument Builder," "The Devil's Advocate," "Peer Review Simulator"
   - Upcoming due: "ENG 201 Essay Draft," "Arts 110 Project Proposal"
   - Focus objectives: "Developing a defensible thesis," "Source integration and attribution"
   - Streak: 5, Sessions: 14, Score: 78
2. Audit `ActionItems.tsx` to ensure it reads from the user-keyed profile, not a hardcoded default.
3. Add a fallback profile for any unrecognized email: generic "new student" profile with all zeros and a "Start here" CTA.

**Effort:** 1 hour — data entry and one fallback check.

---

#### FIX 6: Signup Page — Value Prop & Trust Signals
**File:** Signup/onboarding page (email entry step)
**Changes (copy only, no logic):**
- Tagline change: *"UK's AI-powered educational tool marketplace"* → *"Your professors' AI — ready for you."*
- Add beneath the email input: *"This is your @uky.edu email (the one you use for Canvas and myUK). Free for all UK students."*
- Add trust line below Continue button: *"Your data stays within UK and is never used to train AI models. See our privacy policy."*
- Add a 3-step progress indicator above the form: `① Email → ② Your Profile → ③ You're In`

**Effort:** 30 minutes — copy changes in the signup component.

---

#### FIX 7: Course Number Search in Marketplace
**File:** `app/tools/page.tsx`
**Approach:** Add a sticky "Find tools for my course" input at the top of the Learn tab (above the filter row):

```
┌─────────────────────────────────────────────────────┐
│  🔍 Enter your course number  [ ENG 201        ] →  │
│     (e.g. LAW 756, ENG 201, CHEM 101)              │
└─────────────────────────────────────────────────────┘
```

- Filter tools where `tool.courseCode` includes the query string (case-insensitive)
- If no results: *"No tools found for ENG 201 yet. Ask your professor to build one →"* (links to `/build`)
- This input sits above the existing filter/search bar, not replacing it

**Effort:** 2 hours — controlled input, client-side filter over existing tools array.

---

#### FIX 8: Quest Claim — Celebration Micro-Animation
**File:** `app/components/StudentQuestWidget.tsx`
**Problem:** Quests are hardcoded constants (`QUESTS` array, line 14–18). The "Claim" button doesn't exist — quests are just shown as completed with a strikethrough. There is no claim action at all.

**Approach:**
1. Add a **"Claim →"** button that appears when `quest.completed === true` and `quest.claimed === false`
2. On click: animate a coin burst (CSS keyframes — 3 coins fly upward from the button, fade out) and show a toast: *"+25 Sand added to your balance"*
3. Update `quest.claimed = true` in local state (persist in `localStorage` with daily reset key `sandbox-quests-{YYYY-MM-DD}`)
4. Update the `sandBalance` displayed in the widget header immediately (optimistic UI)

**Effort:** 3 hours — state management, CSS animation, toast component (or reuse existing toast if one exists).

---

#### FIX 9: Intent Capture — Replace Tool Search with Course Input
**File:** Onboarding intent step component
**Problem:** The "My professor recommended a tool" path asks "What tool are you looking for?" — but students rarely know the tool name, only the course.

**Replace with:**
```
"What course are you working on?"
[ ENG 201 — British Literature    ▾ ] or type a course code

[ Find tools for this course → ]
```

- The dropdown shows a short list of common UK courses (pre-seeded)
- Free-text input also accepted: filter by courseCode on submit
- Route to `/tools?course=ENG201` on continue — marketplace pre-filtered

**Effort:** 2 hours — change input type, add course list, update routing logic.

---

#### FIX 10: Profile Confirmation — Noise Reduction
**Files:** Onboarding profile confirmation step
**Changes:**
1. Remove "Admin" from the Role dropdown — show only `Educator` and `Student`
2. Remove the pencil "✎ Edit" icon in the top-right if "Edit anything above" button already exists below — keep one entry point only
3. Add source label under enriched fields: *"Sourced from UK directory — edit anything that's wrong"*
4. Add interest chip explanatory label: *"We guessed these from your college — tap to remove any that don't fit"*
5. Add near the CTA: *"By continuing, you agree to our Terms of Use. Your data stays within UK."*

**Effort:** 30 minutes — copy changes and one conditional remove in JSX.

---

#### FIX 11: Sandy Labeling — Distinguish from Tool AI
**Files:** ConciergePanel / Sandy sidebar component
**Changes:**
1. Header of Sandy panel: add subtitle *"Your platform guide — different from the tool's AI"*
2. First message Sandy sends: *"Hi! I'm Sandy, your Sandbox guide. I can help you navigate the platform, find tools for your courses, or explain how things work. The AI inside this tool handles the actual learning."*
3. Sandy FAB: label it *"Ask Sandy (platform help)"* on first render per session

**Effort:** 1 hour — copy changes in Sandy component.

---

#### QUICK FIXES (< 30 min each)

| Fix | File | Change |
|---|---|---|
| "Play" tab explainer | `app/tools/page.tsx` | Add subtitle: "Play — compete and earn rewards while you study" |
| "Visit Sand Store" wrong link | `StudentQuestWidget.tsx` line 120 | Change text to "Browse Tools" and href stays `/tools` or rename once store is built |
| Filter icon unlabeled | `app/tools/page.tsx` | Add `<span>Filter</span>` next to `SlidersHorizontal` icon |
| Default sort → Most Used | `app/tools/page.tsx` | Change default sort state from `'newest'` to `'sessions'` |
| Email validation error message | Signup page | Change "must be @uky.edu domain" to "Use your UK email — the one you log into Canvas with (example: jsmith@uky.edu)" |

---

### Implementation Plan — Next Sprint (Sprint 2)

#### S2-1: Tool Card — Streamlined Launch Flow
**Problem:** Two-click barrier (card click → modal → Launch Tool button).
**Approach:** Convert the modal to a bottom sheet on mobile / right-side drawer on desktop. Show only: tool name, 1-sentence description, star rating, and a full-width "Start →" button. Move upvote/favorite/fork to the **post-session summary modal** (built in FIX 3) so the student has actual experience before rating.

#### S2-2: Enrichment Loading — Student-Aware Steps
**Problem:** Steps like "Searching UK faculty directory" are shown to students.
**Approach:** Pass a `role` hint to the enrichment step list. If role is inferred as Student (email pattern, or no faculty directory match), show: *"Checking your enrollment... → Identifying your college... → Suggesting interests..."* instead of faculty-specific steps.

#### S2-3: Fork Button — Role-Gated
**Problem:** Students see "Fork/Customize" (GitFork icon) on tool detail pages.
**Approach:** Wrap the fork button in a role check: `currentUser.role === 'EDUCATOR'` — hidden for students. Or repurpose it for students as "Save to My Library" (bookmark).

---

## Part IV — Unified Priority Queue

### Sprint 1 — Build Now (Total: ~20 hours)

| Priority | Fix | Files Touched | Est. Hours |
|---|---|---|---|
| P0 | Empty dashboard first-time state | `app/page.tsx` + new `<FirstTimeHome />` | 4h |
| P0 | Sandy label + collapse by default | `ConciergePanel.tsx` | 1h |
| P0 | Session end modal | `ChatInterface.tsx` + new `<SessionSummaryModal />` | 5h |
| P1 | Sand/XP tooltips + fix "Sand Store" link | `StudentQuestWidget.tsx`, vitals grid | 1h |
| P1 | Demo data — Tiana profile + fallback | `app/page.tsx` STUDENT_PROFILES | 1h |
| P1 | Signup copy — value prop + trust signals | Signup page component | 0.5h |
| P1 | Quest claim animation | `StudentQuestWidget.tsx` | 3h |
| P1 | Course search in marketplace | `app/tools/page.tsx` | 2h |
| P2 | Intent capture — course routing | Onboarding intent step | 2h |
| P2 | Profile confirmation — noise reduction | Onboarding profile step | 0.5h |
| P2 | Sandy "different from tool AI" label | Sandy component | 1h |
| P2 | All quick fixes (5 items) | Various | 1h |

**Sprint 1 Total: ~22 hours**

### Sprint 2 — Next Sprint (Total: ~12 hours)

| Priority | Fix | Est. Hours |
|---|---|---|
| P1 | Tool card streamlined launch (bottom sheet) | 4h |
| P2 | Enrichment loading — student-aware steps | 3h |
| P2 | Fork button role-gated / repurposed | 1h |
| P3 | "Sand" currency rename (if approved) | 2h |
| P3 | Streak grace period / protect mechanic | 2h |

---

## Part V — Success Metrics

For each sprint, the following metrics indicate whether the fixes are working:

### Sprint 1 Success Signals

| Metric | Current (Demo) | Target After Sprint 1 |
|---|---|---|
| Steps to first tool launch (new user) | 7+ clicks | ≤ 4 clicks |
| First-session confusion events (Sandy clicked by accident) | Frequent | Near zero |
| Session end without using End Session button | ~100% | < 60% |
| Students who can explain "Sand" after first session | ~0% | > 70% |
| Demo: Tiana's dashboard shows English/Arts data | Fails | Passes |

### Sprint 2 Success Signals

| Metric | Current | Target |
|---|---|---|
| Tool discovery via course number search | 0% | 30%+ of marketplace visits |
| Fork button clicked by students | Some | Zero (hidden) |
| Enrichment loading confusion for students | Present | Eliminated |

---

## Part VI — What This Blueprint Deliberately Does Not Touch

1. **The gamification backend (XP math, Sand economy)** — the mechanics are sound; the presentation is the problem. Fix presentation first, revisit the economy design once students are actually using it.
2. **The onboarding enrichment engine** — the AI enrichment is good and novel. Its *output presentation* needs polish (Fixes 9, 10) but the engine itself should not be refactored.
3. **The navigation IA** — "Home | Courses | Tools | Hub | Community | Build" is a reasonable information architecture. Do not reorganize it until real usage data shows navigation confusion. The current issues are presentation problems, not IA problems.
4. **The Tool Builder (Build tab)** — out of scope for students. Correctly hidden from student role in some views. Ensure role-gate is consistently applied.

---

## Appendix — Design Language Notes

### Copy Tone Guide (for all fixes)
- **Not:** "Enter your UK email to authenticate" → **Yes:** "Enter your UK email — we'll set everything up"
- **Not:** "Your session has been recorded" → **Yes:** "Great session! Here's what you earned."
- **Not:** "No tools found for this course code" → **Yes:** "No tools for ENG 201 yet — ask your professor to build one."
- **Not:** "Claim reward" → **Yes:** "Collect your Sand →"
- **Not:** "Fork this tool" (student) → **Yes:** "Save to My Library"

### Color/Visual Anchors
- UK Blue `#0033A0` — primary CTAs, active nav, progress fills
- Amber `#F59E0B` — Sand currency, XP stars, quest rewards (warmth = reward)
- Green `#16A34A` — completed states, verification badges, streaks
- Red `#DC2626` — urgent due dates, score below 70, warnings only
- Gray `#6B7280` — secondary text, inactive states, metadata

---

*This blueprint should be treated as a living document. Update it after each sprint retrospective with what shipped, what changed, and what was learned.*
