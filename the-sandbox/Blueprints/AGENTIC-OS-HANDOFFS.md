# Sandy Agentic OS — Handoff Prompts

8 sequential handoff prompts. Copy each into a fresh Claude Code instance.
Each phase contains exactly 2 tasks.

---

## Phase 1: Data Layer (Prisma Schema)

```markdown
# Handoff Prompt: Sandy Agentic OS — Phase 1 of 8

## Context
We are building Sandy Agent Profiles — a composable agent system that lets users
create, share, and fork custom Sandy agent configurations with curated tool subsets
and custom system prompts. The full architecture is in `Blueprints/AGENTIC-OS.md`.
Read it FIRST before writing any code.

Also read `CLAUDE.md` for all project conventions (Prisma v7, naming, auth patterns).

Nothing has been built yet. This is Phase 1 — the data layer.

## The Goal
Execute ONLY these 2 tasks, then STOP:

### Task A: Add Prisma schema models
Add to `prisma/schema.prisma` (at the END of the file, before no other models):

1. **`AgentCategory` enum** with values: GENERAL, STUDY, PRODUCTIVITY, ANALYSIS,
   COMMUNICATION, COACHING, MONITORING, CREATIVE

2. **`AgentVisibility` enum** with values: PRIVATE, SHARED, INSTITUTIONAL

3. **`AgentProfile` model** with these exact fields:
   - `id` String @id @default(cuid())
   - `name` String
   - `slug` String @unique
   - `description` String
   - `icon` String @default("Bot")
   - `color` String @default("#0033A0")
   - `systemPrompt` String
   - `capabilities` String[] — tool name allow-list
   - `welcomeMessage` String?
   - `starterQuestions` String[]
   - `maxActionsPerRun` Int @default(10)
   - `category` AgentCategory @default(GENERAL)
   - `tags` String[]
   - `targetRoles` UserRole[] — which roles this agent targets
   - `visibility` AgentVisibility @default(PRIVATE)
   - `approvalStatus` ApprovalStatus @default(COMMUNITY) — reuse existing enum
   - `reviewedBy` String?
   - `reviewedAt` DateTime?
   - `creatorId` String — relation to User
   - `creator` User @relation("AgentProfileCreator", fields: [creatorId], references: [id])
   - `forkedFromId` String?
   - `forkedFrom` AgentProfile? @relation("AgentProfileForks", fields: [forkedFromId], references: [id])
   - `forks` AgentProfile[] @relation("AgentProfileForks")
   - `useCount` Int @default(0)
   - `forkCount` Int @default(0)
   - `createdAt` DateTime @default(now())
   - `updatedAt` DateTime @updatedAt
   - `sessions` AgentSession[]
   - `favorites` AgentFavorite[]
   - Indexes: `@@index([creatorId])`, `@@index([visibility, approvalStatus])`,
     `@@index([category])`, `@@index([slug])`

4. **`AgentSession` model**:
   - `id` String @id @default(cuid())
   - `profileId` String — relation to AgentProfile
   - `profile` AgentProfile
   - `userId` String — relation to User
   - `user` User @relation("AgentSessions", ...)
   - `messages` Json
   - `toolCallCount` Int @default(0)
   - `createdAt` DateTime @default(now())
   - `updatedAt` DateTime @updatedAt
   - Indexes: `@@index([profileId])`, `@@index([userId])`

5. **`AgentFavorite` model**:
   - `id` String @id @default(cuid())
   - `profileId` String — relation to AgentProfile
   - `profile` AgentProfile
   - `userId` String — relation to User
   - `user` User @relation("AgentFavorites", ...)
   - `createdAt` DateTime @default(now())
   - `@@unique([profileId, userId])`
   - `@@index([userId])`

6. **User model additions** — add these relation fields to the existing User model:
   - `agentProfiles AgentProfile[] @relation("AgentProfileCreator")`
   - `agentSessions AgentSession[] @relation("AgentSessions")`
   - `agentFavorites AgentFavorite[] @relation("AgentFavorites")`
   - `activeAgentId String?`

### Task B: Run migration and verify
1. Run: `npx prisma migrate dev --name add-agent-profiles`
2. Run: `npx prisma generate`
3. Run: `npx tsc --noEmit` to verify no type errors
4. Run: `npm run build` to verify full build passes

## Critical Constraints
- Prisma v7 with PrismaPg adapter — connection string in `prisma.config.ts`
- Generated client output: `app/generated/prisma` — import from `../generated/prisma`
- Reuse existing `ApprovalStatus` and `UserRole` enums — do NOT duplicate them
- Place new enums and models AFTER existing ones at the end of schema.prisma

## The Next Link
After completing both tasks, generate the next handoff prompt for Phase 2:
- Task A: Create `app/lib/agent/agent-profile-service.ts`
- Task B: Create `app/lib/agent/agent-profile-constants.ts`
Include what was completed in Phase 1, the architecture doc location, and
exact function signatures from Section 4.9 of the architecture doc.
```

---

## Phase 2: Service Layer

```markdown
# Handoff Prompt: Sandy Agentic OS — Phase 2 of 8

## Context
We are building Sandy Agent Profiles — a composable agent system for the platform.
Full architecture: `Blueprints/AGENTIC-OS.md`. Read it and `CLAUDE.md` first.

**Phase 1 is complete:**
- Prisma schema has `AgentProfile`, `AgentSession`, `AgentFavorite` models
- Enums: `AgentCategory`, `AgentVisibility` (plus existing `ApprovalStatus`, `UserRole`)
- User model has `agentProfiles`, `agentSessions`, `agentFavorites` relations + `activeAgentId`
- Migration applied and build passes

This is Phase 2 — the service layer.

## The Goal
Execute ONLY these 2 tasks, then STOP:

### Task A: Create `app/lib/agent/agent-profile-service.ts`
This is the core business logic service. Follow the project's service file pattern
(see any file in `app/lib/` for conventions — named exports, no default export,
import prisma from `../prisma`).

Implement these functions:

```typescript
// CRUD
createAgentProfile(data: CreateProfileInput, userId: string): Promise<AgentProfile>
  // - Generate slug from name (kebab-case, append random suffix if collision)
  // - Validate capabilities via validateCapabilities()
  // - If visibility is INSTITUTIONAL, verify user is ADMIN role
  // - Set approvalStatus: PRIVATE→COMMUNITY, SHARED→PENDING, INSTITUTIONAL→APPROVED

