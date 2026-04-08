import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { runGapAnalysis } from '../../../../../lib/syllabus-architect/gap-analysis'
import { prisma } from '../../../../../lib/prisma'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  // Fetch the course map with nodes and edges
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    include: {
      nodes: {
        where: { archived: false },
        include: { courseUnit: { select: { unitType: true } } },
      },
      edges: true,
    },
  })

  if (!courseMap) {
    return NextResponse.json({ error: 'Course map not found' }, { status: 404 })
  }

  const nodes = courseMap.nodes.map((n: { id: string; label: string; nodeType: string; courseUnit?: { unitType: string } | null }) => ({
    id: n.id,
    label: n.label,
    nodeType: n.nodeType,
    unitType: n.courseUnit?.unitType,
  }))

  const edges = courseMap.edges.map((e: { fromNodeId: string; toNodeId: string; edgeType: string }) => ({
    fromNodeId: e.fromNodeId,
    toNodeId: e.toNodeId,
    edgeType: e.edgeType,
  }))

  const result = await runGapAnalysis(nodes, edges)
  return NextResponse.json(result)
})
