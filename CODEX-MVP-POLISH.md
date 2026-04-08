# The Sandbox — MVP Polish Spec for Codex

**Status:** Pre-demo hardening
**Audience:** Codex / AI coding agent
**Persona targeted:** Skeptical faculty member encountering The Sandbox for the first time
**Ground truth:** All file references verified against the actual repo at `the-sandbox/`

---

## Assessment of Source Advice

The following five recommendations were reviewed against the real codebase. Each is rated and
refined where the original advice contained inaccuracies or missed existing functionality.

---

## Change 1 — "Mad Libs" Quick-Start Templates in the Build Hub

### Original Advice Rating: ✅ Valid, needs refinement

**What the advisor missed:**
`BuildHubHero.tsx` already renders template category pills and an example prompts gallery. The
component is not a blank canvas. The missing piece is the **bracket-fill interaction** — templates
that let a faculty member fill in `[TOPIC]` or `[PERSONA]` inline before submitting, rather than
dumping a raw template string into the chat.

**Do not create a new `BuilderQuickStart.tsx`.** Extend the existing component.

### Implementation

**File:** `app/components/BuildHubHero.tsx`

Add a "Fill-in-the-blank" quick-start section between the hero textarea and the existing template
gallery. Each card shows a sentence with editable spans (controlled inputs) and a single
"Build this →" button that composes the final prompt and routes to `/builder?prompt=<encoded>`.

```tsx
// Suggested data shape — add inside BuildHubHero.tsx
const MAD_LIBS_TEMPLATES = [
  {
    id: 'socratic',
    label: 'Socratic Tutor',
    parts: [
      { type: 'text', value: 'Create a Socratic tutor for ' },
      { type: 'input', placeholder: 'e.g. Cell Biology', key: 'topic' },
      { type: 'text', value: ' that guides students to understand ' },
      { type: 'input', placeholder: 'e.g. mitosis vs meiosis', key: 'concept' },
      { type: 'text', value: ' without giving away the answer.' },
    ],
  },
  {
    id: 'debate',
    label: 'Debate Partner',
    parts: [
      { type: 'text', value: 'Create a debate partner that argues against ' },
      { type: 'input', placeholder: 'e.g. mandatory internships', key: 'topic' },
      { type: 'text', value: ' from the perspective of ' },
      { type: 'input', placeholder: 'e.g. a skeptical employer', key: 'persona' },
      { type: 'text', value: '.' },
    ],
  },
  {
    id: 'quiz',
    label: 'Quiz Generator',
    parts: [
      { type: 'text', value: 'Build a quiz bot that generates ' },
      { type: 'input', placeholder: 'e.g. 5', key: 'count' },
      { type: 'text', value: ' multiple-choice questions on ' },
      { type: 'input', placeholder: 'e.g. the French Revolution', key: 'topic' },
      { type: 'text', value: ' and explains wrong answers.' },
    ],
  },
];
```

Each `input` part renders as an inline `<input>` with `min-width` and auto-sizing. The "Build this"
button is disabled until all `input` parts have non-empty values.

**Routing:** same as existing — `router.push('/builder?prompt=' + encodeURIComponent(composed))`

**Placement:** Insert this section directly above the existing "Not sure where to start?" block.
Use a heading: `"Start from a template"`.

---

## Change 2 — Proactive Sandy Greeting on Empty Courses

### Original Advice Rating: ✅ Valid, partially built, needs the trigger

**What the advisor missed:**
`ConciergePanel.tsx` already injects course context (including materials) into Sandy's system
prompt and already renders page-specific starter suggestions. The **missing behaviour** is:

1. Sandy does not auto-open or show a badge on `/courses` when the selected course has zero
   materials.
2. The API at `app/api/concierge/route.ts` does not alter the system prompt based on
   `materials.length`.

### Implementation — Part A: API system prompt branch

**File:** `app/api/concierge/route.ts`

Locate the section that builds `systemPrompt` from the request body. Add a conditional block:

