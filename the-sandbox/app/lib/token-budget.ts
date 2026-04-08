/**
 * Token Budget Monitor — estimates system prompt token count and trims
 * low-priority sections when the prompt exceeds a configurable budget.
 *
 * Heuristic: ~4 chars per token for English text (conservative).
 */

/** Section priority — higher number = more important (trimmed last). */
const SECTION_PRIORITY: Record<string, number> = {
  // Core identity + page
  'CURRENT USER': 100,
  'CURRENT PAGE': 95,
  'SELECTED COURSE': 95,
  'YOUR ROLE ON THIS PAGE': 95,
  'AVAILABLE TOOLS': 90,
  'COURSE MATERIALS': 85,
  'PLATFORM NAVIGATION': 85,
  'HOW TO INCLUDE ACTIONS': 85,
  'CITING COURSE MATERIALS': 85,

  // High-value dynamic context
  'THIS STUDENT\'S CURRENT STATUS': 80,
  'CONVERSATION MEMORY': 75,
  'TOOL DETAIL CONTEXT': 75,
  'MESSAGES CONTEXT': 70,
  'PROACTIVE SUGGESTIONS': 70,
  'ON-DEMAND BRIEFING': 70,
  'MORNING BRIEFING CONTEXT': 70,
  'THIS WEEK IN YOUR COURSES': 65,
  'PERSONAL ASSISTANT': 65,

  // Page-specific context (valuable when on that page)
  'PAGE CONTEXT: FACULTY ANALYTICS': 60,
  'PAGE CONTEXT: MY PROGRESS': 60,
  'PAGE CONTEXT: AI LITERACY HUB': 60,
  'PAGE CONTEXT: AI LITERACY MODULE': 60,
  'PAGE CONTEXT: CAMPUS MAP': 60,
  'PAGE CONTEXT: CAMPUS LIFE (BBNvolved)': 60,
  'PAGE CONTEXT: COMMUNITY PULSE': 60,
  'PAGE CONTEXT: ACADEMIC PATHFINDER': 60,
  'PAGE CONTEXT: POLICY NAVIGATOR': 60,
  'PAGE CONTEXT: COMMUNICATIONS CENTER': 60,
  'PAGE CONTEXT: COMMITTEE HUB': 60,
  'PAGE CONTEXT: SURVEY INTELLIGENCE': 60,
  'PAGE CONTEXT: UNIVERSITY SYSTEMS HUB': 60,
  'PAGE CONTEXT: NOTEBOOK': 60,
  'PAGE CONTEXT: UKNOW CAMPUS NEWS': 60,
  'REGISTRAR CONTEXT': 60,
  'DEPARTMENT STOREFRONT CONTEXT': 60,

  // Intelligence enrichment
  'STUDENT SUPPORT — LAST SESSION SIGNALS': 55,
  'LEARNING DEPTH ALERT — ACTION RECOMMENDED': 55,
  'UNIVERSITY SYSTEMS': 55,
  'COURSE POLICIES': 55,
  'SPACED REPETITION NUDGE — SURFACE THIS NATURALLY': 50,
  'WEEKLY PROGRESS AWARENESS': 45,
  'STUDY PLAN AWARENESS': 45,
  'EXAM FORGE NUDGE — SURFACE THIS NATURALLY': 40,
  'POLICY AWARENESS NUDGE': 40,
  'WORKSHOP & RESEARCH TOOLS (faculty-only)': 35,

  // Low-priority enrichment (nice-to-have)
  'EPISODIC MEMORY': 30,
  'LEARNING MODALITY': 30,
  'RECENT LEARNING EVENTS': 25,
  'COMMUNITY TOOL REQUESTS': 25,
  'YOUR UKNOW ALERTS': 20,
  'UK NEWS CONTEXT': 20,
  'LIVE ROOM SUGGESTIONS': 20,
}

/** Default priority for sections not in the map. */
const DEFAULT_PRIORITY = 35

/**
 * Fast token estimate — 1 token ≈ 4 chars for English text.
 * Conservative: real tokenizers typically yield fewer tokens.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

interface TrimResult {
  prompt: string
  trimmed: boolean
  estimatedTokens: number
  sectionsDropped: string[]
}

/**
 * If prompt exceeds `budgetTokens`, remove lowest-priority `## SECTION`
 * blocks until it fits. Returns the (possibly trimmed) prompt and metadata.
 */
export function trimPromptToBudget(prompt: string, budgetTokens: number): TrimResult {
  const estimated = estimateTokens(prompt)
  if (estimated <= budgetTokens) {
    return { prompt, trimmed: false, estimatedTokens: estimated, sectionsDropped: [] }
  }

  const sections = parseSections(prompt)

  // Sort ascending by priority — lowest priority trimmed first
  const removable = [...sections].sort(
    (a, b) => (SECTION_PRIORITY[a.name] ?? DEFAULT_PRIORITY) - (SECTION_PRIORITY[b.name] ?? DEFAULT_PRIORITY),
  )

  const sectionsDropped: string[] = []
  let currentText = prompt

  for (const section of removable) {
    if (estimateTokens(currentText) <= budgetTokens) break
    currentText = currentText.replace(section.fullText, '')
    sectionsDropped.push(section.name)
  }

  return {
    prompt: currentText,
    trimmed: true,
    estimatedTokens: estimateTokens(currentText),
    sectionsDropped,
  }
}

/** Parse `## HEADER` sections from the prompt text. */
function parseSections(text: string): { name: string; fullText: string }[] {
  const sections: { name: string; fullText: string }[] = []
  // Match ## headings and capture everything until the next ## or end of string
  const regex = /\n\n## ([^\n]+)\n/g
  let match: RegExpExecArray | null
  const positions: { name: string; start: number }[] = []

  while ((match = regex.exec(text)) !== null) {
    positions.push({ name: match[1], start: match.index })
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].start
    const end = i + 1 < positions.length ? positions[i + 1].start : text.length
    sections.push({
      name: positions[i].name,
      fullText: text.slice(start, end),
    })
  }

  return sections
}
