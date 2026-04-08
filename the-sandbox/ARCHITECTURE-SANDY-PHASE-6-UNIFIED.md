# Sandy Phase 6: Seamless Unified Mode — Architecture Plan Document
### University of Kentucky / CATS-AI
### Draft: 2026-03-24

> **STATUS: DESIGN ONLY — Do not implement until after the demo.**
> The concierge path remains the default. Phase 6 dissolves the boundary post-demo.

---

## 1.0 — Problem Statement

Today Sandy has two personalities split across two codepaths:

1. **Concierge Sandy** (`POST /api/concierge`) — A single Anthropic streaming call with a massive, eagerly-loaded system prompt (~4000–8000+ tokens of context). Responds with streamed text containing `<!--ACTION:-->`, `<!--CHIPS:-->`, `<!--ASSISTANT_ACTION:-->`, and `<!--SAVE_NOTE:-->` tags. Uses Sonnet.

2. **Agent Sandy** (`POST /api/agent/chat`) — A lean system prompt (~300 tokens) plus 33 registered tools. Runs a server-side agentic loop (max 10 iterations). Streams typed SSE events. Uses Sonnet.

The toggle is a Zap icon in the ConciergePanel header. Users must explicitly opt in. This creates a seam: users who need agent capabilities don't know to flip the toggle, and the concierge cannot escalate to tools when it recognizes the need.

**Phase 6 dissolves this boundary.** Sandy becomes a single endpoint that can answer a simple question in one shot OR spin up a multi-tool workflow, with no user-visible mode switch.

---

## 2.0 — Design Principles

1. **No toggle, no modes.** Users always talk to Sandy. Sandy decides internally whether tools are needed.
2. **Cheap by default.** 80%+ of messages are simple chat. These must remain a single Anthropic call, not an agent loop.
3. **Escalate transparently.** When Sandy decides to use tools, the UI smoothly introduces tool cards and workflow progress — no jarring mode change.
4. **Context is not lost.** The concierge's rich system prompt (student intelligence, briefing data, course materials) cannot be thrown away. The agent prompt must inherit critical context.
5. **Backward compatible.** All `<!--ACTION:-->`, `<!--CHIPS:-->`, `<!--ASSISTANT_ACTION:-->`, and `<!--SAVE_NOTE:-->` tags continue to work during and after migration.
6. **Post-demo only.** The concierge path remains default until Phase 6 is explicitly enabled via feature flag.

---

## 3.0 — Intent Classification

### 3.1 Approach: Two-Tier Classification

Use a **rule-based first pass** with an optional **Haiku second pass** for ambiguous cases. No separate classifier call for the 80% happy path.

### 3.2 Tier 1: Rule-Based Pattern Matching (Zero Latency)

A function `classifyIntent(message, conversationHistory, pageContext)` returns one of three dispositions:

| Disposition | Meaning | Routing |
|---|---|---|
| `chat` | Simple conversational response, informational query, navigation request | Concierge path (single Anthropic call) |
| `agent` | Needs tool execution — data lookup, write action, multi-step workflow | Agent path (agentic loop) |
| `ambiguous` | Could go either way | Haiku tiebreak OR default to concierge |

**Chat triggers** (default — match these to stay on concierge):
- Greetings, small talk, thank you, goodbye
- "What is...", "Explain...", "Tell me about..." (informational)
- Navigation requests ("Take me to...", "Open my courses")
- Questions answerable from the system prompt context
- `<!--CHIPS:-->` chip responses (follow-up to existing conversation)

**Agent triggers** (match any to escalate):
- Explicit action verbs: "Send", "Create", "Draft", "Post", "Schedule", "Grade", "Generate"
- Workflow trigger phrases from the 6 existing templates (morning briefing, student check-in, assignment pipeline, prep meeting, course health, smart reply)
- Data lookup phrases: "How is [student] doing?", "Check my calendar", "Show me at-risk students"
- Multi-entity references: "Compare my courses", "Check all students in TEK-100"
- Questions requiring live data the system prompt doesn't contain

