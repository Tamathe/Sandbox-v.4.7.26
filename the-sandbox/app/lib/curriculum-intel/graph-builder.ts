/**
 * Curriculum Intelligence Network — Graph Builder
 *
 * Constructs the curriculum graph from existing learning objectives,
 * concept states, and prerequisite chains.
 */

import { prisma } from '../prisma'

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Normalize a concept slug to a label: "statistical-hypothesis" → "statistical hypothesis" */
function slugToLabel(slug: string): string {
  return slug.replace(/-/g, ' ')
}

/** Deterministic label key for dedup */
function normalizeLabel(label: string): string {
  return label.trim().toLowerCase()
}

// ── Main Builder ────────────────────────────────────────────────────────────

export async function buildCurriculumGraph(): Promise<{ nodes: number; edges: number }> {
  // 1. Gather learning objectives
  const objectives = await prisma.learningObjective.findMany({
    select: { id: true, title: true, description: true, courseId: true, bloomLevel: true },
  })

  // 2. Gather distinct concept states (one per conceptSlug across courses)
  const conceptStates = await prisma.conceptState.findMany({
    distinct: ['conceptSlug'],
    select: { conceptSlug: true, courseId: true },
  })

  // 3. Gather prerequisite chains
  const prerequisites = await prisma.conceptPrerequisite.findMany({
    select: { concept: true, prerequisite: true, strength: true },
  })

  // 4. Build a lookup: normalizedLabel → nodeId (to dedup)
  const labelToNodeId = new Map<string, string>()

  // ── Upsert objective nodes ──
  let nodeCount = 0
  for (const obj of objectives) {
    const label = obj.title || obj.description || 'Untitled Objective'
    const key = normalizeLabel(label)

    if (labelToNodeId.has(key)) {
      // Node exists — add course link
      const existingNodeId = labelToNodeId.get(key)!
      await prisma.curriculumNodeCourse.upsert({
        where: { nodeId_courseId: { nodeId: existingNodeId, courseId: obj.courseId } },
        create: {
          nodeId: existingNodeId,
          courseId: obj.courseId,
          role: 'teaches',
          bloomLevel: obj.bloomLevel ?? null,
        },
        update: { bloomLevel: obj.bloomLevel ?? null },
      })
      continue
    }

    const node = await prisma.curriculumNode.create({
      data: {
        label,
        type: 'objective',
        bloomLevel: obj.bloomLevel ?? null,
        courses: {
          create: {
            courseId: obj.courseId,
            role: 'teaches',
            bloomLevel: obj.bloomLevel ?? null,
          },
        },
      },
    })
    labelToNodeId.set(key, node.id)
    nodeCount++
  }

  // ── Upsert concept nodes ──
  for (const concept of conceptStates) {
    const label = slugToLabel(concept.conceptSlug)
    const key = normalizeLabel(label)

    if (labelToNodeId.has(key)) {
      const existingNodeId = labelToNodeId.get(key)!
      await prisma.curriculumNodeCourse.upsert({
        where: { nodeId_courseId: { nodeId: existingNodeId, courseId: concept.courseId } },
        create: { nodeId: existingNodeId, courseId: concept.courseId, role: 'teaches' },
        update: {},
      })
      continue
    }

    const node = await prisma.curriculumNode.create({
      data: {
        label,
        type: 'concept',
        courses: {
          create: { courseId: concept.courseId, role: 'teaches' },
        },
      },
    })
    labelToNodeId.set(key, node.id)
    nodeCount++
  }

  // ── Upsert edges from ConceptPrerequisite ──
  let edgeCount = 0
  for (const prereq of prerequisites) {
    const sourceLabel = normalizeLabel(slugToLabel(prereq.prerequisite))
    const targetLabel = normalizeLabel(slugToLabel(prereq.concept))

    const sourceId = labelToNodeId.get(sourceLabel)
    const targetId = labelToNodeId.get(targetLabel)

    if (!sourceId || !targetId || sourceId === targetId) continue

    await prisma.curriculumEdge.upsert({
      where: { sourceId_targetId: { sourceId, targetId } },
      create: {
        sourceId,
        targetId,
        strength: prereq.strength ?? 1.0,
        evidence: 'catalog prerequisite',
      },
      update: {
        strength: prereq.strength ?? 1.0,
      },
    })
    edgeCount++
  }

  return { nodes: nodeCount, edges: edgeCount }
}

// ── Mastery Computation ─────────────────────────────────────────────────────

export async function computeNodeMastery(): Promise<number> {
  const nodes = await prisma.curriculumNode.findMany({
    select: { id: true, label: true },
  })

  let updated = 0

  for (const node of nodes) {
    const key = normalizeLabel(node.label)
    const slug = key.replace(/\s+/g, '-')

    // Look up mastery data from StudentConceptMastery
    const masteryRows = await prisma.studentConceptMastery.findMany({
      where: { concept: slug },
      select: { masteryLevel: true },
    })

    if (masteryRows.length === 0) continue

    const levels = masteryRows.map(r => r.masteryLevel)
    const avg = levels.reduce((s, v) => s + v, 0) / levels.length
    const variance =
      levels.length > 1
        ? levels.reduce((s, v) => s + (v - avg) ** 2, 0) / levels.length
        : 0

    await prisma.curriculumNode.update({
      where: { id: node.id },
      data: {
        avgMastery: avg,
        masteryVariance: variance,
        computedAt: new Date(),
      },
    })
    updated++
  }

  return updated
}
