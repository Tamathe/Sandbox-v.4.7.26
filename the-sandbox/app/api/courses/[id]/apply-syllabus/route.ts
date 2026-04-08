/**
 * POST /api/courses/[id]/apply-syllabus
 *
 * Applies a parsed syllabus to the course's graph-based CourseMap.
 *
 * Body: { jobId: string, fileHash: string, result: ParseResult }
 *
 * - If the course has no CourseMap yet: creates one with CourseUnits, MapNodes,
 *   and MapEdges from the ParseResult, then marks the job COMPLETE.
 * - If the course already has a CourseMap: runs syncCourseMap() for diff-based
 *   living-document merge (fuzzy match, soft-archive removed units, etc.).
 *
 * Returns: { courseMapId, validation, sync? } where validation is the 7-rule
 * report and sync (if applicable) is the diff report.
 *
 * Auth: requireCourseOwner (educator who owns the course, or admin).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import type { ParseResult } from '../../../../lib/syllabus-architect/pdf-parser'
import { syncCourseMap, validateCourseMap } from '../../../../lib/syllabus-architect/validator'
import {
  createAssignmentsFromParse,
  createObjectivesFromParse,
  getExistingLabels,
} from '../../../../lib/syllabus-architect/assignment-objective-sync'
import { createInitialCourseMap } from '../../../../lib/syllabus-architect/course-map-builder'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params

  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    jobId: string
    fileHash: string
    result: ParseResult
  }

  if (!body.jobId || !body.fileHash || !body.result) {
    return NextResponse.json(
      { error: 'Missing required fields: jobId, fileHash, result' },
      { status: 400 },
    )
  }

  const { jobId, fileHash, result } = body

  // Verify the job exists and belongs to this course
  const job = await prisma.syllabusParseJob.findFirst({
    where: { id: jobId, courseId },
  })
  if (!job) {
    return NextResponse.json(
      { error: 'Parse job not found for this course.' },
      { status: 404 },
    )
  }

  // Check if course already has a CourseMap
  const existingMap = await prisma.courseMap.findUnique({
    where: { courseId },
  })

  let courseMapId: string

  // ── Policy diff detection (Task 29) ──────────────────────────────────
  const policyDiff = await detectPolicyDiff(courseId, result)

  if (existingMap) {
    // ── Living document sync: diff-based merge ──────────────────────────
    const syncReport = await syncCourseMap(
      courseId,
      existingMap.id,
      result,
      fileHash,
      jobId,
    )

    courseMapId = existingMap.id

    // Create assignments/objectives for new units only (dedup by label)
    const { assignmentLabels, objectiveTitles } = await getExistingLabels(prisma, courseId)
    const [syncAssignments, syncObjectives] = await Promise.all([
      createAssignmentsFromParse(prisma, courseId, result, assignmentLabels),
      createObjectivesFromParse(prisma, courseId, result, objectiveTitles),
    ])

    const validation = await validateCourseMap(courseMapId)

    return NextResponse.json({
      courseMapId,
      isNewMap: false,
      sync: syncReport,
      validation,
      assignmentsCreated: syncAssignments,
      objectivesCreated: syncObjectives,
      policyDiff,
    })
  }

  // ── First-time creation: build CourseMap from ParseResult ────────────
  const { mapId, assignmentsCreated, objectivesCreated } =
    await createInitialCourseMap(courseId, result, jobId, fileHash)
  courseMapId = mapId

  const validation = await validateCourseMap(courseMapId)

  return NextResponse.json({
    courseMapId,
    isNewMap: true,
    created: {
      units: result.units.length,
      edges: result.edges.length,
      modules: result.units.reduce((sum, u) => sum + u.modules.length, 0),
    },
    assignmentsCreated,
    objectivesCreated,
    validation,
    policyDiff,
  })
})

/**
 * Compare extracted policies/grading weights against stored ones.
 * Uses normalized title comparison to avoid false positives from AI extraction
 * title variations (e.g., "Late Work" vs "Late Work Policy").
 * Returns a policyDiff object (notification only — no auto-overwrite).
 */
async function detectPolicyDiff(courseId: string, result: ParseResult) {
  const extractedPolicies = result.policies ?? []
  const extractedWeights = result.gradingWeights ?? []

  if (extractedPolicies.length === 0 && extractedWeights.length === 0) {
    return { hasChanges: false, extracted: { policies: [], gradingWeights: [] }, existing: { count: 0, categories: [] } }
  }

  const existingPolicies = await prisma.coursePolicy.findMany({
    where: { courseId },
    select: { policyType: true, title: true, content: true },
  })

  const existingCategories = [...new Set(existingPolicies.map(p => p.policyType))]

  // Detect changes using normalized title comparison (AI-extracted titles may
  // differ slightly from stored ones, e.g. "Late Work" vs "Late Work Policy")
  const normalizeTitle = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  let hasChanges = false

  if (extractedPolicies.length !== existingPolicies.length) {
    hasChanges = true
  } else {
    const existingMap = new Map(existingPolicies.map(p => [normalizeTitle(p.title), p.content]))
    for (const ep of extractedPolicies) {
      const stored = existingMap.get(normalizeTitle(ep.title))
      if (!stored || stored !== ep.content) {
        hasChanges = true
        break
      }
    }
  }

  return {
    hasChanges,
    extracted: { policies: extractedPolicies, gradingWeights: extractedWeights },
    existing: { count: existingPolicies.length, categories: existingCategories },
  }
}
