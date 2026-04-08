import { access, readdir, readFile } from 'fs/promises'
import path from 'path'
import {
  listInstitutionIntegrations,
  listRuntimeInstitutionIntegrations,
} from './integrations/registry'

export const ARCHITECTURE_REPORT_VIEWS = ['summary', 'legal'] as const
export const ARCHITECTURE_REPORT_FORMATS = ['json', 'markdown'] as const

export type ArchitectureReportView = (typeof ARCHITECTURE_REPORT_VIEWS)[number]
export type ArchitectureReportFormat = (typeof ARCHITECTURE_REPORT_FORMATS)[number]

type ArchitectureDomainKey =
  | 'foundation'
  | 'connector_control_plane'
  | 'sandy_orchestration'
  | 'governance_provenance'
  | 'course_intelligence'
  | 'marketplace_publication'

type ArchitectureDomainConfig = {
  key: ArchitectureDomainKey
  title: string
  goal: string
  whyItMatters: string
  supportingPaths: string[]
  routePrefixes: string[]
  dependencies: string[]
  inputBoundaries: string[]
  outputBoundaries: string[]
  transformations: string[]
  humanCheckpoints: string[]
}

export type ArchitectureConnectorSummary = {
  key: string
  name: string
  systemLabel: string
  mode: string | null
  status: string | null
  configured: boolean | null
  authMode: string | null
  dataOwner: string | null
  lastCheckedAt: string | null
  lastSyncAt: string | null
  lastError: string | null
}

export type ArchitectureDomainReport = {
  key: ArchitectureDomainKey
  title: string
  goal: string
  whyItMatters: string
  dependencies: string[]
  inputBoundaries: string[]
  outputBoundaries: string[]
  transformations: string[]
  humanCheckpoints: string[]
  supportingPaths: string[]
  supportingRoutePaths: string[]
  moduleCount: number
  routeCount: number
}

export type ArchitectureApprovalCheckpoint = {
  title: string
  owner: string
  summary: string
  supportingPaths: string[]
}

export type ArchitectureDataFlow = {
  title: string
  summary: string
  steps: string[]
  supportingPaths: string[]
}

export type ArchitectureExternalService = {
  name: string
  purpose: string
  failureImpact: string
  fallback: string
  supportingPaths: string[]
}

export type ArchitectureLoadBearingFile = {
  path: string
  reason: string
}

export type ArchitectureReport = {
  generatedAt: string
  repoRoot: string
  inventory: {
    prismaModelCount: number
    prismaEnumCount: number
    apiRouteCount: number
    domainCount: number
    connectorCount: number
    loadBearingFileCount: number
    reportPath: string
  }
  connectorInventory: {
    source: 'live' | 'runtime' | 'fallback'
    note: string | null
    connectors: ArchitectureConnectorSummary[]
  }
  domains: ArchitectureDomainReport[]
  approvals: ArchitectureApprovalCheckpoint[]
  dataFlows: ArchitectureDataFlow[]
  externalServices: ArchitectureExternalService[]
  loadBearingFiles: ArchitectureLoadBearingFile[]
}

export type ArchitectureSummaryPayload = {
  view: 'summary'
  generatedAt: string
  inventory: ArchitectureReport['inventory']
  connectorInventory: ArchitectureReport['connectorInventory']
  domains: Array<{
    key: ArchitectureDomainReport['key']
    title: string
    goal: string
    whyItMatters: string
    moduleCount: number
    routeCount: number
    dependencies: string[]
    humanCheckpoints: string[]
  }>
  approvals: ArchitectureReport['approvals']
  dataFlows: ArchitectureReport['dataFlows']
  loadBearingFiles: ArchitectureReport['loadBearingFiles']
}

export type ArchitectureLegalPayload = ArchitectureReport & {
  view: 'legal'
}

const REPORT_PATH = 'SYSTEM-INTERDEPENDENCIES.md'

