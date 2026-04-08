import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { scanAndPersist, scanDocument } from '../../../lib/accessibility/document-scanner'
import type { ScanTargetType } from '../../../lib/accessibility/types'
import { prisma } from '../../../lib/prisma'

// POST — scan a single content item for accessibility issues
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    text?: string
    targetType?: ScanTargetType
    targetId?: string
    filename?: string
    pageCount?: number
  }

  // If targetType + targetId, fetch content from DB and scan+persist
  if (body.targetType && body.targetId) {
    let text = body.text
    let filename = body.filename ?? 'document'

    if (!text) {
      // Fetch content from DB
      if (body.targetType === 'course_material') {
        const mat = await prisma.courseMaterial.findUnique({
          where: { id: body.targetId },
          select: { content: true, title: true },
        })
        if (!mat) return NextResponse.json({ error: 'Material not found' }, { status: 404 })
        text = mat.content
        filename = mat.title
      } else if (body.targetType === 'tool') {
        const tool = await prisma.tool.findUnique({
          where: { id: body.targetId },
          select: { systemPrompt: true, name: true },
        })
        if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
        text = tool.systemPrompt ?? ''
        filename = tool.name
      } else {
        return NextResponse.json({ error: 'text required for this target type' }, { status: 400 })
      }
    }

    const result = await scanAndPersist(body.targetType, body.targetId, text, {
      filename,
      pageCount: body.pageCount,
    })

    return NextResponse.json(result)
  }

  // Freetext mode — scan without persisting
  if (!body.text) {
    return NextResponse.json({ error: 'text or (targetType + targetId) required' }, { status: 400 })
  }

  const result = await scanDocument(body.text, {
    filename: body.filename ?? 'document',
    pageCount: body.pageCount,
  })

  return NextResponse.json(result)
})
