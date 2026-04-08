import { type NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { extractSentimentOnly } from '../../../lib/uknow-service'
import { prisma } from '../../../lib/prisma'
import { Prisma } from '../../../generated/prisma'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const BATCH_SIZE = 100

  // Find articles that have entities but missing sentiment
  const articles = await prisma.uKNowArticle.findMany({
    where: {
      sentiment: null,
      entities: { not: Prisma.DbNull },
    },
    select: { id: true },
    take: BATCH_SIZE,
  })

  const totalRemaining = await prisma.uKNowArticle.count({
    where: {
      sentiment: null,
      entities: { not: Prisma.DbNull },
    },
  })

  let processed = 0

  for (const article of articles) {
    try {
      await extractSentimentOnly(article.id)
      processed++
    } catch (err) {
      console.error(`[uknow-sentiment-backfill] failed for ${article.id}:`, err)
    }
  }

  return NextResponse.json({
    processed,
    remaining: Math.max(0, totalRemaining - processed),
  })

})
