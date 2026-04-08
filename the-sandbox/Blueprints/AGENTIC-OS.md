# ARCHITECTURE: Sandy Agentic OS — Agent Profiles v1

> **Status:** Blueprint (not yet built)
> **Date:** 2026-03-30
> **Scope:** Sprints 1-3 — AgentProfile model, agent builder, parameterized agent loop
> **Patent relevance:** HIGH — establishes the composable agent layer in the interdependency chain

---

## 1. Vision

Transform Sandy from a monolithic agent (one system prompt, one tool set) into a **composable agent platform** where any user — student, educator, staff, admin — can create named, reusable agent profiles with curated tool subsets, custom instructions, and governed sharing.

The existing Sandy "classes" (Concierge, Teaching Assistant, Research Assistant, etc.) become pre-installed agent profiles. Users create their own. A marketplace lets agents be shared, forked, and improved across the institution — the platform self-extends.

**v1 scope (this document):**
- `AgentProfile` Prisma model with full lifecycle
- Agent Builder page (Sandy-guided creation flow)
- Parameterized `agent-loop.ts` that accepts an `AgentProfile` instead of the hardcoded system prompt
- Profile selector in `ConciergePanel.tsx`
- Agent marketplace (browse, fork, share)

**Deferred to v2:**
- Trigger system (cron + event bus for ambient/background agents)
- Agent chaining (output of one agent → input of next)
- Agent tray UI (background process monitor)
- Institutional governance panel

---

## 2. Design Decisions (from Phase 1 scoping)

| Decision | Choice | Rationale |
|---|---|---|
| MVP scope | Sprints 1-3 only | Profile model + builder + parameterized loop is transformative with ~400 lines of new code |
| Who creates agents | Everyone including students | AI education is a core mission; mirrors existing tool approval flow |
| Existing Sandy classes | Coexist, then subsume | Agent profiles layer on top; existing hardcoded classes keep working |
| Runtime model | Synchronous only (v1) | User picks agent, talks to it. No background scheduler or event bus yet |
| UI location | Inside Sandy panel | Profile selector dropdown in ConciergePanel. No new pages except builder + browse |
| Memory isolation | Isolated threads per agent | Each agent gets its own conversation. Read access to shared user context |
| Blast radius | 3 guardrails | Capability allow-list, maxActionsPerRun cap, SYSTEM_ONLY_TOOLS set |
| Approval flow | Private=instant, sharing=approval | Identical to existing tool approval flow |
| Differentiator | The marketplace | Users building agents for each other creates the ecosystem |
| Patent claim | Full-stack interdependency | Tool registry → agent profiles → marketplace → institutional governance |

---

## 3. Data Model

### 3.1 New Prisma Models

