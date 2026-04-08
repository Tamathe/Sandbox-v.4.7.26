/**
 * cover-letter-service.ts
 *
 * System prompts, message builders, and section parsing for the
 * elevated Cover Letter Generator.
 */

import type { CoverLetterPreflight } from './cover-letter-preflight'

// ── Types ──────────────────────────────────────────────────────────────────

export type GenerateMode = 'instant-draft' | 'section-update' | 'full-regeneration'
export type LetterSectionId = 'opening' | 'body1' | 'body2' | 'closing'

export interface InterviewState {
  phase: 'instant-draft' | 'awaiting-target' | 'awaiting-angle' | 'awaiting-tone' | 'refinement'
  target: {
    jobPosting: string | null
    roleName: string | null
    companyName: string | null
    companyType: string | null
    keyRequirements: string[]
  } | null
  angle: string | null
  tone: 'confident' | 'warm' | 'scholarly' | 'match-company' | 'auto' | null
  questionsAsked: number
}

export interface GenerateRequest {
  mode: GenerateMode
  preflight: CoverLetterPreflight
  interviewState: InterviewState | null
  targetSection?: LetterSectionId
}

export interface InterviewRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  preflight: CoverLetterPreflight
  interviewState: InterviewState
}

export interface RefineRequest {
  currentLetter: string
  targetSection: LetterSectionId | 'full'
  instruction: string
  preflight: CoverLetterPreflight
}

// ── Preflight → prompt context ─────────────────────────────────────────────

function buildPreflightContext(pf: CoverLetterPreflight): string {
  const parts: string[] = []

  parts.push(`Name: ${pf.user.name}`)
  if (pf.user.department) parts.push(`Department: ${pf.user.department}`)
  if (pf.user.college) parts.push(`College: ${pf.user.college}`)
  if (pf.user.bio) parts.push(`Bio: ${pf.user.bio}`)

  if (pf.goals.length > 0) parts.push(`Career goals: ${pf.goals.join('; ')}`)
  if (pf.strengths.length > 0) parts.push(`Strengths: ${pf.strengths.join('; ')}`)
  if (pf.interests.length > 0) parts.push(`Interests: ${pf.interests.join(', ')}`)

  if (pf.courses.length > 0) {
    parts.push(`Courses: ${pf.courses.map((c) => `${c.code} ${c.title}`).join(', ')}`)
  }

  if (pf.portfolio.experiences.length > 0) {
    const exps = pf.portfolio.experiences
      .map((e) => `${e.title}${e.organization ? ` at ${e.organization}` : ''}`)
      .join('; ')
    parts.push(`Experience: ${exps}`)
  }

  if (pf.portfolio.projects.length > 0) {
    const projs = pf.portfolio.projects.map((p) => p.title).join('; ')
    parts.push(`Projects: ${projs}`)
  }

  if (pf.researchSessions.length > 0) {
    parts.push(`Research: ${pf.researchSessions.map((r) => r.title).join('; ')}`)
  }

  if (pf.topConcepts.length > 0) {
    parts.push(`Top concepts this week: ${pf.topConcepts.join(', ')}`)
  }

  return parts.join('\n')
}

// ── System prompts ─────────────────────────────────────────────────────────

export function getInstantDraftPrompt(pf: CoverLetterPreflight): string {
  return `You are a professional cover letter writer. Generate a general-purpose cover letter for a student based on the profile data below. This is a STARTER draft — the student has not yet specified a target role.

## Student Profile
${buildPreflightContext(pf)}

## Rules
- Write 3-4 paragraphs: greeting, body (2 paragraphs highlighting strengths + experience), closing with sign-off
- Use "Dear Hiring Manager," as the greeting
- Reference specific experiences, courses, and skills from the profile by name
- Sign off with "${pf.user.name}"
- Mark sections with HTML comments: <!-- SECTION:opening -->, <!-- SECTION:body1 -->, <!-- SECTION:body2 -->, <!-- SECTION:closing -->
- Place each section marker on its own line BEFORE the paragraph it labels
- Output ONLY the letter. No preamble, no meta-commentary.`
}

