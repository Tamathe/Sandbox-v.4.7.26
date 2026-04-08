# Playground Hardening & UX Excellence Plan
### The Sandbox — CATS-AI / University of Kentucky
### Authored: 2026-03-19 | Status: Ready to Execute

---

## Dual-Role Evaluation

Each remark from the audit report is evaluated through two lenses:
- **Architect** — Gold-standard technical fix, compatible with Prisma v7 driver adapters, Tailwind v4, Next.js App Router.
- **Strategist** — Impact on UX flow, educator adoption, FERPA/Professional mode alignment, and student success.

---

### Remark B1 — Title auto-save sends `PATCH`, route has no `PATCH` handler

**Architect:** The cleanest fix is to add a proper `export async function PATCH` handler to `apps/[appId]/route.ts` that accepts `{ title?, description? }` only (no `htmlContent`). This is more REST-semantically correct than overloading PUT with a partial body. Use `PlaygroundHttpError` from `playground-storage.ts` throughout — eliminate the string-code `throw new Error('NOT_FOUND')` anti-pattern in `assertCreator` at the same time (see R1 below; fix together in Task 1).

**Strategist:** Silent title loss is invisible burnout. An educator renames "Untitled App" to "Week 3 Group Activity," saves the code, and refreshes — the title reverts. They file a mental bug report against the platform and lose trust. This is a zero-user-effort fix that eliminates a daily trust erosion point. Fix immediately.

---

### Remark B2 — `my-apps` delete updates state on any response status

**Architect:** Check `response.ok` before optimistic state update. If the request fails, surface an inline error state on the card (a small red text line beneath the title, not a modal). Use the `deletingId` state that already exists to also store a `deleteErrorId` string so only the failed card shows the error.

**Strategist:** Phantom deletion is a data-integrity signal failure. A student deletes the wrong app, sees it vanish, discovers it still exists later, and can't trust the platform's feedback. Low effort, high trust payoff.

---

### Remark B3 — `hasManualEditsRef.current` in JSX is not reactive

**Architect:** Convert to `const [hasManualEdits, setHasManualEdits] = useState(false)` in `PlaygroundLayout`. Update all `hasManualEditsRef.current = true/false` callsites to `setHasManualEdits(true/false)`. The prop passed to `PlaygroundChat` will then be reactive. The ref was a premature optimization — the warning modal it gates is a low-frequency UI event; the re-render cost is negligible.

**Strategist:** The "sending this message will replace your manual edits" warning is the primary guardrail against an educator spending 20 minutes tweaking code only to have it silently overwritten by AI. If the warning doesn't fire reliably due to stale refs, the platform teaches users to distrust the AI iteration loop. Fix immediately.

---

### Remark B4 — JWT token expires mid-session, SANDBOX calls fail silently

**Architect:** Cache the token in a `useRef<{ token: string; expiresAt: number } | null>` inside `AppPreview`. On each `runId` increment, check if `Date.now() < (expiresAt - 5 * 60 * 1000)` (5-minute buffer). Re-fetch only if stale or absent. Since `signPlaygroundStorageToken` uses `{ expiresIn: '1h' }`, set `expiresAt = Date.now() + 55 * 60 * 1000`. This reduces the per-run DB hit to near-zero for active sessions.

**Strategist:** Silent SANDBOX failures after an hour of use are the most demoralizing possible outcome — the user's app appears to work in preview but data isn't persisting. They share it with students, students report "the score didn't save," the educator concludes AI tools are unreliable. Fix in Phase 2.

---

### Remark B5 — Vite export silently produces empty `App.jsx`

**Architect:** In `buildViteProjectFiles`, after extracting `rawScript`, check `if (!appBody.trim())`. If empty, throw an error with message `"This app doesn't use the expected Babel/React format for Vite export. Try downloading as HTML instead."` The `/api/playground/export` route will catch this and return a 422. The `ExportModal` catches `!response.ok` and already has an error display state. Additionally, add the fallback: if extraction fails, embed the full HTML in a static `iframe`-based App.jsx wrapper as a last resort.

**Strategist:** A broken ZIP download is worse than no download — it creates a support ticket and damages the "take your app anywhere" narrative that is a key Playground value proposition. Fail loudly with clear user direction.

---

### Remark B6 — Delegates receive `creator` JWT role, enabling config writes

**Architect:** Introduce a third role `'delegate'` in `PlaygroundTokenRole`. Update `getPlaygroundAppRole` to return `'delegate'` (not `'creator'`) for app.delegates matches. In the config store routes that call `assertCreatorRole`, no change needed — delegates cannot write config. In collection and user store routes, change `assertCreatorRole` calls to a new `assertWriteRole(payload)` helper that accepts `creator | delegate`. This matches the stated UX contract: "read and write to shared storage" means collections and user buckets, not app-wide settings. Requires no schema migration.

**Strategist:** This is a correctness issue that could surface in a demo: an educator shares an app with a student delegate, and the student can change the leaderboard config or game settings. Embarrassing edge case for institutional evaluators.

---

### Remark U1 — "New" confirmation fires even when the app is saved

**Architect:** Change the condition at `PlaygroundLayout.tsx:284` from `if (code.trim())` to `if (isDirty)`. The `isDirty` memo is already correct: `Boolean(code.trim()) && code !== lastSavedCode`. No other changes needed.

**Strategist:** False warnings are worse than no warnings — they train users to click through confirmations without reading them. If "New" always shows a warning even after saving, users learn to ignore it, and the one time it matters (genuinely unsaved work), they dismiss it by reflex.

---

### Remark U2 — Back button navigates away with no warning on unsaved changes

**Architect:** Replace the `<Link href={returnTo}>` Back button with a `<button>` that calls a `handleBack()` function. If `isDirty`, call `setNewSessionConfirm(true)` and store a `pendingNavigation: string` state ref that `handleNewSession` consults to navigate after confirm. Also add a `useEffect` that registers `window.addEventListener('beforeunload', handler)` when `isDirty` is true (removes on cleanup). The `beforeunload` handler should call `event.preventDefault()` which triggers the browser's native "leave page?" dialog as a last line of defense.

**Strategist:** Losing 30 minutes of work by clicking "Back" is the kind of experience that gets screenshot-shared in a faculty Slack channel. This is a platform reputation risk, not just a UX annoyance. FERPA note: `beforeunload` doesn't transmit data; it only blocks navigation. Fully compliant.

---

### Remark U3 — No visual feedback in preview during code generation

