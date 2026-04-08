/**
 * linkedin-optimizer-service.ts
 *
 * System prompts, section parsing, and generation logic for the
 * elevated LinkedIn Optimizer.
 */

import type { LinkedInPreflight } from './linkedin-optimizer-preflight'

// ── Types ──────────────────────────────────────────────────────────────────

export type LinkedInSectionId = 'headline' | 'about' | 'experience-bullets' | 'skills'

export interface LinkedInInterviewState {
  phase: 'instant-draft' | 'target-role' | 'differentiator' | 'experience-highlight' | 'tone' | 'polish'
  targetRole: string | null
  differentiator: string | null
  leadExperience: string | null
  tone: string | null
}

export interface LinkedInGenerateRequest {
  mode: 'instant-draft' | 'section-update' | 'full-polish'
  preflight: LinkedInPreflight
  existingContent: Record<LinkedInSectionId, string> | null
  interviewState: LinkedInInterviewState | null
  targetSection: LinkedInSectionId | null
}

export interface LinkedInInterviewRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  preflight: LinkedInPreflight
  interviewState: LinkedInInterviewState
}

export interface LinkedInRefineRequest {
  currentContent: Record<LinkedInSectionId, string>
  targetSection: LinkedInSectionId
  instruction: string
  preflight: LinkedInPreflight
  interviewState: LinkedInInterviewState
}

// ── Preflight context builder ──────────────────────────────────────────────

function buildPreflightContext(pf: LinkedInPreflight): string {
  const parts: string[] = []

  parts.push(`Name: ${pf.user.name}`)
  parts.push(`Role: ${pf.user.role}`)
  if (pf.user.department) parts.push(`Department: ${pf.user.department}`)
  if (pf.user.college) parts.push(`College: ${pf.user.college}`)
  if (pf.user.bio) parts.push(`Bio: ${pf.user.bio}`)

  if (pf.memories.goals.length > 0) parts.push(`Goals: ${pf.memories.goals.join('; ')}`)
  if (pf.memories.strengths.length > 0) parts.push(`Strengths: ${pf.memories.strengths.join('; ')}`)
  if (pf.memories.identity.length > 0) parts.push(`Identity: ${pf.memories.identity.join('; ')}`)
  if (pf.interests.length > 0) parts.push(`Interests: ${pf.interests.join(', ')}`)

  if (pf.courses.length > 0) {
    parts.push(`Courses: ${pf.courses.map((c) => `${c.code} ${c.title}`).join(', ')}`)
  }

  if (pf.portfolio.experiences.length > 0) {
    const exps = pf.portfolio.experiences
      .map((e) => `${e.title}${e.organization ? ` at ${e.organization}` : ''}${e.description ? `: ${e.description.slice(0, 100)}` : ''}`)
      .join('\n- ')
    parts.push(`Experience:\n- ${exps}`)
  }

  if (pf.portfolio.projects.length > 0) {
    parts.push(`Projects: ${pf.portfolio.projects.map((p) => p.title).join(', ')}`)
  }

  if (pf.portfolio.publications.length > 0) {
    parts.push(`Publications: ${pf.portfolio.publications.map((p) => p.title).join(', ')}`)
  }

  if (pf.portfolio.certifications.length > 0) {
    parts.push(`Certifications: ${pf.portfolio.certifications.map((c) => c.title).join(', ')}`)
  }

  if (pf.derivedKeywords.length > 0) {
    parts.push(`Top keywords: ${pf.derivedKeywords.join(', ')}`)
  }

  if (pf.topConcepts.length > 0) {
    parts.push(`Top concepts this week: ${pf.topConcepts.join(', ')}`)
  }

  return parts.join('\n')
}

// ── System prompts ─────────────────────────────────────────────────────────

export function getInstantDraftPrompt(pf: LinkedInPreflight): string {
  return `Generate a complete LinkedIn profile optimization with 4 sections.
Use the user's data below — do NOT ask questions, do NOT include preamble.

User data:
---
${buildPreflightContext(pf)}
---

Output format — use exactly these headers:
## Headline
(max 220 characters, keyword-optimized for ${pf.derivedKeywords.slice(0, 3).join(', ') || pf.user.department || 'their field'})

## About
(max 2600 characters, first-person, professional narrative with hook in first line)

## Experience Bullets
(STAR method, 3-5 bullets per role, newest first. Format: ### Role — Organization\\n- bullet)

## Skills to Add
(Format: 📌 **Pin these 3:** top3\\n**Add these:** next 10\\n**Consider:** stretch skills)

Rules:
- Headline: front-load target keywords, include affiliation, ${pf.user.role === 'STUDENT' ? 'include graduation year' : 'include research focus'}
- About: hook in first line (<120 chars before fold), 3-5 keyword injections, short paragraphs
- Experience: strong action verbs, quantify results, STAR format
- Skills: ranked by relevance
- No emojis in Headline or About (except Skills pin emoji)
- ${pf.user.role === 'STUDENT' ? 'Frame coursework and projects as professional experience' : 'Emphasize research impact and teaching innovation'}
- Output ONLY the sections. No preamble.`
}

