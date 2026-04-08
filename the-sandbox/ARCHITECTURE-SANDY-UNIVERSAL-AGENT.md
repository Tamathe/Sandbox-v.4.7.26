# Sandy Universal Agent — Architecture Plan Document
### University of Kentucky / CATS-AI
### Draft: 2026-03-24

---

## Document Structure

| Section | Title | Status |
|---|---|---|
| 1.0 | Vision & Demo Priorities | Draft |
| 2.0 | Agent Loop Architecture | Draft |
| 3.0 | MCP Tool Registry | Draft |
| 4.0 | Approval & Transparency Layer | Draft |
| 5.0 | Sandy's Tool Catalog (Full) | Draft |
| 6.0 | Multi-Step Workflow Engine | Draft |
| 7.0 | Background Agent System (Tier 3) | Draft |
| 8.0 | Client-Side Changes | Draft |
| 9.0 | Migration from Current Architecture | Draft |
| 10.0 | Demo Playbook — Universal Agent Beats | Draft |
| 11.0 | Implementation Phases | Draft |

---

## 1.0 — Vision & Demo Priorities

### The Core Idea

Sandy today is a **context-aware intelligence layer** — she knows everything about you, your courses, your students, your schedule. But she can only **talk about** things. She can't **do** things.

Universal Agent Sandy can **act**. Anything on the platform that could be optimized by agentic AI flows through Sandy. She plans, executes multi-step workflows, calls platform tools, and reports back — with the user always in the loop.

### What Changes

| Today | Universal Agent |
|---|---|
| Sandy describes what you could do | Sandy does it (with approval) |
| One message → one response | One request → multi-step plan → execution → results |
| `<!--ACTION:navigate-->` text parsing | Claude native `tools` parameter with real function calling |
| Context dumped into system prompt | Sandy discovers and calls tools on demand |
| No write access to platform | Full CRUD via MCP tool servers |
| Stateless per-message | Stateful agent loop with memory |
| Chat-only interaction | Chat + action cards + progress indicators + approval gates |

### Demo-First Principles

This is being built to demo. Every decision optimizes for:

1. **Wow factor** — Multi-step workflows that visibly do real things
2. **Transparency** — Evaluators see Sandy thinking, planning, executing (not a black box)
3. **Reliability** — Happy path must work perfectly every time; edge cases can be handled later
4. **Speed to build** — Reuse existing API routes as MCP tools rather than rewriting
5. **Cost is not a constraint** — Use Sonnet for everything, no model routing optimization yet

### What NOT to Build (Yet)

- Cost optimization / model routing (Haiku for dispatch, Sonnet for reasoning)
- Horizontal scaling / queue infrastructure
- Real external integrations (Canvas, Google Workspace, Outlook)
- Persistent agent memory across sessions
- Agent-to-agent communication
- Retry/fallback logic for failed tool calls
- Rate limiting on agent loops

---

## 2.0 — Agent Loop Architecture

### The Agentic Loop

Sandy's concierge route transforms from a single-shot chat endpoint into an **agentic loop** that can plan and execute multi-step workflows.

```
User message
     │
     ▼
┌─────────────────────────────────────────┐
│           SANDY AGENT LOOP              │
│                                         │
│  1. Receive message + conversation      │
│  2. Claude reasons over context + tools │
│  3. If tool_use → execute tool(s)       │
│     ├─ Read-only? → auto-execute        │
│     └─ Write/send? → request approval   │
│  4. Feed tool results back to Claude    │
│  5. Claude reasons again                │
│  6. Repeat 3-5 until end_turn          │
│  7. Stream final response to user       │
│                                         │
│  Max iterations: 10 (safety cap)        │
│  Max tool calls per turn: 5             │
└─────────────────────────────────────────┘
     │
     ▼
Streamed response with embedded
action results + approval requests
```

### Server-Side Agent (Not Client-Side)

The agent loop runs **server-side** in the Next.js API route. Reasons:

- **Security** — Tool execution never touches the browser; auth is server-to-server
- **Simplicity** — No client-side orchestration; client just renders a stream
- **Demo reliability** — One streaming connection, no complex state sync
- **Background capability** — Can later run without a browser tab open

### Streaming Protocol

The client receives a single SSE stream. The stream contains interleaved content:

```
data: {"type":"thinking","content":"I'll check your calendar and unread emails..."}
data: {"type":"tool_call","tool":"check_calendar","args":{"date":"2026-03-25"}}
data: {"type":"tool_result","tool":"check_calendar","result":{...}}
data: {"type":"approval_request","id":"apr_123","action":"send_email","preview":{...}}
data: {"type":"text","content":"You have 3 meetings tomorrow..."}
data: {"type":"done"}
```

The client renders:
- **Thinking** → Sandy's avatar with animated "thinking" indicator + text
- **Tool calls** → Collapsible "Sandy is checking your calendar..." cards
- **Tool results** → Inline result previews (calendar view, email list, etc.)
- **Approval requests** → Action cards with Approve / Edit / Reject buttons
- **Text** → Normal chat bubbles

### Claude API Integration

Switch from manual streaming to Claude's `tools` parameter:

```typescript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6-20250514',
  max_tokens: 4096,
  system: buildAgentSystemPrompt(user, currentPage, toolRegistry),
  messages: conversationHistory,
  tools: toolRegistry.getToolDefinitions(user.role),
  // Let Claude decide when to use tools
});

// Agent loop: keep going while Claude wants to call tools
while (response.stop_reason === 'tool_use') {
  const toolResults = await executeToolCalls(response.content, user);
  conversationHistory.push({ role: 'assistant', content: response.content });
  conversationHistory.push({ role: 'user', content: toolResults });
  response = await anthropic.messages.create({ ...sameParams, messages: conversationHistory });
}
```

### System Prompt (Leaner)

Today's system prompt dumps everything upfront (~4000 tokens of context). The agent version is leaner because Sandy can **ask for what she needs** via tools:

```
You are Sandy, the AI assistant for the platform at the University of Kentucky.
You have access to tools that let you take real actions on the platform.

RULES:
- Always explain what you're about to do before doing it
- For actions that modify data or send communications, ask for approval first
- Show your work — users should see what tools you called and why
- If a multi-step workflow is needed, outline the plan before executing
- You can call multiple tools in parallel when they're independent

CURRENT CONTEXT:
- User: {name} ({role})
- Page: {currentPage}
- Time: {now}
```

The rest (courses, students, analytics) comes from tool calls, not prompt stuffing.

---

## 3.0 — MCP Tool Registry

### Why MCP

Model Context Protocol (MCP) gives us:
- **Standardized tool definitions** — JSON Schema for every tool, compatible with Claude's `tools` parameter
- **Transport flexibility** — stdio for local dev, SSE for production
- **Tool discovery** — Sandy can enumerate available tools at runtime
- **Ecosystem** — Future compatibility with other MCP clients/servers

### Demo Approach: MCP-Lite

For the demo, we don't need full MCP transport. We need the **interface pattern**:

Each tool domain is a TypeScript module that exports:
1. **Tool definitions** — JSON Schema compatible with Claude's `tools` parameter
2. **Tool handlers** — Async functions that execute the tool and return results
3. **Permission metadata** — Which roles can call which tools, read vs. write classification

```typescript
// app/lib/agent/tools/academic-tools.ts
import { ToolDefinition, ToolHandler } from '../agent-types';

export const tools: ToolDefinition[] = [
  {
    name: 'get_course_roster',
    description: 'Get the student roster for a course, including enrollment status and last activity date.',
    category: 'academic',
    permission: 'read',
    roles: ['EDUCATOR', 'ADMIN', 'REGISTRAR'],
    input_schema: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'The course ID' },
      },
      required: ['courseId'],
    },
  },
  // ...more tools
];

export const handlers: Record<string, ToolHandler> = {
  async get_course_roster({ courseId }, user) {
    // Reuse existing service logic
    const roster = await prisma.enrollment.findMany({
      where: { courseId },
      include: { student: { select: { name: true, email: true } } },
    });
    return { students: roster.map(r => ({ ...r.student, status: r.status })) };
  },
};
```

### Tool Registry Service

A central registry that aggregates all tool modules:

```typescript
// app/lib/agent/tool-registry.ts
export class ToolRegistry {
  private tools: Map<string, RegisteredTool>;

  // Get Claude-compatible tool definitions filtered by user role
  getToolDefinitions(role: UserRole): AnthropicTool[] { ... }

  // Execute a tool call with auth checks
  async execute(toolName: string, args: any, user: AuthUser): Promise<ToolResult> { ... }

  // Check if a tool requires approval
  requiresApproval(toolName: string): boolean { ... }
}
```