getAgentProfile(id: string, userId: string): Promise<AgentProfile | null>
  // - Access control: PRIVATE=creator only, SHARED+APPROVED=anyone,
  //   SHARED+PENDING/COMMUNITY=creator only, INSTITUTIONAL=anyone in targetRoles
  // - Include creator { name, role } in response

updateAgentProfile(id: string, data: UpdateProfileInput, userId: string, userRole: string): Promise<AgentProfile>
  // - Must be creator or ADMIN
  // - If visibility changed PRIVATE→SHARED, set approvalStatus to PENDING
  // - Re-validate capabilities on update

deleteAgentProfile(id: string, userId: string, userRole: string): Promise<void>
  // - Must be creator or ADMIN
  // - Cascade delete: AgentSession, AgentFavorite

// Discovery
listAgentProfiles(filters: ProfileFilters): Promise<{ profiles: AgentProfile[]; total: number }>
  // filters: { category?, role?, visibility?, search?, creatorId?, limit?, offset? }
  // - 'mine' visibility filter: where creatorId = userId
  // - 'shared': visibility SHARED + approvalStatus APPROVED
  // - 'institutional': visibility INSTITUTIONAL
  // - search: name/description ILIKE

searchAgentProfiles(query: string, role: string): Promise<AgentProfile[]>
  // - Search name, description, tags
  // - Filter to profiles visible to this role

// Marketplace
forkAgentProfile(id: string, userId: string): Promise<AgentProfile>
  // - Copy all fields except: id, slug (regenerate), creatorId (new owner),
  //   visibility (PRIVATE), approvalStatus (COMMUNITY), useCount (0), forkCount (0)
  // - Set forkedFromId to source
  // - Increment source profile's forkCount

getPopularProfiles(role: string, limit?: number): Promise<AgentProfile[]>
  // - SHARED+APPROVED or INSTITUTIONAL, ordered by useCount desc

// Favorites
toggleFavorite(profileId: string, userId: string): Promise<boolean>
  // - Returns true if favorited, false if unfavorited
  // - Uses upsert/delete pattern

getUserFavorites(userId: string): Promise<AgentProfile[]>

// Validation
validateCapabilities(capabilities: string[], userRole: string, visibility: string): string[]
  // - Returns list of INVALID tool names (empty = all valid)
  // - Check 1: tool exists in registry (import getToolRegistry)
  // - Check 2: user's role has access (check ToolDefinition.roles)
  // - Check 3: SYSTEM_ONLY_TOOLS only allowed for INSTITUTIONAL visibility

// Usage tracking
incrementUseCount(profileId: string): Promise<void>
  // - prisma.agentProfile.update where id, data: { useCount: { increment: 1 } }

getRecentlyUsed(userId: string, limit?: number): Promise<AgentProfile[]>
  // - Query AgentSession ordered by updatedAt desc, take distinct profileIds, return profiles

// Session persistence
saveAgentSession(profileId: string, userId: string, messages: unknown[], toolCallCount: number): Promise<void>
  // - Upsert by profileId+userId (one active session per agent per user)

getAgentSession(profileId: string, userId: string): Promise<AgentSession | null>
```

Define these TypeScript interfaces at the top of the file:
```typescript
interface CreateProfileInput {
  name: string;
  description: string;
  systemPrompt: string;
  capabilities: string[];
  category?: AgentCategory;
  tags?: string[];
  targetRoles?: UserRole[];
  icon?: string;
  color?: string;
  welcomeMessage?: string;
  starterQuestions?: string[];
  maxActionsPerRun?: number;
  visibility?: AgentVisibility;
}

interface UpdateProfileInput extends Partial<CreateProfileInput> {}

interface ProfileFilters {
  category?: AgentCategory;
  role?: UserRole;
  visibility?: 'mine' | 'shared' | 'institutional' | 'favorites';
  search?: string;
  userId: string;
  userRole: UserRole;
  limit?: number;
  offset?: number;
}
```

### Task B: Create `app/lib/agent/agent-profile-constants.ts`
Small constants file:

```typescript
/**
 * Tools that only INSTITUTIONAL agent profiles can use.
 * These are high-impact write actions that require admin governance.
 */
export const SYSTEM_ONLY_TOOLS = new Set([
  'post_announcement',
  'submit_grades_to_sis',
  'send_announcement',
  'update_department_website',
]);

/**
 * Slugs reserved for pre-installed institutional agent profiles.
 * Cannot be used by user-created profiles.
 */
export const RESERVED_SLUGS = new Set([
  'default',
  'morning-briefing',
  'student-check-in',
  'course-health',
  'study-coach',
  'research-assistant',
  'campus-guide',
  'outreach-coach',
  'crisis-responder',
]);

/** Default max actions per run for user-created profiles */
export const DEFAULT_MAX_ACTIONS = 10;

/** Absolute max actions per run (even admins can't exceed this) */
export const ABSOLUTE_MAX_ACTIONS = 25;
```

## Critical Constraints
- Import prisma from `../prisma` (relative path)
- Import types from `../../generated/prisma` (Prisma v7 pattern)
- Import getToolRegistry from `./tool-registry`
- Use `withErrorHandling` pattern awareness — service functions throw errors,
  route handlers catch them
- Slug generation: kebab-case from name, max 60 chars, append `-XXXX` random suffix on collision

## The Next Link
After completing both tasks, generate the next handoff prompt for Phase 3:
- Task A: API routes `app/api/agent/profiles/route.ts` (GET list + POST create)
  and `app/api/agent/profiles/[id]/route.ts` (GET, PUT, DELETE)
- Task B: API routes `app/api/agent/profiles/[id]/fork/route.ts` (POST)
  and `app/api/agent/profiles/favorites/route.ts` (GET, POST)
Include what was completed in Phases 1-2, the architecture doc, and the route pattern
from CLAUDE.md (withErrorHandling + parseRequestBody + requireRequestUser).
```

---

## Phase 3: API Routes

```markdown
# Handoff Prompt: Sandy Agentic OS — Phase 3 of 8

## Context
We are building Sandy Agent Profiles for the platform.
Full architecture: `Blueprints/AGENTIC-OS.md`. Read it and `CLAUDE.md` first.

**Completed so far:**
- Phase 1: Prisma schema (`AgentProfile`, `AgentSession`, `AgentFavorite` models + enums + User relations). Migration applied.
- Phase 2: `app/lib/agent/agent-profile-service.ts` (full CRUD, fork, search, validation, favorites, sessions) + `app/lib/agent/agent-profile-constants.ts` (SYSTEM_ONLY_TOOLS, RESERVED_SLUGS)

This is Phase 3 — API routes.

## The Goal
Execute ONLY these 2 tasks, then STOP:

### Task A: Create main profile API routes

**`app/api/agent/profiles/route.ts`** — GET (list/search) + POST (create)
```typescript
// GET /api/agent/profiles
// Query params: category, role, search, visibility ('mine'|'shared'|'institutional'|'favorites'), limit, offset
// Auth: requireRequestUser
// Calls: listAgentProfiles(filters)
// Returns: { profiles, total }

