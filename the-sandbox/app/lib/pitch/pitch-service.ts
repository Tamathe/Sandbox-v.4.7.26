import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'

const anthropic = new Anthropic()

async function generateAccessCode(): Promise<string> {
  const max = 10
  for (let i = 0; i < max; i++) {
    const num = Math.floor(Math.random() * 900) + 100
    const code = `PITCH-${num}`
    const exists = await prisma.pitchRoom.findUnique({ where: { accessCode: code } })
    if (!exists) return code
  }
  throw new Error('Could not generate unique access code')
}

export async function createRoom(hostId: string, title: string, casePrompt: string) {
  const accessCode = await generateAccessCode()
  return prisma.pitchRoom.create({
    data: { hostId, title, casePrompt, accessCode },
  })
}

export async function getRoom(roomId: string, userId: string) {
  const room = await prisma.pitchRoom.findUnique({
    where: { id: roomId },
    include: {
      host: { select: { id: true, name: true } },
      pitches: {
        include: {
          author: { select: { id: true, name: true } },
          votes: { select: { voterId: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!room) return null
  const isHost = room.hostId === userId
  const myPitch = room.pitches.find((p) => p.authorId === userId) ?? null
  const pitches = room.pitches.map((p) => ({
    ...p,
    voteCount: p.votes.length,
    iVoted: p.votes.some((v) => v.voterId === userId),
  }))
  return { ...room, pitches, isHost, myPitch }
}

export async function listRoomsForUser(userId: string) {
  const [hosted, pitched] = await Promise.all([
    prisma.pitchRoom.findMany({
      where: { hostId: userId },
      include: { _count: { select: { pitches: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.pitchRoom.findMany({
      where: { pitches: { some: { authorId: userId } } },
      include: { _count: { select: { pitches: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  const seen = new Set<string>()
  const rooms = []
  for (const r of [...hosted, ...pitched]) {
    if (!seen.has(r.id)) {
      seen.add(r.id)
      rooms.push(r)
    }
  }
  return rooms
}

export async function submitPitch(
  roomId: string,
  authorId: string,
  teamName: string,
  summary: string,
  recommendation: string,
  rationale: string
) {
  const room = await prisma.pitchRoom.findUnique({ where: { id: roomId } })
  if (!room) throw new Error('Room not found')
  if (room.status !== 'OPEN') throw new Error('Submissions are closed')
  const existing = await prisma.pitchSubmission.findFirst({ where: { roomId, authorId } })
  if (existing) throw new Error('Already submitted a pitch for this room')
  const pitch = await prisma.pitchSubmission.create({
    data: { roomId, authorId, teamName, summary, recommendation, rationale },
  })
  // fire-and-forget AI feedback
  generateAiFeedback(pitch.id, room.casePrompt, teamName, summary, recommendation, rationale).catch(
    console.error
  )
  return pitch
}

async function generateAiFeedback(
  pitchId: string,
  casePrompt: string,
  teamName: string,
  summary: string,
  recommendation: string,
  rationale: string
) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `You are a seasoned executive judge at a case competition. Here is the case: ${casePrompt}. Here is the team's pitch — Team: ${teamName}, Summary: ${summary}, Recommendation: ${recommendation}, Rationale: ${rationale}. Provide concise executive feedback in exactly this format:\n**Strengths:** [2-3 bullets]\n**Weaknesses:** [1-2 bullets]\n**Verdict:** [1 sentence overall assessment]`,
      },
    ],
  })
  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  await prisma.pitchSubmission.update({
    where: { id: pitchId },
    data: { aiFeedback: text, aiFeedbackAt: new Date() },
  })
}

export async function votePitch(pitchId: string, voterId: string) {
  const pitch = await prisma.pitchSubmission.findUnique({ where: { id: pitchId } })
  if (!pitch) throw new Error('Pitch not found')
  if (pitch.authorId === voterId) throw new Error('Cannot vote for your own pitch')
  const existing = await prisma.pitchVote.findUnique({
    where: { pitchId_voterId: { pitchId, voterId } },
  })
  if (existing) {
    await prisma.pitchVote.delete({ where: { id: existing.id } })
    return { voted: false }
  }
  await prisma.pitchVote.create({ data: { pitchId, voterId } })
  return { voted: true }
}

export async function closeRoom(roomId: string, hostId: string) {
  const room = await prisma.pitchRoom.findUnique({ where: { id: roomId } })
  if (!room) throw new Error('Room not found')
  if (room.hostId !== hostId) throw new Error('Not the host')
  return prisma.pitchRoom.update({
    where: { id: roomId },
    data: { status: 'COMPLETE', closedAt: new Date() },
  })
}

export async function openVoting(roomId: string, hostId: string) {
  const room = await prisma.pitchRoom.findUnique({ where: { id: roomId } })
  if (!room) throw new Error('Room not found')
  if (room.hostId !== hostId) throw new Error('Not the host')
  return prisma.pitchRoom.update({
    where: { id: roomId },
    data: { status: 'VOTING' },
  })
}

export async function findRoomByCode(accessCode: string) {
  return prisma.pitchRoom.findUnique({ where: { accessCode } })
}
