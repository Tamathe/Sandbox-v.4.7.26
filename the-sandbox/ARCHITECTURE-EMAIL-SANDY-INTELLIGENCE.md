# Email × Sandy Intelligence Layer — Architecture Plan Document
### University of Kentucky / CATS-AI
### Draft: 2026-03-25

---

## Document Structure

| Section | Title | Sprint |
|---|---|---|
| 1.0 | Vision & Philosophy | — |
| 2.0 | Sprint 1: Proactive Email Intelligence | S1 |
| 3.0 | Sprint 2: Cross-System Reasoning | S2 |
| 4.0 | Sprint 3: Learned Email Rules | S3 |
| 5.0 | Sprint 4: Follow-Up Tracking | S4 |
| 6.0 | Sprint 5: Inline Email Cards in Sandy Panel | S5 |
| 7.0 | Sprint 6: Smart Compose Anywhere | S6 |
| 8.0 | Sprint 7: Email Urgency Scoring | S7 |
| 9.0 | Sprint 8: Thread Summarization | S8 |
| 10.0 | Sprint 9: Tone Drift Detection | S9 |
| 11.0 | Sprint 10: Email ↔ Live Rooms Bridge | S10 |
| 12.0 | Cross-Cutting Concerns | — |
| 13.0 | File Index | — |

---

## 1.0 — Vision & Philosophy

### The Insight

Sandy isn't an email client and she isn't a chatbot. She's a **context layer** that sits across email, calendar, courses, and campus life. Most products are trying to build "AI email." We're building an **AI university operating system that happens to handle email**.

That distinction is everything. A smart email client can draft replies. Sandy can say: *"Prof. Smith emailed about the midterm — I see it's on your calendar Thursday and you scored 68% on the last quiz in that course. Want me to set up a study session and draft a reply?"* No email client can do that because no email client has the rest of the graph.

### What Already Exists

The plumbing is remarkably complete:

| Layer | What's Built | Key Files |
|---|---|---|
| Data model | `AssistantEmail`, `AssistantEmailDraft`, `AssistantRule`, `AssistantActionLog` | `prisma/schema.prisma` |
| Email service | Inbox fetch, thread grouping, AI draft generation, approve/discard workflow | `app/lib/assistant/email-service.ts` |
| Mention detection | Regex scan, 4 mention types, confidence scoring, suggested actions | `app/lib/assistant/email-mention-service.ts` |
| Provider pattern | `EmailProvider` interface → `SimulatedEmailProvider` (Prisma) → future `GraphEmailProvider` (Azure) | `app/lib/assistant/providers.ts` |
| Email Rewriter | 4-phase state machine: intent → 3 variants → Sandy interview → refinement | `app/lib/email-rewriter-service.ts`, `app/hooks/useEmailRewriter.ts` |
| Sandy tool registry | 33 tools across 8 modules, including `get_unread_emails` and `draft_email` | `app/lib/agent/tool-registry.ts` |
| Ambient context | Single shared brain consumed by ConciergePanel, SandyCenter, SandyPip | `app/components/concierge/SandyAmbientContext.tsx` |
| Proactive suggestions | SR nudges, exam prep, live room suggestions — but **none for email** | `app/lib/proactive-suggestions-service.ts` |
| Briefing system | Morning briefing with insights, chips, study-action nudges | `app/components/student-home/SandyBriefing.tsx` |
| `sandy-prefill` events | Any component can trigger Sandy with context + `autoSend: true` | Custom DOM event pattern |

### Design Principles

1. **Connect the dots, don't add dots.** Every sprint wires existing systems together rather than building new silos.
2. **Proactive > reactive.** Sandy should surface email intelligence before the user asks — the same philosophy behind study nudges and beacon alerts.
3. **Simulated-first, Azure-ready.** All features work against `SimulatedEmailProvider`. When `GraphEmailProvider` arrives, everything lights up with real data. Zero UI changes.
4. **Human in the loop.** Sandy suggests, drafts, and connects — she never sends, commits, or deletes without explicit approval.
5. **Progressive disclosure.** Show the insight first. Show the details on expand. Show the action on request.

### Sprint Independence

Each sprint is **self-contained**. They build on each other thematically but not technically — any sprint can be built in isolation. This means different Claude sessions can tackle different sprints in parallel or in any order.

**Dependency graph:**

```
S1 (Proactive Email)  ←── S4 (Follow-Up Tracking) builds on S1's notification patterns
S2 (Cross-System)     ←── standalone, uses existing agent workflow templates
S3 (Learned Rules)    ←── standalone, mines existing draft approval data
S5 (Inline Cards)     ←── standalone, new component
S6 (Smart Compose)    ←── standalone, extends Email Rewriter preflight
S7 (Urgency Scoring)  ←── S1 uses it if available, but S1 works without it
S8 (Thread Summary)   ←── standalone, new API route
S9 (Tone Drift)       ←── S3 (needs learned style baseline)
S10 (Live Rooms)      ←── standalone, bridges two existing systems
```

Only two real dependencies: S4 after S1, and S9 after S3. Everything else is parallel.

---

## 2.0 — Sprint 1: Proactive Email Intelligence

### The Problem

Sandy proactively nudges students about spaced repetition flashcards, exam prep, and active study rooms. But she's **completely silent about email** — even when there's an urgent email from the Dean sitting unread. The inbox summary and mention detection services exist but are pull-only (user must navigate to inbox or ask Sandy).

### The Goal

Sandy surfaces email intelligence in the morning briefing and as proactive nudges — the same pattern as study-action insights, but for email.

### What to Build

#### 2.1 — Email Insight Generator

New service that produces `SandyInsight[]` from email data.

**File:** `app/lib/assistant/email-insight-service.ts`

```typescript
interface EmailInsight {
  type: 'email-action'
  icon: 'Mail'            // lucide icon name
  title: string           // "3 emails need your attention"
  detail: string          // "1 from the Dean (urgent), 2 student questions"
  actionType: 'sandy-message'
  actionLabel: string     // "Let Sandy triage"
  sandyMessage: string    // Pre-filled message for Sandy
  urgency: 'high' | 'medium' | 'low'
}

export async function generateEmailInsights(userId: string): Promise<EmailInsight[]>
```

