import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const email = req.headers.get('x-demo-user-email')
    if (!email) return NextResponse.json({ libraryIds: [] })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ libraryIds: [] })

    const entries = await prisma.libraryEntry.findMany({
      where: { userId: user.id },
      select: { toolId: true },
    })

    return NextResponse.json({ libraryIds: entries.map((entry) => entry.toolId) })
  } catch (error) {
    console.error('GET /api/library/ids error:', error)
    return NextResponse.json({ error: 'Failed to fetch library IDs' }, { status: 500 })
  }
}