### File Structure

```
app/lib/agent/
├── agent-types.ts              # Shared types (ToolDefinition, ToolResult, AgentState, etc.)
├── agent-loop.ts               # Core agentic loop (plan → execute → observe → respond)
├── tool-registry.ts            # Central registry that aggregates all tool modules
├── agent-system-prompt.ts      # Leaner system prompt builder for agent mode
├── approval-manager.ts         # Tracks pending approvals, resolves via SSE
├── tools/
│   ├── academic-tools.ts       # Courses, assignments, grading, materials
│   ├── analytics-tools.ts      # Student progress, course health, reports
│   ├── communication-tools.ts  # Messages, emails, announcements
│   ├── calendar-tools.ts       # Calendar, scheduling, reminders
│   ├── campus-tools.ts         # Policies, directory, room booking, forms
│   ├── content-tools.ts        # Quiz generation, rubrics, study guides
│   ├── registrar-tools.ts      # Degree audit, enrollment, holds, standing
│   ├── staff-tools.ts          # Briefings, policy search, committee minutes
│   └── sandy-tools.ts          # Self-referential (check own context, recall prior conversations)
```

---

## 4.0 — Approval & Transparency Layer

### Permission Classification

Every tool is classified as one of:

| Level | Behavior | Examples |
|---|---|---|
| **auto** | Execute immediately, show result | `get_course_roster`, `check_calendar`, `lookup_policy`, `query_student_progress` |
| **confirm** | Show preview + Approve/Reject buttons | `send_message`, `post_announcement`, `create_assignment`, `submit_grade` |
| **explain** | Show plan before executing multi-step | Any workflow with 3+ tool calls |

### Approval Flow (SSE-Based)

When Sandy hits a `confirm` tool:

1. **Server** pauses the agent loop
2. **Server** sends an `approval_request` SSE event with:
   - Action description ("Send email to dean@uky.edu")
   - Preview of the action (email body, message content, etc.)
   - Unique approval ID
3. **Client** renders an approval card with Approve / Edit / Reject
4. **Client** sends approval decision via POST to `/api/agent/approve`
5. **Server** resumes the agent loop with the decision
6. If rejected, Claude gets `{"status":"rejected","reason":"User declined"}` and adapts

### Transparency UI

The chat stream renders a **timeline view** for multi-step workflows:

```
┌─────────────────────────────────────────────┐
│ Sandy is preparing your morning briefing... │
│                                             │
│  ✅ Checked calendar (3 meetings tomorrow)  │
│  ✅ Scanned unread emails (7 new, 2 urgent) │
│  ✅ Reviewed student submissions (14 ungraded)│
│  ⏳ Drafting email reply to Dean...         │
│     └─ [Preview] [Approve] [Edit] [Skip]    │
│  ○ Check at-risk students                   │
│  ○ Generate summary                         │
└─────────────────────────────────────────────┘
```

Each step is collapsible. Users can expand to see raw tool inputs/outputs. This is the "show your work" principle — evaluators see Sandy is doing real things, not hallucinating.

### Audit Log

Every tool execution is logged:

```typescript
interface AgentActionLog {
  id: string;
  userId: string;
  sessionId: string;
  toolName: string;
  toolArgs: Record<string, any>;
  result: Record<string, any>;
  approved: boolean | null;  // null = auto-approved (read-only)
  timestamp: Date;
}
```

For the demo, this is an in-memory array. Post-demo, it becomes a Prisma model.

---

## 5.0 — Sandy's Tool Catalog

### Academic Tools

| Tool | Type | Description | Demo Priority |
|---|---|---|---|
| `get_courses` | auto | List user's courses with enrollment counts | P0 |
| `get_course_roster` | auto | Student list for a course | P0 |
| `get_course_materials` | auto | Modules and materials for a course | P0 |
| `get_student_progress` | auto | Individual student analytics (scores, activity, concepts) | P0 |
| `get_at_risk_students` | auto | Students with risk score >= threshold | P0 |
| `create_assignment` | confirm | Create a new assignment with rubric | P1 |
| `grade_submission` | confirm | AI-grade a submission against rubric | P1 |
| `generate_study_guide` | auto | Create study guide for topic/module | P1 |
| `create_quiz` | confirm | Generate quiz questions for a topic | P1 |
| `get_course_health` | auto | Engagement %, Bloom distribution, tool usage | P0 |

