# Sandy Intelligence Upgrade — Phase 2: Proactive Intelligence & Budget Safety

**Status:** IN PROGRESS
**Phase:** 2 of 4
**Goal:** Give Sandy proactive suggestion capabilities, messaging awareness, and a token budget safety net so the growing system prompt doesn't silently blow past model limits.

---

## Overview

Phase 2 solves three distinct problems:

| Feature | Problem | Fix |
|---|---|---|
| **Token Budget Monitor** | System prompt has grown to 20+ sections with no size guard — a single oversized prompt silently degrades response quality or hits API limits | Lightweight estimation utility that warns/truncates sections when prompt exceeds a configurable budget |
| **Messages Page Context** | On `/messages`, Sandy only knows "Discord-style group messaging" — she can't see unread counts, active groups, or recent activity | Fetch user's messaging state (unread threads, group types, recent activity) and inject into system prompt |
| **Student Proactive Suggestions** | Sandy waits for students to ask — she never proactively surfaces "you have 3 overdue flashcards" or "your study group is active right now" | A service that computes contextual suggestions from deadlines, unused tools, study patterns, and social signals, injected as a prompt section |

**No schema changes. No new UI components. Pure service + context injection.**

---

## Feature 1: Token Budget Monitor

### Problem
The concierge system prompt is assembled from 20+ sections (conversation memory, tool detail, student intelligence, SR nudge, fingerprint, email intelligence, university systems, Live Room suggestions, etc.). Each section is individually small, but the total can exceed safe limits. There's no visibility into prompt size and no automatic truncation.

### Design

**What to build:** A utility function `estimateTokens(text)` that uses a fast char-based heuristic (1 token ≈ 4 chars for English), plus a `trimPromptToBudget(prompt, budget)` function that intelligently truncates low-priority sections when the budget is exceeded.

**Where it lives:** New file `app/lib/token-budget.ts` — pure utility, no DB access.

**Where it's called:** At the end of the prompt assembly in `app/api/concierge/route.ts`, right before the Anthropic API call.

### Implementation

#### Step 1: Create token budget utility

**File:** `app/lib/token-budget.ts` (new)

```typescript
// Section priority (higher = more important, trimmed last)
const SECTION_PRIORITY: Record<string, number> = {
  'CURRENT USER': 100,
  'CURRENT PAGE': 95,
  'AVAILABLE TOOLS': 90,
  'COURSE MATERIALS': 85,
  'THIS STUDENT\'S CURRENT STATUS': 80,
  'CONVERSATION MEMORY': 75,
  'TOOL DETAIL CONTEXT': 75,
  'MESSAGES CONTEXT': 70,
  'PROACTIVE SUGGESTIONS': 70,
  'ON-DEMAND BRIEFING': 70,
  'MORNING BRIEFING CONTEXT': 70,
  // Lower-priority enrichment sections
  'SPACED REPETITION NUDGE': 50,
  'WEEKLY PROGRESS AWARENESS': 45,
  'STUDY PLAN AWARENESS': 45,
  'EXAM FORGE NUDGE': 40,
  'COMMUNITY TOOL REQUESTS': 30,
  'YOUR UKNOW ALERTS': 25,
  'UK NEWS CONTEXT': 20,
  'RECENT LEARNING EVENTS': 20,
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function trimPromptToBudget(prompt: string, budgetTokens: number): { prompt: string; trimmed: boolean; estimatedTokens: number; sectionsDropped: string[] } {
  const estimated = estimateTokens(prompt)
  if (estimated <= budgetTokens) {
    return { prompt, trimmed: false, estimatedTokens: estimated, sectionsDropped: [] }
  }

  // Parse sections by ## headers
  const sections = parseSections(prompt)
  // Sort by priority ascending (lowest priority first = trimmed first)
  const removable = sections
    .filter(s => s.name in SECTION_PRIORITY)
    .sort((a, b) => (SECTION_PRIORITY[a.name] ?? 50) - (SECTION_PRIORITY[b.name] ?? 50))

  const sectionsDropped: string[] = []
  let currentText = prompt

  for (const section of removable) {
    if (estimateTokens(currentText) <= budgetTokens) break
    currentText = currentText.replace(section.fullText, '')
    sectionsDropped.push(section.name)
  }

  return {
    prompt: currentText,
    trimmed: true,
    estimatedTokens: estimateTokens(currentText),
    sectionsDropped,
  }
}

function parseSections(text: string): { name: string; fullText: string }[] {
  const regex = /(\n\n## ([^\n]+)\n[^]*?(?=\n\n## |\n\n[A-Z]|$))/g
  const sections: { name: string; fullText: string }[] = []
  let match
  while ((match = regex.exec(text)) !== null) {
    sections.push({ name: match[2], fullText: match[1] })
  }
  return sections
}
```

