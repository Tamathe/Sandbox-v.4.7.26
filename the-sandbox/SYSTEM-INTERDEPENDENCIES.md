# University of Kentucky System Interdependencies

This architecture packet is generated from the current repo state rather than maintained by hand.

Generated at: 2026-03-25T16:02:37.023Z
Report path: `SYSTEM-INTERDEPENDENCIES.md`

## Inventory Snapshot

| Metric | Value |
| --- | --- |
| Prisma models | 272 |
| Prisma enums | 60 |
| API routes | 815 |
| Architecture domains | 6 |
| Connectors tracked | 4 |
| Load-bearing files | 11 |

## Connector Inventory

Persisted connector inventory was unavailable while generating this report. Reason: connector inventory query failed. Runtime connector defaults are shown instead.

| Connector | System | Mode | Status | Configured | Auth | Data owner | Last checked | Last sync |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Outlook / Graph Assistant | Microsoft Graph | SIMULATED | HEALTHY | Yes | simulated | Institutional messaging and calendar services | Not recorded | Not recorded |
| Canvas LMS | Canvas LMS | REAL | NOT_CONFIGURED | No | Not recorded | Learning management system team | Not recorded | Not recorded |
| Student Information System | Banner / Ellucian | SIMULATED | HEALTHY | Yes | simulated | Registrar and student records | Not recorded | Not recorded |
| SharePoint / OneDrive Files | SharePoint / OneDrive | SIMULATED | HEALTHY | Yes | simulated | Institutional document repositories | Not recorded | Not recorded |

## Major Domains

### Shared Platform Foundation

Goal: Keep one authenticated, database-backed runtime contract that every other domain inherits.

Why it matters: If the shared database, auth, or provider selection layer drifts, the rest of the product breaks in batches rather than one feature at a time.

Supporting files: `prisma/schema.prisma`, `proxy.ts`, `app/lib/prisma.ts`, `app/lib/server-auth.ts`, `app/lib/api-utils.ts`, `app/lib/assistant/providers.ts`

Route inventory: No direct API routes in this domain inventory.

Dependencies:
- Prisma schema and generated client define the shared persistence contract.
- Proxy and server-auth convert incoming cookies and headers into request user context.
- Assistant provider factories bridge connector state into runtime provider selection.

Input boundaries:
- HTTP headers and cookies enter through proxy and route handlers.
- Environment variables define database and connector credentials.
- Prisma schema changes alter the shape of every persisted workflow.

Output boundaries:
- Authenticated request context reaches API routes and server components.
- Database clients and provider descriptors are reused by downstream services.

Data transformations:
- Request auth turns headers into a typed user record or a denied response.
- Persisted connector state plus env defaults becomes an effective provider selection.
- Prisma schema compiles into the generated client consumed across the app.

Human approval checkpoints:
- Admins manage access, secrets, and migrations before runtime logic can succeed.

### Connector Control Plane

Goal: Persist connector status and let the assistant stack read institutional integrations from one control surface.

Why it matters: This is the deployment seam for moving from simulated demos to institution-backed data without rewriting the UI.

Supporting files: `prisma/schema.prisma`, `app/lib/integrations/types.ts`, `app/lib/integrations/registry.ts`, `app/lib/integrations/health.ts`, `app/lib/assistant/providers.ts`, `app/admin/integrations/page.tsx`, `app/api/admin/integrations/route.ts`, `app/api/admin/integrations/[id]/route.ts`, `app/api/admin/integrations/[id]/health/route.ts`

Route inventory: `app/api/admin/integrations/[id]/health/route.ts`, `app/api/admin/integrations/[id]/route.ts`, `app/api/admin/integrations/route.ts`

Dependencies:
- InstitutionIntegration records carry the persisted system, mode, status, auth, and ownership fields.
- Provider factories pull resolved connector state before calendar, email, or file work runs.
- Health checks depend on env-backed Canvas, SIS, and Graph settings when real paths are enabled.

Input boundaries:
- Admin configuration and health-check requests enter through the admin integrations routes.
- Runtime env defaults seed connector records when persisted values are missing.

