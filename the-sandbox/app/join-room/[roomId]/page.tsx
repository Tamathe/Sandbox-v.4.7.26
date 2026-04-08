import { Metadata } from 'next'
import { prisma } from '../../lib/prisma'
import JoinRoomClient from './JoinRoomClient'

interface Props {
  params: Promise<{ roomId: string }>
}

const TYPE_EMOJI: Record<string, string> = {
  CHALLENGE: '🎯',
  STUDY: '📚',
  WATCH: '📺',
  TEACHBACK: '🎓',
}

const TYPE_LABEL: Record<string, string> = {
  CHALLENGE: 'Quiz Battle',
  STUDY: 'Study Session',
  WATCH: 'Watch Party',
  TEACHBACK: 'Teach-Back',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roomId } = await params
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: { participants: { select: { id: true } } },
  })

  if (!room) return { title: 'Room Not Found — University of Kentucky' }

  const emoji = TYPE_EMOJI[room.type] ?? ''
  const label = TYPE_LABEL[room.type] ?? 'Commons session'
  const count = room.participants.length

  return {
    title: `${emoji} ${room.title || label} — University of Kentucky`,
    description: `Join ${count} ${count === 1 ? 'person' : 'people'} in a live ${label.toLowerCase()}`,
    openGraph: {
      title: `${room.title || label} — University of Kentucky`,
      description: `${count} ${count === 1 ? 'person' : 'people'} in a live ${label.toLowerCase()} session`,
      type: 'website',
    },
  }
}

export default async function JoinRoomPage({ params }: Props) {
  const { roomId } = await params

  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { joinedAt: 'asc' },
        take: 10,
      },
      channel: { select: { id: true, group: { select: { id: true, name: true } } } },
    },
  })

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0033A0]/5 to-white px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gray-100">
            <span className="text-2xl">🔗</span>
          </div>
          <h1 className="mb-2 text-xl font-extrabold text-gray-900">Room Not Found</h1>
          <p className="mb-6 text-sm text-gray-500">This room doesn&apos;t exist or has ended.</p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-[#0033A0] px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Go to University of Kentucky
          </a>
        </div>
      </div>
    )
  }

  const serialized = {
    id: room.id,
    type: room.type as string,
    title: room.title,
    phase: room.phase as string,
    participantCount: room.participants.length,
    participants: room.participants.map((p) => ({
      userId: p.user.id,
      name: p.user.name,
    })),
    groupId: room.channel?.group?.id ?? null,
    groupName: room.channel?.group?.name ?? null,
  }

  return <JoinRoomClient room={serialized} />
}
