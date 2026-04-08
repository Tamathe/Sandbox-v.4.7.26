// ── Engagement Fingerprint — Social Profile Computation ───────────────────────
// Pure function: derives collaboration index and social orientation from
// live room, messaging, and study group data.

import type { SocialProfile } from './types'

interface LiveRoomInput {
  score: number | null
  joinedAt: Date
  room: { type: string; phase: string }
}

interface MessageActivityInput {
  messageCount: number
}

interface StudyGroupInput {
  groupCount: number
}

export function computeSocialProfile(
  liveRooms: LiveRoomInput[],
  messageActivity: MessageActivityInput,
  studyGroupMemberships: StudyGroupInput,
  sessionCount: number,
  windowDays: number
): SocialProfile {
  const weeks = windowDays / 7 || 1

  const liveRoomWeekly = liveRooms.length / weeks
  const messagingWeekly = messageActivity.messageCount / weeks
  const studyGroupCount = studyGroupMemberships.groupCount

  // ── Collaboration index ──
  const socialActivity = liveRooms.length + messageActivity.messageCount + studyGroupCount
  const totalActivity = sessionCount + socialActivity
  const collaborationIndex = totalActivity > 0 ? Math.min(1, socialActivity / totalActivity) : 0

  // ── Social orientation ──
  let socialOrientation: SocialProfile['socialOrientation']
  if (collaborationIndex < 0.15) {
    socialOrientation = 'solo'
  } else if (
    collaborationIndex < 0.4 ||
    (studyGroupCount <= 2 && liveRoomWeekly < 2)
  ) {
    socialOrientation = 'small-group'
  } else {
    socialOrientation = 'community-active'
  }

  return {
    collaborationIndex,
    socialOrientation,
    liveRoomWeekly,
    messagingWeekly,
    studyGroupCount,
  }
}