```prisma
// ─── Agent Profile ──────────────────────────────────────────────────
// A composable agent configuration that parameterizes Sandy's behavior.
// Analogous to Tool but for agent personas instead of learning experiences.

model AgentProfile {
  id                  String              @id @default(cuid())
  name                String              // "Study Sentinel", "Socratic Physics Tutor"
  slug                String              @unique // URL-safe identifier
  description         String              // One-line description for browse/search
  icon                String              @default("Bot") // lucide-react icon name
  color               String              @default("#0033A0") // Accent color for UI

  // ─── Agent Behavior ─────────────────────────────────────────────
  systemPrompt        String              // Custom instructions prepended to Sandy's base prompt
  capabilities        String[]            // Tool name allow-list (e.g. ["get_calendar", "draft_email"])
  welcomeMessage      String?             // First message when agent activates
  starterQuestions    String[]            // Suggested conversation starters
  maxActionsPerRun    Int                 @default(10) // Blast radius cap

  // ─── Categorization ─────────────────────────────────────────────
  category            AgentCategory       @default(GENERAL)
  tags                String[]            // Free-form tags for search/filter
  targetRoles         UserRole[]          // Which roles this agent is designed for

  // ─── Governance ─────────────────────────────────────────────────
  visibility          AgentVisibility     @default(PRIVATE)
  approvalStatus      ApprovalStatus      @default(COMMUNITY) // Reuse existing enum
  reviewedBy          String?
  reviewedAt          DateTime?

  // ─── Ownership & Forking ────────────────────────────────────────
  creatorId           String
  creator             User                @relation("AgentProfileCreator", fields: [creatorId], references: [id])
  forkedFromId        String?
  forkedFrom          AgentProfile?       @relation("AgentProfileForks", fields: [forkedFromId], references: [id])
  forks               AgentProfile[]      @relation("AgentProfileForks")

  // ─── Usage Tracking ─────────────────────────────────────────────
  useCount            Int                 @default(0) // Total activations
  forkCount           Int                 @default(0) // Number of forks

  // ─── Timestamps ─────────────────────────────────────────────────
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  // ─── Relations ──────────────────────────────────────────────────
  sessions            AgentSession[]
  favorites           AgentFavorite[]

  @@index([creatorId])
  @@index([visibility, approvalStatus])
  @@index([category])
  @@index([slug])
}

model AgentSession {
  id                  String              @id @default(cuid())
  profileId           String
  profile             AgentProfile        @relation(fields: [profileId], references: [id])
  userId              String
  user                User                @relation("AgentSessions", fields: [userId], references: [id])
  messages            Json                // Conversation history (AgentChatRequest.messages format)
  toolCallCount       Int                 @default(0) // Tools invoked this session
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  @@index([profileId])
  @@index([userId])
}

model AgentFavorite {
  id                  String              @id @default(cuid())
  profileId           String
  profile             AgentProfile        @relation(fields: [profileId], references: [id])
  userId              String
  user                User                @relation("AgentFavorites", fields: [userId], references: [id])
  createdAt           DateTime            @default(now())

  @@unique([profileId, userId])
  @@index([userId])
}

// ─── Enums ──────────────────────────────────────────────────────────

enum AgentCategory {
  GENERAL           // Catch-all
  STUDY             // Study aids, tutoring, flashcards
  PRODUCTIVITY      // Email, calendar, task management
  ANALYSIS          // Data analysis, research, synthesis
  COMMUNICATION     // Outreach, drafting, messaging
  COACHING          // Teaching practice, interview prep, writing
  MONITORING        // Risk detection, compliance, alerts
  CREATIVE          // Content creation, brainstorming
}

enum AgentVisibility {
  PRIVATE           // Only creator can use
  SHARED            // Anyone can use (requires approval)
  INSTITUTIONAL     // Deployed by admin, available to targeted roles
}
```

### 3.2 User Model Additions

```prisma
model User {
  // ... existing fields ...

  // Agent OS
  agentProfiles       AgentProfile[]     @relation("AgentProfileCreator")
  agentSessions       AgentSession[]     @relation("AgentSessions")
  agentFavorites      AgentFavorite[]    @relation("AgentFavorites")
  activeAgentId       String?            // Currently selected agent profile ID (null = default Sandy)
}
```

### 3.3 System-Only Tools

Tools that only institution-deployed agents (`visibility: INSTITUTIONAL`) can access:

```typescript
// app/lib/agent/agent-profile-constants.ts

export const SYSTEM_ONLY_TOOLS = new Set([
  'post_announcement',
  'submit_grades_to_sis',
  'send_announcement',
  'update_department_website',
]);
```

### 3.4 Pre-Installed Agent Profiles (Seed Data)

These replace the existing hardcoded Sandy "classes" over time. Seeded with `visibility: INSTITUTIONAL`, `approvalStatus: APPROVED`:

