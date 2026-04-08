// ── Engagement Fingerprint Engine — Type Definitions ──────────────────────────

/** Hour-of-day and day-of-week activity patterns */
export interface TemporalProfile {
  peakHours: number[]       // Top 3 most active hours (0-23)
  peakDays: number[]        // Top 3 most active days (0=Sun, 6=Sat)
  chronotype: 'early-bird' | 'night-owl' | 'steady' | 'weekend-warrior'
  sessionCadence: 'daily-grinder' | 'binge-learner' | 'sprint-rester' | 'crammer' | 'minimal'
}

/** Study mode and modality preferences derived from session data */
export interface LearningProfile {
  preferredStudyModes: string[]   // Top 3 study buddy modes by session count
  preferredModality: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed'
  bloomProfile: Record<string, number> // e.g. { knowledge: 0.15, comprehension: 0.25, ... }
  learningVelocity: 'accelerating' | 'steady' | 'decelerating' | 'plateaued'
  masteryRetention: number        // 0-1: flashcard retention rate
}

/** Tool usage breadth, consistency, and deadline behavior */
export interface EngagementShape {
  toolDiversity: number       // 0-1: unique tools / total tools available
  consistencyScore: number    // 0-1: higher = more consistent daily activity
  avgSessionMinutes: number
  sessionsPerWeek: number
  deadlineProximity: 'planner' | 'steady' | 'crammer' | 'late'
}

/** Collaboration and social interaction patterns */
export interface SocialProfile {
  collaborationIndex: number  // 0-1: social activity / total activity
  socialOrientation: 'solo' | 'small-group' | 'community-active'
  liveRoomWeekly: number      // Live room sessions per week
  messagingWeekly: number     // Messages sent per week
  studyGroupCount: number     // Active study group memberships
}

/** How the user responds to nudges, announcements, and Sandy suggestions */
export interface ResponsivenessProfile {
  nudgeResponseRate: number       // 0-1: interventions acted on / received
  announcementReadRate: number    // 0-1: course posts read / total posts
  sandyEngagementRate: number     // 0-1: Sandy suggestions accepted / offered
}

/** Computation quality metadata */
export interface FingerprintMeta {
  signalCount: number     // Total data points that fed this computation
  confidence: number      // 0-1: composite confidence (low data = low)
  windowDays: number      // Rolling window in days
  version: number         // Schema version for forward compat
}

/** Complete computed fingerprint — output of the engine */
export interface ComputedFingerprint {
  temporal: TemporalProfile
  learning: LearningProfile
  engagement: EngagementShape
  social: SocialProfile
  responsiveness: ResponsivenessProfile
  meta: FingerprintMeta
}
