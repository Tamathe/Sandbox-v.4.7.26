/**
 * Canvas Grade Passback Service
 *
 * Wraps canvas-client.ts to push an approved GradebookEntry score to Canvas
 * and update the entry's canvasPushedAt / canvasPushStatus fields.
 *
 * Called asynchronously (fire-and-forget) from the gradebook PATCH route
 * after status transitions to APPROVED — does not block the HTTP response.
 */

import { pushGradeToCanvas as canvasPush } from './canvas-client'
import { prisma } from './prisma'

export interface GradePassbackParams {
  /** GradebookEntry.id — updated with push result */
  entryId: string
  /** Course.canvasCourseId — required by Canvas grade API */
  canvasCourseId: string
  /** Assignment.canvasAssignmentId */
  canvasAssignmentId: string
  /** Student email for Canvas user lookup */
  studentEmail: string
  /** Raw numeric score (as entered by faculty) */
  score: number
  /** Assignment.pointsPossible — included as a comment for context */
  pointsPossible: number
}

/**
 * Push a faculty-approved grade to Canvas LMS and record the push result
 * on the GradebookEntry row.
 *
 * Returns the push result so callers can log it; never throws — errors are
 * captured and written to canvasPushStatus = "error".
 */
export async function pushGradeToCanvas(
  params: GradePassbackParams
): Promise<{ success: boolean; error?: string }> {
  const { entryId, canvasCourseId, canvasAssignmentId, studentEmail, score, pointsPossible } =
    params

  const result = await canvasPush({
    canvasCourseId,
    canvasAssignmentId,
    studentEmail,
    score,
    comment: `Sandbox score: ${score} / ${pointsPossible}`,
  })

  // Persist push outcome back to the GradebookEntry — best-effort, non-blocking
  await prisma.gradebookEntry
    .update({
      where: { id: entryId },
      data: {
        canvasPushedAt: new Date(),
        canvasPushStatus: result.success ? 'success' : 'error',
      },
    })
    .catch((err) => {
      console.error('[canvas-grade-service] Failed to update canvasPushStatus:', err)
    })

  if (!result.success) {
    console.warn('[canvas-grade-service] Grade push failed:', result.error)
  }

  return result
}