Output boundaries:
- Integration summaries feed the admin console and provider descriptors.
- Health results update operational timestamps and error messages for later review.

Data transformations:
- Env defaults plus persisted rows become one resolved integration view.
- Connector mode and configuration become provider availability messages.
- Health responses collapse raw checks into configured, degraded, blocked, or healthy statuses.

Human approval checkpoints:
- Admins choose connector mode, auth metadata, and data-owner labels.
- Admins manually trigger health checks to verify live credentials before rollout.

### Sandy Orchestration and Observability

Goal: Run Sandy as a visible orchestrator whose decisions, tool use, and trust metadata can be inspected later.

Why it matters: Sandy now spans concierge prompts, agent tooling, connector selection, and review traces, so the execution record is part of the product rather than a debugging afterthought.

Supporting files: `prisma/schema.prisma`, `app/api/concierge/route.ts`, `app/api/agent/chat/route.ts`, `app/lib/concierge-service.ts`, `app/lib/agent/agent-loop.ts`, `app/lib/agent/tool-registry.ts`, `app/lib/agent/execution-traces.ts`, `app/admin/sandy-traces/page.tsx`, `app/api/admin/sandy-traces/route.ts`, `app/api/admin/sandy-traces/[id]/route.ts`

Route inventory: `app/api/admin/sandy-traces/[id]/route.ts`, `app/api/admin/sandy-traces/route.ts`, `app/api/agent/chat/route.ts`, `app/api/concierge/route.ts`

Dependencies:
- Anthropic-backed response generation sits behind the concierge and agent routes.
- Execution trace tables persist run metadata and per-event records.
- Connector state and provenance metadata can be attached to the same interaction.

Input boundaries:
- User messages, page context, and role-specific data enter through the concierge route.
- Agent events and approval events flow from the tool loop into the trace recorder.

Output boundaries:
- Streaming assistant responses return to the client.
- Persistent trace summaries and detail views feed the admin Sandy trace UI.
- Structured trust headers and execution metadata can ride along with responses.

Data transformations:
- Conversation context becomes a system prompt with tool, course, and governance context.
- Runtime agent events become ordered SandyExecutionEvent rows.
- Trace rows become list and detail payloads for admin review.

Human approval checkpoints:
- Approval requests in the agent layer can pause execution pending a person's decision.
- Admins review completed traces when auditing behavior or failures.

### Governance and Provenance

Goal: Attach permission basis, ownership, and trust metadata to course-visible AI retrieval and expose it in product surfaces.

Why it matters: This is the trust layer that explains what Sandy touched, whether it was allowed, and which course rules or consent states governed the decision.

Supporting files: `prisma/schema.prisma`, `app/lib/provenance-types.ts`, `app/lib/content-permissions.ts`, `app/lib/course-policy-context.ts`, `app/lib/provenance-service.ts`, `app/api/courses/[id]/content-governance/route.ts`, `app/components/TrustPanel.tsx`, `app/components/courses/CourseSettingsTab.tsx`, `app/api/users/compliance/route.ts`, `app/api/admin/consent-versions/route.ts`

Route inventory: `app/api/admin/consent-versions/route.ts`, `app/api/courses/[id]/content-governance/route.ts`, `app/api/users/compliance-communications/[id]/read/route.ts`, `app/api/users/compliance-communications/route.ts`, `app/api/users/compliance-notification-preferences/route.ts`, `app/api/users/compliance-notifications/[id]/route.ts`, `app/api/users/compliance-notifications/route.ts`, `app/api/users/compliance-score/route.ts`, `app/api/users/compliance/route.ts`

Dependencies:
- Course governance flags, uploader metadata, and consent state all shape permission decisions.
- Provenance services connect course policy context, course materials, and Sandy trust headers.
- TrustPanel and course settings surfaces consume the same structured trust payloads returned by services.

Input boundaries:
- Course owners patch governance flags through the content-governance API.
- User consent state and consent version history arrive through compliance tables and routes.
- Course material metadata enters from upload, import, and sync flows.

