# Playground UX Improvement Plan
### Dual Lens: Master Software Architect × Head of UX Strategy & Campus Culture
### University of Kentucky — The Sandbox / CATS-AI
### Generated: 2026-03-19

---

## Preamble: Two Lenses on the Same Data

**Architect lens:** The Playground is technically sound — Prisma v7 adapter pattern, streaming via ReadableStream, JWT-secured storage, Monaco editor. The code debt is in UI state management (too much local state in PlaygroundChat, no cross-panel communication layer) and in the absence of micro-feedback loops that modern collaborative tools take for granted.

**Strategist lens:** The Playground is the most "alive" feature in The Sandbox — it's where educators go from observer to creator. Every friction point here is a dropout event in the adoption funnel. The UKY context amplifies this: educators are overworked, students are skeptical of new platforms, and institutional patience for "figuring it out" is zero. Every confusing moment is a win for Canvas.

---

## Remark Evaluation Table

| # | Remark | Architect's Gold Standard Fix | Strategist's UX Impact | Priority |
|---|--------|-------------------------------|------------------------|----------|
| 1 | App title invisible | Inline editable `<input>` in header; auto-saves on blur via debounced PATCH to `/api/playground/apps/[appId]` | Educators name their tools — it's professional identity. Without it, "Save" feels like saving to the void. **High adoption.** | P0 |
| 2 | No dirty indicator | `●` dot badge on Save button when `isDirty`; CSS-only | Eliminates "did my changes save?" anxiety. Educator burnout reduction. | P1 |
| 3 | No "New" button | Add `sessionKey` state (nanoid) to PlaygroundLayout; pass as `key` prop to PlaygroundChat; increment on "New" click + confirm dialog if dirty | Iterative builders are the power users. Forcing a page reload breaks flow state entirely. **Critical for retention.** | P1 |
| 4 | "Delegates" is jargon | Rename button to "Share Access"; update DelegatesModal heading; add subtitle "Grant others read/write access to this app's shared storage" | FERPA note: terminology matters. "Delegate" implies administrative authority; "Share Access" is accurate and friendly. | P2 |
| 5 | "Back" always /studio | Read `?from=` query param in PlaygroundPage; pass `returnTo` to PlaygroundLayout; fall back to `/studio` | Minor friction but signals "the platform pays attention to where you came from." Trust signal. | P3 |
| 6 | Three "get started" surfaces | Replace blue box + chips + gallery with a single `PlaygroundEmptyState` component: large headline, 3 featured prompt chips, collapsed `<details>` gallery ("See 10 examples ↓") | **Highest first-impression impact.** Three competing CTAs signal indecision. One confident empty state converts. The gallery should be a discovery tool, not a first screen. | P0 |
| 7 | Placeholder text static | Derive from `hasStarted`: `"What would you like to change?"` vs `"Describe the tool you want to build…"` | Language that adapts to context is the #1 signal that the platform is "paying attention." Reduces "what do I do now?" dropout. | P1 |
| 8 | No scroll-to-bottom button | Add `showScrollBtn` state synced to `userScrolledUpRef`; floating `↓` button (absolute bottom-right of messages div) that calls `scrollToBottom()` and resets ref | Standard chat UX contract. Its absence makes Sandy feel like a terminal log, not a conversation. | P1 |
| 9 | Thin generation status | Track `{ chars, lines }` during streaming in PlaygroundChat; replace "Generating your app…" with `"Writing line {lines}…  ({chars} chars)"` | 10–30s dead time = abandonment. A live counter transforms waiting into anticipation. Maps directly to session completion rates. | P2 |
| 10 | Runtime errors only in chat | When `runtimeError` is non-null, add pulsing red ring (`ring-2 ring-red-400 animate-pulse`) to the Preview PanelFrame container via a prop | Cross-panel signaling is the gold standard. Users focused on the editor need peripheral vision of preview state. WCAG: red ring must pair with a text label for a11y. | P2 |
| 11 | No conversation reset | Add `Clear chat` button (TrashIcon) in PlaygroundChat header with inline confirm; increment `sessionKey` on PlaygroundChat (same pattern as remark 3, but chat-only — does NOT reset code/appId) | Educators iterating on prompts need a clean slate without losing their generated app. Distinct from "New" (which resets everything). | P2 |
| 12 | No copy button in editor | Add `Copy` (ClipboardIcon) button in CodeEditor header; `navigator.clipboard.writeText(code)`; show `"Copied!"` for 1.5s | Educators share code in emails, Slack, course sites. Absence signals "this is a walled garden." | P2 |
| 13 | No keyboard shortcut for Run | Wire Monaco's `editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, onRun)` via `onMount` callback; add hint text next to Run button | Power-user signal. Educators who know code will adopt this as a daily tool once they discover shortcuts exist. | P3 |
| 14 | Run button too far | Duplicate a compact Run button (icon only) in CodeEditor toolbar, next to Auto-run toggle | Reduces cognitive distance between "edit" action and "verify" action. Toolbar = always visible. | P2 |
| 15 | No open in new tab | In AppPreview: `new Blob([renderedCode], {type:'text/html'})` → `URL.createObjectURL(blob)` → `window.open(url,'_blank')`; ExternalLink icon button in Preview PanelFrame header | **Classroom demo feature.** Professors need to project the running app without showing the building interface. High institutional visibility. | P1 |
| 16 | No fullscreen expand | Add `previewFullscreen: boolean` state to PlaygroundLayout; when true, the Preview PanelFrame gets `fixed inset-0 z-50`; add Maximize/Minimize toggle button in Preview panel header | Enables the "reveal moment" — professor builds a quiz live in class then fullscreens it for students. Theatrical UX = institutional memory. | P2 |
| 17 | No iframe refresh cue | Add `fadeIn` CSS class keyed to `runId` via a `useEffect`; class applies `animate-[fadeIn_0.3s_ease]` → requires a Tailwind v4 arbitrary animation; OR use a brief `opacity-0 → opacity-100` toggle in state | Micro-animation confirms "Run worked." Without it, users click Run 3× in a row thinking it failed. | P2 |
| 18 | No loading state for ?app=ID | Add `isLoadingApp: boolean` to PlaygroundLayout; show a `PlaygroundSkeleton` (three rounded pulsing divs) while loading; already have `PlaygroundApp` model data shape | First-impression for URL-shared apps. Educators send app URLs to students; blank screen for 1s → confusion → distrust. | P1 |
| 19 | Overwrite without warning | Add `hasManualEdits` ref to PlaygroundLayout; set `true` in `handleEditorChange` (new wrapper for `setCode`); set `false` in `onCodeGenerated` handler; intercept `sendMessage` if `hasManualEdits === true` with an inline confirm banner in PlaygroundChat | **Data loss = the #1 trust-destroyer.** A user who loses hand-edited code in a production tool never returns. This is an academic honesty adjacent concern: the work they edited feels like their intellectual property. | P0 |
| 20 | Export modal too dev-focused | Add `exportMode: 'html' \| 'project'` toggle at top of ExportModal; `'html'` mode = client-side Blob download (no API, no zip); `'project'` mode = existing API call; default to `'html'` | Most educators want a `.html` file to upload to their course page. The current "graduation" + npm setup framing actively discourages export. Simple download removes 90% of friction. | P0 |
| 21 | Export README steps static | Style the numbered steps with bordered cards; add a Copy button for each npm command; minor cosmetic JSX change | Cosmetic. Low priority. | P3 |
| 22 | Mobile default tab | Change mobile default from `'preview'` to `'editor'`; or derive: if `!code.trim()`, default is `'editor'`; if `code.trim()`, default is `'preview'` | Empty Preview is a confusing first screen on mobile. Editor communicates "you're building something." | P2 |
| 23 | No PanelFrame labels on mobile | Add small label line above the chat section on mobile (`<p className="px-1 text-xs font-semibold text-gray-400">Chat</p>`) | Minor orientation aid. | P3 |

