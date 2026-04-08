/**
 * Study Streak Service — Tracks consecutive days a user participated in The Commons.
 *
 * A "study day" counts if the user participated in ANY Commons session that day.
 * Streak resets if a day is missed. Queries LiveRoomParticipant join dates.
 */

import { prisma } from '../prisma'

export type { StreakData } from './types'
import type { StreakData } from './types'

export async function getStudyStreak(userId: string): Promise<StreakData> {
  // Get all participation dates (distinct days)
  const participations = await prisma.liveRoomParticipant.findMany({
    where: { userId },
    select: { joinedAt: true, room: { select: { type: true, config: true, endedAt: true, startedAt: true } } },
    orderBy: { joinedAt: 'desc' },
  })

  if (participations.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalSessions: 0, totalMinutes: 0, lastActiveDate: null, isActiveToday: false }
  }

  // Get unique dates (in local time, using UTC day boundaries)
  const activeDays = new Set<string>()
  let totalMinutes = 0

  for (const p of participations) {
    const day = p.joinedAt.toISOString().slice(0, 10)
    activeDays.add(day)

    // Estimate minutes: for study rooms use config, for challenges ~3min/round, for others ~15min
    const room = p.room
    if (room.type === 'STUDY') {
      const config = room.config as Record<string, unknown>
      const cycles = (config?.totalCycles as number) ?? 4
      const focusMin = (config?.focusMinutes as number) ?? 25
      totalMinutes += cycles * focusMin
    } else if (room.type === 'CHALLENGE') {
      const config = room.config as Record<string, unknown>
      const rounds = (config?.rounds as number) ?? 5
      totalMinutes += rounds * 3 // ~3 min per round
    } else if (room.type === 'WATCH' || room.type === 'TEACHBACK') {
      totalMinutes += 15
    } else if (room.type === 'SIMULATION') {
      totalMinutes += 15
    } else if (room.type === 'DEBATE') {
      totalMinutes += 20
    } else if (room.type === 'PROBLEM_LAB') {
      totalMinutes += 20
    } else if (room.type === 'SPEED_MENTORING') {
      totalMinutes += 30
    } else if (room.type === 'PEER_REVIEW') {
      totalMinutes += 25
    } else if (room.type === 'OFFICE_HOURS') {
      totalMinutes += 30
    } else if (room.type === 'CASE_STUDY') {
      totalMinutes += 20
    } else if (room.type === 'IMPROV') {
      totalMinutes += 15
    } else if (room.type === 'FISHBOWL') {
      totalMinutes += 25
    } else {
      totalMinutes += 15
    }
  }

  // Calculate current streak
  const sortedDays = [...activeDays].sort().reverse() // Most recent first
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  let currentStreak = 0
  const isActiveToday = activeDays.has(today)

  // Start counting from today or yesterday
  const checkDate = isActiveToday ? today : yesterday

  if (checkDate === yesterday && !activeDays.has(yesterday)) {
    // Neither today nor yesterday — streak is 0
    currentStreak = 0
  } else {
    // Count consecutive days backwards
    const dateObj = new Date(checkDate + 'T00:00:00Z')
    while (activeDays.has(dateObj.toISOString().slice(0, 10))) {
      currentStreak++
      dateObj.setUTCDate(dateObj.getUTCDate() - 1)
    }
  }

  // Calculate longest streak
  let longestStreak = 0
  let tempStreak = 0
  const sortedAsc = [...activeDays].sort()

  for (let i = 0; i < sortedAsc.length; i++) {
    if (i === 0) {
      tempStreak = 1
    } else {
      const prev = new Date(sortedAsc[i - 1]! + 'T00:00:00Z')
      const curr = new Date(sortedAsc[i]! + 'T00:00:00Z')
      const diffDays = (curr.getTime() - prev.getTime()) / 86400000

      if (diffDays === 1) {
        tempStreak++
      } else {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
      }
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak)

  return {
    currentStreak,
    longestStreak,
    totalSessions: participations.length,
    totalMinutes,
    lastActiveDate: sortedDays[0] ?? null,
    isActiveToday,
  }
}
