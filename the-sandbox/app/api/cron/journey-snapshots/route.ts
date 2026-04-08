import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { computeAllWeeklySnapshots } from '../../../lib/journey/snapshot-engine'
import { detectAndStoreMilestones } from '../../../lib/journey/milestone-detector'
import { prisma } from '../../../lib/prisma'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  const start = Date.now()

  // Step 1: Compute snapshots for all students
  const snapshotResult = await computeAllWeeklySnapshots()

  // Step 2: Detect milestones for all students
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true },
  })

  let milestonesDetected = 0
  let milestoneErrors = 0
  const weekOf = new Date()

  for (const student of students) {
    try {
      const count = await detectAndStoreMilestones(student.id, weekOf)
      milestonesDetected += count
    } catch (err) {
      console.error(`[Journey] Milestone detection failed for user ${student.id}:`, err)
      milestoneErrors++
    }
  }

  return NextResponse.json({
    snapshots: snapshotResult,
    milestones: { detected: milestonesDetected, errors: milestoneErrors },
    durationMs: Date.now() - start,
  })
})