| Name | Slug | Category | Key Capabilities | Target Roles |
|---|---|---|---|---|
| Sandy (Default) | `default` | GENERAL | All tools (no filter) | All |
| Morning Briefing | `morning-briefing` | PRODUCTIVITY | calendar, email, tasks, analytics | All |
| Student Check-In | `student-check-in` | MONITORING | academic, analytics, communication | EDUCATOR, ADMIN |
| Course Health | `course-health` | ANALYSIS | analytics, academic | EDUCATOR, ADMIN |
| Study Coach | `study-coach` | STUDY | academic, ai-literacy, fingerprint | STUDENT |
| Research Assistant | `research-assistant` | ANALYSIS | academic, content, document | All |
| Campus Guide | `campus-guide` | GENERAL | campus | All |
| Outreach Coach | `outreach-coach` | COMMUNICATION | communication, philanthropy | All |
| Crisis Responder | `crisis-responder` | COMMUNICATION | crisis-comms, communication | EDUCATOR, ADMIN, STAFF |

---

## 4. Architecture

### 4.1 File Structure

```
app/
├── lib/
│   └── agent/
│       ├── agent-loop.ts              # MODIFIED: accepts AgentProfile param
│       ├── agent-system-prompt.ts     # MODIFIED: merges profile.systemPrompt
│       ├── agent-types.ts             # MODIFIED: new types
│       ├── agent-profile-service.ts   # NEW: CRUD + fork + search + capability validation
│       ├── agent-profile-constants.ts # NEW: SYSTEM_ONLY_TOOLS, pre-installed profiles
│       └── tool-registry.ts           # MODIFIED: new method getToolDefinitionsForProfile()
├── api/
│   └── agent/
│       ├── chat/route.ts              # MODIFIED: accepts profileId param
│       ├── approve/route.ts           # unchanged
│       └── profiles/
│           ├── route.ts               # NEW: GET (list/search), POST (create)
│           ├── [id]/route.ts          # NEW: GET, PUT, DELETE
│           ├── [id]/fork/route.ts     # NEW: POST (fork a profile)
│           └── favorites/route.ts     # NEW: GET, POST, DELETE
├── components/
│   ├── agent/
│   │   ├── AgentMessageRenderer.tsx   # unchanged
│   │   ├── AgentProfilePicker.tsx     # NEW: dropdown/modal in ConciergePanel
│   │   ├── AgentProfileCard.tsx       # NEW: card for browse grid
│   │   └── AgentBuilderChat.tsx       # NEW: Sandy-guided builder chat
│   └── ConciergePanel.tsx             # MODIFIED: integrates AgentProfilePicker
├── hooks/
│   ├── useAgentStream.ts              # MODIFIED: sends profileId
│   └── useAgentProfiles.ts            # NEW: fetch/cache user's agent profiles
├── agents/
│   ├── build/page.tsx                 # NEW: agent builder page
│   └── browse/page.tsx                # NEW: agent marketplace page
```

### 4.2 Modified: agent-loop.ts

The key change: `runAgentLoop` accepts an optional `profileId`. If provided, the loop fetches the `AgentProfile`, validates the user's access, filters tools to the profile's `capabilities` allow-list, and merges the profile's `systemPrompt` into Sandy's base prompt.

```typescript
// Current signature:
interface AgentLoopParams {
  request: AgentChatRequest;
  user: AgentUser;
  config?: Partial<AgentLoopConfig>;
}

// New signature:
interface AgentLoopParams {
  request: AgentChatRequest;
  user: AgentUser;
  config?: Partial<AgentLoopConfig>;
  profileId?: string;          // NEW — optional agent profile to activate
}
```

**Inside `executeLoop()`**, the changes are:

1. **Fetch profile** (if `profileId` provided):
   ```typescript
   let profile: AgentProfile | null = null;
   if (profileId) {
     profile = await getAgentProfile(profileId, user);
     if (!profile) throw new Error('Agent profile not found or access denied');
   }
   ```

2. **Filter tools by capabilities**:
   ```typescript
   // Current: tools from registry filtered by role + page
   const tools = registry.getToolDefinitionsForPage(user.role, request.currentPage, user);

   // New: if profile has capabilities, intersect with profile's allow-list
   let tools = registry.getToolDefinitionsForPage(user.role, request.currentPage, user);
   if (profile?.capabilities.length) {
     const allowed = new Set(profile.capabilities);
     tools = tools.filter(t => allowed.has(t.name));
   }
   ```

