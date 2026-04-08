# UX Improvements Architecture
### The Sandbox — CATS-AI / University of Kentucky
### Derived from: Hamlet Builder UX Walkthrough
### Date: 2026-03-19

---

## Overview

This document specifies the implementation architecture for UX improvements identified during the Interactive Hamlet builder walkthrough. Improvements are organized by priority tier and component ownership.

---

## Tier 1 — Ship This Week

### 1.1 Character Name Badges in SIMULATION Preview

**Problem:** Multi-character AI responses all look identical. No visual identity for characters.

**Solution:** Parse `**CHARACTER:**` prefixes in assistant message content and render styled name chips.

**Implementation:**

```tsx
// app/components/ChatMessage.tsx (or wherever messages are rendered)

function parseCharacterPrefix(content: string): { character: string | null; body: string } {
  const match = content.match(/^\*\*([A-Z\s]+):\*\*\s*/)
  if (match) {
    return { character: match[1], body: content.slice(match[0].length) }
  }
  return { character: null, body: content }
}

const CHARACTER_COLORS: Record<string, string> = {
  GHOST:    'bg-slate-700 text-slate-200',
  CLAUDIUS: 'bg-red-900/60 text-red-200',
  HAMLET:   'bg-blue-900/60 text-blue-200',
  OPHELIA:  'bg-pink-900/60 text-pink-200',
  HORATIO:  'bg-green-900/60 text-green-200',
  DEFAULT:  'bg-gray-700 text-gray-200',
}

// In the message render:
const { character, body } = parseCharacterPrefix(message.content)
```

**Render pattern:**
```tsx
{character && (
  <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-1 inline-block
    ${CHARACTER_COLORS[character] ?? CHARACTER_COLORS.DEFAULT}`}>
    {character}
  </span>
)}
<ReactMarkdown>{body}</ReactMarkdown>
```

**Files touched:**
- `app/components/ChatInterface.tsx` — message render loop
- No API changes required

**Notes:**
- Color assignment is deterministic by character name hash if not in the lookup table
- Only applies when `toolType === 'SIMULATION'` — guard with a prop
- The system prompt template for SIMULATION should enforce: `"Always prefix your response with the character's name in bold caps followed by a colon: **GHOST:** your text here"`

---

### 1.2 Voice Name Labels + Audio Preview Samples

**Problem:** Voice options (`alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`) are meaningless to users.

**Solution:** Replace raw names with descriptive labels. Add 3-second preview audio per voice.

**Voice descriptor map** — add to `app/lib/audio-experience.ts`:

```ts
export const VOICE_DESCRIPTORS: Record<OpenAIAudioVoice, { label: string; description: string; bestFor: string }> = {
  alloy:   { label: 'Alloy',   description: 'Clear and neutral',       bestFor: 'General tutoring, study tools' },
  echo:    { label: 'Echo',    description: 'Warm and conversational',  bestFor: 'Coaching, feedback tools' },
  fable:   { label: 'Fable',   description: 'Expressive and dynamic',   bestFor: 'Storytelling, creative tools' },
  onyx:    { label: 'Onyx',    description: 'Deep and authoritative',   bestFor: 'Dramatic roles, debate, Hamlet' },
  nova:    { label: 'Nova',    description: 'Bright and encouraging',   bestFor: 'Language learning, quizzes' },
  shimmer: { label: 'Shimmer', description: 'Calm and measured',        bestFor: 'Mindfulness, reflection tools' },
}
```

**Audio preview samples:**
- Generate once: 6 static `.mp3` files, each 3 seconds, same neutral sentence
- Store in `public/sounds/voice-previews/[voice-name].mp3`
- Generation script: `scripts/generate-voice-previews.ts` — calls OpenAI TTS once per voice

**UI component** — replace raw `<select>` with a card picker:
```tsx
// app/components/VoicePicker.tsx
// Grid of 6 cards, each showing: label, description, bestFor, ▶ Preview button
// Selected card gets blue ring
```

**Files touched:**
- `app/lib/audio-experience.ts` — add VOICE_DESCRIPTORS
- `app/publish/page.tsx` — replace voice select with VoicePicker
- `app/components/VoicePicker.tsx` — new component
- `public/sounds/voice-previews/` — 6 static audio files

---

### 1.3 Audio Shortcut Modal on Tool Detail Page

**Problem:** Enabling audio requires navigating a 5-step publish form.

**Solution:** "Enable Audio" quick-action on the tool creator's detail page — opens a focused modal.

**Modal contents:**
- Toggle: Audio enabled on/off
- VoicePicker (from 1.2)
- Speed slider (0.5x – 2x)
- Persona name field (pre-suggested based on tool name)
- Save button → `PATCH /api/tools/[id]` with audio fields

**Trigger:** "🎤 Enable Audio" button — visible only to tool creator, displayed in the tool action bar on `/tools/[id]`.

**Files touched:**
- `app/tools/[id]/page.tsx` — add button in creator actions
- `app/components/AudioConfigModal.tsx` — new component
- `app/api/tools/[id]/route.ts` — already handles PATCH, ensure audio fields are included

---

### 1.4 Copy Fixes (Zero Complexity)

**Build Hub placeholder:**
```ts
// app/build/page.tsx line ~162
// Before:
placeholder={'e.g. "A Socratic tutor for 1L Contracts students to practice offer and acceptance"'}

