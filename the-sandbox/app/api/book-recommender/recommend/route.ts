import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// POST /api/book-recommender/recommend — generate recommendations via Claude
export async function POST(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const profile = await prisma.bookProfile.findUnique({
    where: { userId: user.id },
    include: { books: true },
  })

  if (!profile || profile.books.length === 0) {
    return NextResponse.json({ error: 'Add some books to your profile first.' }, { status: 400 })
  }

  const liked = profile.books.filter(b => !b.disliked)
  const disliked = profile.books.filter(b => b.disliked)

  const likedList = liked
    .map(b => `- "${b.title}" by ${b.author}${b.likedReason ? ` (liked because: ${b.likedReason})` : ''}`)
    .join('\n')
  const dislikedList = disliked.length
    ? disliked.map(b => `- "${b.title}" by ${b.author}${b.likedReason ? ` (disliked because: ${b.likedReason})` : ''}`).join('\n')
    : 'None specified'

  const prompt = `You are a book recommendation expert. Based on this reader's taste profile, generate exactly 8 book recommendations they have NOT already read.

BOOKS THEY LOVE:
${likedList}

BOOKS THEY DISLIKED:
${dislikedList}

For each recommendation, respond with a JSON array of exactly 8 objects with these fields:
- title: book title (string)
- author: author name (string)
- year: publication year (string, e.g. "2021")
- reason: exactly 2 sentences explaining why this fits their specific taste — reference the specific books they mentioned

Return ONLY the JSON array, no other text.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

  let recs: { title: string; author: string; year?: string; reason: string }[]
  try {
    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    recs = jsonMatch ? JSON.parse(jsonMatch[0]) : []
  } catch {
    return NextResponse.json({ error: 'Failed to parse recommendations' }, { status: 500 })
  }

  // Clear old WANT recommendations, keep READ/SKIP
  await prisma.bookRecommendation.deleteMany({
    where: { profileId: profile.id, status: 'WANT' },
  })

  const saved = await prisma.$transaction(
    recs.map(r =>
      prisma.bookRecommendation.create({
        data: {
          profileId: profile.id,
          title: r.title,
          author: r.author,
          year: r.year ?? null,
          reason: r.reason,
          status: 'WANT',
        },
      })
    )
  )

  return NextResponse.json({ recommendations: saved })
}
