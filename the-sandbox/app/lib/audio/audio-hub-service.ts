// app/lib/audio/audio-hub-service.ts
// Audio Hub Service — data access layer for the Audio Experience Platform

import { prisma } from '../prisma'
import { Prisma } from '../../generated/prisma'
import type {
  EpisodeCardData,
  EpisodeDetail,
  AudioHubFeedResponse,
  AudioHubCoursesResponse,
  AudioHubBrowseResponse,
  Bookmark,
  SegmentMap,
} from './types'

// ─── Types (internal Prisma shapes) ─────────────────────────────────────────

type RawRender = {
  cdnUrl: string
  durationSecs: number
  isStale: boolean
  createdAt: Date
}

type RawHistory = {
  completedPct: number
  lastPositionMs: number
  bookmarks: unknown
}

type RawEpisode = {
  id: string
  sourceName: string
  courseId: string | null
  tier: string
  status: string
  tags: string[]
  listenCount: number
  createdAt: Date
  publishedAt: Date | null
  audioRenders?: RawRender[]
  studentHistory?: RawHistory[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Pick the best (non-stale, most recent) render from a list */
function bestRender(renders: RawRender[]): RawRender | null {
  const active = renders.filter((r) => !r.isStale)
  if (active.length === 0) return renders[0] ?? null
  return active.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
}

/**
 * Maps raw Prisma data to `EpisodeCardData`.
 * @param ep      - Raw AudioEpisode row (with optional relations)
 * @param render  - Pre-selected AudioRender (optional; falls back to ep.audioRenders)
 * @param history - StudentAudioHistory row for this user (optional)
 */
export function toEpisodeCard(
  ep: RawEpisode,
  render?: RawRender | null,
  history?: RawHistory | null,
): EpisodeCardData {
  const resolvedRender = render ?? (ep.audioRenders ? bestRender(ep.audioRenders) : null)
  const resolvedHistory = history ?? ep.studentHistory?.[0] ?? null

  return {
    id: ep.id,
    title: ep.sourceName,
    sourceName: ep.sourceName,
    courseId: ep.courseId,
    tier: ep.tier as EpisodeCardData['tier'],
    status: ep.status as EpisodeCardData['status'],
    tags: ep.tags ?? [],
    listenCount: ep.listenCount,
    durationSecs: resolvedRender?.durationSecs ?? 0,
    cdnUrl: resolvedRender?.cdnUrl ?? null,
    createdAt: ep.createdAt.toISOString(),
    publishedAt: ep.publishedAt ? ep.publishedAt.toISOString() : null,
    completedPct: resolvedHistory?.completedPct,
    lastPositionMs: resolvedHistory?.lastPositionMs,
  }
}

// ─── Shared include fragment ─────────────────────────────────────────────────

function episodeInclude(userId?: string) {
  return {
    audioRenders: {
      where: { isStale: false },
      orderBy: { createdAt: 'desc' as const },
      take: 1,
    },
    ...(userId
      ? {
          studentHistory: {
            where: { studentId: userId },
            take: 1,
          },
        }
      : {}),
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Personalized feed for a student:
 *  - continueListening: episodes with progress, ordered by most recently heard
 *  - recommended: published episodes from enrolled courses, not yet started
 *  - trending: campus-wide trending (last 7 days)
 */
export async function getForYouFeed(userId: string): Promise<AudioHubFeedResponse> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Fetch enrolled course IDs
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: userId },
    select: { courseId: true },
  })
  const enrolledCourseIds = enrollments.map((e) => e.courseId)

  // Continue listening: episodes the student has started but not finished
  const continueRaw = await prisma.studentAudioHistory.findMany({
    where: {
      studentId: userId,
      completedPct: { lt: 0.9 },
      lastPositionMs: { gt: 0 },
    },
    orderBy: { lastListenAt: 'desc' },
    take: 10,
    include: {
      episode: {
        include: episodeInclude(userId),
      },
    },
  })

  const continueListening: EpisodeCardData[] = continueRaw
    .filter((h) => h.episode.status === 'published')
    .map((h) =>
      toEpisodeCard(
        h.episode as unknown as RawEpisode,
        undefined,
        {
          completedPct: h.completedPct,
          lastPositionMs: h.lastPositionMs,
          bookmarks: h.bookmarks,
        },
      ),
    )

  // Already-started episode IDs to exclude from recommended
  const startedIds = new Set(continueRaw.map((h) => h.episodeId))

  // Recommended + Trending in parallel (independent queries)
  const [recommendedRaw, trendingRaw] = await Promise.all([
    enrolledCourseIds.length > 0
      ? prisma.audioEpisode.findMany({
          where: {
            courseId: { in: enrolledCourseIds },
            status: 'published',
            id: { notIn: Array.from(startedIds) },
          },
          orderBy: { publishedAt: 'desc' },
          take: 10,
          include: episodeInclude(userId),
        })
      : Promise.resolve([]),
    prisma.audioEpisode.findMany({
      where: {
        status: 'published',
        visibility: 'campus',
        publishedAt: { gte: sevenDaysAgo },
      },
      orderBy: { listenCount: 'desc' },
      take: 10,
      include: episodeInclude(userId),
    }),
  ])

  const recommended = recommendedRaw.map((ep) => toEpisodeCard(ep as unknown as RawEpisode))
  const trending = trendingRaw.map((ep) => toEpisodeCard(ep as unknown as RawEpisode))

  return { continueListening, recommended, trending }
}

