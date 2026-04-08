# Study Buddy — Improvements Roadmap

> Last updated: 2026-03-18
> Priority: **P0** = do now · **P1** = this sprint · **P2** = next sprint · **P3** = backlog

---

## P0 — Critical Fixes

### FIX-1: Raise the 2048 token cap
**File:** `app/api/chat/route.ts`
**Problem:** Study Buddy responses are capped at 2048 tokens. A 10-card flashcard set or a detailed essay critique can exceed this, causing truncated mid-sentence or mid-card responses.
**Fix:** Increase `max_tokens` for `STUDY_BUDDY` tool type to at least 4096. Consider 8192 for Flashcard and Essay Coach modes.

- [ ] Find the `max_tokens` assignment in `route.ts`
- [ ] Set mode-aware token limits: `flashcards` → 8192, `essay` → 6144, all others → 4096

---

### FIX-2: Replace regex quiz scoring with structured AI signals
**File:** `app/components/StudyBuddyInterface.tsx` (lines ~317–329), `app/api/chat/route.ts`
**Problem:** Quiz score detection uses fragile regex (`/correct/i`, `/incorrect/i`) on prose AI responses and guesses whether the user's last message "looks like an answer." Produces false positives and missed counts.
**Fix:** Mirror the existing `<!--OBJECTIVES:[...]-->` pattern. Have the AI emit `<!--QUIZ:correct-->` or `<!--QUIZ:incorrect-->` in quiz mode. Strip tag before display, parse server- or client-side.

- [ ] Add quiz signal instructions to quiz mode system prompt in `route.ts`
- [ ] Update client-side score parser in `StudyBuddyInterface.tsx` to detect `<!--QUIZ:correct|incorrect-->` instead of regex
- [ ] Strip the tag from rendered message content before display

---

### FIX-3: Create session on first message, not on mount
**File:** `app/components/StudyBuddyInterface.tsx`, `app/api/sessions/route.ts`
**Problem:** `POST /api/sessions` fires when the component mounts — before a student sends a single message. Students who browse to the course tab and leave create orphan sessions with `messageCount: 0`, polluting analytics and quest awards.
**Fix:** Move session creation to the `sendMessage` function, gating on `sessionId === null`.

- [ ] Remove session creation from `useEffect` on mount in `StudyBuddyInterface.tsx`
- [ ] In `sendMessage`, if `sessionId` is null: create session first, then send message
- [ ] Ensure `sessionIdRef` stays in sync with the new flow

---

## P1 — High Impact

### FIX-4: Session history + resume
**Problem:** Students start fresh every visit. There's no way to resume a conversation, review past exchanges, or see what they've covered over time. The `ToolSession` table exists but is never surfaced.
**New UI:** Add a "Past Sessions" drawer or tab on the mode-select screen showing recent sessions with date, mode, and message count. Allow resuming any session.

- [ ] Add `GET /api/study/[toolId]/sessions` route — returns recent sessions for the current user + tool (last 10, ordered by date)
- [ ] Add session list UI to mode-select screen (collapsible "Recent Sessions" section below mode grid)
- [ ] On resume: fetch messages for that session via a new `GET /api/study/[toolId]/sessions/[sessionId]/messages` route
- [ ] Restore `messages`, `mode`, `screen='chat'`, and `sessionId` state from resumed session
- [ ] Add "New Session" button when resuming to make the distinction clear

---

### FIX-5: Surface learning objective mastery to students
**File:** `app/api/chat/route.ts` (already parses `<!--OBJECTIVES:[...]-->` tags), `app/components/StudyBuddyInterface.tsx`
**Problem:** The API already extracts per-objective mastery signals (green = confident, yellow = uncertain) from each AI response. This data is parsed and discarded. It's the most pedagogically valuable signal in the system and students never see it.

- [ ] In `StudyBuddyInterface.tsx`, parse `<!--OBJECTIVES:...-->` from streamed assistant messages (strip before display)
- [ ] Maintain a `masteryMap: Record<objectiveId, 'green'|'yellow'>` in component state, updating after each message
- [ ] Add a small "Learning Objectives" status panel — visible in the chat sidebar or accessible via a button — showing each objective with a green/yellow/grey status dot
- [ ] Include mastery status in the wrap-up summary display

---