#### Step 2: Wire into concierge route

**File:** `app/api/concierge/route.ts`
**Location:** After all prompt assembly, before the `client.messages.stream()` call (~line 996).

```typescript
import { estimateTokens, trimPromptToBudget } from '../../lib/token-budget'

// Token budget guard — trim low-priority sections if prompt is too large
const TOKEN_BUDGET = 12000 // ~48K chars — leaves room for conversation + response
const budgetResult = trimPromptToBudget(systemPrompt, TOKEN_BUDGET)
if (budgetResult.trimmed) {
  systemPrompt = budgetResult.prompt
  console.warn(`[concierge] Prompt trimmed from ~${budgetResult.estimatedTokens + budgetResult.sectionsDropped.length * 200} to ~${budgetResult.estimatedTokens} tokens. Dropped: ${budgetResult.sectionsDropped.join(', ')}`)
}
```

### Testing
1. Temporarily set `TOKEN_BUDGET = 100` and verify sections get dropped
2. Check console for trim warning
3. Restore budget, verify normal operation (no trimming)

---

## Feature 2: Messages Page Context

### Problem
When a user is on `/messages` or `/messages/[groupId]`, Sandy only knows the static page description. She can't see how many unread threads the user has, which groups are active, or what the recent conversation topics are. This means Sandy can't help with "catch me up" or "what did I miss?"

### Design

**What to inject:** Unread thread count, top unread groups (name + count + last message preview), group membership summary, and active Live Rooms.

**Where to fetch:** In `app/api/concierge/route.ts`, conditionally when `currentPage` starts with `/messages`.

**Where to inject:** New section in `buildSystemPrompt()` output, gated on the `/messages` page.

### Implementation

#### Step 1: Create messages context service

**File:** `app/lib/messages/sandy-context.ts` (new)

