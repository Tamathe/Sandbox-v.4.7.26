# Sandy Intelligence Upgrade — Phase 1: Context Foundation

**Status:** COMPLETE (implemented prior session)
**Phase:** 1 of 4
**Goal:** Give Sandy persistent memory, tool awareness, and portable briefing data so she's contextually intelligent on every page — not just the homepage.

---

## Overview

Phase 1 solves Sandy's three biggest context blind spots:

| Feature | Problem | Fix |
|---|---|---|
| **Conversation Memory** | Sandy forgets everything between messages/sessions — zero recall of past interactions | Inject recent saved notes + conversation summaries into system prompt |
| **Tool Detail Context** | On `/tools/[id]`, Sandy only knows "Tool Detail Page" — not *which* tool | Parse tool ID from URL, fetch tool metadata, inject into prompt |
| **Briefing Portability** | Morning briefing data (calendar, email, tasks) only available on homepage | Make briefing data fetchable on-demand from any page via API |

**No schema changes. No new UI components. Pure context injection.**

---

## Feature 1: Conversation Memory

### Problem
Sandy's `StudentNote` model already stores notes saved from conversations (`source: 'sandy'`). But Sandy never reads them back. A student who said "remember that I'm focusing on tort law this week" yesterday gets zero benefit today.

### Design

**What to inject:** The user's 10 most recent Sandy-sourced notes, formatted as a memory block in the system prompt.

**Where to fetch:** In `app/api/concierge/route.ts`, alongside the existing parallel fetches (user, tools, courses).

**Where to inject:** New section in `buildSystemPrompt()` output, positioned after the user info section and before page-specific context.

### Implementation

#### Step 1: Fetch notes in API route

**File:** `app/api/concierge/route.ts`
**Location:** Add to the `Promise.all` block at ~line 63, or as a separate parallel fetch.

```typescript
// Conversation memory — recent Sandy-saved notes for context continuity
let conversationMemory: { title: string; content: string; courseCode: string | null; createdAt: Date }[] = []
if (user?.id) {
  try {
    const recentNotes = await prisma.studentNote.findMany({
      where: { userId: user.id, source: 'sandy' },
      select: {
        title: true,
        content: true,
        createdAt: true,
        course: { select: { courseCode: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    conversationMemory = recentNotes.map(n => ({
      title: n.title,
      content: n.content.slice(0, 300), // Cap content to avoid prompt bloat
      courseCode: n.course?.courseCode ?? null,
      createdAt: n.createdAt,
    }))
  } catch {
    // Non-fatal
  }
}
```

#### Step 2: Pass to buildSystemPrompt

**File:** `app/api/concierge/route.ts`
**Change:** Add `conversationMemory` as a new parameter to `buildSystemPrompt()` call.

**File:** `app/lib/concierge-service.ts`
**Change:** Add parameter to `buildSystemPrompt` signature:
```typescript
conversationMemory?: { title: string; content: string; courseCode: string | null; createdAt: Date }[],
```

#### Step 3: Build the memory section in the system prompt

**File:** `app/lib/concierge-service.ts`
**Location:** Inside `buildSystemPrompt()`, after `sessionHistory` and before `studentIntelSection`.

```typescript
// Conversation memory — things the user asked Sandy to remember
let conversationMemorySection = ''
if (conversationMemory && conversationMemory.length > 0) {
  const memoryLines = conversationMemory.map(m => {
    const ago = Math.floor((Date.now() - m.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const timeLabel = ago === 0 ? 'today' : ago === 1 ? 'yesterday' : `${ago} days ago`
    const courseTag = m.courseCode ? ` [${m.courseCode}]` : ''
    return `- "${m.title}"${courseTag} (${timeLabel}): ${m.content}`
  }).join('\n')

  conversationMemorySection = `\n\n## CONVERSATION MEMORY
These are things this user previously asked you to remember or save. Reference them naturally when relevant — don't recite the list, but use it to personalize your responses. If something is outdated, the user can tell you to forget it.
${memoryLines}`
}
```

