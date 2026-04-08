# Blueprint: The Playground — AI-Powered Vibe Coding Environment
### Feature: New `/playground` route — describe a tool, Claude builds it, runs it in-browser
### New files: `app/playground/page.tsx`, `app/components/playground/*`, `app/api/playground/chat/route.ts`
### New dependency: `@monaco-editor/react`
### Status: Ready for implementation
### Companion blueprint: `platform-storage.md` (Stage 2 — persistence layer)

---

## 1. Vision & Philosophy

The Playground has no ceiling. A user describes what they want, Claude builds it, and it runs instantly in the browser. When they outgrow the browser — they need a real database, multi-user state, npm packages — the platform doesn't say *"you can't do that."* It says *"you've outgrown us — here's your gear"* and packages their work into a real project they can keep building in VS Code.

**The core loop:**
```
Describe it → Claude builds it → Runs instantly → Iterate conversationally
                                                          ↓
                                              Hit the ceiling?
                                          Export as Vite project + README
```

**Who can use it:** Anyone — students, educators, admins. No role gate.

---

## 2. New Dependency

```bash
npm install @monaco-editor/react
```

No other new dependencies. React, Babel, and Tailwind load from CDN inside the iframe.

---

## 3. New Files to Create

```
the-sandbox/
├── app/
│   ├── playground/
│   │   └── page.tsx                            ← Route page
│   ├── components/
│   │   └── playground/
│   │       ├── PlaygroundLayout.tsx             ← 3-pane layout: Chat | Editor | Preview
│   │       ├── PlaygroundChat.tsx               ← Chat UI for code generation
│   │       ├── CodeEditor.tsx                  ← Monaco editor wrapper
│   │       ├── AppPreview.tsx                  ← Sandboxed iframe + error capture
│   │       ├── ExamplesGallery.tsx             ← Inspiration cards (Stage 1)
│   │       └── ExportModal.tsx                 ← Graduation flow (Stage 2)
│   └── api/
│       └── playground/
│           ├── chat/
│           │   └── route.ts                    ← Streaming API, code-gen system prompt
│           └── export/
│               └── route.ts                    ← Zip generation (Stage 2)
```

---

## 4. The HTML Template (Claude always generates this format)