```typescript
import { prisma } from '../prisma'

export interface MessagesContextData {
  totalUnread: number
  groups: {
    groupId: string
    name: string
    type: string
    unreadCount: number
    lastMessagePreview: string | null
    lastMessageAuthor: string | null
    memberCount: number
  }[]
  activeGroupId: string | null // from URL if on /messages/[groupId]
}

export async function getMessagesContext(userId: string, currentPage: string): Promise<MessagesContextData | null> {
  // Only fetch on /messages pages
  if (!currentPage.startsWith('/messages')) return null

  const activeGroupId = currentPage.startsWith('/messages/') ? currentPage.split('/')[2] || null : null

  // Get user's group memberships
  const memberships = await prisma.chatMembership.findMany({
    where: { userId },
    select: { groupId: true },
  })
  const groupIds = memberships.map(m => m.groupId)
  if (groupIds.length === 0) return { totalUnread: 0, groups: [], activeGroupId }

  // Fetch groups with channels + member counts
  const groups = await prisma.chatGroup.findMany({
    where: { id: { in: groupIds }, isArchived: false },
    select: {
      id: true,
      name: true,
      type: true,
      channels: { select: { id: true } },
      _count: { select: { memberships: true } },
    },
  })

  const allChannelIds = groups.flatMap(g => g.channels.map(c => c.id))
  if (allChannelIds.length === 0) return { totalUnread: 0, groups: [], activeGroupId }

  // Fetch read cursors + last messages in parallel
  const [readCursors, lastMessages] = await Promise.all([
    prisma.channelReadCursor.findMany({
      where: { userId, channelId: { in: allChannelIds } },
      select: { channelId: true, lastReadAt: true },
    }),
    prisma.channelMessage.findMany({
      where: { channelId: { in: allChannelIds }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      distinct: ['channelId'],
      select: {
        channelId: true,
        content: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    }),
  ])

  const cursorMap = new Map(readCursors.map(rc => [rc.channelId, rc.lastReadAt]))
  const channelToGroup = new Map<string, string>()
  for (const g of groups) {
    for (const c of g.channels) channelToGroup.set(c.id, g.id)
  }

  // Compute last message per group
  const lastMsgByGroup = new Map<string, { content: string; authorName: string; createdAt: Date }>()
  for (const msg of lastMessages) {
    const gId = channelToGroup.get(msg.channelId)
    if (!gId) continue
    const existing = lastMsgByGroup.get(gId)
    if (!existing || msg.createdAt > existing.createdAt) {
      lastMsgByGroup.set(gId, { content: msg.content, authorName: msg.author.name, createdAt: msg.createdAt })
    }
  }

  // Compute unread per group
  const unreadByGroup = new Map<string, number>()
  for (const g of groups) {
    let groupUnread = 0
    for (const ch of g.channels) {
      const lastRead = cursorMap.get(ch.id)
      const count = await prisma.channelMessage.count({
        where: {
          channelId: ch.id,
          deletedAt: null,
          ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
        },
      })
      groupUnread += count
    }
    unreadByGroup.set(g.id, groupUnread)
  }

  const totalUnread = Array.from(unreadByGroup.values()).reduce((a, b) => a + b, 0)

  // Sort by unread desc, take top 8
  const sortedGroups = groups
    .map(g => ({
      groupId: g.id,
      name: g.name,
      type: g.type,
      unreadCount: unreadByGroup.get(g.id) ?? 0,
      lastMessagePreview: lastMsgByGroup.get(g.id)?.content.slice(0, 80) ?? null,
      lastMessageAuthor: lastMsgByGroup.get(g.id)?.authorName ?? null,
      memberCount: g._count.memberships,
    }))
    .sort((a, b) => b.unreadCount - a.unreadCount)
    .slice(0, 8)

  return { totalUnread, groups: sortedGroups, activeGroupId }
}

export function buildMessagesContextSection(data: MessagesContextData): string {
  if (data.groups.length === 0 && data.totalUnread === 0) return ''

  const lines: string[] = [`Total unread messages: ${data.totalUnread}`]

  if (data.groups.length > 0) {
    const unreadGroups = data.groups.filter(g => g.unreadCount > 0)
    if (unreadGroups.length > 0) {
      lines.push(`\nUnread threads:`)
      for (const g of unreadGroups) {
        const preview = g.lastMessagePreview ? ` — last: "${g.lastMessagePreview}" (${g.lastMessageAuthor})` : ''
        lines.push(`- **${g.name}** (${g.type.toLowerCase()}, ${g.memberCount} members): ${g.unreadCount} unread${preview}`)
      }
    }

    const activeGroup = data.activeGroupId ? data.groups.find(g => g.groupId === data.activeGroupId) : null
    if (activeGroup) {
      lines.push(`\nCurrently viewing: **${activeGroup.name}** (${activeGroup.type.toLowerCase()}, ${activeGroup.memberCount} members)`)
    }
  }

  return `\n\n## MESSAGES CONTEXT
${lines.join('\n')}

