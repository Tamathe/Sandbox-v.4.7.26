# Study Buddy UX Overhaul — Architecture

> **Status:** COMPLETE (2026-03-25) — All 10 fixes shipped across 4 sprints, 0 TypeScript errors
> **Goal:** Make Study Buddy intuitive for first-time users while preserving depth for power users
> **Principle:** Progressive disclosure. Show less, reveal more. Single happy path first.
> **Files affected:** Primarily `StudyBuddyInterface.tsx` (~3200 lines) + 2 new sub-components

---

## Problem Statement

Study Buddy v2 is a world-class AI tutor with 12 phases of learning science baked in. The problem isn't capability — it's **surface area**. A first-time student opening Study Buddy encounters:

- 7 equally-weighted mode cards + up to 5 intelligence banners + past sessions + docs panel on the select screen
- 13+ interactive controls crammed into a single chat header bar
- Learning science jargon ("Bloom: 4/6", "cognitive load: med") visible during sessions
- A difficulty toggle always present even when auto-mode is the right default
- A confidence rating UI that interrupts every quiz question
- A wrap-up screen that treats 3 next-step buttons as equal when Sandy has strong opinions

The result: cognitive overload *about a tool designed to reduce cognitive overload*.

---

## Design Principles

1. **Show the student what matters now; hide what matters later.** A first-time user needs 3 mode cards. A returning user needs SR stats and Sandy's recommendation.
2. **One input area, one primary action.** Never two text inputs on screen. Never 3 equal-weight CTAs when one is clearly right.
3. **Translate learning science into human language.** Students don't need to know about Bloom's taxonomy to benefit from it.
4. **Reduce decisions per screen.** Every toggle, button, and banner is a micro-decision. Cut the ones that don't earn their keep.
5. **Smart defaults beat visible options.** Difficulty=Auto doesn't need a visible toggle. Confidence rating doesn't need to block input.

---

## Sprint Plan

### Sprint 1: Declutter the Chat Screen (Fixes #1, #2, #3)

**The chat header is doing too much.** 13 interactive elements in one bar. Fix by extracting secondary controls into a collapsible tray.

#### Fix 1 — Chat Header Overflow Menu

**Current state (line 2239–2385):** Sandy avatar + mode name + back button + 7 mode pills (scrollable) + Pomodoro + dyslexia toggle + voice toggle + speed control + Wrap Up — all in one horizontal bar.

**New layout:**

```
┌─────────────────────────────────────────────────────┐
│ [←] 🤖 Sandy · Quiz Master          [⚙] [Wrap Up] │
└─────────────────────────────────────────────────────┘
```

**Keep in header (always visible):**
- Back button (←)
- Sandy avatar + mode-specific subtitle
- Settings gear button (⚙) — opens tray
- Wrap Up button

**Move to settings tray (gear icon toggles):**
- 7 mode pills (horizontal scroll)
- Pomodoro timer
- Dyslexia mode toggle
- Voice mode toggle + speed control
- Difficulty bias (Easier / Auto / Harder)

**Implementation:**

```typescript
// New state
const [settingsTrayOpen, setSettingsTrayOpen] = useState(false)

// Header renders only:
// [←] [Sandy avatar + subtitle] ... [⚙ gear] [Wrap Up]

// Tray renders below header when open:
// ┌────────────────────────────────────────┐
// │ Mode:  [Explain] [Quiz*] [Flash] ...  │
// │ Timer: [🍅 Pomodoro]   Voice: [🔊 On] │
// │ Speed: [1×]  Dyslexia: [Aa]           │
// │ Difficulty: [↓ Easier] [Auto*] [↑]    │
// └────────────────────────────────────────┘
```

