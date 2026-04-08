import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { id } = await params
  const memory = await prisma.userMemory.findUnique({ where: { id } })
  if (!memory || memory.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.userMemory.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