3. **Override maxIterations** from profile:
   ```typescript
   const effectiveConfig: AgentLoopConfig = {
     ...config,
     maxIterations: Math.min(
       config.maxIterations,
       profile?.maxActionsPerRun ?? config.maxIterations
     ),
   };
   ```

4. **Merge system prompt** (profile prompt prepended as a section):
   ```typescript
   // In buildAgentSystemPrompt(), add a new section:
   if (profile) {
     prompt += `\n\nAGENT PROFILE: ${profile.name}\n${profile.systemPrompt}`;
   }
   ```

### 4.3 Modified: agent-system-prompt.ts

Add a new parameter to `PromptContext`:

```typescript
interface PromptContext {
  user: AgentUser;
  currentPage?: string;
  toolRegistry: ToolRegistry;
  universitySystemsSnapshot?: UniversitySystemsSnapshot | null;
  agentProfile?: {              // NEW
    name: string;
    systemPrompt: string;
    welcomeMessage?: string;
  } | null;
}
```

In `buildAgentSystemPrompt()`, after the base prompt and before workflow templates:

```typescript
// Agent profile overlay — custom instructions from the active agent profile
if (ctx.agentProfile) {
  prompt += `

AGENT PROFILE: "${ctx.agentProfile.name}"
You are currently operating as a specialized agent. Follow these additional instructions:

${ctx.agentProfile.systemPrompt}

Stay in character as this agent. If the user asks something outside your specialty, help if you can, but note that another agent profile might be better suited.`;
}
```

### 4.4 Modified: tool-registry.ts

Add one new method to `ToolRegistry`:

```typescript
/**
 * Get tools filtered by an explicit allow-list of tool names.
 * Used by agent profiles to restrict Sandy to a curated tool subset.
 * Still applies role filtering — a profile can't grant tools the user's role lacks.
 */
getToolDefinitionsForProfile(
  role: UserRole,
  capabilities: string[],
  currentPage: string | undefined,
  user?: AgentUser
): AnthropicToolDef[] {
  // Start with page-filtered tools (applies role + page filtering)
  const pageFiltered = this.getToolDefinitionsForPage(role, currentPage, user);

  // If no capabilities specified, return all (default Sandy behavior)
  if (!capabilities.length) return pageFiltered;

  // Intersect with the profile's allow-list
  const allowed = new Set(capabilities);
  return pageFiltered.filter(t => allowed.has(t.name));
}
```

### 4.5 Modified: AgentChatRequest

```typescript
// agent-types.ts
export interface AgentChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  currentPage?: string;
  sessionId?: string;
  profileId?: string;     // NEW — which agent profile to activate
}
```

### 4.6 Modified: /api/agent/chat/route.ts

Pass `profileId` through to `runAgentLoop`:

```typescript
const stream = runAgentLoop({
  request: body,
  user: agentUser,
  profileId: body.profileId,  // NEW
});
```

### 4.7 Modified: useAgentStream.ts

Accept and send `profileId`:

```typescript
interface UseAgentStreamOptions {
  userEmail: string;
  currentPage?: string;
  profileId?: string;      // NEW
}

// In sendMessage():
const body: AgentChatRequest = {
  messages,
  currentPage,
  sessionId: sid,
  profileId,               // NEW
};
```

### 4.8 Modified: ConciergePanel.tsx

Add the profile picker to the header bar. When a profile is selected, it's passed to the agent stream hook. The Sandy header pill shows the active agent's name instead of "Sandy":

```
┌─────────────────────────────────────────┐
│ [Bot] Study Coach ▾  Messages  ⚡ ↺  ─  │  ← Profile name + dropdown trigger
├─────────────────────────────────────────┤
│ Agent Mode: Study Coach                 │  ← Indicator bar shows profile name
├─────────────────────────────────────────┤
│                                         │
│  Chat area (unchanged)                  │
│                                         │
└─────────────────────────────────────────┘
```

