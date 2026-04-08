import { NextRequest, NextResponse } from 'next/server'
import { requireRegistrarUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRegistrarUser(request)
  if (isAuthFailure(auth)) return auth.response

  const rules = await prisma.articulationRoutingRule.findMany({
    orderBy: { departmentName: 'asc' },
  })

  return NextResponse.json({ rules }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRegistrarUser(request)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<{
    departmentName: string
    contactEmail: string
    autoApproveThreshold?: number
    autoRouteThreshold?: number
  }>(request)
  if ('error' in parsed) return parsed.error

  const { departmentName, contactEmail, autoApproveThreshold, autoRouteThreshold } = parsed.data

  const rule = await prisma.articulationRoutingRule.upsert({
    where: { departmentName },
    update: {
      contactEmail,
      ...(autoApproveThreshold !== undefined ? { autoApproveThreshold } : {}),
      ...(autoRouteThreshold !== undefined ? { autoRouteThreshold } : {}),
    },
    create: {
      departmentName,
      contactEmail,
      autoApproveThreshold: autoApproveThreshold ?? 85,
      autoRouteThreshold: autoRouteThreshold ?? 65,
    },
  })

  return NextResponse.json({ rule }, { status: 201 })
})
