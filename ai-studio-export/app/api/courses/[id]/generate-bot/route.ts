import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

const KNOWLEDGE_CHAR_BUDGET = 120_000

function buildKnowledgeBlock(
  materials: Array<{ title: string; content: string; moduleNumber: number | null }>
) {
  let remainingBudget = KNOWLEDGE_CHAR_BUDGET

  return materials
    .map((material) => {
      if (remainingBudget <= 0) return null

      const sectionTitle = `${material.moduleNumber ? `Module ${material.moduleNumber}: ` : ''}${material.title}`
      const limit = Math.min(material.content.length, remainingBudget)
      const cutPoint = material.content.lastIndexOf('\n\n', limit) > 0
        ? material.content.lastIndexOf('\n\n', limit)
        : limit

      remainingBudget -= cutPoint

      return `### ${sectionTitle}\n${material.content.slice(0, cutPoint)}`
    })
    .filter((section): section is string => !!section)
    .join('\n\n')
}

function buildTeachingAssistantPrompt(courseName: string, knowledgeBlock: string) {
  return `You are an AI Teaching Assistant for the course "${courseName}".
Your role is to help students understand the material, answer questions, and guide their thinking.
You do not give direct answers to graded assessment questions.

COURSE KNOWLEDGE:
${knowledgeBlock}

Always cite which part of the course material your answer comes from. If the answer is not in the course materials, say so clearly and encourage the student to check with their instructor.`
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['EDUCATOR', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: courseId } = await params
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        materials: {
          orderBy: [{ moduleNumber: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            title: true,
            content: true,
            moduleNumber: true,
            isVisible: true,
          },
        },
      },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const canManageCourse = user.role === 'ADMIN' || course.instructorId === user.id
    if (!canManageCourse) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Return existing bot if one is already linked to this course
    const existingBotLink = await prisma.courseToolLink.findFirst({
      where: {
        courseId: course.id,
        tool: { toolType: 'CHATBOT' },
      },
      select: { toolId: true },
    })
    if (existingBotLink) {
      return NextResponse.json({ toolId: existingBotLink.toolId, alreadyExists: true })
    }

    const visibleMaterials = course.materials.filter(
      (material: { isVisible: boolean }) => material.isVisible
    )
    const materialsForBot = visibleMaterials.length > 0 ? visibleMaterials : course.materials

    if (materialsForBot.length === 0) {
      return NextResponse.json({ error: 'Upload course materials first' }, { status: 400 })
    }

    const knowledgeBlock = buildKnowledgeBlock(materialsForBot)
    const tool = await prisma.tool.create({
      data: {
        name: `${course.title} Teaching Assistant`,
        shortDescription: `Course-specific AI teaching assistant for ${course.courseCode}.`,
        fullDescription: `A draft AI teaching assistant generated from the materials in ${course.courseCode}. It helps students understand course content, cite the relevant source material, and stay grounded in what the instructor uploaded.`,
        category: 'General',
        difficultyLevel: 'Introductory',
        toolType: 'CHATBOT',
        systemPrompt: buildTeachingAssistantPrompt(course.title, knowledgeBlock),
        personaName: 'Sandy',
        welcomeMessage: `Hi! I'm the AI Teaching Assistant for ${course.courseCode}. Ask me about the course materials, and I'll help you work through the concepts step by step.`,
        starterQuestions: [
          'What are the biggest ideas in this course so far?',
          'Can you help me review the latest module?',
          'What should I study first before the next assignment?',
        ],
        learningObjectives: [
          'Help students review and understand uploaded course materials',
          'Point students back to the most relevant course source',
          'Support guided study without giving away graded answers',
        ],
        intendedAudience: `Students enrolled in ${course.courseCode}`,
        referenceDocUrls: [],
        published: false,
        approvalStatus: 'COMMUNITY',
        creatorId: user.id,
      },
    })

    await prisma.courseToolLink.create({
      data: {
        courseId: course.id,
        toolId: tool.id,
      },
    })

    return NextResponse.json({ toolId: tool.id })
  } catch (error) {
    console.error('POST /api/courses/[id]/generate-bot error:', error)
    return NextResponse.json({ error: 'Failed to create teaching assistant' }, { status: 500 })
  }
}
