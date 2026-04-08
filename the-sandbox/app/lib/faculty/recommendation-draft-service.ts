import { prisma } from '../prisma'

export interface RecommendationDraftInfo {
  id: string
  recommendationId: string
  content: string
  version: number
  wordCount: number
  lastEditedAt: string
  sandySessionId: string | null
  oneDriveUrl: string | null
}

export async function getDraft(recommendationId: string): Promise<RecommendationDraftInfo | null> {
  const draft = await prisma.recommendationDraft.findUnique({
    where: { recommendationId },
  })
  if (!draft) return null
  return {
    id: draft.id,
    recommendationId: draft.recommendationId,
    content: draft.content,
    version: draft.version,
    wordCount: draft.wordCount,
    lastEditedAt: draft.lastEditedAt.toISOString(),
    sandySessionId: draft.sandySessionId,
    oneDriveUrl: draft.oneDriveUrl,
  }
}

export async function upsertDraft(
  recommendationId: string,
  content: string,
  sandySessionId?: string,
): Promise<RecommendationDraftInfo> {
  const wordCount = content.split(/\s+/).filter(Boolean).length

  const existing = await prisma.recommendationDraft.findUnique({
    where: { recommendationId },
  })

  const draft = existing
    ? await prisma.recommendationDraft.update({
        where: { recommendationId },
        data: {
          content,
          wordCount,
          version: { increment: 1 },
          sandySessionId: sandySessionId ?? existing.sandySessionId,
        },
      })
    : await prisma.recommendationDraft.create({
        data: {
          recommendationId,
          content,
          wordCount,
          sandySessionId: sandySessionId ?? null,
        },
      })

  return {
    id: draft.id,
    recommendationId: draft.recommendationId,
    content: draft.content,
    version: draft.version,
    wordCount: draft.wordCount,
    lastEditedAt: draft.lastEditedAt.toISOString(),
    sandySessionId: draft.sandySessionId,
    oneDriveUrl: draft.oneDriveUrl,
  }
}

export async function getDraftsForFaculty(
  facultyId: string,
): Promise<Map<string, RecommendationDraftInfo>> {
  const drafts = await prisma.recommendationDraft.findMany({
    where: {
      recommendation: { facultyId },
    },
  })

  const map = new Map<string, RecommendationDraftInfo>()
  for (const draft of drafts) {
    map.set(draft.recommendationId, {
      id: draft.id,
      recommendationId: draft.recommendationId,
      content: draft.content,
      version: draft.version,
      wordCount: draft.wordCount,
      lastEditedAt: draft.lastEditedAt.toISOString(),
      sandySessionId: draft.sandySessionId,
      oneDriveUrl: draft.oneDriveUrl,
    })
  }
  return map
}