```ts
// After existing course context injection
if (pageContext?.courseId && pageContext?.materialsCount === 0) {
  systemPrompt += `\n\nCRITICAL CONTEXT: The course "${pageContext.courseName}" currently has
no uploaded materials. Make this your opening topic. Explain to the educator that uploading a
syllabus or lecture notes will allow you to: (1) answer student questions automatically, (2)
generate quiz questions from the schedule, (3) identify curriculum gaps. Keep this message
brief — two sentences max — and end with a specific call to action.`;
}
```

The client already sends `pageContext` in the POST body. Confirm `materialsCount` is included, or
add it in the client.

### Implementation — Part B: Client auto-open trigger

**File:** `app/components/ConciergePanel.tsx`

The panel already tracks `isOpen` state. Add a `useEffect` that fires after the courses page
mounts and the selected course loads:

```tsx
// Props addition — ConciergePanel needs to receive this
interface ConciergePanelProps {
  // ... existing props
  autoOpenWithMessage?: string; // new
}

// Inside component
useEffect(() => {
  if (autoOpenWithMessage && !isOpen) {
    setIsOpen(true);
    // Trigger a synthetic first message
    setTimeout(() => sendMessage(autoOpenWithMessage), 400);
  }
}, [autoOpenWithMessage]);
```

**File:** `app/courses/page.tsx`

When the selected course resolves and `materials.length === 0` and `user.role === 'EDUCATOR'`,
pass `autoOpenWithMessage="Tell me how to get started with this course."` to `<ConciergePanel>`.

---

## Change 3 — Role-Aware Terminology in the Header

### Original Advice Rating: ✅ Valid, straightforward

**What the advisor missed:**
`Header.tsx` already renders both XP (with Zap icon) and Sand balance. The component already
imports `useAuth`. The change is additive — no structural rework needed.

### Implementation

**File:** `app/components/Header.tsx`

Find the XP and Sand render blocks and apply conditional labels. Minimal diff:

```tsx
// Derive labels once, near top of component body
const xpLabel    = user?.role === 'EDUCATOR' ? 'Impact' : 'XP';
const sandLabel  = user?.role === 'EDUCATOR' ? 'Credits' : 'Sand';

// Replace raw "XP" / "Sand" strings in the JSX with {xpLabel} / {sandLabel}
```

Keep the Zap and Coins icons — they read as neutral. Only the text label changes.

**Optional (lower priority):** On the educator's home dashboard (`app/page.tsx`), audit any
rendered Quest or "Daily Quests" strings and gate them behind `user.role !== 'EDUCATOR'`.
Educators should see "Suggested Actions" or "Recommended Next Steps" rather than Quest framing.

---

## Change 4 — "Create AI Teaching Assistant" One-Click Button

### Original Advice Rating: ✅ High-value, requires new API route

**What the advisor missed:**
There is no `/courses/[id]/page.tsx` — course detail is managed as client-side state within
`app/courses/page.tsx`. The button must be placed inside the existing course detail panel, not a
separate route file.

There is no `/api/courses/[courseId]/generate-bot` route. This is net-new work.

### Implementation — Part A: New API route

**New file:** `app/api/courses/[courseId]/generate-bot/route.ts`

```ts
// POST /api/courses/:courseId/generate-bot
// 1. Fetch course + all CourseMaterial records
// 2. Concatenate material content (text field) into a knowledge block
// 3. Create a new Tool record:
//    - name: `${course.name} Teaching Assistant`
//    - type: 'CHATBOT'
//    - status: 'DRAFT'
//    - systemPrompt: pre-built template with knowledge block injected
//    - creatorId: authenticated educator
// 4. Return { toolId } in JSON
// 5. Client redirects to /tools/:toolId

export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  // auth check: user must be EDUCATOR or ADMIN
  // fetch course with materials
  // build systemPrompt (see template below)
  // prisma.tool.create(...)
  // return NextResponse.json({ toolId: tool.id })
}
```