### Communication Tools

| Tool | Type | Description | Demo Priority |
|---|---|---|---|
| `get_unread_emails` | auto | Fetch unread emails with triage categories | P0 |
| `draft_email` | confirm | Compose email for user review | P0 |
| `send_message` | confirm | Send a platform message to a user or group | P1 |
| `post_announcement` | confirm | Post course/platform announcement | P1 |
| `get_conversations` | auto | List recent message threads | P1 |
| `schedule_notification` | confirm | Set a reminder/notification for a future time | P2 |

### Calendar & Tasks Tools

| Tool | Type | Description | Demo Priority |
|---|---|---|---|
| `get_calendar` | auto | Fetch calendar events for date range | P0 |
| `get_tasks` | auto | Fetch task list with priorities and due dates | P0 |
| `create_task` | confirm | Add a new task | P1 |
| `complete_task` | confirm | Mark task complete | P1 |
| `create_calendar_event` | confirm | Add calendar event | P1 |
| `find_free_time` | auto | Find available slots in calendar | P1 |

### Analytics & Reporting Tools

| Tool | Type | Description | Demo Priority |
|---|---|---|---|
| `run_cohort_analysis` | auto | Analyze student groups by filters | P1 |
| `generate_report` | auto | Create formatted analytics report | P1 |
| `compare_sections` | auto | Side-by-side section comparison | P2 |
| `get_engagement_trends` | auto | Engagement over time for a course | P1 |
| `get_bloom_distribution` | auto | Bloom's taxonomy breakdown for a course | P1 |

### Campus & Policy Tools

| Tool | Type | Description | Demo Priority |
|---|---|---|---|
| `search_policies` | auto | RAG search over university policies | P0 |
| `lookup_directory` | auto | Find people/departments/offices | P1 |
| `check_degree_audit` | auto | Run degree audit for a student | P1 |
| `find_room_availability` | auto | Check room/space availability | P2 |
| `get_campus_news` | auto | Recent UKNow articles and alerts | P1 |

### Content Creation Tools

| Tool | Type | Description | Demo Priority |
|---|---|---|---|
| `generate_rubric` | auto | Create grading rubric from assignment description | P1 |
| `generate_syllabus_section` | auto | Draft syllabus section (policies, schedule, etc.) | P2 |
| `create_discussion_prompt` | auto | Generate discussion board prompts at target Bloom level | P1 |
| `build_practice_exam` | confirm | Generate full practice exam with answer key | P1 |

### Sandy Self-Referential Tools

| Tool | Type | Description | Demo Priority |
|---|---|---|---|
| `get_current_context` | auto | Fetch full context about current page, user, time | P0 |
| `get_user_profile` | auto | Detailed user profile including preferences | P0 |
| `search_platform` | auto | Full-text search across courses, tools, materials | P1 |
| `navigate_user` | auto | Navigate the user to a specific page | P0 |
| `launch_tool` | auto | Open a specific tool for the user | P1 |

### Tool Count Summary

| Category | Total | P0 | P1 | P2 |
|---|---|---|---|---|
| Academic | 10 | 5 | 5 | 0 |
| Communication | 6 | 2 | 3 | 1 |
| Calendar & Tasks | 6 | 2 | 4 | 0 |
| Analytics | 5 | 0 | 4 | 1 |
| Campus & Policy | 5 | 1 | 3 | 1 |
| Content Creation | 4 | 0 | 3 | 1 |
| Sandy Self | 5 | 3 | 2 | 0 |
| **Total** | **41** | **13** | **24** | **4** |

**Demo minimum: 13 P0 tools.** These alone enable the killer demo flows (morning briefing, student check-in, course health review).

---

## 6.0 — Multi-Step Workflow Engine

### Pre-Built Workflow Templates

Sandy can reason through any combination of tools, but for the demo we want reliable, impressive workflows. These are **prompt-guided** (not hardcoded) — Sandy's system prompt includes workflow templates she can follow:

#### Workflow 1: "Morning Briefing" (Educator)

**Trigger:** "What does my day look like?" / "Brief me" / landing on home page