const DOMAIN_CONFIGS: ArchitectureDomainConfig[] = [
  {
    key: 'foundation',
    title: 'Shared Platform Foundation',
    goal:
      'Keep one authenticated, database-backed runtime contract that every other domain inherits.',
    whyItMatters:
      'If the shared database, auth, or provider selection layer drifts, the rest of the product breaks in batches rather than one feature at a time.',
    supportingPaths: [
      'prisma/schema.prisma',
      'proxy.ts',
      'app/lib/prisma.ts',
      'app/lib/server-auth.ts',
      'app/lib/api-utils.ts',
      'app/lib/assistant/providers.ts',
    ],
    routePrefixes: [],
    dependencies: [
      'Prisma schema and generated client define the shared persistence contract.',
      'Proxy and server-auth convert incoming cookies and headers into request user context.',
      'Assistant provider factories bridge connector state into runtime provider selection.',
    ],
    inputBoundaries: [
      'HTTP headers and cookies enter through proxy and route handlers.',
      'Environment variables define database and connector credentials.',
      'Prisma schema changes alter the shape of every persisted workflow.',
    ],
    outputBoundaries: [
      'Authenticated request context reaches API routes and server components.',
      'Database clients and provider descriptors are reused by downstream services.',
    ],
    transformations: [
      'Request auth turns headers into a typed user record or a denied response.',
      'Persisted connector state plus env defaults becomes an effective provider selection.',
      'Prisma schema compiles into the generated client consumed across the app.',
    ],
    humanCheckpoints: [
      'Admins manage access, secrets, and migrations before runtime logic can succeed.',
    ],
  },
  {
    key: 'connector_control_plane',
    title: 'Connector Control Plane',
    goal:
      'Persist connector status and let the assistant stack read institutional integrations from one control surface.',
    whyItMatters:
      'This is the deployment seam for moving from simulated demos to institution-backed data without rewriting the UI.',
    supportingPaths: [
      'prisma/schema.prisma',
      'app/lib/integrations/types.ts',
      'app/lib/integrations/registry.ts',
      'app/lib/integrations/health.ts',
      'app/lib/assistant/providers.ts',
      'app/admin/integrations/page.tsx',
      'app/api/admin/integrations/route.ts',
      'app/api/admin/integrations/[id]/route.ts',
      'app/api/admin/integrations/[id]/health/route.ts',
    ],
    routePrefixes: ['app/api/admin/integrations'],
    dependencies: [
      'InstitutionIntegration records carry the persisted system, mode, status, auth, and ownership fields.',
      'Provider factories pull resolved connector state before calendar, email, or file work runs.',
      'Health checks depend on env-backed Canvas, SIS, and Graph settings when real paths are enabled.',
    ],
    inputBoundaries: [
      'Admin configuration and health-check requests enter through the admin integrations routes.',
      'Runtime env defaults seed connector records when persisted values are missing.',
    ],
    outputBoundaries: [
      'Integration summaries feed the admin console and provider descriptors.',
      'Health results update operational timestamps and error messages for later review.',
    ],
    transformations: [
      'Env defaults plus persisted rows become one resolved integration view.',
      'Connector mode and configuration become provider availability messages.',
      'Health responses collapse raw checks into configured, degraded, blocked, or healthy statuses.',
    ],
    humanCheckpoints: [
      'Admins choose connector mode, auth metadata, and data-owner labels.',
      'Admins manually trigger health checks to verify live credentials before rollout.',
    ],
  },
  {
    key: 'sandy_orchestration',
    title: 'Sandy Orchestration and Observability',
    goal:
      'Run Sandy as a visible orchestrator whose decisions, tool use, and trust metadata can be inspected later.',
    whyItMatters:
      'Sandy now spans concierge prompts, agent tooling, connector selection, and review traces, so the execution record is part of the product rather than a debugging afterthought.',
    supportingPaths: [
      'prisma/schema.prisma',
      'app/api/concierge/route.ts',
      'app/api/agent/chat/route.ts',
      'app/lib/concierge-service.ts',
      'app/lib/agent/agent-loop.ts',
      'app/lib/agent/tool-registry.ts',
      'app/lib/agent/execution-traces.ts',
      'app/admin/sandy-traces/page.tsx',
      'app/api/admin/sandy-traces/route.ts',
      'app/api/admin/sandy-traces/[id]/route.ts',
    ],
    routePrefixes: ['app/api/concierge', 'app/api/agent/chat', 'app/api/admin/sandy-traces'],
    dependencies: [
      'Anthropic-backed response generation sits behind the concierge and agent routes.',
      'Execution trace tables persist run metadata and per-event records.',
      'Connector state and provenance metadata can be attached to the same interaction.',
    ],
    inputBoundaries: [
      'User messages, page context, and role-specific data enter through the concierge route.',
      'Agent events and approval events flow from the tool loop into the trace recorder.',
    ],
    outputBoundaries: [
      'Streaming assistant responses return to the client.',
      'Persistent trace summaries and detail views feed the admin Sandy trace UI.',
      'Structured trust headers and execution metadata can ride along with responses.',
    ],
    transformations: [
      'Conversation context becomes a system prompt with tool, course, and governance context.',
      'Runtime agent events become ordered SandyExecutionEvent rows.',
      'Trace rows become list and detail payloads for admin review.',
    ],
    humanCheckpoints: [
      'Approval requests in the agent layer can pause execution pending a person\'s decision.',
      'Admins review completed traces when auditing behavior or failures.',
    ],
  },
  {
    key: 'governance_provenance',
    title: 'Governance and Provenance',
    goal:
      'Attach permission basis, ownership, and trust metadata to course-visible AI retrieval and expose it in product surfaces.',
    whyItMatters:
      'This is the trust layer that explains what Sandy touched, whether it was allowed, and which course rules or consent states governed the decision.',
    supportingPaths: [
      'prisma/schema.prisma',
      'app/lib/provenance-types.ts',
      'app/lib/content-permissions.ts',
      'app/lib/course-policy-context.ts',
      'app/lib/provenance-service.ts',
      'app/api/courses/[id]/content-governance/route.ts',
      'app/components/TrustPanel.tsx',
      'app/components/courses/CourseSettingsTab.tsx',
      'app/api/users/compliance/route.ts',
      'app/api/admin/consent-versions/route.ts',
    ],
    routePrefixes: [
      'app/api/courses/[id]/content-governance',
      'app/api/users/compliance',
      'app/api/admin/consent-versions',
    ],
    dependencies: [
      'Course governance flags, uploader metadata, and consent state all shape permission decisions.',
      'Provenance services connect course policy context, course materials, and Sandy trust headers.',
      'TrustPanel and course settings surfaces consume the same structured trust payloads returned by services.',
    ],
    inputBoundaries: [
      'Course owners patch governance flags through the content-governance API.',
      'User consent state and consent version history arrive through compliance tables and routes.',
      'Course material metadata enters from upload, import, and sync flows.',
    ],
    outputBoundaries: [
      'Trust panel payloads and encoded response headers expose source and permission basis.',
      'Governance summary responses power course settings and admin review.',
      'Permission decisions block or allow retrieval before content reaches Sandy.',
    ],
    transformations: [
      'Source system and uploader role become provenance type and approval basis.',
      'Course flags plus consent status become AI opt-in and allow or block decisions.',
      'Allowed sources are serialized into structured trust metadata for UI display.',
    ],
    humanCheckpoints: [
      'Faculty decide whether AI retrieval, student uploads, transcript generation, and recording are allowed for a course.',
      'Users accept or revoke consent versions that affect user-uploaded retrieval.',
      'Admins publish consent versions that downstream permissions evaluate against.',
    ],
  },
  {
    key: 'course_intelligence',
    title: 'Course Content and Knowledge Retrieval',
    goal:
      'Move uploaded, imported, and synced course content into governed knowledge that Sandy can safely retrieve.',
    whyItMatters:
      'Course materials are the highest-trust institutional content the assistant uses, so the ingestion path must stay aligned with governance and provenance defaults.',
    supportingPaths: [
      'app/api/upload/course-material/route.ts',
      'app/api/courses/[id]/materials/route.ts',
      'app/api/courses/[id]/materials/import-syllabus/route.ts',
      'app/lib/assistant/knowledge-gateway.ts',
      'app/lib/assistant/simulated-files.ts',
      'app/lib/canvas-import-service.ts',
      'app/lib/syllabus-architect/canvas-sync-service.ts',
      'app/lib/provenance-service.ts',
      'app/lib/content-permissions.ts',
    ],
    routePrefixes: ['app/api/upload/course-material', 'app/api/courses/[id]/materials'],
    dependencies: [
      'Course material rows, syllabus imports, and Canvas sync all feed the same course knowledge surfaces.',
      'Governance services compute defaults and re-sync effective permissions for stored materials.',
      'Knowledge gateway and file search are downstream consumers of governed course content.',
    ],
    inputBoundaries: [
      'Educator uploads and syllabus imports enter through course-material routes.',
      'Canvas sync imports pull LMS content into course records.',
    ],
    outputBoundaries: [
      'Course retrieval returns governed excerpts for Sandy and assistant search.',
      'Material metadata flows into course settings, TrustPanel payloads, and file search results.',
    ],
    transformations: [
      'Uploads and imports become persisted course material rows with provenance defaults.',
      'Stored materials are filtered by permission decisions before retrieval.',
      'Retrieved content is trimmed into prompt-safe excerpts and trust citations.',
    ],
    humanCheckpoints: [
      'Course owners decide visibility and upload rules before course content is AI-retrievable.',
    ],
  },
  {
    key: 'marketplace_publication',
    title: 'Tool Marketplace and Publication Lifecycle',
    goal:
      'Carry tool drafts through creation, review, publication, and trust labeling in one shared marketplace surface.',
    whyItMatters:
      'The marketplace is the deployment face of the platform, so institutional review status and trust metadata must stay attached to tool records rather than living only in conversation history.',
    supportingPaths: [
      'app/api/tools/route.ts',
      'app/api/tools/[id]/route.ts',
      'app/components/ToolsBrowser.tsx',
      'app/components/ToolCard.tsx',
      'app/components/ToolOverview.tsx',
      'app/components/ToolBuilderChat.tsx',
      'app/lib/provenance-service.ts',
    ],
    routePrefixes: ['app/api/tools'],
    dependencies: [
      'Tool approval fields and publication flags define what the marketplace can show or deploy.',
      'Tool builder flows and recommendations create the upstream content that reaches the marketplace.',
      'Tool trust metadata reuses the governance and provenance layer for institutional review labeling.',
    ],
    inputBoundaries: [
      'Educators submit tool drafts and edits through tool routes and builder workflows.',
      'Institutional review metadata is added by admins or reviewers.',
    ],
    outputBoundaries: [
      'Marketplace cards and overview panels display tool trust metadata and publication status.',
      'Published tool data flows into study sessions, assignments, and Sandy recommendations.',
    ],
    transformations: [
      'Tool builder output becomes persisted tool records.',
      'Approval and review fields become trust badges and review status summaries.',
      'Marketplace queries filter the catalog based on role and publication state.',
    ],
    humanCheckpoints: [
      'Institutional reviewers approve or reject tools requiring review before broader deployment.',
      'Creators decide when a reviewed tool is published or kept private.',
    ],
  },
]