// POST /api/agent/profiles
// Body: CreateProfileInput (name, description, systemPrompt, capabilities, ...)
// Auth: requireRequestUser
// Validation: name required, systemPrompt required, capabilities must pass validateCapabilities()
// If validation fails, return 400 with { error: "Invalid capabilities", invalid: [...] }
// Calls: createAgentProfile(data, user.id)
// Returns: created AgentProfile (201)
```

**`app/api/agent/profiles/[id]/route.ts`** — GET, PUT, DELETE
```typescript
// GET /api/agent/profiles/[id]
// Auth: requireRequestUser
// Calls: getAgentProfile(id, user.id)
// Returns: AgentProfile or 404

// PUT /api/agent/profiles/[id]
// Body: Partial<CreateProfileInput>
// Auth: requireRequestUser
// Calls: updateAgentProfile(id, data, user.id, user.role)
// Returns: updated AgentProfile

// DELETE /api/agent/profiles/[id]
// Auth: requireRequestUser
// Calls: deleteAgentProfile(id, user.id, user.role)
// Returns: { success: true }
```

### Task B: Create fork and favorites routes

**`app/api/agent/profiles/[id]/fork/route.ts`** — POST
```typescript
// POST /api/agent/profiles/[id]/fork
// Auth: requireRequestUser
// Calls: forkAgentProfile(id, user.id)
// Returns: new AgentProfile (201)
```

**`app/api/agent/profiles/favorites/route.ts`** — GET + POST
```typescript
// GET /api/agent/profiles/favorites
// Auth: requireRequestUser
// Calls: getUserFavorites(user.id)
// Returns: { favorites: AgentProfile[] }

// POST /api/agent/profiles/favorites
// Body: { profileId: string }
// Auth: requireRequestUser
// Calls: toggleFavorite(profileId, user.id)
// Returns: { favorited: boolean }
```

## Critical Constraints — Route Pattern
Every route MUST follow this exact pattern from CLAUDE.md:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireRequestUser, parseRequestBody, isAuthFailure } from '../../../../lib/server-auth';
import { withErrorHandling } from '../../../../lib/api-utils';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req);
  if (isAuthFailure(auth)) return auth.response;
  const { user } = auth;
  // ... call service ... return NextResponse.json(result)
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req);
  if (isAuthFailure(auth)) return auth.response;
  const parsed = await parseRequestBody(req);
  if ('error' in parsed) return parsed.error;
  // ... call service ... return NextResponse.json(result, { status: 201 })
});
```

- NO `export async function` — only `export const METHOD = withErrorHandling(...)`
- NO manual outer try/catch — `withErrorHandling` handles that
- Use `parseRequestBody` for all POST/PUT bodies
- Adjust relative import paths based on route depth

## The Next Link
After completing both tasks, generate the next handoff prompt for Phase 4:
- Task A: Modify `app/lib/agent/agent-types.ts` (add profileId to AgentChatRequest) +
  modify `app/lib/agent/tool-registry.ts` (add getToolDefinitionsForProfile method)
- Task B: Modify `app/lib/agent/agent-system-prompt.ts` (add agentProfile to PromptContext,
  merge profile system prompt into base prompt)
Include Phases 1-3 completion status and exact code changes needed.
```

---

## Phase 4: Agent Types + System Prompt

```markdown
# Handoff Prompt: Sandy Agentic OS — Phase 4 of 8

## Context
We are building Sandy Agent Profiles for the platform.
Full architecture: `Blueprints/AGENTIC-OS.md`. Read it and `CLAUDE.md` first.

**Completed so far:**
- Phase 1: Prisma schema + migration
- Phase 2: `agent-profile-service.ts` + `agent-profile-constants.ts`
- Phase 3: 5 API routes (profiles CRUD, fork, favorites)

This is Phase 4 — modifying the agent type system and system prompt builder.

## The Goal
Execute ONLY these 2 tasks, then STOP:

### Task A: Modify agent-types.ts and tool-registry.ts

**`app/lib/agent/agent-types.ts`** — add `profileId` to `AgentChatRequest`:
```typescript
export interface AgentChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  currentPage?: string;
  sessionId?: string;
  profileId?: string;     // NEW — which agent profile to activate
}
```

**`app/lib/agent/tool-registry.ts`** — add one new method to the `ToolRegistry` class:
```typescript
/**
 * Get tools filtered by an explicit allow-list of tool names (agent profile capabilities).
 * Still applies role filtering — a profile can't grant tools the user's role lacks.
 * If capabilities is empty, returns all role+page-filtered tools (default Sandy behavior).
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

Add this method inside the `ToolRegistry` class, after `getToolDefinitionsForPage`.

### Task B: Modify agent-system-prompt.ts

**`app/lib/agent/agent-system-prompt.ts`** — two changes:

1. Add `agentProfile` to the `PromptContext` interface:
```typescript
interface PromptContext {
  user: AgentUser;
  currentPage?: string;
  toolRegistry: ToolRegistry;
  universitySystemsSnapshot?: UniversitySystemsSnapshot | null;
  agentProfile?: {              // NEW
    name: string;
    systemPrompt: string;
    welcomeMessage?: string | null;
  } | null;
}
```

2. In `buildAgentSystemPrompt()`, insert a new section AFTER the base prompt identity
   block ("You are Sandy...") and BEFORE the CORE RULES section. This placement ensures
   the agent profile instructions come after Sandy's identity but before her behavioral
   rules (which should NOT be overridable by profile prompts):

```typescript
// After the CURRENT CONTEXT block, before CORE RULES:
${ctx.agentProfile ? `
AGENT PROFILE: "${ctx.agentProfile.name}"
You are currently operating as a specialized agent. Follow these additional instructions
while maintaining all CORE RULES above (especially approval gates for write actions):

${ctx.agentProfile.systemPrompt}

Stay in character as this agent. If the user asks something outside your specialty,
help if you can, but suggest that another agent profile might be better suited.
` : ''}
```

IMPORTANT: The agent profile section must come BEFORE CORE RULES, not after. This way
Sandy's core behavioral rules (approval gates, data reliability caveats, etc.) always
take precedence over profile-specific instructions. The profile customizes Sandy's
expertise and personality, but cannot override safety rules.

Actually — re-reading the prompt structure, the CURRENT CONTEXT block comes first,
then CORE RULES. Insert the agent profile section between CURRENT CONTEXT and CORE RULES.

## Critical Constraints
- Do NOT change any existing method signatures — only add new ones
- The `getToolDefinitionsForProfile` method must call `getToolDefinitionsForPage` internally
  (don't duplicate the role/page filtering logic)
- The agent profile prompt section must be clearly demarcated so Claude can distinguish
  between base Sandy instructions and profile-specific ones
- Run `npx tsc --noEmit` after changes to verify no type errors

## The Next Link
After completing both tasks, generate the next handoff prompt for Phase 5:
- Task A: Modify `app/lib/agent/agent-loop.ts` (accept profileId, fetch profile,
  use getToolDefinitionsForProfile, pass agentProfile to prompt builder, track usage)
- Task B: Modify `app/api/agent/chat/route.ts` (pass profileId from request body)
Include Phases 1-4 completion status and the exact changes needed in agent-loop.ts
(reference the executeLoop function and where each change goes).
```

