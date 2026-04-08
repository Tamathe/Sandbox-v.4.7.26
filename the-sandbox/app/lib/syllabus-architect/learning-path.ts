import { prisma } from '../prisma'

// ── Types ────────────────────────────────────────────────────────────────────

export interface LearningPathEntry {
  nodeId: string
  position: number
  status: 'completed' | 'in-progress' | 'not-started'
  dueDate: string | null
  label: string
}

export interface LearningPathResult {
  path: LearningPathEntry[]
}

// ── Kahn's algorithm topological sort ────────────────────────────────────────

function topologicalSort(
  nodeIds: string[],
  edges: { fromNodeId: string; toNodeId: string }[]
): string[] {
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const id of nodeIds) {
    inDegree.set(id, 0)
    adjacency.set(id, [])
  }

  for (const edge of edges) {
    if (!inDegree.has(edge.fromNodeId) || !inDegree.has(edge.toNodeId)) continue
    adjacency.get(edge.fromNodeId)!.push(edge.toNodeId)
    inDegree.set(edge.toNodeId, (inDegree.get(edge.toNodeId) || 0) + 1)
  }

  // Start with nodes that have no prerequisites
  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  const sorted: string[] = []
  while (queue.length > 0) {
    // Sort queue by any tiebreaker (stable — just shift)
    const current = queue.shift()!
    sorted.push(current)
    for (const neighbor of adjacency.get(current) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1
      inDegree.set(neighbor, newDeg)
      if (newDeg === 0) queue.push(neighbor)
    }
  }

  // If some nodes weren't reached (cycle), append them at end
  for (const id of nodeIds) {
    if (!sorted.includes(id)) sorted.push(id)
  }

  return sorted
}

// ── computeLearningPath ──────────────────────────────────────────────────────

export async function computeLearningPath(
  courseMapId: string,
  userId: string
): Promise<LearningPathResult> {
  // Fetch nodes, edges, units, and student progress in parallel
  const [nodes, edges, courseMap] = await Promise.all([
    prisma.mapNode.findMany({
      where: { courseMapId, archived: false },
      select: { id: true, label: true, courseUnitId: true },
    }),
    prisma.mapEdge.findMany({
      where: { courseMapId, edgeType: 'PREREQUISITE' },
      select: { fromNodeId: true, toNodeId: true },
    }),
    prisma.courseMap.findUnique({
      where: { id: courseMapId },
      select: {
        units: {
          select: {
            id: true,
            endDate: true,
            modules: {
              select: {
                lessons: {
                  select: {
                    id: true,
                    studentProgress: {
                      where: { userId },
                      select: { completed: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ])

  if (!courseMap) return { path: [] }

  const nodeIds = nodes.map((n) => n.id)
  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  // Build unit data: endDate and progress status per unit
  const unitEndDate = new Map<string, string | null>()
  const unitStatus = new Map<string, 'completed' | 'in-progress' | 'not-started'>()

  for (const unit of courseMap.units) {
    unitEndDate.set(unit.id, unit.endDate?.toISOString() || null)

    let totalLessons = 0
    let completedLessons = 0
    for (const mod of unit.modules) {
      for (const lesson of mod.lessons) {
        totalLessons++
        if (lesson.studentProgress.some((p) => p.completed)) {
          completedLessons++
        }
      }
    }

    if (totalLessons === 0) {
      unitStatus.set(unit.id, 'not-started')
    } else if (completedLessons === totalLessons) {
      unitStatus.set(unit.id, 'completed')
    } else if (completedLessons > 0) {
      unitStatus.set(unit.id, 'in-progress')
    } else {
      unitStatus.set(unit.id, 'not-started')
    }
  }

  // Get node status and due date
  function getNodeStatus(nodeId: string): 'completed' | 'in-progress' | 'not-started' {
    const node = nodeById.get(nodeId)
    if (!node?.courseUnitId) return 'not-started'
    return unitStatus.get(node.courseUnitId) || 'not-started'
  }

  function getNodeDueDate(nodeId: string): string | null {
    const node = nodeById.get(nodeId)
    if (!node?.courseUnitId) return null
    return unitEndDate.get(node.courseUnitId) || null
  }

  // Step 1: Topological sort based on PREREQUISITE edges
  const topoOrder = topologicalSort(nodeIds, edges)

  // Step 2: Sort within topological order by status then due date
  const STATUS_PRIORITY: Record<string, number> = {
    'completed': 0,
    'in-progress': 1,
    'not-started': 2,
  }

  const pathEntries: LearningPathEntry[] = topoOrder.map((nodeId) => {
    const node = nodeById.get(nodeId)!
    return {
      nodeId,
      position: 0, // will be set after sorting
      status: getNodeStatus(nodeId),
      dueDate: getNodeDueDate(nodeId),
      label: node.label,
    }
  })

  // Stable sort: completed first, then in-progress, then not-started
  // Within same status, earlier due date first
  pathEntries.sort((a, b) => {
    const statusDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
    if (statusDiff !== 0) return statusDiff

    // Due date tiebreaker: earlier due date first, null last
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }
    if (a.dueDate && !b.dueDate) return -1
    if (!a.dueDate && b.dueDate) return 1

    return 0
  })

  // Set positions (1-based)
  pathEntries.forEach((entry, i) => {
    entry.position = i + 1
  })

  return { path: pathEntries }
}