const APPROVAL_CHECKPOINTS: ArchitectureApprovalCheckpoint[] = [
  {
    title: 'Course AI governance toggles',
    owner: 'Faculty course owner or admin',
    summary:
      'Course owners patch retrieval, upload, transcript, and recording flags before course content can be used in governed retrieval.',
    supportingPaths: [
      'app/api/courses/[id]/content-governance/route.ts',
      'app/components/courses/CourseSettingsTab.tsx',
      'app/lib/content-permissions.ts',
    ],
  },
  {
    title: 'Consent version acceptance',
    owner: 'End user and compliance admin',
    summary:
      'User-uploaded content retrieval depends on current consent acceptance and ai-personalization status, while admins manage the active consent versions.',
    supportingPaths: [
      'app/api/users/compliance/route.ts',
      'app/api/admin/consent-versions/route.ts',
      'app/lib/content-permissions.ts',
    ],
  },
  {
    title: 'Agent action approvals',
    owner: 'End user or reviewer',
    summary:
      'Agent workflows can emit approval requests before high-impact tool execution continues, and those approval events are traceable later.',
    supportingPaths: [
      'app/lib/agent/agent-loop.ts',
      'app/lib/agent/tool-registry.ts',
      'app/lib/agent/execution-traces.ts',
      'app/components/agent/ApprovalCard.tsx',
    ],
  },
  {
    title: 'Institutional tool review',
    owner: 'Admin or institutional reviewer',
    summary:
      'Tool records carry approval and institutional review metadata that governs whether the marketplace can present them as reviewed or pending.',
    supportingPaths: [
      'app/api/tools/route.ts',
      'app/api/tools/[id]/route.ts',
      'app/lib/provenance-service.ts',
    ],
  },
  {
    title: 'Staff communication approval chain',
    owner: 'Staff approvers and admins',
    summary:
      'High-visibility staff communications carry an approval chain and explicit approval actions before they move from draft into approved or sent states.',
    supportingPaths: [
      'app/api/staff/communications/[id]/submit/route.ts',
      'app/api/staff/communications/[id]/approve/route.ts',
      'prisma/schema.prisma',
    ],
  },
]