### 3.3 Tier 2: Haiku Tiebreak (Ambiguous Cases Only)

For the ~5% of messages classified as `ambiguous`, a single Haiku call (~50ms, ~$0.0002) with a tight classification prompt returns `"chat"` or `"agent"`.

### 3.4 Override Heuristics

- If the conversation has already escalated to agent mode (previous messages include tool results), stay in agent mode for the remainder. No ping-ponging.
- If `evaluatorMode` is true, bias toward `agent`.
- If `briefingContext` is present and the message relates to email/calendar/tasks, route to concierge (it already has the data).
- Avatar mode, collab review mode, and narrator mode always force `chat`.

### 3.5 Implementation Location

New file: `app/lib/agent/intent-classifier.ts`. Pure function, no side effects.

---

## 4.0 — Unified API Route

### 4.1 Approach: Single Endpoint with Internal Router

Create `POST /api/sandy` that replaces both `/api/concierge` and `/api/agent/chat`. Old routes remain as deprecated aliases that forward to `/api/sandy`.

### 4.2 Response Protocol: Unified SSE

Both paths stream through a single SSE protocol:

| Event Type | Concierge Path | Agent Path |
|---|---|---|
| `text` | Yes (primary) | Yes (between tools and at end) |
| `thinking` | No | Yes |
| `tool_call` | No | Yes |
| `tool_result` | No | Yes |
| `approval_request` | No | Yes |
| `approval_resolved` | No | Yes |
| `action` | Yes (parsed from `<!--ACTION:-->`) | No (uses `navigate_user` tool) |
| `chips` | Yes (parsed from `<!--CHIPS:-->`) | Yes (from suggestion extraction) |
| `done` | Yes | Yes |
| `error` | Yes | Yes |

The concierge path becomes an SSE stream too, but one that only emits `text`, `action`, `chips`, and `done` events. The client receives the same format regardless of which path handled the request.

### 4.3 Internal Flow

```
POST /api/sandy
  │
  ▼
Auth + Rate Limit
  │
  ▼
Build Concierge Context (always — ~200ms of DB queries)
  │
  ▼
classifyIntent(lastMessage, history, pageContext)
  │
  ├── "chat" ────→ Concierge Path
  │                  Single Anthropic call (Sonnet, streamed)
  │                  Parse <!--ACTION:-->, <!--CHIPS:--> from stream
  │                  Emit as typed SSE events
  │
  ├── "agent" ───→ Agent Path
  │                  Inject critical context into agent prompt
  │                  Run agentic loop (existing agent-loop.ts)
  │                  Stream SSE events
  │
  └── "ambiguous" → Haiku tiebreak → route to chat or agent
```

### 4.4 Backward Compatibility of Old Routes

- `POST /api/concierge` → forwards to `/api/sandy` with `forceMode: 'chat'`
- `POST /api/agent/chat` → forwards to `/api/sandy` with `forceMode: 'agent'`
- `POST /api/agent/approve` → unchanged (approval is orthogonal to routing)

---

## 5.0 — Context Handoff

### 5.1 The Problem

The concierge eagerly loads everything. The agent discovers context via tools. A unified Sandy needs enough context to answer simple questions without tool calls, but not so much that it overwhelms tool-use reasoning.

### 5.2 Approach: Tiered Context Injection

When running the **concierge path**, use the full existing `buildSystemPrompt()` — nothing changes.

When running the **agent path**, build an enhanced agent system prompt with a critical-context subset:

**Always injected** (low token cost, high value):
- User identity, current page, current time (already present)
- Course context if on a course page (~30 tokens)
- Briefing data summary if on homepage (~100 tokens)
- Student intelligence summary if STUDENT (~80 tokens)

**Available via tools only** (high token cost):
- Full course materials → `get_course_materials`
- Full email content → `get_unread_emails`
- Full calendar → `get_calendar`
- Policy text → `search_policies`

### 5.3 New Tools for Context Parity