```
1. get_calendar(today + tomorrow)           → meetings, classes
2. get_unread_emails()                      → triaged by urgency
3. get_tasks(due: this_week)                → pending to-dos
4. get_at_risk_students(courses: mine)      → flagged students
5. get_course_health(courses: mine)         → engagement snapshot
6. SYNTHESIZE → "Here's your day..."
   └─ Offer: "Want me to draft a reply to the Dean?"
   └─ Offer: "Should I set up check-ins with the 2 at-risk students?"
```

#### Workflow 2: "Student Check-In" (Educator)

**Trigger:** "How is [student] doing?" / clicks student name

```
1. get_student_progress(studentId)          → scores, activity, concepts
2. get_course_materials(courseId)            → what they should know by now
3. check_degree_audit(studentId)            → overall academic standing
4. SYNTHESIZE → "[Student] is struggling with X, strong at Y..."
   └─ Offer: "Want me to generate a personalized study plan?"
   └─ Offer: "Should I send them a check-in message?"
```

#### Workflow 3: "Assignment Pipeline" (Educator)

**Trigger:** "Create a new assignment for next week"

```
1. get_course_materials(courseId)            → recent module topics
2. get_bloom_distribution(courseId)          → where students are cognitively
3. PLAN → "Based on Module 5 content and your class being strong at
           recall but weak on application, I suggest a case study..."
4. create_assignment(details)               → [APPROVAL GATE]
5. generate_rubric(assignmentDesc)          → rubric preview
6. CONFIRM → "Assignment created. Want me to announce it to the class?"
7. post_announcement(courseId, details)      → [APPROVAL GATE]
```

#### Workflow 4: "Prep My Meeting" (Staff/Educator)

**Trigger:** "What do I need for my 2pm meeting?"

```
1. get_calendar(today)                      → find the 2pm meeting
2. get_conversations(attendees)             → recent messages with attendees
3. search_policies(meeting_topic)           → relevant policies
4. SYNTHESIZE → "Your 2pm is the Curriculum Committee. Here's context:
                 - Last meeting's action items (3 outstanding)
                 - Relevant policy: Credit Hour Definition (updated Jan)
                 - Morgan sent you a draft proposal yesterday"
```

#### Workflow 5: "Course Health Triage" (Educator)

**Trigger:** "How are my courses doing?"

```
1. get_courses()                            → all taught courses
2. get_course_health(each courseId)          → parallel calls
3. get_at_risk_students(each courseId)       → parallel calls
4. get_engagement_trends(each courseId)      → parallel calls
5. RANK by concern level
6. SYNTHESIZE → "TEK-100 is healthy (92% engaged). CS-201 needs attention:
                 engagement dropped 15% this week, 3 students at risk.
                 Want me to dig into CS-201?"
```

#### Workflow 6: "Smart Reply" (Any role)

**Trigger:** "Help me reply to this email" / "Draft a response to..."

```
1. get_unread_emails() OR use provided email context
2. get_current_context()                    → who is the user, what page
3. search_policies(if policy-related)       → for accurate citations
4. draft_email(to, subject, body)           → [APPROVAL GATE with preview]
   └─ User can Edit → regenerate
   └─ User can Approve → "sent" confirmation
```

---

## 7.0 — Background Agent System (Tier 3)

> **Note:** Tier 3 is design-only for now. Not needed for demo. Documented here for completeness.

### Concept

Users can authorize Sandy to run workflows on a schedule or in response to triggers, without the user actively chatting.

### Examples

| Agent | Trigger | Action |
|---|---|---|
| Early Alert | Nightly cron | Check all enrolled students → flag risk score changes → notify instructor |
| Auto-Grader | New submission | Grade against rubric → flag low-confidence items for review |
| Meeting Prep | 30min before calendar event | Gather context → push briefing to Sandy sidebar |
| Compliance Watch | Policy update detected | Check syllabi against new policy → flag gaps |
| Content Refresh | Weekly cron | Check stale materials → suggest updates based on new research |

### Architecture (Future)

```
Trigger (cron / webhook / event)
     │
     ▼
Background Agent Runner (serverless function or queue worker)
     │
     ├─ Load user context + permissions
     ├─ Run agent loop (same as interactive, but no SSE)
     ├─ For confirm-level actions → queue notification instead of blocking
     └─ Log all actions to audit trail
```

Infrastructure options (post-demo):
- **Vercel Cron + Edge Functions** — simplest, fits current stack
- **BullMQ + Redis** — if we need retries, priorities, concurrency control
- **Inngest** — event-driven, good for trigger-based agents

---

