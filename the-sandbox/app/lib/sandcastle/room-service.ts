/**
 * Room Service — all DB operations for Sandcastle rooms.
 * No WebSocket or SSE logic here. Thin service layer (like builder-service.ts).
 */

import { prisma } from '../prisma'
import { generateJoinCode } from '../join-code'
import { publishToRoom } from './room-bus'
import { signWsToken } from './ws-auth'
import type { Room, Participant, RoomFeatureFlag } from '../../generated/prisma'

export const ROOM_ONLY_TYPES = [
  'GAME_SHOW',
  'LIVE_POLL',
  'COLLABORATIVE_CANVAS',
  'SEMINAR',
] as const
export type RoomOnlyType = (typeof ROOM_ONLY_TYPES)[number]

export type RoomPhase = 'LOBBY' | 'ACTIVE' | 'ENDED'

export interface RoomFeatureFlagSnapshot {
  pollInsights: boolean
  canvasCritique: boolean
  buzzerAi: boolean
  seminarTranscript: boolean
}

export interface RoomSummary {
  roomId: string
  toolId: string
  experienceType: string
  title: string
  phase: RoomPhase
  hostId: string
  joinCode: string
  maxParticipants: number
  participantCount: number
  createdAt: string
  startedAt?: string
  endedAt?: string
  featureFlags: RoomFeatureFlagSnapshot
}

export interface ParticipantSummary {
  participantId: string
  displayName: string
  role: 'HOST' | 'PARTICIPANT'
  avatarSeed?: string
  joinedAt: string
  score: number
}

function parseFeatureFlags(json: string): RoomFeatureFlagSnapshot {
  try {
    return JSON.parse(json) as RoomFeatureFlagSnapshot
  } catch {
    return { pollInsights: false, canvasCritique: false, buzzerAi: false, seminarTranscript: false }
  }
}

function toRoomSummary(
  room: Room & { participants?: Participant[]; tool?: { toolType: string } | null },
): RoomSummary {
  return {
    roomId: room.id,
    toolId: room.toolId,
    experienceType: room.tool?.toolType ?? 'LIVE_POLL',
    title: room.title,
    phase: room.phase as RoomPhase,
    hostId: room.hostId,
    joinCode: room.joinCode,
    maxParticipants: room.maxParticipants,
    participantCount: room.participants?.filter((p) => !p.leftAt).length ?? 0,
    createdAt: room.createdAt.toISOString(),
    startedAt: room.startedAt?.toISOString(),
    endedAt: room.endedAt?.toISOString(),
    featureFlags: parseFeatureFlags(room.featureFlagsJson),
  }
}

/** Seed the 4 default feature flag rows on first access (skipDuplicates = no-op after first call). */
async function seedFeatureFlags(): Promise<void> {
  await prisma.roomFeatureFlag.createMany({
    data: [
      { feature: 'pollInsights', enabled: true, rolloutPercent: 100 },
      { feature: 'canvasCritique', enabled: false, rolloutPercent: 0 },
      { feature: 'buzzerAi', enabled: false, rolloutPercent: 0 },
      { feature: 'seminarTranscript', enabled: false, rolloutPercent: 0 },
    ],
    skipDuplicates: true,
  })
}

/** Fetch the current global feature flag snapshot for new rooms. */
async function getFeatureFlagSnapshot(): Promise<RoomFeatureFlagSnapshot> {
  await seedFeatureFlags()
  const flags = await prisma.roomFeatureFlag.findMany()
  const map = Object.fromEntries(flags.map((f: RoomFeatureFlag) => [f.feature, f.enabled]))
  return {
    pollInsights: map['pollInsights'] ?? true,
    canvasCritique: map['canvasCritique'] ?? false,
    buzzerAi: map['buzzerAi'] ?? false,
    seminarTranscript: map['seminarTranscript'] ?? false,
  }
}

