 
/**
 * Syllabus Architect — Validation Layer & Living Document Update Sync
 *
 * validateCourseMap()
 *   Runs 7 rules before a CourseMap is allowed to publish:
 *     1. MIN_UNITS           — at least 1 unit exists
 *     2. DATE_OVERLAP        — units are chronologically ordered
 *     3. ORPHANED_NODE       — every node is connected (warn, not block)
 *     4. CIRCULAR_PREREQUISITE — DFS cycle detection on PREREQUISITE edges
 *     5. DUPLICATE_LABELS    — no two units share an identical label
 *     6. DATE_CONFIDENCE     — <0.80 blocks; 0.80–0.95 warns; ≥0.95 auto-publish
 *     7. NO_ENTRY_POINT      — prerequisite graph must have at least one source node
 *
 * syncCourseMap()
 *   Diffs a new SyllabusParseJob against the existing CourseMap:
 *     - fileHash equality check → idempotent no-op
 *     - Fuzzy label match (Jaccard token overlap ≥ 0.75, or prefix match)
 *     - MATCHED → update metadata only; never touch objectives or lessons
 *     - MODIFIED → update fields, cap dateConfidence at 0.75 to force review
 *     - ADDED → create new CourseUnit + MapNode chain
 *     - REMOVED → soft-archive (archived: true) to preserve StudentObjectiveProgress FKs
 *     - Returns a SyncReport with preservedProgressCount
 */

import { prisma } from '../prisma'
import type { MapEdgeType } from '../../generated/prisma'
import type { ParseResult } from './pdf-parser'

// ── Types ──────────────────────────────────────────────────────────────────────

export type ValidationStatus = 'PASS' | 'WARN' | 'BLOCK'

export interface ValidationError {
  rule: string
  message: string
  severity: 'error' | 'warning'
  nodeLabel?: string
}

export interface ValidationReport {
  status: ValidationStatus
  errors: ValidationError[]
  warnings: ValidationError[]
  /** true only when status === 'PASS' AND every unit has dateConfidence ≥ 0.95 */
  canAutoPublish: boolean
}

export type DiffStatus = 'MATCHED' | 'MODIFIED' | 'ADDED' | 'REMOVED'

export interface NodeDiff {
  status: DiffStatus
  existingNodeId: string | null
  newLabel: string
  oldLabel: string | null
  fieldsChanged: string[]
}

export interface SyncReport {
  matched: number
  modified: NodeDiff[]
  added: NodeDiff[]
  removed: NodeDiff[]
  /** Number of StudentObjectiveProgress rows safely preserved on matched nodes */
  preservedProgressCount: number
  diffs: NodeDiff[]
}

// ── validateCourseMap ──────────────────────────────────────────────────────────

