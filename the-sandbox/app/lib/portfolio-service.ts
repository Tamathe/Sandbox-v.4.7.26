import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import { randomBytes } from 'crypto'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonInput = any

// ── Types ────────────────────────────────────────────────────────────────────

interface ArtifactAnalysis {
  summary: string
  skills: string[]
  bloomLevel: number
  strengths: string[]
  suggestedCompetencies: {
    competencyCode: string
    evidenceStrength: number
    rationale: string
  }[]
}

export interface CompetencyCoverage {
  competencyId: string
  code: string
  title: string
  category: string | null
  artifactCount: number
  avgBloomLevel: number
  avgEvidenceStrength: number
  status: 'demonstrated' | 'partial' | 'not_demonstrated'
}

export interface CohortCoverageReport {
  program: string
  totalStudents: number
  competencies: {
    competencyId: string
    code: string
    title: string
    studentsWithEvidence: number
    avgBloom: number
    status: 'met' | 'approaching' | 'not_met'
  }[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return fallback
  }
}

// ── Portfolio CRUD ───────────────────────────────────────────────────────────

export async function getOrCreatePortfolio(userId: string) {
  let portfolio = await prisma.portfolio.findFirst({ where: { userId } })
  if (!portfolio) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })
    portfolio = await prisma.portfolio.create({
      data: {
        userId,
        title: `${user?.name ?? 'My'}'s Portfolio`,
      },
    })
  }
  return prisma.portfolio.findUnique({
    where: { id: portfolio.id },
    include: {
      artifacts: {
        orderBy: [{ featured: 'desc' }, { orderIndex: 'asc' }],
        include: {
          mappings: { include: { competency: true } },
          course: { select: { courseCode: true, title: true } },
        },
      },
    },
  })
}

export async function updatePortfolio(
  portfolioId: string,
  userId: string,
  updates: { title?: string; bio?: string }
) {
  const portfolio = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId } })
  if (!portfolio) throw new Error('Portfolio not found')

  return prisma.portfolio.update({
    where: { id: portfolioId },
    data: updates,
  })
}

// ── Artifact Management ──────────────────────────────────────────────────────

export async function addArtifact(
  portfolioId: string,
  userId: string,
  data: {
    title: string
    description?: string
    sourceType: string
    sourceId?: string
    courseId?: string
    content?: string
  }
) {
  const portfolio = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId } })
  if (!portfolio) throw new Error('Portfolio not found')

  const count = await prisma.portfolioArtifact.count({ where: { portfolioId } })

  return prisma.portfolioArtifact.create({
    data: {
      portfolioId,
      title: data.title,
      description: data.description,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      courseId: data.courseId,
      content: data.content,
      orderIndex: count,
    },
  })
}

export async function importFromSessions(
  portfolioId: string,
  userId: string,
  sessionIds: string[]
) {
  const portfolio = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId } })
  if (!portfolio) throw new Error('Portfolio not found')

  const sessions = await prisma.toolSession.findMany({
    where: { id: { in: sessionIds }, userId },
    include: {
      tool: { select: { name: true } },
      course: { select: { id: true, courseCode: true, title: true } },
    },
  })

  const artifacts = []
  const existingCount = await prisma.portfolioArtifact.count({ where: { portfolioId } })

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i]

    // Extract content from chat messages
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      take: 30,
    })

    const content = messages
      .filter((m) => m.role === 'assistant')
      .map((m) => m.content)
      .join('\n\n')
      .slice(0, 10000)

    const artifact = await prisma.portfolioArtifact.create({
      data: {
        portfolioId,
        title: `${session.tool?.name ?? 'Tool Session'} — ${session.course?.courseCode ?? 'General'}`,
        description: session.summary ?? session.notes,
        sourceType: 'tool_session',
        sourceId: session.id,
        courseId: session.courseId,
        content,
        bloomLevel: session.bloomLevel,
        orderIndex: existingCount + i,
      },
    })

    artifacts.push(artifact)
  }

  return artifacts
}

export async function updateArtifact(
  artifactId: string,
  userId: string,
  updates: { title?: string; description?: string; reflection?: string; featured?: boolean }
) {
  const artifact = await prisma.portfolioArtifact.findUnique({
    where: { id: artifactId },
    include: { portfolio: { select: { userId: true } } },
  })
  if (!artifact || artifact.portfolio.userId !== userId) throw new Error('Not found')

  return prisma.portfolioArtifact.update({
    where: { id: artifactId },
    data: updates,
  })
}

