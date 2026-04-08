// Barrel file — re-exports public API from fingerprint services

export type {
  TemporalProfile,
  LearningProfile,
  EngagementShape,
  SocialProfile,
  ResponsivenessProfile,
  FingerprintMeta,
  ComputedFingerprint,
} from './types'

export {
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

export { computeEngagementShape } from './engagement'
export { computeLearningProfile } from './learning'
export { computeResponsiveness } from './responsiveness'
export { computeSocialProfile } from './social'
export { computeTemporalProfile, topN, sum } from './temporal'

export { computeFingerprint } from './fingerprint-engine'

export {
  getFingerprint,
  refreshFingerprint,
  getCourseFingerprint,
  refreshCourseFingerprint,
  refreshAllFingerprints,
  refreshAllCourseFingerprints,
} from './fingerprint-service'

export { personalizeCollectionOrder } from './hub-personalization'

export { getOptimalNotificationWindow, isWithinPeakWindow } from './notification-timing'

export { formatHour, buildFingerprintBlock } from './sandy-context'