export function getSectionUpdatePrompt(
  pf: LinkedInPreflight,
  state: LinkedInInterviewState,
  section: LinkedInSectionId,
  currentContent: string,
): string {
  const targetInfo = state.targetRole ? `Target role: ${state.targetRole}` : ''
  const diffInfo = state.differentiator ? `Differentiator: ${state.differentiator}` : ''
  const leadInfo = state.leadExperience ? `Lead experience: ${state.leadExperience}` : ''
  const toneInfo = state.tone ? `Tone: ${state.tone}` : ''

  const sectionRules: Record<LinkedInSectionId, string> = {
    headline: `Rewrite the LinkedIn headline. Max 220 characters. Front-load target role keywords. ${pf.user.role === 'STUDENT' ? 'Include graduation year.' : 'Include research focus.'}`,
    about: `Rewrite the LinkedIn About section. Max 2600 characters. First-person. Hook in first line (<120 chars). Inject 3-5 keywords naturally. Short paragraphs.`,
    'experience-bullets': `Rewrite experience bullets. STAR format. Strong action verbs. Quantify results. 3-5 bullets per role. ${state.leadExperience ? `Put "${state.leadExperience}" first with the strongest bullets.` : ''}`,
    skills: `Rewrite the skills section. Top 3 marked as "pin these." Ranked by relevance to ${state.targetRole ?? 'their field'}. Include both specific and broad terms.`,
  }

  return `Rewrite ONLY the "${section}" section of a LinkedIn profile.

Current content:
---
${currentContent}
---

User data:
---
${buildPreflightContext(pf)}
---

Interview context:
${[targetInfo, diffInfo, leadInfo, toneInfo].filter(Boolean).join('\n')}

Instructions:
${sectionRules[section]}

Output ONLY the section content. No ## header, no preamble.${section === 'headline' ? ' Must be under 220 characters.' : ''}`
}

export function getRefinePrompt(req: LinkedInRefineRequest): { system: string; user: string } {
  return {
    system: `You are refining a specific LinkedIn profile section based on the user's instruction.

Current "${req.targetSection}" content:
---
${req.currentContent[req.targetSection]}
---

User profile context:
${buildPreflightContext(req.preflight)}

Target role: ${req.interviewState.targetRole ?? 'not specified'}

Rules:
- Apply the user's instruction precisely
- Preserve content the user didn't ask to change
- ${req.targetSection === 'headline' ? 'Must be under 220 characters.' : req.targetSection === 'about' ? 'Must be under 2600 characters.' : ''}
- Output ONLY the refined section content. No header, no preamble.`,
    user: `User's instruction: "${req.instruction}"`,
  }
}

export function getInterviewSystemPrompt(
  pf: LinkedInPreflight,
  state: LinkedInInterviewState,
): string {
  const firstName = pf.user.name.split(' ')[0]
  return `You are Sandy, the AI concierge at the University of Kentucky.
You're helping ${firstName} optimize their LinkedIn profile for maximum professional impact and search visibility.

## Your Personality
- Career coach who understands LinkedIn's algorithm.
- Be specific: "Move 'Python' before 'Programming' — recruiters search for specific languages."
- Celebrate what's strong before suggesting changes.
- 2-4 sentences max per turn.

## What You Know
${buildPreflightContext(pf)}

## Interview State
Target role: ${state.targetRole ?? 'not yet specified'}
Differentiator: ${state.differentiator ?? 'not yet specified'}
Lead experience: ${state.leadExperience ?? 'not yet specified'}
Tone: ${state.tone ?? 'not yet specified'}
Phase: ${state.phase}

## Rules
- Every message MUST include chips: <!--CHIPS:["chip1","chip2","chip3"]-->
- Every message MUST include phase: <!--PHASE:${state.phase}-->
- Always include an escape hatch chip.
- Never reproduce full section content in chat — the left panel handles that.
- Never ask for info visible in the preflight data.
- Keep it concise — LinkedIn optimization is iterative.`
}

// ── Section parsing (reuses the ## delimiter pattern) ──────────────────────

export interface ParsedLinkedInSection {
  id: LinkedInSectionId
  content: string
}

const SECTION_MAP: Record<string, LinkedInSectionId> = {
  headline: 'headline',
  about: 'about',
  'experience bullets': 'experience-bullets',
  'skills to add': 'skills',
  skills: 'skills',
}

export function parseLinkedInSections(text: string): ParsedLinkedInSection[] {
  const sections: ParsedLinkedInSection[] = []
  const parts = text.split(/^## /m).filter((s) => s.trim())

  for (const part of parts) {
    const nlIndex = part.indexOf('\n')
    const header = (nlIndex > -1 ? part.slice(0, nlIndex) : part).trim().toLowerCase()
    const content = nlIndex > -1 ? part.slice(nlIndex + 1).trim() : ''
    const id = SECTION_MAP[header]
    if (id) sections.push({ id, content })
  }

  return sections
}

export function sectionsToRecord(sections: ParsedLinkedInSection[]): Record<LinkedInSectionId, string> {
  const record: Record<LinkedInSectionId, string> = {
    headline: '',
    about: '',
    'experience-bullets': '',
    skills: '',
  }
  for (const s of sections) {
    record[s.id] = s.content
  }
  return record
}

// ── Chip/phase extraction ──────────────────────────────────────────────────

const CHIPS_REGEX = /<!--CHIPS:(\[.*?\])-->/
const PHASE_REGEX = /<!--PHASE:(\w[\w-]*)-->/

export function extractChips(text: string): string[] {
  const match = CHIPS_REGEX.exec(text)
  if (!match) return []
  try {
    return JSON.parse(match[1]) as string[]
  } catch {
    return []
  }
}

export function extractPhase(text: string): string | null {
  const match = PHASE_REGEX.exec(text)
  return match ? match[1] : null
}

// ── Character limits ───────────────────────────────────────────────────────

export const SECTION_CHAR_LIMITS: Partial<Record<LinkedInSectionId, number>> = {
  headline: 220,
  about: 2600,
}