const DATA_FLOWS: ArchitectureDataFlow[] = [
  {
    title: 'Connector state to assistant provider choice',
    summary:
      'Persisted integration state controls which provider Sandy and assistant endpoints expose, and that same snapshot is available for later trace review.',
    steps: [
      'Admin integration settings or env defaults resolve into InstitutionIntegration records.',
      'Provider factories map effective connector state into calendar, email, and file providers.',
      'Assistant and concierge flows execute against the chosen provider and can capture integration metadata in traces.',
    ],
    supportingPaths: [
      'app/lib/integrations/registry.ts',
      'app/lib/assistant/providers.ts',
      'app/api/admin/integrations/route.ts',
      'app/lib/agent/execution-traces.ts',
    ],
  },
  {
    title: 'Course content to trust-bearing Sandy retrieval',
    summary:
      'Course uploads and imports receive provenance defaults, then content-permission decisions decide what Sandy can retrieve and what the TrustPanel reveals.',
    steps: [
      'Uploads, imports, and Canvas sync create or update course materials.',
      'Governance defaults derive source system, approval basis, access scope, and opt-in state.',
      'Permission decisions filter retrieval and build the structured trust payload surfaced in the UI.',
    ],
    supportingPaths: [
      'app/api/upload/course-material/route.ts',
      'app/api/courses/[id]/materials/import-syllabus/route.ts',
      'app/lib/content-permissions.ts',
      'app/lib/provenance-service.ts',
      'app/components/TrustPanel.tsx',
    ],
  },
  {
    title: 'Sandy request to persistent execution review',
    summary:
      'A live Sandy interaction produces streaming text for the user and a parallel persisted trace for admin and reviewer inspection.',
    steps: [
      'The concierge or agent route builds a system prompt from user, page, connector, and course context.',
      'Execution events are recorded as ordered trace rows while the interaction runs.',
      'Admin trace routes read those rows back into list and detail payloads for review.',
    ],
    supportingPaths: [
      'app/api/concierge/route.ts',
      'app/lib/agent/execution-traces.ts',
      'app/api/admin/sandy-traces/route.ts',
      'app/api/admin/sandy-traces/[id]/route.ts',
    ],
  },
  {
    title: 'Tool draft to reviewed marketplace listing',
    summary:
      'Tool creation, institutional review metadata, and trust labeling travel together from the builder flow into the marketplace surface.',
    steps: [
      'Tool creation routes persist drafts and publication fields.',
      'Review metadata and approval status are attached to the same tool record.',
      'Marketplace surfaces display trust metadata and publication state for downstream reuse.',
    ],
    supportingPaths: [
      'app/api/tools/route.ts',
      'app/api/tools/[id]/route.ts',
      'app/components/ToolsBrowser.tsx',
      'app/lib/provenance-service.ts',
    ],
  },
]