## 8.0 — Client-Side Changes

### ConciergePanel Upgrades

The existing `ConciergePanel.tsx` gains new rendering capabilities:

#### New Message Types

```typescript
type AgentMessageType =
  | 'text'              // Normal chat bubble (existing)
  | 'thinking'          // Sandy's reasoning (new — collapsible)
  | 'tool_call'         // Tool invocation card (new)
  | 'tool_result'       // Tool result preview (new)
  | 'approval_request'  // Approve/Edit/Reject card (new)
  | 'workflow_plan'     // Multi-step plan outline (new)
  | 'workflow_progress' // Step-by-step progress tracker (new)
```

#### Agent Action Card Component

```
┌──────────────────────────────────────────┐
│ 📋 Sandy wants to send an email          │
│                                          │
│ To: dean@uky.edu                         │
│ Subject: Re: Curriculum Proposal         │
│ ┌──────────────────────────────────────┐ │
│ │ Dear Dean Wilson,                    │ │
│ │                                      │ │
│ │ Thank you for sharing the proposal...│ │
│ └──────────────────────────────────────┘ │
│                                          │
│  [✓ Approve]  [✏️ Edit]  [✗ Skip]       │
└──────────────────────────────────────────┘
```

#### Workflow Progress Component

```
┌──────────────────────────────────────────┐
│ Morning Briefing                         │
│                                          │
│  ✅ Calendar — 3 meetings, 1 class       │
│  ✅ Email — 7 new (2 urgent)             │
│  ✅ Tasks — 5 pending (2 overdue)        │
│  🔄 Course Health — checking...          │
│  ○ At-Risk Students                      │
│  ○ Summary                               │
└──────────────────────────────────────────┘
```

### SandyAmbientContext Changes

Add to existing context:

```typescript
interface AgentState {
  isAgentMode: boolean;           // Agent loop active
  currentWorkflow: string | null; // Active workflow name
  pendingApproval: ApprovalRequest | null;
  toolCallLog: ToolCallEntry[];   // Visible timeline
  agentThinking: string | null;   // Current reasoning text
}
```

The submit handler detects agent-worthy requests and routes to `/api/agent/chat` instead of `/api/concierge`.

### Backward Compatibility

- Simple chat ("What time is my class?") still goes through existing `/api/concierge`
- Agent mode activates when Sandy decides to use tools (automatic)
- All existing `<!--ACTION:-->` patterns continue to work as fallback
- The `ConciergePanel` renders both old-style and new agent-style messages

---

## 9.0 — Migration from Current Architecture

### Phase 1: Agent Infrastructure (No UI Changes)

Build the agent loop and tool registry server-side. Test via API calls.

| Task | Files | Estimate |
|---|---|---|
| Define `agent-types.ts` | New file | Small |
| Build `tool-registry.ts` | New file | Medium |
| Build `agent-loop.ts` (core loop) | New file | Large |
| Build `agent-system-prompt.ts` | New file | Medium |
| Create `/api/agent/chat` route | New route | Medium |
| Create `/api/agent/approve` route | New route | Small |

### Phase 2: P0 Tools (13 tools)

Wire existing service functions as agent tools. Most are thin wrappers around existing Prisma queries and service calls.

| Tool Module | Wraps Existing | New Code |
|---|---|---|
| `academic-tools.ts` | `concierge-service.ts`, course queries | Mostly wrappers |
| `communication-tools.ts` | `briefing-service.ts`, message queries | Mostly wrappers |
| `calendar-tools.ts` | `assistant/` services | Mostly wrappers |
| `sandy-tools.ts` | Page descriptions, user profile | Mostly wrappers |
| `campus-tools.ts` | `policy-service.ts`, RAG | Mostly wrappers |

### Phase 3: Client Rendering

Add agent message types to ConciergePanel.

| Task | Files | Estimate |
|---|---|---|
| Agent message type renderers | New components | Medium |
| Approval card component | New component | Medium |
| Workflow progress component | New component | Medium |
| SSE parser for agent events | Extend existing | Small |
| Agent state in SandyAmbientContext | Edit existing | Small |
| Route detection (concierge vs agent) | Edit submit handler | Small |

### Phase 4: P1 Tools + Workflows

Add remaining tools and test the multi-step workflows.

### What Gets Replaced