---

## Phase 5: Agent Loop + Chat Route

```markdown
# Handoff Prompt: Sandy Agentic OS — Phase 5 of 8

## Context
We are building Sandy Agent Profiles for the platform.
Full architecture: `Blueprints/AGENTIC-OS.md`. Read it and `CLAUDE.md` first.

**Completed so far:**
- Phase 1: Prisma schema + migration
- Phase 2: `agent-profile-service.ts` + `agent-profile-constants.ts`
- Phase 3: 5 API routes (profiles CRUD, fork, favorites)
- Phase 4: `agent-types.ts` (profileId in AgentChatRequest), `tool-registry.ts`
  (getToolDefinitionsForProfile), `agent-system-prompt.ts` (agentProfile in PromptContext)

This is Phase 5 — the core runtime changes.

## The Goal
Execute ONLY these 2 tasks, then STOP:

### Task A: Modify `app/lib/agent/agent-loop.ts`

Read this file carefully first. The changes are surgical — do not restructure the file.

**Change 1: Add profileId to AgentLoopParams**
```typescript
interface AgentLoopParams {
  request: AgentChatRequest;
  user: AgentUser;
  config?: Partial<AgentLoopConfig>;
  profileId?: string;          // NEW
}
```

**Change 2: Pass profileId to executeLoop**
In `runAgentLoop()`, the `executeLoop()` call needs `profileId`:
```typescript
// Current:
await executeLoop(emit, registry, approvalManager, request, user, sessionId, config);