const EXTERNAL_SERVICES: ArchitectureExternalService[] = [
  {
    name: 'PostgreSQL via Prisma',
    purpose:
      'Primary persistence for users, courses, integrations, traces, governance, and marketplace records.',
    failureImpact:
      'Most authenticated routes, page loads, and trace or governance surfaces fail because the shared data contract is unavailable.',
    fallback: 'No meaningful runtime fallback exists.',
    supportingPaths: ['prisma/schema.prisma', 'app/lib/prisma.ts'],
  },
  {
    name: 'Anthropic Claude',
    purpose: 'Primary reasoning engine behind concierge and agent responses.',
    failureImpact:
      'Sandy interactions and agent-assisted experiences degrade or fail outright.',
    fallback:
      'The platform can still render stored data, but live assistant generation is unavailable.',
    supportingPaths: ['app/api/concierge/route.ts', 'app/lib/agent/agent-loop.ts'],
  },
  {
    name: 'OpenAI embeddings and speech',
    purpose:
      'Embeddings and assistant-adjacent AI utilities used by knowledge retrieval paths.',
    failureImpact:
      'New knowledge indexing and some assistant retrieval enrichments become less capable.',
    fallback:
      'Existing stored content can still be used in a reduced mode, but fresh indexing and some enrichments are limited.',
    supportingPaths: ['app/lib/embedding-service.ts', 'app/api/concierge/route.ts'],
  },
  {
    name: 'Microsoft Graph and Azure tenant credentials',
    purpose: 'Future real-mode connector path for Outlook calendar, email, and file access.',
    failureImpact:
      'Real connector rollout is blocked and provider selection remains simulated or unavailable.',
    fallback:
      'Simulated providers still work when the integration is configured for simulated mode.',
    supportingPaths: ['app/lib/integrations/registry.ts', 'app/lib/assistant/providers.ts'],
  },
  {
    name: 'Canvas LMS',
    purpose: 'Course import, sync, and passback source for institutional course content.',
    failureImpact: 'Real Canvas sync, course import, and passback flows stall or degrade.',
    fallback: 'Manual uploads and simulated content paths still work.',
    supportingPaths: [
      'app/lib/canvas-client.ts',
      'app/lib/syllabus-architect/canvas-sync-service.ts',
    ],
  },
  {
    name: 'Banner and SIS adapter',
    purpose: 'Student record and academic standing source behind the SIS abstraction.',
    failureImpact:
      'Real student-record-backed flows cannot rely on institutional SIS data.',
    fallback: 'Mock or simulated SIS mode remains available when explicitly configured.',
    supportingPaths: ['app/lib/sis/adapter.ts', 'app/lib/sis/banner-adapter.ts'],
  },
]

const LOAD_BEARING_FILES: ArchitectureLoadBearingFile[] = [
  {
    path: 'prisma/schema.prisma',
    reason:
      'Defines the shared data contract for integrations, Sandy traces, governance, tools, and courses.',
  },
  {
    path: 'proxy.ts',
    reason: 'Front door for authenticated API requests before route logic runs.',
  },
  {
    path: 'app/lib/prisma.ts',
    reason: 'Single shared Prisma client used across the server runtime.',
  },
  {
    path: 'app/lib/server-auth.ts',
    reason: 'Centralized auth and role enforcement for API routes.',
  },
  {
    path: 'app/lib/integrations/registry.ts',
    reason: 'Resolves persisted connector state into effective runtime integrations.',
  },
  {
    path: 'app/lib/assistant/providers.ts',
    reason:
      'Maps connector state into the actual calendar, email, and file providers used by Sandy.',
  },
  {
    path: 'app/api/concierge/route.ts',
    reason:
      'Primary Sandy orchestration route that composes user, course, and assistant context.',
  },
  {
    path: 'app/lib/agent/execution-traces.ts',
    reason: 'Persists Sandy execution traces and rehydrates them for admin review.',
  },
  {
    path: 'app/lib/provenance-service.ts',
    reason: 'Builds the trust metadata and course evidence bundles that Sandy now exposes.',
  },
  {
    path: 'app/lib/content-permissions.ts',
    reason: 'Turns course governance and consent state into allow or block retrieval decisions.',
  },
  {
    path: 'app/api/tools/route.ts',
    reason:
      'Marketplace entry point for tool listing and creation, including review-aware trust metadata.',
  },
]

const FALLBACK_CONNECTORS: ArchitectureConnectorSummary[] = [
  {
    key: 'OUTLOOK_GRAPH_ASSISTANT',
    name: 'Outlook / Graph Assistant',
    systemLabel: 'Microsoft Graph',
    mode: null,
    status: null,
    configured: null,
    authMode: null,
    dataOwner: null,
    lastCheckedAt: null,
    lastSyncAt: null,
    lastError: null,
  },
  {
    key: 'CANVAS',
    name: 'Canvas LMS',
    systemLabel: 'Canvas LMS',
    mode: null,
    status: null,
    configured: null,
    authMode: null,
    dataOwner: null,
    lastCheckedAt: null,
    lastSyncAt: null,
    lastError: null,
  },
  {
    key: 'SIS',
    name: 'Student Information System',
    systemLabel: 'Banner / Ellucian',
    mode: null,
    status: null,
    configured: null,
    authMode: null,
    dataOwner: null,
    lastCheckedAt: null,
    lastSyncAt: null,
    lastError: null,
  },
  {
    key: 'SHAREPOINT_ONEDRIVE_FILES',
    name: 'SharePoint / OneDrive Files',
    systemLabel: 'SharePoint / OneDrive',
    mode: null,
    status: null,
    configured: null,
    authMode: null,
    dataOwner: null,
    lastCheckedAt: null,
    lastSyncAt: null,
    lastError: null,
  },
]

function normalizePath(value: string) {
  return value.replace(/\\/g, '/')
}

function toAbsolutePath(repoRoot: string, relativePath: string) {
  return path.join(repoRoot, ...normalizePath(relativePath).split('/'))
}

async function pathExists(targetPath: string) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