Your role here:
- Help the user catch up on unread threads — summarize what they missed
- Suggest which thread to read first based on unread count and recency
- Help compose replies or start new conversations
- Remind them about slash commands: /challenge, /study, /watch, /teachback for Live Rooms
- If they ask "what did I miss?", summarize the most active threads`
}
```

#### Step 2: Fetch in concierge route and pass to buildSystemPrompt

**File:** `app/api/concierge/route.ts`
**Location:** After the department storefront context fetch (~line 637), add conditional fetch.

```typescript
// Messages page context — unread threads, group activity
let messagesContext: string | null = null
if (currentPage?.startsWith('/messages') && user?.id) {
  try {
    const { getMessagesContext, buildMessagesContextSection } = await import('../../lib/messages/sandy-context')
    const data = await getMessagesContext(user.id, currentPage)
    if (data) {
      messagesContext = buildMessagesContextSection(data)
    }
  } catch {
    // Non-fatal
  }
}
```

#### Step 3: Inject into system prompt concatenation

**File:** `app/lib/concierge-service.ts`
**Change:** Add `messagesContext` parameter to `buildSystemPrompt()` and include in concatenation.

### Testing
1. As Tiana (student), navigate to `/messages`
2. Ask Sandy "what did I miss?"
3. Sandy should reference actual unread thread counts and group names

---

## Feature 3: Student Proactive Suggestions

### Problem
Sandy is reactive — she waits for the student to ask a question. She should proactively surface relevant suggestions based on context: upcoming deadlines they haven't studied for, tools they haven't tried, study groups that are active, flashcards due for review.

This is different from existing nudges (SR nudge, exam forge nudge, frustration nudge) — those are single-purpose injections. Proactive Suggestions is a unified service that aggregates multiple signal types into a ranked list.

### Design

**What to build:** A service that computes up to 5 ranked suggestions from multiple signal sources, formatted as a prompt section with suggested phrasings Sandy can use.

**Signal sources (checked in order):**
1. Overdue flashcards (SR due count from existing `srContext`)
2. Assignments due within 48h with no recent study session on that course
3. Active study rooms with the student's coursemates
4. Tools in enrolled courses the student has never used
5. Unread messages in course groups (cross-reference with messages context)

**Where it lives:** `app/lib/proactive-suggestions.ts` (new)

**Where it's called:** In `app/api/concierge/route.ts`, for STUDENT users only.

### Implementation

#### Step 1: Create proactive suggestions service

**File:** `app/lib/proactive-suggestions.ts` (new)

