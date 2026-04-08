# Sandy Reference Doc

> **Claude Code reference document** extracted from the project's `CLAUDE.md`.
> Read this file when working on Sandy, concierge, chat surfaces, or email intelligence features.

---

## Sandy — Unified AI Persona (Multi-Class System)

Sandy is the **single AI character** across the entire platform. She switches "classes" (like a video game) depending on context — same personality, different expertise hat. Every chat surface shows "Sandy" as the primary name with a context-specific subtitle.

**Canonical visual standard (enforced on all chat surfaces):**
- Header: Solid `bg-[#0033A0]`, Bot icon in `bg-white/20` circle, "Sandy" + subtitle
- Assistant bubbles: `bg-white border border-gray-100 rounded-2xl rounded-tl-sm`
- User bubbles: `bg-[#0033A0] text-white rounded-2xl rounded-tr-sm`
- Send button: Solid `bg-[#0033A0]` — no gradients
- Every surface has a RotateCcw restart/new-chat button

**Sandy's classes by context:**

| Context | Subtitle | Component |
|---|---|---|
| Global sidebar | Concierge | `ConciergePanel.tsx` |
| Tool chat | {tool name} | `ChatInterface.tsx` |
| Tool builder | Tool Builder | `BuilderChatPanel.tsx` |
| Elevated tools (16) | — | `SandyInterviewPanel.tsx` |
| Campus Navigator | Campus Guide | `campus-navigator/[slug]/page.tsx` |
| Academic Advisor | Academic Advisor | `academic-advisor/page.tsx` |
| Research Hub | Research Assistant | `research-hub/[slug]/page.tsx` |
| Study Buddy | mode-specific (Quiz Master, etc.) | `StudyBuddyInterface.tsx` |
| Course Map TA | Teaching Assistant | `TeachingAssistantPanel.tsx` |
| Course Map AI | Map Designer | `AIAssistantPanel.tsx` |
| UKNow | News Analyst | `AskAITab.tsx` |
| Philanthropy Assistant | Outreach Coach | `SandyInterviewPanel.tsx` (reused) |

**Do NOT introduce:** purple/violet gradients, Brain icon for avatars, custom personas (e.g. "Wil"), "Online" pulsing dots.

---

## Sandy Concierge Architecture

