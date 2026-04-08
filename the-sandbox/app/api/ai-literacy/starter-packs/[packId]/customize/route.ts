import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'
import type { AIStance } from '../../../../../generated/prisma'

export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ packId: string }> }
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { packId } = await params

  const pack = await prisma.customStarterPack.findUnique({
    where: { id: packId },
    select: { userId: true },
  })

  if (!pack) {
    return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
  }
  if (pack.userId !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    swapItem?: { itemId: string; newTemplateId: string }
    updateItem?: { itemId: string; customTitle?: string; customDescription?: string; customAiLevel?: AIStance | null; customSyllabusLanguage?: string }
    updatePolicyLanguage?: string
    removeItem?: { itemId: string }
    addItem?: { templateId: string }
  }

  // Swap an item for a different template
  if (body.swapItem) {
    const { itemId, newTemplateId } = body.swapItem
    await prisma.customPackItem.update({
      where: { id: itemId },
      data: {
        templateId: newTemplateId,
        customTitle: null,
        customDescription: null,
        customAiLevel: null,
        customSyllabusLanguage: null,
      },
    })
    return NextResponse.json({ success: true, operation: 'swapItem' })
  }

  // Update item fields
  if (body.updateItem) {
    const { itemId, customTitle, customDescription, customAiLevel, customSyllabusLanguage } = body.updateItem
    await prisma.customPackItem.update({
      where: { id: itemId },
      data: {
        ...(customTitle !== undefined && { customTitle }),
        ...(customDescription !== undefined && { customDescription }),
        ...(customAiLevel !== undefined && { customAiLevel }),
        ...(customSyllabusLanguage !== undefined && { customSyllabusLanguage }),
      },
    })
    return NextResponse.json({ success: true, operation: 'updateItem' })
  }

  // Update pack policy language
  if (body.updatePolicyLanguage !== undefined) {
    await prisma.customStarterPack.update({
      where: { id: packId },
      data: { policyLanguage: body.updatePolicyLanguage },
    })
    return NextResponse.json({ success: true, operation: 'updatePolicyLanguage' })
  }

  // Remove an item
  if (body.removeItem) {
    await prisma.customPackItem.delete({
      where: { id: body.removeItem.itemId },
    })
    return NextResponse.json({ success: true, operation: 'removeItem' })
  }

  // Add a template as a new item
  if (body.addItem) {
    const maxOrder = await prisma.customPackItem.aggregate({
      where: { packId },
      _max: { sortOrder: true },
    })
    await prisma.customPackItem.create({
      data: {
        packId,
        templateId: body.addItem.templateId,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    })
    return NextResponse.json({ success: true, operation: 'addItem' })
  }

  return NextResponse.json({ error: 'No valid operation provided' }, { status: 400 })
})
