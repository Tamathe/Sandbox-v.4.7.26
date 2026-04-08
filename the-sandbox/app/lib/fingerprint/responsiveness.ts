// ── Engagement Fingerprint — Responsiveness Profile Computation ───────────────
// Pure function: derives nudge response, announcement read, and Sandy
// engagement rates from intervention + post + trace data.

import type { ResponsivenessProfile } from './types'

interface InterventionInput {
  total: number
  accepted: number
}

interface PostReadInput {
  readCount: number
}

interface TotalPostInput {
  postCount: number
}

interface SandyTraceInput {
  totalOffered: number
  totalApproved: number
}

export function computeResponsiveness(
  interventions: InterventionInput,
  postReads: PostReadInput,
  totalPosts: TotalPostInput,
  sandyTraces: SandyTraceInput
): ResponsivenessProfile {
  const nudgeResponseRate =
    interventions.total > 0 ? interventions.accepted / interventions.total : 0.5

  const announcementReadRate =
    totalPosts.postCount > 0 ? postReads.readCount / totalPosts.postCount : 0.5

  const sandyEngagementRate =
    sandyTraces.totalOffered > 0 ? sandyTraces.totalApproved / sandyTraces.totalOffered : 0.5

  return { nudgeResponseRate, announcementReadRate, sandyEngagementRate }
}
