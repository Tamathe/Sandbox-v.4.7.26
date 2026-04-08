import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { requireRequestUser, requireDepartmentEditor, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { getDepartmentBySlug } from '../../../../../../lib/department-service'
import { getCollection, addToolToCollection, removeToolFromCollection, reorderTools, listCollectionTools, toggleToolPinned } from '../../../../../../lib/collection-service'

type Params = { params: Promise<{ slug: string; collectionSlug: string }> }

export const GET = withErrorHandling(async (req: NextRequest, context: Params) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { slug, collectionSlug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const collection = await getCollection(dept.id, collectionSlug)
  if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })

  const tools = await listCollectionTools(collection.id)
  return NextResponse.json({ tools }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest, context: Params) => {
  const { slug, collectionSlug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const auth = await requireDepartmentEditor(req, dept.id)
  if (isAuthFailure(auth)) return auth.response

  const collection = await getCollection(dept.id, collectionSlug)
  if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { toolId } = parsed.data as { toolId: string }
  if (!toolId) return NextResponse.json({ error: 'toolId is required' }, { status: 400 })

  const entry = await addToolToCollection(collection.id, toolId)
  return NextResponse.json(entry, { status: 201 })
})

export const DELETE = withErrorHandling(async (req: NextRequest, context: Params) => {
  const { slug, collectionSlug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const auth = await requireDepartmentEditor(req, dept.id)
  if (isAuthFailure(auth)) return auth.response

  const collection = await getCollection(dept.id, collectionSlug)
  if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })

  const parsedDel = await parseRequestBody(req)
  if ('error' in parsedDel) return parsedDel.error
  const { toolId } = parsedDel.data as { toolId: string }
  if (!toolId) return NextResponse.json({ error: 'toolId is required' }, { status: 400 })

  await removeToolFromCollection(collection.id, toolId)
  return NextResponse.json({ ok: true })
})

export const PATCH = withErrorHandling(async (req: NextRequest, context: Params) => {
  const { slug, collectionSlug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const auth = await requireDepartmentEditor(req, dept.id)
  if (isAuthFailure(auth)) return auth.response

  const collection = await getCollection(dept.id, collectionSlug)
  if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })

  const parsedPatch = await parseRequestBody(req)
  if ('error' in parsedPatch) return parsedPatch.error
  const { toolIds } = parsedPatch.data as { toolIds: string[] }
  if (!Array.isArray(toolIds)) return NextResponse.json({ error: 'toolIds array is required' }, { status: 400 })

  await reorderTools(collection.id, toolIds)
  return NextResponse.json({ ok: true })
})

export const PUT = withErrorHandling(async (req: NextRequest, context: Params) => {
  const { slug, collectionSlug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const auth = await requireDepartmentEditor(req, dept.id)
  if (isAuthFailure(auth)) return auth.response

  const collection = await getCollection(dept.id, collectionSlug)
  if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })

  const parsedPut = await parseRequestBody(req)
  if ('error' in parsedPut) return parsedPut.error
  const { toolId } = parsedPut.data as { toolId: string }
  if (!toolId) return NextResponse.json({ error: 'toolId is required' }, { status: 400 })

  const result = await toggleToolPinned(collection.id, toolId)
  return NextResponse.json(result)
})