async function collectFiles(rootDir: string): Promise<string[]> {
  if (!(await pathExists(rootDir))) return []

  const entries = await readdir(rootDir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(rootDir, entry.name)
      if (entry.isDirectory()) {
        return collectFiles(fullPath)
      }

      return [fullPath]
    }),
  )

  return nested.flat()
}

async function readSchemaInventory(repoRoot: string) {
  const schemaPath = toAbsolutePath(repoRoot, 'prisma/schema.prisma')
  const schema = await readFile(schemaPath, 'utf8')

  return {
    prismaModelCount: Array.from(schema.matchAll(/^model\s+\w+/gm)).length,
    prismaEnumCount: Array.from(schema.matchAll(/^enum\s+\w+/gm)).length,
  }
}

function mapConnectorInventory(
  connectors: Awaited<ReturnType<typeof listInstitutionIntegrations>>,
) {
  return connectors.map((connector) => ({
    key: connector.key,
    name: connector.name,
    systemLabel: connector.systemLabel,
    mode: connector.mode,
    status: connector.status,
    configured: connector.configured,
    authMode: connector.authMode,
    dataOwner: connector.dataOwner,
    lastCheckedAt: connector.lastCheckedAt,
    lastSyncAt: connector.lastSyncAt,
    lastError: connector.lastError,
  }))
}

async function buildConnectorInventory() {
  try {
    const connectors = await listInstitutionIntegrations()

    return {
      source: 'live' as const,
      note: null,
      connectors: mapConnectorInventory(connectors),
    }
  } catch (error) {
    const rawMessage =
      error instanceof Error ? error.message : 'unknown error'
    const firstLine =
      rawMessage
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean) ?? 'unknown error'
    const normalizedFirstLine = firstLine.includes('prisma.')
      ? 'connector inventory query failed'
      : firstLine
    const message =
      normalizedFirstLine.length > 160
        ? `${normalizedFirstLine.slice(0, 157)}...`
        : normalizedFirstLine

    try {
      const runtimeConnectors = listRuntimeInstitutionIntegrations()

      return {
        source: 'runtime' as const,
        note:
          `Persisted connector inventory was unavailable while generating this report. Reason: ${message}. ` +
          'Runtime connector defaults are shown instead.',
        connectors: mapConnectorInventory(runtimeConnectors),
      }
    } catch {
      // Fall through to the static catalog snapshot below.
    }

    return {
      source: 'fallback' as const,
      note:
        `Persisted connector inventory was unavailable while generating this report. Reason: ${message}. ` +
        'Static connector catalog details are shown instead.',
      connectors: FALLBACK_CONNECTORS,
    }
  }
}

function buildDomainReport(params: {
  config: ArchitectureDomainConfig
  routeFiles: string[]
  existingPaths: Set<string>
}) {
  const supportingPaths = params.config.supportingPaths.filter((relativePath) =>
    params.existingPaths.has(normalizePath(relativePath)),
  )

  const supportingRoutePaths = Array.from(
    new Set(
      params.routeFiles.filter((relativePath) =>
        params.config.routePrefixes.some((prefix) =>
          relativePath.startsWith(normalizePath(prefix)),
        ),
      ),
    ),
  ).sort()

  return {
    key: params.config.key,
    title: params.config.title,
    goal: params.config.goal,
    whyItMatters: params.config.whyItMatters,
    dependencies: params.config.dependencies,
    inputBoundaries: params.config.inputBoundaries,
    outputBoundaries: params.config.outputBoundaries,
    transformations: params.config.transformations,
    humanCheckpoints: params.config.humanCheckpoints,
    supportingPaths,
    supportingRoutePaths,
    moduleCount: supportingPaths.length,
    routeCount: supportingRoutePaths.length,
  } satisfies ArchitectureDomainReport
}

function buildMarkdownTable(headers: string[], rows: string[][]) {
  const separator = headers.map(() => '---')
  return [headers, separator, ...rows]
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n')
}

function formatList(items: string[]) {
  if (items.length === 0) return ['- None recorded']
  return items.map((item) => `- ${item}`)
}

function formatPaths(paths: string[]) {
  if (paths.length === 0) return 'None'
  return paths.map((value) => `\`${value}\``).join(', ')
}

function formatConnectorValue(value: string | boolean | null | undefined) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (!value) return 'Not recorded'
  return value
}

