/**
 * data-desk-elevation-service.ts
 *
 * Framing-aware analysis prompts for all 4 elevated Data Desk tools.
 * The key innovation: the same data produces different analysis based on
 * the user's framing choice ("understand" vs "support argument" vs "find flaws").
 */

import type { DataDeskPreflight } from './data-desk-preflight'

// ── Types ──────────────────────────────────────────────────────────────────

export type DataDeskSlug = 'chart-explainer' | 'survey-analyzer' | 'report-summarizer' | 'presentation-outliner'

export type AnalysisFraming =
  | 'understand'
  | 'support-argument'
  | 'find-flaws'
  | 'teach'
  | 'summary'
  | 'hypothesis'
  | 'surprises'
  | 'recommendations'
  | 'key-data'
  | 'gaps-limitations'
  | null

export interface DataDeskInterviewState {
  phase: string
  framing: AnalysisFraming
  hypothesis: string | null
  position: string | null
  additionalContext: string | null
}

export interface DataDeskGenerateRequest {
  toolSlug: DataDeskSlug
  preflight: DataDeskPreflight
  interviewState: DataDeskInterviewState | null
  rawInput?: string
}

export interface DataDeskInterviewRequest {
  toolSlug: DataDeskSlug
  messages: { role: 'user' | 'assistant'; content: string }[]
  preflight: DataDeskPreflight
  interviewState: DataDeskInterviewState
}

// ── Framing-dependent section headers ──────────────────────────────────────

const CHART_SECTIONS: Record<string, string[]> = {
  understand: ['What This Chart Shows', 'Key Takeaways', 'Context & Caveats', 'Discussion Questions'],
  'support-argument': ['What This Chart Shows', 'Evidence Strength', 'Counter-Evidence to Consider', 'How to Cite This'],
  'find-flaws': ['Chart Description', 'Statistical Concerns', 'Missing Context', 'How to Fix It'],
  teach: ['Chart Description', 'Key Concepts Illustrated', 'Teaching Points', 'Discussion Prompts'],
}

const SURVEY_SECTIONS: Record<string, string[]> = {
  summary: ['Response Summary', 'Key Findings', 'Notable Patterns', 'Recommendations'],
  hypothesis: ['Hypothesis Statement', 'Supporting Evidence', 'Contradicting Evidence', 'Conclusion & Confidence'],
  surprises: ['Expected Patterns', 'Unexpected Findings', 'Outliers & Anomalies', 'Follow-up Questions'],
  recommendations: ['Situation Summary', 'Key Issues', 'Prioritized Recommendations', 'Implementation Plan'],
}

const REPORT_SECTIONS: Record<string, string[]> = {
  summary: ['Executive Summary', 'Key Metrics', 'Action Items', 'Risks & Concerns'],
  'key-data': ['Document Overview', 'Critical Data Points', 'Trends & Comparisons', 'Data Gaps'],
  'support-argument': ['Document Overview', 'Supporting Evidence', 'Contradicting Evidence', 'Strength Assessment'],
  'gaps-limitations': ['Document Overview', 'Methodology Issues', 'Missing Data', 'Recommendations for Improvement'],
}

export function getSectionsForFraming(slug: DataDeskSlug, framing: AnalysisFraming): string[] {
  switch (slug) {
    case 'chart-explainer':
      return CHART_SECTIONS[framing ?? 'understand'] ?? CHART_SECTIONS.understand
    case 'survey-analyzer':
      return SURVEY_SECTIONS[framing ?? 'summary'] ?? SURVEY_SECTIONS.summary
    case 'report-summarizer':
      return REPORT_SECTIONS[framing ?? 'summary'] ?? REPORT_SECTIONS.summary
    case 'presentation-outliner':
      return ['Slide Outline']
    default:
      return ['Analysis']
  }
}

// ── Context builder ────────────────────────────────────────────────────────

function buildContext(pf: DataDeskPreflight): string {
  const parts: string[] = []
  parts.push(`User: ${pf.user.name} (${pf.user.role})`)
  if (pf.user.department) parts.push(`Department: ${pf.user.department}`)
  if (pf.courses.length > 0) parts.push(`Courses: ${pf.courses.map((c) => c.code).join(', ')}`)
  if (pf.interests.length > 0) parts.push(`Interests: ${pf.interests.join(', ')}`)
  return parts.join('\n')
}

// ── Generation prompts ─────────────────────────────────────────────────────

export function getGeneratePrompt(req: DataDeskGenerateRequest): string {
  const sections = getSectionsForFraming(req.toolSlug, req.interviewState?.framing ?? null)
  const framing = req.interviewState?.framing ?? null
  const hypothesis = req.interviewState?.hypothesis
  const position = req.interviewState?.position

  const sectionHeaders = sections.map((s) => `## ${s}\n(content here)`).join('\n\n')

  const framingDirective = getFramingDirective(req.toolSlug, framing, hypothesis ?? null, position ?? null)

  if (req.toolSlug === 'presentation-outliner') {
    return `Create a structured slide deck outline.

${buildContext(req.preflight)}

${req.interviewState?.additionalContext ? `Additional context: ${req.interviewState.additionalContext}` : ''}

Format each slide as:
### Slide N: [Title]
- Bullet point 1
- Bullet point 2
- Bullet point 3

**Speaker Notes:** [2-3 sentences]

Include an appropriate number of slides. Each slide should have 3-5 bullet points and speaker notes.
Output ONLY the outline under a ## Slide Outline header. No preamble.`
  }

  return `Analyze the provided data. ${framingDirective}

Organize your response under these exact Markdown section headers:

${sectionHeaders}

${buildContext(req.preflight)}

Rules:
- Be specific — reference actual numbers, labels, and data points from the input
- Each section should have 3-5 substantive bullet points or 2-3 paragraphs
- ${framing === 'support-argument' && position ? `Evaluate whether the data supports this position: "${position}"` : ''}
- ${framing === 'hypothesis' && hypothesis ? `Test this hypothesis: "${hypothesis}"` : ''}
- Output ONLY the analysis with the section headers. No preamble.`
}

