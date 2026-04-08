// ─── Communication Drafting Service ───────────────────────────
// AI-powered university communication drafting with institutional
// voice, compliance checks, approval workflows, and social media
// adaptation. Uses Sonnet for drafting/revision, Haiku for social.

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import { Prisma } from '../../generated/prisma'
import { checkCommunicationCompliance } from './communication-compliance'
import type { ComplianceFlag, ComplianceCheckResult } from './communication-compliance'

// ── Types ────────────────────────────────────────────────────

export interface DraftRequest {
  authorId: string
  prompt: string
  type?: string
  tone?: string
  audience?: string
  context?: {
    relatedActionItemId?: string
    relatedPolicyNumber?: string
    relatedAlertId?: string
  }
}

export interface ApprovalChainMember {
  userId: string | null
  name: string
  role: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedAt: string | null
}

export interface DraftResult {
  communication: Awaited<ReturnType<typeof prisma.staffCommunication.create>>
  suggestedAudience: string
  suggestedDistribution: string[]
  complianceFlags: ComplianceFlag[]
  approvalChain: ApprovalChainMember[]
}

export interface SocialVersions {
  twitter: string
  instagram: string
  linkedin: string
}

// ── Anthropic Client ────────────────────────────────────────

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic()
  }
  return _anthropic
}

// ── Institutional Voice Guidelines ──────────────────────────

const INSTITUTIONAL_VOICE = `University of Kentucky Institutional Voice:
- Professional but warm — not corporate, not casual
- "We" language (the university community), not "I" or "the administration"
- Lead with impact: what this means for the reader, not the bureaucratic reason
- Specific dates, times, locations — never vague
- Include who to contact for questions
- Close with forward-looking statement when appropriate
- Avoid: jargon, passive voice, "please be advised", "as per", bureaucratic hedging
- UK branding: "University of Kentucky" first reference, "UK" thereafter
- For student communications: warmer, more direct, shorter sentences
- For crisis communications: facts first, actions second, reassurance third`

// ── Communication Type Specs ────────────────────────────────

const TYPE_SPECS: Record<string, { length: string; structure: string; audienceNorm: string }> = {
  'campus-wide': {
    length: '300-500 words',
    structure: 'Subject line, greeting, impact statement, key details (bold bullets), action needed, contact info, warm close',
    audienceNorm: 'All faculty, staff, and students',
  },
  department: {
    length: '200-400 words',
    structure: 'Subject line, collegial greeting, context, details, next steps, sign-off with name/title',
    audienceNorm: 'Department or college members',
  },
  'student-facing': {
    length: '200-300 words',
    structure: 'Subject line, casual greeting ("Hey Wildcats"), what/when/where, action needed, encouraging close',
    audienceNorm: 'All students or student subset',
  },
  'executive-brief': {
    length: '150-250 words',
    structure: 'Subject line, bottom line up front, key metrics, decisions needed, next steps with owners/dates',
    audienceNorm: 'Executive leadership (Deans, VPs, Provost)',
  },
  crisis: {
    length: '100-200 words',
    structure: 'Subject line (URGENT prefix), status, effective time, actions required, essential personnel, monitoring instructions',
    audienceNorm: 'All faculty, staff, and students',
  },
  'social-media': {
    length: '50-280 characters',
    structure: 'Platform-specific (Twitter ≤280 chars, Instagram caption, LinkedIn professional)',
    audienceNorm: 'External / public',
  },
}

// ── Type Detection ──────────────────────────────────────────

function detectType(prompt: string): string {
  const lower = prompt.toLowerCase()
  if (/urgent|emergency|crisis|safety alert|lockdown|closure|weather/i.test(lower)) return 'crisis'
  if (/executive|status update|brief|leadership|provost|dean/i.test(lower)) return 'executive-brief'
  if (/student|deadline|reminder|wildcats|registration/i.test(lower)) return 'student-facing'
  if (/department|college of|faculty meeting|internal/i.test(lower)) return 'department'
  if (/social media|tweet|instagram|linkedin|post/i.test(lower)) return 'social-media'
  return 'campus-wide'
}

function detectTone(type: string, prompt: string): string {
  const lower = prompt.toLowerCase()
  if (/congratulat|achievement|award|grant|honor/i.test(lower)) return 'celebratory'
  if (/urgent|emergency|crisis|immediately/i.test(lower)) return 'urgent'
  if (type === 'student-facing') return 'warm'
  if (type === 'executive-brief') return 'professional'
  if (type === 'crisis') return 'urgent'
  return 'formal'
}

// ── Approval Chain Builder ──────────────────────────────────