- `ConciergePanel.tsx` — global sidebar, page-aware AI assistant (Sonnet)
- Desktop: persistent left panel (`w-96` / 384px, fixed). Main content offset via `lg:ml-96` in `ClientProviders.tsx`. Content left-aligned on wide screens (CSS rule in `globals.css` overrides `mx-auto` -> `margin-left: 0` inside `<main>` at `lg:` breakpoint). No open/close toggle on desktop.
- Mobile: FAB button bottom-left -> opens bottom sheet
- `currentPage` sent on every message; API builds page-specific system prompt via `PAGE_DESCRIPTIONS` (static map, ~100 entries) + `describeCurrentPage()` (dynamic fallback matching for pattern routes like `/courses/[id]/*`, `/debate/*`, `/admin/*`, etc.). Every page in the app has a Sandy-visible context description.
- `getPageStarters(pathname, role)` in `concierge-utils.ts` returns 4 role-aware starter suggestion chips per page. All ~40 page groups covered.
- Proactive trigger: scroll-idle (3s no-scroll OR 5s fallback), not a fixed timer
- Personality micro-moments via `getPersonalityLine()` (path + time-of-day aware)
- "Messages" button in header navigates to `/messages` (no embedded chat — duplicate chat system killed 2026-03-24)
- **Sandy Intelligence Upgrade** (4 phases, all complete 2026-03-26):
  - Phase 1: Conversation Memory (reads back saved notes), Tool Detail Context (knows which tool you're viewing), Briefing Portability (fetches calendar/email/tasks on-demand from any page)
  - Phase 2: Token Budget Monitor (`app/lib/token-budget.ts` — trims low-priority prompt sections at 12K tokens), Messages Page Context (`app/lib/messages/sandy-context.ts` — unread counts + previews on `/messages`), Proactive Suggestions (`app/lib/proactive-suggestions.ts` — deadlines, flashcards, study rooms, unused tools)
  - Phase 3: `SandyPreference` schema model — per-user tone (formal/balanced/casual), proactivity (off/low/medium/high), response length (concise/standard/detailed), chips toggle. API: `GET/PUT /api/sandy/preferences`. Settings UI: `app/components/settings/SandyPreferences.tsx` on `/settings` page. Prompt section: `## SANDY BEHAVIOR PREFERENCES`
  - Phase 4: Transparency traces — `app/lib/sandy-trace.ts` collects sections/tokens/sources, `x-sandy-trace` response header, `SandyTracePanel.tsx` collapsible "What Sandy Knows" panel in ConciergePanel. Blueprints: `Blueprints/SANDY-INTELLIGENCE-PHASE-{1,2,3,4}.md`

---

## Sandy "Use This" Actions — Message Action Bar

Every Sandy assistant message across all chat surfaces gets a hover-reveal action bar with workflow actions. Blueprint: `Blueprints/STUDENT-SANDY-USE-THIS-ACTION.md`.

- **Components** (3 in `app/components/sandy/`): `MessageActions.tsx` (reusable action bar), `PinnedMessage.tsx` (sticky amber header, markdown-stripped preview), `Toast.tsx` (global event-based notifications)
- **Actions**: Copy (clipboard), Save to Notes (POST `/api/notes` with `source: 'sandy'`, spinner while saving), Pin/Unpin toggle (session-scoped sticky header)
- **Desktop**: hover-reveal buttons below message (requires `group` class on parent). **Mobile**: "Actions..." tap button + long-press -> bottom sheet
- **Pinned Message**: One pin at a time, session-scoped (not persisted). Amber `sticky top-0` bar. Pin button toggles to Unpin (PinOff icon) when message is active pin. Preview strips markdown to plain text.
- **Toast**: `showToast()` callable from anywhere via `CustomEvent`. `<ToastContainer>` mounted in `ClientProviders.tsx`.
- **Integrated into**: `SandyMessage.tsx` (ConciergePanel + SandyCenter), `ChatInterface.tsx`, `SandyInterviewPanel.tsx`, `StudyBuddyInterface.tsx`
- **isLoading gate**: All surfaces gate MessageActions on `!isLoading` / `!isSandyTyping` to prevent actions on mid-stream messages
- **No schema changes** — uses existing `StudentNote` model and `/api/notes` POST route

---

## Email Intelligence Layer — 10/10 Sprints Complete

Architecture doc: `ARCHITECTURE-EMAIL-SANDY-INTELLIGENCE.md`. All services in `app/lib/assistant/`. Sandy agent tools in `app/lib/agent/tools/communication-tools.ts`.

| Sprint | Feature | Key File |
|---|---|---|
| S1 | Proactive inbox insights in briefing | `email-insight-service.ts` |
| S2 | Cross-system reasoning (email+calendar+courses) | `agent-system-prompt.ts` workflow |
| S3 | Learned email rules from draft patterns | `email-rule-learner.ts` |
| S4 | Follow-up tracking for stale threads | `email-followup-service.ts` |
| S5 | Inline email cards in Sandy chat | `SandyEmailCard.tsx` |
| S6 | Smart compose from any page | `email-compose-service.ts` |
| S7 | Heuristic urgency scoring (0-100, no LLM) | `email-urgency-service.ts` |
| S8 | Thread summarization + DB cache | `email-thread-summary-service.ts` |
| S9 | Tone matching (auto-matches user's writing style) | `email-tone-drift-service.ts` |
| S10 | Email <-> Commons bridge (stall detection) | `email-commons-bridge-service.ts` |

Schema additions: `urgencyScore`/`urgencyBucket`/`urgencyReasons` on `AssistantEmail`, `AssistantThreadSummary` model. Urgency buckets: `respond-today` / `this-week` / `when-free` / `archive`. Scoring backfills lazily on first inbox read.

Sandy agent tools added: `get_unread_emails` (includes urgency), `summarize_thread`, `detect_thread_stall`.