### FIX-6: Wrap-up improvements
**File:** `app/components/StudyBuddyInterface.tsx` (lines ~403–441, ~554–654)

#### 6a: Add "Return to course" button on wrap-up screen
- [ ] Accept an `onDone?: () => void` prop in `StudyBuddyInterface`
- [ ] Show a "Return to Course" button on wrap-up screen that calls `onDone`
- [ ] Wire `onDone` in `CourseStudyPanel.tsx` to navigate back to the course overview

#### 6b: Pre-generate summary instead of post-session spinner
- [ ] After every 5th assistant message in chat, silently call the summary endpoint in the background and cache the result in state (`backgroundSummary`)
- [ ] When "Wrap Up" is clicked, display `backgroundSummary` immediately if available, else fall back to on-demand generation
- [ ] This eliminates the "blank screen with spinner" on wrap-up

#### 6c: Wrap-up confirmation guard
- [ ] The "Wrap Up" button already exists — add a simple `window.confirm` or modal: "End this session? You can resume it later." before triggering wrap-up

---

### FIX-7: Rate limit — graceful handling
**File:** `app/api/chat/route.ts`, `app/components/StudyBuddyInterface.tsx`
**Problem:** The 20 msg/60s rate limit can fire mid-quiz or mid-flashcard drill with a generic error message.

- [ ] In `route.ts`, return a specific status `429` with `{ error: 'rate_limit', retryAfter: N }`
- [ ] In `StudyBuddyInterface.tsx`, detect 429 responses and show a friendly inline banner: "You're going fast! Wait a few seconds and try again." with a countdown
- [ ] Do not add the failed message to the message list — let the user retry

---

## P2 — Quality of Life

### FIX-8: Document panel UX overhaul
**File:** `app/components/StudyBuddyInterface.tsx`, `app/api/study/[toolId]/upload/route.ts`

#### 8a: Communicate student-upload ephemerality
- [ ] Add a tooltip or inline note next to student-uploaded docs: "Available this session only"

#### 8b: Show which documents are active
- [ ] When the AI responds, have it emit `<!--DOCS_USED:[id1,id2]-->` (similar to objectives tag)
- [ ] In the doc panel, highlight recently-used docs with a subtle pulse or "used" indicator

#### 8c: Drag-and-drop upload
- [ ] Add `onDragOver` / `onDrop` handlers to the documents panel area
- [ ] Show a drop zone overlay when dragging a file over the panel

#### 8d: PDF extraction quality warning
- [ ] In the upload API response, if `wordCount < 50` for a file > 100KB, return a `warning: 'low_extraction'` flag
- [ ] Display a warning badge on the doc in the panel: "Low text content — may be a scanned PDF"

---

### FIX-9: Mode card UX — guidance before committing
**File:** `app/components/StudyBuddyInterface.tsx` (mode select grid)
**Problem:** 7 modes with no preview. "Socratic" and "Teach Back" are confusing to students who've never encountered them.

- [ ] Add a `description` and `bestFor` string to each mode config object
- [ ] Show a tooltip or expandable description on hover/focus for each mode card
- [ ] Example: Socratic → "Best for: testing if you *really* understand. The AI only asks questions — never gives answers."
- [ ] Change "Challenge" badge label to something warmer, e.g., "Deep Dive" or "Push Yourself"

---

### FIX-10: Flashcard improvements
**File:** `app/components/StudyBuddyInterface.tsx`, `app/api/chat/route.ts`

#### 10a: Structured flashcard format (more robust parsing)
- [ ] Update flashcard system prompt to emit cards wrapped in `<card>` tags: `<card><term>...</term><def>...</def></card>`
- [ ] Update client-side parser to use tag-based extraction instead of regex on `**Term:**`
- [ ] Fall back gracefully if no tags found (show as plain text)

#### 10b: Mark cards known / needs review
- [ ] Add "Got it ✓" and "Review again ↺" buttons under each flipped flashcard
- [ ] Track per-card state: `known: Set<string>`, `review: Set<string>`
- [ ] At wrap-up, include card mastery breakdown in the summary

#### 10c: Repeat review cards
- [ ] After going through a set, offer "Review marked cards again" button
- [ ] Send AI a follow-up prompt: "Re-test me on just the cards I marked for review"

---

