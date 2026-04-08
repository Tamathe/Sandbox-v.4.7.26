import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import type { DebateRoom, DebateArgument, DebateVote, DebateSide } from '../../generated/prisma'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArgumentWithMeta extends DebateArgument {
  author: { id: string; name: string }
  voteCount: number
  iMineVoted: boolean
}

export interface RoomWithArguments {
  room: DebateRoom & { host: { id: string; name: string } }
  proArguments: ArgumentWithMeta[]
  conArguments: ArgumentWithMeta[]
  isHost: boolean
}

// ─── Access code ──────────────────────────────────────────────────────────────

const LOGIC_WORDS = [
  'LOGIC', 'CLAIM', 'PROOF', 'AXIOM', 'TRUTH', 'CRUX', 'NEXUS', 'THESIS',
  'PRIMA', 'RATIO', 'MERIT', 'FORCE', 'LUCID', 'VIGOR', 'SHARP', 'COGENT',
]

export function generateAccessCode(): string {
  const word = LOGIC_WORDS[Math.floor(Math.random() * LOGIC_WORDS.length)]
  const num = String(Math.floor(Math.random() * 900) + 100)
  return `${word}-${num}`
}

async function uniqueAccessCode(): Promise<string> {
  let code = generateAccessCode()
  let exists = await prisma.debateRoom.findUnique({ where: { accessCode: code } })
  while (exists) {
    code = generateAccessCode()
    exists = await prisma.debateRoom.findUnique({ where: { accessCode: code } })
  }
  return code
}

// ─── Room CRUD ────────────────────────────────────────────────────────────────

export async function createRoom(
  hostId: string,
  title: string,
  proposition: string
): Promise<DebateRoom> {
  const accessCode = await uniqueAccessCode()
  return prisma.debateRoom.create({
    data: { title, proposition, accessCode, hostId },
  })
}

export async function getRoom(
  roomId: string,
  viewerId: string
): Promise<RoomWithArguments | null> {
  const room = await prisma.debateRoom.findUnique({
    where: { id: roomId },
    include: {
      host: { select: { id: true, name: true } },
      arguments: {
        include: {
          author: { select: { id: true, name: true } },
          votes: { select: { voterId: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!room) return null

  type RoomArgument = NonNullable<typeof room>['arguments'][number]

  function mapArg(arg: RoomArgument): ArgumentWithMeta {
    return {
      ...arg,
      voteCount: arg.votes.length,
      iMineVoted: arg.votes.some((v) => v.voterId === viewerId),
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { arguments: _args, ...roomWithoutArgs } = room

  return {
    room: roomWithoutArgs,
    proArguments: room.arguments.filter((a) => a.side === 'PRO').map(mapArg),
    conArguments: room.arguments.filter((a) => a.side === 'CON').map(mapArg),
    isHost: room.hostId === viewerId,
  }
}

export async function listRoomsForUser(userId: string): Promise<DebateRoom[]> {
  const [hosted, participated] = await Promise.all([
    prisma.debateRoom.findMany({
      where: { hostId: userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.debateRoom.findMany({
      where: { arguments: { some: { authorId: userId } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // Merge and deduplicate
  const seen = new Set<string>()
  const merged: DebateRoom[] = []
  for (const r of [...hosted, ...participated]) {
    if (!seen.has(r.id)) {
      seen.add(r.id)
      merged.push(r)
    }
  }
  return merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getRoomByAccessCode(accessCode: string): Promise<DebateRoom | null> {
  return prisma.debateRoom.findUnique({ where: { accessCode } })
}

// ─── Arguments ────────────────────────────────────────────────────────────────

export async function submitArgument(
  roomId: string,
  authorId: string,
  side: DebateSide,
  claim: string,
  evidence: string,
  reasoning: string
): Promise<DebateArgument> {
  const room = await prisma.debateRoom.findUnique({ where: { id: roomId } })
  if (!room) throw new Error('Room not found')
  if (room.status !== 'OPEN') throw new Error('Room is not open for new arguments')

  // Check if user already has an argument on this side
  const existing = await prisma.debateArgument.findFirst({
    where: { roomId, authorId, side },
  })
  if (existing) throw new Error(`You already have a ${side} argument in this debate`)

  return prisma.debateArgument.create({
    data: { roomId, authorId, side, claim, evidence, reasoning },
  })
}

// ─── Votes ────────────────────────────────────────────────────────────────────

export async function voteArgument(
  argumentId: string,
  voterId: string
): Promise<{ voted: boolean }> {
  const arg = await prisma.debateArgument.findUnique({ where: { id: argumentId } })
  if (!arg) throw new Error('Argument not found')
  if (arg.authorId === voterId) throw new Error('You cannot vote on your own argument')

  const existing = await prisma.debateVote.findUnique({
    where: { argumentId_voterId: { argumentId, voterId } },
  })

  if (existing) {
    await prisma.debateVote.delete({ where: { id: existing.id } })
    return { voted: false }
  } else {
    await prisma.debateVote.create({ data: { argumentId, voterId } })
    return { voted: true }
  }
}

// ─── Verdict ──────────────────────────────────────────────────────────────────

export async function requestVerdict(
  roomId: string,
  requesterId: string
): Promise<void> {
  const room = await prisma.debateRoom.findUnique({
    where: { id: roomId },
    include: { arguments: true },
  })
  if (!room) throw new Error('Room not found')
  if (room.hostId !== requesterId) throw new Error('Only the host can request a verdict')
  if (room.arguments.length < 2) throw new Error('Need at least 2 arguments before requesting a verdict')

  await prisma.debateRoom.update({
    where: { id: roomId },
    data: { status: 'JUDGING' },
  })

  // Fire-and-forget
  generateVerdict(roomId).catch((err) =>
    console.error('[debate] generateVerdict error', err)
  )
}

export async function generateVerdict(roomId: string): Promise<void> {
  const room = await prisma.debateRoom.findUnique({
    where: { id: roomId },
    include: {
      arguments: {
        include: {
          author: { select: { name: true } },
          votes: true,
        },
      },
    },
  })
  if (!room) return

  const proArgs = room.arguments.filter((a) => a.side === 'PRO')
  const conArgs = room.arguments.filter((a) => a.side === 'CON')

  function formatArgs(args: typeof proArgs): string {
    return args
      .map(
        (a, i) =>
          `Argument ${i + 1} by ${a.author.name} (${a.votes.length} votes):\n  Claim: ${a.claim}\n  Evidence: ${a.evidence}\n  Reasoning: ${a.reasoning}`
      )
      .join('\n\n')
  }

  const prompt = `You are an impartial AI debate judge. Evaluate the following debate and render a verdict.

PROPOSITION: "${room.proposition}"

PRO SIDE:
${proArgs.length > 0 ? formatArgs(proArgs) : '(No arguments submitted)'}

CON SIDE:
${conArgs.length > 0 ? formatArgs(conArgs) : '(No arguments submitted)'}

Provide a structured verdict in 200-300 words. Include:
1. Which side made stronger arguments and why
2. The strongest single argument in the debate
3. What the losing side could have argued better
4. Your final ruling on the proposition (Affirmed / Negated / Too Close to Call)

Be specific, reference the actual arguments by claim. Be fair but decisive.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const verdict = message.content[0].type === 'text' ? message.content[0].text.trim() : 'Unable to generate verdict.'

  await prisma.debateRoom.update({
    where: { id: roomId },
    data: { status: 'COMPLETE', verdict, verdictAt: new Date() },
  })
}