function renderSummaryMarkdown(report: ArchitectureReport) {
  const lines: string[] = [
    '# University of Kentucky Architecture Summary',
    '',
    `Generated from the current repo state on ${report.generatedAt}.`,
    '',
    '## Current Inventory',
    '',
    buildMarkdownTable(
      ['Metric', 'Value'],
      [
        ['Prisma models', String(report.inventory.prismaModelCount)],
        ['Prisma enums', String(report.inventory.prismaEnumCount)],
        ['API routes', String(report.inventory.apiRouteCount)],
        ['Architecture domains', String(report.inventory.domainCount)],
        ['Connectors tracked', String(report.inventory.connectorCount)],
      ],
    ),
    '',
    '## Connector Snapshot',
    '',
  ]

  if (report.connectorInventory.note) {
    lines.push(report.connectorInventory.note, '')
  }

  lines.push(
    buildMarkdownTable(
      ['Connector', 'Mode', 'Status', 'Configured', 'Auth'],
      report.connectorInventory.connectors.map((connector) => [
        connector.name,
        formatConnectorValue(connector.mode),
        formatConnectorValue(connector.status),
        formatConnectorValue(connector.configured),
        formatConnectorValue(connector.authMode),
      ]),
    ),
    '',
    '## Core Domains',
    '',
  )

  for (const domain of report.domains) {
    lines.push(`### ${domain.title}`)
    lines.push('')
    lines.push(domain.goal)
    lines.push('')
    lines.push(`Why it matters: ${domain.whyItMatters}`)
    lines.push('')
    lines.push(
      `Inventory: ${domain.moduleCount} supporting file${domain.moduleCount === 1 ? '' : 's'}, ${domain.routeCount} route${domain.routeCount === 1 ? '' : 's'}.`,
    )
    lines.push(...formatList(domain.humanCheckpoints))
    lines.push('')
  }

  lines.push('## Key Approval Checkpoints', '')

  for (const approval of report.approvals) {
    lines.push(`### ${approval.title}`)
    lines.push('')
    lines.push(`${approval.summary} Owner: ${approval.owner}.`)
    lines.push('')
  }

  lines.push('## Key Data Flows', '')

  for (const flow of report.dataFlows) {
    lines.push(`### ${flow.title}`)
    lines.push('')
    lines.push(flow.summary)
    lines.push('')
    lines.push(...flow.steps.map((step, index) => `${index + 1}. ${step}`))
    lines.push('')
  }

  lines.push('## Load-Bearing Files', '')
  lines.push(
    ...report.loadBearingFiles.map((entry) => `- \`${entry.path}\`: ${entry.reason}`),
  )
  lines.push('')

  return lines.join('\n')
}

function renderLegalMarkdown(report: ArchitectureReport) {
  const lines: string[] = [
    '# University of Kentucky System Interdependencies',
    '',
    'This architecture packet is generated from the current repo state rather than maintained by hand.',
    '',
    `Generated at: ${report.generatedAt}`,
    `Report path: \`${report.inventory.reportPath}\``,
    '',
    '## Inventory Snapshot',
    '',
    buildMarkdownTable(
      ['Metric', 'Value'],
      [
        ['Prisma models', String(report.inventory.prismaModelCount)],
        ['Prisma enums', String(report.inventory.prismaEnumCount)],
        ['API routes', String(report.inventory.apiRouteCount)],
        ['Architecture domains', String(report.inventory.domainCount)],
        ['Connectors tracked', String(report.inventory.connectorCount)],
        ['Load-bearing files', String(report.inventory.loadBearingFileCount)],
      ],
    ),
    '',
    '## Connector Inventory',
    '',
  ]

  if (report.connectorInventory.note) {
    lines.push(report.connectorInventory.note, '')
  }

  lines.push(
    buildMarkdownTable(
      [
        'Connector',
        'System',
        'Mode',
        'Status',
        'Configured',
        'Auth',
        'Data owner',
        'Last checked',
        'Last sync',
      ],
      report.connectorInventory.connectors.map((connector) => [
        connector.name,
        connector.systemLabel,
        formatConnectorValue(connector.mode),
        formatConnectorValue(connector.status),
        formatConnectorValue(connector.configured),
        formatConnectorValue(connector.authMode),
        formatConnectorValue(connector.dataOwner),
        formatConnectorValue(connector.lastCheckedAt),
        formatConnectorValue(connector.lastSyncAt),
      ]),
    ),
    '',
    '## Major Domains',
    '',
  )

  for (const domain of report.domains) {
    lines.push(`### ${domain.title}`)
    lines.push('')
    lines.push(`Goal: ${domain.goal}`)
    lines.push('')
    lines.push(`Why it matters: ${domain.whyItMatters}`)
    lines.push('')
    lines.push(`Supporting files: ${formatPaths(domain.supportingPaths)}`)
    lines.push('')
    lines.push(
      `Route inventory: ${
        domain.routeCount > 0
          ? formatPaths(domain.supportingRoutePaths)
          : 'No direct API routes in this domain inventory.'
      }`,
    )
    lines.push('')
    lines.push('Dependencies:')
    lines.push(...formatList(domain.dependencies))
    lines.push('')
    lines.push('Input boundaries:')
    lines.push(...formatList(domain.inputBoundaries))
    lines.push('')
    lines.push('Output boundaries:')
    lines.push(...formatList(domain.outputBoundaries))
    lines.push('')
    lines.push('Data transformations:')
    lines.push(...formatList(domain.transformations))
    lines.push('')
    lines.push('Human approval checkpoints:')
    lines.push(...formatList(domain.humanCheckpoints))
    lines.push('')
  }

  lines.push('## Human Approval Checkpoints', '')

  for (const approval of report.approvals) {
    lines.push(`### ${approval.title}`)
    lines.push('')
    lines.push(`Owner: ${approval.owner}`)
    lines.push('')
    lines.push(approval.summary)
    lines.push('')
    lines.push(`Supporting files: ${formatPaths(approval.supportingPaths)}`)
    lines.push('')
  }

  lines.push('## Data-Flow Chains', '')

  for (const flow of report.dataFlows) {
    lines.push(`### ${flow.title}`)
    lines.push('')
    lines.push(flow.summary)
    lines.push('')
    lines.push(...flow.steps.map((step, index) => `${index + 1}. ${step}`))
    lines.push('')
    lines.push(`Supporting files: ${formatPaths(flow.supportingPaths)}`)
    lines.push('')
  }

  lines.push('## External Services', '')

  for (const service of report.externalServices) {
    lines.push(`### ${service.name}`)
    lines.push('')
    lines.push(`Purpose: ${service.purpose}`)
    lines.push('')
    lines.push(`Failure impact: ${service.failureImpact}`)
    lines.push('')
    lines.push(`Fallback: ${service.fallback}`)
    lines.push('')
    lines.push(`Supporting files: ${formatPaths(service.supportingPaths)}`)
    lines.push('')
  }

  lines.push('## Load-Bearing Files', '')
  lines.push(
    ...report.loadBearingFiles.map((entry) => `- \`${entry.path}\`: ${entry.reason}`),
  )
  lines.push('')

  return lines.join('\n')
}