To avoid losing concierge richness when in agent mode:

| Tool | Source | Purpose |
|---|---|---|
| `get_student_context` | student-context-service | Student intelligence block |
| `get_episodic_memory` | episodic-memory-service | Memory/personalization block |
| `get_learning_modality` | domain-modality-service | Modality preference block |
| `get_learning_timeline` | timeline-service | Recent learning events |
| `get_live_room_suggestions` | suggestion-service | Live room suggestions |
| `get_sr_due_concepts` | sr-scheduler | Spaced repetition context |

All `auto` permission, all roles, wrapping existing services.

---

## 6.0 — UI Convergence

### 6.1 Unified Message Model

Replace `Message[]` + `agentEvents: AgentSSEEvent[]` with a single unified message stream:

```typescript
interface UnifiedSandyMessage {
  id: string
  role: 'user' | 'assistant'
  content?: string              // For simple text (legacy compat)
  events?: AgentSSEEvent[]      // For structured responses (both paths)
  actions?: Action[]            // Extracted from <!--ACTION:--> tags
  chips?: string[]              // Extracted from <!--CHIPS:--> or suggestions
}
```

### 6.2 Single Renderer: `SandyMessageRenderer`

- If `message.events` contains `tool_call` events → `AgentMessageRenderer`
- If `message.events` contains only `text` events → simple chat bubble
- If `message.content` exists (legacy) → existing `SandyMessage`

### 6.3 Removing the Toggle

- Remove Zap icon from ConciergePanel header
- Remove `agentMode` / `toggleAgentMode` from `SandyAmbientContext`
- Remove yellow "Agent Mode" indicator bar
- Remove `__AGENT_RESPONSE__` sentinel hack

### 6.4 New Hook: `useUnifiedStream`

Replaces both the raw `fetch` + `reader.read()` loop in the concierge path and `useAgentStream`. Returns `{ events, isStreaming, sendApproval }` and handles both concierge-style and agent-style SSE events.

---

## 7.0 — Cost Control

### 7.1 Strategy: Classify First, Pay Later

The rule-based classifier has zero API cost and runs in <1ms. Only messages matching agent triggers enter the agentic loop.

### 7.2 Additional Controls

| Control | Mechanism |
|---|---|
| **Haiku for ambiguous** | Tier 2 tiebreak uses Haiku, not Sonnet |
| **Context-aware skip** | If briefingContext has the data, skip agent |
| **Early termination** | Agent's first call returns `end_turn` (no tools) → same cost as concierge |
| **Max iterations** | Existing 10-iteration cap |
| **Conversation stickiness** | Once `chat`, stay `chat` unless new agent trigger detected |
| **Token budget** | Concierge: `max_tokens: 600`. Agent first call: `max_tokens: 1024`. Subsequent: `4096`. |

### 7.3 Cost Monitoring

Log per-request: route taken, Sonnet call count, total tokens, tool calls executed. Feed into analytics.

---

## 8.0 — Rollout Strategy

### 8.1 Feature Flag: `SANDY_UNIFIED_MODE`

| Value | Behavior |
|---|---|
| `"off"` (default) | Current behavior. Toggle visible. Two paths. |
| `"classifier_only"` | Unified route logs classifications (shadow mode). Old routes active. |
| `"opt_in"` | Users can enable unified mode via settings. Default off. |
| `"percentage:N"` | N% of requests through unified path. Sticky per session. |
| `"on"` | Unified mode for all. Toggle removed. Old routes forward. |

### 8.2 Rollout Phases

**Phase 6a: Shadow Classification** (1–2 days)
- Deploy intent classifier, log classifications, compare against actual routing
- Tune trigger patterns on real message data

**Phase 6b: Unified SSE Protocol** (2–3 days)
- Build `/api/sandy` route with internal router
- Build concierge-to-SSE adapter (parses action tags mid-stream)
- Build `useUnifiedStream` hook
- Test with `classifier_only`

