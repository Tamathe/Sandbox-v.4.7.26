/**
 * Sandy Universal Agent — Tool Registry
 *
 * Central registry that aggregates all tool modules.
 * Provides Claude-compatible tool definitions filtered by role,
 * executes tool calls with auth checks, and classifies approval level.
 */

import type {
  AgentUser,
  RegisteredTool,
  ToolDefinition,
  ToolHandler,
  ToolModule,
  ToolResult,
  UserRole,
} from './agent-types';

// P0 Tool Modules
import { academicTools } from './tools/academic-tools';
import { communicationTools } from './tools/communication-tools';
import { calendarTools } from './tools/calendar-tools';
import { sandyTools } from './tools/sandy-tools';
import { campusTools } from './tools/campus-tools';

// P1 Tool Modules (new)
import { analyticsTools } from './tools/analytics-tools';
import { contentTools } from './tools/content-tools';
import { facultyTools } from './tools/faculty-tools';

// P2 Tool Modules
import { documentTools } from './tools/document-tools';

// AI Literacy Hub
import aiLiteracyToolModule from './tools/ai-literacy-tools';

// University Systems Integration Hub
import { universitySystemsTools } from './tools/university-systems-tools';

// Engagement Fingerprint
import { fingerprintTools } from './tools/fingerprint-tools';

// Crisis Communications
import { crisisCommsTools } from './tools/crisis-comms-tools';

// Philanthropy Assistant
import { philanthropyTools } from './tools/philanthropy-tools';

// Learning Goals (My Path)
import { learningGoalTools } from './tools/learning-goal-tools';


// MEI (Mastery Efficiency Index)
import { meiTools } from './tools/mei-tools';

// Student Success Early Warning
import { successTools } from './tools/success-tools';

// Accreditation Autopilot
import { accreditationTools } from './tools/accreditation-tools';

// Personal Task Manager
import { taskTools } from './tools/task-tools';

// Classroom Intelligence Loop
import { classroomIntelligenceTools } from './tools/classroom-intelligence-tools'

// Virtual Clinic
import { virtualClinicTools } from './tools/virtual-clinic-tools';

// Cross-Course Concept Bridge
import { conceptBridgeTools } from './tools/concept-bridge-tools';

// Curriculum Intelligence Network
import { curriculumIntelTools } from './tools/curriculum-intel-tools';

// Campus Pulse Early Warning
import { campusPulseTools } from './tools/campus-pulse-early-warning-tools';

// Policy Blast Radius
import { policyBlastTools } from './tools/policy-blast-tools';

// Learning Weather Map
import { weatherMapTools } from './tools/weather-map-tools'

// Audio Experience Platform
import { audioTools } from './tools/audio-tools';