/** Generate a unique 6-char join code (retries up to 5 times on collision). */
async function generateUniqueJoinCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateJoinCode(6)
    const existing = await prisma.room.findUnique({ where: { joinCode: code } })
    if (!existing) return code
  }
  throw new Error('Failed to generate unique join code after 5 attempts')
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function createRoom(
  hostId: string,
  toolId: string,
  title: string,
  maxParticipants = 50,
): Promise<{ room: RoomSummary; wsToken: string }> {
  const joinCode = await generateUniqueJoinCode()
  const featureFlags = await getFeatureFlagSnapshot()

  const room = await prisma.room.create({
    data: {
      toolId,
      title,
      hostId,
      joinCode,
      maxParticipants,
      phase: 'LOBBY',
      featureFlagsJson: JSON.stringify(featureFlags),
    },
    include: { participants: true, tool: { select: { toolType: true } } },
  })

  const wsToken = signWsToken(hostId, room.id, 'HOST')
  return { room: toRoomSummary(room), wsToken }
}

export async function getRoom(roomId: string): Promise<(RoomSummary & { participants: ParticipantSummary[] }) | null> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { participants: { where: { leftAt: null } }, tool: { select: { toolType: true } } },
  })
  if (!room) return null

  const participants = room.participants.map((p: Participant) => ({
    participantId: p.id,
    displayName: p.displayName,
    role: p.role as 'HOST' | 'PARTICIPANT',
    avatarSeed: p.avatarSeed ?? undefined,
    joinedAt: p.joinedAt.toISOString(),
    score: p.score,
  }))

  return { ...toRoomSummary(room), participants }
}

export async function getRoomByJoinCode(
  joinCode: string,
): Promise<{ room: RoomSummary; wsToken: string; participantId: string } | null> {
  const room = await prisma.room.findUnique({
    where: { joinCode: joinCode.toUpperCase() },
    include: { participants: true },
  })
  if (!room) return null

  // wsToken will be overwritten with PARTICIPANT role when the user actually joins
  const wsToken = signWsToken('anonymous', room.id, 'PARTICIPANT')
  return { room: toRoomSummary(room), wsToken, participantId: '' }
}

export async function startRoom(roomId: string, hostId: string): Promise<{ phase: RoomPhase }> {
  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { code: 'ROOM_NOT_FOUND', status: 404 })
  if (room.hostId !== hostId) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN', status: 403 })
  if (room.phase !== 'LOBBY') throw Object.assign(new Error('Room already started'), { code: 'ALREADY_STARTED', status: 409 })

  await prisma.room.update({
    where: { id: roomId },
    data: { phase: 'ACTIVE', startedAt: new Date() },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'ACTIVE', changedAt: new Date().toISOString() } })
  return { phase: 'ACTIVE' }
}

export async function endRoom(
  roomId: string,
  hostId: string,
  opts: { generateReport?: boolean } = {},
): Promise<{ endedAt: string; reportId?: string; reportStatus: string }> {
  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { code: 'ROOM_NOT_FOUND', status: 404 })
  if (room.hostId !== hostId) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN', status: 403 })
  if (room.endedAt) throw Object.assign(new Error('Room already ended'), { code: 'ALREADY_ENDED', status: 409 })

  const endedAt = new Date()
  await prisma.room.update({
    where: { id: roomId },
    data: { phase: 'ENDED', endedAt },
  })

  const report = await prisma.postSessionReport.create({
    data: { roomId, status: 'PENDING' },
  })

  publishToRoom(roomId, {
    type: 'room_ended',
    data: { endedAt: endedAt.toISOString(), reportId: report.id, reportStatus: 'PENDING' },
  })

  // Fire-and-forget report generation if requested
  if (opts.generateReport) {
    generatePostSessionReport(report.id, roomId).catch(
      (err) => console.error('[RoomService] report generation failed:', err),
    )
  }

  return { endedAt: endedAt.toISOString(), reportId: report.id, reportStatus: 'PENDING' }
}