| Current | Replacement | When |
|---|---|---|
| `<!--ACTION:navigate-->` | `navigate_user` tool | Phase 2 (keep both) |
| `<!--ACTION:launch-->` | `launch_tool` tool | Phase 2 (keep both) |
| `<!--ASSISTANT_ACTION:show-calendar-->` | `get_calendar` tool result rendering | Phase 3 |
| `<!--ASSISTANT_ACTION:show-inbox-->` | `get_unread_emails` tool result rendering | Phase 3 |
| `<!--ASSISTANT_ACTION:show-draft-->` | `draft_email` approval card | Phase 3 |
| `<!--ASSISTANT_ACTION:show-tasks-->` | `get_tasks` tool result rendering | Phase 3 |
| Massive `buildSystemPrompt()` context dump | Tool-based context discovery | Phase 2 (gradual) |

The old patterns remain functional throughout. No big-bang switchover.

---

## 10.0 — Demo Playbook — Universal Agent Beats

### Beat 1: "Morning Briefing" (Educator — Katie)

**Setup:** Katie opens the platform in the morning.
**Sandy:** (proactively) "Good morning, Katie. Let me pull together your day."

Sandy calls 5 tools in sequence (visible in timeline):
1. Calendar → "You have 3 meetings and your TEK-100 lecture at 2pm"
2. Email → "7 new emails — the Dean's curriculum proposal needs a reply"
3. Tasks → "5 tasks, 2 overdue"
4. At-risk students → "2 students in TEK-100 need check-ins"
5. Course health → "TEK-100 engagement is strong at 89%"

**Sandy:** "Would you like me to draft a reply to the Dean, or check in on those two students first?"

### Beat 2: "Draft & Send" (Educator — Katie)

**Katie:** "Draft a reply to the Dean — tell her I support the proposal but want to discuss credit hour implications."

Sandy calls:
1. `search_policies('credit hour')` → finds the policy
2. `draft_email(...)` → shows preview with approval card

**Katie:** taps Approve
**Sandy:** "Sent. I also noticed the Credit Hour Policy was updated last month — want me to flag the relevant changes?"

### Beat 3: "Student Check-In" (Educator — Katie)

**Katie:** "Tell me about those at-risk students."

Sandy calls:
1. `get_at_risk_students(TEK-100)` → 2 students
2. `get_student_progress(student1)` → detailed view
3. `get_student_progress(student2)` → detailed view

**Sandy:** "Marcus hasn't logged in for 5 days and missed the last assignment. Aisha's scores dropped from 85 to 62 on the last two sessions — she may be struggling with Module 4 concepts. Want me to send them each a personalized check-in message?"

**Katie:** "Yes, please."
**Sandy:** Shows two message previews → Katie approves both.

### Beat 4: "Student Experience" (Student — Tiana)

**Tiana:** "I have a Constitutional Law exam next Thursday. Help me prepare."

Sandy calls:
1. `get_course_materials(con-law)` → Module topics
2. `get_student_progress(tiana)` → strengths/weaknesses
3. `build_practice_exam(...)` → [Approval: "Generate a 20-question practice exam?"]

**Tiana:** Approves
**Sandy:** Generates exam, then offers: "Want me to create a study schedule for the next 6 days? I'll space the topics based on what you know vs. what needs work."

### Beat 5: "Staff Operations" (Staff — Morgan)

**Morgan:** "What needs my attention today?"

Sandy calls:
1. `get_calendar(today)` → meetings
2. `get_tasks(urgent)` → action items
3. `search_policies('enrollment census')` → upcoming deadline
4. `get_campus_news()` → relevant announcements

**Sandy:** "The enrollment census deadline is Friday — 3 departments haven't submitted. Your 10am is the Curriculum Committee — want me to pull the agenda and last meeting's action items?"

---

## 11.0 — Implementation Phases

### Phase 1: Foundation ✅

- [x] `app/lib/agent/agent-types.ts` — Type definitions
- [x] `app/lib/agent/tool-registry.ts` — Central registry
- [x] `app/lib/agent/agent-loop.ts` — Core agentic loop with Claude `tools` parameter
- [x] `app/lib/agent/agent-system-prompt.ts` — Lean system prompt
- [x] `app/api/agent/chat/route.ts` — Agent chat endpoint (SSE)
- [x] `app/api/agent/approve/route.ts` — Approval resolution endpoint
- [x] Basic test: send a message, Sandy calls a tool, returns result

