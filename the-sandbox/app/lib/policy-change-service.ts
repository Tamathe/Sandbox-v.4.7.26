import { prisma } from './prisma'
import { toJsonValue } from './prisma-utils'
import { sendPolicyChangeEmails } from './policy-change-email'

interface PolicySnapshot {
  category: string
  title: string
  content: string
}

export async function recordPolicyChange(
  courseId: string,
  changedByUserId: string,
  oldPolicies: PolicySnapshot[],
  newPolicies: PolicySnapshot[],
  courseCode?: string,
): Promise<void> {
  const changes: string[] = []

  // Build lookup maps by title
  const oldMap = new Map(oldPolicies.map((p) => [p.title, p]))
  const newMap = new Map(newPolicies.map((p) => [p.title, p]))

  // Added
  for (const p of newPolicies) {
    if (!oldMap.has(p.title)) {
      changes.push(`Added: ${p.title}`)
    }
  }

  // Removed
  for (const p of oldPolicies) {
    if (!newMap.has(p.title)) {
      changes.push(`Removed: ${p.title}`)
    }
  }

  // Modified
  for (const p of newPolicies) {
    const old = oldMap.get(p.title)
    if (old && (old.content !== p.content || old.category !== p.category)) {
      changes.push(`Modified: ${p.title}`)
    }
  }

  if (changes.length === 0) return

  const summary = changes.join('. ') + '.'

  await prisma.$transaction([
    prisma.coursePolicyChange.create({
      data: {
        courseId,
        changedBy: changedByUserId,
        summary,
        beforeSnapshot: toJsonValue(oldPolicies),
        afterSnapshot: toJsonValue(newPolicies),
      },
    }),
    // Invalidate all existing acks so students must re-acknowledge
    prisma.coursePolicyAck.deleteMany({ where: { courseId } }),
  ])

  // Fire-and-forget email notifications (Task 26)
  if (courseCode) {
    void sendPolicyChangeEmails(courseId, courseCode, summary)
  }
}