export async function deleteArtifact(artifactId: string, userId: string) {
  const artifact = await prisma.portfolioArtifact.findUnique({
    where: { id: artifactId },
    include: { portfolio: { select: { userId: true } } },
  })
  if (!artifact || artifact.portfolio.userId !== userId) throw new Error('Not found')

  await prisma.portfolioArtifact.delete({ where: { id: artifactId } })
}

// ── AI Analysis ──────────────────────────────────────────────────────────────

export async function analyzeArtifact(artifactId: string, userId: string) {
  const artifact = await prisma.portfolioArtifact.findUnique({
    where: { id: artifactId },
    include: {
      portfolio: { select: { userId: true } },
      course: { select: { courseCode: true, title: true } },
    },
  })
  if (!artifact || artifact.portfolio.userId !== userId) throw new Error('Not found')

  // Gather content
  let content = artifact.content || ''
  if (!content && artifact.sourceType === 'tool_session' && artifact.sourceId) {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: artifact.sourceId },
      orderBy: { createdAt: 'asc' },
      take: 30,
    })
    content = messages
      .filter((m) => m.role === 'assistant')
      .map((m) => m.content)
      .join('\n\n')
      .slice(0, 8000)
  }

  if (!content) throw new Error('No content to analyze')

  // Fetch available frameworks
  const frameworks = await prisma.competencyFramework.findMany({
    where: { isActive: true },
    include: { competencies: { orderBy: { orderIndex: 'asc' } } },
  })

  const frameworkList = frameworks
    .flatMap((f) =>
      f.competencies.map(
        (c) =>
          `[${c.code}] ${c.title} (${c.category ?? 'General'}, min Bloom: ${c.bloomFloor}) — ${c.description.slice(0, 100)}`
      )
    )
    .join('\n')

  // Fetch student mastery context
  const masteries = await prisma.studentConceptMastery.findMany({
    where: { userId },
    orderBy: { masteryLevel: 'desc' },
    take: 10,
    select: { concept: true, masteryLevel: true },
  })
  const topConcepts = masteries.map((m) => `${m.concept} (${Math.round(m.masteryLevel * 100)}%)`).join(', ')

  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: `You are an academic portfolio analyst and competency mapping specialist.
Analyze this student artifact and assess:
1. What skills and knowledge does this artifact demonstrate?
2. At what Bloom's taxonomy level does the student operate? (1-6)
3. Which competencies from the provided framework(s) does this artifact provide evidence for?
4. What are the strengths of this artifact?

Available competency frameworks:
${frameworkList || '(no frameworks loaded)'}

Student context:
- Course: ${artifact.course?.courseCode ?? 'General'} — ${artifact.course?.title ?? ''}
- Known strengths: ${topConcepts || 'unknown'}

Return ONLY JSON:
{
  "summary": "2-3 sentence summary",
  "skills": ["skill1", "skill2"],
  "bloomLevel": 3,
  "strengths": ["strength1", "strength2"],
  "suggestedCompetencies": [
    { "competencyCode": "QEP-CT-1", "evidenceStrength": 0.7, "rationale": "This artifact demonstrates..." }
  ]
}`,
    messages: [{ role: 'user', content: `Artifact: "${artifact.title}"\n${artifact.description ? `Description: ${artifact.description}\n` : ''}\nContent:\n${content.slice(0, 8000)}` }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const analysis = safeJsonParse<ArtifactAnalysis>(text, {
    summary: 'Analysis could not be completed.',
    skills: [],
    bloomLevel: 1,
    strengths: [],
    suggestedCompetencies: [],
  })

  // Save analysis
  await prisma.portfolioArtifact.update({
    where: { id: artifactId },
    data: {
      aiAnalysis: analysis as JsonInput,
      bloomLevel: analysis.bloomLevel,
    },
  })

  // Create competency mappings
  for (const sc of analysis.suggestedCompetencies) {
    // Find competency by code
    const competency = await prisma.competency.findFirst({
      where: { code: sc.competencyCode },
    })
    if (!competency) continue

    await prisma.artifactCompetencyMapping.upsert({
      where: { artifactId_competencyId: { artifactId, competencyId: competency.id } },
      create: {
        artifactId,
        competencyId: competency.id,
        evidenceStrength: sc.evidenceStrength,
        bloomLevel: analysis.bloomLevel,
        aiRationale: sc.rationale,
        source: 'ai',
      },
      update: {
        evidenceStrength: sc.evidenceStrength,
        bloomLevel: analysis.bloomLevel,
        aiRationale: sc.rationale,
      },
    })
  }

  return analysis
}