---

## Architectural Refinement Notes

### State Lifting (addresses remarks 3, 11, 19)
`PlaygroundChat` currently owns `messages` state locally. This makes cross-component coordination hard (e.g., knowing when to warn about overwrites, when to clear, when to pass generation stats upward). **Gold standard**: lift `messages` to `PlaygroundLayout`. This enables:
- "New" button resets messages from parent
- Overwrite warning shown as a banner above the chat input (rendered by PlaygroundChat but controlled from parent)
- Future: persist conversation history to DB alongside the app

### Cross-Panel Communication (addresses remarks 10, 17)
Currently panels are fully independent. Add a `panelState` object passed down from `PlaygroundLayout`:
```ts
interface PanelState {
  hasRuntimeError: boolean   // lights up preview panel ring
  isGenerating: boolean      // dims editor, prevents edits during generation
  generationStats: { chars: number; lines: number } | null
}
```
This replaces ad-hoc prop threading with a single coherent state snapshot.

### PanelFrame Extension (addresses remarks 10, 16)
`PanelFrame` should accept optional `alert?: boolean` (red ring) and `fullscreen?: boolean` props. Both are CSS-only changes to the frame itself — panel content does not need to change.

### PlaygroundApp.publishedAt (addresses remark 20 publish extension)
Schema already has `publishedAt DateTime?` on `PlaygroundApp`. A future `/api/playground/apps/[appId]/publish` route sets this field. A published app gets a clean shareable URL at `/apps/[appId]` (new route) that renders the HTML in a full-page iframe with no Playground chrome. **This is a zero-schema-change feature** that transforms The Sandbox from a builder tool into a lightweight app hosting platform.