**System prompt template to inject:**

```
You are an AI Teaching Assistant for the course "{{COURSE_NAME}}".
Your role is to help students understand the material, answer questions, and guide their thinking.
You do not give direct answers to graded assessment questions.

COURSE KNOWLEDGE:
{{MATERIALS_CONTENT}}

Always cite which part of the course material your answer comes from.
```

### Implementation — Part B: Button placement

**File:** `app/courses/page.tsx`

Within the educator's course detail view (visible when `user.role === 'EDUCATOR'`), add the button
to the Materials tab header or the course settings section:

```tsx
// app/components/CourseMagicButton.tsx  (create this single-purpose component)
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

export function CourseMagicButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/generate-bot`, {
        method: 'POST',
        headers: { 'x-demo-user-email': /* from auth context */ '' },
      });
      const { toolId } = await res.json();
      router.push(`/tools/${toolId}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="bg-emerald-600 text-white px-4 py-2 rounded-md shadow-sm
                 hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-60"
    >
      <Sparkles size={16} />
      {loading ? 'Creating…' : 'Create AI Teaching Assistant'}
    </button>
  );
}
```

**Guard:** Only render `<CourseMagicButton>` when `materials.length > 0`. When there are no
materials, show it in a disabled/greyed state with tooltip: `"Upload course materials first"`.

---

## Change 5 — FERPA Reassurance Indicator

### Original Advice Rating: ✅ Valid, very low effort, high trust signal

**What the advisor missed:**
The advisor suggested modifying `ChatInterface.tsx` and the upload API. The UI-level indicator
is sufficient for an MVP demo; the API does not need changes.

### Implementation

**File:** `app/components/ChatInterface.tsx`

Add a single-line footer inside the chat container, below the input bar:

```tsx
<div className="flex items-center gap-1.5 justify-center py-1.5 text-xs text-slate-400">
  <svg /* lock icon inline or lucide Lock size={11} */ />
  UKY Protected Environment · Data is not used to train external models
</div>
```

Use `lucide-react`'s `<Lock size={11} />` — it is already a project dependency.

**File:** `app/courses/page.tsx` (upload area)

Add the same line directly below the file upload dropzone in the Materials tab.

**File:** `app/components/BuilderChatPanel.tsx`

Add the same line in the builder's chat footer.

One shared component is cleaner:

```tsx
// app/components/PrivacyFooter.tsx
import { Lock } from 'lucide-react';
export function PrivacyFooter() {
  return (
    <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400 py-1">
      <Lock size={11} />
      UKY Protected Environment · Data is not used to train external models
    </p>
  );
}
```

---

## Priority Order for Implementation

| # | Change | Effort | Demo Impact |
|---|--------|--------|-------------|
| 1 | **Role-aware Header labels** (Change 3) | 15 min | High — removes "toy" perception immediately |
| 2 | **FERPA footer** (Change 5) | 20 min | High — trust signal, zero risk |
| 3 | **Mad Libs templates** (Change 1) | 2–3 hrs | High — solves blank canvas, faculty's first touch |
| 4 | **Proactive Sandy trigger** (Change 2) | 2–3 hrs | Medium — impressive if demoed with an empty course |
| 5 | **Generate-bot API + button** (Change 4) | 4–5 hrs | Very High — the "killer demo moment" |

---

## Out of Scope / Already Exists

- Template suggestions in `BuildHubHero.tsx` — already implemented, do not duplicate
- Course context injection in `ConciergePanel.tsx` — already implemented
- Sandy page-specific starter questions — already implemented
- Auth header `x-demo-user-email` — all new fetch calls must include this from `useAuth()`

---

## Auth Pattern Reminder

Every `fetch()` to an API route must include:

```ts
headers: {
  'Content-Type': 'application/json',
  'x-demo-user-email': user.email, // from useAuth() context
}
```

The `generate-bot` route should extract this header and resolve the educator the same way all
other API routes do.
