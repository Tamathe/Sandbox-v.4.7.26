import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { validateBody } from '../../../lib/validate'
import { z } from 'zod'
import { prisma } from '../../../lib/prisma'
import type { Prisma } from '../../../generated/prisma'
import { getWellnessHubTool } from '../../../lib/wellness-hub'

const EntrySchema = z.object({
  slug: z.string().min(1),
  date: z.string().min(1), // ISO date string
  data: z.record(z.string(), z.any()),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const validation = validateBody(EntrySchema, parsed.data)
  if ('error' in validation) return validation.error
  const { slug, date, data } = validation.value

  const tool = getWellnessHubTool(slug)
  if (!tool) {
    return NextResponse.json({ error: 'Unknown tool slug' }, { status: 400 })
  }

  const dateObj = new Date(date)
  dateObj.setHours(0, 0, 0, 0)

  const entry = await prisma.wellnessEntry.upsert({
    where: {
      userId_toolSlug_date: {
        userId: user.id,
        toolSlug: slug,
        date: dateObj,
      },
    },
    update: { data: data as unknown as Prisma.InputJsonValue },
    create: {
      userId: user.id,
      toolSlug: slug,
      date: dateObj,
      data: data as unknown as Prisma.InputJsonValue,
    },
  })

  return NextResponse.json(entry)
})
