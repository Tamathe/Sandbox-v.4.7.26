# Blueprint 10: Sandy "Use This" Actions — Bridge AI Output to Student Workflow

> **Sprint Scope:** Add actionable buttons on every Sandy response that let students copy, save to notes, or insert Sandy's output into their working context — turning Sandy from an oracle into a collaborator.
> **Depends On:** Nothing — enhances existing Sandy chat components.
> **Estimated Size:** Small (half sprint)
> **Deploy Order:** 10 of 10 — no prerequisites, but enhances Blueprint 8 (Assignment Workspace) significantly

---

## Context

Sandy is an excellent knowledge oracle — students ask questions and get great answers. But Sandy's outputs live in a **chat log that's disconnected from the student's working context.** If Sandy explains hearsay exceptions and the student wants to use that explanation in their notes or draft, they have to:
1. Select the text in Sandy's response
2. Copy it
3. Navigate to where they want to use it
4. Paste it

This is the same friction as copying from ChatGPT. A platform-native AI should do better — Sandy's output should flow directly into the student's workflow with one tap.

### Key Files to Modify

| File | Change |
|------|--------|
| `app/components/ConciergePanel.tsx` | Add action menu to assistant messages |
| `app/components/ChatInterface.tsx` | Add action menu to assistant messages (tool chat) |
| `app/components/SandyInterviewPanel.tsx` | Add action menu to assistant messages (elevated tools) |
| `app/components/StudyBuddyInterface.tsx` | Add action menu to assistant messages (Study Buddy) |

### Key Files to Create

| File | Purpose |
|------|---------|
| `app/components/sandy/MessageActions.tsx` | **New:** reusable action menu for Sandy messages |
| `app/api/notes/route.ts` | **New:** POST — save a note from Sandy's response |
| `app/lib/notes-service.ts` | **New:** lightweight notes storage |

---

## Feature 1: Message Action Menu

### What

Every Sandy (assistant) message gets a subtle action bar that appears on hover (desktop) or long-press (mobile):

```
┌─────────────────────────────────────────────────┐
│  Sandy:                                          │
│  The hearsay rule under FRE 802 excludes         │
│  out-of-court statements offered for their       │
│  truth. However, FRE 803 lists 23 exceptions     │
│  that apply regardless of declarant              │
│  availability...                                 │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │ 📋 Copy  │ 📝 Save to Notes  │ 📌 Pin     │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Actions

```typescript
interface MessageAction {
  id: string
  label: string
  icon: string          // lucide-react icon name
  handler: (messageContent: string, messageId: string) => void
}

const MESSAGE_ACTIONS: MessageAction[] = [
  {
    id: 'copy',
    label: 'Copy',
    icon: 'clipboard',
    handler: async (content) => {
      await navigator.clipboard.writeText(content)
      toast('Copied to clipboard')
    }
  },
  {
    id: 'save-note',
    label: 'Save to Notes',
    icon: 'sticky-note',
    handler: async (content, messageId) => {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          source: 'sandy',
          sourceMessageId: messageId,
          // Auto-tag with current course context if available
          courseId: currentCourseId || null
        })
      })
      toast('Saved to Notes')
    }
  },
  {
    id: 'pin',
    label: 'Pin',
    icon: 'pin',
    handler: async (content, messageId) => {
      // Pin message to the top of the chat for easy reference
      setPinnedMessage({ content, messageId })
      toast('Pinned')
    }
  },
]
```

### Context-Aware Actions

Additional actions appear based on context:

```typescript
// If Assignment Workspace is open (Blueprint 8):
{
  id: 'insert-draft',
  label: 'Insert into Draft',
  icon: 'file-plus',
  handler: (content) => {
    // Dispatch event to the workspace draft editor
    window.dispatchEvent(new CustomEvent('workspace-insert', {
      detail: { content, position: 'cursor' }
    }))
    toast('Inserted into draft')
  }
}

// If Study Buddy flashcard mode:
{
  id: 'make-flashcard',
  label: 'Make Flashcard',
  icon: 'layers',
  handler: async (content) => {
    // Create a flashcard from this response
    // Front: auto-generate question from content (Haiku)
    // Back: the response content
    await createFlashcardFromContent(content)
    toast('Flashcard created')
  }
}
```

---

## Feature 2: MessageActions Component

### Component Design

```tsx
// MessageActions.tsx

interface MessageActionsProps {
  content: string               // The message text content
  messageId: string
  context?: {
    courseId?: string
    assignmentId?: string
    toolSlug?: string
    workspaceOpen?: boolean
  }
}

