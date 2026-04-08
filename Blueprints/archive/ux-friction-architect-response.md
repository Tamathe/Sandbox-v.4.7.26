# UX Friction — Architect's Implementation Response
**The Sandbox / CATS-AI**
**Date:** 2026-03-18
**Author:** Architect review of student UX audit (landing page → Study Buddy session)

---

## How to Read This Document

Each original UX recommendation is evaluated below with one of three verdicts:

- ✅ **Agree — implement it** (with specific implementation notes)
- ⚠️ **Partially agree — reframe it** (the problem is real but the proposed fix isn't right)
- ❌ **Disagree** (with reasoning)

After the verdict table, see **"Beyond the Audit"** for issues the original audit didn't surface.
At the end: **open questions** I need answered before building.

---

## Verdict Table

| # | Recommendation | Verdict | Effort |
|---|----------------|---------|--------|
| 1 | Rename "Hub" → "Tools" in nav | ✅ Agree | XS |
| 2 | Remove "Interactive Demo" badge from welcome modal | ✅ Agree | XS |
| 3 | Course progress bar color legend | ✅ Agree | XS |
| 4 | Make Quick Access links self-describing | ✅ Agree | S |
| 5 | Surface `bestFor` text permanently on mode cards | ✅ Agree | S |
| 6 | Auto-expand Docs panel when mode = Essay Coach | ✅ Agree | S |
| 7 | Remove Wrap Up confirmation dialog | ✅ Agree | XS |
| 8 | Add "Save Summary" path after wrap-up | ✅ Agree | M |
| 9 | Post-session nudge / next-step CTA | ✅ Agree | S |
| 10 | Persistent "Open" CTA on tool cards at rest | ✅ Agree | XS |
| 11 | "Get" button tooltip in Launch Modal | ✅ Agree | XS |
| 12 | Rename "Arts" category → "Arts & Humanities" | ✅ Agree | XS |
| 13 | Rename "Teach Back" → "Explain to Me" | ❌ Disagree | — |
| 14 | Add Step 1→2→3 indicator to mode select screen | ⚠️ Reframe | S |
| 15 | Replace difficulty badge with plain-language context | ⚠️ Reframe | S |

---

## Implementation Specifications

---

### ✅ Rec 1 — Rename "Hub" → "Tools" in nav
**File:** `app/components/Header.tsx` line ~130

The page title is "Tools." The nav label that routes to it is "Hub." This is a naming inconsistency that adds cognitive load with zero upside — the word "Hub" communicates nothing to a first-time user.

**Implementation:** Single string change.

```tsx
// Header.tsx — NAV_ITEMS array
{ href: '/tools', label: 'Tools', always: true },
```

No other files need changing. The active-state detection uses `pathname.startsWith(href)` so `/tools` already works correctly.

---

### ✅ Rec 2 — Remove "Interactive Demo" framing from the welcome modal
**File:** `app/page.tsx` lines ~304–338

The "Interactive Demo" badge erodes trust the moment a real student opens the platform. It signals "prototype" or "not real." The user-switching instructions (Ian, Heath, DiPaola) are useful for demo stakeholders but are noise — or worse, confusing — for an actual enrolled student.

**Implementation:** Two separate treatments based on who's watching.

```tsx
// Derive whether this is a demo-mode observer (admin/educator previewing student UX)
const isDemoObserver = !isStudent

// In the welcome modal JSX:
{showWelcome && (
  <div className="fixed inset-0 z-50 ...">
    <div className="...">
      {isDemoObserver && (
        <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-[#0033A0]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0033A0]">
          Interactive Demo
        </div>
      )}
      <h2 className="mt-3 text-2xl font-extrabold text-gray-900">
        {isStudent ? `Welcome to The Sandbox, ${currentUser.name.split(' ')[0]}.` : 'Welcome to The Sandbox'}
      </h2>
      {isDemoObserver && (
        // ... existing user-switching instructions
      )}
      {isStudent && (
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Your AI-powered study hub. Find tools built for your courses, practice for exams, and track your progress — all in one place.
        </p>
      )}
      <button onClick={dismissWelcome} className="mt-6 w-full ...">
        {isStudent ? 'Go to My Dashboard' : 'Enter The Sandbox'}
      </button>
    </div>
  </div>
)}
```

**Key principle:** The welcome modal is doing two jobs (onboarding real students AND orienting demo stakeholders). Split the copy for each audience. The `isDemoObserver` flag is a clean proxy for this without touching the DB.

---

### ✅ Rec 3 — Course progress bar color legend
**File:** `app/page.tsx` lines ~469–492 (the course card grid)

The three-color progress bar (green/yellow/gray) is meaningful data rendered without a key. On mobile, title-attribute tooltips don't fire at all, so the colors are completely opaque.

**Implementation:** Add a three-dot inline legend immediately beneath the progress bar.

```tsx
{/* After the progress bar div */}
<div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
  <span className="flex items-center gap-1">
    <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
    Mastered
  </span>
  <span className="flex items-center gap-1">
    <span className="h-2 w-2 rounded-full bg-yellow-400 flex-shrink-0" />
    Needs work
  </span>
  <span className="flex items-center gap-1">
    <span className="h-2 w-2 rounded-full bg-gray-200 flex-shrink-0" />
    Not started
  </span>
</div>
```

Cost: 6 lines. Payoff: the entire course progress section becomes legible without any prior knowledge of the system.

---

### ✅ Rec 4 — Make Quick Access links self-describing
**File:** `app/page.tsx` lines ~655–681 (the Quick Access sidebar widget)

"Hub," "Campus," "Studio" are internal product names. A returning user knows them; a new user sees three words with arrow icons.

**Implementation:** Add a `description` field to the link objects and render it beneath the label at a smaller font size.

```tsx
// Extend the link object shape
{ href: '/tools',             icon: Compass,  label: 'Tools',       description: 'Browse AI study tools'        },
{ href: '/hub',               icon: Compass,  label: 'Hub',         description: 'Explore by topic'             },
{ href: '/campus',            icon: Gamepad2, label: 'Campus',      description: 'Games & competitions'         },
{ href: '/studio',            icon: Brain,    label: 'Studio',      description: 'Build your own AI tools'      },
{ href: '/analytics/student', icon: BarChart3,label: 'My Progress', description: 'Sessions, scores & streaks'   },

// Render:
<Link href={link.href} className="flex items-center gap-2.5 px-3 py-2 rounded-lg ...">
  <Icon className="w-4 h-4 ..." />
  <div className="flex flex-col">
    <span className="text-sm">{link.label}</span>
    <span className="text-[10px] text-gray-400">{link.description}</span>
  </div>
  <ArrowRight className="w-3 h-3 ml-auto ..." />
</Link>
```

---

### ✅ Rec 5 — Surface `bestFor` text permanently on mode cards
**File:** `app/components/StudyBuddyInterface.tsx` — the mode selection grid

`bestFor` is the single most useful piece of copy in the entire Study Buddy selection screen. It tells you *when* to use a mode, not just *what* it does. Currently it's hover-only, meaning it's completely invisible on mobile, and discoverable on desktop only if you hover every card looking for it.

**Implementation:** Render `bestFor` as persistent text below the description, truncated to one line with a title attribute for the full text on hover.

```tsx
// Inside the mode card JSX (wherever mode.description is rendered):
<p className="text-xs text-gray-500 mt-0.5 leading-snug">{mode.description}</p>
<p
  className="text-[10px] text-gray-400 mt-1 leading-snug line-clamp-2 italic"
  title={mode.bestFor}
>
  Best for: {mode.bestFor}
</p>
```

This is 2 lines of JSX. It's the highest-ROI change in the audit.

**Note on card size:** Adding 2 lines will make mode cards taller. The grid is `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` (or similar). At 7 modes, you'll want to verify the layout doesn't wrap awkwardly at tablet breakpoints. A quick visual QA pass is enough — no grid restructuring needed.

---

### ✅ Rec 6 — Auto-expand Docs panel when mode is Essay Coach
**File:** `app/components/StudyBuddyInterface.tsx` — `enterMode` function (~line 391) and the existing docs auto-open effect (~line 350)

The existing effect at line 350 auto-opens Docs when `screen === 'chat'` and `docs.length === 0`. That's correct logic, but it doesn't differentiate by mode. The result is that Docs open regardless of mode — which is distracting in Quiz or Flashcard sessions where document upload is irrelevant.

**Better implementation — reverse the existing logic and be mode-specific:**

```tsx
// Replace the existing auto-open docs effect:
useEffect(() => {
  if (screen !== 'chat') return
  // Only auto-open docs for modes where uploading is a core workflow
  const docCentricModes: Mode[] = ['essay', 'tutor']
  if (docCentricModes.includes(mode) && docs.length === 0) {
    setDocsOpen(true)
  }
}, [screen, docs.length, mode])
```

For Essay Coach specifically, also add an inline prompt inside the Docs panel header when it auto-opens:

```tsx
// Conditional banner inside the docs panel, visible when mode === 'essay' and docs.length === 0:
{mode === 'essay' && docs.length === 0 && (
  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 mb-2">
    Paste your draft or upload a file — Essay Coach works best with your writing in front of it.
  </div>
)}
```

---

### ✅ Rec 7 — Remove the Wrap Up confirmation dialog
**File:** `app/components/StudyBuddyInterface.tsx` — `showWrapupConfirm` state (~line 223)

The confirmation asks "Are you sure you want to end the session?" Wrap Up is not destructive — the session data is already saved to the DB lazily on every message send. There is nothing to lose. The confirmation is protecting against nothing while adding a friction step to what should be a clean exit.

**Implementation:** Delete `showWrapupConfirm` state, delete the confirmation modal JSX, wire the Wrap Up button directly to the wrap-up flow. If you're worried about accidental taps on mobile, replace it with a brief **undo toast** (3 seconds, dismissable):

```tsx
// Instead of confirm dialog:
const handleWrapUp = () => {
  setScreen('wrapup')
  // Optionally: toast("Session ended — ", { action: { label: "Keep going", onClick: () => setScreen('chat') }, duration: 3000 })
}
```

The undo pattern is strictly better than confirmation modals for non-destructive actions. It lets you act immediately and reverse if you made a mistake, rather than interrupting the decision before it's made.

---

### ✅ Rec 8 — Add a "Save Summary" path on the wrap-up screen
**File:** `app/components/StudyBuddyInterface.tsx` — the `wrapup` screen JSX

This is the most impactful missing feature in the study buddy flow. The AI-generated wrap-up (Covered / Strong / Review) is genuinely useful, and it currently evaporates the moment the student clicks Done. The `/notes` system already exists (`app/notes/page.tsx`), making this a data-plumbing problem, not a design invention.

**Implementation — two options, ranked by value:**

**Option A (Recommended): POST the summary to `/api/notes` automatically on wrap-up render**

The summary is already available in `wrapupSummary` state. On `screen === 'wrapup'` mount, fire a POST to `/api/notes` with:
- `title`: `"Study Session: ${toolName} — ${format(new Date(), 'MMM d')}"`
- `content`: The full wrapupSummary markdown
- `sourceSessionId`: `sessionId`

Then show a small toast: *"Summary saved to your Notes."* with a link to `/notes`.

```tsx
useEffect(() => {
  if (screen !== 'wrapup' || !wrapupSummary || !sessionId) return
  // Auto-save to notes
  fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
    body: JSON.stringify({
      title: `Study Session: ${toolName} — ${format(new Date(), 'MMM d')}`,
      content: wrapupSummary,
      sourceSessionId: sessionId,
    }),
  }).catch(() => {}) // Non-critical; silent fail is acceptable
}, [screen, wrapupSummary, sessionId])
```

**Option B: "Copy to clipboard" button** — one line, always works, no API dependency. Use this as the fallback if the notes API schema isn't ready.

```tsx
<button onClick={() => navigator.clipboard.writeText(wrapupSummary)} className="...">
  Copy Summary
</button>
```

**Schema note:** Check if `/api/notes` POST already accepts a `sourceSessionId` field. If not, it's worth adding — it creates a traceability link between a note and the session that generated it, which becomes valuable when you build the student portfolio/analytics export.

---

### ✅ Rec 9 — Post-session nudge with next-step CTA
**File:** `app/components/StudyBuddyInterface.tsx` — bottom of the wrap-up screen

After the summary and quiz log, there's currently a Done button and nothing else. A student who finished a good session is in a motivated state — that's exactly when you want to give them an action.

**Implementation:** Add a two-button "What's next?" row at the bottom of the wrap-up screen.

```tsx
<div className="mt-6 border-t border-gray-100 pt-5">
  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">What's next?</p>
  <div className="grid grid-cols-2 gap-3">
    <button
      onClick={() => { setScreen('select'); setMessages([]); setWrapupSummary('') }}
      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:border-[#0033A0]/30 hover:text-[#0033A0] transition-colors"
    >
      New Session
    </button>
    {onDone ? (
      <button
        onClick={onDone}
        className="rounded-xl bg-[#0033A0] px-4 py-3 text-sm font-semibold text-white hover:bg-[#002580] transition-colors"
      >
        Back to Course
      </button>
    ) : (
      <Link
        href="/tools"
        className="rounded-xl bg-[#0033A0] px-4 py-3 text-sm font-semibold text-white text-center hover:bg-[#002580] transition-colors"
      >
        Browse More Tools
      </Link>
    )}
  </div>
  {/* Streak or score celebration — only show if session had meaningful engagement */}
  {messages.filter(m => m.role === 'user').length >= 3 && (
    <p className="mt-3 text-center text-xs text-gray-400">
      Session saved to your progress.
    </p>
  )}
</div>
```

The "Back to Course" branch uses the existing `onDone` prop — when the Study Buddy is embedded in `CourseStudyPanel`, this is already wired. When accessed directly from the marketplace, it falls back to "Browse More Tools."

---

### ✅ Rec 10 — Persistent "Open" CTA on tool cards at rest
**File:** `app/tools/page.tsx` — `SimpleToolCard` component (~line 162)

The current card shows "Open →" only on `group-hover`. This means the card looks like an information display, not an interactive element, at rest. On mobile (no hover), the affordance never appears.

**Implementation:** Show "Open →" at rest in a slightly muted style, brighten on hover. No layout change needed.

```tsx
// Replace the hover-only footer:
<div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
  <span className="text-[10px] font-semibold text-gray-300 group-hover:text-[#0033A0] transition-colors">
    Open →
  </span>
</div>
```

Showing it faint at rest communicates "this is clickable" without competing with the card content.

---

### ✅ Rec 11 — "Get" button tooltip in the Launch Modal
**File:** `app/components/ToolLaunchModal.tsx` lines ~187–207

A new student has no mental model for "Library" yet. "Get" is too terse. Adding a `title` attribute is zero-cost and solves 90% of the problem on desktop. For mobile, consider adding a parenthetical.

```tsx
<button
  title={inLibrary ? 'Remove from your Library' : 'Save to Library for quick access from your home screen'}
  onClick={() => onToggleLibrary(tool.id, !inLibrary)}
  ...
>
  {inLibrary ? (
    <><Check className="h-4 w-4" /> Saved</>
  ) : (
    <><Plus className="h-4 w-4" /> Save</>
  )}
</button>
```

**Also:** Rename "Get" → **"Save"** throughout. "Get" implies acquisition/cost (App Store connotation). "Save" correctly describes the action: saving the tool to your personal list.

---

### ✅ Rec 12 — Rename "Arts" category → "Arts & Humanities"
**File:** `app/tools/page.tsx` — `CATEGORIES` array (line 15), and wherever category values are seeded or stored.

"Arts" in a university context ambiguously covers visual arts, performing arts, and humanities (English, Philosophy, History-adjacent). An English student scanning category filters will not confidently click "Arts."

**Implementation:** String replacement.

```tsx
// tools/page.tsx
const CATEGORIES = ['All', 'Law', 'History', 'STEM', 'Medicine', 'Business', 'Arts & Humanities', 'University', 'Registrar Tools', 'General']
```

**Database check required:** If `category` is a free-text field in the DB (vs. an enum), existing tools seeded with `'Arts'` will fall out of the filter. You'd need a one-time migration: `UPDATE Tool SET category = 'Arts & Humanities' WHERE category = 'Arts'`. If it's a Prisma enum, add the new value and run `prisma migrate dev`. Check `prisma/schema.prisma` before committing.

---

### ❌ Rec 13 — Rename "Teach Back" → "Explain to Me"

**Disagree. Don't rename it.**

"Teach Back" is an established pedagogical technique with a specific meaning in educational psychology. It's used in medical schools, law schools, and university pedagogy literature. The target audience — university students — is exactly the audience for whom this term carries legitimate professional weight.

Renaming it "Explain to Me" makes it sound casual and loses the implicit contract: *you are the teacher now, I am the confused student, your job is to explain until I understand.* "Explain to Me" sounds like a request. "Teach Back" sounds like a method.

**The right fix:** Keep the name, add a one-line subtitle below the mode label, and surface `bestFor` permanently (Rec 5). That gives the user enough context without dumbing down the vocabulary.

```tsx
// In MODES config, the 'teach-back' entry already has:
description: "Explain a concept to me — I'll poke holes"
// That's correct and sufficient when it's visible.
```

---

### ⚠️ Rec 14 — Add Step 1→2→3 indicator to mode select screen

**Partially disagree. The problem is real; the solution is wrong.**

The audit is right that the relationship between "enter a topic" and "pick a mode" is ambiguous. But a step indicator ("Step 1 of 3") adds visual chrome and implies a wizard-style flow — which is too heavy for what is essentially a two-field form before a chat session.

**Better fix:** Use copy and layout to create the implied sequence, not numbered steps.

```tsx
// Reorder and relabel the two inputs:

// 1. Topic field label changes from whatever it is to:
<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
  What do you want to study?
</label>
<input placeholder="e.g. Romanticism, photosynthesis, FRE 804..." />

// 2. Mode grid label changes to:
<p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-5">
  Then choose how you want to work
</p>
// Mode grid below this
```

The words "Then choose" create a sequence without a numbered UI element. It's lighter and reads naturally. The topic field being above the mode grid already implies order — just reinforce it with the right copy.

---

### ⚠️ Rec 15 — Replace difficulty badge with plain-language context

**Partially agree. Reframe the fix.**

The audit's suggestion ("Good for undergrads") would work but is somewhat condescending and inconsistent with how the rest of the platform talks about difficulty. The real problem is that "Introductory / Intermediate / Advanced" has no anchor — intermediate compared to what baseline?

**Better fix:** Add a single contextual sentence to the Launch Modal below the description, derived from the existing difficulty field:

```tsx
const DIFFICULTY_CONTEXT: Record<string, string> = {
  Introductory: 'No prior knowledge needed.',
  Intermediate: 'Works best if you\'ve had at least one course in this area.',
  Advanced:     'Designed for upper-division or graduate-level students.',
}

// In ToolLaunchModal.tsx, below the short description:
{tool.difficultyLevel && DIFFICULTY_CONTEXT[tool.difficultyLevel] && (
  <p className="text-xs text-gray-400 -mt-3 mb-5 flex items-center gap-1">
    <GraduationCap className="w-3 h-3" />
    {DIFFICULTY_CONTEXT[tool.difficultyLevel]}
  </p>
)}
```

This keeps the badge (for quick scanning) and adds the sentence for context, without rewriting the data model.

---

## Beyond the Audit — What Wasn't Surfaced

These issues don't appear in the original UX audit but I'd prioritize them in the same sprint.

---

### B1 — The homepage knows about due dates but doesn't connect them to tools

The student's homepage shows: *"Romanticism Essay due Mar 21 — Essay."* The tools page has: *"Essay Coach."* These two data points are never connected. This is the single highest-leverage product moment on the platform and it's completely untapped.

**Implementation:** Add a "Recommended for you" widget on the homepage (student view), below the "Jump Back In" section, that cross-references `upcomingDue` items with tool categories.

```tsx
// Naive but effective version — no ML required:
const essayDueSoon = studentProfile.upcomingDue.some(d =>
  ['Essay', 'Paper', 'Brief', 'Memo'].includes(d.type) && differenceInDays(parseISO(d.date), TODAY) <= 5
)
const examDueSoon = studentProfile.upcomingDue.some(d =>
  d.type === 'Exam' && differenceInDays(parseISO(d.date), TODAY) <= 5
)

// Render a contextual suggestion:
{essayDueSoon && (
  <Link href="/tools?q=essay" className="...">
    Essay due soon? Try Essay Coach or the Assignment Stress Test →
  </Link>
)}
{examDueSoon && (
  <Link href="/tools?q=quiz" className="...">
    Exam coming up? Study with Quiz Me or Flashcards →
  </Link>
)}
```

This is 20 lines of code. For a student like Tiana, it would make the platform feel like it *knows her* on visit one.

---

### B2 — "Last used mode" is remembered but not surfaced

The code at line 267 in `StudyBuddyInterface.tsx` already restores the last-used mode from localStorage. But on the mode select screen, the student has no visual indication that a mode is pre-selected or "where they left off." They'll scan all 7 cards and make a fresh decision every time.

**Implementation:** Add a "Last time you used: [mode]" chip at the top of the mode grid, which pre-highlights that card.

```tsx
// Read last mode on component mount (already done in useEffect)
// Visually distinguish it:
{lastMode && (
  <p className="text-xs text-gray-400 mb-2">
    Last used: <span className="font-semibold text-gray-600">{MODES.find(m => m.id === lastMode)?.label}</span>
  </p>
)}
```

Returning students should never have to re-select their preferred mode from scratch.

---

### B3 — Hover-dependent UX is a mobile liability

The original audit correctly identifies several hover-dependent patterns. But it frames this as individual fixes. The real issue is systemic: **the interface was designed desktop-first with hover as a primary discovery mechanism.** This is a structural pattern to watch as the platform scales.

Current hover-only affordances:
- `bestFor` on mode cards (Rec 5 fixes this)
- "Open →" on tool cards (Rec 10 fixes this)
- Progress bar title tooltips on the course cards (Rec 3 partially fixes this)
- The `bestFor` title attribute on mode cards after Rec 5 is applied

**Recommendation:** After shipping the fixes above, do one mobile-QA pass on iPhone Safari (not just Chrome DevTools). Pay specific attention to: mode select screen, tool card grid, launch modal, and the wrap-up screen. These are the four screens where mobile friction will be highest.

---

### B4 — Wrap-up summary is not persisted server-side

The background summary is generated client-side (fired after the 5th user message) and stored in React state. When the student closes the tab or navigates away before hitting Wrap Up, the summary is lost. And even after Wrap Up, the summary is not written to the DB — it's stored only in `wrapupSummary` state.

**Implementation:** After a session ends, POST the summary to the session record.

Add a `summary` field to the `Session` model if it doesn't exist:

```prisma
// schema.prisma
model Session {
  // ... existing fields
  summary  String?  // AI-generated wrap-up summary
}
```

After the background summary is generated (currently a fire-and-forget in the `useEffect` at line 299), also PATCH the session record:

```tsx
// After setting setBackgroundSummary(text):
if (sessionIdRef.current) {
  fetch(`/api/sessions/${sessionIdRef.current}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
    body: JSON.stringify({ summary: text }),
  }).catch(() => {})
}
```

This unlocks the student analytics page showing session summaries, the PDF export feature (planned), and makes the Notes auto-save from Rec 8 more reliable.

---

### B5 — No confirmation that a session was recorded

After clicking Done on the wrap-up screen, the student has no signal that anything was saved. The analytics page at `/analytics/student` will show the session — but the student doesn't know to look there. This creates an anxiety gap: *"Did that count? Was my streak updated? Did my score get saved?"*

**Implementation:** One toast notification on Done click.

```tsx
// On clicking Done / onDone():
toast.success('Session saved to your progress.', { duration: 4000 })
```

If Sonner or a similar toast library is already in use (check `app/components/ClientProviders.tsx`), this is a single line. If not, a small custom toast component in the wrap-up footer div is enough — don't add a library just for this.

---

## Open Questions

Before implementing anything in Rec 2 (welcome modal), I need to understand:

**Q1: Is "Interactive Demo" intentional for production, or a scaffold for stakeholder demos?**

This changes everything. If The Sandbox is going live for real students at UK, the demo framing needs to go entirely — not just be hidden from students. The user-switching mechanism is a security fiction that wouldn't exist in a real auth system. If it's a permanent demo/prototype, the fix in Rec 2 is correct as written.

**Q2: What is the planned auth mechanism?**

Currently all auth is faked via `x-demo-user-email` header. The moment real SSO (Shibboleth/Azure AD) is wired in, the entire Header user-switcher, the welcome modal logic, and the `DEMO_USERS` array become irrelevant. I'd want to build the welcome modal fix in a way that degrades cleanly when real auth lands — meaning no tight coupling to the demo user list.

**Q3: What is the actual mobile traffic split?**

If more than 20% of student sessions are on mobile (which is likely for college students), Recs 5, 10, and B3 move to P0. If the platform is currently desktop-only for this MVP, they stay at P1.

**Q4: Is the `/api/notes` POST endpoint already implemented?**

Rec 8 (save summary to Notes) depends on this. If the notes API only supports GET and the Notes page is a read-only view, the auto-save implementation needs to be scoped to a separate story.

**Q5: What's the product definition of Wrap Up?**

Currently: student-initiated (they click Wrap Up when they feel done). Consider: should the AI proactively suggest wrap-up after N messages or after detecting session completion signals? This would change the UX architecture of the wrap-up screen significantly. Not blocking for this sprint, but worth aligning on before the next design pass.

---

## Recommended Sprint Order

If I were sequencing this as a single sprint:

**Phase 1 — Zero-risk, ship immediately (< 1 day)**
1. Rec 1: Rename "Hub" → "Tools" in nav
2. Rec 3: Progress bar legend
3. Rec 7: Remove wrap-up confirmation
4. Rec 10: Persistent "Open" CTA on cards
5. Rec 11: "Save" rename + tooltip on Launch Modal button
6. Rec 12: "Arts & Humanities" category

**Phase 2 — Light component work (1–2 days)**
7. Rec 2: Role-aware welcome modal copy
8. Rec 4: Quick Access descriptions
9. Rec 5: `bestFor` always visible on mode cards
10. Rec 14 (reframed): Copy-led sequence on mode select screen
11. Rec 15 (reframed): Difficulty context sentence in Launch Modal
12. B2: "Last used mode" chip on mode select screen

**Phase 3 — Feature work (2–3 days)**
13. Rec 6: Essay Coach auto-expand Docs + inline prompt
14. Rec 9: Post-session next-step CTA
15. Rec 8: Auto-save summary to Notes (pending Q4)
16. B1: Due-date-aware tool recommendations on homepage
17. B4: Server-side session summary persistence (pending schema migration)
18. B5: "Session saved" toast confirmation

**Phase 4 — QA**
19. B3: Mobile QA pass on the four key screens

---

*End of document. Last updated: 2026-03-18.*