### FERPA / PII Constraints
- The export HTML file contains no PII — it is the generated app code only.
- The "Open in new tab" Blob URL is client-side only, never leaves the browser, never stored.
- The editable app title field should sanitize input (`trim()` + max 120 chars).
- The `isManualEdits` warning contains no user data — it is purely a UI state flag.

---

## Implementation Roadmap

> **Execution Protocol:**
> - Work through tasks sequentially within each phase.
> - After every 2 tasks, run `npm run build` from `the-sandbox/`. If the build fails, stop and fix before proceeding.
> - After every phase, output a **Context Handoff Prompt** (see format below) before continuing.
> - Never use `@apply` in CSS. Never add a `url` field to the Prisma datasource.
> - All icons from `lucide-react` only.
> - Tailwind v4 only — use `size-4` not `w-4 h-4`, etc.

---

### Phase 1 — First Impressions (P0 items)

#### Task 1 — Editable App Title in Header

**Files:** `app/components/playground/PlaygroundLayout.tsx`

Replace the static "The Playground" `<h1>` with an editable title input that reflects and updates `appTitle`. Add a debounced auto-save on blur when `appId` is set.

- Add `titleInputRef = useRef<HTMLInputElement>(null)` to PlaygroundLayout.
- Replace `<h1 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">The Playground</h1>` with an `<input>` that:
  - Shows `appTitle` as its value
  - On change: calls `setAppTitle(value)` (already exists)
  - On blur: if `appId` exists and title changed from last saved, fires a PATCH to `/api/playground/apps/${appId}` with `{ title }`
  - Styled as `bg-transparent border-b border-transparent focus:border-[#0033A0] focus:outline-none text-xl font-bold text-gray-900`
  - `maxLength={120}`
- Add `isAutoSavingTitle` state for a brief loading indicator.
- The `<h1>` static title should become the `<input>` in place — no layout shift.

**Dirty indicator:** In the same task, add a `●` dot next to the Save button text when `isDirty`:
```tsx
{isDirty && <span className="ml-1 text-amber-400">●</span>}
```

---

#### Task 2 — Consolidate Empty State (Three surfaces → one)

**Files:** `app/components/playground/PlaygroundChat.tsx`, `app/components/playground/ExamplesGallery.tsx`

Replace the current empty state (blue box + chips + gallery stacked independently) with a single coherent `PlaygroundEmptyState` section:

