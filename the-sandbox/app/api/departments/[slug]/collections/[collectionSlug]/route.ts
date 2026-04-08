import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, requireDepartmentEditor, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { getDepartmentBySlug } from '../../../../../lib/department-service'
import { getCollection, updateCollection, deleteCollection } from '../../../../../lib/collection-service'

type Params = { params: Promise<{ slug: string; collectionSlug: string }> }

export const GET = withErrorHandling(async (req: NextRequest, context: Params) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { slug, collectionSlug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const collection = await getCollection(dept.id, collectionSlug)
  if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })

  return NextResponse.json(collection, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const PATCH = withErrorHandling(async (req: NextRequest, context: Params) => {
  const { slug, collectionSlug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const auth = await requireDepartmentEditor(req, dept.id)
  if (isAuthFailure(auth)) return auth.response

  const collection = await getCollection(dept.id, collectionSlug)
  if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const updated = await updateCollection(collection.id, parsed.data as {
    name?: string; slug?: string; description?: string | null; icon?: string | null; gradient?: string | null; emoji?: string | null; visibility?: 'INHERIT' | 'PUBLIC' | 'INTERNAL' | 'HIDDEN'; displayOrder?: number; pinned?: boolean
  })
  return NextResponse.json(updated)
})

export const DELETE = withErrorHandling(async (req: NextRequest, context: Params) => {
  const { slug, collectionSlug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const auth = await requireDepartmentEditor(req, dept.id)
  if (isAuthFailure(auth)) return auth.response

  const collection = await getCollection(dept.id, collectionSlug)
  if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })

  await deleteCollection(collection.id)
  return NextResponse.json({ ok: true })
})