/**
 * Episodes grouped by the student's enrolled courses.
 */
export async function getCourseEpisodes(userId: string): Promise<AudioHubCoursesResponse> {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: userId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          courseCode: true,
        },
      },
    },
  })

  const enrolledCourseIds = enrollments.map((e) => e.courseId)
  if (enrolledCourseIds.length === 0) return { courses: [] }

  const allEpisodes = await prisma.audioEpisode.findMany({
    where: {
      courseId: { in: enrolledCourseIds },
      status: 'published',
    },
    orderBy: { publishedAt: 'desc' },
    include: episodeInclude(userId),
  })

  const episodesByCourse = new Map<string, typeof allEpisodes>()
  for (const ep of allEpisodes) {
    if (!ep.courseId) continue
    const list = episodesByCourse.get(ep.courseId) ?? []
    list.push(ep)
    episodesByCourse.set(ep.courseId, list)
  }

  const courses: AudioHubCoursesResponse['courses'] = []
  for (const enrollment of enrollments) {
    const eps = episodesByCourse.get(enrollment.courseId)
    if (!eps?.length) continue

    const cards = eps.map((ep) => toEpisodeCard(ep as unknown as RawEpisode))
    const totalDuration = cards.reduce((sum, c) => sum + c.durationSecs, 0)

    courses.push({
      courseId: enrollment.courseId,
      courseName: enrollment.course.title,
      courseCode: enrollment.course.courseCode,
      episodes: cards,
      totalDuration,
    })
  }

  return { courses }
}

/**
 * Browse episodes with optional full-text search and tag filter.
 */
export async function browseEpisodes(
  query?: string,
  tag?: string,
  offset = 0,
  limit = 20,
): Promise<AudioHubBrowseResponse> {
  const where = {
    status: 'published' as const,
    visibility: 'campus' as const,
    ...(tag ? { tags: { has: tag } } : {}),
    ...(query
      ? {
          sourceName: { contains: query, mode: 'insensitive' as const },
        }
      : {}),
  }

  const [episodes, total] = await Promise.all([
    prisma.audioEpisode.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: offset,
      take: limit,
      include: episodeInclude(),
    }),
    prisma.audioEpisode.count({ where }),
  ])

  // Aggregate tag counts across all published campus episodes
  const allTagRows = await prisma.audioEpisode.findMany({
    where: { status: 'published', visibility: 'campus' },
    select: { tags: true },
  })
  const tagCountMap = new Map<string, number>()
  for (const row of allTagRows) {
    for (const t of row.tags) {
      tagCountMap.set(t, (tagCountMap.get(t) ?? 0) + 1)
    }
  }
  const tags = Array.from(tagCountMap.entries())
    .map(([t, count]) => ({ tag: t, count }))
    .sort((a, b) => b.count - a.count)

  return {
    episodes: episodes.map((ep) => toEpisodeCard(ep as unknown as RawEpisode)),
    tags,
    total,
  }
}

/**
 * Campus-wide trending episodes (last 7 days), ordered by listenCount.
 */
export async function getTrendingEpisodes(limit = 10): Promise<EpisodeCardData[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const rows = await prisma.audioEpisode.findMany({
    where: {
      status: 'published',
      visibility: 'campus',
      publishedAt: { gte: sevenDaysAgo },
    },
    orderBy: { listenCount: 'desc' },
    take: limit,
    include: episodeInclude(),
  })

  return rows.map((ep) => toEpisodeCard(ep as unknown as RawEpisode))
}

/**
 * Full episode detail including segment map and bookmarks.
 */
