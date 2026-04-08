import type { InstitutionalResumePreflight } from './institutional-resume-preflight'

// ── Types ──────────────────────────────────────────────────────────────

export interface InstitutionalResumeInterviewState {
  phase: 'instant-draft' | 'purpose' | 'email-context' | 'gap-review' | 'style' | 'refinement'
  purpose: string | null
  emailExcerpts: string | null
  additionalContext: string | null
  style: string | null
}

export interface InstitutionalResumeGenerateRequest {
  mode: 'instant-draft' | 'full-regeneration'
  preflight: InstitutionalResumePreflight
  interviewState: InstitutionalResumeInterviewState
}

export interface InstitutionalResumeInterviewRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  preflight: InstitutionalResumePreflight
  interviewState: InstitutionalResumeInterviewState
}

export interface InstitutionalResumeRefineRequest {
  currentResume: string
  targetSection: string | null
  instruction: string
  preflight: InstitutionalResumePreflight
  interviewState: InstitutionalResumeInterviewState
}

// ── Context builder ────────────────────────────────────────────────────

function buildInstitutionalContext(pf: InstitutionalResumePreflight): string {
  const parts: string[] = []
  parts.push(`## User Profile\nName: ${pf.user.name}\nRole: ${pf.user.role}\nDepartment: ${pf.user.department ?? 'N/A'}\nCollege: ${pf.user.college ?? 'N/A'}`)
  if (pf.user.bio) parts.push(`Bio: ${pf.user.bio}`)
  if (pf.user.title) parts.push(`Title: ${pf.user.title}`)

  if (pf.sandboxActivity.coursesOwned.length > 0) {
    parts.push(`\n## Courses Taught\n${pf.sandboxActivity.coursesOwned.map(c => `- ${c.courseCode}: ${c.title} (${c.studentCount} students)`).join('\n')}`)
  }
  if (pf.sandboxActivity.coursesEnrolled.length > 0) {
    parts.push(`\n## Courses Enrolled\n${pf.sandboxActivity.coursesEnrolled.map(c => `- ${c.courseCode}: ${c.title}`).join('\n')}`)
  }
  if (pf.sandboxActivity.toolsBuilt.length > 0) {
    parts.push(`\n## Tools Built on Platform\n${pf.sandboxActivity.toolsBuilt.map(t => `- ${t.name} (${t.useCount} uses)`).join('\n')}`)
  }
  if (pf.sandboxActivity.committeeMemberships.length > 0) {
    parts.push(`\n## Committee Memberships\n${pf.sandboxActivity.committeeMemberships.map(c => `- ${c.name} (${c.role})`).join('\n')}`)
  }
  if (pf.sandboxActivity.policiesAuthored > 0) {
    parts.push(`\n## Policies Authored: ${pf.sandboxActivity.policiesAuthored}`)
  }

  if (pf.portfolio.experiences.length > 0) {
    parts.push(`\n## Work Experience\n${pf.portfolio.experiences.map(e => `- ${e.title} at ${e.organization}${e.description ? ': ' + e.description : ''}`).join('\n')}`)
  }
  if (pf.portfolio.projects.length > 0) {
    parts.push(`\n## Projects\n${pf.portfolio.projects.map(p => `- ${p.title}${p.description ? ': ' + p.description : ''}`).join('\n')}`)
  }
  if (pf.portfolio.publications.length > 0) {
    parts.push(`\n## Publications\n${pf.portfolio.publications.map(p => `- ${p.title}`).join('\n')}`)
  }
  if (pf.portfolio.awards.length > 0) {
    parts.push(`\n## Awards & Recognition\n${pf.portfolio.awards.map(a => `- ${a.title}${a.description ? ': ' + a.description : ''}`).join('\n')}`)
  }
  if (pf.portfolio.certifications.length > 0) {
    parts.push(`\n## Certifications\n${pf.portfolio.certifications.map(c => `- ${c.title}`).join('\n')}`)
  }
  if (pf.interests.length > 0) {
    parts.push(`\n## Interests & Skills\n${pf.interests.join(', ')}`)
  }

  return parts.join('\n')
}

// ── System Prompts ─────────────────────────────────────────────────────