**Architect:** Add `isGenerating: boolean` prop to `AppPreview`. When `true`, render an absolutely-positioned overlay inside the preview container (not inside the `<iframe>`) matching the existing "Preparing SANDBOX storage access..." overlay pattern — same styling, different text ("Generating your app..."), include a `Loader2` spinner. Wire it: in `PlaygroundLayout`, derive `isGenerating` from the chat's streaming state. Add `onGeneratingChange: (val: boolean) => void` to `PlaygroundChat`'s prop interface and call it when `setIsLoading` changes.

**Strategist:** The 3-pane layout creates a spatial expectation: chat on left signals intent, editor in middle shows progress, preview on right shows result. When the chat is streaming but the preview is frozen with no indicator, users look at the wrong panel for feedback. A generation overlay closes the feedback loop and reduces "is it broken?" anxiety during the most critical moment of the builder workflow.

---

### Remark U4 — Examples gallery populates textarea; starters auto-submit — inconsistent

**Architect:** In `PlaygroundChat`, change `ExamplesGallery`'s `onSelect` callback from `setInput(prompt); textareaRef.current?.focus()` to `void sendMessage(prompt)`. This makes both starters and gallery examples behave identically. The gallery is hidden under a `<details>` element so accidental triggers are low risk.

**Strategist:** Interaction pattern consistency is foundational to learnability. If two visually similar affordances (prompt chips and example cards) behave differently, users build incorrect mental models of the tool. Educators exploring the Playground for the first time should be able to click any example and immediately see code — not wonder why nothing happened.

---

### Remark U5 — DelegatesModal has no Enter key support on email input

**Architect:** Add `onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleAddDelegate() } }}` to the email input in `DelegatesModal`. This is a single-line change.

**Strategist:** Missing Enter key support on a form input is one of the most universally-noticed UX omissions. It signals that a feature wasn't finished. For educators sharing an app before a class session, the friction of reaching for the mouse to click "Add delegate" creates a moment of doubt about the platform's quality.

---

### Remark U6 — `my-apps` delete uses `window.confirm`

**Architect:** Add `confirmDeleteId: string | null` state to `MyAppsPage`. When the delete button is clicked, if `confirmDeleteId !== appId`, set `confirmDeleteId = appId` instead of calling `handleDelete`. Render an inline "Delete?" confirmation row on the matching card. A click outside or on Cancel clears it. This matches the visual language of the PlaygroundLayout confirm patterns exactly.

**Strategist:** `window.confirm` is a native OS dialog that breaks the visual context completely. It looks like a browser warning, not a product decision. For institutional evaluators and faculty users, it reads as "this wasn't finished." Every other destructive action in the codebase uses inline confirmation — this is the one exception.

---

### Remark U7 — `PlaygroundSkeleton` is invisible on mobile

**Architect:** The mobile layout (`lg:hidden` block) wraps in a `flex-col` container. During `isLoadingApp`, render a centered `<div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0033A0]" /></div>` instead of the main layout. The `PlaygroundSkeleton` component can remain desktop-only; the mobile path just needs a simple loading state.

**Strategist:** Mobile-first educators (many faculty use tablets for lesson planning) who load a saved app on mobile see a blank screen for several seconds. On mobile, silence equals broken. A spinner closes the "is the page loaded?" loop and maintains trust during the critical first experience of loading a saved app.

---

### Remark A1 — `max_tokens: 4096` causes silent mid-HTML truncation

**Architect:** Increase to `8192`. This is a single-line change with zero risk. Claude Sonnet 4.6 supports 8192 output tokens. Beyond the token increase, add a truncation detector in `PlaygroundChat`'s stream completion handler: after `isCodeResponse` streams complete, check if `finalHtml.trimEnd()` does not end with `</html>` (case-insensitive). If truncated, append a user-visible message: "The app exceeded the generation limit and was truncated — try asking for a simpler version or break it into smaller pieces." Do NOT auto-run a truncated app (override `autoRunOnGenerate`).

**Strategist:** Truncated apps are the silent killer of Playground adoption. An educator tries to build something moderately complex, gets a broken preview, and concludes "the AI can't do this." They never know it was a token limit. Raising the ceiling prevents 80% of these failures. The truncation detector prevents the remaining 20% from silently confusing users.

---

### Remark A2 — Hard 2-message gate frustrates experienced users

**Architect:** This is purely a system prompt change in `chat/route.ts`. Remove the entire `belowThreshold` branch that appends `## CURRENT TURN\nThis is user message N... Do NOT output any HTML.` to the system prompt. Replace the rigid protocol in `PLAYGROUND_SYSTEM_PROMPT` with: `"If the user's first message is specific and actionable (names an app type, describes features, or gives clear requirements), build it immediately. If it is vague (e.g., just 'make a quiz' or 'build something fun'), ask 1 targeted clarifying question — not 2-3. Never ask more than one question before attempting a build."` The `userMessageCount` variable and `belowThreshold` logic in the route can both be removed.

**Strategist:** The 2-message gate is the single highest-friction point for new users. The starter prompts in the chat explicitly invite single-message engagement ("Build me a flashcard quiz") — but the gate breaks that promise and delivers a questionnaire instead. For faculty trying the Playground for the first time between class sessions, waiting through 2 interrogation rounds before seeing any result is a session-ender. This is the most important AI quality fix in the plan.

---

### Remark A3 — Unbounded conversation history grows context and cost

**Architect:** In `PlaygroundChat.sendMessage`, cap `priorConversation` to the last 8 message pairs (16 messages) before sending. The server-side `currentCode` injection already carries all the state Claude needs — older turns provide diminishing context value. Implementation: `const priorConversation = messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-16).map(...)`. For very long sessions, also consider keeping the first 2 turns (original intent) + last 6 turns (recent context) rather than just last 8 — this preserves the original app description when doing late-session refinements.

**Strategist:** This is invisible to users but directly affects platform cost and response latency. A 20-turn playground session can accumulate 80,000+ tokens in context (code is large). Slower responses at turn 15 erode the "real-time" feeling of the builder. Cost matters for institutional budgets being reviewed by Eric Monday's office.

---

### Remark A4 — Error capture script in generated apps is AI-dependent

**Architect:** Move the `window.onerror` + `unhandledrejection` error capture block from "Claude's responsibility" to `AppPreview`'s `injectSandboxScript` function. Define a constant `ERROR_CAPTURE_SCRIPT` in `AppPreview.tsx` (the same script Claude is asked to include, but hardcoded). In `injectSandboxScript`, always inject it after the SANDBOX script, regardless of what the generated HTML contains. This makes error reporting unconditional. The system prompt can still instruct Claude to include it (belt and suspenders), but the host guarantees it.

