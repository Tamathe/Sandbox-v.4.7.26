import { prisma } from './prisma'
import type { User } from '../generated/prisma'
import { randomBytes } from 'crypto'

// ── G1: GDPR Data Export ────────────────────────────────────────────────────

export async function exportUserData(userId: string) {
  const [
    user,
    toolSessions,
    memories,
    notes,
    portfolioItems,
    complianceAuditLogs,
    courseEnrollments,
    interests,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        college: true,
        bio: true,
        personalContext: true,
        title: true,
        createdAt: true,
        tosAcceptedAt: true,
        dataConsentAt: true,
        ferpaAckAt: true,
        studyGroup: true,
        program: true,
        catalogYear: true,
        onboardingCompleted: true,
      },
    }),
    prisma.toolSession.findMany({
      where: { userId },
      select: {
        id: true,
        toolId: true,
        startedAt: true,
        endedAt: true,
        messageCount: true,
        summary: true,
        score: true,
        durationSeconds: true,
        hintCount: true,
        exitReason: true,
        conceptsTouched: true,
        chatMessages: {
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' as const },
        },
      },
      orderBy: { startedAt: 'desc' as const },
    }),
    prisma.userMemory.findMany({
      where: { userId },
      select: {
        id: true,
        category: true,
        content: true,
        source: true,
        createdAt: true,
      },
    }),
    prisma.studentNote.findMany({
      where: { userId },
      select: {
        id: true,
        courseId: true,
        content: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.portfolioItem.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        title: true,
        organization: true,
        description: true,
        skills: true,
        startDate: true,
        endDate: true,
        isVerified: true,
        metadata: true,
        createdAt: true,
      },
    }),
    prisma.complianceAuditLog.findMany({
      where: { userId },
      select: {
        id: true,
        action: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' as const },
    }),
    prisma.courseEnrollment.findMany({
      where: { studentId: userId },
      select: {
        id: true,
        courseId: true,
        enrolledAt: true,
        course: {
          select: {
            title: true,
            courseCode: true,
          },
        },
      },
    }),
    prisma.userInterest.findMany({
      where: { userId },
      select: {
        id: true,
        tag: true,
        source: true,
        accepted: true,
        addedAt: true,
      },
    }),
  ])

  return {
    exportedAt: new Date().toISOString(),
    profile: user,
    interests,
    toolSessions,
    memories,
    notes,
    portfolioItems,
    complianceAuditLogs,
    courseEnrollments,
  }
}

// ── G2: Right-to-Erasure ────────────────────────────────────────────────────

export async function eraseUserData(user: User) {
  const anonymizedEmail = `deleted-${randomBytes(8).toString('hex')}@erased.thesandbox.uky.edu`

  // Delete related data that should be fully removed
  await Promise.all([
    prisma.userMemory.deleteMany({ where: { userId: user.id } }),
    prisma.studentNote.deleteMany({ where: { userId: user.id } }),
    prisma.portfolioItem.deleteMany({ where: { userId: user.id } }),
    prisma.complianceAuditLog.deleteMany({ where: { userId: user.id } }),
    prisma.userInterest.deleteMany({ where: { userId: user.id } }),
  ])

  // Anonymize user record — preserves tool sessions for analytics
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: 'Deleted User',
      email: anonymizedEmail,
      bio: null,
      department: null,
      college: null,
      personalContext: null,
      title: null,
      avatarUrl: null,
      tosAcceptedAt: null,
      dataConsentAt: null,
      ferpaAckAt: null,
      suspended: true,
      suspendedReason: 'Account deleted by user request',
    },
  })

  // Log to AdminAuditLog
  await prisma.adminAuditLog.create({
    data: {
      adminId: user.id,
      action: 'user-data-erasure',
      targetType: 'User',
      targetLabel: user.email,
      metadata: {
        type: 'gdpr-erasure',
        originalEmail: user.email,
        anonymizedEmail,
        erasedAt: new Date().toISOString(),
      },
    },
  })

  return { anonymizedEmail }
}

// ── G3: Privacy Impact Assessment ───────────────────────────────────────────

export async function generatePrivacyImpactAssessment(toolId: string) {
  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    select: {
      id: true,
      name: true,
      systemPrompt: true,
      category: true,
      toolType: true,
      difficultyLevel: true,
      intendedAudience: true,
      shortDescription: true,
      audioEnabled: true,
      collabEnabled: true,
      isOfficialService: true,
      serviceProtocol: true,
      escalationEmail: true,
      creator: { select: { name: true, role: true } },
    },
  })

  if (!tool) return null

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()

  const systemPromptExcerpt = tool.systemPrompt
    ? tool.systemPrompt.slice(0, 4000)
    : '(No system prompt configured)'

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are a FERPA and data privacy compliance analyst for the University of Kentucky's AI platform.

Analyze the following AI tool configuration and generate a structured Privacy Impact Assessment (PIA) report.

TOOL CONFIGURATION:
- Name: ${tool.name}
- Type: ${tool.toolType}
- Category: ${tool.category}
- Intended Audience: ${tool.intendedAudience || 'Not specified'}
- Description: ${tool.shortDescription || 'Not specified'}
- Audio Enabled: ${tool.audioEnabled ? 'Yes' : 'No'}
- Collaboration Enabled: ${tool.collabEnabled ? 'Yes' : 'No'}
- Official Service: ${tool.isOfficialService ? 'Yes' : 'No'}
- Service Protocol: ${tool.serviceProtocol || 'N/A'}
- Created By: ${tool.creator.name} (${tool.creator.role})

SYSTEM PROMPT:
${systemPromptExcerpt}

Generate the PIA report in exactly this JSON format (no markdown, only valid JSON):
{
  "dataCollected": ["list of data types this tool likely collects from students"],
  "retentionImplications": "description of data retention considerations",
  "ferpaConsiderations": "specific FERPA compliance notes for this tool",
  "riskRating": "LOW or MEDIUM or HIGH",
  "riskJustification": "brief explanation of the risk rating",
  "recommendedMitigations": ["list of recommended actions to reduce privacy risk"]
}`,
      },
    ],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from AI')
  }

  // Parse the JSON from the response
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Could not parse PIA report from AI response')
  }

  const report = JSON.parse(jsonMatch[0]) as {
    dataCollected: string[]
    retentionImplications: string
    ferpaConsiderations: string
    riskRating: string
    riskJustification: string
    recommendedMitigations: string[]
  }

  return {
    toolId: tool.id,
    toolName: tool.name,
    generatedAt: new Date().toISOString(),
    ...report,
  }
}
