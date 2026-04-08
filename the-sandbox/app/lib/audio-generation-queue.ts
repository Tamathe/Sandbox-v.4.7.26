import { prisma } from './prisma'
import { contentHash } from './audio-content-hash'
import type { AudioGenerationJob, AudioJobStatus } from '../generated/prisma'

export type { AudioGenerationJob }

interface EnqueueParams {
  requestedBy: string
  sourceText: string
  sourceType: string
  sourceName: string
  duration: string
  voiceAId: string
  voiceBId: string
  courseId?: string
  toolId?: string
}

// A synthetic "cache hit" result that mimics an AudioGenerationJob without a DB record.
interface CacheHitResult {
  id: string
  status: 'COMPLETED'
  episodeId: string
  cdnUrl: string
}

export async function enqueueJob(
  params: EnqueueParams,
): Promise<AudioGenerationJob | CacheHitResult> {
  const hash = contentHash(params.sourceText)

  // Tier 1 cache: check for an existing non-stale episode
  const episode = await prisma.audioEpisode.findFirst({
    where: { contentHash: hash, isStale: false },
  })

  if (episode) {
    // Tier 3 cache: check for an existing render for this duration + voice pair
    const render = await prisma.audioRender.findFirst({
      where: {
        episodeId: episode.id,
        duration: params.duration,
        voiceAId: params.voiceAId,
        voiceBId: params.voiceBId,
        isStale: false,
      },
    })

    if (render) {
      return {
        id: `cache-hit-${render.id}`,
        status: 'COMPLETED',
        episodeId: episode.id,
        cdnUrl: render.cdnUrl,
      }
    }
  }

  // No cache hit — create a new pending job
  const job = await prisma.audioGenerationJob.create({
    data: {
      requestedBy: params.requestedBy,
      sourceText: params.sourceText,
      sourceType: params.sourceType,
      sourceName: params.sourceName,
      duration: params.duration,
      voiceAId: params.voiceAId,
      voiceBId: params.voiceBId,
      courseId: params.courseId ?? null,
      toolId: params.toolId ?? null,
      episodeId: episode?.id ?? null,
    },
  })

  return job
}

export async function getJobStatus(jobId: string): Promise<{
  status: AudioJobStatus
  stage: string | null
  progressPct: number
  episodeId: string | null
  cdnUrl: string | null
} | null> {
  const job = await prisma.audioGenerationJob.findUnique({ where: { id: jobId } })
  if (!job) return null

  let cdnUrl: string | null = null

  if (job.status === 'COMPLETED' && job.episodeId) {
    const render = await prisma.audioRender.findFirst({
      where: {
        episodeId: job.episodeId,
        duration: job.duration,
        voiceAId: job.voiceAId,
        voiceBId: job.voiceBId,
      },
    })
    cdnUrl = render?.cdnUrl ?? null
  }

  return {
    status: job.status,
    stage: job.stage,
    progressPct: job.progressPct,
    episodeId: job.episodeId,
    cdnUrl,
  }
}

export async function claimNextPendingJob(): Promise<AudioGenerationJob | null> {
  return prisma.$transaction(async (tx) => {
    const job = await tx.audioGenerationJob.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    })

    if (!job) return null

    return tx.audioGenerationJob.update({
      where: { id: job.id },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    })
  })
}