### Phase 2: P0 Tools ✅

- [x] `app/lib/agent/tools/academic-tools.ts` — 6 tools (get_courses, get_course_roster, get_course_materials, get_student_progress, get_at_risk_students, get_course_health)
- [x] `app/lib/agent/tools/communication-tools.ts` — 5 tools (get_unread_emails, draft_email, send_message, post_announcement, get_conversations)
- [x] `app/lib/agent/tools/calendar-tools.ts` — 6 tools (get_calendar, get_tasks, create_task, complete_task, create_calendar_event, find_free_time)
- [x] `app/lib/agent/tools/sandy-tools.ts` — 5 tools (get_current_context, get_user_profile, navigate_user, search_platform, launch_tool)
- [x] `app/lib/agent/tools/campus-tools.ts` — 4 tools (search_policies, lookup_directory, check_degree_audit, get_campus_news)
- [x] Wire all P0 + P1 tools into registry (7 modules total)

### Phase 3: Client Rendering ✅

- [x] `AgentMessageRenderer` — thinking indicator, text blocks, tool cards, approvals, workflow progress
- [x] `ToolCallCard` component (collapsible, staggered animation, slow-tool label)
- [x] `ApprovalCard` component (Approve/Edit/Reject with resolved states)
- [x] `WorkflowProgress` component (step timeline with status icons)
- [x] `useAgentStream` SSE parser hook in `app/hooks/useAgentStream.ts`
- [x] Agent state in `SandyAmbientContext` (agentMode, toggleAgentMode, agentEvents, isAgentStreaming, sendAgentApproval)
- [x] Route detection: agentMode toggle in ConciergePanel header (Zap icon)

### Phase 4: P1 Tools + Polish ✅

- [x] `app/lib/agent/tools/analytics-tools.ts` — 4 tools (run_cohort_analysis, generate_report, get_engagement_trends, get_bloom_distribution)
- [x] `app/lib/agent/tools/content-tools.ts` — 3 tools (generate_rubric, create_discussion_prompt, build_practice_exam)
- [x] 6 multi-step workflow prompt templates in agent-system-prompt.ts
- [x] Error handling: try/catch per tool, Sandy adapts on failure
- [x] Loading states and animations for tool execution
- [x] Backward compatibility: old `<!--ACTION:-->` patterns still work in non-agent mode

### Phase 5: Demo Hardening ✅

- [x] Demo data seeding: `scripts/seed-agent-demo.ts` (Katie, Tiana, Morgan) — `npm run seed:agent-demo`
- [x] Happy-path smoke test: `scripts/agent-demo-smoke-test.ts` — 32/32 checks pass
- [x] Parallel tool execution: auto tools via Promise.all, confirm tools sequential
- [x] Evaluator mode gates: auto-enables agent mode, agent-specific starter chips
- [x] UX polish: thinking indicator, staggered tool cards (150ms), streaming text, slow-tool label (>3s), follow-up suggestion chips

---

## Appendix A: Key Architecture Decisions

| Decision | Choice | Why |
|---|---|---|
| Agent loop location | Server-side (API route) | Security, simplicity, background capability |
| Tool protocol | MCP-lite (TypeScript modules, Claude `tools` param) | Fast to build, full MCP later |
| Streaming format | SSE with typed JSON events | Reuses existing streaming infra |
| Approval mechanism | SSE pause + POST resume | Simple, no WebSocket needed |
| System prompt strategy | Lean prompt + tool discovery | Reduces token waste, more dynamic |
| Old action tags | Keep as fallback | Zero-risk migration |
| Cost optimization | Deferred | Enterprise compute available |
| Background agents | Design only, not built | Not needed for demo |
| Model | Sonnet for everything | Demo-first, cost deferred |

## Appendix B: Risk Register

| Risk | Mitigation |
|---|---|
| Agent loop takes too long (many tool calls) | Max 10 iterations, parallel calls, show progress UI |
| Sandy hallucinates tool results | Tools return real data; Sandy can't fabricate DB records |
| Approval flow breaks SSE stream | Timeout after 60s, Sandy says "I'll pause here — let me know when you're ready" |
| Claude refuses to call tools | Strong system prompt with examples; fallback to regular chat |
| Tool errors crash the loop | Try/catch per tool; Sandy gets error message and adapts |
| Demo evaluator confused by agent UI | Narrator mode explains what's happening |