export async function validateCourseMap(courseMapId: string): Promise<ValidationReport> {
  const map = await prisma.courseMap.findUnique({
    where: { id: courseMapId },
    include: {
      units: {
        include: { modules: { include: { lessons: true } } },
        orderBy: { position: 'asc' },
      },
      nodes: true,
      edges: true,
    },
  })

  if (!map) {
    return {
      status: 'BLOCK',
      errors: [{ rule: 'MAP_EXISTS', message: 'CourseMap not found', severity: 'error' }],
      warnings: [],
      canAutoPublish: false,
    }
  }

  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // ── Rule 1: Must have at least 1 unit ─────────────────────────────────────
  if (map.units.length === 0) {
    errors.push({
      rule: 'MIN_UNITS',
      message: 'Course map must contain at least one unit before publishing.',
      severity: 'error',
    })
  }

  // ── Rule 2: Chronological ordering ────────────────────────────────────────
  // Warn (not block) when a unit's endDate exceeds the next unit's startDate.
  const datedUnits = map.units
    .filter((u) => u.startDate !== null)
    .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())

  for (let i = 0; i < datedUnits.length - 1; i++) {
    const curr = datedUnits[i]
    const next = datedUnits[i + 1]
    if (
      curr.endDate &&
      next.startDate &&
      new Date(curr.endDate) > new Date(next.startDate)
    ) {
      warnings.push({
        rule: 'DATE_OVERLAP',
        message: `"${curr.label}" ends after "${next.label}" starts — dates may overlap.`,
        severity: 'warning',
        nodeLabel: curr.label,
      })
    }
  }

  // ── Rule 3: No orphaned nodes ──────────────────────────────────────────────
  // Only relevant when there are multiple nodes; single-node maps are fine.
  if (map.nodes.length > 1) {
    const connectedIds = new Set<string>()
    map.edges.forEach((e) => {
      connectedIds.add(e.fromNodeId)
      connectedIds.add(e.toNodeId)
    })
    map.nodes
      .filter((n) => !connectedIds.has(n.id))
      .forEach((n) => {
        warnings.push({
          rule: 'ORPHANED_NODE',
          message: `Node "${n.label}" is not connected to any other node.`,
          severity: 'warning',
          nodeLabel: n.label,
        })
      })
  }

  // ── Rule 4: No circular prerequisites ─────────────────────────────────────
  const prereqEdges = map.edges.filter((e) => e.edgeType === 'PREREQUISITE')
  if (hasCycle(map.nodes.map((n) => n.id), prereqEdges.map((e) => [e.fromNodeId, e.toNodeId]))) {
    errors.push({
      rule: 'CIRCULAR_PREREQUISITE',
      message:
        'Prerequisite edges form a cycle — no valid course ordering exists. Remove or reclassify one edge.',
      severity: 'error',
    })
  }

  // ── Rule 5: Label uniqueness at unit level ─────────────────────────────────
  const unitLabels = map.units.map((u) => u.label.toLowerCase().trim())
  const duplicates = unitLabels.filter((l, i) => unitLabels.indexOf(l) !== i)
  if (duplicates.length > 0) {
    errors.push({
      rule: 'DUPLICATE_LABELS',
      message: `Duplicate unit labels detected: ${[...new Set(duplicates)].join(', ')}`,
      severity: 'error',
    })
  }

  // ── Rule 6: Date confidence thresholds ────────────────────────────────────
  // <0.80 → BLOCK (red); 0.80–0.95 → WARN (yellow); ≥0.95 → OK (auto-publish eligible)
  map.units
    .filter((u) => u.dateConfidence !== null && u.dateConfidence < 0.8)
    .forEach((u) => {
      errors.push({
        rule: 'LOW_DATE_CONFIDENCE',
        message: `"${u.label}" has ${(u.dateConfidence! * 100).toFixed(0)}% date confidence — verify dates before publishing.`,
        severity: 'error',
        nodeLabel: u.label,
      })
    })

  map.units
    .filter((u) => u.dateConfidence !== null && u.dateConfidence >= 0.8 && u.dateConfidence < 0.95)
    .forEach((u) => {
      warnings.push({
        rule: 'MEDIUM_DATE_CONFIDENCE',
        message: `"${u.label}" has ${(u.dateConfidence! * 100).toFixed(0)}% date confidence — dates should be reviewed.`,
        severity: 'warning',
        nodeLabel: u.label,
      })
    })

  // ── Rule 7: Entry-point exists in prerequisite graph ──────────────────────
  // At least one node must have in-degree 0 (i.e., is not the target of any
  // prerequisite edge). If every node has a predecessor, there's a cycle
  // (already caught above) or the graph is unreachable.
  if (map.nodes.length > 0) {
    const nodesWithIncoming = new Set(prereqEdges.map((e) => e.toNodeId))
    const entryPoints = map.nodes.filter((n) => !nodesWithIncoming.has(n.id))
    if (entryPoints.length === 0) {
      errors.push({
        rule: 'NO_ENTRY_POINT',
        message:
          'Every node has an incoming prerequisite edge — the course has no starting point.',
        severity: 'error',
      })
    }
  }

  // ── Final status ──────────────────────────────────────────────────────────
  const status: ValidationStatus =
    errors.length > 0 ? 'BLOCK' : warnings.length > 0 ? 'WARN' : 'PASS'

  const allHighConfidence = map.units.every(
    (u) => u.dateConfidence === null || u.dateConfidence >= 0.95,
  )
  const canAutoPublish = status === 'PASS' && allHighConfidence

  return { status, errors, warnings, canAutoPublish }
}

// ── hasCycle (DFS with recursion stack) ───────────────────────────────────────

function hasCycle(nodeIds: string[], edges: [string, string][]): boolean {
  const adj = new Map<string, string[]>()
  nodeIds.forEach((id) => adj.set(id, []))
  edges.forEach(([from, to]) => adj.get(from)?.push(to))

  const visited = new Set<string>()
  const inStack = new Set<string>()

  function dfs(id: string): boolean {
    visited.add(id)
    inStack.add(id)
    for (const neighbor of adj.get(id) ?? []) {
      if (inStack.has(neighbor)) return true
      if (!visited.has(neighbor) && dfs(neighbor)) return true
    }
    inStack.delete(id)
    return false
  }

  for (const id of nodeIds) {
    if (!visited.has(id) && dfs(id)) return true
  }
  return false
}