**Visual spec:**
- Gear icon: `Settings2` from lucide-react, `size-4`, same style as existing header buttons
- Tray: `bg-white border-b border-gray-200 px-4 py-3`, slides down with `transition-all duration-200`
- Mode pills stay horizontally scrollable inside tray
- Active mode shown as colored text in header subtitle (e.g., "Quiz Master" in violet)
- Tray auto-closes when user sends a message (don't leave it open during conversation)

**Behavior:**
- Tray remembers open/closed state for the session (not persisted)
- On mobile: tray takes full width, mode pills wrap to 2 rows instead of scroll
- Mode switch still shows the "Switching modes will clear this chat" guard (existing behavior preserved)

#### Fix 2 — Hide Difficulty Bias by Default

**Current state (line 2619–2654):** Always-visible bar between header and messages with Easier/Auto/Harder pills.

**New behavior:**
- Difficulty bar is part of the settings tray (Fix 1)
- Not visible by default — `difficultyBias` stays `null` (Auto) for most students
- When the adaptive observer detects sustained frustration (consecutive frustration ≥ 2), Sandy's hint banner includes a "Make it easier" button that sets `difficultyBias = 'easier'` inline — no need for a permanent control

**Migration:** Remove the standalone `<div className="border-b border-gray-100 px-3 py-1.5">` difficulty bar from the chat screen. Move the 3 toggle buttons into the settings tray grid.

#### Fix 3 — Remove Learning Science Jargon

**Current state (line 2456–2480):** Mini-indicator bar shows "Bloom: 4/6", "Load: med", "productive struggle", "needs support".

**New behavior:** Replace with student-friendly language or remove entirely.

| Current | New | When shown |
|---------|-----|-----------|
| `Bloom: 4/6` | Remove — no replacement | Never |
| `Load: high` | Remove — adaptive hints already cover this | Never |
| `Load: med` | Remove | Never |
| `Load: low` | Remove | Never |
| `productive struggle` | "You're working through it — keep going" | Keep as adaptive hint (already exists) |
| `needs support` | Remove — adaptive hint banner already shows | Never |

**Delete the entire learning state indicator bar.** The adaptive hint banners (lines 2482–2500) already communicate the same information in plain English. The Bloom/Load numbers serve the developer, not the student.

**The `learningState` state variable stays** — it's still needed to drive the adaptive hint logic. We just stop rendering it as a visible bar.

---

### Sprint 2: Simplify Mode Selection (Fixes #4, #8, #10)

**The select screen tries to show everything at once.** Fix by adding first-use state, creating visual hierarchy, and enriching session cards.

#### Fix 4 — First-Use Progressive Disclosure

**Detection:** Check `pastSessions.length === 0 && !flashcardStats?.totalCards` when the select screen loads. If true, this is a first-time user for this tool.

**New state:**
```typescript
const [showAllModes, setShowAllModes] = useState(false)
const isFirstTime = pastSessions.length === 0 && !flashcardStats?.totalCards && !studentContext?.recentToolSessions?.length
```

**First-time layout:**

```
┌──────────────────────────────────────────────┐
│  🤖 Sandy · Study Buddy                     │
│                                              │
│  "Pick how you want to study. I'll guide     │
│   you from there."                           │
│                                              │
│  ┌──────────────┐  ┌──────────────┐          │
│  │ 📖 Explain   │  │ 🧠 Quiz Me   │          │
│  │ Ask me       │  │ Test what    │          │
│  │ anything     │  │ you know     │          │
│  └──────────────┘  └──────────────┘          │
│  ┌──────────────────────────────────┐        │
│  │ 🃏 Flashcards                     │        │
│  │ Drill key terms and definitions  │        │
│  └──────────────────────────────────┘        │
│                                              │
│  ▸ More ways to study (4)                    │
│                                              │
│  📄 Study Materials (0 docs)                 │
└──────────────────────────────────────────────┘
```

**Rules:**
- First-time: Show only Explain It, Quiz Me, Flashcards (the 3 safest, most intuitive modes)
- "More ways to study (4)" expander reveals Socratic, Teach Back, Debate, Essay Coach
- All intelligence banners (Sandy suggestion, SR widget, due concepts, weak concepts, performance summary) are **hidden** for first-time users — there's no data to show anyway
- Exam Prep button hidden for first-time (they need at least one session's context first)
- After first session completes, all subsequent visits show the full grid + intelligence

**Returning user layout stays the same** — full 7-card grid with all intelligence banners.

#### Fix 8 — Visual Hierarchy on Mode Cards

**Current state (line 1370–1404):** All 7 modes in a flat `grid-cols-2` with identical card size.

**New layout (returning users):**

```
┌─────────────────────────────────────────────────┐
│ ── CORE ────────────────────────────────────── │
│ ┌─────────────┐ ┌──────────────┐ ┌───────────┐ │
│ │ 📖 Explain  │ │ 🧠 Quiz Me   │ │ 🃏 Flash  │ │
│ │ (larger)    │ │ (larger)     │ │ (larger)  │ │
│ └─────────────┘ └──────────────┘ └───────────┘ │
│                                                 │
│ ── CHALLENGE YOURSELF ─────────────────────── │
│ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────┐ │
│ │ Socratic │ │ Teach    │ │ Debate │ │Essay │ │
│ │ (compact) │ │ Back     │ │        │ │Coach │ │
│ └──────────┘ └──────────┘ └────────┘ └──────┘ │
└─────────────────────────────────────────────────┘
```

**Implementation:**
- Split MODES into two groups:
  ```typescript
  const CORE_MODES: Mode[] = ['tutor', 'quiz', 'flashcards']
  const CHALLENGE_MODES: Mode[] = ['socratic', 'teach-back', 'debate', 'essay']
  ```
- Core modes: `grid-cols-3` on desktop / `grid-cols-1` on mobile, taller cards (`p-5` instead of `p-4`), icon is `size-10` instead of `size-9`
- Challenge modes: `grid-cols-4` on desktop / `grid-cols-2` on mobile, compact cards (`p-3`), icon is `size-7`, no `bestFor` text shown inline (keep as tooltip only)
- Section labels: "Start here" above core, "Challenge yourself" above challenge modes
- SR due badge: If `flashcardStats.dueNow > 0`, show a red badge on the Flashcards core card: `"5 due"` — eliminates the need for the separate SR dashboard widget taking up banner space

#### Fix 10 — Richer Past Session Cards

**Current state (line 1440–1453):** Each session shows date + time + message count + "Resume" button.

**New card layout:**

```
┌──────────────────────────────────────────────┐
│ 🧠 Quiz Me · Mar 24 at 2:15 PM              │
│ 7/10 on Cell Biology · 12 messages · 18min   │
│                                     [Resume] │
└──────────────────────────────────────────────┘
```

**Data needed:** The `PastSession` interface needs to expand. The `/api/study/[toolId]/sessions` route already returns session data — we need to include more fields.

```typescript
interface PastSession {
  id: string
  startedAt: string
  messageCount: number
  courseId: string | null
  // NEW fields:
  mode: Mode | null          // From session metadata (store on session creation)
  score: number | null        // From ToolSession.score
  topicSummary: string | null // First 50 chars of first user message, or from session summary
  durationMin: number | null  // From session endedAt - startedAt
}
```

**API change:** `GET /api/study/[toolId]/sessions` response adds `mode`, `score`, `topicSummary`, `durationMin` from existing `ToolSession` fields. No schema changes needed — `ToolSession` already has `score` and `summary`.

**Frontend:** Show the mode icon + mode label, score (if quiz), topic snippet, duration. Remove bare "12 messages" — replace with richer context.

**Session creation:** When `enterMode` creates a session, pass `mode` as metadata. Currently `ensureSession` only sends `{ toolId, courseId }` — add `mode` to the body:
```typescript
body: JSON.stringify({ toolId, courseId, mode })
```

The sessions API route stores this in `ToolSession.qualitySignal` or a new lightweight metadata field (TBD — check if `ToolSession` has a suitable nullable string field to repurpose, or use the existing `summary` to encode mode).

---

### Sprint 3: Fix Interaction Friction (Fixes #5, #9)

#### Fix 5 — Inline Optional Confidence Rating

**Current state (line 3167–3195):** A violet box appears above the input asking "How confident are you in your answer?" with 4 buttons. This blocks the visual flow and creates a mandatory-feeling interaction before every answer.

**New behavior:** Confidence rating becomes optional inline pills next to the send button.

**Layout:**

```
┌──────────────────────────────────────────────────┐
│ [Your answer text here...                       ]│
│                                                  │
│ 😟 🤔 😊 💪              [🎤]  [Send →]          │
│ (tap one before sending, or just send)           │
└──────────────────────────────────────────────────┘
```

**Implementation:**
- Remove the `showConfidencePrompt` state and the violet prompt box
- In quiz mode only, render 4 small circular buttons (emoji only, no labels) in a row to the left of the send button, inside the input bar
- Each button sets `pendingConfidence` when tapped (highlighted state)
- If the student sends without tapping any, `pendingConfidence` stays `null` — that's fine, the `[CONFIDENCE:N]` prefix is simply omitted
- A subtle one-line tooltip appears on first quiz question only: "Tap how confident you feel before answering" — then never again (use localStorage flag: `study-buddy-confidence-hint-shown`)

**State changes:**
- Remove: `showConfidencePrompt` state variable
- Keep: `pendingConfidence` state variable
- Remove: the conditional violet box rendering at line 3167
- Add: confidence pills inside the input bar footer (only when `mode === 'quiz'`)

**Behavior preserved:**
- If student taps a confidence pill, the `[CONFIDENCE:N]` prefix is still prepended to the message
- Calibration tracking in wrap-up still works (just with fewer rated questions if students skip)
- Sandy's system prompt still receives confidence data when available

#### Fix 9 — Essay Coach Auto-Detect Paste

**Current state (line 2670–2693):** A dashed textarea zone appears as the welcome state in essay mode, separate from the main chat input. Two text input areas on one screen.

**New behavior:** Remove the standalone paste zone. Use the main chat input with intelligent paste detection.

**Implementation:**
1. Remove the `mode === 'essay'` welcome block that renders the dashed `<textarea>`
2. In the main input `<textarea>`, add an `onPaste` handler:
   ```typescript
   const handlePaste = (e: React.ClipboardEvent) => {
     const text = e.clipboardData.getData('text')
     if (mode === 'essay' && text.length > 200 && messages.length === 0) {
       setEssayPasteDetected(true)
     }
   }
   ```
3. When `essayPasteDetected` is true, show a chip above the input:
   ```
   ┌──────────────────────────────────────────┐
   │ 📝 Looks like an essay — [Get feedback →]│
   └──────────────────────────────────────────┘
   ```
4. Clicking "Get feedback" calls `sendMessage(input)` with the pasted text
5. The chip disappears after the first message is sent or if the input is cleared below 200 chars

**New state:**
```typescript
const [essayPasteDetected, setEssayPasteDetected] = useState(false)
```

**Essay welcome message updated:**
```
"Paste your draft below, or describe your essay challenge. I'll give structured feedback on thesis, argument, evidence, and prose."
```

One input area. Zero confusion.

---

### Sprint 4: Smart Wrap-Up & Intelligence Consolidation (Fixes #6, #7)

#### Fix 6 — Smart Wrap-Up Recommendation

**Current state (line 1909–1957):** "What's next?" section shows 3 equal-weight buttons: Study Again, Switch Mode, Back to Course.

**New behavior:** Sandy recommends the best next action based on session data.

**Recommendation logic:**
```typescript
function getWrapupRecommendation(params: {
  mode: Mode
  quizScore: { correct: number; total: number }
  quizLog: typeof quizLog
  flashcardStats: typeof flashcardStats
  studentContext: StudyBuddyContextData | null
  examPrep: ExamPrepState
}): { label: string; description: string; action: () => void; variant: 'primary' } {
  const { mode, quizScore, quizLog, flashcardStats, studentContext } = params

  // 1. Quiz with missed questions → re-quiz
  const missed = quizLog.filter(q => !q.correct)
  if (mode === 'quiz' && missed.length >= 2 && quizScore.total >= 5) {
    return {
      label: `Re-quiz on ${missed.length} missed`,
      description: `You got ${quizScore.correct}/${quizScore.total}. Let's nail the ones you missed.`,
      action: () => { /* launch re-quiz with missed topics */ },
      variant: 'primary',
    }
  }

  // 2. Flashcards due → review
  if (flashcardStats && flashcardStats.dueNow >= 3) {
    return {
      label: `Review ${flashcardStats.dueNow} due flashcards`,
      description: 'Keep your streak — these cards are ready for review.',
      action: () => enterMode('flashcards'),
      variant: 'primary',
    }
  }

  // 3. Strong quiz performance → challenge mode
  if (mode === 'quiz' && quizScore.total >= 5 && quizScore.correct / quizScore.total >= 0.8) {
    return {
      label: 'Try Teach Back',
      description: 'Great score! The best test of mastery is explaining it to someone else.',
      action: () => enterMode('teach-back'),
      variant: 'primary',
    }
  }

  // 4. Weak concepts detected → tutor
  if (studentContext && studentContext.weakConcepts.filter(c => c.isStale).length >= 2) {
    return {
      label: 'Review fading concepts',
      description: `${studentContext.weakConcepts.filter(c => c.isStale).length} concepts are fading — a quick review will lock them in.`,
      action: () => enterMode('tutor'),
      variant: 'primary',
    }
  }

  // 5. Default: study again
  return {
    label: 'Study Again',
    description: 'Start a fresh session in the same mode.',
    action: () => { /* existing study again logic */ },
    variant: 'primary',
  }
}
```

**New wrap-up layout:**

```
┌──────────────────────────────────────────────┐
│         ✅ Session Complete                   │
│         7/10 · Quiz Me · 18min               │
│                                              │
│  [summary card]                              │
│  [rubric / calibration / error cards]        │
│  [learner insights]                          │
│                                              │
│  ── Sandy recommends ─────────────────────── │
│  ┌──────────────────────────────────────────┐│
│  │ 🎯 Re-quiz on 3 missed                  ││
│  │ You got 7/10. Let's nail the ones you    ││
│  │ missed.                       [Start →]  ││
│  └──────────────────────────────────────────┘│
│                                              │
│  [Switch Mode]     [Back to Course]          │
└──────────────────────────────────────────────┘
```

**Visual spec:**
- Recommendation card: `border-2 border-[#0033A0] bg-[#0033A0]/5 rounded-xl p-4` with a prominent CTA button
- Sandy's recommendation is always the first/largest button
- "Switch Mode" and "Back to Course" demoted to secondary text buttons below

#### Fix 7 — Consolidate Select-Screen Intelligence Banners

**Current state:** Up to 5 separate banners stacked vertically before the mode grid:
1. Exam Prep button (orange)
2. SR dashboard widget (emerald)
3. Sandy suggestion card (blue)
4. Due concepts banner (emerald)
5. Weak concepts alert (amber)
6. Performance summary strip (gray)

**New behavior:** Consolidate into a single "Sandy says" card that summarizes the most important insight.

**Priority logic (show only the highest-priority item):**
```typescript
function getSandyInsight(params: {
  studentContext: StudyBuddyContextData | null
  flashcardStats: typeof flashcardStats
}): { icon: LucideIcon; title: string; description: string; action?: () => void; actionLabel?: string } | null {
  const { studentContext, flashcardStats } = params

  // Priority 1: SR cards due (urgent action)
  if (flashcardStats && flashcardStats.dueNow >= 3) {
    return {
      icon: Layers,
      title: `${flashcardStats.dueNow} flashcards due now`,
      description: `Plus ${flashcardStats.dueTomorrow} tomorrow. Quick review keeps your memory sharp.`,
      action: () => enterMode('flashcards'),
      actionLabel: 'Start review',
    }
  }

  // Priority 2: Sandy's mode recommendation (personalized)
  if (studentContext?.suggestedMode && studentContext.suggestedReason) {
    const modeConfig = MODES.find(m => m.id === studentContext.suggestedMode)
    return {
      icon: Sparkles,
      title: `Try ${modeConfig?.label} today`,
      description: studentContext.suggestedReason,
      action: () => enterMode(studentContext.suggestedMode!),
      actionLabel: `Start ${modeConfig?.label}`,
    }
  }

  // Priority 3: Weak/stale concepts (knowledge fading)
  if (studentContext && studentContext.weakConcepts.some(c => c.isStale)) {
    const stale = studentContext.weakConcepts.filter(c => c.isStale)
    return {
      icon: AlertTriangle,
      title: `${stale.length} concept${stale.length !== 1 ? 's' : ''} fading`,
      description: `${stale.slice(0, 2).map(c => `"${c.concept}"`).join(' and ')} need a refresher.`,
      action: () => enterMode('tutor'),
      actionLabel: 'Review now',
    }
  }

  // Priority 4: Due concepts from SR scheduler
  if (studentContext && studentContext.dueConcepts.length > 0) {
    return {
      icon: Clock,
      title: `${studentContext.dueConcepts.length} concepts due for review`,
      description: studentContext.dueConcepts.slice(0, 3).map(d => d.conceptSlug.replace(/-/g, ' ')).join(', '),
    }
  }

  return null
}
```

**New layout:**

```
┌──────────────────────────────────────────────────┐
│ ✨ Sandy says                                     │
│ "5 flashcards due now. Plus 3 tomorrow.           │
│  Quick review keeps your memory sharp."           │
│                                    [Start review] │
└──────────────────────────────────────────────────┘
```

**Single card replaces 5 banners.** The Exam Prep button stays separate (it's a distinct entry point, not an insight).

**Performance summary strip:** Move into the settings tray or Insights screen. A returning student doesn't need "Last score: 70%, Bloom: 4/6" on the mode select — it's noise at the decision point.

---

## Implementation Sequence

| Sprint | Fixes | Effort | Description |
|--------|-------|--------|-------------|
| **1** | #1, #2, #3 | Medium | Declutter chat: overflow menu, hide difficulty, kill jargon bar |
| **2** | #4, #8, #10 | Medium | Simplify select: first-use state, visual hierarchy, rich sessions |
| **3** | #5, #9 | Low | Fix friction: inline confidence, essay auto-detect |
| **4** | #6, #7 | Medium | Smart wrapup + consolidate banners |

Each sprint is independently shippable. No sprint depends on a previous one.

---

## File Changes Summary

### `StudyBuddyInterface.tsx` (all sprints)

| Section | Lines | Change |
|---------|-------|--------|
| Chat header | 2239–2385 | Replace with minimal header + gear-toggled settings tray |
| Difficulty bar | 2619–2654 | Delete standalone bar; move into settings tray |
| Learning state bar | 2456–2480 | Delete entirely |
| Mode grid | 1370–1404 | Split into CORE (3) + CHALLENGE (4) sections |
| Select-screen banners | 1216–1364 | Replace 5 banners with single `getSandyInsight()` card |
| Confidence prompt | 3167–3195 | Replace with inline pills in input bar |
| Essay paste zone | 2670–2693 | Delete; add `onPaste` handler to main input |
| Wrap-up buttons | 1909–1957 | Replace with `getWrapupRecommendation()` + secondary buttons |
| Past sessions | 1435–1456 | Add mode icon, score, topic, duration to each row |
| First-use state | new | Conditional rendering when `isFirstTime` is true |

### `GET /api/study/[toolId]/sessions` (Sprint 2)

Add `mode`, `score`, `topicSummary`, `durationMin` to response. Data already exists in `ToolSession` — just needs to be selected and returned.

### No schema changes. No new API routes. No new dependencies.

---

## State Changes

### New state variables
```typescript
const [settingsTrayOpen, setSettingsTrayOpen] = useState(false)    // Sprint 1
const [showAllModes, setShowAllModes] = useState(false)            // Sprint 2
const [essayPasteDetected, setEssayPasteDetected] = useState(false) // Sprint 3
```

### Removed state variables
```typescript
// showConfidencePrompt — replaced by always-available inline pills
// (pendingConfidence stays — still used for the [CONFIDENCE:N] prefix)
```

### Computed values (no state needed)
```typescript
const isFirstTime = pastSessions.length === 0 && !flashcardStats?.totalCards && !studentContext?.recentToolSessions?.length
const sandyInsight = getSandyInsight({ studentContext, flashcardStats })
const wrapupRecommendation = getWrapupRecommendation({ mode, quizScore, quizLog, flashcardStats, studentContext, examPrep })
```

---

## Accessibility Preserved

All existing a11y features are maintained:
- `role="radiogroup"` on mode cards — now split across two groups but each keeps its own `role="radiogroup"`
- `role="log"` + `aria-live="polite"` on messages — unchanged
- `role="alert"` on rate limit — unchanged
- Dyslexia mode — moved to settings tray but still functional, still persisted to localStorage
- Focus rings on all interactive elements — settings tray buttons get the same `focus:ring-2 focus:ring-[#0033A0]` treatment
- Keyboard navigation: gear button is Tab-focusable; tray items are Tab-navigable; Escape closes tray

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Returning users can't find mode pills | Active mode shown in header subtitle; gear icon has tooltip "Study settings & mode" |
| Power users miss the difficulty control | Difficulty still accessible in tray; adaptive system handles it automatically anyway |
| Confidence data drops if students skip rating | Calibration tracking already handles `null` confidence — just fewer data points |
| Essay users don't know to paste | Updated welcome message explicitly says "Paste your draft below" |
| First-time users never discover advanced modes | "More ways to study (4)" expander + after first session all modes visible |

---

## Success Metrics

| Metric | Current (estimated) | Target |
|--------|-------------------|--------|
| Time from page load to first message | ~15s (mode selection friction) | <8s |
| Mode selection confidence (fewer mode switches mid-session) | ~20% switch mid-session | <10% |
| Confidence rating participation (quiz) | ~30% (feels mandatory, many skip) | ~50% (optional feels better) |
| First-session completion rate | Unknown | Measure post-launch |
| Settings tray open rate | N/A | <20% (means defaults are good) |

---

## What This Does NOT Change

- All 12 learning science phases remain fully functional
- Sandy's system prompts, AI signals, and adaptive behaviors are untouched
- Spaced repetition (SM-2), error taxonomy, teach-back/debate rubrics — all preserved
- Exam prep 6-phase flow — unchanged (just the entry button stays separate)
- Concept map, insights dashboard — unchanged
- Voice mode, Pomodoro — work the same, just accessed from settings tray
- All API routes — unchanged (one response shape enhancement for sessions)
- Schema — zero changes