function buildApprovalChain(
  type: string,
  complianceResult: ComplianceCheckResult
): ApprovalChainMember[] {
  const chain: ApprovalChainMember[] = []

  // Always include supervisor for campus-wide or crisis
  if (type === 'campus-wide' || type === 'crisis') {
    chain.push({
      userId: null,
      name: 'Direct Supervisor',
      role: 'Supervisor',
      status: 'pending',
      reviewedAt: null,
    })
  }

  // Add compliance-suggested approvers
  for (const approver of complianceResult.suggestedApprovers) {
    if (!chain.some((c) => c.role === approver)) {
      chain.push({
        userId: null,
        name: approver,
        role: approver,
        status: 'pending',
        reviewedAt: null,
      })
    }
  }

  return chain
}

// ── Main Functions ──────────────────────────────────────────

/**
 * Create a new communication draft using AI.
 * Detects type, calls Sonnet for drafting, runs compliance,
 * determines approval chain, and saves to DB.
 */
export async function createDraft(input: DraftRequest): Promise<DraftResult> {
  const type = input.type || detectType(input.prompt)
  const tone = input.tone || detectTone(type, input.prompt)
  const typeSpec = TYPE_SPECS[type] ?? TYPE_SPECS['campus-wide']

  // Build the drafting prompt for Sonnet
  const systemPrompt = `You are Sandy, the University of Kentucky's AI communications assistant. You draft professional university communications.

${INSTITUTIONAL_VOICE}

COMMUNICATION TYPE: ${type}
TARGET LENGTH: ${typeSpec.length}
STRUCTURE: ${typeSpec.structure}
TONE: ${tone}

INSTRUCTIONS:
1. Generate a subject line (if applicable) and full body in markdown format.
2. Recommend the audience for this communication.
3. Suggest a distribution list (email groups or categories).
4. Be specific with any dates, times, or locations mentioned in the user's prompt.
5. Sign off as the author — use their role if known, otherwise use a generic title.

RESPOND IN THIS EXACT JSON FORMAT:
{
  "subject": "The email subject line",
  "body": "The full communication body in markdown",
  "audienceRecommendation": "Who should receive this",
  "distributionList": ["group1@uky.edu", "group2@uky.edu"]
}`

  const anthropic = getAnthropic()
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: input.prompt }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
  let parsed: {
    subject?: string
    body?: string
    audienceRecommendation?: string
    distributionList?: string[]
  }

  try {
    // Extract JSON from potential markdown code block
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  } catch {
    parsed = {
      subject: 'Communication Draft',
      body: rawText,
      audienceRecommendation: typeSpec.audienceNorm,
      distributionList: [],
    }
  }

  const body = parsed.body ?? rawText
  const audience = input.audience || parsed.audienceRecommendation || typeSpec.audienceNorm

  // Run compliance check
  const complianceResult = await checkCommunicationCompliance(body, type)

  // Build approval chain
  const approvalChain = buildApprovalChain(type, complianceResult)

  // Save to DB
  const communication = await prisma.staffCommunication.create({
    data: {
      authorId: input.authorId,
      type,
      status: 'draft',
      subject: parsed.subject ?? null,
      body,
      audienceDesc: audience,
      tone,
      complianceFlags: complianceResult.flags.length > 0 ? (complianceResult.flags as unknown as Prisma.InputJsonValue) : undefined,
      approvalChain: approvalChain.length > 0 ? (approvalChain as unknown as Prisma.InputJsonValue) : undefined,
      distributionList: parsed.distributionList ?? [],
      originalPrompt: input.prompt,
      revisionCount: 0,
      metadata: input.context ? input.context : undefined,
      source: 'sandy',
    },
  })

  return {
    communication,
    suggestedAudience: audience,
    suggestedDistribution: parsed.distributionList ?? [],
    complianceFlags: complianceResult.flags,
    approvalChain,
  }
}

/**
 * Revise an existing draft with a natural-language instruction.
 * Calls Sonnet with the original body + revision instruction,
 * updates the draft, and re-runs compliance.
 */
export async function reviseDraft(
  commId: string,
  instruction: string
): Promise<Awaited<ReturnType<typeof prisma.staffCommunication.update>>> {
  const existing = await prisma.staffCommunication.findUniqueOrThrow({
    where: { id: commId },
  })

  const systemPrompt = `You are Sandy, the University of Kentucky's AI communications assistant. You are revising an existing draft.

${INSTITUTIONAL_VOICE}

ORIGINAL SUBJECT: ${existing.subject ?? '(none)'}
ORIGINAL BODY:
${existing.body}

REVISION INSTRUCTION: ${instruction}

Revise the draft according to the instruction. Maintain the same communication type and tone unless the instruction says otherwise.

RESPOND IN THIS EXACT JSON FORMAT:
{
  "subject": "The revised subject line",
  "body": "The revised body in markdown"
}`

  const anthropic = getAnthropic()
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: instruction }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
  let parsed: { subject?: string; body?: string }

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  } catch {
    parsed = { body: rawText }
  }

  const newBody = parsed.body ?? existing.body

  // Re-run compliance on revised content
  const complianceResult = await checkCommunicationCompliance(newBody, existing.type)

  // Build revision history entry
  const revisionHistory = (existing.revisionHistory as Array<Record<string, unknown>>) ?? []
  revisionHistory.push({
    timestamp: new Date().toISOString(),
    changes: instruction,
    promptUsed: instruction,
  })

  return prisma.staffCommunication.update({
    where: { id: commId },
    data: {
      subject: parsed.subject ?? existing.subject,
      body: newBody,
      complianceFlags: complianceResult.flags.length > 0 ? (complianceResult.flags as unknown as Prisma.InputJsonValue) : undefined,
      revisionHistory: revisionHistory as unknown as Prisma.InputJsonValue,
      revisionCount: existing.revisionCount + 1,
    },
  })
}

