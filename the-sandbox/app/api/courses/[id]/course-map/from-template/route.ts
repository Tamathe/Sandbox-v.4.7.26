import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { createMapFromTemplate } from '../../../../../lib/syllabus-architect/template-service'
import { getPreset } from '../../../../../lib/syllabus-architect/course-map-templates'
import { prisma } from '../../../../../lib/prisma'
import { CourseMapUnitType, MapNodeType, MapEdgeType } from '../../../../../generated/prisma'
import { withErrorHandling } from '../../../../../lib/api-utils'

/**
 * POST /api/courses/[id]/course-map/from-template
 * Body: { templateId: string, preset?: boolean }
 *
 * If preset=true, generates from a built-in preset. Otherwise, uses DB template.
 */
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { templateId?: string; preset?: boolean }

  if (!body.templateId || typeof body.templateId !== 'string') {
    return NextResponse.json({ error: 'templateId is required' }, { status: 400 })
  }

  // Built-in preset path
  if (body.preset) {
    const preset = getPreset(body.templateId)
    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 })
    }

    // Check if course already has a map
    const existing = await prisma.courseMap.findUnique({ where: { courseId } })
    if (existing) {
      return NextResponse.json(
        { error: 'Course already has a map. Delete it first or use duplication with overwrite.' },
        { status: 409 },
      )
    }

    const data = preset.generate()

    await prisma.$transaction(async (tx) => {
      const map = await tx.courseMap.create({ data: { courseId } })

      // Create units
      for (const unit of data.units) {
        await tx.courseUnit.create({
          data: {
            id: unit.id,
            courseMapId: map.id,
            label: unit.label,
            description: unit.description,
            unitType: unit.unitType as CourseMapUnitType,
            position: unit.position,
          },
        })
      }

      // Create nodes
      for (const node of data.nodes) {
        await tx.mapNode.create({
          data: {
            id: node.id,
            courseMapId: map.id,
            courseUnitId: node.courseUnitId,
            label: node.label,
            nodeType: node.nodeType as MapNodeType,
            xPos: node.xPos,
            yPos: node.yPos,
            archived: node.archived,
          },
        })
      }

      // Create edges
      for (const edge of data.edges) {
        await tx.mapEdge.create({
          data: {
            id: edge.id,
            courseMapId: map.id,
            fromNodeId: edge.fromNodeId,
            toNodeId: edge.toNodeId,
            edgeType: edge.edgeType as MapEdgeType,
          },
        })
      }
    })

    return NextResponse.json({
      result: {
        mapId: courseId,
        nodeCount: data.nodes.length,
        edgeCount: data.edges.length,
        unitCount: data.units.length,
      },
    }, { status: 201 })
  }

  // DB template path
  const result = await createMapFromTemplate(body.templateId, courseId)
  return NextResponse.json({ result }, { status: 201 })
})