#### Step 4: Wire into prompt concatenation

Add `${conversationMemorySection}` to the concatenation string, right after `${sessionHistory}`.

### Testing
1. As Tiana (student), tell Sandy "remember that I'm focusing on contract law this week"
2. Navigate away, come back, ask Sandy "what should I study?"
3. Sandy should reference the saved note naturally

---

## Feature 2: Tool Detail Context

### Problem
When a user is on `/tools/abc123`, Sandy's system prompt says "Tool Detail Page - View, launch, or discuss a specific AI tool." She doesn't know the tool's name, description, category, or how it relates to the user's courses.

### Design

**What to inject:** The specific tool's name, description, category, and course links.

**Where to parse:** The tool ID is in `currentPage` (e.g., `/tools/clx123abc`). Parse it in the API route.

**Where to inject:** Dynamic `describeCurrentPage()` return for `/tools/*` paths, plus a dedicated section in the system prompt.

### Implementation

#### Step 1: Fetch tool metadata when on a tool page

**File:** `app/api/concierge/route.ts`
**Location:** After the existing parallel fetches, add a conditional fetch.

```typescript
// Tool detail context — when user is viewing a specific tool
let toolDetailContext: {
  name: string
  shortDescription: string
  category: string
  toolType: string
  creatorName: string
  courseLinks: string[]
} | null = null

if (currentPage?.startsWith('/tools/') && !currentPage.includes('/gamification')) {
  try {
    const toolId = currentPage.split('/')[2]
    if (toolId) {
      const tool = await prisma.tool.findUnique({
        where: { id: toolId },
        select: {
          name: true,
          shortDescription: true,
          category: true,
          toolType: true,
          creator: { select: { name: true } },
          courseLinks: {
            select: { course: { select: { courseCode: true, title: true } } },
            take: 5,
          },
        },
      })
      if (tool) {
        toolDetailContext = {
          name: tool.name,
          shortDescription: tool.shortDescription,
          category: tool.category,
          toolType: tool.toolType,
          creatorName: tool.creator.name || 'Unknown',
          courseLinks: tool.courseLinks.map(cl => `${cl.course.courseCode}: ${cl.course.title}`),
        }
      }
    }
  } catch {
    // Non-fatal
  }
}
```

#### Step 2: Pass to buildSystemPrompt and build section

**File:** `app/lib/concierge-service.ts`
**Change:** Add `toolDetailContext` parameter. Build section:

```typescript
let toolDetailSection = ''
if (toolDetailContext && currentPage.startsWith('/tools/')) {
  const courseInfo = toolDetailContext.courseLinks.length > 0
    ? `\nLinked to courses: ${toolDetailContext.courseLinks.join(', ')}`
    : ''
  toolDetailSection = `\n\n## TOOL DETAIL CONTEXT
The user is viewing **${toolDetailContext.name}** — ${toolDetailContext.shortDescription}
Category: ${toolDetailContext.category} | Type: ${toolDetailContext.toolType === 'CHATBOT' ? 'AI Chatbot' : 'External/Portfolio'}
Created by: ${toolDetailContext.creatorName}${courseInfo}

Your role here:
- Help them understand what this tool does and how to get the most out of it
- If the tool is linked to one of their courses, mention that connection
- Suggest launching the tool with a specific context: "Want to try it with your ${toolDetailContext.courseLinks[0] ?? 'course'} material?"
- If they're an educator, suggest linking this tool to their course
- Recommend similar tools if this one doesn't fit their needs
<!--ACTION:{"type":"launch","toolId":"${currentPage.split('/')[2]}","label":"Launch ${toolDetailContext.name}"}-->`
}
```

#### Step 3: Wire into prompt concatenation

Add `${toolDetailSection}` to the concatenation string, after `${universitySystemsPageSection}`.

### Testing
1. Navigate to any tool detail page (e.g., `/tools/[any-tool-id]`)
2. Ask Sandy "what is this tool?"
3. Sandy should respond with the actual tool name, description, and offer to launch it

---

## Feature 3: Briefing Portability