// ── Reflection Generation ────────────────────────────────────────────────────

export async function generateReflection(artifactId: string, userId: string) {
  const artifact = await prisma.portfolioArtifact.findUnique({
    where: { id: artifactId },
    include: {
      portfolio: { select: { userId: true } },
      mappings: { include: { competency: true } },
      course: { select: { courseCode: true, title: true } },
    },
  })
  if (!artifact || artifact.portfolio.userId !== userId) throw new Error('Not found')

  const analysis = artifact.aiAnalysis as unknown as ArtifactAnalysis | null
  const competencyLines = artifact.mappings
    .map((m) => `- ${m.competency.code}: ${m.competency.title} (${m.aiRationale})`)
    .join('\n')

  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: `You are helping a university student write a reflective narrative for their portfolio.
The student created this artifact in ${artifact.course?.courseCode ?? 'a course'}.

Artifact: "${artifact.title}"
${artifact.description ? `Description: ${artifact.description}` : ''}
${analysis ? `Analysis: ${analysis.summary}` : ''}

Competencies demonstrated:
${competencyLines || '(none mapped yet)'}

Write a 3-4 sentence reflective narrative in FIRST PERSON that:
1. Describes what the student learned or accomplished
2. Connects the work to a broader skill or competency
3. Shows growth or insight

Write warmly and authentically — this should sound like a real student, not a robot.
Return ONLY the narrative text, no JSON.`,
    messages: [{ role: 'user', content: 'Generate a reflective narrative for this artifact.' }],
  })

  const reflection = response.content[0].type === 'text' ? response.content[0].text : ''

  await prisma.portfolioArtifact.update({
    where: { id: artifactId },
    data: { reflection },
  })

  return { reflection }
}

// ── Publishing ───────────────────────────────────────────────────────────────

export async function publishPortfolio(portfolioId: string, userId: string) {
  const portfolio = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId } })
  if (!portfolio) throw new Error('Portfolio not found')

  const shareToken = portfolio.shareToken || randomBytes(16).toString('hex')

  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: { isPublic: true, shareToken },
  })

  return { shareToken, publicUrl: `/portfolio/view/${shareToken}` }
}

export async function unpublishPortfolio(portfolioId: string, userId: string) {
  const portfolio = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId } })
  if (!portfolio) throw new Error('Portfolio not found')

  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: { isPublic: false },
  })
}

export async function getPublicPortfolio(shareToken: string) {
  return prisma.portfolio.findUnique({
    where: { shareToken },
    include: {
      user: { select: { name: true, department: true, college: true, avatarUrl: true } },
      artifacts: {
        where: { featured: true },
        orderBy: { orderIndex: 'asc' },
        include: {
          mappings: { include: { competency: true } },
          course: { select: { courseCode: true } },
        },
      },
    },
  })
}

// ── Competency Coverage ──────────────────────────────────────────────────────

export async function getCompetencyCoverage(
  userId: string,
  frameworkId: string
): Promise<CompetencyCoverage[]> {
  const competencies = await prisma.competency.findMany({
    where: { frameworkId },
    include: {
      mappings: {
        where: { artifact: { portfolio: { userId } } },
        select: { bloomLevel: true, evidenceStrength: true },
      },
    },
    orderBy: { orderIndex: 'asc' },
  })

  return competencies.map((comp) => {
    const m = comp.mappings
    const count = m.length
    const avgBloom = count > 0 ? m.reduce((s, x) => s + x.bloomLevel, 0) / count : 0
    const avgStrength = count > 0 ? m.reduce((s, x) => s + x.evidenceStrength, 0) / count : 0

    let status: 'demonstrated' | 'partial' | 'not_demonstrated'
    if (count >= 2 && avgBloom >= comp.bloomFloor && avgStrength >= 0.6) {
      status = 'demonstrated'
    } else if (count >= 1) {
      status = 'partial'
    } else {
      status = 'not_demonstrated'
    }

    return {
      competencyId: comp.id,
      code: comp.code,
      title: comp.title,
      category: comp.category,
      artifactCount: count,
      avgBloomLevel: Math.round(avgBloom * 10) / 10,
      avgEvidenceStrength: Math.round(avgStrength * 100) / 100,
      status,
    }
  })
}