1. Remove the standalone blue info box div.
2. Replace the `STARTER_PROMPTS` chips section with a more prominent layout: a `<p>` headline ("What will you build today?") followed by the 3 chips — larger, more inviting.
3. Wrap `ExamplesGallery` in a `<details>` element:
   ```tsx
   <details className="group">
     <summary className="cursor-pointer text-sm font-semibold text-[#0033A0] hover:underline">
       See 10 example projects ↓
     </summary>
     <div className="mt-3">
       <ExamplesGallery onSelect={...} />
     </div>
   </details>
   ```
4. The 3 starter chips should call `sendMessage` directly (current behavior) — no change there.
5. The result: a single, focused empty state. No blue box explaining what the Playground is (users who got here know what it is).

> **Strategist note:** The current blue box says "Ask for a working educational tool…" — this is product copy masquerading as onboarding. Users who navigated to `/playground` already understand the proposition. Replace it with a simple, confident empty state that invites action.

---

**→ After Tasks 1–2: Run `npm run build`. Fix any TypeScript errors. Then output the Phase 1A Handoff Prompt below.**

---

#### Task 3 — Overwrite Warning (Manual Edits Protection)

**Files:** `app/components/playground/PlaygroundLayout.tsx`, `app/components/playground/PlaygroundChat.tsx`

This is the most critical data-integrity fix.

**In PlaygroundLayout:**
- Add `hasManualEdits` ref: `const hasManualEditsRef = useRef(false)`
- Wrap the CodeEditor `onChange` callback: when called from user keystrokes (not from `onCodeGenerated`), set `hasManualEditsRef.current = true`
- In `onCodeGenerated` handler: set `hasManualEditsRef.current = false`
- Pass `hasManualEdits={hasManualEditsRef.current}` to PlaygroundChat as a new prop