```typescript
import { prisma } from './prisma'

export interface ProactiveSuggestion {
  type: 'overdue-review' | 'upcoming-deadline' | 'active-study-room' | 'unused-tool' | 'unread-course-chat'
  priority: number // 1-10, higher = more urgent
  message: string  // Suggested phrasing for Sandy
  action?: string  // ACTION tag for clickable button
}

export async function getProactiveSuggestions(
  userId: string,
  srDueCount?: number,
): Promise<ProactiveSuggestion[]> {
  const suggestions: ProactiveSuggestion[] = []

  // Get enrolled courses
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: userId },
    select: { courseId: true, course: { select: { courseCode: true, title: true } } },
  })
  const enrolledCourseIds = enrollments.map(e => e.courseId)
  const courseCodeMap = new Map(enrollments.map(e => [e.courseId, e.course.courseCode]))

  // 1. Overdue flashcard reviews
  if (srDueCount && srDueCount > 0) {
    suggestions.push({
      type: 'overdue-review',
      priority: 8,
      message: `You have ${srDueCount} concept${srDueCount > 1 ? 's' : ''} due for review — a quick 5-minute flashcard session would lock them in.`,
      action: '<!--ACTION:{"type":"navigate","href":"/analytics/student","label":"Review Flashcards"}-->',
    })
  }

  // 2. Assignments due within 48h with no recent study session on that course
  if (enrolledCourseIds.length > 0) {
    const now = new Date()
    const twoDays = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    const upcomingAssignments = await prisma.assignment.findMany({
      where: {
        courseId: { in: enrolledCourseIds },
        dueAt: { gte: now, lte: twoDays },
        isPublished: true,
      },
      select: { id: true, title: true, dueAt: true, courseId: true },
      orderBy: { dueAt: 'asc' },
      take: 3,
    }).catch(() => [])

    for (const a of upcomingAssignments) {
      // Check if student has a session in the last 24h for this course
      const recentSession = await prisma.toolSession.findFirst({
        where: {
          userId,
          courseId: a.courseId,
          startedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      }).catch(() => null)

      if (!recentSession) {
        const cc = courseCodeMap.get(a.courseId) ?? ''
        const hoursLeft = Math.round((a.dueAt!.getTime() - now.getTime()) / (1000 * 60 * 60))
        suggestions.push({
          type: 'upcoming-deadline',
          priority: hoursLeft < 24 ? 9 : 7,
          message: `"${a.title}" (${cc}) is due in ${hoursLeft < 24 ? `${hoursLeft} hours` : 'tomorrow'} and you haven't studied for it recently.`,
          action: `<!--ACTION:{"type":"navigate","href":"/exam-forge?courseId=${a.courseId}&targetAssignmentId=${a.id}","label":"Practice for ${a.title}"}-->`,
        })
      }
    }
  }

  // 3. Active study/challenge rooms with coursemates
  if (enrolledCourseIds.length > 0) {
    const activeRooms = await prisma.liveRoom.findMany({
      where: {
        status: { in: ['WAITING', 'IN_PROGRESS'] },
        channel: {
          group: {
            courseId: { in: enrolledCourseIds },
          },
        },
      },
      select: {
        id: true,
        title: true,
        type: true,
        _count: { select: { participants: true } },
        channel: { select: { group: { select: { name: true } } } },
      },
      take: 2,
    }).catch(() => [])

    for (const room of activeRooms) {
      suggestions.push({
        type: 'active-study-room',
        priority: 6,
        message: `There's an active ${room.type.toLowerCase()} room "${room.title ?? room.channel.group.name}" with ${room._count.participants} people — want to join?`,
        action: `<!--ACTION:{"type":"navigate","href":"/community","label":"Join Room"}-->`,
      })
    }
  }

  // 4. Unused tools in enrolled courses
  if (enrolledCourseIds.length > 0) {
    const courseTools = await prisma.courseToolLink.findMany({
      where: { courseId: { in: enrolledCourseIds } },
      select: { tool: { select: { id: true, name: true } }, course: { select: { courseCode: true } } },
      take: 10,
    }).catch(() => [])

    if (courseTools.length > 0) {
      const toolIds = courseTools.map(ct => ct.tool.id)
      const usedTools = await prisma.toolSession.findMany({
        where: { userId, toolId: { in: toolIds } },
        select: { toolId: true },
        distinct: ['toolId'],
      }).catch(() => [])
      const usedSet = new Set(usedTools.map(s => s.toolId))

      const unused = courseTools.filter(ct => !usedSet.has(ct.tool.id))
      if (unused.length > 0) {
        const pick = unused[0]
        suggestions.push({
          type: 'unused-tool',
          priority: 3,
          message: `Your ${pick.course.courseCode} course has a tool called "${pick.tool.name}" that you haven't tried yet.`,
          action: `<!--ACTION:{"type":"launch","toolId":"${pick.tool.id}","label":"Try ${pick.tool.name}"}-->`,
        })
      }
    }
  }

  // Sort by priority desc, take top 5
  return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 5)
}