export function getInstantDraftPrompt(pf: InstitutionalResumePreflight): string {
  return `You are Sandy, building a resume from institutional data for a University of Kentucky ${pf.user.role.toLowerCase()}.

${buildInstitutionalContext(pf)}

## Instructions
Generate a compelling, SPECIFIC resume based on the institutional data above. This resume must read like it could only belong to THIS person.

Rules:
- Use section markers: <!-- SECTION:header -->, <!-- SECTION:summary -->, <!-- SECTION:experience -->, <!-- SECTION:education -->, <!-- SECTION:skills -->, <!-- SECTION:achievements -->
- Each section marker must be on its own line
- NEVER use generic phrases like "managed communications" or "facilitated meetings"
- Always be specific: instead of "managed projects", say "Led 12-member cross-functional team restructuring shared governance protocols"
- If data is available for awards, committees, publications — include them
- If the person is staff, emphasize operational impact and institutional knowledge
- If the person is faculty, emphasize teaching, research, and curriculum development
- If the person is a student, emphasize coursework, projects, skills, and extracurriculars
- 400-600 words total
- Use strong action verbs: Led, Designed, Implemented, Orchestrated, Transformed
- Format as clean markdown`
}

export function getFullRegenerationPrompt(pf: InstitutionalResumePreflight, state: InstitutionalResumeInterviewState): string {
  return `You are Sandy, rebuilding a resume with full context for a UK ${pf.user.role.toLowerCase()}.

${buildInstitutionalContext(pf)}

## Interview Context
Purpose: ${state.purpose ?? 'General professional resume'}
${state.emailExcerpts ? `Email excerpts provided:\n${state.emailExcerpts}` : ''}
${state.additionalContext ? `Additional context: ${state.additionalContext}` : ''}
Style: ${state.style ?? 'Professional'}

## Instructions
Regenerate the resume incorporating ALL context above. Be ruthlessly specific.
Use section markers: <!-- SECTION:header -->, <!-- SECTION:summary -->, <!-- SECTION:experience -->, <!-- SECTION:education -->, <!-- SECTION:skills -->, <!-- SECTION:achievements -->
Each marker on its own line. 500-700 words.`
}

export function getInterviewSystemPrompt(pf: InstitutionalResumePreflight, state: InstitutionalResumeInterviewState): string {
  const firstName = pf.user.name.split(' ')[0]
  return `You are Sandy, the AI concierge at the University of Kentucky.
You're helping ${firstName} build a resume from their institutional data.

## What You Already Know
${buildInstitutionalContext(pf)}

## Current Interview State
Phase: ${state.phase}
Purpose: ${state.purpose ?? 'not yet specified'}
Email excerpts: ${state.emailExcerpts ? 'provided' : 'not yet'}
Style: ${state.style ?? 'not yet specified'}

## Your Approach
- You ALREADY have their institutional data. Don't ask for info you already have.
- Your job is to fill gaps: What's the resume FOR? Any work not captured in the system?
- Keep messages to 2-3 sentences max, then ONE question.
- Be concise. Tiana says "it talks too much" — don't be that AI.
- Every message MUST end with chips: <!--CHIPS:["option1","option2","option3"]-->
- Every message MUST include phase marker: <!--PHASE:phase-name-->

## Interview Flow
1. PURPOSE: Ask what the resume is for (new job, promotion, annual review, grant application)
2. EMAIL_CONTEXT: Offer to incorporate email excerpts for awards/projects not in the system
3. GAP_REVIEW: Show what you found and ask "What's missing?"
4. STYLE: Ask about tone (formal academic, corporate, narrative)
5. REFINEMENT: Resume is generated — help refine specific sections`
}

export function getRefinePrompt(req: InstitutionalResumeRefineRequest): string {
  return `You are Sandy, refining a section of a resume.

Current resume:
${req.currentResume}

${req.targetSection ? `Target section: ${req.targetSection}` : 'Refine the entire resume.'}
User instruction: ${req.instruction}

${buildInstitutionalContext(req.preflight)}

Rules:
- Keep section markers (<!-- SECTION:xxx -->) intact
- Only modify the targeted section (or all if no target specified)
- Be MORE specific, not less
- Output the COMPLETE resume with the refinement applied`
}

// ── Parsing ────────────────────────────────────────────────────────────

export interface ParsedResumeSection {
  id: string
  content: string
}

export function parseResumeSections(resume: string): ParsedResumeSection[] {
  const sections: ParsedResumeSection[] = []
  const regex = /<!-- SECTION:(\w+) -->/g
  let match: RegExpExecArray | null
  const markers: { id: string; index: number }[] = []

  while ((match = regex.exec(resume)) !== null) {
    markers.push({ id: match[1], index: match.index + match[0].length })
  }

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index
    const end = i + 1 < markers.length ? resume.lastIndexOf('<!-- SECTION:', markers[i + 1].index) : resume.length
    sections.push({ id: markers[i].id, content: resume.slice(start, end).trim() })
  }

  return sections
}

// ── Chip/Phase extraction ──────────────────────────────────────────────

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