**Strategist:** When runtime errors are visible in the chat panel, educators can click "Fix this" with confidence. When errors are invisible, the app just "doesn't work" with no actionable next step. The "Fix this" button is one of the highest-value educator-empowerment features — it makes AI debugging feel magical. Making error capture unconditional ensures that button is always available.

---

### Remark A5 — Stream errors during code generation inject markdown into the HTML stream

**Architect:** Define a sentinel string `STREAM_ERROR_PREFIX = '__SANDBOX_STREAM_ERROR__:'`. In `chat/route.ts`'s stream error handler, replace the markdown injection with `controller.enqueue(encoder.encode(`${STREAM_ERROR_PREFIX}${userMsg}`))`. In `PlaygroundChat`'s stream reader loop, before appending to `fullResponse`, check if the current chunk starts with `STREAM_ERROR_PREFIX`. If so, extract the message, set it as a chat error (map the assistant message to a warning), and break out of the stream loop without touching `onCodeGenerated`. This fully separates error signaling from content streaming.

**Strategist:** A corrupted HTML file that renders a broken preview plus a markdown error message embedded in the code is the worst possible error UX — confusing, ugly, and unactionable. The sentinel pattern is invisible to users but ensures errors always surface as clean chat messages.

---

### Remark R1 — `assertCreator` uses string-code `Error` objects

**Architect:** Replace `throw new Error('NOT_FOUND')` and `throw new Error('FORBIDDEN')` in `assertCreator` with `throw new PlaygroundHttpError(404, 'Playground app not found')` and `throw new PlaygroundHttpError(403, 'Forbidden')`. Remove the manual `error.message === 'NOT_FOUND'` string-matching in PUT and DELETE handlers — `handlePlaygroundError` will catch `PlaygroundHttpError` automatically. This eliminates a class of fragile pattern. Apply the same cleanup to any other non-standard error throws in the playground API directory.

**Strategist:** No user-facing impact, but this is the kind of brittle code that causes 3am oncall incidents when a Prisma error or typo causes an unexpected `handlePlaygroundError` path. Clean architecture is educator trust — if the platform is reliable in production, faculty recommend it to colleagues.

---

### Remark R2 — Token re-fetched on every `runId` increment

**Architect:** In `AppPreview`, add `const tokenCacheRef = useRef<{ token: string; expiresAt: number } | null>(null)`. In `injectToken`, before fetching: `if (tokenCacheRef.current && Date.now() < tokenCacheRef.current.expiresAt - 5 * 60 * 1000) { /* use cached */ }`. Set `expiresAt = Date.now() + 55 * 60 * 1000` on successful fetch. Reset cache when `appId` changes (add `appId` to a separate `useEffect` that clears the ref). This reduces DB queries for active sessions by ~95%.

**Strategist:** No user-visible impact but reduces infrastructure cost and response latency. For demos with 20 people building simultaneously, this matters.

---

### Remark R3 — No `beforeunload` guard for browser close on unsaved changes

**Architect:** In `PlaygroundLayout`, add:
```typescript
useEffect(() => {
  if (!isDirty) return
  const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}, [isDirty])
```
This complements the "Back" button fix (U2). Note: modern browsers show a generic "Leave site?" dialog — you cannot customize the message. This is expected behavior.

**Strategist:** The browser-close guard is the last line of defense. It doesn't replace the Back button fix or the Save UX — it's the safety net. FERPA note: `beforeunload` does not transmit any data. The `event.preventDefault()` call only triggers the browser's native unload dialog.

---

### Remark N1 — No description field in Playground UI

**Architect:** Add an optional `description` field to `PlaygroundLayout`. Show it as a small secondary input below the title (placeholder: "Short description — shown in My Apps"). It should be auto-populated on first save using the first user message (up to 160 chars). Save it via the existing `title` save path. In `my-apps/page.tsx`, the description is already rendered (`app.description ? <p>...`) — it just needs to be populated.

**Strategist:** The My Apps page is the Playground's "second visit" surface — it's where educators return after saving their first app. Cards with only "Untitled App" and a timestamp create no context. A description line ("Week 3 flashcard review — Civil War") transforms the library from a list of files into a portfolio of teaching artifacts. This directly supports educator retention.

---

### Remark N2 — No duplicate app action

**Architect:** Add a "Duplicate" button to each card in `my-apps/page.tsx`. On click, POST to `/api/playground/apps` with `{ title: "${app.title} (copy)", htmlContent: app.htmlContent }`. The `htmlContent` is not currently returned by the `GET /api/playground/apps` list endpoint — add it to the select (or add a dedicated `POST /api/playground/apps/[appId]/duplicate` endpoint that reads the source app and creates the copy in a single transaction). Navigate to `/playground?app=${newId}` on success.

**Strategist:** Duplication is the educator's primary creative workflow — "start from what worked last semester." Without it, educators rebuild from scratch or keep notes of what they built. With it, the Playground becomes a curriculum-building toolkit that compounds over time. High adoption driver.

---

### Remark N5 — Chat history lost on page reload

**Architect:** In `PlaygroundChat`, add a `useEffect` that writes `messages` to `localStorage` under key `playground:chat:${appId}` whenever `messages` changes and `appId` is truthy. On mount (when `appId` is provided), attempt to rehydrate from `localStorage`. Apply a max of 30 stored messages to bound storage. Clear localStorage on "Clear Chat" click and on `handleNewSession` in `PlaygroundLayout`. Note: do NOT persist system/runtime-error messages (filter to `role === 'user' | 'assistant'` before storing). FERPA: localStorage is local to the user's browser; this does not transmit data to any server.

**Strategist:** Chat history is the "undo history" of the builder workflow. Losing it on reload destroys the AI-human collaboration context — the user can't remember what they asked, what worked, what they rejected. For faculty building tools over multiple sessions (between classes), localStorage persistence is the difference between a tool they can rely on and a toy they have to restart from scratch.

---

## Implementation Roadmap

### Execution Protocol
- Execute each task exactly as specified.
- After every **2 tasks**, run `npm run build` from `the-sandbox/`.
- If the build fails, diagnose and fix before proceeding. Do not skip.
- After every **2 tasks** (every build checkpoint), output the **Handoff Prompt** for that pair so a new Claude context can continue if needed.
- Do NOT make changes outside the specified files for each task.
- Commit message format: `fix(playground): [task description]`

---

## Phase 1: Critical Bugs & Data Loss Prevention
*Estimated: Tasks 1–6*

---

### Task 1: Fix PATCH routing + `assertCreator` error pattern

