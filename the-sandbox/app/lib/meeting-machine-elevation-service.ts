/**
 * meeting-machine-elevation-service.ts
 *
 * System prompts, interview logic, and generation for all 4 elevated
 * Meeting Machine tools: Agenda Builder, Minutes Taker, Action Items, Follow-up Drafter.
 */

import type { MeetingMachinePreflight } from './meeting-machine-preflight'

// ── Types ──────────────────────────────────────────────────────────────────

export type MeetingToolSlug = 'agenda-builder' | 'minutes-taker' | 'action-items' | 'follow-up-drafter'

export interface MeetingInterviewState {
  phase: string
  meetingType: string | null
  duration: number | null
  attendees: string[]
  topics: string[]
  decisions: string[]
  actionItems: { description: string; owner: string | null; deadline: string | null }[]
  tone: string | null
}

export interface MeetingGenerateRequest {
  toolSlug: MeetingToolSlug
  mode: 'instant-draft' | 'refinement'
  preflight: MeetingMachinePreflight
  interviewState: MeetingInterviewState | null
  pipelineData: Record<string, unknown> | null
  rawInput?: string
}

export interface MeetingInterviewRequest {
  toolSlug: MeetingToolSlug
  messages: { role: 'user' | 'assistant'; content: string }[]
  preflight: MeetingMachinePreflight
  interviewState: MeetingInterviewState
  pipelineData: Record<string, unknown> | null
}

export interface MeetingRefineRequest {
  toolSlug: MeetingToolSlug
  currentOutput: string
  instruction: string
  preflight: MeetingMachinePreflight
  interviewState: MeetingInterviewState
}

// ── Preflight context ──────────────────────────────────────────────────────

function buildContext(pf: MeetingMachinePreflight): string {
  const parts: string[] = []
  parts.push(`User: ${pf.user.name} (${pf.user.role})`)
  if (pf.user.department) parts.push(`Department: ${pf.user.department}`)
  if (pf.courses.length > 0) {
    parts.push(`Courses: ${pf.courses.map((c) => `${c.code} (${c.role})`).join(', ')}`)
  }
  if (pf.knownContacts.length > 0) {
    parts.push(`Known contacts: ${pf.knownContacts.slice(0, 10).map((c) => `${c.name} (${c.role})`).join(', ')}`)
  }
  return parts.join('\n')
}

// ── Generation prompts ─────────────────────────────────────────────────────

const GENERATE_PROMPTS: Record<MeetingToolSlug, (pf: MeetingMachinePreflight, state: MeetingInterviewState | null, pipelineData: Record<string, unknown> | null, rawInput?: string) => string> = {
  'agenda-builder': (pf, state) => {
    const duration = state?.duration ?? 60
    const topics = state?.topics?.join(', ') || 'general discussion'
    const attendees = state?.attendees?.join(', ') || pf.user.name
    const meetingType = state?.meetingType ?? 'meeting'

    return `Generate a timed meeting agenda in Markdown.

Meeting: ${meetingType}
Duration: ${duration} minutes
Attendees: ${attendees}
Topics: ${topics}
Organizer: ${pf.user.name}

Format:
## ${meetingType.charAt(0).toUpperCase() + meetingType.slice(1)} Agenda
**Duration:** ${duration} min | **Organizer:** ${pf.user.name}

| # | Topic | Time | Owner |
|---|-------|------|-------|
| 1 | ... | X min | ... |

Rules:
- Time allocations MUST sum exactly to ${duration} minutes
- Include a 3-5 min check-in at start and 2-3 min wrap-up at end
- Assign owners from attendees list where appropriate
- Make topics specific and actionable
- Output ONLY the agenda. No preamble.`
  },

  'minutes-taker': (pf, state, pipeline, rawInput) => {
    const agendaContext = pipeline ? `\n\nPrevious agenda:\n${JSON.stringify(pipeline)}` : ''
    const attendees = state?.attendees?.join(', ') || pf.user.name

    return `Convert the raw meeting notes into structured, professional minutes in Markdown.

Attendees: ${attendees}
${agendaContext}

Format:
## Meeting Minutes
**Date:** [today] | **Attendees:** ${attendees}

### Key Discussion Points
(clear summaries per topic)

### Decisions Made
(bulleted list)

### Action Items
| # | Item | Owner | Deadline |
|---|------|-------|----------|

### Next Steps
(brief)

${rawInput ? `Raw notes:\n---\n${rawInput}\n---` : ''}

Rules:
- Extract decisions with ⚡ markers
- Extract action items with owner and deadline where mentioned
- Keep summaries concise but complete
- Output ONLY the minutes. No preamble.`
  },

  'action-items': (_pf, state, pipeline, rawInput) => {
    const source = rawInput || (pipeline ? JSON.stringify(pipeline) : '')

    return `Extract every action item, task, commitment, and follow-up from the meeting notes.

${state?.attendees?.length ? `Known attendees: ${state.attendees.join(', ')}` : ''}

Format each as a table:
| # | Action Item | Owner | Deadline | Type | Status |
|---|---|---|---|---|---|

Type: Task, Decision Follow-up, Logistics, Research, or FYI
Status: Pending (for all)

If no owner or deadline is mentioned, write "TBD".

After the table, add:
## Summary
Total: X items | Urgent: Y | Needs deadline: Z

Source notes:
---
${source}
---

Output ONLY the action items. No preamble.`
  },

  'follow-up-drafter': (pf, state, pipeline) => {
    const attendees = state?.attendees || []
    const decisions = state?.decisions || []
    const actions = state?.actionItems || []

    return `Draft personalized follow-up emails for meeting participants.

Meeting organized by: ${pf.user.name}
Attendees: ${attendees.join(', ')}
Decisions: ${decisions.join('; ')}
Action items: ${actions.map((a) => `${a.description} (Owner: ${a.owner ?? 'TBD'}, Due: ${a.deadline ?? 'TBD'})`).join('; ')}
${pipeline ? `Meeting context: ${JSON.stringify(pipeline)}` : ''}

Tone: ${state?.tone ?? 'professional but friendly'}

For each attendee (except the sender), create:
## Email to [Name]
**Subject:** [subject line]

[personalized email body — 100-200 words max]
- Brief meeting recap relevant to THAT person
- ONLY their specific action items
- One forward-looking line

Sign off: ${pf.user.name}

Rules:
- Personalize each email to the recipient's specific responsibilities
- Don't include everyone's action items — only the recipient's
- Keep it concise — follow-up emails should be quick reads
- Output ONLY the emails. No preamble.`
  },
}