Output boundaries:
- Trust panel payloads and encoded response headers expose source and permission basis.
- Governance summary responses power course settings and admin review.
- Permission decisions block or allow retrieval before content reaches Sandy.

Data transformations:
- Source system and uploader role become provenance type and approval basis.
- Course flags plus consent status become AI opt-in and allow or block decisions.
- Allowed sources are serialized into structured trust metadata for UI display.

Human approval checkpoints:
- Faculty decide whether AI retrieval, student uploads, transcript generation, and recording are allowed for a course.
- Users accept or revoke consent versions that affect user-uploaded retrieval.
- Admins publish consent versions that downstream permissions evaluate against.

### Course Content and Knowledge Retrieval

Goal: Move uploaded, imported, and synced course content into governed knowledge that Sandy can safely retrieve.

Why it matters: Course materials are the highest-trust institutional content the assistant uses, so the ingestion path must stay aligned with governance and provenance defaults.

Supporting files: `app/api/upload/course-material/route.ts`, `app/api/courses/[id]/materials/route.ts`, `app/api/courses/[id]/materials/import-syllabus/route.ts`, `app/lib/assistant/knowledge-gateway.ts`, `app/lib/assistant/simulated-files.ts`, `app/lib/canvas-import-service.ts`, `app/lib/syllabus-architect/canvas-sync-service.ts`, `app/lib/provenance-service.ts`, `app/lib/content-permissions.ts`

Route inventory: `app/api/courses/[id]/materials/import-syllabus/route.ts`, `app/api/courses/[id]/materials/route.ts`, `app/api/courses/[id]/materials/upload/route.ts`, `app/api/upload/course-material/route.ts`

Dependencies:
- Course material rows, syllabus imports, and Canvas sync all feed the same course knowledge surfaces.
- Governance services compute defaults and re-sync effective permissions for stored materials.
- Knowledge gateway and file search are downstream consumers of governed course content.

Input boundaries:
- Educator uploads and syllabus imports enter through course-material routes.
- Canvas sync imports pull LMS content into course records.

Output boundaries:
- Course retrieval returns governed excerpts for Sandy and assistant search.
- Material metadata flows into course settings, TrustPanel payloads, and file search results.

Data transformations:
- Uploads and imports become persisted course material rows with provenance defaults.
- Stored materials are filtered by permission decisions before retrieval.
- Retrieved content is trimmed into prompt-safe excerpts and trust citations.

Human approval checkpoints:
- Course owners decide visibility and upload rules before course content is AI-retrievable.

### Tool Marketplace and Publication Lifecycle

Goal: Carry tool drafts through creation, review, publication, and trust labeling in one shared marketplace surface.

Why it matters: The marketplace is the deployment face of the platform, so institutional review status and trust metadata must stay attached to tool records rather than living only in conversation history.

Supporting files: `app/api/tools/route.ts`, `app/api/tools/[id]/route.ts`, `app/components/ToolsBrowser.tsx`, `app/components/ToolCard.tsx`, `app/components/ToolOverview.tsx`, `app/components/ToolBuilderChat.tsx`, `app/lib/provenance-service.ts`

Route inventory: `app/api/tools/[id]/analytics/route.ts`, `app/api/tools/[id]/comments/route.ts`, `app/api/tools/[id]/favorite/route.ts`, `app/api/tools/[id]/fork/route.ts`, `app/api/tools/[id]/insights/route.ts`, `app/api/tools/[id]/metrics/route.ts`, `app/api/tools/[id]/rate/route.ts`, `app/api/tools/[id]/route.ts`, `app/api/tools/[id]/score/route.ts`, `app/api/tools/[id]/upvote/route.ts`, `app/api/tools/file-cleaner/analyze/route.ts`, `app/api/tools/import/route.ts`, `app/api/tools/recommended/route.ts`, `app/api/tools/route.ts`

Dependencies:
- Tool approval fields and publication flags define what the marketplace can show or deploy.
- Tool builder flows and recommendations create the upstream content that reaches the marketplace.
- Tool trust metadata reuses the governance and provenance layer for institutional review labeling.