### FIX-11: Voice input UX
**File:** `app/components/StudyBuddyInterface.tsx`, `app/hooks/useSpeechRecognition.ts`

#### 11a: Browser detection before click
- [ ] Check `isSupported` on render and show a tooltip on the mic button if unsupported: "Voice input requires Chrome or Edge"
- [ ] Optionally grey out the button entirely on unsupported browsers (with tooltip explaining why)

#### 11b: Recording visual feedback
- [ ] Show a live waveform or pulsing animation while recording
- [ ] Add a visible countdown for the 3.5s silence auto-stop: "Listening... (stops after silence)"

---

### FIX-12: Teach Back mode — clearer phase transition
**File:** `app/components/StudyBuddyInterface.tsx`

- [ ] Show explicit phase labels: "Phase 1: Explain it to me" and "Phase 2: Feedback" above the progress bar
- [ ] When the 5-exchange threshold is crossed, show a brief transition banner: "Great job explaining! Now I'll give you honest feedback."
- [ ] In the system prompt, make the phase shift more explicit so the AI announces it naturally

---

### FIX-13: Socratic mode — escape hatch
**File:** `app/components/StudyBuddyInterface.tsx`, `app/api/chat/route.ts`

- [ ] Make the "Socratic Nudge" button more prominent — move it above the input, not buried
- [ ] Add a "I'm truly stuck — give me a hint" button that temporarily suspends Socratic mode for one response
- [ ] Implement this by injecting a user-triggered prefix into the message: `[HINT REQUESTED] ...`
- [ ] In system prompt: "If the user message begins with [HINT REQUESTED], give one small concrete hint only, then return to Socratic mode"

---

### FIX-14: Stream failure — retry logic
**File:** `app/components/StudyBuddyInterface.tsx`

- [ ] Wrap the streaming fetch in a try/catch that detects mid-stream failures
- [ ] On failure: show an inline "Something went wrong. [Retry]" button on the last message
- [ ] Retry should re-send the last user message with the same session context
- [ ] Do not duplicate the user message in the message list on retry

---

## P3 — Backlog / Future

### FIX-15: Adaptive difficulty across sessions
**Problem:** Every session uses the same depth regardless of student history. A student who consistently struggles gets no scaffolding; one who excels gets no challenge.

- [ ] Store aggregate mastery data per student per tool (using existing objectives tracking)
- [ ] Pass a `studentProfile: { masteredObjectives, reviewObjectives }` context block into the system prompt
- [ ] AI uses this to calibrate depth: "This student has already demonstrated understanding of X — build on that"
- [ ] Expose a "Make it harder / easier" quick action in the chat header

---

### FIX-16: Export & share wrap-up summary
**File:** `app/components/StudyBuddyInterface.tsx`

- [ ] Add a "Download as PDF" button on the wrap-up screen
- [ ] Add an "Email to me" option using the Resend integration (already in stack)
- [ ] Include: mode used, date, duration, objectives mastered, quiz score (if applicable), full summary text

---

### FIX-17: Quiz — end-of-session review
**File:** `app/components/StudyBuddyInterface.tsx`, wrap-up screen

- [ ] Track which questions were answered correctly vs. incorrectly (using FIX-2 signals)
- [ ] At wrap-up: show a "Questions to Review" list — the incorrectly answered ones, with the correct answer
- [ ] Offer a "Re-quiz on missed questions" button

---

### FIX-18: Mobile layout
**File:** `app/components/courses/CourseStudyPanel.tsx`

- [ ] The two-column layout (Study Buddy left, tool launcher right) breaks on small screens
- [ ] On `md` breakpoint and below: stack vertically with tool launcher below Study Buddy
- [ ] Move documents panel to a bottom sheet on mobile instead of a sidebar

---

## Implementation Notes

- The **objectives tagging system** (`<!--OBJECTIVES:[...]-->`) is the right pattern for FIX-2 and FIX-5. Extend it rather than invent new patterns.
- **FIX-3** (session on first send) is a prerequisite before FIX-4 (session history) to avoid polluting the session list with zero-message stubs.
- **FIX-2** (structured quiz signals) should be done before FIX-17 (quiz review) — the review feature depends on reliable signal data.
- All new API routes should follow the existing auth pattern: `x-demo-user-email` header, validated against the DB.