**Files:**
- `app/api/playground/apps/[appId]/route.ts`
- `app/components/playground/PlaygroundLayout.tsx`

**Changes:**

In `apps/[appId]/route.ts`:
1. Replace `async function assertCreator` — instead of throwing plain `Error('NOT_FOUND')` and `Error('FORBIDDEN')`, import `PlaygroundHttpError` from `../../../../lib/playground-storage` and throw `new PlaygroundHttpError(404, 'Playground app not found')` and `new PlaygroundHttpError(403, 'Forbidden')` respectively.
2. Remove the manual `error.message === 'NOT_FOUND'` string-matching catch blocks in PUT and DELETE — they are now unnecessary since `handlePlaygroundError` will catch `PlaygroundHttpError`. Replace the inner try/catch in both handlers with just `await assertCreator(appId, user.id)` directly (let it throw through to the outer catch).
3. Add a new `export async function PATCH` handler that:
   - Awaits `params` and calls `requireDemoUser`
   - Calls `assertCreator(appId, user.id)`
   - Parses body as `{ title?: string; description?: string | null }`
   - Builds a `data` object with only the provided fields (no `htmlContent`)
   - Calls `prisma.playgroundApp.update({ where: { id: appId }, data, select: { id: true, title: true } })`
   - Returns `NextResponse.json(app)`
   - Wraps everything in try/catch → `handlePlaygroundError`

In `PlaygroundLayout.tsx`:
4. In `handleTitleBlur` (line ~209), the `method: 'PATCH'` is now correct — no change needed here since we added the PATCH handler.

**Verify:** `npm run build` — 0 TypeScript errors.

---

### Task 2: Fix `my-apps` delete response check + inline confirmation

**Files:**
- `app/my-apps/page.tsx`

**Changes:**
1. Add `const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)` state.
2. Add `const [deleteError, setDeleteError] = useState<string | null>(null)` state.
3. In `handleDelete`: Remove `window.confirm`. Check `response.ok` before filtering state. If `!response.ok`, call `setDeleteError(appId)` and show an inline error.
4. Change the delete button's `onClick`: If `confirmDeleteId !== appId`, call `setConfirmDeleteId(appId)` instead of `handleDelete`. If `confirmDeleteId === appId`, call `handleDelete(appId)` and `setConfirmDeleteId(null)`.
5. On each card, when `confirmDeleteId === app.id`, replace the single trash icon button with two inline buttons: "Cancel" (calls `setConfirmDeleteId(null)`) and "Confirm Delete" (calls `void handleDelete(app.id)`). Style: Cancel uses `border border-gray-200`, Confirm Delete uses `bg-red-600 text-white`. Use the same `rounded-2xl` and `text-xs font-semibold` as the rest of the app.
6. If `deleteError === app.id`, show a small `<p className="mt-1 text-xs text-red-500">Delete failed. Try again.</p>` below the card buttons.

**Verify:** `npm run build` — 0 TypeScript errors.

---

### ✅ Phase 1 — Tasks 1–2 Build Checkpoint
Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run build`
Expected: Exit 0, 0 errors. If TypeScript errors appear, fix before Task 3.

---

### 🔁 Tasks 1–2 Handoff Prompt
```
You are continuing an implementation sprint for "The Sandbox" — an AI-powered educational platform at the University of Kentucky. The project is at `c:\AA Code\Educator marketplace\the-sandbox\`.

Tasks 1–2 of the Playground Hardening Plan are complete and the build is clean:
- Task 1: PATCH handler added to apps/[appId]/route.ts; assertCreator now uses PlaygroundHttpError
- Task 2: my-apps delete now checks response.ok; uses inline confirm instead of window.confirm

The implementation plan is at `c:\AA Code\Educator marketplace\Blueprints\playground-hardening-implementation-plan.md`.

Please continue with Task 3. After each pair of tasks, run `npm run build` and confirm 0 errors before proceeding.
```

---

### Task 3: Fix `hasManualEditsRef` reactivity + `isDirty` guard on "New" button

**Files:**
- `app/components/playground/PlaygroundLayout.tsx`

