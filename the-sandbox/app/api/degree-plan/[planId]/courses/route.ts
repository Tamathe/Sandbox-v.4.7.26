import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../../../lib/server-auth'
import { addCourseToPlan } from '../../../../lib/degree-plan-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ planId: string }> }) => {
    const auth = await requireRequestUser(req)
    if ('response' in auth) return auth.response
    const { user } = auth

    const { planId } = await params
    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const { courseCode, semester, year, status } = parsed.data as { courseCode: string; semester: string; year: number; status?: string }

    if (!courseCode?.trim()) {
      return NextResponse.json({ error: 'courseCode is required' }, { status: 400 })
    }
    if (!semester?.trim()) {
      return NextResponse.json({ error: 'semester is required' }, { status: 400 })
    }
    if (year === undefined || year === null) {
      return NextResponse.json({ error: 'year is required' }, { status: 400 })
    }

    const entry = await addCourseToPlan(planId, user.id, {
      courseCode: courseCode.trim(),
      semester: semester.trim(),
      year: Number(year),
      status,
    })
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(entry, { status: 201 })
  })
