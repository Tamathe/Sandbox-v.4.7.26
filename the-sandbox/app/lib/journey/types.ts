import type { JourneySnapshot, JourneyMilestone } from '../../generated/prisma'

export type TrajectoryLabel = 'ascending' | 'stable' | 'dipping' | 'recovering' | 'declining' | 'insufficient-data'

export type MilestoneType =
  | 'breakthrough'
  | 'struggle-start'
  | 'recovery'
  | 'engagement-shift'
  | 'social-expansion'
  | 'milestone-reached'
  | 'intervention-success'

export type JourneyLayer = 'academic' | 'mastery' | 'study' | 'social' | 'wellness' | 'campus'

export interface JourneySnapshotData {
  userId: string
  weekOf: Date
  activeCoursesCount: number
  avgGrade: number | null
  submissionsOnTime: number
  submissionsLate: number
  studySessions: number
  avgSessionMinutes: number
  flashcardsReviewed: number
  conceptsGained: number
  topStudyMode: string | null
  messagesSent: number
  liveRoomsJoined: number
  studyGroupsActive: number
  totalPlatformMinutes: number
  uniqueToolsUsed: number
  sandyInteractions: number
  nudgesActedOn: number
  nudgesReceived: number
  wellnessEntryCount: number
  eventsAttended: number
  orgsActive: number
  engagementScore: number
  trajectoryLabel: string
}

export interface JourneyMilestoneData {
  type: MilestoneType
  title: string
  description: string
  layer: JourneyLayer
  relatedCourseId?: string
  relatedConcept?: string
  significance: number
  occurredAt: Date
}

export interface FingerprintSummary {
  chronotype: string
  cadence: string
  socialOrientation: string
  learningVelocity: string
}

export interface StudentJourney {
  userId: string
  timeRange: { from: Date; to: Date }
  snapshots: JourneySnapshot[]
  milestones: JourneyMilestone[]
  fingerprint: FingerprintSummary | null
  narrative: string
  currentTrajectory: string
}