export function getFullRegenerationPrompt(
  pf: CoverLetterPreflight,
  state: InterviewState,
): string {
  const targetInfo = state.target
    ? [
        state.target.roleName && `Target role: ${state.target.roleName}`,
        state.target.companyName && `Company: ${state.target.companyName}`,
        state.target.companyType && `Company type: ${state.target.companyType}`,
        state.target.keyRequirements.length > 0 &&
          `Key requirements: ${state.target.keyRequirements.join(', ')}`,
        state.target.jobPosting && `\nJob posting:\n${state.target.jobPosting.slice(0, 2000)}`,
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  const toneDirective =
    state.tone === 'confident'
      ? 'Write with confident, direct energy. Strong action verbs, clear claims.'
      : state.tone === 'warm'
        ? 'Write with warm, enthusiastic energy. Show genuine excitement for the role.'
        : state.tone === 'scholarly'
          ? 'Write with precise, scholarly energy. Evidence-based, measured claims.'
          : state.tone === 'match-company'
            ? 'Match the tone to the company culture described in the job posting.'
            : 'Choose the most appropriate tone for this role and company.'

  return `You are a professional cover letter writer. Generate a tailored cover letter.

## Student Profile
${buildPreflightContext(pf)}

## Target
${targetInfo}

## Angle
${state.angle ?? 'Choose the strongest angle from the student profile.'}

## Tone
${toneDirective}

## Rules
- Write 3-4 paragraphs: personalized greeting, body (2 paragraphs), strong closing
- Every sentence must connect to either the job posting or the student's specific experience — no generic filler
- Use the student's chosen angle as the throughline
- Sign off with "${pf.user.name}"
- Mark sections: <!-- SECTION:opening -->, <!-- SECTION:body1 -->, <!-- SECTION:body2 -->, <!-- SECTION:closing -->
- Place each section marker on its own line BEFORE the paragraph it labels
- Output ONLY the letter.`
}

export function getSectionUpdatePrompt(
  pf: CoverLetterPreflight,
  state: InterviewState,
  section: LetterSectionId,
  currentLetter: string,
): string {
  return `You are rewriting ONE section of an existing cover letter. Output ONLY the replacement paragraph for the "${section}" section.

## Current full letter
${currentLetter}

## Student Profile
${buildPreflightContext(pf)}

## Target
${state.target?.roleName ? `Role: ${state.target.roleName}` : 'Not yet specified'}
${state.target?.companyName ? `Company: ${state.target.companyName}` : ''}
${state.target?.keyRequirements.length ? `Requirements: ${state.target.keyRequirements.join(', ')}` : ''}

## Angle
${state.angle ?? 'Not yet specified'}

## Instructions
Rewrite ONLY the "${section}" section. Keep all other sections unchanged. Do NOT include the <!-- SECTION: --> markers in your output — just the paragraph text.
Output ONLY the replacement paragraph.`
}

export function getRefinePrompt(req: RefineRequest): string {
  return `You are making a targeted edit to a cover letter section.

## Current letter
${req.currentLetter}

## User's instruction
"${req.instruction}"

## Target section
${req.targetSection === 'full' ? 'The entire letter' : `The "${req.targetSection}" section only`}

## Rules
- If targeting a specific section, output ONLY that paragraph's replacement text
- If targeting "full", output the complete letter with section markers
- Preserve the content that the user didn't ask to change
- Output ONLY the text. No preamble.`
}

// ── Sandy interview prompt ─────────────────────────────────────────────────

export function getInterviewSystemPrompt(pf: CoverLetterPreflight, state: InterviewState): string {
  return `You are Sandy, the AI concierge at the University of Kentucky.
You're helping a student write a cover letter through a guided interview.

## Your Personality
- Warm but efficient. You're a career counselor who respects the student's time.
- Use their first name (${pf.user.name.split(' ')[0]}). Never say "Great question!" or other filler.
- Be specific: reference their actual experiences, courses, and skills by name.
- If they seem stuck, offer a concrete suggestion — don't just ask again.

## What You Know About This Student
${buildPreflightContext(pf)}

## Interview Protocol
You are in a structured interview. Current phase: ${state.phase}
Your job is to extract:
1. TARGET: What role/program they're applying to (${state.target?.roleName ? 'COLLECTED: ' + state.target.roleName : 'needed'})
2. ANGLE: Their unique value proposition (${state.angle ? 'COLLECTED: ' + state.angle : 'needed'})
3. TONE: The emotional register (${state.tone ? 'COLLECTED: ' + state.tone : 'needed, has default'})

## Rules
- Never ask for information the preflight already provides (name, school, courses, etc.)
- If the student pastes a job posting, extract key requirements and reflect them back.
- Each message must end with exactly one question.
- Each question must include 2-5 quick-reply chip suggestions in this format at the END of your message:
  <!--CHIPS:["chip1","chip2","chip3"]-->
- Always include an escape hatch chip ("Other...", "Let me type it out", "Skip this").
- When you have collected a new piece of info, emit a phase marker:
  <!--PHASE:awaiting-angle--> or <!--PHASE:awaiting-tone--> or <!--PHASE:refinement-->
- After all 3 fields are collected, say "Your letter is ready!" and emit <!--PHASE:refinement-->
- In refinement mode, still offer chips but make them action-oriented.
- Never generate the full letter text in chat — the left panel handles that.

## Anti-Patterns
- Don't ask "What's your name?" or "What school do you attend?" — you know.
- Don't ask more than 5 questions total before generating.
- Don't use corporate jargon in suggestions.`
}

// ── Section parsing ────────────────────────────────────────────────────────

export interface ParsedSection {
  id: LetterSectionId
  content: string
}

const SECTION_MARKER = /<!-- SECTION:(\w+) -->/g

export function parseLetterSections(letter: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  const markers: { id: string; index: number }[] = []

  let match: RegExpExecArray | null
  while ((match = SECTION_MARKER.exec(letter)) !== null) {
    markers.push({ id: match[1], index: match.index + match[0].length })
  }

  if (markers.length === 0) {
    // Fallback: split on double newlines
    const paragraphs = letter.split(/\n\n+/).filter((p) => p.trim())
    const ids: LetterSectionId[] = ['opening', 'body1', 'body2', 'closing']
    paragraphs.forEach((p, i) => {
      if (i < ids.length) {
        sections.push({ id: ids[i], content: p.trim() })
      } else {
        // Merge extra paragraphs into closing
        const last = sections[sections.length - 1]
        if (last) last.content += '\n\n' + p.trim()
      }
    })
    return sections
  }

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index
    const end = i + 1 < markers.length ? markers[i + 1].index - markers[i + 1].id.length - 21 : letter.length
    const content = letter.slice(start, end).trim()
    sections.push({ id: markers[i].id as LetterSectionId, content })
  }

  return sections
}

export function replaceSection(letter: string, sectionId: LetterSectionId, newContent: string): string {
  const sections = parseLetterSections(letter)
  return sections
    .map((s) => {
      const content = s.id === sectionId ? newContent : s.content
      return `<!-- SECTION:${s.id} -->\n${content}`
    })
    .join('\n\n')
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
