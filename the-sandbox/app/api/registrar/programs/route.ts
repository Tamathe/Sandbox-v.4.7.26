import { NextRequest, NextResponse } from 'next/server'
import { requireRegistrarUser, requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'
import { revalidateTag } from 'next/cache'
import { getCachedDegreePrograms } from '../../../lib/cached-queries'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRegistrarUser(request)
  if (isAuthFailure(auth)) return auth.response

  const programs = await getCachedDegreePrograms()

  return NextResponse.json({ programs }, {
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
  })
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<{
    code: string
    name: string
    college: string
    department: string
    catalogYear: string
    totalCredits: number
  }>(request)
  if ('error' in parsed) return parsed.error

  const { code, name, college, department, catalogYear, totalCredits } = parsed.data

  const program = await prisma.degreeProgram.create({
    data: { code, name, college, department, catalogYear, totalCredits },
  })

  revalidateTag('degree-programs', { expire: 0 })

  return NextResponse.json({ program }, { status: 201 })
})
