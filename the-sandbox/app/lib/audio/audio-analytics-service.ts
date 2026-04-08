import { prisma } from '../prisma'

export interface AudioAnalytics {
  sessionsThisWeek: number
  sessionsTrend: number
  avgSessionLength: number
  mostUsedMode: string | null
  checkpointMissRates: { checkpoint: string; missRate: number }[]
  scoreDistribution: { dimension: string; avg: number; min: number; max: number }[]
  podcastEngagement: {
    totalListens: number
    avgCompletionPct: number
    mostReplayedEpisode: { id: string; title: string; listenCount: number } | null
  }
}

export async function getAudioAnalytics(courseId: string): Promise<AudioAnalytics> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const [thisWeek, lastWeek] = await Promise.all([
    prisma.voiceSession.count({ where: { courseId, createdAt: { gte: weekAgo } } }),
    prisma.voiceSession.count({ where: { courseId, createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
  ])
  const sessionsTrend = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0

  const sessions = await prisma.voiceSession.findMany({
    where: { courseId, status: 'completed', durationSecs: { not: null } },
    select: { durationSecs: true, type: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  const avgSessionLength = sessions.length
    ? sessions.reduce((sum, s) => sum + (s.durationSecs ?? 0), 0) / sessions.length
    : 0

  const modeCount: Record<string, number> = {}
  for (const s of sessions) {
    modeCount[s.type] = (modeCount[s.type] ?? 0) + 1
  }
  const mostUsedMode = Object.entries(modeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const scores = await prisma.voiceSessionScore.findMany({
    where: { session: { courseId, createdAt: { gte: twoWeeksAgo } } },
    select: { dimension: true, score: true },
    take: 500,
  })
  const dimScores: Record<string, number[]> = {}
  for (const s of scores) {
    if (!dimScores[s.dimension]) dimScores[s.dimension] = []
    dimScores[s.dimension].push(s.score)
  }
  const scoreDistribution = Object.entries(dimScores).map(([dimension, vals]) => ({
    dimension,
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    min: Math.min(...vals),
    max: Math.max(...vals),
  }))

  const episodes = await prisma.audioEpisode.findMany({
    where: { courseId, status: 'published' },
    select: { id: true, sourceName: true, listenCount: true },
    orderBy: { listenCount: 'desc' },
  })
  const totalListens = episodes.reduce((sum, ep) => sum + ep.listenCount, 0)
  const histories = await prisma.studentAudioHistory.findMany({
    where: { episode: { courseId } },
    select: { completedPct: true },
    take: 500,
  })
  const avgCompletionPct = histories.length
    ? histories.reduce((sum, h) => sum + h.completedPct, 0) / histories.length
    : 0
  const mostReplayedEpisode = episodes[0]
    ? { id: episodes[0].id, title: episodes[0].sourceName, listenCount: episodes[0].listenCount }
    : null

  return {
    sessionsThisWeek: thisWeek,
    sessionsTrend,
    avgSessionLength,
    mostUsedMode,
    checkpointMissRates: [],
    scoreDistribution,
    podcastEngagement: { totalListens, avgCompletionPct, mostReplayedEpisode },
  }
}
