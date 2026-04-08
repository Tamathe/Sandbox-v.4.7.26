/**
 * resume-builder-service.ts
 *
 * System prompts, section parsing, and generation for the elevated Resume Builder.
 * 5-section resume: Header/Objective, Education, Experience, Skills, Summary.
 */

import type { ResumeBuilderPreflight } from './resume-builder-preflight'

// ── Types ──────────────────────────────────────────────────────────────────

export type ResumeSectionId = 'header' | 'education' | 'experience' | 'skills' | 'summary'

export interface ResumeInterviewState {
  phase: 'instant-draft' | 'target-role' | 'experience-detail' | 'skills-confirm' | 'style' | 'refinement'
  targetRole: string | null
  experienceNotes: string | null
  additionalSkills: string[]
  style: 'Professional' | 'Technical' | 'Academic' | 'Creative' | null
}

export interface ResumeGenerateRequest {
  mode: 'instant-draft' | 'full-regeneration' | 'section-update'
  preflight: ResumeBuilderPreflight
  interviewState: ResumeInterviewState | null
  targetSection?: ResumeSectionId
  currentResume?: string
}

export interface ResumeInterviewRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  preflight: ResumeBuilderPreflight
  interviewState: ResumeInterviewState
}

export interface ResumeRefineRequest {
  currentResume: string
  targetSection: ResumeSectionId | 'full'
  instruction: string
  preflight: ResumeBuilderPreflight
  interviewState: ResumeInterviewState
}

// ── Preflight context builder ──────────────────────────────────────────────

function buildPreflightContext(pf: ResumeBuilderPreflight): string {
  const parts: string[] = []

  parts.push(`Name: ${pf.user.name}`)
  if (pf.user.department) parts.push(`Department: ${pf.user.department}`)
  if (pf.user.college) parts.push(`College: ${pf.user.college}`)
  if (pf.user.bio) parts.push(`Bio: ${pf.user.bio}`)

  if (pf.memories.goals.length > 0) parts.push(`Goals: ${pf.memories.goals.join('; ')}`)
  if (pf.memories.strengths.length > 0) parts.push(`Strengths: ${pf.memories.strengths.join('; ')}`)
  if (pf.interests.length > 0) parts.push(`Interests: ${pf.interests.join(', ')}`)

  if (pf.courses.length > 0) {
    parts.push(`Courses: ${pf.courses.map((c) => `${c.code} ${c.title}`).join(', ')}`)
  }

  if (pf.portfolio.experiences.length > 0) {
    const exps = pf.portfolio.experiences
      .map((e) => `${e.title}${e.organization ? ` at ${e.organization}` : ''}${e.description ? `: ${e.description.slice(0, 120)}` : ''}`)
      .join('\n- ')
    parts.push(`Experience:\n- ${exps}`)
  }

  if (pf.portfolio.projects.length > 0) {
    parts.push(`Projects: ${pf.portfolio.projects.map((p) => `${p.title}${p.description ? `: ${p.description.slice(0, 80)}` : ''}`).join('; ')}`)
  }

  if (pf.portfolio.certifications.length > 0) {
    parts.push(`Certifications: ${pf.portfolio.certifications.map((c) => c.title).join(', ')}`)
  }

  if (pf.portfolio.awards.length > 0) {
    parts.push(`Awards: ${pf.portfolio.awards.map((a) => a.title).join(', ')}`)
  }

  if (pf.derivedKeywords.length > 0) {
    parts.push(`Top skills: ${pf.derivedKeywords.join(', ')}`)
  }

  if (pf.topConcepts.length > 0) {
    parts.push(`Concepts this week: ${pf.topConcepts.join(', ')}`)
  }

  return parts.join('\n')
}

// ── System prompts ─────────────────────────────────────────────────────────