// ── Cohort Coverage (Admin) ──────────────────────────────────────────────────

export async function getCohortCoverage(
  program: string,
  frameworkId: string
): Promise<CohortCoverageReport> {
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT', program },
    select: { id: true },
  })

  const studentIds = students.map((s) => s.id)

  const competencies = await prisma.competency.findMany({
    where: { frameworkId },
    include: {
      mappings: {
        where: {
          artifact: { portfolio: { userId: { in: studentIds } } },
          evidenceStrength: { gte: 0.5 },
        },
        select: {
          bloomLevel: true,
          artifact: { select: { portfolio: { select: { userId: true } } } },
        },
      },
    },
    orderBy: { orderIndex: 'asc' },
  })

  return {
    program,
    totalStudents: students.length,
    competencies: competencies.map((comp) => {
      const uniqueStudents = new Set(
        comp.mappings.map((m) => m.artifact.portfolio.userId)
      )

      return {
        competencyId: comp.id,
        code: comp.code,
        title: comp.title,
        studentsWithEvidence: uniqueStudents.size,
        avgBloom: comp.mappings.length > 0
          ? comp.mappings.reduce((s, m) => s + m.bloomLevel, 0) / comp.mappings.length
          : 0,
        status:
          students.length > 0 && uniqueStudents.size / students.length >= 0.8
            ? 'met' as const
            : students.length > 0 && uniqueStudents.size / students.length >= 0.5
              ? 'approaching' as const
              : 'not_met' as const,
      }
    }),
  }
}

// ── Framework Seeding ────────────────────────────────────────────────────────

export async function seedQEPFramework() {
  const existing = await prisma.competencyFramework.findUnique({
    where: { slug: 'uk-qep-2025' },
  })
  if (existing) return existing

  return prisma.competencyFramework.create({
    data: {
      name: 'UK Quality Enhancement Plan 2025',
      slug: 'uk-qep-2025',
      description: 'University of Kentucky institutional competency framework for student learning outcomes.',
      source: 'institutional',
      competencies: {
        create: [
          { code: 'QEP-CT-1', title: 'Critical Thinking — Analysis', description: 'Students analyze complex problems by identifying key components, assumptions, and relationships.', category: 'Critical Thinking', bloomFloor: 4, orderIndex: 0 },
          { code: 'QEP-CT-2', title: 'Critical Thinking — Evaluation', description: 'Students evaluate arguments, evidence, and claims using logical reasoning and appropriate criteria.', category: 'Critical Thinking', bloomFloor: 5, orderIndex: 1 },
          { code: 'QEP-CM-1', title: 'Written Communication', description: 'Students produce clear, well-organized written work appropriate to the discipline and audience.', category: 'Communication', bloomFloor: 3, orderIndex: 2 },
          { code: 'QEP-CM-2', title: 'Oral Communication', description: 'Students deliver effective oral presentations that communicate ideas clearly and persuasively.', category: 'Communication', bloomFloor: 3, orderIndex: 3 },
          { code: 'QEP-QL-1', title: 'Quantitative Literacy', description: 'Students interpret and use quantitative data to make informed decisions and support arguments.', category: 'Quantitative Literacy', bloomFloor: 3, orderIndex: 4 },
          { code: 'QEP-IL-1', title: 'Information Literacy', description: 'Students locate, evaluate, and ethically use information from diverse sources.', category: 'Information Literacy', bloomFloor: 3, orderIndex: 5 },
          { code: 'QEP-TC-1', title: 'Teamwork & Collaboration', description: 'Students contribute productively to team projects, demonstrating leadership and cooperation.', category: 'Teamwork', bloomFloor: 3, orderIndex: 6 },
          { code: 'QEP-PS-1', title: 'Problem Solving', description: 'Students design and implement effective solutions to complex, multi-step problems.', category: 'Problem Solving', bloomFloor: 4, orderIndex: 7 },
          { code: 'QEP-RL-1', title: 'Research & Inquiry', description: 'Students formulate research questions, gather evidence, and draw conclusions using appropriate methods.', category: 'Research', bloomFloor: 4, orderIndex: 8 },
          { code: 'QEP-EL-1', title: 'Ethical Reasoning', description: 'Students recognize and analyze ethical issues, applying frameworks to make reasoned judgments.', category: 'Ethics', bloomFloor: 4, orderIndex: 9 },
        ],
      },
    },
    include: { competencies: true },
  })
}