export function buildProactiveSuggestionsSection(suggestions: ProactiveSuggestion[]): string {
  if (suggestions.length === 0) return ''

  const lines = suggestions.map((s, i) => `${i + 1}. ${s.message}${s.action ? `\n   ${s.action}` : ''}`)

  return `\n\n## PROACTIVE SUGGESTIONS
Sandy, here are contextual suggestions to weave into the conversation when relevant. Pick AT MOST ONE to surface naturally — don't dump the list. Choose the one most relevant to what the student is doing or asking about.

${lines.join('\n')}

Rules:
- Surface at most ONE suggestion per conversation
- Weave it in naturally — "By the way..." or "I noticed..."
- If the student is clearly focused on something specific, don't interrupt with unrelated suggestions
- If no suggestion fits the conversation flow, skip them entirely`
}
```

#### Step 2: Fetch in concierge route

**File:** `app/api/concierge/route.ts`
**Location:** After SR context fetch, for STUDENT users only.

```typescript
// Proactive suggestions — unified suggestion engine for students
let proactiveSuggestionsSection: string | null = null
if (user?.role === 'STUDENT' && user.id) {
  try {
    const { getProactiveSuggestions, buildProactiveSuggestionsSection } = await import('../../lib/proactive-suggestions')
    const suggestions = await getProactiveSuggestions(user.id, srContext?.dueCount)
    const section = buildProactiveSuggestionsSection(suggestions)
    if (section) proactiveSuggestionsSection = section
  } catch {
    // Non-fatal
  }
}
```

#### Step 3: Inject into system prompt

Append `proactiveSuggestionsSection` to the system prompt in the concierge route, after the existing enrichment sections.

### Testing
1. As Tiana (student), open Sandy on any page
2. Ask "what should I work on?"
3. Sandy should reference specific upcoming deadlines, due reviews, or untried tools
4. Verify she surfaces at most one suggestion naturally in normal conversation

---

## Build Order

```
Step 1: Token Budget Monitor (no dependencies)
  └── app/lib/token-budget.ts — new utility
  └── app/api/concierge/route.ts — wire budget guard

Step 2: Messages Page Context (no dependencies)
  └── app/lib/messages/sandy-context.ts — new service
  └── app/api/concierge/route.ts — conditional fetch
  └── app/lib/concierge-service.ts — add parameter + concatenation

Step 3: Student Proactive Suggestions (uses srContext from existing Phase 1)
  └── app/lib/proactive-suggestions.ts — new service
  └── app/api/concierge/route.ts — conditional fetch + inject

Step 4: Type check + verify
  └── npx tsc --noEmit
```

---

## Files Modified

| File | Changes |
|---|---|
| `app/lib/token-budget.ts` | **New file** — `estimateTokens()`, `trimPromptToBudget()` |
| `app/lib/messages/sandy-context.ts` | **New file** — `getMessagesContext()`, `buildMessagesContextSection()` |
| `app/lib/proactive-suggestions.ts` | **New file** — `getProactiveSuggestions()`, `buildProactiveSuggestionsSection()` |
| `app/api/concierge/route.ts` | 3 new blocks: token budget guard, messages context fetch, proactive suggestions fetch |
| `app/lib/concierge-service.ts` | 1 new parameter (`messagesContext`) + concatenation update |

## Files NOT Modified
- No schema changes
- No new UI components
- No changes to `SandyAmbientContext.tsx` or `ConciergePanel.tsx`
- No changes to `concierge-utils.ts`

---

## Success Criteria

| Feature | Test | Expected |
|---|---|---|
| Token Budget | Set budget to 100 tokens, check console | Warning logged, low-priority sections dropped, Sandy still responds |
| Messages Context | Visit `/messages`, ask "what did I miss?" | Sandy lists unread threads by name with counts |
| Proactive Suggestions | As student, ask "what should I do?" | Sandy surfaces one relevant suggestion (deadline, review, or tool) |

---

## Phase 3 Preview (next sprint)
- `SandyPreferences` schema model
- Proactivity / Tone / Chip settings UI
- Settings integration

## Phase 4 Preview
- User-facing Sandy Traces (trust/transparency)
