import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { PlatformQuestType } from '../../generated/prisma'
import { awardQuestProgress } from '../../lib/platform-quests'
import { parseRequestBody } from '../../lib/server-auth'
import { validateBody } from '../../lib/validate'
import { CreateSessionSchema } from '../../lib/schemas'

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(CreateSessionSchema, parsed.data)
    if ('error' in validation) return validation.error
    const { toolId, courseId } = validation.value

    const tool = await prisma.tool.findUnique({ where: { id: toolId } })
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    const userEmail = req.headers.get('x-demo-user-email')
    let userId: string | null = null
    if (userEmail) {
      const user = await prisma.user.findUnique({ where: { email: userEmail } })
      if (user) userId = user.id
    }

    const session = await prisma.toolSession.create({
      data: {
        toolId,
        courseId: courseId || null,
        userId,
        messageCount: 0,
      },
    })

    if (userId) {
      await prisma.challenge.updateMany({
        where: {
          challengedId: userId,
          toolId,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
        data: { status: 'ACCEPTED' },
      }).catch(() => {})
    }

    if (userId) {
      await awardQuestProgress(
        userId,
        courseId ? PlatformQuestType.COMPLETE_COURSE_TOOL : PlatformQuestType.LAUNCH_MARKETPLACE_TOOL
      ).catch(() => {})
    }

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error('POST /api/sessions error:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