// Anthropic SDK tool shape (subset we need)
export interface AnthropicToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  /** Register a single tool */
  register(definition: ToolDefinition, handler: ToolHandler): void {
    if (this.tools.has(definition.name)) {
      throw new Error(`Tool "${definition.name}" is already registered`);
    }
    this.tools.set(definition.name, { definition, handler });
  }

  /** Register all tools from a ToolModule */
  registerModule(mod: ToolModule): void {
    for (const def of mod.tools) {
      const handler = mod.handlers[def.name];
      if (!handler) {
        throw new Error(`Tool module missing handler for "${def.name}"`);
      }
      this.register(def, handler);
    }
  }

  // ---------------------------------------------------------------------------
  // Discovery
  // ---------------------------------------------------------------------------

  /** Get Claude-compatible tool definitions filtered by user role (+ isAdvisor) */
  getToolDefinitions(role: UserRole, user?: AgentUser): AnthropicToolDef[] {
    const defs: AnthropicToolDef[] = [];
    const reliabilityHints: Record<string, string> = {
      seeded: ' [DATA: seeded demo data — structurally real but content is synthetic]',
      synthetic: ' [DATA: may return templated/mock data — caveat results to the user]',
      navigation: ' [ACTION: returns a URL/UI action, not factual data]',
    };
    for (const { definition } of this.tools.values()) {
      const roleMatch = definition.roles.includes(role);
      const advisorMatch = definition.advisorAccess && user && 'isAdvisor' in user && user.isAdvisor;
      if (roleMatch || advisorMatch) {
        const hint = reliabilityHints[definition.reliability ?? 'live'] ?? '';
        defs.push({
          name: definition.name,
          description: definition.description + hint,
          input_schema: definition.input_schema,
        });
      }
    }
    return defs;
  }

  /**
   * Get tools filtered by role AND current page context.
   * Reduces tool count from ~85 to ~20-40 depending on page,
   * improving Claude's tool selection accuracy and cutting token cost.
   *
   * Always includes: sandy, calendar, communication, task tools (universal).
   * Adds page-specific categories based on URL patterns.
   */
  getToolDefinitionsForPage(role: UserRole, currentPage: string | undefined, user?: AgentUser): AnthropicToolDef[] {
    if (!currentPage) return this.getToolDefinitions(role, user);

    const relevantCategories = getPageRelevantCategories(currentPage);
    // If no specific mapping, return all tools (homepage, unknown pages)
    if (!relevantCategories) return this.getToolDefinitions(role, user);

    const defs: AnthropicToolDef[] = [];
    const reliabilityHints: Record<string, string> = {
      seeded: ' [DATA: seeded demo data — structurally real but content is synthetic]',
      synthetic: ' [DATA: may return templated/mock data — caveat results to the user]',
      navigation: ' [ACTION: returns a URL/UI action, not factual data]',
    };
    for (const { definition } of this.tools.values()) {
      const roleMatch = definition.roles.includes(role);
      const advisorMatch = definition.advisorAccess && user && 'isAdvisor' in user && user.isAdvisor;
      if (!roleMatch && !advisorMatch) continue;

      // Include if tool's category is in the relevant set
      if (!relevantCategories.has(definition.category)) continue;

      const hint = reliabilityHints[definition.reliability ?? 'live'] ?? '';
      defs.push({
        name: definition.name,
        description: definition.description + hint,
        input_schema: definition.input_schema,
      });
    }
    return defs;
  }

  /**
   * Get tools filtered by an explicit allow-list of tool names (agent profile capabilities).
   * Still applies role filtering — a profile can't grant tools the user's role lacks.
   * If capabilities is empty, returns all role+page-filtered tools (default Sandy behavior).
   */
  getToolDefinitionsForProfile(
    role: UserRole,
    capabilities: string[],
    currentPage: string | undefined,
    user?: AgentUser,
  ): AnthropicToolDef[] {
    const pageFiltered = this.getToolDefinitionsForPage(role, currentPage, user)
    if (!capabilities.length) return pageFiltered

    const allowed = new Set(capabilities)
    return pageFiltered.filter((tool) => allowed.has(tool.name))
  }

  /** Get full tool definition (internal use) */
  getDefinition(toolName: string): ToolDefinition | undefined {
    return this.tools.get(toolName)?.definition;
  }

  /** Check if a tool requires user approval before execution */
  requiresApproval(toolName: string): boolean {
    const tool = this.tools.get(toolName);
    return tool?.definition.permission === 'confirm';
  }

  /** List all registered tool names */
  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /** Count registered tools */
  get size(): number {
    return this.tools.size;
  }

  // ---------------------------------------------------------------------------
  // Execution
  // ---------------------------------------------------------------------------

  /**
   * Execute a tool call with auth checks.
   *
   * Returns a ToolResult formatted for the Claude messages API.
   * On error, returns is_error: true with the error message.
   */
  async execute(
    toolName: string,
    toolUseId: string,
    args: Record<string, unknown>,
    user: AgentUser,
  ): Promise<ToolResult> {
    const registered = this.tools.get(toolName);

    if (!registered) {
      return {
        tool_use_id: toolUseId,
        type: 'tool_result',
        content: JSON.stringify({ error: `Unknown tool: ${toolName}` }),
        is_error: true,
      };
    }

    // Role check (also allow isAdvisor users for advisorAccess tools)
    const advisorGranted = registered.definition.advisorAccess && 'isAdvisor' in user && user.isAdvisor;
    if (!registered.definition.roles.includes(user.role) && !advisorGranted) {
      return {
        tool_use_id: toolUseId,
        type: 'tool_result',
        content: JSON.stringify({
          error: `Access denied: ${user.role} cannot use ${toolName}`,
        }),
        is_error: true,
      };
    }

    try {
      const result = await registered.handler(args, user);
      return {
        tool_use_id: toolUseId,
        type: 'tool_result',
        content: JSON.stringify(result),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tool execution failed';
      return {
        tool_use_id: toolUseId,
        type: 'tool_result',
        content: JSON.stringify({ error: message }),
        is_error: true,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Page → Tool Category Mapping
// ---------------------------------------------------------------------------

/** Universal categories included on every page */
const UNIVERSAL_CATEGORIES = new Set(['sandy', 'calendar', 'communication', 'tasks']);

/** Map page URL patterns to relevant tool categories. Returns null for "show all tools" pages. */
function getPageRelevantCategories(page: string): Set<string> | null {
  // Homepage / root — show everything (morning briefing needs all tools)
  if (page === '/' || page === '') return null;

  // Course pages — academic + content + analytics
  if (page.startsWith('/courses'))
    return new Set([...UNIVERSAL_CATEGORIES, 'academic', 'content', 'analytics']);

  // Analytics pages
  if (page.startsWith('/analytics'))
    return new Set([...UNIVERSAL_CATEGORIES, 'analytics', 'academic']);

  // Campus map / buildings
  if (page.startsWith('/campus-map'))
    return new Set([...UNIVERSAL_CATEGORIES, 'campus']);

  // AI Literacy pages
  if (page.startsWith('/ai-literacy'))
    return new Set([...UNIVERSAL_CATEGORIES, 'academic', 'content']);

  // Staff pages
  if (page.startsWith('/staff'))
    return new Set([...UNIVERSAL_CATEGORIES, 'campus', 'academic']);

  // Registrar pages
  if (page.startsWith('/registrar'))
    return new Set([...UNIVERSAL_CATEGORIES, 'academic', 'campus']);

  // University systems
  if (page.startsWith('/university-systems'))
    return new Set([...UNIVERSAL_CATEGORIES, 'campus']);

  // Messages page
  if (page.startsWith('/messages'))
    return new Set([...UNIVERSAL_CATEGORIES, 'academic']);

  // Hub / build / tools — show everything
  if (page.startsWith('/hub') || page.startsWith('/build') || page.startsWith('/tools'))
    return null;

  // Virtual Clinic pages
  if (page.startsWith('/virtual-clinic'))
    return new Set([...UNIVERSAL_CATEGORIES, 'campus', 'academic']);

  // Accreditation pages
  if (page.startsWith('/accreditation'))
    return new Set([...UNIVERSAL_CATEGORIES, 'analytics', 'content']);

  // Audio Experience Platform
  if (page.startsWith('/audio'))
    return new Set([...UNIVERSAL_CATEGORIES, 'academic', 'content']);

  // Admin sub-pages with dedicated tools
  if (page.startsWith('/admin/curriculum-intelligence') || page.startsWith('/admin/campus-pulse') || page.startsWith('/admin/policy-blast'))
    return null;

  // Unknown page — show everything
  return null;
}

// ---------------------------------------------------------------------------
// Singleton Instance
// ---------------------------------------------------------------------------

let _registry: ToolRegistry | null = null;

/**
 * Get the global tool registry singleton.
 * Tool modules register themselves on first access.
 */
export function getToolRegistry(): ToolRegistry {
  if (!_registry) {
    const registry = new ToolRegistry();
    // P0 Tool Modules
    registry.registerModule(academicTools);
    registry.registerModule(communicationTools);
    registry.registerModule(calendarTools);
    registry.registerModule(sandyTools);
    registry.registerModule(campusTools);
    // P1 Tool Modules
    registry.registerModule(analyticsTools);
    registry.registerModule(contentTools);
    registry.registerModule(facultyTools);
    // P2 Tool Modules
    registry.registerModule(documentTools);
    // AI Literacy Hub
    registry.registerModule(aiLiteracyToolModule);
    // University Systems Integration Hub
    registry.registerModule(universitySystemsTools);
    // Engagement Fingerprint
    registry.registerModule(fingerprintTools);
    // Crisis Communications
    registry.registerModule(crisisCommsTools);
    // MEI (Mastery Efficiency Index)
    registry.registerModule(meiTools);
    // Philanthropy Assistant
    registry.registerModule(philanthropyTools);

    registry.registerModule(learningGoalTools);
    // Student Success Early Warning
    registry.registerModule(successTools);
    // Accreditation Autopilot
    registry.registerModule(accreditationTools);
    // Classroom Intelligence Loop
    registry.registerModule(classroomIntelligenceTools);

    registry.registerModule(taskTools);
    // Virtual Clinic
    registry.registerModule(virtualClinicTools);
    // Cross-Course Concept Bridge
    registry.registerModule(conceptBridgeTools);
    // Curriculum Intelligence Network
    registry.registerModule(curriculumIntelTools);
    // Campus Pulse Early Warning
    registry.registerModule(campusPulseTools);
    // Policy Blast Radius
    registry.registerModule(policyBlastTools);
    // Learning Weather Map
    registry.registerModule(weatherMapTools);
    // Audio Experience Platform
    registry.registerModule(audioTools);
    _registry = registry;
  }
  return _registry;
}

/**
 * Reset the registry (for testing).
 */
export function resetToolRegistry(): void {
  _registry = null;
}
