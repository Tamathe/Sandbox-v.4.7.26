/**
 * Seed script for The Commons demo data.
 *
 * Creates a mix of active and recently completed rooms across
 * multiple room types so every demo user sees a populated Commons page.
 *
 * Usage: npx tsx scripts/seed-commons.ts
 */

import 'dotenv/config'
import { prisma } from '../app/lib/prisma'

async function main() {
  console.log('🎯 Seeding The Commons demo data...')

  // Find demo users
  const tiana = await prisma.user.findUnique({ where: { email: 'tiana.the.student@uky.edu' } })
  const katie = await prisma.user.findUnique({ where: { email: 'katie.thompson@uky.edu' } })
  const heath = await prisma.user.findUnique({ where: { email: 'heath.price@uky.edu' } })
  const morgan = await prisma.user.findUnique({ where: { email: 'morgan.rivera@uky.edu' } })

  if (!tiana || !katie || !heath) {
    console.error('❌ Demo users not found. Run npm run db:seed first.')
    process.exit(1)
  }

  // Clean up existing Commons data
  await prisma.liveRoomResponse.deleteMany({})
  await prisma.liveRoomRound.deleteMany({})
  await prisma.liveRoomParticipant.deleteMany({})
  await prisma.channelMessage.deleteMany({ where: { messageType: { in: ['live_room', 'system'] } } })
  await prisma.liveRoom.deleteMany({})
  console.log('  Cleaned existing Commons data')

  // ─── Find or create groups ────────────────────────────────────────

  // 1. Katie's TEK-100 course group
  let tekGroup = await prisma.chatGroup.findFirst({
    where: {
      type: 'COURSE',
      memberships: { some: { userId: katie.id, role: 'OWNER' } },
    },
    include: { channels: { where: { type: 'GENERAL' }, take: 1 } },
  })

  if (!tekGroup || tekGroup.channels.length === 0) {
    console.log('  Creating TEK-100 course chat group...')
    tekGroup = await prisma.chatGroup.create({
      data: {
        name: 'TEK-100: Collaborative Intelligence',
        type: 'COURSE',
        createdById: katie.id,
        sandyEnabled: true,
        channels: {
          create: {
            name: 'general',
            type: 'GENERAL',
            isDefault: true,
            createdById: katie.id,
          },
        },
        memberships: {
          create: [
            { userId: katie.id, role: 'OWNER' },
            { userId: tiana.id, role: 'MEMBER' },
            { userId: heath.id, role: 'MEMBER' },
          ],
        },
      },
      include: { channels: { where: { type: 'GENERAL' }, take: 1 } },
    })
  }
  const tekChannelId = tekGroup.channels[0]!.id

  // 2. Study group
  let studyGroup = await prisma.chatGroup.findFirst({
    where: { type: 'STUDY', memberships: { some: { userId: tiana.id } } },
    include: { channels: { where: { type: 'GENERAL' }, take: 1 } },
  })

  if (!studyGroup || studyGroup.channels.length === 0) {
    console.log('  Creating study group...')
    studyGroup = await prisma.chatGroup.create({
      data: {
        name: 'BIO 152 Study Squad',
        type: 'STUDY',
        createdById: tiana.id,
        sandyEnabled: true,
        channels: {
          create: {
            name: 'general',
            type: 'GENERAL',
            isDefault: true,
            createdById: tiana.id,
          },
        },
        memberships: {
          create: [
            { userId: tiana.id, role: 'OWNER' },
            { userId: katie.id, role: 'MEMBER' },
            { userId: heath.id, role: 'MEMBER' },
          ],
        },
      },
      include: { channels: { where: { type: 'GENERAL' }, take: 1 } },
    })
  }
  const studyChannelId = studyGroup.channels[0]!.id

  // ─── Room 1: Active Study Room in TEK-100 (Katie's course) ───────

  const studyRoom = await prisma.liveRoom.create({
    data: {
      channelId: tekChannelId,
      type: 'STUDY',
      title: 'TEK-100 — Exam Review Session',
      phase: 'QUESTION',
      hostId: katie.id,
      config: { topic: 'AI Ethics & Collaboration', duration: 50, technique: 'pomodoro' },
      currentRound: 1,
      startedAt: new Date(Date.now() - 12 * 60 * 1000), // started 12 min ago
    },
  })

  await prisma.liveRoomParticipant.createMany({
    data: [
      { roomId: studyRoom.id, userId: katie.id, score: 0, streak: 0 },
      { roomId: studyRoom.id, userId: tiana.id, score: 0, streak: 0 },
    ],
  })

  await prisma.channelMessage.create({
    data: {
      channelId: tekChannelId,
      authorId: katie.id,
      content: 'started a Study Room: "TEK-100 — Exam Review Session"',
      messageType: 'live_room',
      liveRoomId: studyRoom.id,
      isSandy: false,
    },
  })

  console.log('  ✅ Room 1: Active Study Room in TEK-100 (Katie hosts)')

  // ─── Room 2: Active Debate in TEK-100 ────────────────────────────

  const debateRoom = await prisma.liveRoom.create({
    data: {
      channelId: tekChannelId,
      type: 'DEBATE',
      title: 'Should AI-Generated Content Require Disclosure?',
      phase: 'QUESTION',
      hostId: tiana.id,
      config: { topic: 'AI Transparency', rounds: 3, format: 'structured' },
      currentRound: 2,
      startedAt: new Date(Date.now() - 8 * 60 * 1000),
    },
  })

  await prisma.liveRoomParticipant.createMany({
    data: [
      { roomId: debateRoom.id, userId: tiana.id, score: 75, streak: 0 },
      { roomId: debateRoom.id, userId: heath.id, score: 60, streak: 0 },
    ],
  })

  await prisma.channelMessage.create({
    data: {
      channelId: tekChannelId,
      authorId: tiana.id,
      content: 'started a Debate: "Should AI-Generated Content Require Disclosure?"',
      messageType: 'live_room',
      liveRoomId: debateRoom.id,
      isSandy: false,
    },
  })

  console.log('  ✅ Room 2: Active Debate in TEK-100')

  // ─── Room 3: Completed Challenge in study group (recent) ─────────

  const challengeRoom = await prisma.liveRoom.create({
    data: {
      channelId: studyChannelId,
      type: 'CHALLENGE',
      title: 'BIO 152 — Cell Biology Review',
      phase: 'COMPLETE',
      hostId: tiana.id,
      config: { rounds: 5, topic: 'Cell Biology', difficulty: 'medium' },
      currentRound: 5,
      startedAt: new Date(Date.now() - 45 * 60 * 1000),
      endedAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  })

  const cp1 = await prisma.liveRoomParticipant.create({
    data: { roomId: challengeRoom.id, userId: tiana.id, score: 475, streak: 2 },
  })
  const cp2 = await prisma.liveRoomParticipant.create({
    data: { roomId: challengeRoom.id, userId: katie.id, score: 350, streak: 0 },
  })
  const cp3 = await prisma.liveRoomParticipant.create({
    data: { roomId: challengeRoom.id, userId: heath.id, score: 200, streak: 0 },
  })

  // Create 5 rounds with responses
  const questions = [
    { q: 'What is the primary function of mitochondria?', opts: ['A) DNA replication', 'B) Energy production (ATP)', 'C) Protein synthesis', 'D) Cell division'], correct: 1, exp: 'Mitochondria are the powerhouses of the cell.' },
    { q: 'Which organelle is responsible for protein synthesis?', opts: ['A) Golgi apparatus', 'B) Mitochondria', 'C) Ribosome', 'D) Lysosome'], correct: 2, exp: 'Ribosomes translate mRNA into proteins.' },
    { q: 'What type of transport requires ATP?', opts: ['A) Osmosis', 'B) Diffusion', 'C) Facilitated diffusion', 'D) Active transport'], correct: 3, exp: 'Active transport moves molecules against their concentration gradient using ATP.' },
    { q: 'During which phase does DNA replication occur?', opts: ['A) G1 phase', 'B) S phase', 'C) G2 phase', 'D) M phase'], correct: 1, exp: 'The S (synthesis) phase is when DNA is replicated.' },
    { q: 'What is the selectively permeable barrier around a cell?', opts: ['A) Cell wall', 'B) Cytoplasm', 'C) Plasma membrane', 'D) Nuclear envelope'], correct: 2, exp: 'The plasma membrane controls what enters and exits the cell.' },
  ]

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]!
    const round = await prisma.liveRoomRound.create({
      data: {
        roomId: challengeRoom.id,
        roundNumber: i + 1,
        question: q.q,
        options: q.opts,
        correctIndex: q.correct,
        explanation: q.exp,
        timeoutMs: 15000,
        openedAt: new Date(Date.now() - (44 - i * 2) * 60 * 1000),
        closedAt: new Date(Date.now() - (44 - i * 2) * 60 * 1000 + 12000),
      },
    })

    await prisma.liveRoomResponse.create({
      data: { roundId: round.id, participantId: cp1.id, selectedIndex: q.correct, isCorrect: true, responseTimeMs: 3000 + Math.floor(Math.random() * 2000) },
    })

    const katieCorrect = i !== 1 && i !== 4
    await prisma.liveRoomResponse.create({
      data: { roundId: round.id, participantId: cp2.id, selectedIndex: katieCorrect ? q.correct : (q.correct + 1) % 4, isCorrect: katieCorrect, responseTimeMs: 5000 + Math.floor(Math.random() * 3000) },
    })

    const heathCorrect = i === 0 || i === 2
    await prisma.liveRoomResponse.create({
      data: { roundId: round.id, participantId: cp3.id, selectedIndex: heathCorrect ? q.correct : (q.correct + 2) % 4, isCorrect: heathCorrect, responseTimeMs: 7000 + Math.floor(Math.random() * 4000) },
    })
  }

  await prisma.channelMessage.create({
    data: {
      channelId: studyChannelId,
      authorId: tiana.id,
      content: 'started a Challenge Room: "BIO 152 — Cell Biology Review"',
      messageType: 'live_room',
      liveRoomId: challengeRoom.id,
      isSandy: false,
    },
  })

  await prisma.channelMessage.create({
    data: {
      channelId: studyChannelId,
      authorId: tiana.id,
      content: '🏆 Challenge Complete — BIO 152 — Cell Biology Review\n\n🥇 Tiana The — 475 pts\n🥈 Katie Thompson — 350 pts\n🥉 Heath Price — 200 pts\n\nTiana dominated that one! Katie had a strong mid-game streak, and Heath — chapter 7 might need another look. Great game everyone!',
      messageType: 'system',
      isSandy: true,
    },
  })

  console.log('  ✅ Room 3: Completed Challenge in BIO 152 Study Squad')

  // ─── Room 4: Completed Teachback in TEK-100 ──────────────────────

  const teachbackRoom = await prisma.liveRoom.create({
    data: {
      channelId: tekChannelId,
      type: 'TEACHBACK',
      title: 'Explain Prompt Engineering to a 5th Grader',
      phase: 'COMPLETE',
      hostId: katie.id,
      config: { topic: 'Prompt Engineering', duration: 15 },
      currentRound: 1,
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endedAt: new Date(Date.now() - 90 * 60 * 1000),
    },
  })

  await prisma.liveRoomParticipant.createMany({
    data: [
      { roomId: teachbackRoom.id, userId: katie.id, score: 85, streak: 0 },
      { roomId: teachbackRoom.id, userId: tiana.id, score: 92, streak: 0 },
      { roomId: teachbackRoom.id, userId: heath.id, score: 78, streak: 0 },
    ],
  })

  await prisma.channelMessage.create({
    data: {
      channelId: tekChannelId,
      authorId: katie.id,
      content: 'started a Teachback: "Explain Prompt Engineering to a 5th Grader"',
      messageType: 'live_room',
      liveRoomId: teachbackRoom.id,
      isSandy: false,
    },
  })

  await prisma.channelMessage.create({
    data: {
      channelId: tekChannelId,
      authorId: katie.id,
      content: '📚 Teachback Complete — Explain Prompt Engineering to a 5th Grader\n\n🥇 Tiana The — 92 pts (Best analogy: "It\'s like giving really good directions")\n🥈 Katie Thompson — 85 pts\n🥉 Heath Price — 78 pts\n\nGreat explanations all around!',
      messageType: 'system',
      isSandy: true,
    },
  })

  console.log('  ✅ Room 4: Completed Teachback in TEK-100 (Katie hosted)')

  // ─── Room 5: Active Office Hours in TEK-100 ──────────────────────

  const officeHoursRoom = await prisma.liveRoom.create({
    data: {
      channelId: tekChannelId,
      type: 'OFFICE_HOURS',
      title: 'TEK-100 — Weekly Office Hours',
      phase: 'LOBBY',
      hostId: katie.id,
      config: { topic: 'Week 8 Questions', duration: 60 },
      currentRound: 0,
      startedAt: new Date(Date.now() - 20 * 60 * 1000),
    },
  })

  await prisma.liveRoomParticipant.createMany({
    data: [
      { roomId: officeHoursRoom.id, userId: katie.id, score: 0, streak: 0 },
      { roomId: officeHoursRoom.id, userId: tiana.id, score: 0, streak: 0 },
    ],
  })

  await prisma.channelMessage.create({
    data: {
      channelId: tekChannelId,
      authorId: katie.id,
      content: 'started Office Hours: "TEK-100 — Weekly Office Hours"',
      messageType: 'live_room',
      liveRoomId: officeHoursRoom.id,
      isSandy: false,
    },
  })

  console.log('  ✅ Room 5: Active Office Hours in TEK-100 (Katie hosts)')

  // ─── Summary ──────────────────────────────────────────────────────

  console.log('')
  console.log('🎯 The Commons seeding complete!')
  console.log('   3 active rooms (Study, Debate, Office Hours)')
  console.log('   2 recently completed (Challenge, Teachback)')
  console.log('   Katie hosts 3 rooms, participates in all 5')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