export function MessageActions({ content, messageId, context }: MessageActionsProps) {
  const [visible, setVisible] = useState(false)

  // Build action list based on context
  const actions = useMemo(() => {
    const base = [copyAction, saveNoteAction, pinAction]

    if (context?.workspaceOpen) {
      base.push(insertDraftAction)
    }

    if (context?.toolSlug === 'study-buddy') {
      base.push(makeFlashcardAction)
    }

    return base
  }, [context])

  return (
    <div
      className="relative group"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {/* Action bar — appears on hover, slides up */}
      <div className={cn(
        'flex items-center gap-1 transition-opacity duration-200',
        'absolute -bottom-8 left-0',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}>
        {actions.map(action => (
          <button
            key={action.id}
            onClick={() => action.handler(content, messageId)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-[#0033A0] hover:bg-slate-100 rounded-lg transition-colors"
            title={action.label}
          >
            <Icon name={action.icon} className="size-3.5" />
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

### Mobile Behavior

On mobile, hover doesn't work. Use a **long-press** gesture to reveal the action menu as a bottom sheet:

```typescript
// Long-press detection
const longPressTimer = useRef<NodeJS.Timeout>()

const handleTouchStart = () => {
  longPressTimer.current = setTimeout(() => {
    setShowActionSheet(true)
  }, 500)  // 500ms long press
}

const handleTouchEnd = () => {
  clearTimeout(longPressTimer.current)
}

// Action sheet: bottom sheet with action buttons, same as desktop but vertical layout
```

### Visual Design

- Action bar: sits just below the message bubble, same left alignment
- Background: transparent until hover, then subtle `bg-slate-50` behind buttons
- Icons: `size-3.5`, using slate-500 (muted) to not compete with message content
- Hover on individual action: icon and text turn `text-[#0033A0]`
- No action bar on **user** messages (only assistant messages)
- No action bar on **loading/typing** states

---

## Feature 3: Notes Storage

### What

A lightweight notes system that stores snippets saved from Sandy's responses. These are **not** the same as the existing `/notes` page (which shows notes from Sandy conversations). These are student-initiated saves of specific Sandy responses.

### Data Model

Use a simple model or extend the existing notes infrastructure:

```typescript
// If adding to schema:
model StudentNote {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  content       String   // The saved text
  source        String   // 'sandy-concierge' | 'sandy-study-buddy' | 'sandy-tool' | 'manual'
  courseId       String?  // Optional course association
  course        Course?  @relation(fields: [courseId], references: [id])
  assignmentId  String?  // Optional assignment association
  tags          String[] // Auto-generated tags
  createdAt     DateTime @default(now())
}
```

Alternatively, if the existing notes infrastructure can be extended, use that instead of a new model.

### API: POST /api/notes

```typescript
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { content, source, courseId, assignmentId, tags } = await req.json()

  const note = await prisma.studentNote.create({
    data: {
      userId: auth.user.id,
      content,
      source: source || 'sandy-concierge',
      courseId: courseId || null,
      assignmentId: assignmentId || null,
      tags: tags || [],
    }
  })

  return NextResponse.json(note, { status: 201 })
})
```

### GET /api/notes

```typescript
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const courseId = req.nextUrl.searchParams.get('courseId')

  const notes = await prisma.studentNote.findMany({
    where: {
      userId: auth.user.id,
      ...(courseId ? { courseId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  return NextResponse.json(notes)
})
```

---

## Feature 4: Pinned Message

### What

A "Pin" action that sticks a Sandy response to the top of the chat panel for easy reference while the student continues the conversation.

```
┌─────────────────────────────────────────────────┐
│  📌 Pinned:                              [Unpin]│
│  "FRE 803 lists 23 exceptions..."               │
│  ────────────────────────────────────────────── │
│                                                   │
│  [Normal chat continues below]                   │
│                                                   │
└─────────────────────────────────────────────────┘
```

### Implementation

```typescript
// State in chat component:
const [pinnedMessage, setPinnedMessage] = useState<{ content: string; messageId: string } | null>(null)

// Render pinned message as a sticky header:
{pinnedMessage && (
  <div className="sticky top-0 z-10 bg-amber-50 border-b border-amber-200 p-3 flex items-start gap-2">
    <Pin className="size-4 text-amber-600 flex-shrink-0 mt-0.5" />
    <p className="text-sm text-amber-900 line-clamp-2 flex-1">
      {pinnedMessage.content}
    </p>
    <button onClick={() => setPinnedMessage(null)} className="text-amber-600 hover:text-amber-800">
      <X className="size-4" />
    </button>
  </div>
)}
```

Only one message can be pinned at a time. Pinning a new message replaces the old pin. Pin is session-scoped (not persisted — it's a working-memory aid, not storage).

---

## Integration Points

### ConciergePanel.tsx (Global Sandy)

Wrap each assistant message in `MessageActions`:

```tsx
// In the message rendering loop:
{message.role === 'assistant' && (
  <MessageActions
    content={message.content}
    messageId={message.id}
    context={{ courseId: pageContext?.courseId }}
  />
)}
```

### ChatInterface.tsx (Tool Sandy)

Same pattern, with tool context:

```tsx
<MessageActions
  content={message.content}
  messageId={message.id}
  context={{ toolSlug: currentTool?.slug, courseId }}
/>
```

### StudyBuddyInterface.tsx

Add `makeFlashcard` action for study mode:

```tsx
<MessageActions
  content={message.content}
  messageId={message.id}
  context={{ toolSlug: 'study-buddy', courseId }}
/>
```

### SandyInterviewPanel.tsx

Add for elevated tools (Write Room, Data Desk, etc.):

```tsx
<MessageActions
  content={message.content}
  messageId={message.id}
  context={{ toolSlug: collectionSlug }}
/>
```

---

## Toast Notifications

All actions provide immediate feedback via a brief toast:

```typescript
// Use a simple toast system (if not already in the project):
// - "Copied to clipboard" (1.5s)
// - "Saved to Notes" (1.5s) with "View →" link
// - "Pinned" (1s)
// - "Inserted into draft" (1.5s)
// - "Flashcard created" (1.5s) with "Review →" link

// Toast component: fixed bottom-center, slides up, auto-dismisses
// Style: bg-slate-900 text-white rounded-xl px-4 py-2 text-sm shadow-lg
```

---

## What This Does NOT Do

- Does not change Sandy's AI behavior (same responses, just actionable)
- Does not add a full note-taking editor (just stores snippets — full notes are in Wellness Hub or manual)
- Does not enable real-time collaboration on notes (single-student, single-device)
- Does not add actions to user messages (only assistant messages get actions)
- Does not persist pins across sessions (pins are in-memory working aids)

---

## Success Criteria

A student can ask Sandy a question, get an answer, and **move that answer into their workflow** (clipboard, notes, draft, flashcard) in **one tap** — without manually selecting text, copying, navigating, and pasting. Sandy's output becomes a building block, not just a conversation artifact.
