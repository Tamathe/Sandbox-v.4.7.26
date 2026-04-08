import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const email = req.headers.get('x-demo-user-email')
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const session = await prisma.buildSession.findUnique({
      where: { id: sessionId },
      include: { documents: true },
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    if (session.creatorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const spec = body.spec

    if (!spec?.name || !spec?.toolType) {
      return NextResponse.json({ error: 'spec.name and spec.toolType are required' }, { status: 400 })
    }

    // Build knowledge base summary from documents
    const docContext = session.documents.length > 0
      ? `\n\n## Knowledge Base\n${session.documents.map((d: { filename: string; content: string }) => `### ${d.filename}\n${d.content.slice(0, 3000)}`).join('\n\n')}`
      : ''

    const tool = await prisma.tool.create({
      data: {
        name: spec.name,
        shortDescription: spec.shortDescription || spec.name,
        fullDescription: spec.fullDescription || spec.shortDescription || spec.name,
        category: spec.category || 'General',
        difficultyLevel: spec.difficultyLevel || 'Introductory',
        toolType: spec.toolType,
        systemPrompt: (spec.systemPrompt || '') + docContext,
        personaName: spec.personaName || spec.persona?.name || null,
        personaAvatar: spec.personaAvatar || null,
        welcomeMessage: spec.welcomeMessage || null,
        starterQuestions: spec.starterQuestions || [],
        learningObjectives: spec.learningObjectives || [],
        intendedAudience: spec.intendedAudience || null,
        published: true,
        creatorId: user.id,
      },
    })

    // Attach documents to the published tool
    if (session.documents.length > 0) {
      await prisma.toolDocument.updateMany({
        where: { sessionId },
        data: { toolId: tool.id },
      })
    }

    // Mark session as published
    await prisma.buildSession.update({
      where: { id: sessionId },
      data: { status: 'PUBLISHED', title: spec.name, toolSpec: spec },
    })

    return NextResponse.json({ toolId: tool.id, sessionId })
  } catch (err) {
    console.error('POST /api/builder/[sessionId]/publish error:', err)
    return NextResponse.json({ error: 'Failed to publish tool' }, { status: 500 })
  }
}