export async function getEpisodeDetail(
  episodeId: string,
  userId?: string,
): Promise<EpisodeDetail | null> {
  const ep = await prisma.audioEpisode.findUnique({
    where: { id: episodeId },
    include: {
      audioRenders: {
        where: { isStale: false },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      ...(userId
        ? {
            studentHistory: {
              where: { studentId: userId },
              take: 1,
            },
          }
        : {}),
    },
  })

  if (!ep) return null

  const render = bestRender(ep.audioRenders as RawRender[])
  const history =
    userId && (ep as unknown as { studentHistory?: RawHistory[] }).studentHistory?.[0]
      ? (ep as unknown as { studentHistory: RawHistory[] }).studentHistory[0]
      : null

  const card = toEpisodeCard(ep as unknown as RawEpisode, render, history)

  // Parse segmentMap from JSON
  let segmentMap: SegmentMap | null = null
  if (ep.segmentMap) {
    try {
      segmentMap = ep.segmentMap as unknown as SegmentMap
    } catch {
      segmentMap = null
    }
  }

  // Parse bookmarks from history
  const bookmarks: Bookmark[] = []
  if (history?.bookmarks) {
    try {
      const raw = history.bookmarks as unknown[]
      if (Array.isArray(raw)) {
        bookmarks.push(...(raw as Bookmark[]))
      }
    } catch {
      // ignore malformed
    }
  }

  return {
    ...card,
    transcript: ep.transcript ?? null,
    transcriptFormat: ep.transcriptFormat ?? null,
    segmentMap,
    chapters: [], // Derived from segmentMap in future; placeholder for now
    visibility: ep.visibility as EpisodeDetail['visibility'],
    creatorId: ep.creatorId ?? null,
  }
}

/**
 * Fire-and-forget listen counter increment.
 * Never throws — safe to call without await.
 */
export function incrementListenCount(episodeId: string): void {
  prisma.audioEpisode
    .update({
      where: { id: episodeId },
      data: { listenCount: { increment: 1 } },
    })
    .catch(() => {
      // Intentionally swallowed — fire-and-forget
    })
}

/**
 * Upsert a student's listening progress for an episode.
 */
export async function updateListeningHistory(
  userId: string,
  episodeId: string,
  positionMs: number,
  completedPct: number,
): Promise<void> {
  const now = new Date()
  const isCompleted = completedPct >= 0.9

  await prisma.studentAudioHistory.upsert({
    where: { studentId_episodeId: { studentId: userId, episodeId } },
    create: {
      studentId: userId,
      episodeId,
      lastPositionMs: positionMs,
      completedPct,
      listenCount: 1,
      lastListenAt: now,
      firstListenAt: now,
      completedAt: isCompleted ? now : null,
    },
    update: {
      lastPositionMs: positionMs,
      completedPct,
      listenCount: { increment: 1 },
      lastListenAt: now,
      ...(isCompleted ? { completedAt: now } : {}),
    },
  })
}

/**
 * Add or replace a bookmark at a given timestamp for a student.
 * If a bookmark already exists within 2 seconds of the timestamp, it is replaced.
 */
export async function addBookmark(
  userId: string,
  episodeId: string,
  bookmark: Bookmark,
): Promise<void> {
  const existing = await prisma.studentAudioHistory.findUnique({
    where: { studentId_episodeId: { studentId: userId, episodeId } },
    select: { bookmarks: true },
  })

  let bookmarks: Bookmark[] = []
  if (existing?.bookmarks) {
    try {
      const raw = existing.bookmarks as unknown[]
      if (Array.isArray(raw)) {
        bookmarks = raw as Bookmark[]
      }
    } catch {
      // ignore
    }
  }

  // Replace any bookmark within 2 s of the new timestamp
  const TOLERANCE_MS = 2000
  const filtered = bookmarks.filter(
    (b) => Math.abs(b.timestampMs - bookmark.timestampMs) > TOLERANCE_MS,
  )
  filtered.push(bookmark)
  filtered.sort((a, b) => a.timestampMs - b.timestampMs)

  await prisma.studentAudioHistory.upsert({
    where: { studentId_episodeId: { studentId: userId, episodeId } },
    create: {
      studentId: userId,
      episodeId,
      bookmarks: filtered as unknown as Prisma.InputJsonValue,
    },
    update: {
      bookmarks: filtered as unknown as Prisma.InputJsonValue,
    },
  })
}

/**
 * Rate limit check: students may generate at most 3 episodes per day.
 * Returns true if the student is under the limit.
 */
export async function canStudentGenerate(userId: string): Promise<boolean> {
  const DAILY_LIMIT = 3
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const count = await prisma.audioGenerationJob.count({
    where: {
      requestedBy: userId,
      createdAt: { gte: startOfDay },
    },
  })

  return count < DAILY_LIMIT
}