export function getGeneratePrompt(req: MeetingGenerateRequest): string {
  return GENERATE_PROMPTS[req.toolSlug](req.preflight, req.interviewState, req.pipelineData, req.rawInput)
}

// ── Interview prompts ──────────────────────────────────────────────────────

const INTERVIEW_PROMPTS: Record<MeetingToolSlug, (pf: MeetingMachinePreflight, state: MeetingInterviewState) => string> = {
  'agenda-builder': (pf, state) => `You are Sandy, helping ${pf.user.name.split(' ')[0]} build a meeting agenda.

${buildContext(pf)}

Interview state: ${JSON.stringify(state)}

## Flow
1. Ask meeting type: <!--CHIPS:["Study group","Project sync","1:1 with advisor","Class meeting","Other..."]-->
2. Ask duration: <!--CHIPS:["15 min","30 min","45 min","60 min","90 min"]-->
3. Ask topics: let them list or suggest from their courses
4. Generate

Rules:
- 2-3 sentences max per message. ONE question per message.
- Every message needs <!--CHIPS:[...]-->  and <!--PHASE:...-->
- If student, suggest study group topics from their courses
- If educator, suggest class/committee meeting templates
- Never ask for their name or courses — you know.`,

  'minutes-taker': (pf, state) => `You are Sandy, helping ${pf.user.name.split(' ')[0]} capture meeting minutes.

${buildContext(pf)}

Interview state: ${JSON.stringify(state)}

## Flow
1. If agenda data exists in pipeline: walk through each agenda item asking "What happened?"
2. If no agenda: ask user to paste notes or describe what happened
3. Confirm decisions and action items

Rules:
- Be efficient: "What happened on [topic]?" not long intros
- Every message needs <!--CHIPS:[...]-->  and <!--PHASE:...-->
- Chips for each item: ["Covered as planned","Ran long","Skipped","Key decision made"]
- After all items: "Anything else?"`,

  'action-items': (pf, state) => `You are Sandy, helping ${pf.user.name.split(' ')[0]} confirm action items from a meeting.

${buildContext(pf)}

Interview state: ${JSON.stringify(state)}

## Flow
1. If minutes data exists: present extracted items for review
2. If no minutes: ask user to paste notes
3. For each item missing owner/deadline, ask
4. Classify each: Task, Decision Follow-up, Logistics, Research, FYI

Rules:
- This should be a CONFIRMATION flow, not a creation flow
- Every message needs <!--CHIPS:[...]-->  and <!--PHASE:...-->
- Chips: ["All correct","Edit one","Add missing item","Remove one"]`,

  'follow-up-drafter': (pf, state) => `You are Sandy, helping ${pf.user.name.split(' ')[0]} draft meeting follow-up emails.

${buildContext(pf)}

Interview state: ${JSON.stringify(state)}

## Flow
1. If action items data exists: confirm recipients and tone
2. If no upstream data: ask for meeting context
3. Ask: per-person emails or group email?
4. Ask tone

Rules:
- 2-3 sentences max per message
- Every message needs <!--CHIPS:[...]-->  and <!--PHASE:...-->
- Chips: ["One per person","Group email","Just a self-summary"]
- Tone chips: ["Casual","Professional","Brief/bullet-points"]`,
}

export function getInterviewPrompt(req: MeetingInterviewRequest): string {
  return INTERVIEW_PROMPTS[req.toolSlug](req.preflight, req.interviewState)
}

// ── Refine prompt ──────────────────────────────────────────────────────────

export function getRefinePrompt(req: MeetingRefineRequest): string {
  return `You are refining meeting content based on the user's instruction.

Current output:
---
${req.currentOutput}
---

User: ${req.preflight.user.name}
Tool: ${req.toolSlug}

User's instruction: "${req.instruction}"

Rules:
- Apply the instruction precisely
- Preserve content the user didn't ask to change
- Output ONLY the refined content. No preamble.`
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
