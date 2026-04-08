import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, requireDepartmentEditor, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { getDepartmentBySlug } from '../../../../lib/department-service'
import { listCollections, createCollection } from '../../../../lib/collection-service'

export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { slug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const collections = await listCollections(dept.id)
  return NextResponse.json({ collections }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const { slug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const auth = await requireDepartmentEditor(req, dept.id)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { name, slug: collectionSlug, description, icon, gradient, emoji, visibility, displayOrder, pinned } = parsed.data as { name: string; slug: string; description?: string; icon?: string; gradient?: string; emoji?: string; visibility?: 'INHERIT' | 'PUBLIC' | 'INTERNAL' | 'HIDDEN'; displayOrder?: number; pinned?: boolean }
  if (!name || !collectionSlug) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })
  }

  const collection = await createCollection(dept.id, {
    name, slug: collectionSlug, description, icon, gradient, emoji, visibility, displayOrder, pinned,
  })
  return NextResponse.json(collection, { status: 201 })
})