**Logic:**
1. Call `getInboxSummary(userId)` — gets category counts + unread + urgent
2. Call `scanForMentions(recentEmails, userName)` — gets action-needed mentions
3. Generate 1–3 insights based on priority:
   - **High urgency:** Unread urgent emails → "Email from [sender] marked urgent — [subject snippet]"
   - **Medium urgency:** Action-requested mentions → "[N] emails mention you and need a response"
   - **Low urgency:** General unread summary → "[N] unread emails — [top categories]"
4. Each insight's `sandyMessage` pre-fills a message like: *"Triage my inbox — what needs attention today?"*

#### 2.2 — Wire Into Briefing

**File to modify:** `app/components/student-home/StudentHomepage.tsx`

Currently fetches SR nudge + community pulse in parallel. Add a third parallel fetch:

```typescript
// Existing
const [srRes, pulseRes, emailRes] = await Promise.all([
  authFetch('/api/analytics/student/sr-nudge'),
  authFetch('/api/community-pulse'),
  authFetch('/api/assistant/email/insights'),  // NEW
])
```

**File to modify:** `app/components/student-home/SandyBriefing.tsx`

Add `'email-action'` as a new insight category alongside `'study-action'`. Render with Mail icon in UK Blue (not orange — reserve orange for study nudges). Email insights render after study-action but before other categories.

#### 2.3 — New API Route

**File:** `app/api/assistant/email/insights/route.ts`

```
GET /api/assistant/email/insights
Headers: x-demo-user-email
Response: { insights: EmailInsight[] }
```

Auth: `requireRequestUser`. Calls `generateEmailInsights(user.id)`.

#### 2.4 — Faculty/Staff Briefing Integration

**File to modify:** `app/components/briefing/EmailBrief.tsx`

The faculty homepage already shows `EmailBrief`. Enhance it:
- Add a small "Sandy says:" banner at the top of the email list with the highest-urgency insight
- "Let Sandy draft responses" chip that dispatches `sandy-prefill` with: *"Draft replies to my urgent emails"*

#### 2.5 — Concierge System Prompt Injection

**File to modify:** `app/lib/concierge-service.ts`

In `buildSystemPrompt()`, after existing student intelligence injection, add email intelligence block:

```typescript
if (emailInsights.length > 0) {
  systemPrompt += `\n\n## Email Intelligence\n`
  systemPrompt += `User has ${unreadCount} unread emails.\n`
  systemPrompt += emailInsights.map(i => `- ${i.title}: ${i.detail}`).join('\n')
  systemPrompt += `\nProactively mention email status if the user hasn't checked their inbox today.`
}
```

This means Sandy can organically bring up email: *"Good morning! You have 2 emails that need attention — one from the Registrar about your hold. Want me to help?"*

### Files Changed

| File | Change |
|---|---|
| `app/lib/assistant/email-insight-service.ts` | **NEW** — insight generator |
| `app/api/assistant/email/insights/route.ts` | **NEW** — API route |
| `app/components/student-home/StudentHomepage.tsx` | Add parallel fetch |
| `app/components/student-home/SandyBriefing.tsx` | Add `email-action` category |
| `app/components/briefing/EmailBrief.tsx` | Add Sandy insight banner |
| `app/lib/concierge-service.ts` | Inject email intelligence into system prompt |

### Verification

- Switch to each demo user. Confirm email insights appear in briefing.
- Confirm "Let Sandy triage" chip opens Sandy with pre-filled message.
- Confirm Sandy's organic greeting mentions email when unread count > 0.
- `npx tsc --noEmit` passes. `npm run build` passes.

---

## 3.0 — Sprint 2: Cross-System Reasoning

### The Problem

Sandy has tools for email, calendar, courses, and analytics — but uses them independently. She answers *"What's in my inbox?"* and *"When's my next exam?"* as separate queries. She never connects: *"Prof. Smith emailed about the midterm — I see it's on your calendar Thursday and you scored 68% on the last quiz. Want me to set up a study session?"*

### The Goal

Add a **cross-reference workflow template** to Sandy's agent system prompt so she chains tools when the context overlaps.

### What to Build

#### 3.1 — Cross-Reference Workflow Template

**File to modify:** `app/lib/agent/agent-system-prompt.ts`

Currently has 6 workflow templates (morning briefing, course health, email workflows, etc.). Add a 7th:

```markdown
## Workflow: Cross-System Intelligence

When the user asks about email, calendar, courses, or grades AND the context clearly overlaps:

1. Answer the primary question first (e.g., read the email)
2. Check related systems:
   - Email mentions a course? → call get_student_progress or get_course_health
   - Email mentions a deadline? → call get_calendar to find the event
   - Email is from someone in a course? → pull their enrollment context
   - Calendar event is an exam? → check recent scores in that course
3. Synthesize: present the connected insight in ONE concise paragraph
4. Offer a concrete action: draft a reply, create a study session, set a reminder