/**
 * Generate Twitter, Instagram, and LinkedIn versions of a communication.
 * Uses Haiku for fast, lightweight social media adaptation.
 */
export async function generateSocialVersions(
  commId: string
): Promise<SocialVersions> {
  const comm = await prisma.staffCommunication.findUniqueOrThrow({
    where: { id: commId },
  })

  const systemPrompt = `You are Sandy, the University of Kentucky's social media assistant. Generate 3 platform-specific versions of the following university communication.

ORIGINAL COMMUNICATION:
Subject: ${comm.subject ?? ''}
Body: ${comm.body}

Generate these versions:
1. Twitter/X: ≤280 characters, 1-2 hashtags, casual but professional
2. Instagram: Caption style, 3-5 hashtags, warmer tone, emoji OK
3. LinkedIn: Professional, 100-150 words, institutional voice

RESPOND IN THIS EXACT JSON FORMAT:
{
  "twitter": "The tweet text",
  "instagram": "The Instagram caption",
  "linkedin": "The LinkedIn post"
}`

  const anthropic = getAnthropic()
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: 'Generate social media versions.' }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
  let versions: SocialVersions

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    versions = jsonMatch ? JSON.parse(jsonMatch[0]) : { twitter: '', instagram: '', linkedin: '' }
  } catch {
    versions = { twitter: '', instagram: '', linkedin: rawText }
  }

  // Save social versions to the communication
  await prisma.staffCommunication.update({
    where: { id: commId },
    data: { socialVersions: versions as unknown as Prisma.InputJsonValue },
  })

  return versions
}

/**
 * Submit a draft for approval. Updates status to "pending-review".
 */
export async function submitForApproval(
  commId: string
): Promise<Awaited<ReturnType<typeof prisma.staffCommunication.update>>> {
  return prisma.staffCommunication.update({
    where: { id: commId },
    data: { status: 'pending-review' },
  })
}

/**
 * Record an approval step. If all approvers have approved, the
 * communication status moves to "approved".
 */
export async function approveStep(
  commId: string,
  approverId: string
): Promise<Awaited<ReturnType<typeof prisma.staffCommunication.update>>> {
  const comm = await prisma.staffCommunication.findUniqueOrThrow({
    where: { id: commId },
  })

  const chain = (comm.approvalChain as ApprovalChainMember[] | null) ?? []

  // Find the approver in the chain (match by userId or first pending slot)
  const approverEntry = chain.find((a) => a.userId === approverId)
    ?? chain.find((a) => a.status === 'pending')

  if (approverEntry) {
    approverEntry.userId = approverId
    approverEntry.status = 'approved'
    approverEntry.reviewedAt = new Date().toISOString()
  }

  // Check if all approvers have approved
  const allApproved = chain.length > 0 && chain.every((a) => a.status === 'approved')

  return prisma.staffCommunication.update({
    where: { id: commId },
    data: {
      approvalChain: chain as unknown as Prisma.InputJsonValue,
      status: allApproved ? 'approved' : comm.status,
    },
  })
}

/**
 * Schedule a communication for future sending.
 * The communication must be approved (or not require approval).
 */
export async function scheduleCommunication(
  commId: string,
  scheduledFor: Date,
  scheduledBy: string
): Promise<Awaited<ReturnType<typeof prisma.staffCommunication.update>>> {
  const comm = await prisma.staffCommunication.findUniqueOrThrow({
    where: { id: commId },
  })

  const chain = (comm.approvalChain as ApprovalChainMember[] | null) ?? []
  const requiresApproval = chain.length > 0
  const isApproved = comm.status === 'approved'

  if (requiresApproval && !isApproved) {
    throw new Error('Communication must be approved before scheduling. Current status: ' + comm.status)
  }

  return prisma.staffCommunication.update({
    where: { id: commId },
    data: {
      scheduledFor,
      scheduledBy,
      status: 'approved', // keep approved status while scheduled
    },
  })
}

