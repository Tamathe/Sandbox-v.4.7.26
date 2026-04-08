import { NextRequest, NextResponse } from 'next/server'

import { getPrismaClient } from '../../../../lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userEmail = req.headers.get('x-demo-user-email')
  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const prisma = getPrismaClient()

  const [user, tool] = await Promise.all([
    prisma.user.findUnique({ where: { email: userEmail } }),
    prisma.tool.findUnique({ where: { id } }),
  ])

  if (!user || !tool) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const toolSpec = {
    name: `${tool.name} (Fork)`,
    shortDescription: tool.shortDescription,
    fullDescription: tool.fullDescription,
    category: tool.category,
    difficultyLevel: tool.difficultyLevel,
    estimatedMinutes: tool.estimatedMinutes,
    toolType: tool.toolType,
    systemPrompt: tool.systemPrompt,
    personaName: tool.personaName,
    personaAvatar: tool.personaAvatar,
    welcomeMessage: tool.welcomeMessage,
    starterQuestions: tool.starterQuestions,
    learningObjectives: tool.learningObjectives,
    intendedAudience: tool.intendedAudience,
    forkedFromId: tool.id,
    forkedFromName: tool.name,
    ready: true,
  }

  const session = await prisma.buildSession.create({
    data: {
      creatorId: user.id,
      title: `Fork of ${tool.name}`,
      toolSpec,
      status: 'active',
    },
  })

  return NextResponse.json({ sessionId: session.id })
}