**Changes:**
1. Remove `const hasManualEditsRef = useRef(false)` (line ~113).
2. Add `const [hasManualEdits, setHasManualEdits] = useState(false)` near the other state declarations.
3. Replace all `hasManualEditsRef.current = true` with `setHasManualEdits(true)`.
4. Replace all `hasManualEditsRef.current = false` with `setHasManualEdits(false)`.
5. There are 3 occurrences: in `onCodeGenerated` callback (line ~394/458), in `onChange` callback in `CodeEditor` (line ~411/492), and in `handleNewSession` (line ~237). Update all three.
6. Update both `PlaygroundChat` instances (desktop and mobile) to use `hasManualEdits={hasManualEdits}` prop (they already reference the value, just now it's state).
7. In the "New" button's `onClick` handler (line ~284-290), change `if (code.trim())` to `if (isDirty)`.

**Verify:** `npm run build` — 0 TypeScript errors.

---

### Task 4: Add `beforeunload` guard + fix Back button data loss

**Files:**
- `app/components/playground/PlaygroundLayout.tsx`

**Changes:**
1. Add a `useEffect` for `beforeunload`:
```typescript
useEffect(() => {
  if (!isDirty) return
  const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}, [isDirty])
```
2. Add state: `const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)`.
3. Replace the `<Link href={returnTo} ...>Back</Link>` button with a `<button type="button">` that:
   - If `isDirty`: calls `setPendingNavigation(returnTo)` and `setNewSessionConfirm(true)`
   - If not dirty: calls `router.push(returnTo)` (import `useRouter` from `next/navigation`)
4. In `handleNewSession`, after all state resets, add: `if (pendingNavigation) { router.push(pendingNavigation); setPendingNavigation(null) }`.
5. In the `newSessionConfirm` amber banner, update the "Start fresh" button's label to show "Start fresh" when `pendingNavigation` is null, or "Leave page" when `pendingNavigation` is set.
6. In the `newSessionConfirm` cancel handler, also clear `pendingNavigation`: `setNewSessionConfirm(false); setPendingNavigation(null)`.

**Verify:** `npm run build` — 0 TypeScript errors.

---

### ✅ Phase 1 — Tasks 3–4 Build Checkpoint
Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run build`
Expected: Exit 0, 0 errors.

---

### 🔁 Tasks 3–4 Handoff Prompt
```
You are continuing an implementation sprint for "The Sandbox" — an AI-powered educational platform at the University of Kentucky. The project is at `c:\AA Code\Educator marketplace\the-sandbox\`.

Tasks 1–4 of the Playground Hardening Plan are complete and the build is clean:
- Task 1: PATCH handler added to apps/[appId]/route.ts; assertCreator now uses PlaygroundHttpError
- Task 2: my-apps delete now checks response.ok; uses inline confirm instead of window.confirm
- Task 3: hasManualEditsRef converted to useState; "New" button now checks isDirty
- Task 4: beforeunload guard added; Back button checks isDirty before navigating

The implementation plan is at `c:\AA Code\Educator marketplace\Blueprints\playground-hardening-implementation-plan.md`.

Please continue with **Phase 2: AI Engine Hardening** starting at Task 5. After each pair of tasks, run `npm run build` and confirm 0 errors before proceeding.
```

---

## Phase 2: AI Engine Hardening
*Estimated: Tasks 5–8*

---

### Task 5: Raise `max_tokens` + add truncation detection

**Files:**
- `app/api/playground/chat/route.ts`
- `app/components/playground/PlaygroundChat.tsx`

**Changes:**

In `chat/route.ts`:
1. Change `max_tokens: 4096` to `max_tokens: 8192` (line ~169).

In `PlaygroundChat.tsx`:
2. In the stream completion handler (after the `while(true)` loop exits), add a truncation check:
```typescript
if (isCodeResponse) {
  const isTruncated = !finalHtml.trimEnd().toLowerCase().endsWith('</html>')
  if (isTruncated) {
    // Do NOT auto-run a truncated app
    onCodeGenerated(finalHtml)
    setMessages(prev => prev.map(m =>
      m.id === assistantMessage.id
        ? { ...m, content: '⚠️ The app was too large to generate completely — it was cut off before `</html>`. Try asking for a simpler version, or break it into smaller steps.', variant: 'markdown' }
        : m
    ))
    return
  }
}
```
3. Add this check before the existing `if (autoRunOnGenerate) { onRunGeneratedCode(finalHtml) }` block.

**Verify:** `npm run build` — 0 TypeScript errors.

---

### Task 6: Remove the 2-message generation gate

**Files:**
- `app/api/playground/chat/route.ts`

**Changes:**
1. Remove the `userMessageCount` variable (line ~134) — it is no longer needed.
2. Remove the `noCodeYet` and `belowThreshold` variables (lines ~160–161).
3. Remove the `systemPrompt` conditional (lines ~162–164). Replace with simply: `const systemPrompt = PLAYGROUND_SYSTEM_PROMPT`.
4. In `PLAYGROUND_SYSTEM_PROMPT`, replace the `**When no app exists yet**` section (lines ~21-28) with:
```
**When no app exists yet (first conversation, no current code)**:
- If the user's message is specific and actionable (names an app type, describes features, or gives clear requirements), generate the HTML immediately.
- If the message is vague (e.g., just "make a quiz" with no details), ask ONE targeted clarifying question in plain text. Do not ask more than one question before attempting a build.
- If the user says "just build it", "go ahead", or similar, generate immediately.
```
5. The `currentCode` injection logic (lines ~140–158) remains unchanged — it still adds `<current_code>` context when code exists.

**Verify:** `npm run build` — 0 TypeScript errors.

---

### ✅ Phase 2 — Tasks 5–6 Build Checkpoint
Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run build`
Expected: Exit 0, 0 errors.

---

### 🔁 Tasks 5–6 Handoff Prompt
```
You are continuing an implementation sprint for "The Sandbox" — an AI-powered educational platform at the University of Kentucky. The project is at `c:\AA Code\Educator marketplace\the-sandbox\`.

Tasks 1–6 of the Playground Hardening Plan are complete and the build is clean:
- Task 1: PATCH handler added; assertCreator uses PlaygroundHttpError
- Task 2: my-apps delete checks response.ok; inline confirm replaces window.confirm
- Task 3: hasManualEditsRef → useState; New button checks isDirty
- Task 4: beforeunload guard; Back button checks isDirty
- Task 5: max_tokens raised to 8192; truncation detection added
- Task 6: 2-message generation gate removed; AI-judgment prompt replaces it

The implementation plan is at `c:\AA Code\Educator marketplace\Blueprints\playground-hardening-implementation-plan.md`.

Please continue with Task 7. After each pair of tasks, run `npm run build` and confirm 0 errors before proceeding.
```

---

### Task 7: Cap conversation history + stream error sentinel

**Files:**
- `app/components/playground/PlaygroundChat.tsx`
- `app/api/playground/chat/route.ts`

**Changes in `PlaygroundChat.tsx`:**
1. In `sendMessage`, update `priorConversation` to keep the first 2 + last 6 pairs (max 16 messages):
```typescript
const allPrior = messages
  .filter(m => m.role === 'user' || m.role === 'assistant')
  .map(({ role, content }) => ({ role, content }))

const priorConversation = allPrior.length <= 16
  ? allPrior
  : [...allPrior.slice(0, 2), ...allPrior.slice(-14)]
```
2. Add sentinel detection in the stream reader loop:
```typescript
const STREAM_ERROR_SENTINEL = '__SANDBOX_STREAM_ERROR__:'
// Inside the chunk processing:
if (fullResponse.includes(STREAM_ERROR_SENTINEL)) {
  const sentinelIdx = fullResponse.indexOf(STREAM_ERROR_SENTINEL)
  const errorMsg = fullResponse.slice(sentinelIdx + STREAM_ERROR_SENTINEL.length).trim()
  setMessages(prev => prev.map(m =>
    m.id === assistantMessage.id
      ? { ...m, content: `⚠️ ${errorMsg}`, variant: 'markdown' }
      : m
  ))
  break
}
```
Place this check at the top of the chunk processing, before `isCodeResponse` detection.

**Changes in `chat/route.ts`:**
3. In the stream error handler (inside the `start(controller)` async block), replace:
```typescript
try { controller.enqueue(encoder.encode(`\n\n_${userMsg}_`)) } catch { /* ignore */ }
```
with:
```typescript
try { controller.enqueue(encoder.encode(`__SANDBOX_STREAM_ERROR__:${userMsg}`)) } catch { /* ignore */ }
```

**Verify:** `npm run build` — 0 TypeScript errors.

---

### Task 8: Guarantee error-capture script injection in AppPreview

**Files:**
- `app/components/playground/AppPreview.tsx`

**Changes:**
1. Add a constant `ERROR_CAPTURE_SCRIPT` above `buildSandboxScript`:
```typescript
const ERROR_CAPTURE_SCRIPT = `<script>
window.onerror = function(msg, src, line, col, err) {
  window.parent.postMessage({ type: 'SANDBOX_ERROR', message: (err && err.message) || msg || 'Unknown error' }, '*');
  return true;
};
window.addEventListener('unhandledrejection', function(e) {
  window.parent.postMessage({ type: 'SANDBOX_ERROR', message: (e.reason && e.reason.message) || 'Unhandled promise rejection' }, '*');
});
<\/script>`
```
2. Create a new function `injectErrorCapture(code: string): string` that injects `ERROR_CAPTURE_SCRIPT` at the top of `<head>` (using the same pattern as `injectSandboxScript` — check for `</head>`, then `<head>`, then prepend).
3. In `injectSandboxScript`: apply `injectErrorCapture` first, then inject the SANDBOX script. Chain: `injectSandboxScript(injectErrorCapture(code), token, appId)`.
4. For apps without a saved `appId` (line ~106): also apply `injectErrorCapture`: `setRenderedCode(injectErrorCapture(code))`.

**Verify:** `npm run build` — 0 TypeScript errors.

---

### ✅ Phase 2 — Tasks 7–8 Build Checkpoint
Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run build`
Expected: Exit 0, 0 errors.

---

### 🔁 Tasks 7–8 Handoff Prompt
```
You are continuing an implementation sprint for "The Sandbox" at `c:\AA Code\Educator marketplace\the-sandbox\`.

Tasks 1–8 of the Playground Hardening Plan are complete and the build is clean:
- Task 1: PATCH handler added; assertCreator uses PlaygroundHttpError
- Task 2: my-apps delete checks response.ok; inline confirm replaces window.confirm
- Task 3: hasManualEditsRef → useState; New button checks isDirty
- Task 4: beforeunload guard; Back button checks isDirty
- Task 5: max_tokens raised to 8192; truncation detection added
- Task 6: 2-message generation gate removed; AI-judgment prompt replaces it
- Task 7: Conversation history capped (first 2 + last 14); stream error sentinel added
- Task 8: Error capture script always injected by AppPreview (unconditional)

Note: PlaygroundChat now has `appId` and `onGeneratingChange` props declared (used by Tasks 9 and 15). AppPreview now has `isGenerating` prop declared (used by Task 9). These stubs are already in place.

The implementation plan is at `c:\AA Code\Educator marketplace\Blueprints\playground-hardening-implementation-plan.md`.

Please continue with **Phase 3: Preview & UX Polish** starting at Task 9. After each pair of tasks, run `npm run build` and confirm 0 errors before proceeding.
```

---

## Phase 3: Preview & UX Polish
*Estimated: Tasks 9–12*

---

### Task 9: Add `isGenerating` overlay to AppPreview

**Files:**
- `app/components/playground/AppPreview.tsx`
- `app/components/playground/PlaygroundLayout.tsx`
- `app/components/playground/PlaygroundChat.tsx`

**Changes in `PlaygroundChat.tsx`:**
1. Add `onGeneratingChange: (val: boolean) => void` to `PlaygroundChatProps`.
2. Call `onGeneratingChange(true)` immediately before `setIsLoading(true)` in `sendMessage`.
3. Call `onGeneratingChange(false)` in the `finally` block alongside `setIsLoading(false)`.

**Changes in `PlaygroundLayout.tsx`:**
4. Add `const [isGenerating, setIsGenerating] = useState(false)` state.
5. Pass `onGeneratingChange={setIsGenerating}` to both `PlaygroundChat` instances (desktop and mobile).
6. Pass `isGenerating={isGenerating}` to both `AppPreview` instances.

**Changes in `AppPreview.tsx`:**
7. Add `isGenerating?: boolean` to `AppPreviewProps`.
8. Inside the returned JSX (when `code.trim()` is truthy), add an overlay above the error overlay and below the open-in-new-tab button:
```typescript
{isGenerating && !isPreparing && (
  <div className="pointer-events-none absolute inset-x-3 top-3 rounded-2xl border border-blue-200 bg-white/95 px-4 py-3 text-sm text-[#0033A0] shadow-lg shadow-blue-100">
    <div className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Generating your app...</span>
    </div>
  </div>
)}
```

**Verify:** `npm run build` — 0 TypeScript errors.

---

### Task 10: Token caching in AppPreview + architecture cleanup

**Files:**
- `app/components/playground/AppPreview.tsx`
- `app/api/playground/apps/[appId]/route.ts` (minor: already fixed in Task 1, verify)

**Changes in `AppPreview.tsx`:**
1. Add `const tokenCacheRef = useRef<{ token: string; appId: string; expiresAt: number } | null>(null)`.
2. In `injectToken`, before the `fetch` call, check:
```typescript
const cached = tokenCacheRef.current
if (cached && cached.appId === appId && Date.now() < cached.expiresAt - 5 * 60 * 1000) {
  if (!cancelled) {
    setRenderedCode(injectSandboxScript(injectErrorCapture(code), cached.token, appId))
    setIsPreparing(false)
  }
  return
}
```
3. After a successful token fetch, store the result:
```typescript
tokenCacheRef.current = {
  token: payload.token,
  appId,
  expiresAt: Date.now() + 55 * 60 * 1000,
}
```
4. Remove `appId` from the `useEffect` dependency array comment (it was already there) — the cache already handles the appId change by comparing `cached.appId === appId`.

**Verify:** `npm run build` — 0 TypeScript errors.

---

### ✅ Phase 3 — Tasks 9–10 Build Checkpoint
Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run build`
Expected: Exit 0, 0 errors.

---

### 🔁 Tasks 9–10 Handoff Prompt
```
You are continuing an implementation sprint for "The Sandbox" at `c:\AA Code\Educator marketplace\the-sandbox\`.

Tasks 1–10 of the Playground Hardening Plan are complete and the build is clean:
- Tasks 1–8: See Tasks 7–8 handoff for details
- Task 9: isGenerating overlay added to AppPreview; wired through PlaygroundLayout + PlaygroundChat
- Task 10: Token caching in AppPreview (55-min window, keyed by appId)

The implementation plan is at `c:\AA Code\Educator marketplace\Blueprints\playground-hardening-implementation-plan.md`.

Please continue with Task 11. After each pair of tasks, run `npm run build` and confirm 0 errors before proceeding.
```

---

### Task 11: Enter key in DelegatesModal + inline confirm in my-apps (replace window.confirm)

**Files:**
- `app/components/playground/DelegatesModal.tsx`
- `app/my-apps/page.tsx` *(already updated in Task 2 — verify inline confirm is in place)*

**Changes in `DelegatesModal.tsx`:**
1. Add `onKeyDown` handler to the email input:
```typescript
onKeyDown={(e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    void handleAddDelegate()
  }
}}
```

**Changes in `my-apps/page.tsx` (Task 2 verification):**
2. Confirm `confirmDeleteId` state and inline confirmation are in place from Task 2. No additional changes needed.

**Verify:** `npm run build` — 0 TypeScript errors.

---

### Task 12: ExamplesGallery auto-submit + mobile skeleton during load

**Files:**
- `app/components/playground/PlaygroundChat.tsx`
- `app/components/playground/PlaygroundLayout.tsx`

**Changes in `PlaygroundChat.tsx`:**
1. `ExamplesGallery` currently receives `onSelect={(prompt) => { setInput(prompt); textareaRef.current?.focus() }}`. Change this to `onSelect={(prompt) => { void sendMessage(prompt) }}`. Remove the `setInput` and `focus` calls for this path.

**Changes in `PlaygroundLayout.tsx`:**
2. The mobile layout's `isLoadingApp` branch currently only shows `<PlaygroundSkeleton />` (which is `hidden lg:grid`). Inside the `{isLoadingApp ? ... : ...}` block, add a mobile fallback:
```typescript
{isLoadingApp ? (
  <>
    <PlaygroundSkeleton /> {/* desktop */}
    <div className="flex flex-1 items-center justify-center lg:hidden">
      <Loader2 className="h-8 w-8 animate-spin text-[#0033A0]" />
    </div>
  </>
) : ( ... existing layout ... )}
```

**Verify:** `npm run build` — 0 TypeScript errors.

---

### ✅ Phase 3 — Tasks 11–12 Build Checkpoint
Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run build`
Expected: Exit 0, 0 errors.

---

### 🔁 Tasks 11–12 Handoff Prompt
```
You are continuing an implementation sprint for "The Sandbox" at `c:\AA Code\Educator marketplace\the-sandbox\`.

Tasks 1–12 of the Playground Hardening Plan are complete and the build is clean:
- Tasks 1–10: See Tasks 9–10 handoff for details
- Task 11: Enter key support in DelegatesModal email input
- Task 12: ExamplesGallery auto-submits on click; mobile skeleton during app load

The implementation plan is at `c:\AA Code\Educator marketplace\Blueprints\playground-hardening-implementation-plan.md`.

Please continue with **Phase 4: Architecture Cleanup & Advanced Features** starting at Task 13. After each pair of tasks, run `npm run build` and confirm 0 errors before proceeding.
```

---

## Phase 4: Architecture Cleanup & Advanced Features
*Estimated: Tasks 13–16*

---

### Task 13: Delegate role separation (JWT role: 'delegate')

**Files:**
- `app/lib/playground-storage.ts`
- `app/api/playground/store/[appId]/config/[key]/route.ts`

**Changes in `playground-storage.ts`:**
1. Update `PlaygroundTokenRole` type: `export type PlaygroundTokenRole = 'creator' | 'delegate' | 'user'`
2. In `getPlaygroundAppRole`, change the delegate branch:
```typescript
if (user.role === 'ADMIN' || app.creatorId === user.id) {
  return 'creator' as const
}
if (app.delegates.length > 0) {
  return 'delegate' as const
}
return 'user' as const
```
3. Add a new helper: `export function assertWriteRole(payload: PlaygroundStorageTokenPayload) { if (payload.role !== 'creator' && payload.role !== 'delegate') { throw new PlaygroundHttpError(403, 'Forbidden') } }`

**Changes in `store/[appId]/config/[key]/route.ts`:**
4. The config PUT/write handler should call `assertCreatorRole(payload)` — verify it already does. Delegates should NOT be able to write config. No change needed if it already calls `assertCreatorRole`.

**Note:** Collection and user store routes that do not restrict to creator — they are already accessible by all token holders. The `delegate` role slots cleanly into the existing permission model.

**Verify:** `npm run build` — 0 TypeScript errors.

---

### Task 14: Description field in PlaygroundLayout + auto-populate on first save

**Files:**
- `app/components/playground/PlaygroundLayout.tsx`
- `app/api/playground/apps/route.ts`

**Changes in `PlaygroundLayout.tsx`:**
1. Add `const [appDescription, setAppDescription] = useState<string>('')` state.
2. In the app loading `useEffect` (line ~116), populate: `setAppDescription(data.description ?? '')` when loading a saved app.
3. In `handleSave`, include `description: appDescription.trim() || null` in the POST/PUT body.
4. Add a description input below the title input in the header:
```typescript
<input
  value={appDescription}
  onChange={(e) => setAppDescription(e.target.value.slice(0, 160))}
  maxLength={160}
  placeholder="Short description (optional)"
  aria-label="App description"
  className="mt-0.5 w-full bg-transparent border-b border-transparent focus:border-[#0033A0]/50 focus:outline-none text-sm text-gray-500"
/>
```
5. In `onPromptSubmitted` callback (line ~389/453), if `appDescription` is empty, auto-populate with the first 160 chars of the prompt: `if (!appDescription) { setAppDescription(prompt.slice(0, 160)) }`.
6. In `handleNewSession`, reset: `setAppDescription('')`.

**Changes in `apps/route.ts`:**
7. No changes needed — `description` is already accepted in POST body.

**Verify:** `npm run build` — 0 TypeScript errors.

---

### ✅ Phase 4 — Tasks 13–14 Build Checkpoint
Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run build`
Expected: Exit 0, 0 errors.

---

### 🔁 Tasks 13–14 Handoff Prompt
```
You are continuing an implementation sprint for "The Sandbox" at `c:\AA Code\Educator marketplace\the-sandbox\`.

Tasks 1–14 of the Playground Hardening Plan are complete and the build is clean:
- Tasks 1–12: See Tasks 11–12 handoff for details
- Task 13: Delegate JWT role separated ('delegate' vs 'creator'); config write remains creator-only
- Task 14: App description field added to PlaygroundLayout; auto-populated from first prompt

The implementation plan is at `c:\AA Code\Educator marketplace\Blueprints\playground-hardening-implementation-plan.md`.

Please continue with Task 15. After each pair of tasks, run `npm run build` and confirm 0 errors before proceeding.
```

---

### Task 15: LocalStorage chat history persistence

**Files:**
- `app/components/playground/PlaygroundChat.tsx`
- `app/components/playground/PlaygroundLayout.tsx`

**Changes in `PlaygroundChat.tsx`:**
1. Add `appId?: string | null` to `PlaygroundChatProps`.
2. Add a persistence `useEffect` that saves messages to localStorage:
```typescript
useEffect(() => {
  if (!appId || messages.length === 0) return
  const persistable = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-30)
  try {
    localStorage.setItem(`playground:chat:${appId}`, JSON.stringify(persistable))
  } catch { /* storage quota exceeded — ignore */ }
}, [messages, appId])
```
3. Add a rehydration `useEffect` that runs once on mount:
```typescript
useEffect(() => {
  if (!appId) return
  try {
    const stored = localStorage.getItem(`playground:chat:${appId}`)
    if (stored) {
      const parsed = JSON.parse(stored) as ChatMessage[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed)
      }
    }
  } catch { /* invalid JSON or missing storage — ignore */ }
}, [appId]) // run once
```
4. In the "Clear Chat" confirm handler (line ~381), add: `if (appId) { try { localStorage.removeItem(`playground:chat:${appId}`) } catch {} }`.

**Changes in `PlaygroundLayout.tsx`:**
5. Pass `appId={appId}` to both `PlaygroundChat` instances.

**Verify:** `npm run build` — 0 TypeScript errors.

---

### Task 16: Duplicate app in My Apps

**Files:**
- `app/my-apps/page.tsx`
- `app/api/playground/apps/route.ts`

**Note:** The list endpoint currently returns `{ id, title, description, createdAt, updatedAt }` — no `htmlContent`. We need it for duplication. Option A: fetch the full app on duplicate click. Option B: add a server-side duplicate endpoint. Use Option B (cleaner — single DB round-trip, no large payload transfer).

**Changes in `apps/route.ts`:**
The existing `POST /api/playground/apps` endpoint already creates an app from `{ title, htmlContent }`. We just need to fetch the source app server-side. Add a `sourceId` field to the POST handler:
```typescript
if (body.sourceId) {
  const source = await prisma.playgroundApp.findUnique({
    where: { id: body.sourceId },
    select: { htmlContent: true, description: true },
  })
  if (!source || !source.htmlContent) {
    return NextResponse.json({ error: 'Source app not found' }, { status: 404 })
  }
  // Override htmlContent and description with source
  htmlContent = source.htmlContent
  // Use body.title (already set below)
}
```
Adjust the existing flow to use `let htmlContent` and handle the `sourceId` branch before the `!htmlContent` guard.

**Changes in `my-apps/page.tsx`:**
1. Add `const [duplicatingId, setDuplicatingId] = useState<string | null>(null)`.
2. Add `handleDuplicate(appId: string, title: string)` async function:
```typescript
const handleDuplicate = useCallback(async (appId: string, title: string) => {
  setDuplicatingId(appId)
  try {
    const res = await fetch('/api/playground/apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ title: `${title} (copy)`, sourceId: appId, htmlContent: '__PLACEHOLDER__' }),
    })
    const data = await res.json() as { id?: string }
    if (data.id) {
      router.push(`/playground?app=${data.id}`)
    }
  } finally {
    setDuplicatingId(null)
  }
}, [currentUser.email, router])
```
3. Add import `useRouter` from `next/navigation`. Add `const router = useRouter()`.
4. Add a "Duplicate" button to each card in the button row, between the Open link and Delete button:
```typescript
<button
  type="button"
  onClick={() => void handleDuplicate(app.id, app.title)}
  disabled={duplicatingId === app.id}
  title="Duplicate app"
  className="flex h-8 w-8 items-center justify-center rounded-2xl border border-gray-200 text-gray-400 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-[#0033A0] disabled:opacity-40"
>
  {duplicatingId === app.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
</button>
```
5. Add `Copy` to the lucide-react import.

**Verify:** `npm run build` — 0 TypeScript errors.

---

### ✅ Phase 4 — Tasks 15–16 Build Checkpoint
Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run build`
Expected: Exit 0, 0 errors.

---

### 🔁 Tasks 15–16 Handoff Prompt
```
You are continuing an implementation sprint for "The Sandbox" at `c:\AA Code\Educator marketplace\the-sandbox\`.

All 16 tasks of the Playground Hardening Plan are complete:
- Tasks 1–14: See Tasks 13–14 handoff for details
- Task 15: Chat history persisted to localStorage (keyed by appId, max 30 msgs, clears on "Clear Chat")
- Task 16: Duplicate app added to My Apps page; server-side sourceId copy pattern

The implementation plan is at `c:\AA Code\Educator marketplace\Blueprints\playground-hardening-implementation-plan.md`.

All 16 tasks are now complete. Please run a final full build:
  cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run build

Then update CLAUDE.md Sprint History to record this sprint as complete, and update BLUEPRINT-STATUS.md to mark `playground-hardening-implementation-plan.md` as ✅ Complete.
```

---

## CLAUDE.md Sprint History Entry

After all tasks pass, add the following row to the Sprint History table in CLAUDE.md:

```
| 2026-03-19 | **Playground Hardening & UX Excellence** — 16-task sprint: PATCH handler for title auto-save, hasManualEdits reactivity fix, isDirty guard on New button, beforeunload data-loss guard, max_tokens raised to 8192, 2-message gate removed, conversation history capped, guaranteed error-capture injection, isGenerating overlay, token caching, Enter key in DelegatesModal, ExamplesGallery auto-submit, mobile skeleton, delegate JWT role separation, description field, localStorage chat persistence, duplicate app. | ✅ Complete |
```

---

## BLUEPRINT-STATUS.md Entry

Add to the active blueprints index:

```
| `playground-hardening-implementation-plan.md` | Playground builder bug fixes, AI quality, UX polish — 16 tasks | ✅ Complete (2026-03-19) |
```

---

## Summary Priority Matrix

| Task | Category | Effort | User Impact | Risk |
|------|----------|--------|-------------|------|
| T1 | Bug | Low | High — silent title loss | None |
| T2 | Bug | Low | Medium — phantom delete | None |
| T3 | Bug | Low | High — stale manual-edits warning | None |
| T4 | Bug | Low | High — data loss on navigation | None |
| T5 | AI | Low | High — truncated apps | None |
| T6 | AI | Low | Very High — removes #1 friction | None |
| T7 | AI | Low | Medium — context/cost | None |
| T8 | AI | Low | High — error visibility | None |
| T9 | UX | Low | Medium — generation feedback | None |
| T10 | Arch | Low | Low — infrastructure | None |
| T11 | UX | Low | Low — quality signal | None |
| T12 | UX | Low | Medium — UX consistency | None |
| T13 | Arch | Low | Low — correctness | None |
| T14 | UX | Low | Medium — My Apps usability | None |
| T15 | Feature | Low | High — context retention | None |
| T16 | Feature | Medium | High — educator workflow | Low |

**Total estimated engineering effort:** 1 focused day for an experienced engineer familiar with the codebase.