Input boundaries:
- Educators submit tool drafts and edits through tool routes and builder workflows.
- Institutional review metadata is added by admins or reviewers.

Output boundaries:
- Marketplace cards and overview panels display tool trust metadata and publication status.
- Published tool data flows into study sessions, assignments, and Sandy recommendations.

Data transformations:
- Tool builder output becomes persisted tool records.
- Approval and review fields become trust badges and review status summaries.
- Marketplace queries filter the catalog based on role and publication state.

Human approval checkpoints:
- Institutional reviewers approve or reject tools requiring review before broader deployment.
- Creators decide when a reviewed tool is published or kept private.

## Human Approval Checkpoints

### Course AI governance toggles

Owner: Faculty course owner or admin

Course owners patch retrieval, upload, transcript, and recording flags before course content can be used in governed retrieval.

Supporting files: `app/api/courses/[id]/content-governance/route.ts`, `app/components/courses/CourseSettingsTab.tsx`, `app/lib/content-permissions.ts`

### Consent version acceptance

Owner: End user and compliance admin

User-uploaded content retrieval depends on current consent acceptance and ai-personalization status, while admins manage the active consent versions.

Supporting files: `app/api/users/compliance/route.ts`, `app/api/admin/consent-versions/route.ts`, `app/lib/content-permissions.ts`

### Agent action approvals

Owner: End user or reviewer

Agent workflows can emit approval requests before high-impact tool execution continues, and those approval events are traceable later.

Supporting files: `app/lib/agent/agent-loop.ts`, `app/lib/agent/tool-registry.ts`, `app/lib/agent/execution-traces.ts`, `app/components/agent/ApprovalCard.tsx`

### Institutional tool review

Owner: Admin or institutional reviewer

Tool records carry approval and institutional review metadata that governs whether the marketplace can present them as reviewed or pending.

Supporting files: `app/api/tools/route.ts`, `app/api/tools/[id]/route.ts`, `app/lib/provenance-service.ts`

### Staff communication approval chain

Owner: Staff approvers and admins

High-visibility staff communications carry an approval chain and explicit approval actions before they move from draft into approved or sent states.

Supporting files: `app/api/staff/communications/[id]/submit/route.ts`, `app/api/staff/communications/[id]/approve/route.ts`, `prisma/schema.prisma`

## Data-Flow Chains

### Connector state to assistant provider choice

Persisted integration state controls which provider Sandy and assistant endpoints expose, and that same snapshot is available for later trace review.

1. Admin integration settings or env defaults resolve into InstitutionIntegration records.
2. Provider factories map effective connector state into calendar, email, and file providers.
3. Assistant and concierge flows execute against the chosen provider and can capture integration metadata in traces.

Supporting files: `app/lib/integrations/registry.ts`, `app/lib/assistant/providers.ts`, `app/api/admin/integrations/route.ts`, `app/lib/agent/execution-traces.ts`

### Course content to trust-bearing Sandy retrieval

Course uploads and imports receive provenance defaults, then content-permission decisions decide what Sandy can retrieve and what the TrustPanel reveals.

1. Uploads, imports, and Canvas sync create or update course materials.
2. Governance defaults derive source system, approval basis, access scope, and opt-in state.
3. Permission decisions filter retrieval and build the structured trust payload surfaced in the UI.

Supporting files: `app/api/upload/course-material/route.ts`, `app/api/courses/[id]/materials/import-syllabus/route.ts`, `app/lib/content-permissions.ts`, `app/lib/provenance-service.ts`, `app/components/TrustPanel.tsx`

### Sandy request to persistent execution review

A live Sandy interaction produces streaming text for the user and a parallel persisted trace for admin and reviewer inspection.

1. The concierge or agent route builds a system prompt from user, page, connector, and course context.
2. Execution events are recorded as ordered trace rows while the interaction runs.
3. Admin trace routes read those rows back into list and detail payloads for review.