**In PlaygroundChat:**
- Add `hasManualEdits: boolean` to props interface
- Add `pendingMessage: string | null` state
- Before calling the API in `sendMessage`: if `hasManualEdits && messages.length > 0`, set `pendingMessage = trimmed` and return early (don't send yet)
- Render a confirm banner above the textarea when `pendingMessage !== null`:
  ```
  "Sending this message will replace your manual edits with new AI-generated code."
  [Cancel]  [Continue anyway →]
  ```
- "Continue anyway" → calls the actual send with `pendingMessage`, clears `pendingMessage`
- "Cancel" → clears `pendingMessage` only

---

#### Task 4 — Simple HTML Export Option

**Files:** `app/components/playground/ExportModal.tsx`

Add a mode toggle at the top of the modal:

```tsx
type ExportMode = 'html' | 'project'
const [exportMode, setExportMode] = useState<ExportMode>('html')
```

**HTML mode** (new, default): Client-side only. No API call.
```ts
const blob = new Blob([code], { type: 'text/html' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `${sanitizedName}.html`
a.click()
URL.revokeObjectURL(url)
```

**Project mode**: Existing zip export behavior unchanged.

UI: Two pill buttons ("HTML File" / "Vite Project") that toggle `exportMode`. When `'html'` is selected, replace the "What you'll get" and "Get started in 5 steps" sections with a simple callout: "Downloads a single .html file you can open in any browser or upload to your course page."

Update the download button label: `"Download HTML"` vs `"Download ZIP"`.

> **Strategist note:** Frame the two modes as a progression: "Just starting → HTML file. Ready to grow → Vite project." Remove the "you've outgrown the Playground" headline — it's condescending to educators who just want a file. Replace with "Take your app anywhere."

---

**→ After Tasks 3–4: Run `npm run build`. Fix any errors. Then output the Phase 1B Handoff Prompt.**

---

### Phase 2 — Conversational Polish

#### Task 5 — Adaptive Placeholder + Scroll-to-Bottom Button

**Files:** `app/components/playground/PlaygroundChat.tsx`

**Adaptive placeholder:**
```tsx
placeholder={hasStarted ? 'What would you like to change?' : 'Describe the tool you want to build…'}
```

**Scroll-to-bottom button:**
- Add `showScrollBtn` boolean state, synced by the existing `handleScroll` function.
- In `handleScroll`: `setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200)`
- In the `useEffect` that scrolls on new messages: also set `setShowScrollBtn(false)` when auto-scroll fires.
- Render a floating button inside the messages container (relative wrapper needed):
  ```tsx
  {showScrollBtn && (
    <button
      type="button"
      onClick={() => {
        userScrolledUpRef.current = false
        setShowScrollBtn(false)
        messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' })
      }}
      className="absolute bottom-4 right-4 flex size-9 items-center justify-center rounded-full bg-[#0033A0] text-white shadow-lg transition-opacity hover:bg-[#002580]"
      aria-label="Scroll to latest message"
    >
      <ChevronDown className="size-4" />
    </button>
  )}
  ```
- Wrap the messages container div in `<div className="relative flex-1 overflow-hidden">` to establish positioning context; keep the inner scroll div.

---

#### Task 6 — Live Generation Stats in Chat Bubble

**Files:** `app/components/playground/PlaygroundChat.tsx`

During code streaming, instead of the static "Generating your app…" text, show live progress.

- Add `generationStats: { chars: number; lines: number } | null` state.
- In the `while` streaming loop, when `isCodeResponse` is true, after updating `fullResponse`, compute:
  ```ts
  const { html } = splitIntroAndHtml(fullResponse)
  if (html) {
    setGenerationStats({
      chars: html.length,
      lines: (html.match(/\n/g) ?? []).length,
    })
  }
  ```
- In the `code-status` variant render, replace the static string with:
  ```tsx
  <span>
    {generationStats
      ? `Writing… ${generationStats.lines} lines, ${generationStats.chars.toLocaleString()} chars`
      : 'Generating your app…'}
  </span>
  ```
- Clear `generationStats` to `null` in the `finally` block.

---

**→ After Tasks 5–6: Run `npm run build`. Fix any errors. Then output the Phase 2A Handoff Prompt.**

---

#### Task 7 — Clear Chat Button + New Session Button

**Files:** `app/components/playground/PlaygroundChat.tsx`, `app/components/playground/PlaygroundLayout.tsx`

**Clear Chat (chat-only reset):**
- Add a small `Trash2` icon button in the PlaygroundChat header bar (right side).
- Add `clearConfirm: boolean` state.
- First click → shows inline micro-confirm: "Clear chat history?" with `[Cancel]` and `[Clear]` buttons replacing the trash icon.
- `[Clear]` → `setMessages([])`, `setInput('')`, reset `injectedErrorRef`, `userScrolledUpRef`, `seededPromptRef`. Set `clearConfirm(false)`.
- This does NOT reset code or appId — it only clears the conversation.

**New Session button (full reset):**
- In PlaygroundLayout header, add a `PlusCircle` icon button labeled "New" between the title and the Save/Export buttons.
- If `isDirty || code.trim()`, show a brief confirm: "Start a new app? Unsaved changes will be lost." inline in the header area (small amber text below the buttons row).
- On confirm: reset `code`, `previewCode`, `runtimeError`, `runId`, `appId`, `appTitle`, `lastSavedCode`, `hasStarted`, `saveState`, `saveError`. Increment `chatKey` (new state: `const [chatKey, setChatKey] = useState(0)`). Pass `key={chatKey}` to PlaygroundChat — React remounts it, clearing all its local state.

---

#### Task 8 — Runtime Error Cross-Panel Signaling

**Files:** `app/components/playground/PlaygroundLayout.tsx`

PanelFrame needs an `alert` prop. When set:
- Add a `ring-2 ring-red-400` class to the outer PanelFrame container div.
- Add a small red dot badge to the PanelFrame header icon container.

```tsx
function PanelFrame({
  title, subtitle, icon, children, alert = false
}: { ..., alert?: boolean }) {
  return (
    <div className={`flex h-full min-h-0 flex-col ${alert ? 'ring-2 ring-red-400 rounded-[28px]' : ''}`}>
      <div className="mb-3 flex items-center gap-3 px-1">
        <div className={`relative flex size-10 items-center justify-center rounded-2xl bg-white text-[#0033A0] shadow-sm`}>
          {icon}
          {alert && <span className="absolute -right-1 -top-1 size-3 rounded-full bg-red-500 ring-2 ring-white" />}
        </div>
        ...
      </div>
    </div>
  )
}
```

Pass `alert={!!runtimeError}` to the Preview PanelFrame in PlaygroundLayout.

---

**→ After Tasks 7–8: Run `npm run build`. Fix any errors. Then output the Phase 2B Handoff Prompt.**

---

### Phase 3 — Editor & Preview Power Features

#### Task 9 — CodeEditor: Copy Button + Run in Toolbar

**Files:** `app/components/playground/CodeEditor.tsx`

**Copy button** in header toolbar (next to Auto-run toggle):
```tsx
const [copied, setCopied] = useState(false)