Claude must ALWAYS output a complete, self-contained HTML file matching this structure exactly. This template is embedded in the system prompt.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script>
    window.onerror = function(msg, src, line, col, err) {
      window.parent.postMessage({
        type: 'SANDBOX_ERROR',
        message: msg,
        line: line,
        stack: err ? err.stack : null
      }, '*');
      return true;
    };
    window.addEventListener('unhandledrejection', function(e) {
      window.parent.postMessage({
        type: 'SANDBOX_ERROR',
        message: e.reason ? String(e.reason) : 'Unhandled Promise rejection'
      }, '*');
    });
  </script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white min-h-screen">
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback, useMemo } = React;

    function App() {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-800">My App</h1>
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>
```

---

## 5. API Route: `/api/playground/chat/route.ts`

**Method:** POST
**Auth:** Reads `x-demo-user-email` header. Returns 401 if missing.
**Model:** `claude-sonnet-4-6` — NOT Haiku. Code generation quality matters.

**Request body:**
```typescript
{
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  currentCode?: string   // current HTML in editor, injected when iterating
}
```

**Streaming:** Same Anthropic SDK streaming pattern as existing `/api/chat/route.ts`.

When `currentCode` is present, prepend to the last user message:
```
The user's current app code is:
<current_code>
{currentCode}
</current_code>

User request:
```

### System Prompt

```
You are a code generator for The Sandbox, an AI-powered educational tool platform at the University of Kentucky. Your job is to generate complete, runnable React web apps as single HTML files.

## Output Rules — CRITICAL
- Output ONLY the raw HTML file. No markdown. No code fences. No explanation. No preamble. No closing remarks. Just the file, starting with <!DOCTYPE html>.
- Every response must be a COMPLETE, RUNNABLE HTML file — never output partial code, diffs, or snippets.
- If the user asks a clarifying question or you need to explain something, answer briefly in plain text (no HTML), then ask what they'd like to build or change.

## Ceiling Detection — CRITICAL
If the user asks for something that requires a real backend (persistent data shared across users, npm packages, server-side logic, file uploads, external APIs with CORS restrictions), do NOT attempt to fake it. Instead respond in plain text:

"This needs more than the browser can handle on its own — specifically: [brief reason].

You have two options:
1. I can build a simpler version that works within the browser right now
2. I can package what you've built and set you up to keep going in VS Code with a real backend

Which would you prefer?"

Never silently fail or produce broken code for out-of-scope requests.

## Technical Rules
- Use this exact CDN stack: React 18 (unpkg), Babel Standalone (unpkg), Tailwind CSS (cdn.tailwindcss.com)
- Always include the window.onerror + unhandledrejection error capture script at the TOP of <head> before all other scripts
- Always destructure React hooks at the top of the script block: const { useState, useEffect, useRef, useCallback, useMemo } = React;
- Root component must be named App, mounted with ReactDOM.createRoot(document.getElementById('root')).render(<App />)
- No ES module imports. No npm packages. No external API calls unless user explicitly requests them.
- Use Tailwind classes for all styling. Avoid inline styles and <style> blocks unless Tailwind cannot handle the use case.

## Design Rules
- Use UK Blue (#0033A0) as the primary brand color
- Default to clean, modern UI with cards, clear typography, generous spacing
- Make all interactive elements obvious — buttons should look like buttons
- For educational tools: favor interactive elements (quizzes, flashcards, timers, progress)
- Apps should be self-contained and work without user accounts or external data

## On Iteration
- When the user asks for changes, output the COMPLETE updated file
- Preserve all existing functionality when making targeted changes
- When given a runtime error, diagnose it and fix it in the complete updated file — do not ask clarifying questions, just fix it
```

---

## 6. Examples Gallery: `app/components/playground/ExamplesGallery.tsx`

Shown on the Playground page before the user has started building. Dismissed once they send their first message or click an example.

**Purpose:** Spark ideas. These are NOT runnable from the gallery — clicking pre-fills the chat prompt.

**Component props:**
```typescript
interface ExamplesGalleryProps {
  onSelect: (prompt: string) => void  // pre-fills the chat input
}
```

**Layout:** 2-row horizontal scroll or 3-column grid of cards. Each card:
- Title
- One-line description
- Category tag (pill)
- "Build this →" button — calls `onSelect(prompt)`

**The examples (hardcoded):**

| Title | Description | Category | Pre-fill Prompt |
|---|---|---|---|
| Flashcard Quiz | Flip cards with score tracking | Learning | "Build a flashcard quiz app where I can add terms and definitions, flip cards to test myself, and track my score" |
| Multiple Choice Quiz | Timed quiz with results screen | Learning | "Build a 10-question multiple choice quiz with a countdown timer and a results screen showing correct/incorrect answers" |
| Tournament Bracket | Single-elimination for 8–16 teams | Games | "Build a tournament bracket app for 8 teams. I should be able to enter team names and click to advance winners through each round" |
| Word Scramble | Jumbled word game with hints | Games | "Build a word scramble game that jumbles a word, lets me guess the original, gives hints, and tracks my score across rounds" |
| Budget Calculator | Monthly budget with category breakdown | Tools | "Build a monthly budget calculator where I can enter income and expenses by category and see a visual breakdown" |
| Interactive Timeline | Clickable events with detail panels | Learning | "Build an interactive historical timeline where I can add events with dates and descriptions, and click each event to expand details" |
| Countdown Timer | Pomodoro-style study timer | Tools | "Build a study timer with 25-minute work sessions and 5-minute breaks, with sound alerts and session count tracking" |
| Kanban Board | Drag-free task board with columns | Productivity | "Build a kanban board with To Do, In Progress, and Done columns. I should be able to add tasks and move them between columns" |
| Poll / Voting | Live results with bar chart | Learning | "Build a polling app where I can add a question and up to 5 options. Users click to vote and see live results as a bar chart" |
| Reflex Game | Click-the-target speed game | Games | "Build a reflex game where a target appears at random positions and the user has to click it as fast as possible. Track reaction times and show a high score" |

**Note on examples tagged with shared state** (Poll, Tournament with saved results): These work in Stage 1 as single-session demos. In Stage 2 (Platform Storage), they gain real persistence. Don't block Stage 1 on this.

---

## 7. Component Specs

### `app/playground/page.tsx`
- `'use client'`
- Uses `useAuth()` from `app/lib/auth-context`
- Renders `<PlaygroundLayout />` full-screen (no standard page chrome)
- Page `<title>`: "Playground | The Sandbox"
- Pass `initialPrompt` from `?prompt=` query param to `PlaygroundLayout` (so Build Hub can deep-link with a starter prompt)

### `app/components/playground/PlaygroundLayout.tsx`
- `'use client'`
- Three-column CSS grid layout: Chat (30%) | Editor (35%) | Preview (35%)
- Fixed widths — no resizing in Stage 1
- **State owned here:**
  - `code: string` — the current HTML (starts as empty string)
  - `error: string | null` — runtime error from iframe
  - `hasStarted: boolean` — true once first message sent or example selected (hides gallery)
- **Top bar:** "The Playground" title (UK blue) + "Export" button (grayed, tooltip "Coming in Stage 2") + back link to `/build`
- Passes `onCodeGenerated`, `currentCode`, `onError` props to children
- Mobile: stack vertically — Chat on top, tabbed Editor/Preview below

### `app/components/playground/PlaygroundChat.tsx`
- `'use client'`
- **Props:** `onCodeGenerated: (code: string) => void`, `currentCode: string`, `error: string | null`, `initialPrompt?: string`
- Messages state: `Array<{ role: 'user' | 'assistant'; content: string; isCode?: boolean }>`
- **Stream handling:**
  - If response starts with `<!DOCTYPE` or `<html` → it's code output
  - Code responses show as: `"✓ App generated — see the preview"` in the chat (not the raw HTML)
  - Non-code responses (Claude asking a question, explaining the ceiling) render via ReactMarkdown
  - On stream end: if code, call `onCodeGenerated(fullResponse)` and auto-run
- **Error injection:** When `error` prop is non-null, show a dismissible banner in the chat:
  ```
  ⚠️ Runtime error: [message]
  [Fix this →] button
  ```
  Clicking "Fix this" appends `"Fix this runtime error:\n\n{error}"` to messages and auto-submits. Always includes `currentCode`.
- **Empty state:** Show `<ExamplesGallery onSelect={(prompt) => { setInput(prompt) }} />` when `messages.length === 0 && !hasStarted`
- **Starter prompts** (shown below input when messages is empty, above gallery):
  - "Build me a flashcard quiz for my course"
  - "Make a multiple choice quiz with a timer"
  - "Create a class poll with live results"
- Input: textarea, Cmd/Ctrl+Enter to send. Same UX pattern as `ChatInterface.tsx`.
- Uses `useAuth()` for `x-demo-user-email` header

### `app/components/playground/CodeEditor.tsx`
- `'use client'`
- **Props:** `code: string`, `onChange: (code: string) => void`, `onRun: () => void`, `autoRun: boolean`, `onAutoRunChange: (v: boolean) => void`
- Wraps `@monaco-editor/react` `<Editor>`
- Language: `"html"`, Theme: `"vs-dark"`
- Options: `{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', scrollBeyondLastLine: false, lineNumbers: 'on' }`
- Below editor: "▶ Run" button (UK blue) + "Auto-run" toggle checkbox
- When `autoRun` is true, `onRun` fires automatically when `code` prop changes
- Show Monaco loading skeleton while the package lazy-loads

### `app/components/playground/AppPreview.tsx`
- `'use client'`
- **Props:** `code: string`, `onError: (err: string | null) => void`
- Renders `<iframe sandbox="allow-scripts">` with `srcDoc={code}`
- **Empty state:** When `code === ''`, show centered placeholder with `<Code2>` lucide icon and "Your app will appear here"
- **Error listener:**
  ```typescript
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'SANDBOX_ERROR') {
        onError(e.data.message)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onError])
  ```
- When `code` changes: call `onError(null)` to clear stale errors before new code renders
- Small red error banner at bottom of pane (not full-screen overlay) when an error exists
- iframe: `width: 100%`, `height: 100%`, `border: none`
- **CRITICAL:** `sandbox` attribute must be `"allow-scripts"` ONLY. Never add `allow-same-origin`.

---

## 8. Data Flow

```
[PlaygroundLayout] owns: code, error, hasStarted
        │
        ├─── [PlaygroundChat]
        │         receives: currentCode, error prop
        │         on code stream complete → onCodeGenerated(html)
        │         on "Fix this" click → auto-submits error to Claude
        │         on example select → setInput(prompt), setHasStarted(true)
        │
        ├─── [CodeEditor]
        │         displays: code
        │         user edits → onChange(newCode)
        │         "Run" / auto-run → onRun() → parent sets code → preview refreshes
        │
        └─── [AppPreview]
                  displays: code via srcDoc
                  iframe postMessage error → onError(msg)
                  red banner at bottom on error
```

---

## 9. Navigation Integration

**Build Hub (`/build`):**
Add a prominent hero CTA card: **"Open the Playground →"** — subtitle: "Describe a tool, Claude builds it, runs instantly in your browser." Links to `/playground`.

**Header user dropdown:**
Add "Playground" link to `/playground` alongside "Open Builder".

**From the builder (`/builder`):**
If a user has a working chatbot tool, add a small link: "Want to build a UI? Try the Playground →"

---

## 10. Stage 2: Graduation / Export Flow

> Build this after Stage 1 is stable. Do not include in Stage 1.

### Trigger
Two ways to trigger graduation:
1. **Claude detects it** — Claude's ceiling detection responds in plain text (see system prompt), offering to package the app. User replies "yes, package it up."
2. **User-initiated** — "Export / Take this further" button in the top bar (enabled once `code !== ''`).

### What Gets Exported
The current HTML is converted into a proper **Vite + React project**:

```
[app-name]/
├── index.html                  ← minimal Vite entry, no CDN scripts
├── src/
│   ├── main.jsx               ← ReactDOM.createRoot, extracted from HTML
│   └── App.jsx                ← the component tree, CDN shims removed, imports added
├── package.json               ← react, react-dom, vite, @vitejs/plugin-react
├── vite.config.js
└── README.md                  ← step-by-step setup guide (see below)
```

**Conversion logic (programmatic, no Claude needed):**
1. Strip CDN `<script>` tags (Babel, React, ReactDOM, Tailwind)
2. Extract content of `<script type="text/babel">` → becomes `App.jsx` body
3. Replace `const { useState, ... } = React;` with `import { useState, ... } from 'react'`
4. Add `import React from 'react'` and `import ReactDOM from 'react-dom/client'` to `main.jsx`
5. Add Tailwind via `@tailwindcss/vite` plugin (or keep CDN link in index.html for simplicity)

**README content:**
```markdown
# Your App — Built in The Sandbox

## Get Started in 5 Steps

1. **Install Node.js** — https://nodejs.org (download the LTS version)
2. **Install VS Code** — https://code.visualstudio.com
3. **Unzip this folder** anywhere on your computer
4. **Open VS Code** → File → Open Folder → select the unzipped folder
5. **Open the Terminal** in VS Code (Ctrl+` on Windows, Cmd+` on Mac)
   Run: `npm install` then `npm run dev`
   Your app opens at http://localhost:5173 🎉

## Keep Building
- Add a database (free): https://supabase.com
- Deploy your app free: https://vercel.com
- Ask Claude for help: paste your App.jsx and describe what to add next
```

### API Route: `POST /api/playground/export`
- Accepts: `{ code: string, appName: string }`
- Converts HTML → project file tree (see above)
- Zips the file tree using the `jszip` package (add as dependency in Stage 2)
- Returns: zip file as `application/zip` download

### `ExportModal.tsx`
- Shown after user confirms export (from chat or button)
- Input: app name (used as folder name, default: "my-sandbox-app")
- "Download ZIP" button → calls export API → triggers file download
- Below button: the README contents rendered as readable steps (not raw markdown)
- Friendly tone: "You've outgrown the Playground — that's a good sign."

---

## 11. Stage 3: Platform Storage Integration

> Defined in full in `platform-storage.md`. Summary for Playground context:

When Platform Storage is built:
- `AppPreview` receives a `sandboxToken` prop
- Before setting `srcDoc`, inject the SANDBOX object script block into the HTML:
  ```html
  <script>/* SANDBOX object with token baked in */</script>
  ```
- The system prompt gains a new section describing the SANDBOX API
- Examples tagged "requires storage" (Poll, shared Leaderboard) now work fully

---

## 12. What NOT to Build in Stage 1

- Export / graduation flow (Stage 2)
- Platform Storage / SANDBOX object injection (Stage 3)
- Multi-file support
- npm package installation
- Persistent saving of playground sessions
- Publish to Marketplace (button exists, disabled, tooltip "Coming soon")
- Resizable panels
- Mobile-optimized layout
- User-uploaded assets

---

## 13. Implementation Order

Build in this sequence — each step is independently testable:

1. `AppPreview.tsx` — hardcode an HTML string, verify sandbox + postMessage error capture works
2. `/api/playground/chat/route.ts` — verify Claude outputs clean HTML, test ceiling detection response
3. `CodeEditor.tsx` — Monaco showing HTML, Run button, auto-run toggle
4. `ExamplesGallery.tsx` — static cards, `onSelect` fires with prompt string
5. `PlaygroundChat.tsx` — wire chat → stream → detect HTML → call `onCodeGenerated` → error loop
6. `PlaygroundLayout.tsx` — assemble three panels, wire state
7. `app/playground/page.tsx` — route page, pass `?prompt=` query param
8. Build Hub integration — CTA card on `/build` page, header dropdown link