// After:
placeholder={'e.g. "I play Hamlet and the AI voices every other character" or "A Socratic tutor for 1L Contracts students..."'}
```

**Simulation category subtitle:**
- In experience-types.ts, `roleplay` category — add `subtitle: "Role-play, character scenarios, historical reenactments"` to the category object
- Render subtitle as muted text beneath category name in the Build Hub gallery

**Build button unlock hint:**
- In `BuilderChatPanel.tsx`, when `messages.length < 2`, show beneath the input: `"Describe your idea a bit more — then the Build button will appear"`

---

## Tier 2 — Next Sprint

### 2.1 "Continue Building" Nudge on Homepage

**Problem:** Students with active drafts have no fast path back to them from the homepage.

**Query:**
```ts
// In app/page.tsx SSR or client fetch
const recentDraft = await prisma.buildSession.findFirst({
  where: {
    creatorId: userId,
    status: 'ACTIVE',
    updatedAt: { gte: subDays(new Date(), 7) }
  },
  orderBy: { updatedAt: 'desc' }
})
```

**Render:** Single card in right column (above Quick Access):
```tsx
{recentDraft && (
  <Link href={`/builder?sessionId=${recentDraft.id}`}>
    <div className="rounded-xl border border-[#0033A0]/20 bg-blue-50 p-4 flex items-center gap-3">
      <Wand2 className="text-[#0033A0]" />
      <div>
        <p className="text-sm font-semibold text-[#0033A0]">Resume: {recentDraft.title ?? 'Untitled build'}</p>
        <p className="text-xs text-gray-500">Last edited {formatDistanceToNow(recentDraft.updatedAt)} ago</p>
      </div>
    </div>
  </Link>
)}
```

**Files touched:**
- `app/page.tsx`

---

### 2.2 Smarter SIMULATION System Prompt Template

**Problem:** Character prefixes and act progression only work if the system prompt requests them. Not guaranteed by default.

**Solution:** When `toolType === 'SIMULATION'`, the builder AI uses a hardened system prompt template that enforces:
1. Character name prefix format: `**[CHARACTER NAME]:**`
2. Scene/act tracking
3. Auto-set `totalSteps` from detected act count

**Template injection** — in the builder's API route, detect SIMULATION type and append:

```ts
const SIMULATION_SYSTEM_SUFFIX = `
FORMATTING RULES (always follow these):
- Always prefix your response with the speaking character's name in bold caps: **CHARACTER NAME:** followed by their dialogue
- Stay strictly in character. Do not break the fourth wall.
- Track narrative progression. When a scene ends, briefly narrate the transition: *[Scene transition: moving to Act 2, Scene 1]*
- Never speak as multiple characters in a single response.
`
```

**Auto-set totalSteps:** Parse the user's builder prompt for act/scene mentions → extract a number → set `totalSteps` on the spec JSON before the first preview render.

**Files touched:**
- `app/api/builder/chat/route.ts` (or equivalent builder API)
- `app/lib/builder-prompts.ts` — add SIMULATION_SYSTEM_SUFFIX constant

---

### 2.3 Act/Scene Starter Questions for SIMULATION Tools

**Problem:** No narrative control — students can't jump to a specific act.

**Solution:** Builder auto-generates scene-based starter questions when act/scene structure is detected in the prompt.

**Logic in builder API:**
```ts
// When toolType === SIMULATION and prompt mentions acts/scenes:
// Generate starter questions as scene entry points:
const starterQuestions = [
  "Begin Act 1, Scene 1 — Who's there?",
  "Jump to the Mousetrap scene",
  "Begin the Graveyard scene — Alas, poor Yorick",
]
// These render as buttons in ChatInterface — no new UI needed
```

**Files touched:**
- `app/api/builder/chat/route.ts` — add starter question generation logic

---

### 2.4 Complexity Detector — Lightweight Keyword Trigger

**Problem:** Students with voice+multi-character prompts have no guidance before submitting.

**Solution:** Client-side keyword match on textarea blur or submit. Not an AI call — a regex.

```ts
// app/build/page.tsx
const COMPLEXITY_KEYWORDS = ['voice', 'character', 'scene', 'act', 'role', 'play as', 'i am', 'i play']

