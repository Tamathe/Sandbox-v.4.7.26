// ── Engagement Fingerprint — Core Engine ──────────────────────────────────────
// Orchestrates parallel data fetching → computation modules → ComputedFingerprint.
// No LLM calls. No persistence (that's fingerprint-service.ts).

import type { ComputedFingerprint } from './types'
import {
  fetchToolSessions,
  fetchFlashcardStats,
  fetchConceptMastery,
  fetchDomainModality,
  fetchLiveRoomActivity,
  fetchSandyTraces,
  fetchMessageActivity,
  fetchStudyGroupMemberships,
  fetchAssignments,
  fetchSubmissions,
  fetchCoursePostReads,
  fetchTotalCoursePosts,
  fetchInterventions,
  fetchWellnessEntryCount,
} from './data-fetchers'
import { computeTemporalProfile } from './temporal'
import { computeLearningProfile } from './learning'
import { computeEngagementShape } from './engagement'
import { computeSocialProfile } from './social'
import { computeResponsiveness } from './responsiveness'

interface FingerprintInput {
  userId: string
  windowDays?: number
}

export async function computeFingerprint(input: FingerprintInput): Promise<ComputedFingerprint> {
  const { userId, windowDays = 30 } = input
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

  // ── Parallel data fetch — all 14 queries run concurrently ──
  const [
    toolSessions,
    flashcardStats,
    conceptMastery,
    domainModalities,
    liveRooms,
    sandyTraces,
    messageActivity,
    studyGroupMemberships,
    assignments,
    submissions,
    coursePostReads,
    totalCoursePosts,
    interventions,
    wellnessEntries,
  ] = await Promise.all([
    fetchToolSessions(userId, since),
    fetchFlashcardStats(userId, since),
    fetchConceptMastery(userId, since),
    fetchDomainModality(userId, since),
    fetchLiveRoomActivity(userId, since),
    fetchSandyTraces(userId, since),
    fetchMessageActivity(userId, since),
    fetchStudyGroupMemberships(userId, since),
    fetchAssignments(userId, since),
    fetchSubmissions(userId, since),
    fetchCoursePostReads(userId, since),
    fetchTotalCoursePosts(userId, since),
    fetchInterventions(userId, since),
    fetchWellnessEntryCount(userId, since),
  ])

  // ── Compute each dimension ──
  const temporal = computeTemporalProfile(toolSessions, since, windowDays)
  const learning = computeLearningProfile(toolSessions, flashcardStats, conceptMastery, domainModalities)
  const engagement = computeEngagementShape(toolSessions, submissions, assignments, since, windowDays)
  const social = computeSocialProfile(
    liveRooms,
    messageActivity,
    studyGroupMemberships,
    toolSessions.length,
    windowDays
  )
  const responsiveness = computeResponsiveness(interventions, coursePostReads, totalCoursePosts, sandyTraces)

  // ── Signal count & confidence ──
  const signalCount =
    toolSessions.length +
    flashcardStats.length +
    conceptMastery.length +
    liveRooms.length +
    messageActivity.messageCount +
    interventions.total +
    wellnessEntries.entryCount
  const confidence = Math.min(1, signalCount / 100)

  return {
    temporal,
    learning,
    engagement,
    social,
    responsiveness,
    meta: { signalCount, confidence, windowDays, version: 1 },
  }
}
