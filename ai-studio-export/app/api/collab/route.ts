import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { parseRequestBody } from '../../lib/server-auth'
import { validateBody } from '../../lib/validate'

const CreateCollabRequestBodySchema = z.object({
  toolId: z.string().min(1),
  message: z.string().min(1).max(2000),
})

export async function GET(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const status = req.nextUrl.searchParams.get('status') || 'OPEN'
    const mine = req.nextUrl.searchParams.get('mine') === 'true'

    const requests = await prisma.collabRequest.findMany({
      where: {
        ...(status ? { status: status as 'OPEN' | 'CLOSED' } : {}),
        ...(mine ? { requesterId: currentUser.id } : { requesterId: { not: currentUser.id } }),
      },
      include: {
        tool: {
          select: {
            id: true,
            name: true,
            shortDescription: true,
            category: true,
            toolType: true,
          },
        },
        requester: {
          select: {
            name: true,
            department: true,
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('GET /api/collab error:', error)
    return NextResponse.json({ error: 'Failed to fetch collaboration requests' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(CreateCollabRequestBodySchema, parsed.data)
    if ('error' in validation) return validation.error
    const { toolId, message } = validation.value

    const tool = await prisma.tool.findUnique({ where: { id: toolId } })
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }
    if (tool.creatorId !== currentUser.id) {
      return NextResponse.json({ error: 'You can only request review for your own drafts' }, { status: 403 })
    }
    if (tool.published) {
      return NextResponse.json({ error: 'Only unpublished tools can be submitted for collaboration' }, { status: 400 })
    }

    const existingOpenRequest = await prisma.collabRequest.findFirst({
      where: {
        toolId,
        status: 'OPEN',
      },
    })
    if (existingOpenRequest) {
      return NextResponse.json({ error: 'An open review request already exists for this tool' }, { status: 409 })
    }

    const requestRecord = await prisma.collabRequest.create({
      data: {
        toolId,
        requesterId: currentUser.id,
        message: message.trim(),
      },
      include: {
        tool: {
          select: {
            id: true,
            name: true,
            shortDescription: true,
            category: true,
            toolType: true,
          },
        },
        requester: {
          select: {
            name: true,
            department: true,
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    })

    return NextResponse.json({ request: requestRecord }, { status: 201 })
  } catch (error) {
    console.error('POST /api/collab error:', error)
    return NextResponse.json({ error: 'Failed to create collaboration request' }, { status: 500 })
  }
}
