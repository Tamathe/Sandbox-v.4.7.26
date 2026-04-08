import type { AgentCategory, UserRole } from '../../generated/prisma'

/**
 * Tools that only INSTITUTIONAL agent profiles can use.
 * These are high-impact write actions that require admin governance.
 */
export const SYSTEM_ONLY_TOOLS = new Set([
  'post_announcement',
  'submit_grades_to_sis',
  'send_announcement',
  'update_department_website',
])

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
])

export const DEFAULT_MAX_ACTIONS = 10
export const ABSOLUTE_MAX_ACTIONS = 25

export const AGENT_CATEGORIES: AgentCategory[] = [
  'GENERAL',
  'STUDY',
  'PRODUCTIVITY',
  'ANALYSIS',
  'COMMUNICATION',
  'COACHING',
  'MONITORING',
  'CREATIVE',
]

export const AGENT_ROLE_OPTIONS: UserRole[] = ['EDUCATOR', 'STUDENT', 'ADMIN', 'REGISTRAR', 'STAFF']

export const AGENT_ICON_OPTIONS = [
  'Bot',
  'Brain',
  'BookOpen',
  'Briefcase',
  'Compass',
  'GraduationCap',
  'MessageSquare',
  'ShieldAlert',
  'Sparkles',
] as const
