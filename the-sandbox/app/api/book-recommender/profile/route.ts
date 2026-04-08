import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

// GET /api/book-recommender/profile — fetch profile + books + recommendations + digest sub
export async function GET(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const profile = await prisma.bookProfile.findUnique({
    where: { userId: user.id },
    include: {
      books: { orderBy: { createdAt: 'asc' } },
      recommendations: { orderBy: { createdAt: 'desc' } },
      digestSub: true,
    },
  })

  return NextResponse.json({ profile })
}

// POST /api/book-recommender/profile — add a book to profile (creates profile if needed)
export async function POST(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { title, author, likedReason, disliked = false } = await req.json()
  if (!title?.trim() || !author?.trim()) {
    return NextResponse.json({ error: 'title and author required' }, { status: 400 })
  }

  // Upsert profile
  const profile = await prisma.bookProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  })

  const book = await prisma.bookEntry.create({
    data: { profileId: profile.id, title: title.trim(), author: author.trim(), likedReason, disliked },
  })

  return NextResponse.json({ book }, { status: 201 })
}

// DELETE /api/book-recommender/profile?bookId=xxx — remove a book
export async function DELETE(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const bookId = new URL(req.url).searchParams.get('bookId')
  if (!bookId) return NextResponse.json({ error: 'bookId required' }, { status: 400 })

  const profile = await prisma.bookProfile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })

  await prisma.bookEntry.deleteMany({ where: { id: bookId, profileId: profile.id } })
  return NextResponse.json({ deleted: true })
}

// PATCH /api/book-recommender/profile — update recommendation status or digest sub
export async function PATCH(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json()

  // Update recommendation status
  if (body.recommendationId && body.status) {
    const profile = await prisma.bookProfile.findUnique({ where: { userId: user.id } })
    if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })
    await prisma.bookRecommendation.updateMany({
      where: { id: body.recommendationId, profileId: profile.id },
      data: { status: body.status },
    })
    return NextResponse.json({ updated: true })
  }

  // Update digest subscription
  if (body.digestEmail !== undefined || body.digestActive !== undefined) {
    const profile = await prisma.bookProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    })

    if (body.digestEmail) {
      await prisma.bookDigestSub.upsert({
        where: { userId: user.id },
        create: { profileId: profile.id, userId: user.id, email: body.digestEmail, active: true },
        update: { email: body.digestEmail, active: true },
      })
    } else if (body.digestActive === false) {
      await prisma.bookDigestSub.updateMany({ where: { userId: user.id }, data: { active: false } })
    }
    return NextResponse.json({ updated: true })
  }

  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
}