### Problem
Morning briefing data (calendar, emails, tasks) is dispatched from the homepage via `CustomEvent('sandbox-briefing-ready')` and stored in `SandyAmbientContext` state. When the user navigates away, the state persists (React context survives navigation). BUT if the user opens Sandy on a non-homepage page *first* (fresh session, deep link), there's no briefing data at all.

Sandy can't answer "what's on my calendar today?" unless the user visited the homepage first.

### Design

**What to build:** A lightweight API endpoint that returns the user's briefing summary (calendar + tasks + email stats) on demand. Sandy's API route fetches this when the user asks a briefing-related question but no `briefingContext` was passed.

### Implementation

#### Step 1: Create briefing summary API

**File:** `app/api/sandy/briefing-summary/route.ts` (new)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'

export async function GET(req: NextRequest) {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const user = auth.user
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  const [emails, calendar, tasks] = await Promise.all([
    // Email stats
    prisma.assistantEmail.findMany({
      where: { userId: user.id, isRead: false },
      select: { id: true, subject: true, fromName: true, urgencyBucket: true },
      take: 10,
      orderBy: { receivedAt: 'desc' },
    }).catch(() => []),

    // Today's calendar
    prisma.assistantCalendarEvent.findMany({
      where: {
        userId: user.id,
        startTime: { gte: startOfDay, lt: endOfDay },
      },
      select: { id: true, title: true, startTime: true, endTime: true, location: true, category: true },
      orderBy: { startTime: 'asc' },
    }).catch(() => []),

    // Pending tasks
    prisma.assistantTask.findMany({
      where: { userId: user.id, status: { not: 'completed' } },
      select: { id: true, title: true, dueAt: true, status: true },
      orderBy: { dueAt: 'asc' },
      take: 10,
    }).catch(() => []),
  ])

  return NextResponse.json({
    stats: {
      unreadEmails: emails.length,
      todayEvents: calendar.length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      overdueTasks: tasks.filter(t => t.dueAt && t.dueAt < now).length,
    },
    emails: emails.map(e => ({
      subject: e.subject,
      from: e.fromName,
      urgency: e.urgencyBucket,
    })),
    calendar: calendar.map(c => ({
      title: c.title,
      startTime: c.startTime?.toISOString(),
      endTime: c.endTime?.toISOString(),
      location: c.location,
    })),
    tasks: tasks.map(t => ({
      title: t.title,
      dueAt: t.dueAt?.toISOString(),
      status: t.status,
      isOverdue: t.dueAt ? t.dueAt < now : false,
    })),
  })
}
```

#### Step 2: Fetch on-demand in concierge route when briefing intent detected

**File:** `app/api/concierge/route.ts`
**Location:** After the `ASSISTANT_ACTION_INTENT_RE` check (~line 454), add on-demand briefing fetch:

```typescript
// On-demand briefing fetch — if user asks about calendar/email/tasks but no briefingContext was passed
let onDemandBriefing: string | null = null
if (isAssistantActionIntent && !briefingContext && user?.id) {
  try {
    const [emails, calendar, tasks] = await Promise.all([
      prisma.assistantEmail.findMany({
        where: { userId: user.id, isRead: false },
        select: { id: true, subject: true, fromName: true, urgencyBucket: true },
        take: 10,
        orderBy: { receivedAt: 'desc' },
      }).catch(() => []),
      prisma.assistantCalendarEvent.findMany({
        where: {
          userId: user.id,
          startTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)), lt: new Date(new Date().setHours(24, 0, 0, 0)) },
        },
        select: { id: true, title: true, startTime: true, endTime: true, location: true, category: true },
        orderBy: { startTime: 'asc' },
      }).catch(() => []),
      prisma.assistantTask.findMany({
        where: { userId: user.id, status: { not: 'completed' } },
        select: { id: true, title: true, dueAt: true, status: true },
        orderBy: { dueAt: 'asc' },
        take: 10,
      }).catch(() => []),
    ])

    const lines: string[] = []
    if (emails.length > 0) {
      const urgent = emails.filter(e => e.urgencyBucket === 'respond-today')
      lines.push(`Unread emails: ${emails.length}${urgent.length > 0 ? ` (${urgent.length} urgent)` : ''}`)
      lines.push(emails.slice(0, 5).map(e => `- "${e.subject}" from ${e.fromName} [${e.urgencyBucket}]`).join('\n'))
    }
    if (calendar.length > 0) {
      lines.push(`Today's calendar (${calendar.length} events):`)
      lines.push(calendar.map(c => `- ${c.title} at ${c.startTime?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}${c.location ? ` (${c.location})` : ''}`).join('\n'))
    }
    if (tasks.length > 0) {
      const overdue = tasks.filter(t => t.dueAt && t.dueAt < new Date())
      lines.push(`Tasks: ${tasks.length} pending${overdue.length > 0 ? `, ${overdue.length} overdue` : ''}`)
      lines.push(tasks.slice(0, 5).map(t => `- ${t.title}${t.dueAt ? ` (due ${t.dueAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})` : ''}`).join('\n'))
    }

    if (lines.length > 0) {
      onDemandBriefing = `\n\n## ON-DEMAND BRIEFING\nThe user asked about their schedule/email/tasks but hasn't visited the homepage this session. Here's their current data:\n${lines.join('\n')}\nAnswer their question using this data. Suggest visiting the homepage for the full morning briefing experience.`
    }
  } catch {
    // Non-fatal
  }
}
```

#### Step 3: Inject into system prompt

Append `onDemandBriefing` to the system prompt after the main `buildSystemPrompt()` call:

```typescript
if (onDemandBriefing) {
  systemPrompt += onDemandBriefing
}
```

### Testing
1. Log in as Katie (educator), do NOT visit homepage
2. Navigate directly to `/hub`
3. Ask Sandy "what's on my calendar today?"
4. Sandy should fetch and display calendar data instead of saying "I don't have that information"

---

## Build Order

```
Step 1: Conversation Memory
  ├── concierge route.ts — fetch recent notes
  ├── concierge-service.ts — add parameter + build section
  └── concierge-service.ts — wire into concatenation