The `AgentProfilePicker` component:
- Dropdown triggered by clicking the agent name pill in the header
- Shows: user's favorites (pinned), recently used, "Browse all..." link
- "Default Sandy" is always the first option (clears profileId)
- Selected profile sets `activeProfileId` in a React state (and persists to `localStorage`)
- Profile selection auto-enables agent mode if not already on

### 4.9 New: agent-profile-service.ts

Core service with these functions:

```typescript
// CRUD
createAgentProfile(data: CreateProfileInput, user: AgentUser): Promise<AgentProfile>
getAgentProfile(id: string, user: AgentUser): Promise<AgentProfile | null>  // access-checked
updateAgentProfile(id: string, data: UpdateProfileInput, user: AgentUser): Promise<AgentProfile>
deleteAgentProfile(id: string, user: AgentUser): Promise<void>

// Discovery
listAgentProfiles(filters: ProfileFilters): Promise<AgentProfile[]>
searchAgentProfiles(query: string, role: UserRole): Promise<AgentProfile[]>

// Marketplace
forkAgentProfile(id: string, user: AgentUser): Promise<AgentProfile>
getPopularProfiles(role: UserRole, limit?: number): Promise<AgentProfile[]>

// Favorites
toggleFavorite(profileId: string, userId: string): Promise<boolean>
getUserFavorites(userId: string): Promise<AgentProfile[]>

// Validation
validateCapabilities(capabilities: string[], userRole: UserRole, visibility: AgentVisibility): string[]
  // Returns list of invalid tool names. Checks:
  // 1. Tool exists in registry
  // 2. User's role has access to the tool
  // 3. SYSTEM_ONLY_TOOLS only allowed for INSTITUTIONAL visibility

// Usage
incrementUseCount(profileId: string): Promise<void>
getRecentlyUsed(userId: string, limit?: number): Promise<AgentProfile[]>

// Session persistence
saveAgentSession(profileId: string, userId: string, messages: unknown[], toolCallCount: number): Promise<void>
getAgentSession(profileId: string, userId: string): Promise<AgentSession | null>
```

**Access control rules:**
- `PRIVATE` profiles: only creator can read/use
- `SHARED` + `APPROVED`: anyone can read/use
- `SHARED` + `COMMUNITY/PENDING`: only creator can use (visible in browse with "pending" badge)
- `INSTITUTIONAL`: anyone in `targetRoles` can use; only ADMIN can create/edit
- Edit/delete: only creator (or ADMIN for institutional)

### 4.10 New: API Routes

**`GET /api/agent/profiles`** — List/search profiles
```
Query params:
  - category?: AgentCategory
  - role?: UserRole (filter by targetRoles)
  - search?: string (name/description/tags)
  - visibility?: 'mine' | 'shared' | 'institutional' | 'favorites'
  - limit?: number (default 20)
  - offset?: number

Returns: { profiles: AgentProfile[], total: number }
Auth: requireRequestUser
```

**`POST /api/agent/profiles`** — Create a profile
```
Body: { name, description, systemPrompt, capabilities, category, tags, targetRoles, icon?, color?, welcomeMessage?, starterQuestions?, maxActionsPerRun? }
Returns: AgentProfile
Auth: requireRequestUser
Validation: validateCapabilities() must pass
Side effect: generates slug from name (kebab-case, collision-safe via suffix)
```

**`GET /api/agent/profiles/[id]`** — Get a profile
```
Returns: AgentProfile (with creator name, fork count, use count)
Auth: requireRequestUser, access-checked
```

**`PUT /api/agent/profiles/[id]`** — Update a profile
```
Body: Partial<CreateProfileInput>
Auth: requireRequestUser, must be creator or ADMIN
Side effect: if visibility changed from PRIVATE to SHARED, set approvalStatus to PENDING
```