Supporting files: `app/api/concierge/route.ts`, `app/lib/agent/execution-traces.ts`, `app/api/admin/sandy-traces/route.ts`, `app/api/admin/sandy-traces/[id]/route.ts`

### Tool draft to reviewed marketplace listing

Tool creation, institutional review metadata, and trust labeling travel together from the builder flow into the marketplace surface.

1. Tool creation routes persist drafts and publication fields.
2. Review metadata and approval status are attached to the same tool record.
3. Marketplace surfaces display trust metadata and publication state for downstream reuse.

Supporting files: `app/api/tools/route.ts`, `app/api/tools/[id]/route.ts`, `app/components/ToolsBrowser.tsx`, `app/lib/provenance-service.ts`

## External Services

### PostgreSQL via Prisma

Purpose: Primary persistence for users, courses, integrations, traces, governance, and marketplace records.

Failure impact: Most authenticated routes, page loads, and trace or governance surfaces fail because the shared data contract is unavailable.

Fallback: No meaningful runtime fallback exists.

Supporting files: `prisma/schema.prisma`, `app/lib/prisma.ts`

### Anthropic Claude

Purpose: Primary reasoning engine behind concierge and agent responses.

Failure impact: Sandy interactions and agent-assisted experiences degrade or fail outright.

Fallback: The platform can still render stored data, but live assistant generation is unavailable.

Supporting files: `app/api/concierge/route.ts`, `app/lib/agent/agent-loop.ts`

### OpenAI embeddings and speech

Purpose: Embeddings and assistant-adjacent AI utilities used by knowledge retrieval paths.

Failure impact: New knowledge indexing and some assistant retrieval enrichments become less capable.

Fallback: Existing stored content can still be used in a reduced mode, but fresh indexing and some enrichments are limited.

Supporting files: `app/lib/embedding-service.ts`, `app/api/concierge/route.ts`

### Microsoft Graph and Azure tenant credentials

Purpose: Future real-mode connector path for Outlook calendar, email, and file access.

Failure impact: Real connector rollout is blocked and provider selection remains simulated or unavailable.

Fallback: Simulated providers still work when the integration is configured for simulated mode.

Supporting files: `app/lib/integrations/registry.ts`, `app/lib/assistant/providers.ts`

### Canvas LMS

Purpose: Course import, sync, and passback source for institutional course content.

Failure impact: Real Canvas sync, course import, and passback flows stall or degrade.

Fallback: Manual uploads and simulated content paths still work.

Supporting files: `app/lib/canvas-client.ts`, `app/lib/syllabus-architect/canvas-sync-service.ts`

### Banner and SIS adapter

Purpose: Student record and academic standing source behind the SIS abstraction.

Failure impact: Real student-record-backed flows cannot rely on institutional SIS data.

Fallback: Mock or simulated SIS mode remains available when explicitly configured.

Supporting files: `app/lib/sis/adapter.ts`, `app/lib/sis/banner-adapter.ts`

## Load-Bearing Files

- `prisma/schema.prisma`: Defines the shared data contract for integrations, Sandy traces, governance, tools, and courses.
- `proxy.ts`: Front door for authenticated API requests before route logic runs.
- `app/lib/prisma.ts`: Single shared Prisma client used across the server runtime.
- `app/lib/server-auth.ts`: Centralized auth and role enforcement for API routes.
- `app/lib/integrations/registry.ts`: Resolves persisted connector state into effective runtime integrations.
- `app/lib/assistant/providers.ts`: Maps connector state into the actual calendar, email, and file providers used by Sandy.
- `app/api/concierge/route.ts`: Primary Sandy orchestration route that composes user, course, and assistant context.
- `app/lib/agent/execution-traces.ts`: Persists Sandy execution traces and rehydrates them for admin review.
- `app/lib/provenance-service.ts`: Builds the trust metadata and course evidence bundles that Sandy now exposes.
- `app/lib/content-permissions.ts`: Turns course governance and consent state into allow or block retrieval decisions.
- `app/api/tools/route.ts`: Marketplace entry point for tool listing and creation, including review-aware trust metadata.