Step 2: Tool Detail Context
  ├── concierge route.ts — fetch tool metadata
  ├── concierge-service.ts — add parameter + build section
  └── concierge-service.ts — wire into concatenation

Step 3: Briefing Portability
  ├── api/sandy/briefing-summary/route.ts — new endpoint
  ├── concierge route.ts — on-demand briefing fetch
  └── concierge route.ts — inject into system prompt

Step 4: Type check + manual test
  └── npx tsc --noEmit && npm run build
```

---

## Files Modified

| File | Changes |
|---|---|
| `app/api/concierge/route.ts` | 3 new fetch blocks (notes, tool metadata, on-demand briefing) + injection |
| `app/lib/concierge-service.ts` | 2 new parameters + 2 new prompt sections + concatenation update |
| `app/api/sandy/briefing-summary/route.ts` | **New file** — lightweight briefing API |

## Files NOT Modified
- No schema changes
- No new components
- No changes to `SandyAmbientContext.tsx`
- No changes to `concierge-utils.ts`

---

## Success Criteria

| Feature | Test | Expected |
|---|---|---|
| Conversation Memory | Save a note via Sandy, navigate away, ask a related question | Sandy references the saved note naturally |
| Tool Detail Context | Visit `/tools/[id]`, ask "what is this?" | Sandy names the tool, describes it, offers to launch |
| Briefing Portability | Deep-link to `/hub`, ask "what's on my calendar?" | Sandy fetches and shows today's calendar instead of generic fallback |

---

## Phase 2 Preview (next sprint)
- Student Proactive Suggestions service
- Messages page context (unread threads, active groups)
- Token budget monitoring for system prompt

## Phase 3 Preview
- `SandyPreferences` schema model
- Proactivity / Tone / Chip settings
- Settings UI integration

## Phase 4 Preview
- User-facing Sandy Traces (trust/transparency)
