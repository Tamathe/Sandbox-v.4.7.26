import { prisma } from './prisma'
import { contentHash, scriptHash } from './audio-content-hash'
import { claimNextPendingJob } from './audio-generation-queue'
import { generatePodcastScript, type PodcastScript, type ScriptTurn } from './audio-script-service'
import { synthesizeMultiVoiceAudio } from './azure-speech-service'
import { getScript, uploadScript, uploadAudio } from './azure-blob-storage'
import type { AudioEpisode, AudioRender } from '../generated/prisma'

/** Flatten podcast script turns into a readable plain-text transcript. */
function turnsToTranscript(turns: ScriptTurn[], hostAName = 'Alex', hostBName = 'Sam'): string {
  return turns
    .map((t) => `${t.speaker === 'A' ? hostAName : hostBName}: ${t.text}`)
    .join('\n\n')
}

/** Maps the job duration value to the Azure Blob script variant path segment. */
function durationToVariant(duration: string): 'base' | '5min' | '15min' | '30min' {
  if (duration === '5min') return '5min'
  if (duration === '15min') return '15min'
  if (duration === '30min') return '30min'
  return 'base' // "full" maps to the base (longest) script
}

/** Returns the AudioEpisode update payload for the given script variant. */
function scriptPathUpdate(
  variant: 'base' | '5min' | '15min' | '30min',
  path: string,
  now: Date,
) {
  if (variant === '5min') return { script5minPath: path, script5minAt: now }
  if (variant === '15min') return { script15minPath: path, script15minAt: now }
  if (variant === '30min') return { script30minPath: path, script30minAt: now }
  return { baseScriptPath: path, baseScriptAt: now }
}

async function updateJobProgress(jobId: string, stage: string, progressPct: number) {
  await prisma.audioGenerationJob.update({
    where: { id: jobId },
    data: { stage, progressPct },
  })
}

async function failJob(jobId: string, error: string) {
  await prisma.audioGenerationJob.update({
    where: { id: jobId },
    data: { status: 'FAILED', error, completedAt: new Date() },
  }).catch((e) => console.error('[audio-processor] Could not mark job FAILED:', e))
}

/**
 * Claims and processes the next PENDING AudioGenerationJob.
 *
 * Pipeline:
 *   1. Claim job (PENDING → PROCESSING, atomic)
 *   2. Find/create AudioEpisode (Tier 1 cache key = contentHash)
 *   3. Generate podcast script via Claude (or fetch from blob cache)
 *   4. Synthesize audio via Azure TTS
 *   5. Upload mp3 to Azure Blob Storage
 *   6. Create AudioRender (Tier 3 cache key = scriptHash + voices)
 *   7. Complete job
 *
 * Returns true if a job was processed, false if the queue was empty.
 */
export async function processNextAudioJob(): Promise<boolean> {
  const job = await claimNextPendingJob()
  if (!job) return false

  const jobId = job.id

  try {
    // ── Stage 1: Find or create AudioEpisode ──────────────────────────────────
    await updateJobProgress(jobId, 'script_generation', 10)

    const hash = contentHash(job.sourceText)

    let episode: AudioEpisode | null = await prisma.audioEpisode.findFirst({
      where: { contentHash: hash, isStale: false },
    })

    if (!episode) {
      episode = await prisma.audioEpisode.create({
        data: {
          contentHash: hash,
          sourceType: job.sourceType,
          sourceName: job.sourceName,
          courseId: job.courseId ?? null,
          toolId: job.toolId ?? null,
        },
      })
    }

    // Link job to episode early so status queries can return episodeId
    await prisma.audioGenerationJob.update({
      where: { id: jobId },
      data: { episodeId: episode.id },
    })

    // ── Stage 2: Resolve script ───────────────────────────────────────────────
    const variant = durationToVariant(job.duration)

    // Try blob cache first (avoids re-generating script for same content + duration)
    let script = (await getScript(hash, variant)) as PodcastScript | null

    if (!script) {
      await updateJobProgress(jobId, 'script_generation', 20)

      script = await generatePodcastScript(
        job.sourceText,
        job.sourceName,
        job.duration,
      )

      await uploadScript(hash, variant, script)

      const scriptBlobPath = `scripts/${hash}/${variant}.json`
      await prisma.audioEpisode.update({
        where: { id: episode.id },
        data: scriptPathUpdate(variant, scriptBlobPath, new Date()),
      })
    }

    // ── Persist transcript for ADA compliance (only if not already set) ──────
    if (!episode.transcript && script.turns.length > 0) {
      await prisma.audioEpisode.update({
        where: { id: episode.id },
        data: {
          transcript: turnsToTranscript(script.turns),
          transcriptFormat: 'plain',
        },
      })
    }

    // ── Stage 3: Synthesize audio ─────────────────────────────────────────────
    await updateJobProgress(jobId, 'synthesis', 50)

    const sHash = scriptHash(script)

    // Check if a render already exists for this script + voice pair
    let render: AudioRender | null = await prisma.audioRender.findFirst({
      where: { scriptHash: sHash, voiceAId: job.voiceAId, voiceBId: job.voiceBId, isStale: false },
    })

    if (!render) {
      await updateJobProgress(jobId, 'synthesis', 60)

      const ssmlTurns = script.turns.map((turn) => ({
        voiceName: turn.speaker === 'A' ? job.voiceAId : job.voiceBId,
        text: turn.text,
      }))

      const audioBuffer = await synthesizeMultiVoiceAudio(ssmlTurns)

      await updateJobProgress(jobId, 'finalizing', 80)

      const cdnUrl = await uploadAudio(sHash, job.voiceAId, job.voiceBId, audioBuffer)
      const blobPath = `audio/${sHash}/${job.voiceAId}-${job.voiceBId}.mp3`

      // Estimate duration from word count: ~150 words per minute of natural speech
      const durationSecs = Math.max(1, Math.round((script.totalWords / 150) * 60))

      render = await prisma.audioRender.create({
        data: {
          episodeId: episode.id,
          scriptHash: sHash,
          duration: job.duration,
          voiceAId: job.voiceAId,
          voiceBId: job.voiceBId,
          blobPath,
          cdnUrl,
          fileSizeBytes: audioBuffer.length,
          durationSecs,
        },
      })
    }

    // ── Stage 4: Complete job ─────────────────────────────────────────────────
    await updateJobProgress(jobId, 'finalizing', 90)

    await prisma.audioGenerationJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        episodeId: episode.id,
        stage: 'complete',
        progressPct: 100,
        completedAt: new Date(),
      },
    })

    console.info(`[audio-processor] Job ${jobId} completed — episode ${episode.id}, render ${render.id}`)
    return true
  } catch (err) {
    console.error(`[audio-processor] Job ${jobId} failed:`, err)
    await failJob(jobId, err instanceof Error ? err.message : String(err))
    return true // Job was claimed and processed (albeit with failure) — return true
  }
}