export function getInstantDraftPrompt(pf: ResumeBuilderPreflight): string {
  return `Generate a professional resume in Markdown for this student. Use their actual data — do NOT ask questions.

## Student Profile
${buildPreflightContext(pf)}

## Format
Use these exact section markers (each on its own line before the section):
<!-- SECTION:header -->
# {Name}
{email} | {department} | University of Kentucky

<!-- SECTION:summary -->
## Summary
(2-3 sentence professional summary highlighting strongest qualifications)

<!-- SECTION:education -->
## Education
**University of Kentucky** — {degree/major if known, else department}
Relevant Coursework: {top 4-5 courses}
${pf.portfolio.awards.length > 0 ? 'Honors: {awards}' : ''}

<!-- SECTION:experience -->
## Experience
(For each role: **Title** — Organization | Dates
- Action verb bullet with quantified result
- 3 bullets max per role, newest first)
${pf.portfolio.experiences.length === 0 ? '(Use projects as experience — frame them professionally)' : ''}

<!-- SECTION:skills -->
## Skills
**Technical:** {derived from portfolio + interests}
**Tools & Frameworks:** {specific tools}
${pf.portfolio.certifications.length > 0 ? '**Certifications:** {list}' : ''}

## Rules
- Start every experience bullet with a strong action verb (Built, Led, Designed, Implemented, etc.)
- Quantify results where the data supports it — do NOT fabricate metrics
- Keep to ~1 page equivalent (400-500 words)
- ${pf.user.role === 'STUDENT' ? 'Frame coursework and projects as professional experience' : 'Emphasize research, teaching, and institutional contributions'}
- Output ONLY the resume. No preamble.`
}

export function getFullRegenerationPrompt(
  pf: ResumeBuilderPreflight,
  state: ResumeInterviewState,
): string {
  const styleDirective = state.style === 'Technical'
    ? 'Emphasize technical skills, tools, and quantified engineering outcomes.'
    : state.style === 'Academic'
      ? 'Emphasize research, publications, teaching, and academic achievements.'
      : state.style === 'Creative'
        ? 'Use a more distinctive voice. Lead with impact stories, not just bullet points.'
        : 'Clean, traditional format. Strong action verbs, quantified results.'

  return `Generate a tailored resume in Markdown.

## Student Profile
${buildPreflightContext(pf)}

## Target
Role: ${state.targetRole ?? 'General professional'}
${state.experienceNotes ? `Additional experience context: ${state.experienceNotes}` : ''}
${state.additionalSkills.length > 0 ? `Additional skills to include: ${state.additionalSkills.join(', ')}` : ''}

## Style
${styleDirective}

## Format
Use section markers: <!-- SECTION:header -->, <!-- SECTION:summary -->, <!-- SECTION:education -->, <!-- SECTION:experience -->, <!-- SECTION:skills -->
Place each marker on its own line BEFORE the section it labels.

## Rules
- Tailor the summary to the target role: "${state.targetRole ?? 'general'}"
- Lead experience bullets with the most relevant accomplishments for this role
- Skills section should prioritize skills relevant to the target role
- Keep to ~1 page (400-500 words)
- Strong action verbs, quantified results where data supports it
- Do NOT fabricate metrics or experiences
- Output ONLY the resume.`
}

export function getRefinePrompt(req: ResumeRefineRequest): { system: string; user: string } {
  return {
    system: `You are refining a resume section based on the user's instruction.

Current resume:
---
${req.currentResume}
---

Student profile:
${buildPreflightContext(req.preflight)}

Target role: ${req.interviewState.targetRole ?? 'not specified'}
Style: ${req.interviewState.style ?? 'Professional'}

${req.targetSection === 'full'
  ? 'Rewrite the entire resume. Include all section markers.'
  : `Rewrite ONLY the "${req.targetSection}" section. Do NOT include the <!-- SECTION: --> marker — just the content.`}

Rules:
- Apply the user's instruction precisely
- Preserve factual content the user didn't ask to change
- Output ONLY the ${req.targetSection === 'full' ? 'complete resume' : 'replacement section content'}. No preamble.`,
    user: `User's instruction: "${req.instruction}"`,
  }
}

// ── Sandy interview prompt ─────────────────────────────────────────────────

