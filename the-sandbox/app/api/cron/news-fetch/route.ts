import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '../../../lib/prisma'
import { verifyCronSecret, requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import Anthropic from '@anthropic-ai/sdk'
import Parser from 'rss-parser'
import { withErrorHandling } from '../../../lib/api-utils'

const rssParser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: false }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
      ['enclosure', 'enclosure', { keepArray: false }],
    ],
  },
})

const anthropic = new Anthropic()

interface EnrichedFields {
  summaryAi: string
  tags: string[]
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
  sentimentScore: number
  category: string
}

async function enrichArticle(title: string, excerpt: string): Promise<EnrichedFields | null> {
  try {
    const prompt = `Given this news article title and excerpt, return JSON only (no markdown):
{"summary":"2-sentence plain-English summary","tags":["tag1","tag2","tag3"],"sentiment":"POSITIVE","sentimentScore":0.0,"category":"Research"}
Valid categories: Research, Athletics, HealthCare, Campus Life, Arts, Administration, General
Valid sentiments: POSITIVE, NEUTRAL, NEGATIVE
Title: ${title}
Excerpt: ${excerpt.slice(0, 600)}`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const parsed = JSON.parse(text) as {
      summary?: string
      tags?: string[]
      sentiment?: string
      sentimentScore?: number
      category?: string
    }

    const validSentiments = ['POSITIVE', 'NEUTRAL', 'NEGATIVE']
    const sentiment = validSentiments.includes(parsed.sentiment ?? '')
      ? (parsed.sentiment as 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE')
      : 'NEUTRAL'

    return {
      summaryAi: parsed.summary ?? '',
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
      sentiment,
      sentimentScore: typeof parsed.sentimentScore === 'number' ? parsed.sentimentScore : 0,
      category: parsed.category ?? 'General',
    }
  } catch (err) {
    console.error('Haiku enrichment error:', err)
    return null
  }
}

function extractThumbnail(item: Record<string, unknown>): string | null {
  // Try media:content
  const mc = item['mediaContent'] as { $?: { url?: string } } | undefined
  if (mc?.$?.url) return mc.$.url

  // Try media:thumbnail
  const mt = item['mediaThumbnail'] as { $?: { url?: string } } | undefined
  if (mt?.$?.url) return mt.$.url

  // Try enclosure with image type
  const enc = item['enclosure'] as { url?: string; type?: string } | undefined
  if (enc?.url && enc?.type?.startsWith('image/')) return enc.url

  return null
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  // Auth check — fail-closed: 403 if CRON_SECRET is absent or wrong
  const cronError = verifyCronSecret(request)
  if (cronError) return cronError

  const sourceId = request.nextUrl.searchParams.get('sourceId')
  const prisma = getPrismaClient()

  const sources = await prisma.newsSource.findMany({
    where: {
      active: true,
      ...(sourceId ? { id: sourceId } : {}),
    },
  })

  if (sources.length === 0) {
    return NextResponse.json({ message: 'No active sources found', fetched: 0 })
  }

  let totalNew = 0
  let totalErrors = 0

  for (const source of sources) {
    try {
      const feed = await rssParser.parseURL(source.rssUrl)
      const items = (feed.items ?? []).slice(0, 30)

      // Get existing URLs to deduplicate
      const urls = items.map((item) => item.link ?? item.guid ?? '').filter(Boolean)
      const existing = await prisma.newsArticle.findMany({
        where: { url: { in: urls } },
        select: { url: true },
      })
      const existingUrls = new Set(existing.map((a) => a.url))

      const newItems = items.filter((item) => {
        const url = item.link ?? item.guid ?? ''
        return url && !existingUrls.has(url)
      })

      // Enrich all new items concurrently, then batch-insert
      const enrichResults = await Promise.allSettled(
        newItems.map(async (item) => {
          const url = item.link ?? item.guid ?? ''
          const title = item.title ?? 'Untitled'
          const excerpt = item.contentSnippet ?? item.summary ?? item.content ?? ''
          const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date()
          const thumbnail = extractThumbnail(item as unknown as Record<string, unknown>)
          const enriched = await enrichArticle(title, excerpt)
          return { url, title, excerpt, publishedAt, thumbnail, enriched }
        })
      )

      const articlesToCreate = enrichResults
        .filter(
          (r): r is PromiseFulfilledResult<{
            url: string
            title: string
            excerpt: string
            publishedAt: Date
            thumbnail: string | null
            enriched: EnrichedFields | null
          }> => r.status === 'fulfilled'
        )
        .map(({ value: { url, title, excerpt, publishedAt, thumbnail, enriched } }) => ({
          sourceId: source.id,
          sourceType: source.sourceType,
          url,
          title,
          summaryAi: enriched?.summaryAi ?? null,
          fullText: excerpt || null,
          sentiment: enriched?.sentiment ?? null,
          sentimentScore: enriched?.sentimentScore ?? null,
          tags: enriched?.tags ?? [],
          category: enriched?.category ?? source.category ?? 'General',
          outletName: feed.title ?? source.name,
          thumbnailUrl: thumbnail,
          publishedAt,
        }))

      if (articlesToCreate.length > 0) {
        await prisma.newsArticle.createMany({ data: articlesToCreate, skipDuplicates: true })
        totalNew += articlesToCreate.length
      }

      // Update lastFetchedAt
      await prisma.newsSource.update({
        where: { id: source.id },
        data: { lastFetchedAt: new Date() },
      })
    } catch (err) {
      console.error(`Error fetching source ${source.name}:`, err)
      totalErrors++
    }
  }

  return NextResponse.json({
    message: 'News fetch complete',
    sourcesProcessed: sources.length,
    newArticles: totalNew,
    errors: totalErrors,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

// Also support POST for the admin "Fetch Now" button — requires admin user, not cron secret
export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response
  return GET(request)
})