/**
 * Cancel a scheduled communication. Clears scheduledFor and scheduledBy.
 */
export async function cancelSchedule(
  commId: string
): Promise<Awaited<ReturnType<typeof prisma.staffCommunication.update>>> {
  return prisma.staffCommunication.update({
    where: { id: commId },
    data: {
      scheduledFor: null,
      scheduledBy: null,
    },
  })
}

/**
 * Mark a communication as sent. Verifies it's approved (or a non-regulated
 * draft that doesn't require approval).
 */
export async function sendCommunication(
  commId: string
): Promise<Awaited<ReturnType<typeof prisma.staffCommunication.update>>> {
  const comm = await prisma.staffCommunication.findUniqueOrThrow({
    where: { id: commId },
  })

  const chain = (comm.approvalChain as ApprovalChainMember[] | null) ?? []
  const requiresApproval = chain.length > 0
  const isApproved = comm.status === 'approved'

  if (requiresApproval && !isApproved) {
    throw new Error('Communication must be approved before sending. Current status: ' + comm.status)
  }

  const updated = await prisma.staffCommunication.update({
    where: { id: commId },
    data: {
      status: 'sent',
      sentAt: new Date(),
    },
  })

  // Audit log
  await prisma.assistantActionLog.create({
    data: {
      userId: comm.authorId,
      actionType: 'communication-sent',
      summary: `Sent communication: ${comm.subject ?? '(no subject)'}`,
      metadata: {
        communicationId: comm.id,
        type: comm.type,
        audience: comm.audienceDesc,
      },
    },
  })

  return updated
}

/**
 * List drafts for a user with optional filters.
 */
export async function getDrafts(
  userId: string,
  opts?: {
    status?: string[]
    type?: string[]
    limit?: number
    offset?: number
  }
): Promise<{ drafts: Awaited<ReturnType<typeof prisma.staffCommunication.findMany>>; total: number }> {
  const limit = opts?.limit ?? 50
  const offset = opts?.offset ?? 0

  const where = {
    authorId: userId,
    ...(opts?.status?.length ? { status: { in: opts.status } } : {}),
    ...(opts?.type?.length ? { type: { in: opts.type } } : {}),
  }

  const [drafts, total] = await Promise.all([
    prisma.staffCommunication.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    prisma.staffCommunication.count({ where }),
  ])

  return { drafts, total }
}

/**
 * Get a single communication by ID, scoped to the user.
 */
export async function getCommunication(commId: string, userId: string) {
  return prisma.staffCommunication.findFirst({
    where: { id: commId, authorId: userId },
  })
}

/**
 * Update a draft communication inline (subject, body, tone, audienceDesc).
 */
export async function updateDraft(
  commId: string,
  userId: string,
  updates: { subject?: string; body?: string; tone?: string; audienceDesc?: string }
) {
  const comm = await prisma.staffCommunication.findFirst({
    where: { id: commId, authorId: userId },
  })
  if (!comm) return null

  return prisma.staffCommunication.update({
    where: { id: commId },
    data: {
      ...(updates.subject !== undefined ? { subject: updates.subject } : {}),
      ...(updates.body !== undefined ? { body: updates.body } : {}),
      ...(updates.tone !== undefined ? { tone: updates.tone } : {}),
      ...(updates.audienceDesc !== undefined ? { audienceDesc: updates.audienceDesc } : {}),
    },
  })
}

/**
 * List communication templates with optional type/category filters.
 */
export async function getTemplates(opts?: {
  type?: string
  category?: string
}): Promise<Awaited<ReturnType<typeof prisma.staffCommunicationTemplate.findMany>>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (opts?.type) where.type = opts.type
  if (opts?.category) where.category = opts.category

  return prisma.staffCommunicationTemplate.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
}

/**
 * Create a communication from a template, filling in placeholder values.
 */
export async function createFromTemplate(
  templateId: string,
  authorId: string,
  filledValues: Record<string, string>
): Promise<Awaited<ReturnType<typeof prisma.staffCommunication.create>>> {
  const template = await prisma.staffCommunicationTemplate.findUniqueOrThrow({
    where: { id: templateId },
  })

  // Replace [PLACEHOLDER] tokens with provided values
  let subject = template.subject
  let body = template.body

  for (const [key, value] of Object.entries(filledValues)) {
    const token = new RegExp(`\\[${key}\\]`, 'gi')
    subject = subject.replace(token, value)
    body = body.replace(token, value)
  }

  return prisma.staffCommunication.create({
    data: {
      authorId,
      type: template.type,
      status: 'draft',
      subject,
      body,
      audienceDesc: template.audience,
      tone: template.tone,
      distributionList: [],
      originalPrompt: `Created from template: ${template.name}`,
      source: 'template',
    },
  })
}