**`DELETE /api/agent/profiles/[id]`** — Delete a profile
```
Auth: requireRequestUser, must be creator or ADMIN
Side effect: cascades to AgentSession, AgentFavorite
```

**`POST /api/agent/profiles/[id]/fork`** — Fork a profile
```
Returns: new AgentProfile (PRIVATE, linked via forkedFromId)
Auth: requireRequestUser
Side effect: increments source profile's forkCount
```

**`GET /api/agent/profiles/favorites`** — User's favorite profiles
**`POST /api/agent/profiles/favorites`** — Toggle favorite
```
Body: { profileId }
Auth: requireRequestUser
```

### 4.11 New: Agent Builder Page (`/agents/build`)

Sandy-guided conversational builder at `/agents/build`. Uses the existing `SandyInterviewPanel` pattern (split-panel: output left, Sandy chat right).

**Left panel (7 cols):** Live preview of the agent profile as it's being built
- Name, description, icon preview
- Selected capabilities (tool chips with remove buttons)
- System prompt preview (editable textarea)
- Starter questions
- "Save as Private" / "Publish to Marketplace" buttons

**Right panel (5 cols):** Sandy chat (reuses `SandyInterviewPanel`)
- Sandy asks: "What should this agent help with?"
- Sandy suggests capabilities based on the description
- Sandy drafts the system prompt, user can edit
- `<!--PHASE:name-->` markers drive the builder state machine
- Phases: `describe` → `capabilities` → `prompt` → `starters` → `review`

**Sandy builder system prompt** (in a dedicated service file `agent-builder-service.ts`):
```
You are Sandy, helping the user create a custom agent profile.

Guide them through these steps:
1. DESCRIBE: Ask what the agent should do. Get a name and one-line description.
2. CAPABILITIES: Based on the description, suggest relevant tools from the available set. Present them as chips the user can accept/reject.
3. PROMPT: Draft custom instructions for the agent. The user can edit.
4. STARTERS: Suggest 3-4 conversation starters.
5. REVIEW: Show a summary and ask for confirmation.

Available tools for this user's role: [injected tool list]

Use <!--PHASE:name--> markers to signal phase transitions.
Use <!--CHIPS:["tool1","tool2"]--> to suggest tool capabilities.
```

### 4.12 New: Agent Browse Page (`/agents/browse`)

Grid layout mirroring `/hub/browse`:

```
┌──────────────────────────────────────────────────────┐
│ Agent Marketplace                    [+ Build Agent] │
│ Search: [_________________]                          │
│ Filter: [All] [Study] [Productivity] [Analysis] ...  │
├──────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │
│ │ Study Coach  │ │ Morning     │ │ Socratic    │     │
│ │ ⭐ 142 uses  │ │ Briefing    │ │ Tutor       │     │
│ │ By: system   │ │ ⭐ 89 uses   │ │ ⭐ 67 uses   │     │
│ │ [Activate]   │ │ [Activate]  │ │ [Fork]      │     │
│ └─────────────┘ └─────────────┘ └─────────────┘     │
│                                                      │
│ My Agents                                            │
│ ┌─────────────┐ ┌─────────────┐                      │
│ │ My Custom   │ │ Physics     │                      │
│ │ Agent       │ │ Helper      │                      │
│ │ [Edit]      │ │ [Edit]      │                      │
│ └─────────────┘ └─────────────┘                      │
└──────────────────────────────────────────────────────┘
```

**Sections:**
1. Institutional agents (pre-installed, always at top)
2. Popular shared agents (sorted by useCount)
3. My agents (user-created, with edit/delete controls)

**AgentProfileCard** component:
- Icon + color accent
- Name, description (2-line clamp)
- Creator name + role badge
- Use count + fork count
- Action button: "Activate" (sets as active) / "Fork" (for shared) / "Edit" (for own)

### 4.13 New: Navigation

Add to `Header.tsx`:
- "Agents" link in the Explore section of quick links → `/agents/browse`
- On the build page (`/build`), add a tab or link to "Build Agent" → `/agents/build`