async function handleCopy() {
  await navigator.clipboard.writeText(code)
  setCopied(true)
  setTimeout(() => setCopied(false), 1500)
}
```
Button: `<Copy className="size-4" />` → shows `<Check className="size-4" />` + "Copied!" for 1.5s.

**Compact Run icon button** in header toolbar (left of Copy, right of the icon/title block):
```tsx
<button
  type="button"
  onClick={() => onRun(code)}
  disabled={!code.trim()}
  title="Run (Ctrl+Shift+Enter)"
  className="flex items-center gap-2 rounded-2xl bg-[#0033A0] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:cursor-not-allowed disabled:bg-slate-700"
>
  <Play className="size-4" />
  Run
</button>
```
Keep the bottom Run button as-is (some users expect it there).

**Keyboard shortcut hint:** Update the bottom Run button label to include `(⌘⇧↵)` hint text in a small `<span className="text-xs opacity-60">`.

---

#### Task 10 — AppPreview: Open in New Tab + Fullscreen + Refresh Cue

**Files:** `app/components/playground/AppPreview.tsx`, `app/components/playground/PlaygroundLayout.tsx`

**Open in new tab** (in AppPreview, only when code is present):
```tsx
function openInNewTab() {
  const blob = new Blob([renderedCode], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  // Revoke after a short delay to allow the window to load
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
```
Add an `ExternalLink` icon button to the top-right of the active preview (inside the `relative h-full` container).

**Fullscreen toggle:**
- Add `previewFullscreen` state to PlaygroundLayout.
- Pass `isFullscreen={previewFullscreen}` and `onToggleFullscreen={() => setPreviewFullscreen(v => !v)}` to the Preview PanelFrame.
- PanelFrame accepts `isFullscreen` and `onToggleFullscreen` optional props.
- When `isFullscreen`, the Preview PanelFrame gets `fixed inset-0 z-50 rounded-none` instead of its grid-column styles.
- Maximize2 / Minimize2 icon button in PanelFrame header (only rendered when `onToggleFullscreen` is provided).
- Keyboard: `Escape` closes fullscreen (`useEffect` + `keydown` listener in PlaygroundLayout).

**Refresh cue (iframe fade):**
- Add `isFading` state to AppPreview, `false` by default.
- When `runId` changes, set `isFading(true)` then `false` after 300ms via `setTimeout`.
- Apply `className={`h-full w-full border-0 bg-white transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}` to the iframe.

---

**→ After Tasks 9–10: Run `npm run build`. Fix any errors. Then output the Phase 3 Handoff Prompt.**

---

### Phase 4 — Loading & Mobile

#### Task 11 — Loading Skeleton for ?app=ID

**Files:** `app/components/playground/PlaygroundLayout.tsx`

Add `isLoadingApp: boolean` state, default `false`.

In the `loadAppId` useEffect:
- Set `setIsLoadingApp(true)` before the fetch.
- Set `setIsLoadingApp(false)` in `.then()` and `.catch()`.

Create a `PlaygroundSkeleton` inline component in PlaygroundLayout:
```tsx
function PlaygroundSkeleton() {
  return (
    <div className="hidden min-h-0 flex-1 gap-4 lg:grid lg:grid-cols-[minmax(320px,30%)_minmax(360px,35%)_minmax(360px,35%)]">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-[28px] bg-gray-200" />
      ))}
    </div>
  )
}
```

In the main render, replace the grid + mobile layout with:
```tsx
{isLoadingApp ? <PlaygroundSkeleton /> : (/* existing grid + mobile layout */)}
```

---

#### Task 12 — Mobile UX Fixes

**Files:** `app/components/playground/PlaygroundLayout.tsx`

**Default mobile tab:** Change the initial `useState<MobileTab>` to derive from code:
```tsx
const [mobileTab, setMobileTab] = useState<MobileTab>(() =>
  initialCode ? 'preview' : 'editor'
)
```
Where `initialCode` is the `code` state at mount (empty on new session, populated on `?app=ID` load). Since state initializers run once at mount, use a ref or a prop to pass this. Simplest: check `loadAppId !== null` — if loading an existing app, default to `'preview'`; otherwise default to `'editor'`.

```tsx
const [mobileTab, setMobileTab] = useState<MobileTab>(loadAppId ? 'preview' : 'editor')
```

**Mobile label context:** Above the PlaygroundChat on mobile, add:
```tsx
<p className="px-1 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
  AI Chat
</p>
```

---

**→ After Tasks 11–12: Run `npm run build`. Fix any errors. Then output the Phase 4 Handoff Prompt.**

---

### Phase 5 — Navigation & Delegation Polish

#### Task 13 — "Back" Button + "Share Access" Rename

**Files:** `app/components/playground/PlaygroundLayout.tsx`, `app/playground/page.tsx`, `app/components/playground/DelegatesModal.tsx`

**Back button:** In `PlaygroundPage`, read the `?from=` query param:
```tsx
const from = searchParams.get('from') ?? '/studio'
```
Pass `returnTo={from}` to `PlaygroundLayout`. In PlaygroundLayout, use `returnTo` in the Back link:
```tsx
<Link href={returnTo} ...>Back</Link>
```

Anywhere in the codebase that links to `/playground`, append `?from=/currentPath` if helpful.

**Share Access rename:**
- In PlaygroundLayout header: change button label from "Delegates" to "Share Access". Keep `Users` icon.
- In DelegatesModal: change `<h2>` from "Delegates" to "Share Access". Update subtitle: "Give trusted teammates permission to read and write to this app's shared storage."
- Change the `placeholder` on the email input from `"delegate@uky.edu"` to `"Teammate's email"`.

---

**→ After Task 13: Run `npm run build`. Fix any errors. Then output the Phase 5 Handoff Prompt.**

---

## Context Handoff Prompt Template

After completing each phase, output the following prompt verbatim (filled in) so a new Claude instance can continue from exactly where work stopped:

```
---HANDOFF PROMPT---
You are continuing implementation of the Playground UX Improvement Plan for The Sandbox (CATS-AI / University of Kentucky).

Working directory: c:\AA Code\Educator marketplace\the-sandbox\

COMPLETED so far (these tasks are DONE — do not redo them):
[List completed task numbers and one-line descriptions]

CURRENT STATE of key files:
- PlaygroundLayout.tsx: [describe key changes made]
- PlaygroundChat.tsx: [describe key changes made]
- CodeEditor.tsx: [describe key changes made]
- AppPreview.tsx: [describe key changes made]
- ExportModal.tsx: [describe key changes made]
- DelegatesModal.tsx: [describe key changes made]

LAST BUILD STATUS: [Pass / Fail — if fail, describe the error]

NEXT TASK TO EXECUTE: Task [N] — [Task name]

CRITICAL CONSTRAINTS (never violate):
- Tailwind v4 only. No @apply. Use size-4 not w-4 h-4.
- Icons from lucide-react only.
- Prisma v7: never add url to datasource block. Use ../generated/prisma imports.
- Auth: all API routes must call requireRequestUser at the top.
- No new npm packages without explicit approval.
- After every 2 tasks: run npm run build and fix any errors before continuing.
- Stop and show the user results after every 2 tasks.

Reference document: c:\AA Code\Educator marketplace\Blueprints\playground-ux-improvement-plan.md
---END HANDOFF PROMPT---
```

---

## Build Verification Checkpoints

| After | Command | Expected |
|-------|---------|----------|
| Tasks 1–2 | `npm run build` | 0 TypeScript errors, 0 ESLint critical errors |
| Tasks 3–4 | `npm run build` | 0 errors |
| Tasks 5–6 | `npm run build` | 0 errors |
| Tasks 7–8 | `npm run build` | 0 errors |
| Tasks 9–10 | `npm run build` | 0 errors |
| Tasks 11–12 | `npm run build` | 0 errors |
| Task 13 | `npm run build` | 0 errors — final green build |

---

## Brittle / Redundant Code Identified

| Location | Issue | Recommended Fix |
|----------|-------|-----------------|
| `PlaygroundChat.tsx:183` | `messages` in `sendMessage` useCallback deps causes recreation on every message | Lift messages to parent (PlaygroundLayout) and pass as prop — removes this dep |
| `PlaygroundLayout.tsx:161` | Fixed `h-screen` on outer div; if a global announcement banner is added, it will be clipped | Move to `flex-col h-[calc(100vh-var(--announcement-height))]` when banner system is wired in |
| `PlaygroundChat.tsx:34` | `STARTER_PROMPTS` is a module-level constant but logically belongs with the empty state component — when refactoring, collocate it | Move into `PlaygroundEmptyState` component |
| `PlaygroundLayout.tsx` | `inferAppTitle` runs on every prompt submitted, producing a title from the first message. If the user types their own title in Task 1's input, `inferAppTitle` should only run if the title is still "Untitled App" | Already guarded: `if (appTitle === 'Untitled App')` — this is correct; no change needed |
| `AppPreview.tsx:165` | `relative h-full` on the preview container — after Task 10's fullscreen feature, the container class needs to be conditional | Addressed in Task 10 implementation above |
| `ExportModal.tsx:93-94` | Headline "You've outgrown the Playground" is hardcoded — will break the simpler HTML export mode visually | Addressed in Task 4 |

---

## Execution Order Summary

```
Phase 1: P0 First Impressions
  ├─ Task 1: Editable title + dirty indicator
  ├─ Task 2: Empty state consolidation
  ├─ [BUILD CHECK]
  ├─ Task 3: Overwrite warning
  ├─ Task 4: HTML export option
  └─ [BUILD CHECK + PHASE 1 HANDOFF]

Phase 2: Conversational Polish
  ├─ Task 5: Adaptive placeholder + scroll-to-bottom
  ├─ Task 6: Live generation stats
  ├─ [BUILD CHECK]
  ├─ Task 7: Clear chat + New session button
  ├─ Task 8: Cross-panel error ring
  └─ [BUILD CHECK + PHASE 2 HANDOFF]

Phase 3: Editor & Preview Power
  ├─ Task 9: Copy button + Run in toolbar
  ├─ Task 10: Open in new tab + fullscreen + fade
  └─ [BUILD CHECK + PHASE 3 HANDOFF]

Phase 4: Loading & Mobile
  ├─ Task 11: Loading skeleton
  ├─ Task 12: Mobile defaults
  └─ [BUILD CHECK + PHASE 4 HANDOFF]

Phase 5: Navigation & Polish
  ├─ Task 13: Back button + Share Access rename
  └─ [BUILD CHECK + PHASE 5 HANDOFF]
```

**Estimated scope:** 13 tasks across 5 phases. All changes are contained to:
- `app/components/playground/` (6 files)
- `app/playground/page.tsx` (1 file)

No schema migrations required. No new API routes required (except the future publish endpoint, which is Phase 6+). No new npm packages required.
