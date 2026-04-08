import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import {
  generateGraphShareLink,
  revokeGraphShareLink,
  setGraphShareAccessCode,
  getGraphShareStatus,
} from '../../../../../lib/syllabus-architect/sharing-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

/**
 * GET /api/courses/[id]/course-map/share
 * Get current share status (token + access code).
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const status = await getGraphShareStatus(courseId)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  return NextResponse.json({
    ...status,
    shareUrl: status.shareToken ? `${baseUrl}/courses/share/${status.shareToken}` : null,
  })
})

/**
 * POST /api/courses/[id]/course-map/share
 * Generate or return existing share link.
 */
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const result = await generateGraphShareLink(courseId)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  return NextResponse.json({
    shareToken: result.shareToken,
    shareAccessCode: result.shareAccessCode,
    shareUrl: `${baseUrl}/courses/share/${result.shareToken}`,
  })
})

/**
 * PATCH /api/courses/[id]/course-map/share
 * Update access code. Body: { accessCode: string | null }
 */
export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { accessCode } = parsed.data as { accessCode?: string | null }
  await setGraphShareAccessCode(courseId, accessCode ?? null)
  return NextResponse.json({ ok: true }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

/**
 * DELETE /api/courses/[id]/course-map/share
 * Revoke the share link.
 */
export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  await revokeGraphShareLink(courseId)
  return NextResponse.json({ success: true }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