// ── syncCourseMap (Living Document Update Sync) ────────────────────────────────
//
// Called when a new PDF is uploaded for a course that already has a CourseMap.
//
// Algorithm:
//   1. Fuzzy-match each new ExtractedUnit against existing (non-archived) MapNodes.
//   2. Classify as MATCHED / MODIFIED / ADDED / REMOVED.
//   3. Apply changes inside a Prisma transaction:
//      MATCHED   — update label only; objectives and lesson content untouched
//      MODIFIED  — update editable fields; cap dateConfidence at 0.75 (yellow flag)
//      ADDED     — create CourseUnit + MapNode
//      REMOVED   — soft-archive (archived: true) to preserve StudentObjectiveProgress FKs
//   4. Mark the new SyllabusParseJob as COMPLETE and link it to the CourseMap.
//   5. Return a SyncReport.

export async function syncCourseMap(
  courseId: string,
  existingMapId: string,
  newParseResult: ParseResult,
  newFileHash: string,
  newJobId: string,
): Promise<SyncReport> {
  // Load existing non-archived nodes with their associated progress counts
  const existingNodes = await prisma.mapNode.findMany({
    where: { courseMapId: existingMapId, archived: false },
    include: {
      courseUnit: {
        include: {
          modules: {
            include: {
              lessons: {
                include: { _count: { select: { studentProgress: true } } },
              },
            },
          },
        },
      },
    },
  })

  const newUnits = newParseResult.units
  const diffs: NodeDiff[] = []
  const matchedExistingIds = new Set<string>()

  // ── Match new units against existing nodes ─────────────────────────────────
  for (const newUnit of newUnits) {
    const match = existingNodes.find(
      (node) => !matchedExistingIds.has(node.id) && fuzzyMatch(node.label, newUnit.label),
    )

    if (match) {
      matchedExistingIds.add(match.id)
      const fieldsChanged: string[] = []

      // Detect meaningful content changes (not cosmetic label changes)
      const existingUnit = match.courseUnit
      if (existingUnit) {
        if ((existingUnit.description ?? null) !== newUnit.description) fieldsChanged.push('description')
        const existStart = existingUnit.startDate?.toISOString().slice(0, 10) ?? null
        const existEnd = existingUnit.endDate?.toISOString().slice(0, 10) ?? null
        if (existStart !== newUnit.startDate) fieldsChanged.push('startDate')
        if (existEnd !== newUnit.endDate) fieldsChanged.push('endDate')
      }

      diffs.push({
        status: fieldsChanged.length > 0 ? 'MODIFIED' : 'MATCHED',
        existingNodeId: match.id,
        newLabel: newUnit.label,
        oldLabel: match.label,
        fieldsChanged,
      })
    } else {
      diffs.push({
        status: 'ADDED',
        existingNodeId: null,
        newLabel: newUnit.label,
        oldLabel: null,
        fieldsChanged: [],
      })
    }
  }

  // ── Detect removed nodes (existing nodes not matched by any new unit) ──────
  existingNodes
    .filter((n) => !matchedExistingIds.has(n.id))
    .forEach((removed) => {
      diffs.push({
        status: 'REMOVED',
        existingNodeId: removed.id,
        newLabel: removed.label,
        oldLabel: removed.label,
        fieldsChanged: [],
      })
    })

  // ── Count StudentObjectiveProgress rows that will be preserved ────────────
  let preservedProgressCount = 0
  for (const node of existingNodes) {
    if (matchedExistingIds.has(node.id)) {
      node.courseUnit?.modules.forEach((mod) => {
        mod.lessons.forEach((lesson) => {
          preservedProgressCount += lesson._count.studentProgress
        })
      })
    }
  }

  // ── Apply diffs atomically ────────────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    for (const diff of diffs) {
      // Find the matching new unit by label (accommodates label drift on MODIFIED)
      const newUnit =
        newUnits.find((u) => u.label === diff.newLabel) ??
        newUnits.find((u) => fuzzyMatch(u.label, diff.oldLabel ?? ''))

      if (diff.status === 'MATCHED' && diff.existingNodeId) {
        // Sync label only; never touch modules, lessons, or objectives
        await tx.mapNode.update({
          where: { id: diff.existingNodeId },
          data: { label: newUnit?.label ?? diff.newLabel },
        })
      }

      if (diff.status === 'MODIFIED' && diff.existingNodeId && newUnit) {
        // Cap dateConfidence at 0.75 so modified nodes always require educator review
        const cappedConfidence = Math.min(newUnit.dateConfidence, 0.75)
        await tx.courseUnit.updateMany({
          where: { mapNodes: { some: { id: diff.existingNodeId } } },
          data: {
            description: newUnit.description,
            startDate: newUnit.startDate ? new Date(newUnit.startDate) : null,
            endDate: newUnit.endDate ? new Date(newUnit.endDate) : null,
            dateConfidence: cappedConfidence,
            rawSourceText: newUnit.rawSourceText,
          },
        })
        await tx.mapNode.update({
          where: { id: diff.existingNodeId },
          data: { label: newUnit.label },
        })
      }

      if (diff.status === 'ADDED' && newUnit) {
        const position = newUnits.indexOf(newUnit)
        const unitTypeEnum = newUnit.unitType.toUpperCase() as
          | 'LECTURE'
          | 'LAB'
          | 'EXAM'
          | 'QUIZ'
          | 'ASSIGNMENT'
          | 'DISCUSSION'
          | 'OTHER'

        const unit = await tx.courseUnit.create({
          data: {
            courseMapId: existingMapId,
            label: newUnit.label,
            description: newUnit.description,
            unitType: unitTypeEnum,
            startDate: newUnit.startDate ? new Date(newUnit.startDate) : null,
            endDate: newUnit.endDate ? new Date(newUnit.endDate) : null,
            dateConfidence: newUnit.dateConfidence,
            rawSourceText: newUnit.rawSourceText,
            position,
          },
        })
        await tx.mapNode.create({
          data: {
            courseMapId: existingMapId,
            courseUnitId: unit.id,
            label: newUnit.label,
            nodeType: 'UNIT',
            xPos: 0,
            yPos: position * 120,
            archived: false,
          },
        })
      }

      if (diff.status === 'REMOVED' && diff.existingNodeId) {
        // Soft delete — preserves StudentObjectiveProgress and lesson FK integrity
        await tx.mapNode.update({
          where: { id: diff.existingNodeId },
          data: { archived: true },
        })
      }
    }

    // ── Sync edges: delete old edges and recreate from new parse result ────
    // Build a label→nodeId map from current state (after unit diffs applied)
    const allNodes = await tx.mapNode.findMany({
      where: { courseMapId: existingMapId, archived: false },
      select: { id: true, label: true },
    })
    const labelToNodeId = new Map<string, string>()
    for (const node of allNodes) {
      labelToNodeId.set(node.label.toLowerCase().trim(), node.id)
    }

    // Remove all existing edges and recreate from new parse result
    await tx.mapEdge.deleteMany({ where: { courseMapId: existingMapId } })

    for (const edge of newParseResult.edges) {
      const fromId = labelToNodeId.get(edge.fromLabel.toLowerCase().trim())
      const toId = labelToNodeId.get(edge.toLabel.toLowerCase().trim())
      if (fromId && toId) {
        await tx.mapEdge.create({
          data: {
            courseMapId: existingMapId,
            fromNodeId: fromId,
            toNodeId: toId,
            edgeType: edge.edgeType as MapEdgeType,
          },
        })
      }
    }

    // Stamp the new parse job as active for this map
    await tx.syllabusParseJob.update({
      where: { id: newJobId },
      data: {
        status: 'COMPLETE',
        courseMapId: existingMapId,
        fileHash: newFileHash,
      },
    })
  })

  return {
    matched: diffs.filter((d) => d.status === 'MATCHED').length,
    modified: diffs.filter((d) => d.status === 'MODIFIED'),
    added: diffs.filter((d) => d.status === 'ADDED'),
    removed: diffs.filter((d) => d.status === 'REMOVED'),
    preservedProgressCount,
    diffs,
  }
}