export async function buildArchitectureReport(options?: { repoRoot?: string }) {
  const repoRoot = options?.repoRoot ?? process.cwd()
  const [schemaInventory, connectorInventory, allApiFiles] = await Promise.all([
    readSchemaInventory(repoRoot),
    buildConnectorInventory(),
    collectFiles(toAbsolutePath(repoRoot, 'app/api')),
  ])

  const routeFiles = allApiFiles
    .filter((filePath) => path.basename(filePath) === 'route.ts')
    .map((filePath) => normalizePath(path.relative(repoRoot, filePath)))
    .sort()

  const candidatePaths = Array.from(
    new Set(
      [
        ...DOMAIN_CONFIGS.flatMap((domain) => domain.supportingPaths),
        ...APPROVAL_CHECKPOINTS.flatMap((entry) => entry.supportingPaths),
        ...DATA_FLOWS.flatMap((entry) => entry.supportingPaths),
        ...EXTERNAL_SERVICES.flatMap((entry) => entry.supportingPaths),
        ...LOAD_BEARING_FILES.map((entry) => entry.path),
      ].map((relativePath) => normalizePath(relativePath)),
    ),
  )

  const existingPaths = new Set(
    (
      await Promise.all(
        candidatePaths.map(async (relativePath) => {
          const exists = await pathExists(toAbsolutePath(repoRoot, relativePath))
          return exists ? relativePath : null
        }),
      )
    ).filter((value): value is string => Boolean(value)),
  )

  const domains = DOMAIN_CONFIGS.map((config) =>
    buildDomainReport({
      config,
      routeFiles,
      existingPaths,
    }),
  )

  const approvals = APPROVAL_CHECKPOINTS.map((approval) => ({
    ...approval,
    supportingPaths: approval.supportingPaths.filter((relativePath) =>
      existingPaths.has(normalizePath(relativePath)),
    ),
  }))

  const dataFlows = DATA_FLOWS.map((flow) => ({
    ...flow,
    supportingPaths: flow.supportingPaths.filter((relativePath) =>
      existingPaths.has(normalizePath(relativePath)),
    ),
  }))

  const externalServices = EXTERNAL_SERVICES.map((service) => ({
    ...service,
    supportingPaths: service.supportingPaths.filter((relativePath) =>
      existingPaths.has(normalizePath(relativePath)),
    ),
  }))

  const loadBearingFiles = LOAD_BEARING_FILES.filter((entry) =>
    existingPaths.has(normalizePath(entry.path)),
  )

  return {
    generatedAt: new Date().toISOString(),
    repoRoot,
    inventory: {
      prismaModelCount: schemaInventory.prismaModelCount,
      prismaEnumCount: schemaInventory.prismaEnumCount,
      apiRouteCount: routeFiles.length,
      domainCount: domains.length,
      connectorCount: connectorInventory.connectors.length,
      loadBearingFileCount: loadBearingFiles.length,
      reportPath: REPORT_PATH,
    },
    connectorInventory,
    domains,
    approvals,
    dataFlows,
    externalServices,
    loadBearingFiles,
  } satisfies ArchitectureReport
}

export function selectArchitectureReportView(
  report: ArchitectureReport,
  view: ArchitectureReportView,
): ArchitectureSummaryPayload | ArchitectureLegalPayload {
  if (view === 'summary') {
    return {
      view: 'summary',
      generatedAt: report.generatedAt,
      inventory: report.inventory,
      connectorInventory: report.connectorInventory,
      domains: report.domains.map((domain) => ({
        key: domain.key,
        title: domain.title,
        goal: domain.goal,
        whyItMatters: domain.whyItMatters,
        moduleCount: domain.moduleCount,
        routeCount: domain.routeCount,
        dependencies: domain.dependencies,
        humanCheckpoints: domain.humanCheckpoints,
      })),
      approvals: report.approvals,
      dataFlows: report.dataFlows,
      loadBearingFiles: report.loadBearingFiles,
    }
  }

  return {
    view: 'legal',
    ...report,
  }
}

export function renderArchitectureReportMarkdown(
  report: ArchitectureReport,
  view: ArchitectureReportView,
) {
  return view === 'summary'
    ? renderSummaryMarkdown(report)
    : renderLegalMarkdown(report)
}