DO NOT cross-reference every message. Only when the connection is:
- Non-obvious (the user wouldn't have thought to check)
- Actionable (there's something useful to do with the insight)
- Timely (relevant within the next 7 days)
```

#### 3.2 — Enhanced Email Tool Metadata

**File to modify:** `app/lib/agent/tools/communication-tools.ts`

Update `get_unread_emails` tool to return richer metadata that enables cross-referencing:

```typescript
// In the tool's execute function, after fetching emails:
// For each email, check if sender matches any known platform user
// If so, include their role + courses in the response
// This gives Sandy the context to cross-reference without extra tool calls
```

Add `senderContext` to email results:
```typescript
{
  ...email,
  senderContext: {
    isPlatformUser: true,
    role: 'EDUCATOR',
    courses: ['TEK-100', 'CS-201'],
  }
}
```

#### 3.3 — Calendar-Email Bridge Helper

**File:** `app/lib/assistant/cross-system-service.ts`

```typescript
export async function findRelatedCalendarEvents(
  userId: string,
  emailSubject: string,
  emailBody: string,
  windowDays: number = 7
): Promise<CalendarEvent[]>

export async function findRelatedCourseContext(
  userId: string,
  senderEmail: string
): Promise<CourseContext | null>

export async function buildCrossSystemContext(
  userId: string,
  email: AssistantEmail
): Promise<CrossSystemContext>
```

These are utility functions Sandy's tools can call internally. They don't need their own API routes — they're used by the agent loop when Sandy decides to cross-reference.

### Files Changed

| File | Change |
|---|---|
| `app/lib/agent/agent-system-prompt.ts` | Add workflow template #7 |
| `app/lib/agent/tools/communication-tools.ts` | Enrich email results with sender context |
| `app/lib/assistant/cross-system-service.ts` | **NEW** — cross-system bridge helpers |

### Verification

- In agent mode, ask Sandy: *"What's in my inbox?"* — if an email relates to an upcoming calendar event or course, Sandy should mention the connection.
- Ask: *"Email from Prof. Thompson about the midterm"* — Sandy should pull quiz scores and calendar date.
- Confirm Sandy does NOT cross-reference when irrelevant (e.g., a newsletter email).
- `npx tsc --noEmit` passes.

---

## 4.0 — Sprint 3: Learned Email Rules

### The Problem

`AssistantRule` with `ruleType='email-auto-draft'` is static — users must manually write rules like "reply to student emails warmly." But Sandy already generates drafts and tracks whether they're approved or discarded (`AssistantEmailDraft.status`). That signal goes unused.

### The Goal

Mine draft approval/discard patterns to propose new email rules automatically. After N approved drafts with similar characteristics, Sandy suggests codifying the pattern as a rule.

### What to Build

#### 4.1 — Draft Pattern Analyzer

**File:** `app/lib/assistant/email-rule-learner.ts`

```typescript
interface DraftPattern {
  category: EmailCategory        // e.g., 'student'
  commonTone: string             // e.g., 'warm, includes next steps'
  approvalRate: number           // 0-1
  sampleCount: number            // how many drafts analyzed
  proposedRule: string           // natural language rule
  confidence: number             // 0-1
}

export async function analyzeDraftPatterns(userId: string): Promise<DraftPattern[]>
export async function proposeRuleFromPattern(pattern: DraftPattern): Promise<AssistantRule | null>
```

**Logic:**
1. Query `AssistantEmailDraft` where `userId = X` and `status IN ('approved', 'discarded')`, grouped by original email's `category`
2. For each category with 5+ drafts:
   - Calculate approval rate
   - If approval rate > 0.7: Extract common traits from approved drafts (tone, length, structural patterns) using a quick Haiku call
   - Generate a proposed rule: *"When replying to student emails, use a warm tone with clear next steps"*
3. Return patterns with confidence scores

#### 4.2 — Rule Suggestion UI

**File to modify:** `app/components/assistant/AssistantEmailDraft.tsx`

After the user approves their 5th draft in a category, show a subtle banner:

```
┌──────────────────────────────────────────────────────┐
│ 💡 Sandy noticed a pattern                           │
│ You consistently approve warm replies to students    │
│ with clear next steps.                               │
│                                                      │
│ [Save as Rule]  [Not Now]                            │
└──────────────────────────────────────────────────────┘
```

"Save as Rule" calls `POST /api/assistant/rules` to create an `AssistantRule` with `ruleType='email-auto-draft'` and the learned pattern as the `content`.

#### 4.3 — Rule Suggestion API Route

**File:** `app/api/assistant/email/suggest-rules/route.ts`

```
GET /api/assistant/email/suggest-rules
Response: { patterns: DraftPattern[] }
```

Called after draft approval to check if a pattern has emerged.

#### 4.4 — Feed Learned Rules Back Into Drafting

**File to modify:** `app/lib/assistant/email-service.ts`

`draftReply()` already fetches user's email rules. No change needed — learned rules are stored as `AssistantRule` just like manual ones. The loop closes automatically.

### Files Changed

| File | Change |
|---|---|
| `app/lib/assistant/email-rule-learner.ts` | **NEW** — pattern analysis + rule proposal |
| `app/api/assistant/email/suggest-rules/route.ts` | **NEW** — API route |
| `app/components/assistant/AssistantEmailDraft.tsx` | Add rule suggestion banner |
| `app/lib/assistant/email-service.ts` | No change needed (already reads rules) |

### Verification

- Approve 5+ drafts for student emails. Confirm rule suggestion appears.
- Accept the rule. Confirm next draft for a student email reflects the learned tone.
- Discard the suggestion. Confirm it doesn't reappear for 10 more drafts.

---

## 5.0 — Sprint 4: Follow-Up Tracking

### The Problem

Sandy drafts a reply, the user approves it, and then... silence. If the recipient never responds, nobody notices. No *"Prof. Smith hasn't responded to your email from Tuesday — want me to draft a follow-up?"*

### The Goal

Track approved drafts and alert the user when a thread goes cold.

### What to Build

#### 5.1 — Follow-Up Monitor

**File:** `app/lib/assistant/email-followup-service.ts`

```typescript
interface FollowUpCandidate {
  emailId: string
  threadId: string
  subject: string
  recipient: string
  approvedAt: Date
  daysSinceApproval: number
  suggestedAction: string    // "Send a gentle follow-up" or "Check if resolved"
}

export async function getStaleThreads(
  userId: string,
  thresholdDays: number = 3
): Promise<FollowUpCandidate[]>

export async function generateFollowUpDraft(
  userId: string,
  originalEmailId: string,
  instruction?: string
): Promise<AssistantEmailDraft>
```

**Logic:**
1. Query drafts with `status = 'approved'` and `approvedAt < NOW() - thresholdDays`
2. For each, check if `threadId` has any newer emails (i.e., recipient replied)
3. If no reply: it's a follow-up candidate
4. `generateFollowUpDraft()` uses the original thread + approval context to draft a tactful follow-up

#### 5.2 — Wire Into Proactive Insights

**File to modify:** `app/lib/assistant/email-insight-service.ts` (from Sprint 1)

Add follow-up candidates as a new insight type:

```typescript
{
  type: 'email-action',
  icon: 'Clock',
  title: "No reply from Prof. Smith (3 days)",
  detail: "Re: Midterm grading question — approved draft sent Tuesday",
  actionType: 'sandy-message',
  actionLabel: 'Draft follow-up',
  sandyMessage: 'Draft a follow-up to Prof. Smith about the midterm grading question',
  urgency: 'medium'
}
```

#### 5.3 — Follow-Up API Route

**File:** `app/api/assistant/email/follow-ups/route.ts`

```
GET /api/assistant/email/follow-ups
Response: { candidates: FollowUpCandidate[] }
```

#### 5.4 — Sandy Agent Tool

**File to modify:** `app/lib/agent/tools/communication-tools.ts`

Add `check_follow_ups` tool:

```typescript
{
  name: 'check_follow_ups',
  description: 'Check for emails where you sent a reply but haven\'t heard back',
  parameters: { thresholdDays: { type: 'number', default: 3 } },
  permission: 'auto',
  execute: async (params, context) => {
    return getStaleThreads(context.userId, params.thresholdDays)
  }
}
```

### Files Changed

| File | Change |
|---|---|
| `app/lib/assistant/email-followup-service.ts` | **NEW** — stale thread detection + follow-up drafting |
| `app/api/assistant/email/follow-ups/route.ts` | **NEW** — API route |
| `app/lib/assistant/email-insight-service.ts` | Add follow-up candidates to insights (requires S1) |
| `app/lib/agent/tools/communication-tools.ts` | Add `check_follow_ups` tool |

### Dependency

Requires **Sprint 1** for the insight integration. The service + API route + Sandy tool can be built independently.

### Verification

- Approve a draft. Wait 3+ simulated days (or adjust threshold for testing). Confirm follow-up insight appears.
- Ask Sandy: *"Any emails I'm still waiting on?"* — should use `check_follow_ups` tool.
- Confirm follow-up draft references original thread naturally.

---

## 6.0 — Sprint 5: Inline Email Cards in Sandy Panel

### The Problem

When Sandy references an email in conversation, you see plain text: *"You have an email from the Dean about budget approval."* It doesn't feel like Sandy has your inbox — it feels like she's reading from a log.

### The Goal

Render rich email cards inline in Sandy's chat messages, reusing existing components.

### What to Build

#### 6.1 — Email Card Chat Embed

**File:** `app/components/concierge/SandyEmailCard.tsx`

A compact, inline email card designed for the chat bubble context:

```
┌──────────────────────────────────────────┐
│ 📧 Dean Wilson                    2h ago │
│ RE: FY27 Budget Approval                 │
│ The committee has reviewed your...       │
│                                          │
│ [Draft Reply]  [Open Thread]  [Archive]  │
└──────────────────────────────────────────┘
```

- Reuses styling from `EmailBrief.tsx` card items but adapted for chat bubble width (~320px inside the w-96 panel)
- "Draft Reply" dispatches Sandy message: *"Draft a reply to [subject]"*
- "Open Thread" navigates to thread view (if one exists)
- Unread indicator dot on left edge

#### 6.2 — Email Card Rendering in Messages

**File to modify:** `app/components/concierge/SandyMessage.tsx`

Sandy's agent tools already return structured data. When Sandy calls `get_unread_emails` or `draft_email`, the tool result includes email objects. Detect these in the message rendering pipeline:

```typescript
// In SandyMessage.tsx, after markdown rendering:
// Check for <!--EMAIL_CARD:{...}--> markers in Sandy's response
// Parse and render SandyEmailCard for each

// The agent loop in agent-loop.ts wraps email tool results with:
// <!--EMAIL_CARD:{"id":"...","from":"...","subject":"...","snippet":"...","receivedAt":"..."}-->
```

#### 6.3 — Agent Loop Email Card Injection

**File to modify:** `app/lib/agent/agent-loop.ts`

After `get_unread_emails` or `draft_email` tool execution, wrap each email result with an `<!--EMAIL_CARD:...-->` HTML comment marker (same pattern as `<!--ACTION:...-->` for navigation and `<!--CHIPS:...-->` for quick replies).

#### 6.4 — Draft Card Variant

When Sandy generates a draft reply, render a different card variant:

```
┌──────────────────────────────────────────┐
│ ✏️ Sandy's Draft                          │
│ To: Dean Wilson                          │
│ RE: FY27 Budget Approval                 │
│                                          │
│ "Thank you for the update. I've reviewed │
│ the allocation and have two questions..." │
│                                          │
│ [✓ Approve]  [✕ Discard]  [Edit]         │
└──────────────────────────────────────────┘
```

"Approve" and "Discard" call existing `/api/assistant/email/draft/[id]/approve` and `/discard` routes.

### Files Changed

| File | Change |
|---|---|
| `app/components/concierge/SandyEmailCard.tsx` | **NEW** — inline email card component |
| `app/components/concierge/SandyMessage.tsx` | Parse `<!--EMAIL_CARD:...-->` markers |
| `app/lib/agent/agent-loop.ts` | Inject email card markers after email tool results |

### Verification

- In agent mode, ask Sandy: *"What's in my inbox?"* — should render email cards, not plain text.
- Click "Draft Reply" on a card — Sandy should start drafting in the same conversation.
- Approve a draft via the card button. Confirm status updates.
- Cards should be responsive within the w-96 panel width.
- `npx tsc --noEmit` passes.

---

## 7.0 — Sprint 6: Smart Compose Anywhere

### The Problem

The Email Rewriter lives in `/write-room/email-rewriter` — a standalone page. But the most natural compose trigger is contextual: you're on a course page and want to email the professor, or you're viewing a student's profile and want to send a check-in. The compose experience should meet you where you are.

### The Goal

Enable contextual email composition from any page via Sandy, pre-filled with relevant context.

### What to Build

#### 7.1 — Compose Intent Detection

**File:** `app/lib/assistant/email-compose-service.ts`

```typescript
interface ComposeContext {
  suggestedRecipient?: { name: string; email: string; role: string }
  suggestedSubject?: string
  suggestedTone?: 'polished' | 'warm' | 'concise'
  pageContext: string           // What page the user is on
  relatedCourse?: string        // Course code if on a course page
  relatedStudent?: string       // Student name if on a student profile
}

export function buildComposeContext(
  currentPage: string,
  user: User,
  preflight: EmailRewriterPreflight
): ComposeContext
```

**Logic:**
- `/courses/[id]` → suggest instructor as recipient, course name as subject prefix
- `/registrar/student-360` → suggest student as recipient
- `/staff/*` → suggest department-appropriate tone
- Anywhere else → open compose with just user's known contacts

#### 7.2 — Sandy Compose Command

**File to modify:** `app/lib/agent/tools/communication-tools.ts`

Add `compose_email` tool:

```typescript
{
  name: 'compose_email',
  description: 'Start composing a new email with context-aware suggestions',
  parameters: {
    to: { type: 'string', description: 'Recipient (optional — Sandy will suggest)' },
    about: { type: 'string', description: 'What the email is about' },
  },
  permission: 'auto',
  execute: async (params, context) => {
    const composeCtx = buildComposeContext(context.currentPage, context.user, preflight)
    // Return compose context + suggested recipient/subject/tone
    // Client renders an inline compose card (Sprint 5 pattern)
  }
}
```

#### 7.3 — Quick Compose Chips

**File to modify:** `app/components/concierge/SandyGreeting.tsx`

Add context-aware compose chips to Sandy's greeting. On a course page:

```
[Email Prof. Thompson]  [Ask about TEK-100]
```

On the student homepage:

```
[Compose email]  [Check inbox]
```

Chips dispatch `sandy-prefill` with compose intent.

#### 7.4 — Compose Card in Sandy Panel

**File:** `app/components/concierge/SandyComposeCard.tsx`

An inline compose form inside Sandy's chat:

```
┌──────────────────────────────────────────┐
│ ✉️ New Email                              │
│ To: [Prof. Katie Thompson     ▾]         │
│ Subject: [TEK-100 Question        ]      │
│                                          │
│ [Write it myself]                        │
│ [Sandy, draft this for me]               │
│                                          │
│ Tone: (Polished) (Warm) (Concise)        │
└──────────────────────────────────────────┘
```

- "Write it myself" opens the Email Rewriter page with pre-filled context
- "Sandy, draft this for me" triggers the draft workflow in-panel
- Recipient dropdown populated from `preflight.knownContacts`

### Files Changed

| File | Change |
|---|---|
| `app/lib/assistant/email-compose-service.ts` | **NEW** — context-aware compose builder |
| `app/components/concierge/SandyComposeCard.tsx` | **NEW** — inline compose card |
| `app/lib/agent/tools/communication-tools.ts` | Add `compose_email` tool |
| `app/components/concierge/SandyGreeting.tsx` | Add compose chips |
| `app/components/concierge/SandyMessage.tsx` | Parse `<!--COMPOSE_CARD:...-->` markers |

### Verification

- Navigate to a course page. Sandy's greeting should include "Email [instructor]" chip.
- Click chip → compose card appears with pre-filled recipient and subject.
- "Sandy, draft this for me" → Sandy drafts inline with approve/discard.
- "Write it myself" → navigates to Email Rewriter with context preserved via URL params.
- `npx tsc --noEmit` passes.

---

## 8.0 — Sprint 7: Email Urgency Scoring

### The Problem

Emails have a coarse `category` field (student, admin, department, external, newsletter, urgent) but no nuanced urgency scoring. The "urgent" category is binary and set at ingest time. A more useful signal is a **priority score** that considers content, sender importance, time sensitivity, and user context.

### The Goal

Score every email on urgency at ingest time. Surface high-urgency emails prominently across all email surfaces.

### What to Build

#### 8.1 — Urgency Scorer

**File:** `app/lib/assistant/email-urgency-service.ts`

```typescript
interface UrgencyScore {
  score: number           // 0-100
  bucket: 'respond-today' | 'this-week' | 'when-free' | 'archive'
  reasons: string[]       // ["deadline mentioned (tomorrow)", "sender is department head"]
}

export async function scoreEmailUrgency(
  email: AssistantEmail,
  userContext: { role: string; courses: string[]; department: string }
): Promise<UrgencyScore>
```

**Scoring heuristics (no LLM call — fast and cheap):**

| Signal | Points |
|---|---|
| Category is `urgent` | +40 |
| Category is `admin` or `department` | +15 |
| Subject contains deadline keywords (ASAP, urgent, by EOD, deadline, due) | +20 |
| Body contains a question directed at user | +10 |
| Sender is in user's department or course roster | +10 |
| Sender is admin/dean-level | +15 |
| Email is a reply in an active thread (< 24h) | +10 |
| Email age < 2 hours | +5 |
| Email is newsletter category | -20 |
| Email is external and not from known contact | -10 |

**Bucket mapping:**
- 70+ → `respond-today`
- 40-69 → `this-week`
- 20-39 → `when-free`
- 0-19 → `archive`

#### 8.2 — Schema Addition

**File to modify:** `prisma/schema.prisma`

Add to `AssistantEmail`:

```prisma
urgencyScore    Int?        @default(0)
urgencyBucket   String?     @default("when-free")   // respond-today | this-week | when-free | archive
urgencyReasons  String[]    @default([])
```

Migration: `npx prisma migrate dev --name add-email-urgency-fields`

#### 8.3 — Score at Ingest

**File to modify:** `app/lib/assistant/simulated-email.ts`

After fetching/creating simulated emails, run `scoreEmailUrgency()` and persist the score. For the future `GraphEmailProvider`, scoring happens at sync time.

#### 8.4 — Surface in Email Components

**Files to modify:**
- `app/components/briefing/EmailBrief.tsx` — sort by urgency score, show bucket badges
- `app/components/briefing/EmailTriageStack.tsx` — prioritize "respond-today" cards first
- `app/components/student-home/InboxPreview.tsx` — show urgency dot (red/amber/none)
- `app/components/assistant/AssistantInboxSummary.tsx` — add urgency breakdown

### Files Changed

| File | Change |
|---|---|
| `app/lib/assistant/email-urgency-service.ts` | **NEW** — heuristic urgency scorer |
| `prisma/schema.prisma` | Add urgency fields to AssistantEmail |
| `app/lib/assistant/simulated-email.ts` | Score at ingest time |
| `app/components/briefing/EmailBrief.tsx` | Sort by urgency, show badges |
| `app/components/briefing/EmailTriageStack.tsx` | Prioritize respond-today |
| `app/components/student-home/InboxPreview.tsx` | Urgency dot |
| `app/components/assistant/AssistantInboxSummary.tsx` | Urgency breakdown |

### Verification

- Check that seeded emails get scored on ingest.
- Faculty homepage shows "respond-today" emails first with red badge.
- Student inbox preview shows urgency dots.
- Sandy's inbox summary tool (`get_unread_emails`) returns urgency data.
- Migration applies cleanly. `npx tsc --noEmit` passes.

---

## 9.0 — Sprint 8: Thread Summarization

### The Problem

Long email threads are painful to read. When a thread has 5+ messages, the user has to scan every message to understand what happened. Sandy could summarize the thread in one paragraph.

### The Goal

Auto-summarize email threads on demand, with the summary cached for performance.

### What to Build

#### 9.1 — Thread Summarizer

**File:** `app/lib/assistant/email-thread-summary-service.ts`

```typescript
interface ThreadSummary {
  threadId: string
  messageCount: number
  summary: string           // 2-3 sentences
  keyDecisions: string[]    // Bullet points of decisions/action items
  lastActivity: Date
  needsResponse: boolean    // Does the thread end with a question to the user?
  cachedAt: Date
}

export async function summarizeThread(
  userId: string,
  threadId: string,
  forceRefresh?: boolean
): Promise<ThreadSummary>
```

**Logic:**
1. Fetch all emails in thread via `getThread(userId, threadId)`
2. Check cache — if summary exists and no new messages since `cachedAt`, return cached
3. Build prompt with full thread chronologically
4. Call Haiku with: *"Summarize this email thread in 2-3 sentences. List any decisions made or action items. Note if the last message requires a response from [userName]."*
5. Parse response, cache in a new `AssistantThreadSummary` model (or store on the thread's first email as JSON)

#### 9.2 — API Route

**File:** `app/api/assistant/email/thread/[threadId]/summary/route.ts`

```
GET /api/assistant/email/thread/:threadId/summary
Response: { summary: ThreadSummary }
```

#### 9.3 — Thread Summary in Email Components

**File to modify:** `app/components/briefing/EmailBrief.tsx`

For emails that are part of a thread (threadId exists), show a collapsible summary:

```
┌──────────────────────────────────────────┐
│ 📧 Dean Wilson → You → Dean Wilson       │
│ RE: FY27 Budget Approval (5 messages)    │
│                                          │
│ 📝 Started as a budget review request.   │
│ You proposed Option B. Dean asked for    │
│ revised numbers. Last message asks you   │
│ to confirm the final allocation.         │
│                                          │
│ ⚡ Action needed: Confirm allocation      │
│                                          │
│ [Draft Reply]  [View Thread]             │
└──────────────────────────────────────────┘
```

#### 9.4 — Sandy Tool

**File to modify:** `app/lib/agent/tools/communication-tools.ts`

Add `summarize_thread` tool:

```typescript
{
  name: 'summarize_thread',
  description: 'Summarize an email thread — useful for long conversations',
  parameters: { threadId: { type: 'string', required: true } },
  permission: 'auto',
  execute: async (params, context) => {
    return summarizeThread(context.userId, params.threadId)
  }
}
```

### Files Changed

| File | Change |
|---|---|
| `app/lib/assistant/email-thread-summary-service.ts` | **NEW** — thread summarization + caching |
| `app/api/assistant/email/thread/[threadId]/summary/route.ts` | **NEW** — API route |
| `app/components/briefing/EmailBrief.tsx` | Thread summary card |
| `app/lib/agent/tools/communication-tools.ts` | Add `summarize_thread` tool |

### Verification

- View a thread with 3+ messages. Confirm summary appears.
- Ask Sandy to summarize a thread. Confirm output matches.
- Refresh — should use cached summary (check that Haiku is NOT called twice).
- `npx tsc --noEmit` passes.

---

## 10.0 — Sprint 9: Tone Drift Detection

### The Problem

During high-stress periods (finals, budget season), people's email tone shifts unconsciously — replies get shorter, less warm, more terse. The user doesn't notice, but recipients do. Sandy has the data to detect this: `UserMemory` with `category=WRITING_STYLE` establishes a baseline, and approved drafts show the trajectory.

### The Goal

Detect when the user's approved drafts diverge from their established writing style and gently flag it.

### What to Build

#### 10.1 — Tone Drift Analyzer

**File:** `app/lib/assistant/email-tone-drift-service.ts`

```typescript
interface ToneDriftSignal {
  detected: boolean
  direction: 'more-terse' | 'more-formal' | 'more-casual' | 'stable'
  magnitude: 'slight' | 'notable' | 'significant'
  baselineTone: string        // From UserMemory WRITING_STYLE
  recentTone: string          // Analyzed from last N approved drafts
  suggestion: string          // "Your last few replies were shorter than usual — want me to warm up this draft?"
}

export async function detectToneDrift(userId: string): Promise<ToneDriftSignal>
```

**Logic:**
1. Fetch baseline from `UserMemory` where `category = 'WRITING_STYLE'`
2. Fetch last 10 approved drafts
3. If fewer than 5 approved drafts exist → return `{ detected: false }` (not enough data)
4. Use Haiku to compare: *"Compare this writing style baseline with these recent 5 drafts. Has the tone shifted? If so, how?"*
5. Parse structured response

#### 10.2 — Surface in Draft Flow

**File to modify:** `app/lib/assistant/email-service.ts`

In `draftReply()`, after generating the draft, run a lightweight tone check. If drift is detected:

Add a field to the draft response:

```typescript
{
  draft: { ... },
  toneDriftWarning: {
    detected: true,
    suggestion: "Your recent replies have been more terse than your usual style. Want me to warm this one up?"
  }
}
```

**File to modify:** `app/components/assistant/AssistantEmailDraft.tsx`

If `toneDriftWarning.detected`, show a subtle amber banner above the draft:

```
┌──────────────────────────────────────────────────────┐
│ ☀️ Your recent replies have been shorter than usual.  │
│ Want me to warm up this draft?                       │
│                                                      │
│ [Warm It Up]  [Keep As Is]                           │
└──────────────────────────────────────────────────────┘
```

"Warm It Up" triggers a re-draft with an explicit warmth instruction.

### Dependency

Requires **Sprint 3** (Learned Email Rules) for a meaningful baseline. If the user has no `WRITING_STYLE` memory and no rule history, there's nothing to drift *from*. Sprint 9 degrades gracefully — it simply returns `{ detected: false }`.

### Files Changed

| File | Change |
|---|---|
| `app/lib/assistant/email-tone-drift-service.ts` | **NEW** — tone comparison + drift detection |
| `app/lib/assistant/email-service.ts` | Add tone drift check to draft flow |
| `app/components/assistant/AssistantEmailDraft.tsx` | Amber warning banner + "Warm It Up" action |

### Verification

- Approve 5+ drafts with warm tone. Then manually edit a draft to be terse before approving. Confirm drift detection triggers on next draft.
- Confirm "Warm It Up" produces a noticeably warmer redraft.
- Confirm no warning when baseline is consistent with recent drafts.
- `npx tsc --noEmit` passes.

---

## 11.0 — Sprint 10: Email ↔ Live Rooms Bridge

### The Problem

When an email thread has multiple participants and is going in circles, the best move is to stop emailing and talk in real time. But no email client suggests that. Sandy can — because she knows about both email threads AND Live Rooms.

### The Goal

When Sandy detects a circular or multi-party email thread, she suggests spinning up a Live Room to resolve it.

### What to Build

#### 11.1 — Thread Stall Detector

**File:** `app/lib/assistant/email-liveroom-bridge-service.ts`

```typescript
interface ThreadStallSignal {
  threadId: string
  participantCount: number
  messageCount: number
  isCircular: boolean         // Same points being repeated
  isDecisionBlocked: boolean  // Thread asks for a decision nobody's making
  suggestedRoomType: 'CHALLENGE' | 'STUDY' | 'TEACHBACK' | null
  suggestedTopic: string
  suggestion: string          // "This thread has 4 people and 7 replies. Want to spin up a Live Room to hash it out?"
}

export async function detectThreadStall(
  userId: string,
  threadId: string
): Promise<ThreadStallSignal>
```

**Logic:**
1. Fetch thread via `getThread(userId, threadId)`
2. If `participantCount < 3` OR `messageCount < 4` → return no signal
3. Use Haiku: *"Is this email thread productive or stalling? Are the same points being repeated? Is a decision blocked?"*
4. If stalling: suggest a Live Room type based on context
   - Academic discussion → TEACHBACK
   - Study group coordination → STUDY
   - Quiz/exam prep thread → CHALLENGE
   - General meeting → fall back to "create a group chat and use /challenge or /study"

#### 11.2 — Sandy Integration

**File to modify:** `app/lib/agent/agent-system-prompt.ts`

Add to the Cross-System Intelligence workflow (from Sprint 2):

```markdown
- Email thread has 3+ participants and 4+ messages? → Check for thread stall
- If stalling: suggest a Live Room. Use: "This thread seems to be going in circles —
  want me to create a [room type] so you can resolve it in real time?"
```

**File to modify:** `app/lib/agent/tools/communication-tools.ts`

Add `detect_thread_stall` tool:

```typescript
{
  name: 'detect_thread_stall',
  description: 'Check if an email thread is going in circles and suggest a Live Room',
  parameters: { threadId: { type: 'string', required: true } },
  permission: 'auto',
  execute: async (params, context) => {
    return detectThreadStall(context.userId, params.threadId)
  }
}
```

#### 11.3 — Thread Summary Integration

If Sprint 8 (Thread Summarization) is already built, the thread summary's `needsResponse` and `keyDecisions` fields feed directly into stall detection — reducing the need for an extra Haiku call.

#### 11.4 — Inline Room Creation Card

**File to modify:** `app/components/concierge/SandyMessage.tsx`

When Sandy suggests a Live Room from an email thread, render an action card:

```
┌──────────────────────────────────────────┐
│ 🔄 Thread seems stuck                    │
│ 4 people, 7 messages, same 2 points      │
│                                          │
│ [Create Study Room]  [Keep Emailing]     │
└──────────────────────────────────────────┘
```

"Create Study Room" calls `/api/live-rooms` (existing endpoint) with the thread topic and participants.

### Files Changed

| File | Change |
|---|---|
| `app/lib/assistant/email-liveroom-bridge-service.ts` | **NEW** — thread stall detection |
| `app/lib/agent/agent-system-prompt.ts` | Add stall detection to workflow template |
| `app/lib/agent/tools/communication-tools.ts` | Add `detect_thread_stall` tool |
| `app/components/concierge/SandyMessage.tsx` | Inline room creation card |

### Verification

- Create a simulated thread with 4+ participants and 5+ messages that repeat the same points.
- Ask Sandy about the thread. Confirm she detects the stall and suggests a Live Room.
- Click "Create Study Room" — confirm room is created with thread topic.
- Confirm no suggestion for short, productive threads.
- `npx tsc --noEmit` passes.

---

## 12.0 — Cross-Cutting Concerns

### Provider Pattern

All 10 sprints work against `SimulatedEmailProvider`. When `GraphEmailProvider` (Azure) arrives:

- Sprints 1, 4, 7 (inbox insights, follow-ups, urgency) work automatically — they read from the same `AssistantEmail` model that Graph will sync into
- Sprint 2 (cross-system) works automatically — calendar and email providers both swap
- Sprint 6 (smart compose) works automatically — known contacts come from preflight, which reads the user model
- Sprint 10 (Live Rooms bridge) works automatically — threads come from the provider

**Zero UI changes required for Azure transition.**

### Cost Control

| Sprint | LLM Calls | When | Model |
|---|---|---|---|
| S1 | 0 | — | No LLM — pure aggregation |
| S2 | 0 extra | Agent loop | Tools are data lookups |
| S3 | 1 per pattern | Rule suggestion time | Haiku |
| S4 | 1 per follow-up | Draft generation | Sonnet (reuses draftReply) |
| S5 | 0 | — | Rendering only |
| S6 | 0-1 | Compose context | Haiku (optional) |
| S7 | 0 | — | Heuristic scoring only |
| S8 | 1 per thread | First view (cached after) | Haiku |
| S9 | 1 per drift check | Draft generation time | Haiku |
| S10 | 1 per stall check | On-demand | Haiku |

Total incremental cost: minimal. Most sprints add zero or one Haiku call per interaction, and several (S1, S5, S7) use no LLM at all.

### Demo User Coverage

| Sprint | Heath (ADMIN) | Katie (EDUCATOR) | Tiana (STUDENT) | Morgan (STAFF) |
|---|---|---|---|---|
| S1 Proactive Email | ✓ briefing | ✓ EmailBrief | ✓ SandyBriefing | ✓ briefing |
| S2 Cross-System | ✓ agent mode | ✓ agent mode | ✓ agent mode | ✓ agent mode |
| S3 Learned Rules | ✓ | ✓ | ✓ | ✓ |
| S4 Follow-Ups | ✓ | ✓ | ✓ | ✓ |
| S5 Inline Cards | ✓ | ✓ | ✓ | ✓ |
| S6 Smart Compose | ✓ | ✓ course chips | ✓ course chips | ✓ |
| S7 Urgency Scoring | ✓ | ✓ EmailBrief | ✓ InboxPreview | ✓ |
| S8 Thread Summary | ✓ | ✓ | ✓ | ✓ |
| S9 Tone Drift | ✓ | ✓ | ✓ | ✓ |
| S10 Live Rooms | — | ✓ course threads | ✓ study threads | — |

### Recommended Build Order

For maximum demo impact with minimal dependencies:

```
Phase A — Foundation (do first)
├── S1: Proactive Email Intelligence  ← makes Sandy feel alive
├── S5: Inline Email Cards            ← makes Sandy feel real
└── S7: Urgency Scoring               ← makes inbox feel smart

Phase B — Intelligence (do second)
├── S2: Cross-System Reasoning        ← the "wow" moment
├── S8: Thread Summarization          ← instant clarity
└── S3: Learned Email Rules           ← Sandy gets smarter over time

Phase C — Polish (do third)
├── S4: Follow-Up Tracking            ← nothing falls through cracks (needs S1)
├── S6: Smart Compose Anywhere        ← compose meets you where you are
├── S9: Tone Drift Detection          ← emotional intelligence (needs S3)
└── S10: Email ↔ Live Rooms Bridge    ← the "no other product does this" moment
```

Each phase is 2-3 Claude sessions. Total: 6-9 sessions across all 10 sprints.

---

## 13.0 — File Index

### New Files (10 sprints)

| File | Sprint | Purpose |
|---|---|---|
| `app/lib/assistant/email-insight-service.ts` | S1 | Proactive email insight generator |
| `app/api/assistant/email/insights/route.ts` | S1 | Insights API |
| `app/lib/assistant/cross-system-service.ts` | S2 | Calendar-email-course bridge helpers |
| `app/lib/assistant/email-rule-learner.ts` | S3 | Draft pattern analysis + rule proposals |
| `app/api/assistant/email/suggest-rules/route.ts` | S3 | Rule suggestion API |
| `app/lib/assistant/email-followup-service.ts` | S4 | Stale thread detection + follow-up drafting |
| `app/api/assistant/email/follow-ups/route.ts` | S4 | Follow-ups API |
| `app/components/concierge/SandyEmailCard.tsx` | S5 | Inline email card for chat |
| `app/lib/assistant/email-compose-service.ts` | S6 | Context-aware compose builder |
| `app/components/concierge/SandyComposeCard.tsx` | S6 | Inline compose card for chat |
| `app/lib/assistant/email-urgency-service.ts` | S7 | Heuristic urgency scorer |
| `app/lib/assistant/email-thread-summary-service.ts` | S8 | Thread summarization + caching |
| `app/api/assistant/email/thread/[threadId]/summary/route.ts` | S8 | Thread summary API |
| `app/lib/assistant/email-tone-drift-service.ts` | S9 | Tone comparison + drift detection |
| `app/lib/assistant/email-liveroom-bridge-service.ts` | S10 | Thread stall detection + Live Room suggestion |

### Modified Files (across sprints)

| File | Sprints |
|---|---|
| `app/lib/concierge-service.ts` | S1 |
| `app/lib/agent/agent-system-prompt.ts` | S2, S10 |
| `app/lib/agent/tools/communication-tools.ts` | S2, S4, S6, S8, S10 |
| `app/lib/agent/agent-loop.ts` | S5 |
| `app/lib/assistant/email-service.ts` | S9 |
| `app/lib/assistant/simulated-email.ts` | S7 |
| `app/components/concierge/SandyMessage.tsx` | S5, S6, S10 |
| `app/components/concierge/SandyGreeting.tsx` | S6 |
| `app/components/student-home/StudentHomepage.tsx` | S1 |
| `app/components/student-home/SandyBriefing.tsx` | S1 |
| `app/components/briefing/EmailBrief.tsx` | S1, S7, S8 |
| `app/components/briefing/EmailTriageStack.tsx` | S7 |
| `app/components/student-home/InboxPreview.tsx` | S7 |
| `app/components/assistant/AssistantInboxSummary.tsx` | S7 |
| `app/components/assistant/AssistantEmailDraft.tsx` | S3, S9 |
| `prisma/schema.prisma` | S7 |

---

## Appendix: The Patent Angle

These 10 sprints collectively demonstrate a system that:

1. **Observes** user communication patterns across an institutional platform (S3, S9)
2. **Reasons** across independently-sourced data systems (email + calendar + courses + analytics) to produce non-obvious insights (S2, S10)
3. **Proactively surfaces** actionable intelligence without user prompting (S1, S4)
4. **Learns** user preferences from implicit behavioral signals (draft approval/discard) rather than explicit configuration (S3)
5. **Detects** emotional state shifts in professional communication and intervenes constructively (S9)
6. **Bridges** asynchronous and synchronous communication modalities based on conversation dynamics (S10)

Each of these is a defensible claim in the context of a university operating system with a unified AI persona. The interdependencies between them — Sandy using email urgency to prioritize cross-system reasoning, tone drift feeding back into learned rules, thread stall detection triggering Live Room creation — form the kind of **system-of-systems intelligence** that Section 101 reviewers look for as evidence of a "specific, practical application."

See `memory/project_patent_filing.md` for filing strategy.