**Phase 6c: UI Convergence** (2–3 days)
- Build `SandyMessageRenderer`
- Migrate `SandyAmbientContext` to unified message model
- Remove toggle UI (behind flag)
- Test with `opt_in`

**Phase 6d: Gradual Rollout** (1 week)
- `percentage:10` → monitor errors and cost
- `percentage:50` → `percentage:100`
- Stable at 100% → `"on"`, remove old code paths

### 8.3 Rollback

Set `SANDY_UNIFIED_MODE=off` — instant rollback, no deploy needed. Old routes never deleted during transition.

### 8.4 Success Metrics

| Metric | Target |
|---|---|
| Classification accuracy | >95% |
| P50 latency (chat path) | No regression vs concierge (<800ms) |
| P50 latency (agent path) | No regression (<3s for single tool) |
| Cost per message (blended) | <$0.015 |
| Agent escalation rate | 15–25% of messages |

---

## 9.0 — File Inventory

### New Files

| File | Purpose |
|---|---|
| `app/lib/agent/intent-classifier.ts` | Rule-based + Haiku tiebreak classification |
| `app/api/sandy/route.ts` | Unified endpoint with internal router |
| `app/lib/agent/concierge-sse-adapter.ts` | Wraps concierge stream, parses action tags, emits SSE |
| `app/hooks/useUnifiedStream.ts` | Merged SSE parser hook |
| `app/components/concierge/SandyMessageRenderer.tsx` | Unified message renderer |
| `app/lib/agent/tools/personalization-tools.ts` | 6 new read-only tools for context parity |

### Modified Files

| File | Change |
|---|---|
| `SandyAmbientContext.tsx` | Remove `agentMode` branch, use unified stream |
| `ConciergePanel.tsx` | Remove Zap toggle, use `SandyMessageRenderer` |
| `agent-system-prompt.ts` | Add `buildUnifiedAgentSystemPrompt` |
| `agent-types.ts` | Add new SSE event types (`action`, `chips`) |
| `/api/concierge/route.ts` | Deprecation shim forwarding to `/api/sandy` |
| `/api/agent/chat/route.ts` | Deprecation shim forwarding to `/api/sandy` |

### Unchanged Files

| File | Why |
|---|---|
| `agent-loop.ts` | Core loop correct; unified route calls it directly |
| `tool-registry.ts` | Just register the 6 new personalization tools |
| `concierge-service.ts` | System prompt builder unchanged; called by unified route |
| `AgentMessageRenderer.tsx` | Reused inside `SandyMessageRenderer` |
| `ToolCallCard.tsx`, `ApprovalCard.tsx`, `WorkflowProgress.tsx` | Unchanged |

---

## 10.0 — Open Questions

1. **Should concierge context DB queries run for agent-classified requests?** Proposed: yes (~200ms). The critical context subset is cheap to extract. Alternative: skip and let tools fetch on demand (saves 200ms, loses prompt context).

2. **Conversation history format.** If a conversation starts as chat and escalates to agent, the history format changes mid-conversation. Proposed: always store human-readable text summary alongside structured events so history replays cleanly to either path.

3. **Avatar mode.** Should always stay on concierge (no tool execution as a faculty persona). Classifier detects and forces `chat`.

4. **Max tokens for mistaken agent routing.** If classifier sends a greeting to agent, it wastes tokens. Proposed: agent's first Sonnet call uses `max_tokens: 1024`, subsequent calls use `4096`.

---

## 11.0 — Dependency Map

```
Phase 6a (Shadow Classification)
  └── Depends on: nothing (read-only logging)

Phase 6b (Unified SSE Protocol)
  └── Depends on: 6a, existing agent-loop.ts, existing concierge-service.ts

Phase 6c (UI Convergence)
  └── Depends on: 6b (unified stream format)

Phase 6d (Gradual Rollout)
  └── Depends on: 6c, feature flag infrastructure

New Personalization Tools (Section 5.3)
  └── Can be built in parallel with 6a/6b. Required before 6d.
```
