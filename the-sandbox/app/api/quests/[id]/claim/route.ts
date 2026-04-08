import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { claimPlatformQuestReward } from '../../../../lib/platform-quests'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const email = req.headers.get('x-demo-user-email')
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const reward = await claimPlatformQuestReward(user.id, id)
    return NextResponse.json({ ok: true, ...reward })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to claim quest reward'
    const status = /not found/i.test(message) ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