export function getInterviewSystemPrompt(
  pf: ResumeBuilderPreflight,
  state: ResumeInterviewState,
): string {
  const firstName = pf.user.name.split(' ')[0]
  return `You are Sandy, the AI concierge at the University of Kentucky.
You're helping ${firstName} build a professional resume through a guided interview.

## Your Personality
- Warm, encouraging, efficient. Like a great career counselor who respects the student's time.
- Use ${firstName}'s name once in your opening, then keep it professional.
- Be specific: reference their actual experiences, courses, and skills by name.
- Keep messages SHORT — 2-3 sentences max, then ONE question.

## What You Know
${buildPreflightContext(pf)}

## Interview State
Phase: ${state.phase}
Target role: ${state.targetRole ?? 'not yet specified'}
Style: ${state.style ?? 'not yet specified'}

## Interview Protocol
You're collecting:
1. TARGET ROLE (${state.targetRole ? 'COLLECTED: ' + state.targetRole : 'needed'})
2. EXPERIENCE DETAILS (${state.experienceNotes ? 'COLLECTED' : 'needed — any work/internship/project not in their profile'})
3. ADDITIONAL SKILLS (${state.additionalSkills.length > 0 ? 'COLLECTED' : 'needed — confirm or add to derived list'})
4. STYLE (${state.style ? 'COLLECTED: ' + state.style : 'needed'})

## Rules
- Never ask for info visible in the preflight data (name, courses, etc.)
- Each message must end with chips: <!--CHIPS:["a","b","c"]-->
- Include escape hatch chip always
- Emit phase markers: <!--PHASE:target-role-->, <!--PHASE:experience-detail-->, <!--PHASE:skills-confirm-->, <!--PHASE:style-->, <!--PHASE:refinement-->
- After all 4 fields collected, emit <!--PHASE:refinement-->
- In refinement mode, offer section-level editing chips
- Never output the resume in chat — the left panel handles that`
}

// ── Section parsing ────────────────────────────────────────────────────────

export interface ParsedResumeSection {
  id: ResumeSectionId
  content: string
}

const SECTION_MARKER = /<!-- SECTION:(\w+) -->/g

export function parseResumeSections(resume: string): ParsedResumeSection[] {
  const sections: ParsedResumeSection[] = []
  const markers: { id: string; index: number }[] = []

  let match: RegExpExecArray | null
  while ((match = SECTION_MARKER.exec(resume)) !== null) {
    markers.push({ id: match[1], index: match.index + match[0].length })
  }

  if (markers.length === 0) {
    // Fallback: split on ## headers
    const parts = resume.split(/^## /m).filter((s) => s.trim())
    const idMap: Record<string, ResumeSectionId> = {
      summary: 'summary',
      education: 'education',
      experience: 'experience',
      skills: 'skills',
    }
    // First part before any ## is the header
    if (parts.length > 0) {
      sections.push({ id: 'header', content: parts[0].trim() })
    }
    for (let i = 1; i < parts.length; i++) {
      const nl = parts[i].indexOf('\n')
      const heading = (nl > -1 ? parts[i].slice(0, nl) : parts[i]).trim().toLowerCase()
      const content = nl > -1 ? parts[i].slice(nl + 1).trim() : ''
      const id = idMap[heading]
      if (id) sections.push({ id, content: `## ${parts[i].slice(0, nl ?? undefined).trim()}\n${content}` })
    }
    return sections
  }

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index
    const end = i + 1 < markers.length
      ? resume.lastIndexOf('<!-- SECTION:', markers[i + 1].index)
      : resume.length
    const content = resume.slice(start, end).trim()
    sections.push({ id: markers[i].id as ResumeSectionId, content })
  }

  return sections
}

export function replaceSection(resume: string, sectionId: ResumeSectionId, newContent: string): string {
  const sections = parseResumeSections(resume)
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
  try { return JSON.parse(match[1]) as string[] } catch { return [] }
}

export function extractPhase(text: string): string | null {
  const match = PHASE_REGEX.exec(text)
  return match ? match[1] : null
}
