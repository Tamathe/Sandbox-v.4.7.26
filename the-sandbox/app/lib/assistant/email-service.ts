// ─── Email Intelligence Service ──────────────────────────────
// Inbox summary, categorization, and contextual draft generation.
// Sandy drafts replies using Sandbox data — never auto-sends.

import { prisma } from '../prisma'
import Anthropic from '@anthropic-ai/sdk'
import { getEmailProvider } from './providers'
import type { Email, EmailCategorySummary } from './providers'
import { getToneInstruction } from './email-tone-drift-service'

const anthropic = new Anthropic()

// ─── Inbox Summary ───────────────────────────────────────────

export async function getInboxSummary(userId: string): Promise<EmailCategorySummary> {
  const email = await getEmailProvider()
  return email.categorizeInbox(userId)
}

export async function getInbox(
  userId: string,
  opts?: { category?: string; limit?: number }
): Promise<Email[]> {
  const email = await getEmailProvider()
  return email.getInbox(userId, opts)
}

export async function getEmailById(userId: string, emailId: string) {
  return prisma.assistantEmail.findFirst({
    where: { id: emailId, userId },
    include: { drafts: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })
}

export async function getThread(userId: string, threadId: string): Promise<Email[]> {
  const email = await getEmailProvider()
  return email.getThread(userId, threadId)
}

// ─── Draft Reply ─────────────────────────────────────────────

export async function draftReply(input: {
  userId: string
  emailId: string
  instruction?: string
}): Promise<{ draft: Awaited<ReturnType<typeof prisma.assistantEmailDraft.create>>; context: string }> {
  // 1. Fetch the email
  const email = await prisma.assistantEmail.findFirst({
    where: { id: input.emailId, userId: input.userId },
  })
  if (!email) throw new Error('Email not found')

  // 2. Fetch thread context if available
  let threadContext = ''
  if (email.threadId) {
    const thread = await prisma.assistantEmail.findMany({
      where: { userId: input.userId, threadId: email.threadId },
      orderBy: { receivedAt: 'asc' },
    })
    if (thread.length > 1) {
      threadContext = thread
        .map(t => `From: ${t.fromName}\nDate: ${t.receivedAt.toLocaleDateString()}\n${t.body}`)
        .join('\n---\n')
    }
  }

  // 3. If sender is a platform user, pull their Sandbox data
  let senderContext = ''
  const senderUser = await prisma.user.findUnique({
    where: { email: email.fromAddress },
    include: {
      courseEnrollments: {
        select: { course: { select: { courseCode: true, title: true } } },
        take: 5,
      },
      toolSessions: {
        orderBy: { startedAt: 'desc' },
        take: 3,
        include: { tool: { select: { name: true } } },
      },
    },
  })

  if (senderUser) {
    senderContext = `\n## Sender's Sandbox Profile
- Name: ${senderUser.name}
- Role: ${senderUser.role}
- Department: ${senderUser.department ?? 'N/A'}
- Enrolled courses: ${senderUser.courseEnrollments.map((e: { course: { courseCode: string } }) => e.course.courseCode).join(', ') || 'None'}
- Recent tool sessions: ${senderUser.toolSessions.map((s: { tool: { name: string } | null; score: number | null }) => `${s.tool?.name ?? 'Unknown'} (score: ${s.score ?? 'N/A'})`).join(', ') || 'None'}`
  }

  // 4. Fetch user's email rules + tone context in parallel
  const [rules, toneInstruction, user] = await Promise.all([
    prisma.assistantRule.findMany({
      where: { userId: input.userId, ruleType: 'email-auto-draft', isActive: true },
    }),
    getToneInstruction(input.userId),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { name: true, role: true, department: true },
    }),
  ])

  const rulesContext = rules.length > 0
    ? `\n## User's Email Rules\n${rules.map(r => `- ${r.naturalText}`).join('\n')}`
    : ''

  const toneInstructions = toneInstruction
    ? `\n## Tone Matching\n${toneInstruction}`
    : ''

  // 6. Generate draft via Sonnet
  const contextUsed = [
    threadContext ? 'Email thread history' : null,
    senderContext ? "Sender's platform data (progress, enrollments)" : null,
    rulesContext ? 'Email response rules' : null,
    toneInstruction ? "User's writing style baseline" : null,
  ].filter(Boolean).join(', ')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: `You are Sandy, drafting an email reply for ${user?.name ?? 'the user'} (${user?.role ?? 'Educator'}, ${user?.department ?? 'University of Kentucky'}).

Write a professional, warm email reply. Use the sender's Sandbox data when relevant (e.g., reference their actual course enrollment or progress when discussing academic matters).

Guidelines:
- Match the formality of the original email
- Be concise but thorough
- If the user provided special instructions, follow them
- Sign off as "${user?.name ?? 'the user'}" (not Sandy)
- Do NOT include a subject line — just the body
${rulesContext}${toneInstructions}`,
    messages: [{
      role: 'user',
      content: `Original email from ${email.fromName} (${email.fromAddress}):
Subject: ${email.subject}

${email.body}
${threadContext ? `\n## Thread History\n${threadContext}` : ''}
${senderContext}
${input.instruction ? `\n## Special Instructions\n${input.instruction}` : ''}

Draft a reply.`,
    }],
  })

  const draftBody = response.content[0].type === 'text' ? response.content[0].text : ''

  // 7. Save draft
  const draft = await prisma.assistantEmailDraft.create({
    data: {
      emailId: input.emailId,
      userId: input.userId,
      body: draftBody,
      status: 'pending',
      context: contextUsed || null,
    },
  })

  // 8. Log action
  await prisma.assistantActionLog.create({
    data: {
      userId: input.userId,
      actionType: 'email-draft',
      summary: `Drafted reply to "${email.subject}" from ${email.fromName}`,
      metadata: {
        emailId: email.id,
        draftId: draft.id,
        contextUsed,
      },
    },
  })

  return { draft, context: contextUsed }
}

// ─── Draft Management ────────────────────────────────────────

export async function approveDraft(draftId: string, userId: string) {
  return prisma.assistantEmailDraft.update({
    where: { id: draftId, userId },
    data: { status: 'approved' },
  })
}

export async function discardDraft(draftId: string, userId: string) {
  return prisma.assistantEmailDraft.update({
    where: { id: draftId, userId },
    data: { status: 'discarded' },
  })
}

export async function getPendingDrafts(userId: string) {
  return prisma.assistantEmailDraft.findMany({
    where: { userId, status: 'pending' },
    include: { email: { select: { subject: true, fromName: true } } },
    orderBy: { createdAt: 'desc' },
  })
}