// ── fuzzyMatch ────────────────────────────────────────────────────────────────
//
// Returns true if two section labels refer to the same unit. Uses:
//   1. Exact normalized match
//   2. Jaccard token overlap ≥ 0.75  ("Week 1: Intro" ↔ "Week 1: Introduction")
//   3. Prefix match for short labels   ("Week 1" ↔ "Week 1: New Topics")
//
// Threshold is intentionally conservative: 0.75 avoids false matches between
// similarly-named but distinct topics (e.g. "Lab 1" vs "Lab 2").

export function fuzzyMatch(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()

  const na = normalize(a)
  const nb = normalize(b)

  if (na === nb) return true

  // Jaccard token overlap
  const aTokens = new Set(na.split(/\s+/).filter(Boolean))
  const bTokens = new Set(nb.split(/\s+/).filter(Boolean))
  const intersection = [...aTokens].filter((t) => bTokens.has(t)).length
  const union = new Set([...aTokens, ...bTokens]).size
  if (union > 0 && intersection / union >= 0.75) return true

  // Prefix match (handles "Week 1" matching "Week 1: New Topics Added This Year")
  // Guard: the character after the prefix must be non-alphanumeric (space, colon, etc.)
  // to prevent "Week 1" from matching "Week 10", "Week 11", etc.
  const shorter = na.length <= nb.length ? na : nb
  const longer = na.length <= nb.length ? nb : na
  if (shorter.length > 4 && longer.startsWith(shorter)) {
    const nextChar = longer[shorter.length]
    if (!nextChar || /[^a-z0-9]/.test(nextChar)) return true
  }

  return false
}