function getFramingDirective(
  slug: DataDeskSlug,
  framing: AnalysisFraming,
  hypothesis: string | null,
  position: string | null,
): string {
  if (slug === 'chart-explainer') {
    switch (framing) {
      case 'understand': return 'Explain this chart in plain English for someone seeing it for the first time.'
      case 'support-argument': return `Evaluate whether this chart supports the argument: "${position ?? 'not specified'}". Be balanced — note both supporting and contradicting evidence.`
      case 'find-flaws': return 'Critically analyze this chart for statistical integrity issues, misleading presentation, missing context, and potential misinterpretations.'
      case 'teach': return 'Analyze this chart from a teaching perspective. Identify key concepts it illustrates and generate discussion prompts for a classroom setting.'
      default: return 'Provide a comprehensive plain-English analysis.'
    }
  }
  if (slug === 'survey-analyzer') {
    switch (framing) {
      case 'hypothesis': return `Test the following hypothesis against the data: "${hypothesis ?? 'not specified'}". Present supporting and contradicting evidence separately.`
      case 'surprises': return 'Focus on unexpected findings, outliers, and patterns that deviate from typical expectations.'
      case 'recommendations': return 'Focus on actionable recommendations. Prioritize by impact and feasibility.'
      default: return 'Provide a comprehensive summary with key findings and patterns.'
    }
  }
  if (slug === 'report-summarizer') {
    switch (framing) {
      case 'key-data': return 'Focus on extracting the most critical data points, statistics, and metrics from this document.'
      case 'support-argument': return `Evaluate whether this document supports the position: "${position ?? 'not specified'}". Extract both supporting and contradicting evidence.`
      case 'gaps-limitations': return 'Focus on identifying methodology issues, missing data, limitations, and areas for improvement in this document.'
      default: return 'Provide a concise executive summary with key metrics and action items.'
    }
  }
  return 'Provide a comprehensive analysis.'
}

// ── Interview prompts ──────────────────────────────────────────────────────

const FRAMING_CHIPS: Record<DataDeskSlug, string[]> = {
  'chart-explainer': ['Help me understand it', 'Does it support my argument?', 'Find flaws or bias', 'Explain it to my class'],
  'survey-analyzer': ['Overall summary', 'Test a hypothesis', 'Find surprising patterns', 'Recommendations for action'],
  'report-summarizer': ['Executive summary', 'Extract key data points', 'Arguments for/against my position', 'Identify gaps & limitations'],
  'presentation-outliner': ['Class presentation', 'Research findings', 'Project proposal', 'Club/org pitch', 'Other...'],
}

export function getFramingChips(slug: DataDeskSlug): string[] {
  return FRAMING_CHIPS[slug] ?? ['Analyze it', 'Summarize it', 'Find patterns']
}

export function getInterviewPrompt(req: DataDeskInterviewRequest): string {
  const firstName = req.preflight.user.name.split(' ')[0]

  return `You are Sandy, the AI concierge at the University of Kentucky.
You're helping ${firstName} analyze data they've provided using the ${req.toolSlug.replace(/-/g, ' ')} tool.

## Your Personality
- Sharp analytical mind, concise delivery. Like a great TA who sees patterns fast.
- Reference specific elements from their data when possible.
- 2-3 sentences max per message, then ONE question if needed.

## What You Know
${buildContext(req.preflight)}

## Interview State
Phase: ${req.interviewState.phase}
Framing: ${req.interviewState.framing ?? 'not yet selected'}
${req.interviewState.hypothesis ? `Hypothesis: ${req.interviewState.hypothesis}` : ''}
${req.interviewState.position ? `Position: ${req.interviewState.position}` : ''}

## Rules
- After the user provides data and selects a framing, you typically need 0-1 more questions.
- For "hypothesis" framing: ask "What's your hypothesis?" if not already provided.
- For "support-argument" framing: ask "What's your position?" if not already provided.
- For everything else: go straight to generation with no additional questions.
- Every message MUST include chips: <!--CHIPS:["a","b","c"]-->
- Every message MUST include phase: <!--PHASE:...-->
- When analysis is ready, emit <!--PHASE:generate-->
- Never reproduce the full analysis in chat — the left panel handles that.
- Quote specific findings when commenting on results.`
}

// ── Chip/phase extraction ──────────────────────────────────────────────────

const CHIPS_REGEX = /<!--CHIPS:(\[.*?\])-->/
const PHASE_REGEX = /<!--PHASE:(\w[\w-]*)-->/

export function extractChips(text: string): string[] {
  const match = CHIPS_REGEX.exec(text)
  if (!match) return []
  try { return JSON.parse(match[1]) as string[] } catch { return [] }
}

export function extractPhase(text: string): string | null {
  const match = PHASE_REGEX.exec(text)
  return match ? match[1] : null
}