/** Stub post-session report generator (Phase 3 will use Sonnet). */
async function generatePostSessionReport(reportId: string, roomId: string): Promise<void> {
  await prisma.postSessionReport.update({
    where: { id: reportId },
    data: { status: 'GENERATING' },
  })

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      polls: { include: { votes: true, insight: true } },
      participants: true,
    },
  })

  const participantCount = room?.participants.length ?? 0
  const pollCount = room?.polls.length ?? 0
  const totalVotes = room?.polls.reduce((s, p) => s + p.votes.length, 0) ?? 0

  const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Session Report — ${room?.title ?? 'Room'}</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#111;}
h1{color:#0033A0;}table{width:100%;border-collapse:collapse;margin:16px 0;}
th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left;}th{background:#f9fafb;}</style>
</head>
<body>
<h1>Session Report</h1>
<h2>${room?.title ?? 'Room'}</h2>
<p><strong>Ended:</strong> ${new Date().toLocaleString()}</p>
<table>
  <tr><th>Metric</th><th>Value</th></tr>
  <tr><td>Participants</td><td>${participantCount}</td></tr>
  <tr><td>Polls Run</td><td>${pollCount}</td></tr>
  <tr><td>Total Votes Cast</td><td>${totalVotes}</td></tr>
</table>
${pollCount > 0 ? `<h3>Poll Summary</h3>
<table><tr><th>Question</th><th>Votes</th><th>AI Insight</th></tr>
${room?.polls.map((p) => `<tr><td>${p.question}</td><td>${p.votes.length}</td><td>${p.insight?.insightText ?? '—'}</td></tr>`).join('') ?? ''}
</table>` : ''}
<p style="color:#6b7280;font-size:0.875em;margin-top:32px;">Generated by University of Kentucky · Full AI analysis available in Phase 3.</p>
</body></html>`

  await prisma.postSessionReport.update({
    where: { id: reportId },
    data: { status: 'COMPLETE', reportHtml, generatedAt: new Date() },
  })
}

export async function addParticipant(
  roomId: string,
  userId: string | null,
  displayName: string,
  avatarSeed?: string,
): Promise<{ participantId: string; wsToken: string }> {
  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { code: 'ROOM_NOT_FOUND', status: 404 })
  if (room.endedAt) throw Object.assign(new Error('Room has ended'), { code: 'ROOM_ENDED', status: 410 })

  // If a participant record for this userId already exists (re-join after disconnect), reuse it
  if (userId) {
    const existing = await prisma.participant.findFirst({
      where: { roomId, userId, leftAt: null },
    })
    if (existing) {
      const wsToken = signWsToken(userId, roomId, 'PARTICIPANT')
      return { participantId: existing.id, wsToken }
    }
  }

  const participant = await prisma.participant.create({
    data: { roomId, userId, displayName, role: 'PARTICIPANT', avatarSeed },
  })

  const activeCount = await prisma.participant.count({ where: { roomId, leftAt: null } })

  publishToRoom(roomId, {
    type: 'participant_joined',
    data: {
      participantId: participant.id,
      displayName: participant.displayName,
      totalCount: activeCount,
    },
  })

  const wsToken = signWsToken(userId ?? participant.id, roomId, 'PARTICIPANT')
  return { participantId: participant.id, wsToken }
}

export async function removeParticipant(participantId: string): Promise<void> {
  const participant = await prisma.participant.findUnique({ where: { id: participantId } })
  if (!participant || participant.leftAt) return

  await prisma.participant.update({ where: { id: participantId }, data: { leftAt: new Date() } })
  const activeCount = await prisma.participant.count({ where: { roomId: participant.roomId, leftAt: null } })

  publishToRoom(participant.roomId, {
    type: 'participant_left',
    data: { participantId, totalCount: activeCount },
  })
}

export async function getParticipants(roomId: string): Promise<ParticipantSummary[]> {
  const participants = await prisma.participant.findMany({
    where: { roomId, leftAt: null },
    orderBy: { joinedAt: 'asc' },
  })
  return participants.map((p: Participant) => ({
    participantId: p.id,
    displayName: p.displayName,
    role: p.role as 'HOST' | 'PARTICIPANT',
    avatarSeed: p.avatarSeed ?? undefined,
    joinedAt: p.joinedAt.toISOString(),
    score: p.score,
  }))
}
