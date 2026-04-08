import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import type { GalleryExhibit, GalleryWork, GalleryNote, GalleryStatus } from '../../generated/prisma'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Types ────────────────────────────────────────────────────────────────────

export type NoteWithAuthor = GalleryNote & {
  author: { id: string; name: string }
}

export type WorkWithDetails = GalleryWork & {
  author: { id: string; name: string }
  notes: NoteWithAuthor[]
}

export type ExhibitWithWorks = GalleryExhibit & {
  host: { id: string; name: string }
  works: WorkWithDetails[]
  isHost: boolean
  myWork: GalleryWork | null
}

export type ExhibitSummary = GalleryExhibit & {
  host: { id: string; name: string }
  _count: { works: number }
  noteCount: number
}

// ─── Access code ──────────────────────────────────────────────────────────────

const GALLERY_WORDS = [
  'GALL', 'MUSE', 'ARCH', 'WALL', 'LENS', 'FRAME', 'FORM', 'EDGE',
  'TONE', 'LINE', 'VOID', 'WORK', 'MARK', 'HUES', 'WAVE', 'DRAFT',
]

function makeCode(): string {
  const word = GALLERY_WORDS[Math.floor(Math.random() * GALLERY_WORDS.length)]
  const num = String(Math.floor(Math.random() * 900) + 100)
  return `${word}-${num}`
}

async function generateAccessCode(): Promise<string> {
  let code = makeCode()
  let exists = await prisma.galleryExhibit.findUnique({ where: { accessCode: code } })
  while (exists) {
    code = makeCode()
    exists = await prisma.galleryExhibit.findUnique({ where: { accessCode: code } })
  }
  return code
}

// ─── Exhibit CRUD ─────────────────────────────────────────────────────────────

export async function createExhibit(
  hostId: string,
  title: string,
  prompt: string,
  anonymous: boolean,
): Promise<GalleryExhibit> {
  const accessCode = await generateAccessCode()
  return prisma.galleryExhibit.create({
    data: { title, prompt, accessCode, anonymous, hostId },
  })
}

