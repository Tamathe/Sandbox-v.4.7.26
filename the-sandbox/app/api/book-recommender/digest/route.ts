import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { sendEmail, bookDigestHtml } from '../../../lib/email'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// POST /api/book-recommender/digest — weekly cron (Vercel Cron)
// Fetches new releases via Google Books API and emails matched subs
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const subs = await prisma.bookDigestSub.findMany({
    where: { active: true },
    include: {
      profile: {
        include: { books: true },
      },
      user: { select: { name: true } },
    },
  })

  if (subs.length === 0) return NextResponse.json({ sent: 0 })

  // Fetch recent releases via Google Books (past 7 days, limited to 20)
  const since = new Date()
  since.setDate(since.getDate() - 7)
  const dateStr = since.toISOString().split('T')[0]

  let newReleases: { title: string; author: string; description: string }[] = []
  try {
    const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=subject:fiction+orderBy=newest&maxResults=20&printType=books`
    const gbRes = await fetch(gbUrl)
    const gbData = await gbRes.json()
    newReleases = (gbData.items ?? []).map((item: { volumeInfo: { title?: string; authors?: string[]; description?: string } }) => ({
      title: item.volumeInfo.title ?? 'Unknown',
      author: (item.volumeInfo.authors ?? ['Unknown']).join(', '),
      description: item.volumeInfo.description?.slice(0, 300) ?? '',
    }))
  } catch {
    console.error('[book-digest] Failed to fetch Google Books')
  }

  if (newReleases.length === 0) return NextResponse.json({ sent: 0, reason: 'no new releases found' })

  let sent = 0

  for (const sub of subs) {
    const { profile, email, user } = sub
    if (profile.books.length === 0) continue

    const liked = profile.books.filter(b => !b.disliked)
    const tasteProfile = liked.map(b => `"${b.title}" by ${b.author}${b.likedReason ? ` (${b.likedReason})` : ''}`).join(', ')

    const releaseList = newReleases.map((r, i) => `${i + 1}. "${r.title}" by ${r.author}: ${r.description}`).join('\n')

    const prompt = `A reader loves these books: ${tasteProfile}

Here are this week's new releases:
${releaseList}

For each release, give a relevance score 1-10 based on how well it matches this reader's taste. Return ONLY a JSON array of objects with fields: title, author, score (number), why (one sentence). Only include releases with score >= 7.

Return ONLY the JSON array, no other text.`

    let matches: { title: string; author: string; score: number; why: string }[] = []
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })
      const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      matches = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch {
      continue
    }

    if (matches.length === 0) continue

    const emailMatches = matches.map(m => ({
      title: m.title,
      author: m.author,
      why: m.why,
      link: `https://www.google.com/search?q=${encodeURIComponent(m.title + ' ' + m.author + ' book')}`,
    }))

    const html = bookDigestHtml({ matches: emailMatches })
    if (!html) continue

    await sendEmail({
      to: email,
      subject: `📚 New Books For You This Week — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
      html,
    })
    sent++
  }

  return NextResponse.json({ sent })
}
