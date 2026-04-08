import { type NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import {
  generateArticleSummary,
  extractArticleEntities,
  matchAlertsForArticle,
} from '../../../lib/uknow-service'
import { prisma } from '../../../lib/prisma'
import { Prisma } from '../../../generated/prisma'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const BATCH_SIZE = 50

  // Find articles missing summary or entities
  const articles = await prisma.uKNowArticle.findMany({
    where: {
      OR: [{ summary: null }, { entities: { equals: Prisma.DbNull } }],
    },
    select: { id: true },
    take: BATCH_SIZE,
  })

  // Count total remaining (including this batch)
  const totalRemaining = await prisma.uKNowArticle.count({
    where: {
      OR: [{ summary: null }, { entities: { equals: Prisma.DbNull } }],
    },
  })

  let processed = 0

  for (const article of articles) {
    try {
      await generateArticleSummary(article.id)
    } catch (err) {
      console.error(`[uknow-backfill] summary failed for ${article.id}:`, err)
    }

    try {
      await extractArticleEntities(article.id)
    } catch (err) {
      console.error(`[uknow-backfill] entities failed for ${article.id}:`, err)
    }

    processed++
  }

  // After summaries/entities, run alert matching for each
  for (const article of articles) {
    try {
      await matchAlertsForArticle(article.id)
    } catch (err) {
      console.error(`[uknow-backfill] alert matching failed for ${article.id}:`, err)
    }
  }

  return NextResponse.json({
    processed,
    remaining: Math.max(0, totalRemaining - processed),
  })

})
