/**
 * study-match-service.ts
 *
 * Complementary Study Matching — pairs students whose concept strengths
 * complement each other's weaknesses within the same course.
 * FERPA: never exposes numeric mastery scores to other students.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import { toJsonValue } from './prisma-utils'
import type { StudyMatchProfile } from '../generated/prisma'
import { getConceptMasteries } from './concept-mastery-service'

const anthropic = new Anthropic()
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

// ── Types ────────────────────────────────────────────────────────────────────

export interface StudyMatchMember {
  userId: string
  name: string                    // first name only (FERPA)
  strengths: string[]             // concept labels (not scores)
  canHelpWith: string[]           // concepts this person can teach the others
  needsHelpWith: string[]         // concepts this person needs help with
  accepted?: boolean              // track per-member acceptance
}

export interface StudyMatchSuggestion {
  id: string
  courseId: string
  courseCode: string
  members: StudyMatchMember[]
  complementarityScore: number
  matchReason: string
  expiresAt: string
  status: string
}

// Internal — concept vector for a student within a course
interface ConceptVector {
  userId: string
  firstName: string
  strengths: string[]    // concept labels with effective mastery > 0.75
  weaknesses: string[]   // concept labels with effective mastery < 0.5
  strengthMap: Map<string, number>  // concept → effective mastery (server-side only)
  availableDays: string[]
  domain: string | null
  preferredModality: string | null
}

// ── Profile Management ───────────────────────────────────────────────────────

export async function upsertMatchProfile(
  userId: string,
  data: { optedIn: boolean; availableHours?: Record<string, string[]>; preferredSize?: number },
): Promise<StudyMatchProfile> {
  const size = data.preferredSize ? Math.min(4, Math.max(2, data.preferredSize)) : 3
  return prisma.studyMatchProfile.upsert({
    where: { userId },
    create: {
      userId,
      optedIn: data.optedIn,
      availableHours: data.availableHours ?? undefined,
      preferredSize: size,
    },
    update: {
      optedIn: data.optedIn,
      ...(data.availableHours !== undefined && { availableHours: data.availableHours }),
      ...(data.preferredSize !== undefined && { preferredSize: size }),
    },
  })
}

export async function getMatchProfile(userId: string): Promise<StudyMatchProfile | null> {
  return prisma.studyMatchProfile.findUnique({ where: { userId } })
}

// ── Suggestion Engine ────────────────────────────────────────────────────────

export async function getSuggestions(
  userId: string,
  courseId: string,
): Promise<StudyMatchSuggestion[]> {
  // 1. Verify caller is opted in
  const callerProfile = await prisma.studyMatchProfile.findUnique({ where: { userId } })
  if (!callerProfile?.optedIn) {
    throw new Error('Opt in to study matching first')
  }

  // Fetch caller's A/B study group so we only match within same group
  const callerUser = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, studyGroup: true },
  })

  // 2. Fetch all opted-in students in the same course
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    select: {
      studentId: true,
      student: {
        select: {
          id: true,
          name: true,
          studyGroup: true,
          studyMatchProfile: { select: { optedIn: true, availableHours: true, preferredSize: true } },
        },
      },
    },
  })

  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    select: { id: true, courseCode: true, title: true },
  })

  // Filter to opted-in peers in the same A/B study group
  const candidates = enrollments.filter((e) => {
    if (e.studentId === userId) return false
    if (!e.student.studyMatchProfile?.optedIn) return false
    if (e.student.studyGroup !== callerUser.studyGroup) return false
    return true
  })

  if (candidates.length === 0) return []

  // 3. Build concept vectors for caller + candidates
  const allUserIds = [userId, ...candidates.map((c) => c.studentId)]
  const vectorMap = new Map<string, ConceptVector>()

  // Fetch domain modalities for all users
  const modalities = await prisma.studentDomainModality.findMany({
    where: { userId: { in: allUserIds } },
  })
  const modalityMap = new Map<string, string>()
  for (const m of modalities) {
    modalityMap.set(m.userId, m.preferredModality)
  }

  // Build vectors for each user
  for (const uid of allUserIds) {
    const masteries = await getConceptMasteries(uid)
    const courseMasteries = masteries.filter((m) =>
      m.coursesEncountered.includes(courseId),
    )

    const strengths: string[] = []
    const weaknesses: string[] = []
    const strengthMap = new Map<string, number>()

    for (const m of courseMasteries) {
      if (m.effectiveMastery > 0.75) {
        strengths.push(m.concept)
        strengthMap.set(m.concept, m.effectiveMastery)
      } else if (m.effectiveMastery < 0.5) {
        weaknesses.push(m.concept)
      }
    }

    const user = uid === userId
      ? callerUser
      : candidates.find((c) => c.studentId === uid)?.student
    const name = user?.name ?? 'Student'
    const firstName = name.split(' ')[0]

    const profile = uid === userId
      ? callerProfile
      : candidates.find((c) => c.studentId === uid)?.student.studyMatchProfile
    const availableHours = profile?.availableHours as Record<string, string[]> | null
    const availableDays = availableHours ? Object.keys(availableHours) : []

    vectorMap.set(uid, {
      userId: uid,
      firstName,
      strengths,
      weaknesses,
      strengthMap,
      availableDays,
      domain: course.courseCode,
      preferredModality: modalityMap.get(uid) ?? null,
    })
  }

  const callerVector = vectorMap.get(userId)!

  // 4. Complementarity scoring
  interface ScoredCandidate {
    userId: string
    score: number
  }

  const scored: ScoredCandidate[] = []

  for (const candidate of candidates) {
    const cVector = vectorMap.get(candidate.studentId)
    if (!cVector) continue

    // How much the caller's strengths cover candidate's weaknesses
    const callerHelpsCandidate = callerVector.strengths.filter((s) =>
      cVector.weaknesses.includes(s),
    )
    const candidateHelpsCaller = cVector.strengths.filter((s) =>
      callerVector.weaknesses.includes(s),
    )

    const totalComplementary = callerHelpsCandidate.length + candidateHelpsCaller.length
    if (totalComplementary === 0) continue

    const avgCallerHelp =
      callerHelpsCandidate.length > 0
        ? callerHelpsCandidate.reduce(
            (sum, c) => sum + (callerVector.strengthMap.get(c) ?? 0.75),
            0,
          ) / callerHelpsCandidate.length
        : 0
    const avgCandidateHelp =
      candidateHelpsCaller.length > 0
        ? candidateHelpsCaller.reduce(
            (sum, c) => sum + (cVector.strengthMap.get(c) ?? 0.75),
            0,
          ) / candidateHelpsCaller.length
        : 0

    let score = (avgCallerHelp + avgCandidateHelp) / 2

    // Normalize by complement ratio
    const allConcepts = new Set([
      ...callerVector.strengths,
      ...callerVector.weaknesses,
      ...cVector.strengths,
      ...cVector.weaknesses,
    ])
    if (allConcepts.size > 0) {
      score *= totalComplementary / allConcepts.size
    }

    // Bonus: shared available days
    const sharedDays = callerVector.availableDays.filter((d) =>
      cVector.availableDays.includes(d),
    )
    if (sharedDays.length > 0) score += 0.1

    // Bonus: different learning modalities
    if (
      callerVector.preferredModality &&
      cVector.preferredModality &&
      callerVector.preferredModality !== cVector.preferredModality
    ) {
      score += 0.05
    }

    // Clamp to [0, 1]
    score = Math.min(1, Math.max(0, score))

    if (score > 0.4) {
      scored.push({ userId: candidate.studentId, score })
    }
  }

  if (scored.length === 0) return []

  // 5. Greedy group formation
  scored.sort((a, b) => b.score - a.score)
  const preferredSize = callerProfile.preferredSize
  const used = new Set<string>()
  const groups: { memberIds: string[]; avgScore: number }[] = []

  // First group always includes the caller
  const firstGroup: string[] = [userId]
  for (const s of scored) {
    if (firstGroup.length >= preferredSize) break
    if (!used.has(s.userId)) {
      firstGroup.push(s.userId)
      used.add(s.userId)
    }
  }

  if (firstGroup.length >= 2) {
    const avgScore =
      scored
        .filter((s) => firstGroup.includes(s.userId))
        .reduce((sum, s) => sum + s.score, 0) / (firstGroup.length - 1)
    groups.push({ memberIds: firstGroup, avgScore })
  }

  // Form additional groups from remaining candidates for variety
  const remaining = scored.filter((s) => !used.has(s.userId))
  if (remaining.length >= 1) {
    const altGroup: string[] = [userId]
    for (const s of remaining) {
      if (altGroup.length >= preferredSize) break
      altGroup.push(s.userId)
      used.add(s.userId)
    }
    if (altGroup.length >= 2) {
      const avgScore =
        remaining
          .filter((s) => altGroup.includes(s.userId))
          .reduce((sum, s) => sum + s.score, 0) / (altGroup.length - 1)
      groups.push({ memberIds: altGroup, avgScore })
    }
  }

  // 6. Generate match reasons via Haiku + create StudyMatch records
  const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const suggestions: StudyMatchSuggestion[] = []

  for (const group of groups.slice(0, 3)) {
    const members: StudyMatchMember[] = group.memberIds.map((uid) => {
      const vec = vectorMap.get(uid)!
      // canHelpWith = this user's strengths that are other members' weaknesses
      const otherWeaknesses = group.memberIds
        .filter((id) => id !== uid)
        .flatMap((id) => vectorMap.get(id)?.weaknesses ?? [])
      const canHelpWith = vec.strengths.filter((s) => otherWeaknesses.includes(s))

      // needsHelpWith = this user's weaknesses that other members are strong in
      const otherStrengths = group.memberIds
        .filter((id) => id !== uid)
        .flatMap((id) => vectorMap.get(id)?.strengths ?? [])
      const needsHelpWith = vec.weaknesses.filter((w) => otherStrengths.includes(w))

      return {
        userId: uid,
        name: vec.firstName,
        strengths: vec.strengths.slice(0, 5),      // cap for readability
        canHelpWith: canHelpWith.slice(0, 5),
        needsHelpWith: needsHelpWith.slice(0, 5),
        accepted: false,
      }
    })

    // Generate match reason via Haiku
    const memberDescriptions = members
      .map(
        (m) =>
          `${m.name} is strong in ${m.strengths.join(', ') || 'general concepts'} but needs help with ${m.needsHelpWith.join(', ') || 'some topics'}`,
      )
      .join('. ')

    let matchReason: string
    try {
      const response = await anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `These students are in ${course.courseCode}. ${memberDescriptions}. Write a 1-2 sentence explanation of why they'd be good study partners. Use first names only. Do not mention scores.`,
          },
        ],
      })
      matchReason =
        response.content[0].type === 'text'
          ? response.content[0].text
          : 'These students have complementary strengths that could help each other succeed.'
    } catch {
      matchReason =
        'These students have complementary strengths and weaknesses — studying together could help everyone improve.'
    }

    // 7. Create StudyMatch record
    const match = await prisma.studyMatch.create({
      data: {
        courseId,
        members: toJsonValue(members),
        complementarityScore: group.avgScore,
        matchReason,
        status: 'suggested',
        expiresAt: twoWeeks,
      },
    })

    suggestions.push({
      id: match.id,
      courseId,
      courseCode: course.courseCode,
      members,
      complementarityScore: group.avgScore,
      matchReason,
      expiresAt: twoWeeks.toISOString(),
      status: 'suggested',
    })
  }

  return suggestions
}

// ── Respond to a Match ───────────────────────────────────────────────────────

export async function respondToMatch(
  matchId: string,
  userId: string,
  action: 'accept' | 'decline',
): Promise<{ status: string; chatGroupId?: string }> {
  const match = await prisma.studyMatch.findUnique({ where: { id: matchId } })
  if (!match) throw new Error('Match not found')

  const members = match.members as unknown as StudyMatchMember[]
  const memberIdx = members.findIndex((m) => m.userId === userId)
  if (memberIdx === -1) throw new Error('You are not a member of this match')

  if (match.status === 'active' || match.status === 'declined') {
    return { status: match.status }
  }

  // Decline
  if (action === 'decline') {
    await prisma.studyMatch.update({
      where: { id: matchId },
      data: { status: 'declined' },
    })
    return { status: 'declined' }
  }

  // Accept — mark this member as accepted
  members[memberIdx].accepted = true
  const allAccepted = members.every((m) => m.accepted)

  if (!allAccepted) {
    await prisma.studyMatch.update({
      where: { id: matchId },
      data: { members: toJsonValue(members) },
    })
    return { status: 'suggested' }
  }

  // All members accepted — create chat group
  const course = await prisma.course.findUnique({
    where: { id: match.courseId },
    select: { courseCode: true },
  })

  const firstNames = members.map((m) => m.name).join(', ')
  const groupName = `${course?.courseCode ?? 'Study'} — ${firstNames}`

  const chatGroup = await prisma.chatGroup.create({
    data: {
      name: groupName,
      type: 'STUDY',
      createdById: userId,
      sandyEnabled: true,
    },
  })

  // Create default channel
  await prisma.chatChannel.create({
    data: {
      groupId: chatGroup.id,
      name: 'general',
      type: 'GENERAL',
      position: 0,
      createdById: userId,
    },
  })

  // Add all members
  await prisma.chatMembership.createMany({
    data: members.map((m, i) => ({
      userId: m.userId,
      groupId: chatGroup.id,
      role: i === 0 ? 'OWNER' as const : 'MEMBER' as const,
    })),
  })

  // Update match to active
  await prisma.studyMatch.update({
    where: { id: matchId },
    data: {
      status: 'active',
      members: toJsonValue(members),
    },
  })

  return { status: 'active', chatGroupId: chatGroup.id }
}
