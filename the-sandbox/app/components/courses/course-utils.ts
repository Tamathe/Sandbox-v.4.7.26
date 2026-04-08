// Shared utilities and constants for the Course Hub

export const TYPE_COLORS: Record<string, string> = {
  lecture: 'bg-blue-100 text-blue-700',
  assignment: 'bg-orange-100 text-orange-700',
  reading: 'bg-purple-100 text-purple-700',
  case: 'bg-amber-100 text-amber-700',
  rubric: 'bg-red-100 text-red-700',
  syllabus: 'bg-green-100 text-green-700',
  quiz: 'bg-indigo-100 text-indigo-700',
}

export const TOOL_TYPE_COLORS: Record<string, string> = {
  CHATBOT: 'bg-violet-100 text-violet-700',
  STUDY_BUDDY: 'bg-cyan-100 text-cyan-700',
  SIMULATION: 'bg-orange-100 text-orange-700',
  QUIZ: 'bg-indigo-100 text-indigo-700',
  DEBATE: 'bg-rose-100 text-rose-700',
  AI_INTERVIEW: 'bg-emerald-100 text-emerald-700',
  EXTERNAL: 'bg-gray-100 text-gray-700',
}

export const ROLE_BADGE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  EDUCATOR: 'bg-blue-100 text-blue-700',
  STUDENT: 'bg-green-100 text-green-700',
}

export const MATERIAL_TYPES = ['lecture', 'assignment', 'reading', 'case', 'rubric', 'syllabus', 'quiz']

export function getModuleKey(moduleNumber: number | null) {
  return moduleNumber ? `Module ${moduleNumber}` : 'General'
}

export function parseModuleNumber(moduleKey: string) {
  const match = moduleKey.match(/^Module\s+(\d+)$/)
  return match ? Number.parseInt(match[1], 10) : null
}

export function sortModuleKeys(keys: string[]) {
  return [...keys].sort((left, right) => {
    if (left === 'General') return 1
    if (right === 'General') return -1
    return (parseModuleNumber(left) ?? 0) - (parseModuleNumber(right) ?? 0)
  })
}

export function formatToolType(toolType: string) {
  return toolType.replace(/_/g, ' ')
}

export function materialPreview(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 140) return normalized
  return `${normalized.slice(0, 137)}...`
}

export function buildSuggestionHref(
  courseCode: string,
  suggestion: { title: string; toolType: string },
  moduleKey: string
) {
  const params = new URLSearchParams({
    course: courseCode,
    toolName: suggestion.title,
    toolType: suggestion.toolType,
  })
  const moduleNumber = parseModuleNumber(moduleKey)
  if (moduleNumber) params.set('moduleNumber', String(moduleNumber))
  return `/builder?${params.toString()}`
}

export function courseHeaders(email: string, includeJson = false) {
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    'x-demo-user-email': email,
  }
}

export async function readJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : 'Request failed'
    throw new Error(message)
  }
  return payload as T
}
