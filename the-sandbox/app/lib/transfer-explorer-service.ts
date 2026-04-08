/**
 * transfer-explorer-service.ts
 *
 * Per-course educator view of incoming concept transfer events.
 */

import { prisma } from './prisma'

export type TransferRow = {
  concept: string
  sourceCourseCode: string
  sourceCourseName: string
  studentCount: number
  avgScore: number
}

export type TransferExplorerResult = {
  carryingOver: TransferRow[]
  needsReinforcement: TransferRow[]
}

type RawRow = {
  concept: string
  source_code: string
  source_name: string
  student_count: bigint
  avg_score: number
}

/**
 * Returns incoming transfer events for a course, split into
 * "carrying over" (avgScore >= 0.6) and "needs reinforcement" (avgScore < 0.6).
 * Floor: HAVING COUNT(DISTINCT userId) >= 2.
 */
export async function getTransferExplorerData(courseId: string): Promise<TransferExplorerResult> {
  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT
      te.concept,
      sc."courseCode" AS source_code,
      sc.title AS source_name,
      COUNT(DISTINCT te."userId") AS student_count,
      AVG(te."sessionScore") AS avg_score
    FROM "TransferEvent" te
    JOIN "Course" sc ON sc.id = te."sourceCourseId"
    WHERE te."targetCourseId" = ${courseId}
    GROUP BY te.concept, sc."courseCode", sc.title
    HAVING COUNT(DISTINCT te."userId") >= 2
    ORDER BY COUNT(DISTINCT te."userId") DESC
  `

  const carryingOver: TransferRow[] = []
  const needsReinforcement: TransferRow[] = []

  for (const row of rows) {
    const mapped: TransferRow = {
      concept: row.concept,
      sourceCourseCode: row.source_code,
      sourceCourseName: row.source_name,
      studentCount: Number(row.student_count),
      avgScore: Math.round(row.avg_score * 100) / 100,
    }
    if (row.avg_score >= 0.6) {
      carryingOver.push(mapped)
    } else {
      needsReinforcement.push(mapped)
    }
  }

  return { carryingOver, needsReinforcement }
}
