/**
 * contract-drafter-service.ts
 *
 * Sandy-guided contract creation with UK boilerplate and compliance flags.
 */

export type ContractType = 'service-agreement' | 'mou' | 'vendor' | 'consulting' | 'speaker-event' | 'facilities-use' | 'data-sharing'

export interface ContractDrafterInterviewState {
  phase: 'contract-type' | 'parties' | 'key-terms' | 'compliance' | 'drafting' | 'refinement'
  contractType: ContractType | null
  parties: string | null
  keyTerms: string | null
  additionalContext: string | null
}

export interface ContractDrafterGenerateRequest {
  preflight: { user: { name: string; role: string; department: string | null } }
  interviewState: ContractDrafterInterviewState
  contractDetails: string
}

export interface ContractDrafterInterviewRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  preflight: { user: { name: string; role: string; department: string | null } }
  interviewState: ContractDrafterInterviewState
}

export interface ContractDrafterRefineRequest {
  currentDraft: string
  instruction: string
  preflight: { user: { name: string; role: string; department: string | null } }
  interviewState: ContractDrafterInterviewState
}

const CONTRACT_CLAUSES: Record<ContractType, string[]> = {
  'service-agreement': ['Scope of Services', 'Deliverables', 'Payment Terms', 'Insurance Requirements', 'Term & Termination', 'Indemnification', 'Intellectual Property', 'Confidentiality'],
  'mou': ['Purpose', 'Responsibilities of Each Party', 'Duration', 'Non-Binding Language', 'Points of Contact', 'Review & Renewal'],
  'vendor': ['Procurement Compliance', 'Service Level Agreement', 'Data Handling & Security', 'Payment Schedule', 'Renewal Terms', 'Termination for Cause'],
  'consulting': ['Scope of Engagement', 'Hourly/Fixed Rate', 'Expenses', 'IP Ownership', 'Conflict of Interest Disclosure', 'Confidentiality', 'Term'],
  'speaker-event': ['Honorarium', 'Travel & Accommodations', 'Recording Rights', 'Cancellation Policy', 'Marketing Rights', 'Liability'],
  'facilities-use': ['Space Description', 'Dates & Times', 'Setup/Teardown', 'AV Requirements', 'Liability & Insurance', 'Catering', 'Cancellation'],
  'data-sharing': ['FERPA Compliance', 'Data Classification', 'Permitted Use', 'Retention Period', 'Breach Notification', 'Return/Destruction of Data', 'Audit Rights'],
}

const CONTRACT_LABELS: Record<ContractType, string> = {
  'service-agreement': 'Service Agreement',
  'mou': 'Memorandum of Understanding',
  'vendor': 'Vendor Agreement',
  'consulting': 'Consulting Agreement',
  'speaker-event': 'Speaker/Event Agreement',
  'facilities-use': 'Facilities Use Agreement',
  'data-sharing': 'Data Sharing Agreement',
}

export function getContractTypeLabel(type: ContractType): string {
  return CONTRACT_LABELS[type] ?? type
}

export function getContractClauses(type: ContractType): string[] {
  return CONTRACT_CLAUSES[type] ?? []
}

export function getContractGeneratePrompt(req: ContractDrafterGenerateRequest): string {
  const type = req.interviewState.contractType ?? 'service-agreement'
  const clauses = CONTRACT_CLAUSES[type] ?? []
  const label = CONTRACT_LABELS[type] ?? 'Agreement'

  return `You are Sandy, drafting a ${label} for the University of Kentucky.

## Drafting Context
User: ${req.preflight.user.name} (${req.preflight.user.role}, ${req.preflight.user.department ?? 'UK'})
Contract Type: ${label}
${req.interviewState.parties ? `Parties: ${req.interviewState.parties}` : ''}
${req.interviewState.keyTerms ? `Key Terms: ${req.interviewState.keyTerms}` : ''}
${req.interviewState.additionalContext ? `Additional Context: ${req.interviewState.additionalContext}` : ''}

## Full Details Provided
${req.contractDetails}

## Required Sections
Generate the contract with these sections, each marked with <!-- SECTION:section-id -->:

<!-- SECTION:header -->
[Title, date, party names]

${clauses.map((clause, i) => `<!-- SECTION:clause-${i} -->\n## ${clause}\n[Standard language + specific terms from the interview]`).join('\n\n')}

<!-- SECTION:compliance -->
## Compliance Notes
[Flag any compliance requirements: procurement thresholds, FERPA, insurance minimums, etc.]

<!-- SECTION:signatures -->
## Signatures
[Signature blocks for all parties]

## Rules
- Use formal legal language appropriate for a university setting
- Include UK-specific references (e.g., "University of Kentucky, a state institution of higher education")
- Flag sections that need legal review with [LEGAL REVIEW NEEDED] tags
- If this is a data-sharing agreement, include FERPA language
- If the total value exceeds $50,000, note procurement review requirement
- Use specific terms from the interview — never leave [INSERT] placeholders
- Each section marker must be on its own line`
}

export function getContractInterviewPrompt(req: ContractDrafterInterviewRequest): string {
  const firstName = req.preflight.user.name.split(' ')[0]
  const type = req.interviewState.contractType
  const clauses = type ? CONTRACT_CLAUSES[type] ?? [] : []

  return `You are Sandy, the AI concierge at the University of Kentucky.
You're helping ${firstName} draft a contract.

## Current State
Phase: ${req.interviewState.phase}
Contract type: ${type ? CONTRACT_LABELS[type] : 'not yet selected'}
Parties: ${req.interviewState.parties ?? 'not yet'}
Key terms: ${req.interviewState.keyTerms ?? 'not yet'}

${type ? `## Required Clauses for ${CONTRACT_LABELS[type]}\n${clauses.map(c => `- ${c}`).join('\n')}` : ''}

## Rules
- 2-3 sentences max, then ONE question
- Be concise — contract details matter more than pleasantries
- Every message MUST end with <!--CHIPS:["a","b","c"]-->
- Every message MUST include <!--PHASE:phase-name-->

## Interview Flow
1. CONTRACT_TYPE: Ask what kind of contract
2. PARTIES: Who are the parties?
3. KEY_TERMS: Walk through the key clauses for this contract type, asking about specifics
4. COMPLIANCE: Flag any compliance requirements
5. DRAFTING: Say "Drafting now" → triggers generation
6. REFINEMENT: Help refine sections — "Legal will want to review Section X"`
}

export function getContractRefinePrompt(req: ContractDrafterRefineRequest): string {
  return `You are Sandy, refining a contract draft.

Current draft:
${req.currentDraft}

User instruction: ${req.instruction}

Rules:
- Keep section markers (<!-- SECTION:xxx -->) intact
- Maintain formal legal language
- If user asks to simplify, keep legal precision but improve readability
- Output the COMPLETE contract with the refinement applied`
}

// ── Parsing ────────────────────────────────────────────────────

export interface ParsedContractSection {
  id: string
  content: string
}

export function parseContractSections(draft: string): ParsedContractSection[] {
  const sections: ParsedContractSection[] = []
  const regex = /<!-- SECTION:([\w-]+) -->/g
  let match: RegExpExecArray | null
  const markers: { id: string; index: number }[] = []

  while ((match = regex.exec(draft)) !== null) {
    markers.push({ id: match[1], index: match.index + match[0].length })
  }

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index
    const end = i + 1 < markers.length ? draft.lastIndexOf('<!-- SECTION:', markers[i + 1].index) : draft.length
    sections.push({ id: markers[i].id, content: draft.slice(start, end).trim() })
  }

  return sections
}

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
