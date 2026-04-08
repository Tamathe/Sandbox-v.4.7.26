// ── Engagement Fingerprint Engine — Data Fetchers ─────────────────────────────
// 14 thin Prisma query wrappers. Each takes (userId, since) and returns only
// the fields the fingerprint computation modules need.

import { prisma } from '../prisma'

// ── 1. Tool Sessions ──────────────────────────────────────────────────────────

export async function fetchToolSessions(userId: string, since: Date) {
  return prisma.toolSession.findMany({
    where: { userId, startedAt: { gte: since } },
    select: {
      toolId: true,
      startedAt: true,
      durationSeconds: true,
      score: true,
      bloomLevel: true,
      notes: true,
    },
  })
}

// ── 2. Flashcard Stats ────────────────────────────────────────────────────────
// Aggregate quality distributions for retention rate computation.

export async function fetchFlashcardStats(userId: string, since: Date) {
  const states = await prisma.flashcardState.findMany({
    where: { userId, updatedAt: { gte: since } },
    select: {
      lastQuality: true,
      reviewCount: true,
    },
  })
  return states
}

// ── 3. Concept Mastery ────────────────────────────────────────────────────────

export async function fetchConceptMastery(userId: string, since: Date) {
  return prisma.studentConceptMastery.findMany({
    where: { userId, lastSeenAt: { gte: since } },
    select: {
      concept: true,
      masteryLevel: true,
      encounterCount: true,
      successCount: true,
      failCount: true,
      lastSeenAt: true,
    },
  })
}

// ── 4. Domain Modality ────────────────────────────────────────────────────────
// Returns the user's most confident modality preference.

export async function fetchDomainModality(userId: string, _since: Date) {
  return prisma.studentDomainModality.findMany({
    where: { userId },
    select: {
      domain: true,
      preferredModality: true,
      confidenceScore: true,
      sessionCount: true,
    },
    orderBy: { confidenceScore: 'desc' },
  })
}

// ── 5. Live Room Activity ─────────────────────────────────────────────────────

export async function fetchLiveRoomActivity(userId: string, since: Date) {
  return prisma.liveRoomParticipant.findMany({
    where: { userId, joinedAt: { gte: since } },
    select: {
      score: true,
      joinedAt: true,
      room: {
        select: {
          type: true,
          phase: true,
        },
      },
    },
  })
}

// ── 6. Sandy Traces ──────────────────────────────────────────────────────────
// Count of tool calls offered vs approved to derive engagement rate.

export async function fetchSandyTraces(userId: string, since: Date) {
  const traces = await prisma.sandyExecutionTrace.findMany({
    where: { userId, startedAt: { gte: since } },
    select: {
      toolCallCount: true,
      approvalCount: true,
    },
  })
  const totalOffered = traces.reduce((sum, t) => sum + t.toolCallCount, 0)
  const totalApproved = traces.reduce((sum, t) => sum + t.approvalCount, 0)
  return { totalOffered, totalApproved }
}

// ── 7. Message Activity ──────────────────────────────────────────────────────

export async function fetchMessageActivity(userId: string, since: Date) {
  const count = await prisma.channelMessage.count({
    where: { authorId: userId, createdAt: { gte: since } },
  })
  return { messageCount: count }
}

// ── 8. Study Group Memberships ───────────────────────────────────────────────

export async function fetchStudyGroupMemberships(userId: string, _since: Date) {
  const count = await prisma.studyGroupMember.count({
    where: { userId },
  })
  return { groupCount: count }
}

// ── 9. Assignments ───────────────────────────────────────────────────────────
// Returns assignments with due dates for enrolled courses (for deadline proximity).

export async function fetchAssignments(userId: string, since: Date) {
  // Get enrolled course IDs
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: userId },
    select: { courseId: true },
  })
  const courseIds = enrollments.map((e) => e.courseId)
  if (courseIds.length === 0) return []

  return prisma.assignment.findMany({
    where: {
      courseId: { in: courseIds },
      dueAt: { gte: since },
    },
    select: {
      id: true,
      dueAt: true,
      courseId: true,
    },
  })
}

// ── 10. Submissions ──────────────────────────────────────────────────────────

export async function fetchSubmissions(userId: string, since: Date) {
  return prisma.submission.findMany({
    where: { studentId: userId, submittedAt: { gte: since } },
    select: {
      assignmentId: true,
      submittedAt: true,
    },
  })
}

// ── 11. Course Post Reads ────────────────────────────────────────────────────

export async function fetchCoursePostReads(userId: string, since: Date) {
  const count = await prisma.coursePostRead.count({
    where: { userId, readAt: { gte: since } },
  })
  return { readCount: count }
}

// ── 12. Total Course Posts ───────────────────────────────────────────────────
// Count of all posts for the user's enrolled courses (denominator for read rate).

export async function fetchTotalCoursePosts(userId: string, since: Date) {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: userId },
    select: { courseId: true },
  })
  const courseIds = enrollments.map((e) => e.courseId)
  if (courseIds.length === 0) return { postCount: 0 }

  const count = await prisma.coursePost.count({
    where: {
      courseId: { in: courseIds },
      createdAt: { gte: since },
    },
  })
  return { postCount: count }
}

// ── 13. Interventions ────────────────────────────────────────────────────────
// InterventionLog uses `studentId` and `outcome`/`resolvedAt` to indicate action.

export async function fetchInterventions(userId: string, since: Date) {
  const logs = await prisma.interventionLog.findMany({
    where: { studentId: userId, createdAt: { gte: since } },
    select: {
      outcome: true,
      resolvedAt: true,
    },
  })
  const total = logs.length
  const accepted = logs.filter((l) => l.resolvedAt !== null).length
  return { total, accepted }
}

// ── 14. Wellness Entry Count ─────────────────────────────────────────────────
// Count only — never read content (privacy).

export async function fetchWellnessEntryCount(userId: string, since: Date) {
  const count = await prisma.wellnessEntry.count({
    where: { userId, createdAt: { gte: since } },
  })
  return { entryCount: count }
}
