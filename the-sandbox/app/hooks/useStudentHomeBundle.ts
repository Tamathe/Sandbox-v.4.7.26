// ─── useStudentHomeBundle ────────────────────────────────────────
// Replaces 6 individual API calls on the Student Homepage with one bundle.

import { useApiFetch } from './useApiFetch'

interface EnrollmentCourse {
  courseId: string
  courseCode: string
  title: string
  instructorName: string
  mastered: number
  struggling: number
  total: number
}

interface SRNudge {
  dueCount: number
  overdueCount: number
  dueConcepts: Array<{
    conceptSlug: string
    courseCode: string
    bloomHighWater: number
    missedReviews: number
    nextReviewAt: string
  }>
}

interface CommunityPulse {
  activeRooms: Array<{
    id: string
    type: string
    title: string
    phase: string
    hostName: string
    groupName: string
    participantCount: number
    participants: string[]
    shareUrl: string
  }>
  stats: {
    activeStudyRooms: number
    activeStudiers: number
    challengesToday: number
    participantsToday: number
  }
}

interface DraftTool {
  id: string
  name: string
  shortDescription: string | null
  category: string
  toolType: string
  thumbnailUrl: string | null
}

interface UKNowEvent {
  id: string
  title: string
  sectionLabel: string | null
  publishedAt: string | null
}

interface StudentHomeBundleResponse {
  enrollments: EnrollmentCourse[]
  srNudge: SRNudge
  communityPulse: CommunityPulse
  emailInsights: unknown[]
  draftTools: DraftTool[]
  uknowEvents: UKNowEvent[]
  homepageView: string
  sandyIntroSeen: boolean
  vcEncounterCount: number
}

export interface StudentHomeBundleData {
  enrollments: EnrollmentCourse[]
  enrollmentLoading: boolean
  srNudge: SRNudge
  communityPulse: CommunityPulse
  emailInsights: unknown[]
  draftTools: DraftTool[]
  uknowEvents: UKNowEvent[]
  homepageView: string
  sandyIntroSeen: boolean
  vcEncounterCount: number
  loading: boolean
}

export function useStudentHomeBundle(_userEmail: string): StudentHomeBundleData {
  const { data, isLoading: loading } = useApiFetch<StudentHomeBundleResponse>('/api/student/home-bundle')

  const empty: SRNudge = { dueCount: 0, overdueCount: 0, dueConcepts: [] }
  const emptyPulse: CommunityPulse = {
    activeRooms: [],
    stats: { activeStudyRooms: 0, activeStudiers: 0, challengesToday: 0, participantsToday: 0 },
  }

  return {
    enrollments: data?.enrollments ?? [],
    enrollmentLoading: loading,
    srNudge: data?.srNudge ?? empty,
    communityPulse: data?.communityPulse ?? emptyPulse,
    emailInsights: data?.emailInsights ?? [],
    draftTools: data?.draftTools ?? [],
    uknowEvents: data?.uknowEvents ?? [],
    homepageView: data?.homepageView ?? 'focus',
    sandyIntroSeen: data?.sandyIntroSeen ?? false,
    vcEncounterCount: data?.vcEncounterCount ?? 0,
    loading,
  }
}