Add to `concierge-utils.ts`:
- Page descriptions for `/agents/build` and `/agents/browse`
- Starter chips for agent pages

---

## 5. State & Data Flow

### 5.1 Agent Activation Flow

```
User clicks profile picker in ConciergePanel
  → AgentProfilePicker shows dropdown (favorites + recent + "Browse all")
  → User selects "Study Coach"
  → setState: activeProfileId = "clxyz..."
  → localStorage: sandy-active-agent = "clxyz..."
  → Agent mode auto-enables (if not already on)
  → Sandy header shows "Study Coach ▾" instead of "Sandy"
  → User sends message
  → useAgentStream sends { profileId: "clxyz...", messages: [...] }
  → POST /api/agent/chat with profileId in body
  → agent-loop.ts fetches AgentProfile from DB
  → Validates: user can access this profile
  → Filters tools to profile.capabilities
  → Merges profile.systemPrompt into Sandy's base prompt
  → Sets maxIterations = min(config, profile.maxActionsPerRun)
  → Runs standard agentic loop with filtered tools + merged prompt
  → Streams SSE events back (identical format — no client changes needed)
  → On completion: incrementUseCount, saveAgentSession
```

### 5.2 Agent Creation Flow

```
User navigates to /agents/build
  → Sandy (builder mode) asks "What should this agent help with?"
  → User describes: "Help me study for organic chemistry exams"
  → Sandy suggests name: "Organic Chem Study Partner"
  → Sandy suggests capabilities: [get_courses, get_student_progress, ...]
  → User accepts/rejects tools via chip buttons
  → Sandy drafts system prompt
  → User edits in left panel textarea
  → Sandy suggests starter questions
  → User clicks "Save as Private"
  → POST /api/agent/profiles → creates AgentProfile
  → Redirect to /agents/browse or auto-activate
```

### 5.3 Agent Forking Flow

```
User browses /agents/browse
  → Sees "Socratic Physics Tutor" by another user (SHARED + APPROVED)
  → Clicks "Fork"
  → POST /api/agent/profiles/{id}/fork
  → Creates new PRIVATE profile with forkedFromId set
  → User lands on their copy, can edit systemPrompt/capabilities
  → Source profile's forkCount incremented
```

---

## 6. Capability Validation Rules

When creating or updating an agent profile, `validateCapabilities()` enforces:

1. **Tool exists**: Every name in `capabilities` must exist in the tool registry
2. **Role access**: The creator's role must have access to each tool (checked via `ToolDefinition.roles`)
3. **System-only gate**: Tools in `SYSTEM_ONLY_TOOLS` are only valid for `INSTITUTIONAL` visibility profiles
4. **Empty = all**: If `capabilities` is empty, the agent has access to all tools the user's role permits (default Sandy behavior)

At runtime, the loop applies a **double filter**:
1. Role + page filter (existing behavior)
2. Profile capabilities intersect (new behavior)

This means an agent can never access tools its creator's role doesn't have, even if those tool names are in the `capabilities` array.

---

## 7. Sandy Panel Integration Details

### 7.1 AgentProfilePicker Component

Located inside the ConciergePanel header bar, replacing the static "Sandy" pill:

```tsx
// Collapsed state (in header):
<button onClick={togglePicker}>
  <Bot className="size-3.5" />
  {activeProfile?.name || 'Sandy'} ▾
</button>

// Expanded state (dropdown):
<div className="absolute left-0 top-full w-80 bg-white rounded-xl shadow-xl border z-50">
  {/* Default Sandy */}
  <ProfileOption name="Sandy" subtitle="Default assistant" isDefault />

  {/* Favorites */}
  {favorites.length > 0 && <Section title="Favorites" profiles={favorites} />}

  {/* Recently used */}
  {recent.length > 0 && <Section title="Recent" profiles={recent} />}

  {/* Footer */}
  <Link to="/agents/browse">Browse all agents...</Link>
  <Link to="/agents/build">+ Build an agent</Link>
</div>
```