export async function getExhibit(
  exhibitId: string,
  userId: string,
): Promise<ExhibitWithWorks | null> {
  const exhibit = await prisma.galleryExhibit.findUnique({
    where: { id: exhibitId },
    include: {
      host: { select: { id: true, name: true } },
      works: {
        include: {
          author: { select: { id: true, name: true } },
          notes: {
            include: { author: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!exhibit) return null

  const isHost = exhibit.hostId === userId
  const myWork = exhibit.works.find(w => w.authorId === userId) ?? null

  // Apply anonymization: if anonymous=true, hide author names from peers
  const works = exhibit.works.map(work => {
    const notes = work.notes.map(note => ({
      ...note,
      author: exhibit.anonymous && note.authorId !== userId
        ? { id: note.authorId, name: 'Anonymous' }
        : note.author,
    }))
    return {
      ...work,
      author: exhibit.anonymous && work.authorId !== userId && !isHost
        ? { id: work.authorId, name: 'Anonymous' }
        : work.author,
      notes,
    }
  })

  return { ...exhibit, works, isHost, myWork }
}

export async function getExhibitByCode(
  accessCode: string,
): Promise<GalleryExhibit | null> {
  return prisma.galleryExhibit.findUnique({ where: { accessCode } })
}

export async function listExhibitsForUser(userId: string): Promise<ExhibitSummary[]> {
  // Exhibits hosted by user
  const hosted = await prisma.galleryExhibit.findMany({
    where: { hostId: userId },
    include: {
      host: { select: { id: true, name: true } },
      _count: { select: { works: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Exhibits where user submitted work
  const participated = await prisma.galleryExhibit.findMany({
    where: {
      hostId: { not: userId },
      works: { some: { authorId: userId } },
    },
    include: {
      host: { select: { id: true, name: true } },
      _count: { select: { works: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const all = [...hosted, ...participated]

  // Fetch note counts in parallel
  const noteCounts = await Promise.all(
    all.map(e =>
      prisma.galleryNote.count({ where: { work: { exhibitId: e.id } } })
    )
  )

  return all.map((e, i) => ({ ...e, noteCount: noteCounts[i] }))
}

// ─── Work submission ──────────────────────────────────────────────────────────

export async function submitWork(
  exhibitId: string,
  authorId: string,
  title: string,
  content: string,
): Promise<GalleryWork> {
  const exhibit = await prisma.galleryExhibit.findUnique({ where: { id: exhibitId } })
  if (!exhibit) throw new Error('Exhibit not found')
  if (exhibit.status !== 'OPEN') throw new Error('Exhibit is not accepting submissions')

  const existing = await prisma.galleryWork.findFirst({
    where: { exhibitId, authorId },
  })
  if (existing) throw new Error('You have already submitted to this exhibit')

  const work = await prisma.galleryWork.create({
    data: { exhibitId, authorId, title, content },
  })

  // Fire-and-forget initial curator note
  generateCuratorNote(work.id).catch(() => undefined)

  return work
}

// ─── Curator notes ────────────────────────────────────────────────────────────

export async function generateCuratorNote(workId: string): Promise<void> {
  const work = await prisma.galleryWork.findUnique({
    where: { id: workId },
    include: { exhibit: true },
  })
  if (!work) return

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `You are an insightful art and writing critic writing brief gallery cards. Here is the assignment prompt: ${work.exhibit.prompt}. A student submitted this work titled "${work.title}": ${work.content}. Write a brief curator's note (3-4 sentences) synthesizing the most interesting aspects of this work and one specific suggestion for strengthening it. Write in third person, present tense, in a gallery-card style.`,
        },
      ],
    })

    const note = message.content[0].type === 'text' ? message.content[0].text : ''
    await prisma.galleryWork.update({
      where: { id: workId },
      data: { curatorNote: note, curatorNoteAt: new Date() },
    })
  } catch {
    // Silently fail — curator note is non-blocking
  }
}

export async function regenerateAllCuratorNotes(exhibitId: string): Promise<void> {
  const exhibit = await prisma.galleryExhibit.findUnique({
    where: { id: exhibitId },
    include: {
      works: { include: { notes: true } },
    },
  })
  if (!exhibit) return

  for (const work of exhibit.works) {
    if (work.notes.length === 0) continue
    try {
      const notesBullets = work.notes.map(n => `• ${n.content}`).join('\n')
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `You are an insightful art and writing critic. Here is the original assignment: ${exhibit.prompt}. Here is the work titled "${work.title}": ${work.content}. Here are peer feedback notes:\n${notesBullets}\n\nWrite a 3-4 sentence curator's note synthesizing the peer feedback themes and what this work does well. One specific actionable improvement suggestion. Write in third person, present tense, gallery-card style.`,
          },
        ],
      })
      const note = message.content[0].type === 'text' ? message.content[0].text : ''
      await prisma.galleryWork.update({
        where: { id: work.id },
        data: { curatorNote: note, curatorNoteAt: new Date() },
      })
    } catch {
      // Continue to next work
    }
  }
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function addNote(
  workId: string,
  authorId: string,
  content: string,
): Promise<GalleryNote> {
  const work = await prisma.galleryWork.findUnique({
    where: { id: workId },
    include: { exhibit: true },
  })
  if (!work) throw new Error('Work not found')
  if (work.exhibit.status === 'COMPLETE') throw new Error('This exhibit is closed for feedback')
  if (work.authorId === authorId) throw new Error('You cannot leave a note on your own work')

  return prisma.galleryNote.create({
    data: { workId, authorId, content },
  })
}

export async function deleteNote(noteId: string, userId: string): Promise<void> {
  const note = await prisma.galleryNote.findUnique({ where: { id: noteId } })
  if (!note) throw new Error('Note not found')
  if (note.authorId !== userId) throw new Error('You can only delete your own notes')
  await prisma.galleryNote.delete({ where: { id: noteId } })
}

// ─── Status transitions ───────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<GalleryStatus, GalleryStatus[]> = {
  OPEN: ['CRITIQUING'],
  CRITIQUING: ['COMPLETE'],
  COMPLETE: [],
}

export async function advanceStatus(
  exhibitId: string,
  hostId: string,
  newStatus: GalleryStatus,
): Promise<GalleryExhibit> {
  const exhibit = await prisma.galleryExhibit.findUnique({ where: { id: exhibitId } })
  if (!exhibit) throw new Error('Exhibit not found')
  if (exhibit.hostId !== hostId) throw new Error('Only the host can change exhibit status')

  const allowed = VALID_TRANSITIONS[exhibit.status]
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from ${exhibit.status} to ${newStatus}`)
  }

  const updated = await prisma.galleryExhibit.update({
    where: { id: exhibitId },
    data: { status: newStatus },
  })

  if (newStatus === 'COMPLETE') {
    regenerateAllCuratorNotes(exhibitId).catch(() => undefined)
  }

  return updated
}
