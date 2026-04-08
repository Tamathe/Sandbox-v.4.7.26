import { prisma } from './prisma'

interface DigestOptions {
  limit: number
  since: Date
}

function sentimentToScore(sentiment: string | null): number | null {
  if (!sentiment) return null
  switch (sentiment) {
    case 'positive': return 1
    case 'neutral': return 0
    case 'negative': return -1
    default: return null
  }
}

export async function getCampusDigest({ limit, since }: DigestOptions) {
  const now = new Date()

  const articleSelect = {
    id: true,
    title: true,
    summary: true,
    section: true,
    sectionLabel: true,
    publishedAt: true,
    sentiment: true,
  } as const

  // Fetch recent articles within the time window
  let articles = await prisma.uKNowArticle.findMany({
    where: { publishedAt: { gte: since } },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: articleSelect,
  })

  // Fallback: if no articles in the time window, show the most recent ones regardless of date
  let usedFallback = false
  if (articles.length === 0) {
    articles = await prisma.uKNowArticle.findMany({
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: articleSelect,
    })
    usedFallback = true
  }

  // Count articles — in fallback mode, count all articles
  const totalArticles = usedFallback
    ? await prisma.uKNowArticle.count()
    : await prisma.uKNowArticle.count({ where: { publishedAt: { gte: since } } })

  // Build trending topics by section
  const sectionMap = new Map<string, { label: string; count: number; sentiments: number[]; sentimentCount: number }>()

  // Use ALL articles in the period (or all articles in fallback) for trending
  const allArticles = await prisma.uKNowArticle.findMany({
    where: usedFallback ? {} : { publishedAt: { gte: since } },
    select: { section: true, sectionLabel: true, sentiment: true },
  })

  for (const a of allArticles) {
    let entry = sectionMap.get(a.section)
    if (!entry) {
      entry = { label: a.sectionLabel, count: 0, sentiments: [], sentimentCount: 0 }
      sectionMap.set(a.section, entry)
    }
    entry.count++
    const score = sentimentToScore(a.sentiment)
    if (score !== null) {
      entry.sentiments.push(score)
      entry.sentimentCount++
    }
  }

  const trendingTopics = [...sectionMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([, { label, count, sentiments, sentimentCount }]) => ({
      topic: label,
      articleCount: count,
      avgSentiment: sentimentCount > 0
        ? Math.round((sentiments.reduce((s, v) => s + v, 0) / sentimentCount) * 100) / 100
        : null,
    }))

  // In fallback mode, derive the period from the oldest article returned
  const periodStart = usedFallback && articles.length > 0
    ? (articles[articles.length - 1].publishedAt?.toISOString() ?? since.toISOString())
    : since.toISOString()

  return {
    articles: articles.map(a => ({
      id: a.id,
      title: a.title,
      summary: a.summary ? a.summary.slice(0, 200) : '',
      category: a.sectionLabel,
      publishedAt: a.publishedAt?.toISOString() ?? '',
      sentimentScore: sentimentToScore(a.sentiment),
    })),
    trendingTopics,
    stats: {
      totalArticles,
      periodStart,
      periodEnd: now.toISOString(),
    },
  }
}