### 7.2 State Management

The active profile ID is managed in `SandyAmbientContext` (the shared Sandy brain):

```typescript
// In useSandyAmbient (or SandyAmbientProvider):
const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
  try { return localStorage.getItem('sandy-active-agent') } catch { return null }
});

// Persists to localStorage on change
useEffect(() => {
  try {
    if (activeProfileId) localStorage.setItem('sandy-active-agent', activeProfileId);
    else localStorage.removeItem('sandy-active-agent');
  } catch {}
}, [activeProfileId]);

// Auto-enable agent mode when profile is selected
useEffect(() => {
  if (activeProfileId && !agentMode) toggleAgentMode();
}, [activeProfileId]);
```

### 7.3 Conversation Reset on Profile Switch

When the user switches agent profiles:
1. Clear current messages (like the existing RotateCcw button)
2. If the new profile has a `welcomeMessage`, show it as the first assistant message
3. Show the profile's `starterQuestions` instead of page-based starters

---

## 8. Seed Data Script

`scripts/seed-agent-profiles.ts` — creates the 9 pre-installed institutional agent profiles from section 3.4. Idempotent (upserts by slug).

Each seed profile includes:
- Full system prompt tailored to the agent's specialty
- Curated `capabilities` array (only relevant tools)
- Role-appropriate `targetRoles`
- 3-4 `starterQuestions`
- `welcomeMessage`
- `visibility: INSTITUTIONAL`, `approvalStatus: APPROVED`

---

## 9. Security Considerations

1. **No privilege escalation**: Agent profiles cannot grant tools beyond the user's role. The double filter (role + capabilities) ensures this.
2. **SYSTEM_ONLY_TOOLS**: Dangerous tools (announcements, grade submission) are gated behind `INSTITUTIONAL` visibility — only admin-created agents can use them.
3. **maxActionsPerRun**: Prevents runaway loops. Default 10, adjustable per profile. Runtime enforces `Math.min(config, profile.maxActionsPerRun)`.
4. **Approval flow**: Shared profiles require admin approval before others can use them. Prevents malicious prompt injection via shared agents.
5. **System prompt injection defense**: Profile system prompts are injected as a clearly demarcated section (`AGENT PROFILE:`) after Sandy's core rules. Sandy's core rules (including the approval gate for write actions) cannot be overridden by profile prompts.
6. **No direct DB access**: Agent profiles only interact through the existing tool registry. No new surface area for SQL injection or data exfiltration.

---

## 10. Testing Plan

| Test | Method |
|---|---|
| Profile CRUD | Seed + API tests (create, read, update, delete) |
| Capability validation | Unit test `validateCapabilities()` with invalid tools, system-only tools, cross-role tools |
| Tool filtering | Unit test: profile with 3 capabilities → only those 3 tools in Claude's tool list |
| Access control | API test: user A can't use user B's private profile |
| Fork flow | API test: fork creates copy, increments forkCount, sets forkedFromId |
| System prompt merge | Unit test: base prompt + profile prompt → combined output |
| Profile picker | Manual: select profile → header shows name, agent mode activates, tools filtered |
| Builder flow | Manual: Sandy walks through 5 phases, creates valid profile |
| Approval flow | Manual: create shared profile → status is PENDING → admin approves → others can use |

---

## 11. Migration Path for Existing Sandy Classes

The existing hardcoded Sandy classes (Teaching Assistant, Research Assistant, etc.) continue working unchanged in v1. Migration plan:

1. **v1 (this sprint)**: Agent profiles exist alongside hardcoded classes. The concierge/tool chat flows still use their own system prompts.
2. **v1.1**: Create institutional agent profiles that mirror each existing class.
3. **v2**: Replace hardcoded class switching with agent profile activation. Each Sandy surface (tool chat, study buddy, etc.) activates the appropriate profile.

No existing code needs to change for v1 — agent profiles are purely additive.