// New:
await executeLoop(emit, registry, approvalManager, request, user, sessionId, config, params.profileId);
```

Update `executeLoop` signature to accept the new parameter:
```typescript
async function executeLoop(
  emit: (event: AgentSSEEvent) => void,
  registry: ToolRegistry,
  approvalManager: ApprovalManager,
  request: AgentChatRequest,
  user: AgentUser,
  sessionId: string,
  config: AgentLoopConfig,
  profileId?: string,           // NEW
): Promise<void> {
```

**Change 3: Fetch and validate profile at the top of executeLoop**
After `const anthropic = new Anthropic();` and before the university systems snapshot block,
add:

```typescript
// ─── Agent Profile (if specified) ─────────────────────────────────
import { getAgentProfile, incrementUseCount, saveAgentSession } from './agent-profile-service';

let agentProfile: { name: string; systemPrompt: string; capabilities: string[]; maxActionsPerRun: number; welcomeMessage?: string | null } | null = null;
if (profileId) {
  const profile = await getAgentProfile(profileId, user.id);
  if (!profile) throw new Error('Agent profile not found or access denied');
  agentProfile = {
    name: profile.name,
    systemPrompt: profile.systemPrompt,
    capabilities: profile.capabilities,
    maxActionsPerRun: profile.maxActionsPerRun,
    welcomeMessage: profile.welcomeMessage,
  };
  // Track usage (fire-and-forget)
  incrementUseCount(profileId).catch(() => {});
}
```

NOTE: Move the import to the top of the file with the other imports. The inline import
above is just to show what needs importing.

**Change 4: Use profile-filtered tools**
Replace the existing tool fetching line:
```typescript
// Current:
const tools = registry.getToolDefinitionsForPage(user.role, request.currentPage, user);

// New:
const tools = agentProfile?.capabilities.length
  ? registry.getToolDefinitionsForProfile(user.role, agentProfile.capabilities, request.currentPage, user)
  : registry.getToolDefinitionsForPage(user.role, request.currentPage, user);
```

**Change 5: Pass agentProfile to system prompt builder**
```typescript
// Current:
const systemPrompt = buildAgentSystemPrompt({
  user,
  currentPage: request.currentPage,
  toolRegistry: registry,
  universitySystemsSnapshot,
});

// New:
const systemPrompt = buildAgentSystemPrompt({
  user,
  currentPage: request.currentPage,
  toolRegistry: registry,
  universitySystemsSnapshot,
  agentProfile: agentProfile ? {
    name: agentProfile.name,
    systemPrompt: agentProfile.systemPrompt,
    welcomeMessage: agentProfile.welcomeMessage,
  } : null,
});
```

**Change 6: Apply profile's maxActionsPerRun**
At the top of executeLoop, after fetching the profile, override config if profile is stricter:
```typescript
const effectiveMaxIterations = agentProfile
  ? Math.min(config.maxIterations, agentProfile.maxActionsPerRun)
  : config.maxIterations;
```
Then use `effectiveMaxIterations` in the while loop condition and the max-iterations check
at the bottom, instead of `config.maxIterations`.

**Change 7: Save session on completion**
At the end of `executeLoop()`, after the max-iterations check, save the conversation:
```typescript
// Save agent session for conversation continuity
if (profileId) {
  const toolCallTotal = messages
    .filter(m => Array.isArray(m.content))
    .reduce((count, m) => {
      const blocks = m.content as unknown[];
      return count + blocks.filter((b: unknown) => (b as { type?: string }).type === 'tool_use').length;
    }, 0);
  saveAgentSession(profileId, user.id, request.messages, toolCallTotal).catch(() => {});
}
```

### Task B: Modify `app/api/agent/chat/route.ts`

One small change — pass `profileId` from the request body to `runAgentLoop`:

```typescript
// Current:
const stream = runAgentLoop({
  request: body,
  user: agentUser,
});

// New:
const stream = runAgentLoop({
  request: body,
  user: agentUser,
  profileId: body.profileId,
});
```

That's it for this file. The profileId is already in AgentChatRequest from Phase 4.

## Critical Constraints
- Do NOT restructure agent-loop.ts — make surgical changes only
- The `getAgentProfile` import comes from `./agent-profile-service`
- Use `Math.min` for maxActionsPerRun — the profile can only make the cap stricter, not looser
- `incrementUseCount` and `saveAgentSession` are fire-and-forget (`.catch(() => {})`)
- Run `npx tsc --noEmit` after all changes

## The Next Link
After completing both tasks, generate the next handoff prompt for Phase 6:
- Task A: Modify `app/hooks/useAgentStream.ts` (accept and send profileId)
- Task B: Create `app/hooks/useAgentProfiles.ts` (fetch profiles, favorites, recent,
  manage active profile state with localStorage persistence)
Include Phases 1-5 completion status.
```

---

## Phase 6: Client Hooks

```markdown
# Handoff Prompt: Sandy Agentic OS — Phase 6 of 8

## Context
We are building Sandy Agent Profiles for the platform.
Full architecture: `Blueprints/AGENTIC-OS.md`. Read it and `CLAUDE.md` first.

**Completed so far:**
- Phase 1: Prisma schema + migration
- Phase 2: Service layer + constants
- Phase 3: 5 API routes
- Phase 4: Types + tool registry + system prompt modifications
- Phase 5: agent-loop.ts (profile fetch, tool filtering, prompt merge, usage tracking)
  + chat route (profileId passthrough)

The entire server-side is done. This is Phase 6 — client-side hooks.

## The Goal
Execute ONLY these 2 tasks, then STOP:

### Task A: Modify `app/hooks/useAgentStream.ts`

Two changes:

1. Add `profileId` to the options interface:
```typescript
interface UseAgentStreamOptions {
  userEmail: string;
  currentPage?: string;
  profileId?: string;      // NEW
}
```

2. In `sendMessage`, include profileId in the request body:
```typescript
const body: AgentChatRequest = {
  messages,
  currentPage,
  sessionId: sid,
  profileId,               // NEW
};
```

3. When profileId changes, reset events (new agent = new conversation):
Add profileId to the destructured options and use it. No need for a useEffect —
just pass it through. The ConciergePanel will handle resetting messages when
the profile switches.

### Task B: Create `app/hooks/useAgentProfiles.ts`

New hook that manages agent profile state for the UI. Uses `apiFetch` from
`app/lib/api-client.ts` for all API calls (the project standard — never raw fetch
with manual header injection on the client).

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth-context';
import { apiFetch } from '../lib/api-client';

// Import or define the AgentProfile type (minimal client-side shape)
interface AgentProfileSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  capabilities: string[];
  starterQuestions: string[];
  welcomeMessage: string | null;
  useCount: number;
  forkCount: number;
  visibility: string;
  approvalStatus: string;
  creator: { name: string; role: string };
  forkedFromId: string | null;
  createdAt: string;
}

interface UseAgentProfilesReturn {
  // Active profile
  activeProfileId: string | null;
  activeProfile: AgentProfileSummary | null;
  setActiveProfileId: (id: string | null) => void;

  // Profile lists
  favorites: AgentProfileSummary[];
  recentlyUsed: AgentProfileSummary[];
  myProfiles: AgentProfileSummary[];
  loading: boolean;

  // Actions
  toggleFavorite: (profileId: string) => Promise<void>;
  forkProfile: (profileId: string) => Promise<AgentProfileSummary | null>;
  refreshProfiles: () => void;
}
```

Implementation details:
- `activeProfileId` is persisted to `localStorage` key `sandy-active-agent`
- On mount, read from localStorage and fetch the active profile details
- `favorites`: fetched from `GET /api/agent/profiles/favorites`
- `recentlyUsed`: fetched from `GET /api/agent/profiles?visibility=mine&limit=5` (sorted by updatedAt)
  OR tracked client-side in localStorage as an ordered list of profile IDs
- `myProfiles`: fetched from `GET /api/agent/profiles?visibility=mine`
- All fetches use `apiFetch(email, path)` pattern
- `toggleFavorite`: calls `POST /api/agent/profiles/favorites` with `{ profileId }`
- `forkProfile`: calls `POST /api/agent/profiles/{id}/fork`, returns the new profile
- `refreshProfiles`: re-fetches all lists
- All useEffect fetches include AbortController cleanup (project convention)

## Critical Constraints
- Use `apiFetch` from `app/lib/api-client.ts` — never raw `fetch` with manual headers
- Every `useEffect` that fetches must return AbortController cleanup
- Check `err.name === 'AbortError'` in catch blocks
- Follow camelCase naming for hooks (`useAgentProfiles.ts`)
- localStorage reads should be wrapped in try/catch (SSR safety)

## The Next Link
After completing both tasks, generate the next handoff prompt for Phase 7:
- Task A: Create `app/components/agent/AgentProfilePicker.tsx` (dropdown in Sandy header)
  + `app/components/agent/AgentProfileCard.tsx` (card for browse grid)
- Task B: Modify `app/components/ConciergePanel.tsx` (integrate picker, active profile state,
  conversation reset on profile switch, profile-aware starters and header)
Include Phases 1-6 completion status.
```

---

## Phase 7: UI Components + ConciergePanel Integration

```markdown
# Handoff Prompt: Sandy Agentic OS — Phase 7 of 8

## Context
We are building Sandy Agent Profiles for the platform.
Full architecture: `Blueprints/AGENTIC-OS.md`. Read it and `CLAUDE.md` first.

**Completed so far:**
- Phase 1: Prisma schema + migration
- Phase 2: Service layer + constants
- Phase 3: 5 API routes
- Phase 4: Types + tool registry + system prompt
- Phase 5: agent-loop.ts + chat route
- Phase 6: `useAgentStream.ts` (profileId) + `useAgentProfiles.ts` (profile management hook)

Server + client hooks are done. This is Phase 7 — UI components.

## The Goal
Execute ONLY these 2 tasks, then STOP:

### Task A: Create AgentProfilePicker + AgentProfileCard components

**`app/components/agent/AgentProfilePicker.tsx`**
A dropdown component embedded in ConciergePanel's header bar.

Visual spec:
- Trigger: clickable pill in the header bar showing active agent name
  `[Bot icon] {profile.name || "Sandy"} ▾`
- Dropdown: absolute positioned, `w-80`, white bg, rounded-xl, shadow-xl, border, z-50
- Sections inside dropdown:
  1. "Sandy (Default)" option — always first, clears activeProfileId
  2. "Favorites" section (if any) — list of favorited profiles
  3. "Recent" section (if any) — last 3 used profiles
  4. Divider
  5. Footer links: "Browse all agents..." → `/agents/browse`, "+ Build an agent" → `/agents/build`
- Each profile item shows: icon (lucide-react dynamic, fallback to Bot), name, one-line description
- Click selects the profile and closes dropdown
- Click outside or Escape closes dropdown
- Active profile has a check mark or highlight

Props:
```typescript
interface AgentProfilePickerProps {
  activeProfileId: string | null;
  activeProfile: AgentProfileSummary | null;
  favorites: AgentProfileSummary[];
  recentlyUsed: AgentProfileSummary[];
  onSelectProfile: (profileId: string | null) => void;
}
```

**`app/components/agent/AgentProfileCard.tsx`**
A card component for the browse grid (used in Phase 8's browse page).

Visual spec (matches platform card standard from CLAUDE.md):
- `border rounded-2xl shadow-sm` container
- Top: icon (colored circle with lucide icon) + name (font-extrabold) + category badge
- Middle: description (2-line clamp, text-sm text-gray-600)
- Bottom row: creator name + role badge, use count (Users icon), fork count (GitFork icon)
- Action button: contextual — "Activate" (primary), "Fork" (secondary), "Edit" (for own profiles)
- Favorite heart toggle in top-right corner

Props:
```typescript
interface AgentProfileCardProps {
  profile: AgentProfileSummary;
  isOwner: boolean;
  isFavorited: boolean;
  isActive: boolean;
  onActivate: (id: string) => void;
  onFork: (id: string) => void;
  onEdit: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}
```

## Styling constraints:
- Use Tailwind v4 utility classes in JSX only (no @apply)
- Icons: lucide-react only (Bot, Heart, GitFork, Users, Check, ChevronDown, Plus, Search)
- Colors: UK Blue `#0033A0` for primary actions, profile's `color` field for accent
- For dynamic lucide icons by name, use a simple map of the most common ones
  (Bot, BookOpen, Brain, Zap, MessageSquare, Shield, Palette, BarChart, Search, Lightbulb)
  with Bot as fallback

### Task B: Modify `app/components/ConciergePanel.tsx`

Read `ConciergePanel.tsx` carefully first. Changes:

1. **Import the new hook and component:**
```typescript
import { useAgentProfiles } from '../../hooks/useAgentProfiles';
import AgentProfilePicker from './agent/AgentProfilePicker';
```

2. **Use the hook in the component body** (after existing hooks):
```typescript
const {
  activeProfileId, activeProfile, setActiveProfileId,
  favorites, recentlyUsed,
  toggleFavorite, refreshProfiles,
} = useAgentProfiles();
```

3. **Replace the static "Sandy" pill in the header** with AgentProfilePicker:

Current (in the header bar):
```tsx
<div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/25 text-white sandy-avatar-container relative">
  {avatarMode ? <Brain className="size-3.5" /> : <Bot className="size-3.5 ee-sandy-blink" />}
  {avatarMode && avatarMeta ? avatarMeta.facultyName : 'Sandy'}
  ...
</div>
```

Replace with:
```tsx
<AgentProfilePicker
  activeProfileId={activeProfileId}
  activeProfile={activeProfile}
  favorites={favorites}
  recentlyUsed={recentlyUsed}
  onSelectProfile={handleProfileSwitch}
/>
```

Keep the avatar mode logic — if `avatarMode` is true, show the avatar pill instead
of the picker. The picker only shows when avatarMode is false.

4. **Add handleProfileSwitch callback:**
```typescript
const handleProfileSwitch = useCallback((profileId: string | null) => {
  setActiveProfileId(profileId);

  // Auto-enable agent mode when selecting a profile
  if (profileId && !agentMode) toggleAgentMode();
  // Auto-disable agent mode when switching back to default Sandy
  if (!profileId && agentMode) toggleAgentMode();

  // Clear conversation (new agent = fresh start)
  interruptTTS();
  setMessages([]);
  setRawMessages(new Map());
  setMessageTrust(new Map());
  setInput('');
}, [setActiveProfileId, agentMode, toggleAgentMode, interruptTTS, setMessages, setRawMessages, setMessageTrust, setInput]);
```

5. **Pass profileId to the agent stream** — find where useSandyAmbient is used.
The profileId needs to flow through to `useAgentStream`. This likely means adding
`activeProfileId` to the `SandyAmbientContext`. Check how `useSandyAmbient()` creates
the agent stream hook internally and pass `profileId` through.

If `SandyAmbientContext` creates `useAgentStream` internally, you'll need to also
modify `app/components/concierge/SandyAmbientContext.tsx` to accept and pass `activeProfileId`.
Read that file to understand the wiring.

6. **Profile-aware starters:** When an active profile has `starterQuestions`, use those
instead of page-based starters:
```typescript
const starters = activeProfile?.starterQuestions?.length
  ? activeProfile.starterQuestions.slice(0, 4)
  : evaluatorMode && agentMode
  ? [/* existing evaluator starters */]
  : /* existing starter logic */;
```

7. **Profile-aware agent mode indicator:** Update the yellow indicator bar:
```tsx
{agentMode && (
  <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 border-b border-yellow-200 flex-shrink-0">
    <Zap className="size-3 text-yellow-600" />
    <span className="text-[10px] font-semibold text-yellow-700 uppercase tracking-wider">
      {activeProfile ? activeProfile.name : 'Agent Mode'}
    </span>
    {isAgentStreaming && <span className="text-[10px] text-yellow-600 animate-pulse ml-auto">Processing...</span>}
  </div>
)}
```

## Critical Constraints
- ConciergePanel is Tier 1 (high risk) — be surgical, don't restructure
- The AgentProfilePicker dropdown needs click-outside-to-close (useRef + useEffect pattern)
- Escape key should close the dropdown
- All profile icons use lucide-react only
- The profile switch must clear messages AND reset agent events
- Test with all 4 demo users (ADMIN, EDUCATOR, STUDENT, STAFF)

## The Next Link
After completing both tasks, generate the next handoff prompt for Phase 8:
- Task A: `/agents/build/page.tsx` (Sandy-guided builder) + `app/lib/agent/agent-builder-service.ts`
- Task B: `/agents/browse/page.tsx` (marketplace grid) + seed script for pre-installed profiles
Include Phases 1-7 completion status.
```

---

## Phase 8: Builder + Browse Pages + Seed

```markdown
# Handoff Prompt: Sandy Agentic OS — Phase 8 of 8 (FINAL)

## Context
We are building Sandy Agent Profiles for the platform.
Full architecture: `Blueprints/AGENTIC-OS.md`. Read it and `CLAUDE.md` first.

**ALL PRIOR PHASES COMPLETE:**
- Phase 1: Prisma schema (`AgentProfile`, `AgentSession`, `AgentFavorite`) + migration
- Phase 2: `agent-profile-service.ts` (CRUD, fork, validation) + `agent-profile-constants.ts`
- Phase 3: 5 API routes (profiles CRUD, fork, favorites)
- Phase 4: Types (profileId in AgentChatRequest), tool-registry (getToolDefinitionsForProfile),
  system prompt (agentProfile section merge)
- Phase 5: agent-loop.ts (profile fetch, tool filtering, prompt merge, usage tracking, session save)
  + chat route (profileId passthrough)
- Phase 6: useAgentStream (profileId) + useAgentProfiles hook
- Phase 7: AgentProfilePicker + AgentProfileCard + ConciergePanel integration

This is Phase 8 — the final two deliverables: builder page and browse page.

## The Goal
Execute ONLY these 2 tasks, then STOP:

### Task A: Agent Builder Page + Service

**`app/lib/agent/agent-builder-service.ts`**
Service for the Sandy-guided builder chat. Uses the streaming pattern from
`app/lib/streaming.ts` (`streamHaikuInterview`).

```typescript
import { streamHaikuInterview } from '../streaming';
import { getToolRegistry } from './tool-registry';

export function streamAgentBuilderChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  userRole: string,
): ReadableStream<Uint8Array> {
  const registry = getToolRegistry();
  const availableTools = registry.getToolDefinitions(userRole as any);
  const toolList = availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n');

  const systemPrompt = `You are Sandy, helping the user create a custom agent profile for the platform.

Guide them through these steps IN ORDER. Use <!--PHASE:name--> markers to signal transitions:

<!--PHASE:describe-->
1. DESCRIBE: Ask what the agent should do. Help them pick a good name and write a one-line description.
   Ask about the target audience (students? educators? everyone?).

<!--PHASE:capabilities-->
2. CAPABILITIES: Based on the description, suggest relevant tools from the list below.
   Present your suggestions using <!--CHIPS:["tool_name_1","tool_name_2"]--> markers.
   The user can accept or reject each suggestion. Explain what each suggested tool does in plain language.

<!--PHASE:prompt-->
3. PROMPT: Draft custom instructions for the agent. This is the agent's "personality and expertise."
   Show it to the user and let them request edits. Use <!--DRAFT:the draft text here--> to display it.

<!--PHASE:starters-->
4. STARTERS: Suggest 3-4 conversation starters — example messages a user might send to this agent.
   Use <!--STARTERS:["starter 1","starter 2","starter 3"]--> format.

<!--PHASE:review-->
5. REVIEW: Show a complete summary of the agent profile and ask for confirmation.
   Use <!--REVIEW:{"name":"...","description":"...","capabilities":[...],"systemPrompt":"...","starterQuestions":[...]}--> format.
   The user can go back and edit any section, or confirm to create the agent.

AVAILABLE TOOLS FOR THIS USER:
${toolList}

RULES:
- Be conversational and encouraging — this might be a student's first time creating an agent
- Don't overwhelm with all tools at once — suggest 3-5 most relevant ones
- The system prompt you draft should be 2-4 paragraphs, specific and actionable
- If the user seems unsure, offer examples: "For example, a Study Coach agent might..."
- Keep the flow moving — don't ask too many clarifying questions per phase`;

  return streamHaikuInterview(messages, systemPrompt);
}
```

**`app/agents/build/page.tsx`**
Split-panel layout using the existing SandyInterviewPanel pattern:

```
┌────────────────────────────────┬──────────────────────┐
│ Agent Preview (left, 7 cols)   │ Sandy Chat (right,   │
│                                │ 5 cols)              │
│ ┌────────────────────────────┐ │                      │
│ │ [Bot] My Agent Name        │ │ Sandy: What kind of  │
│ │ Description here...        │ │ agent would you      │
│ │                            │ │ like to build?       │
│ │ Capabilities:              │ │                      │
│ │ [get_calendar] [get_tasks] │ │ User: I want an     │
│ │                            │ │ agent that...        │
│ │ System Prompt:             │ │                      │
│ │ ┌──────────────────────┐   │ │                      │
│ │ │ Editable textarea    │   │ │                      │
│ │ └──────────────────────┘   │ │                      │
│ │                            │ │                      │
│ │ Starters:                  │ │                      │
│ │ • "Help me study..."      │ │                      │
│ │ • "Check my calendar..."  │ │                      │
│ │                            │ │                      │
│ │ [Save as Private]          │ │                      │
│ │ [Publish to Marketplace]   │ │                      │
│ └────────────────────────────┘ │                      │
└────────────────────────────────┴──────────────────────┘
```

Page implementation:
- Use `'use client'` — fully client-rendered
- State machine tracks current phase: `describe | capabilities | prompt | starters | review`
- Left panel updates live as Sandy suggests things and user confirms
- Sandy chat uses streaming fetch to `POST /api/agent/builder/interview` (create this route too)
- Parse `<!--PHASE:-->`, `<!--CHIPS:-->`, `<!--DRAFT:-->`, `<!--STARTERS:-->`, `<!--REVIEW:-->` markers from Sandy's stream
- Capability chips are toggleable (accept/reject)
- System prompt textarea is directly editable by user
- "Save as Private" calls `POST /api/agent/profiles` with visibility PRIVATE
- "Publish to Marketplace" calls same route with visibility SHARED (will be PENDING approval)
- After save, redirect to `/agents/browse` or offer to activate immediately
- Reuse `SandyInterviewPanel` component if the marker parsing pattern fits, or build a
  simpler custom chat panel following the same visual standards (blue header, white/blue bubbles)
- Follow PageHeader + max-w-6xl pattern from CLAUDE.md

**`app/api/agent/builder/interview/route.ts`**
Streaming route:
```typescript
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req);
  if (isAuthFailure(auth)) return auth.response;
  const parsed = await parseRequestBody(req);
  if ('error' in parsed) return parsed.error;
  const { messages } = parsed.data as { messages: { role: 'user' | 'assistant'; content: string }[] };

  const stream = streamAgentBuilderChat(messages, auth.user.role);
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
});
```

### Task B: Browse Page + Seed Script + Navigation

**`app/agents/browse/page.tsx`**
Marketplace grid page. Follow the platform page pattern.

```
┌──────────────────────────────────────────────────────┐
│ Agent Marketplace                    [+ Build Agent] │
│ Search: [_________________]                          │
│ [All] [Study] [Productivity] [Analysis] [Comms] ... │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Institutional Agents                                 │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │ Morning │ │ Student │ │ Study   │ │ Campus  │    │
│ │ Briefing│ │ CheckIn │ │ Coach   │ │ Guide   │    │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
│                                                      │
│ Popular                                              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                 │
│ │ Socratic│ │ Organic │ │ Essay   │                 │
│ │ Tutor   │ │ Chem    │ │ Coach   │                 │
│ └─────────┘ └─────────┘ └─────────┘                 │
│                                                      │
│ My Agents                                            │
│ ┌─────────┐ ┌─────────┐                              │
│ │ Custom  │ │ Physics │                              │
│ │ Agent   │ │ Helper  │                              │
│ └─────────┘ └─────────┘                              │
└──────────────────────────────────────────────────────┘
```

Implementation:
- `'use client'` page with `useAgentProfiles` hook
- Three sections: Institutional (visibility=institutional), Popular (visibility=shared, sorted by useCount), My Agents (visibility=mine)
- Each section fetches from `GET /api/agent/profiles` with appropriate filters
- Search bar filters all sections (debounced, 300ms)
- Category filter pills using `AgentCategory` values
- Uses `AgentProfileCard` from Phase 7 for each card
- `PageHeader` with title "Agent Marketplace" and subtitle
- "+ Build Agent" button in header → links to `/agents/build`
- `max-w-6xl` container per CLAUDE.md standards
- Empty states for each section ("No agents yet — build your first!")
- Loading skeletons using `SkeletonCard` from `app/components/ui/SkeletonCard.tsx`

**`scripts/seed-agent-profiles.ts`**
Idempotent seed script for the 9 pre-installed institutional agent profiles.
Run with `npx tsx scripts/seed-agent-profiles.ts`.

For each profile in Section 3.4 of the architecture doc, upsert by slug:
```typescript
await prisma.agentProfile.upsert({
  where: { slug },
  create: { ...profileData, creatorId: adminUser.id },
  update: { ...profileData },
});
```

Use `heath.price@uky.edu` as the creator (ADMIN user).

Each profile needs a real, useful `systemPrompt` (3-4 paragraphs) and
curated `capabilities` array. Example for "Morning Briefing":
```typescript
{
  name: 'Morning Briefing',
  slug: 'morning-briefing',
  description: 'Start your day with a comprehensive briefing of calendar, emails, and tasks',
  icon: 'Sunrise',
  color: '#0033A0',
  systemPrompt: `You are Sandy in Morning Briefing mode. Your job is to give the user
a comprehensive, efficient start to their day.

When activated, immediately call get_calendar, get_unread_emails, and get_tasks
ALL IN ONE TURN (parallel). Synthesize the results into a narrative briefing:
lead with today's schedule, flag urgent emails, surface overdue tasks.

For educators, also check get_at_risk_students and get_course_health.
For staff, include committee actions and policy updates.

Always close with: "What would you like to tackle first?"`,
  capabilities: ['get_calendar', 'get_unread_emails', 'get_tasks',
    'get_at_risk_students', 'get_course_health', 'get_engagement_trends',
    'draft_email', 'create_task'],
  welcomeMessage: 'Good morning! Let me pull together your briefing...',
  starterQuestions: [
    'What does my day look like?',
    'Any urgent emails?',
    'How are my students doing?',
    'What tasks are overdue?',
  ],
  maxActionsPerRun: 15,
  category: 'PRODUCTIVITY',
  tags: ['briefing', 'calendar', 'email', 'productivity'],
  targetRoles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF'],
  visibility: 'INSTITUTIONAL',
  approvalStatus: 'APPROVED',
}
```

Write similar full profiles for all 9 (see architecture doc Section 3.4).

**Navigation updates:**

1. In `app/components/Header.tsx`, add "Agents" to the quick links:
   - Section: Explore (alongside Campus Map, Community Pulse, etc.)
   - Icon: `Bot` from lucide-react
   - Route: `/agents/browse`
   - Visible to: all roles

2. In `app/lib/concierge-service.ts`, add PAGE_DESCRIPTIONS entries:
   ```typescript
   '/agents/build': 'Agent Builder — create a custom Sandy agent profile with curated tools and personality',
   '/agents/browse': 'Agent Marketplace — browse, activate, and fork shared agent profiles',
   ```

3. In `app/lib/concierge-utils.ts`, add page starters for agent pages:
   ```typescript
   '/agents/browse': [
     'What agents are available?',
     'Help me find a study agent',
     'How do I create my own agent?',
     'What are the most popular agents?',
   ],
   '/agents/build': [
     'I want to build a study helper',
     'Create an agent for email triage',
     'Help me make a tutoring agent',
     'What tools can my agent use?',
   ],
   ```

## Critical Constraints
- Builder page follows the split-panel pattern (7 cols left, 5 cols right)
- Browse page uses `PageHeader` + `max-w-6xl` + `border rounded-2xl shadow-sm` cards
- All new pages are `'use client'`
- Seed script must be idempotent (upsert by slug)
- Use `streamHaikuInterview` from `app/lib/streaming.ts` for the builder chat
- Header.tsx is Tier 1 (high risk) — add the nav link carefully, test all 4 roles
- Run `npx tsc --noEmit` and `npm run build` at the end

## Build Complete
This is the final phase. After completing these tasks:
1. Run `npx tsx scripts/seed-agent-profiles.ts` to seed the 9 institutional profiles
2. Run `npm run build` to verify everything compiles
3. Test the full flow:
   - Browse agents at `/agents/browse` — should see 9 institutional profiles
   - Activate "Morning Briefing" from the Sandy panel picker
   - Sandy should respond with profile-specific behavior
   - Build a custom agent at `/agents/build`
   - Fork an institutional agent
   - Switch back to default Sandy (no profile)

No further handoff prompts needed — the Agentic OS v1 is complete.
```

---

End of handoff prompts. 8 phases, 16 tasks total.