function detectComplexity(prompt: string): string | null {
  const lower = prompt.toLowerCase()
  if (COMPLEXITY_KEYWORDS.some(k => lower.includes(k))) {
    return 'Tip: For roleplay and voice tools, name each character and describe how scenes progress. The AI will build the experience around your description.'
  }
  return null
}
```

**Render:** Dismissible blue tip banner beneath the textarea, only shown when complexity is detected.

**Files touched:**
- `app/build/page.tsx`

---

## Tier 3 — Future / Flag in UI

### 3.1 Per-Character TTS Voices

**Why deferred:** Multi-voice audio requires either:
- Multiple TTS API calls per response (latency: 2–4 additional seconds)
- A custom voice-switching parser that segments by character prefix

Neither is acceptable for the current product. Flag with a tooltip in audio settings:
```
🔜 Per-character voices — coming soon
Assign a different voice to each character in your simulation.
```

**When to revisit:** When OpenAI releases streaming multi-voice TTS, or when we move to Azure AI Speech (which supports voice switching natively via SSML).

---

### 3.2 `/experience/[slug]` — Story Series

**Current:** Single static page at `/experience`
**When to build dynamic routing:** When there are ≥ 3 stories.

**Data model (when ready):**
```prisma
model ExperienceStory {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  kicker      String   // "What you can build"
  body        String   @db.Text  // MDX or structured JSON
  publishedAt DateTime?
  createdAt   DateTime @default(now())
}
```

Until then: duplicate the static page pattern. `/experience/hamlet`, `/experience/law-moot`, etc.

---

## Component Map

| Component | File | Status |
|---|---|---|
| Character name badge parser | `app/components/ChatInterface.tsx` | Modify |
| VoicePicker card grid | `app/components/VoicePicker.tsx` | New |
| AudioConfigModal | `app/components/AudioConfigModal.tsx` | New |
| Voice preview audio files | `public/sounds/voice-previews/*.mp3` | Generate |
| Voice descriptors | `app/lib/audio-experience.ts` | Modify |
| Resume draft nudge | `app/page.tsx` | Modify |
| SIMULATION system prompt suffix | `app/lib/builder-prompts.ts` | New constant |
| Complexity detector | `app/build/page.tsx` | Modify |
| Copy fixes (3 files) | `app/build/page.tsx`, `app/lib/experience-types.ts`, `app/components/BuilderChatPanel.tsx` | Modify |

---

## Implementation Order

```
Week 1:
  ✓ Copy fixes (placeholders, subtitle, hint text)
  ✓ Character name badge parser
  ✓ Voice descriptors in audio-experience.ts
  ✓ VoicePicker component
  ✓ AudioConfigModal

Week 2:
  ✓ Voice preview audio generation script + static files
  ✓ SIMULATION system prompt suffix
  ✓ Complexity detector
  ✓ Resume draft nudge on homepage

Week 3:
  ✓ Act/scene starter question auto-generation
  ✓ Auto-set totalSteps from prompt parsing
  ✓ Smarter SIMULATION system prompt template

Future:
  → Per-character TTS voices (post-Azure AI Speech migration)
  → /experience/[slug] dynamic routing (at 3+ stories)
```

---

*Blueprint created: 2026-03-19*
