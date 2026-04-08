import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import { applyMasteryDecay } from './mastery-decay'

// ── Types ────────────────────────────────────────────────────────────────────

export interface QuestionSubmissionResponse {
  id: string
  triageResult: 'auto_answered' | 'queued' | 'clustered'
  aiAnswer: string | null
  confidence: number | null
  message: string
}

export interface FacultyQueueResponse {
  queue: QueueItem[]
  clusters: ClusterItem[]
  stats: {
    autoResolvedThisWeek: number
    totalThisWeek: number
    autoResolveRate: number
    kbSize: number
    queueSize: number
  }
}

interface QueueItem {
  id: string
  studentName: string
  question: string
  context: string | null
  conceptSlugs: string[]
  priority: number
  aiAnswer: string | null
  createdAt: Date
}

interface ClusterItem {
  id: string
  label: string
  questionCount: number
  conceptSlugs: string[]
  representativeQuestion: string | null
  status: string
  createdAt: Date
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return fallback
  }
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

// ── Triage Pipeline ──────────────────────────────────────────────────────────

export async function submitQuestion(
  studentId: string,
  courseId: string,
  question: string,
  context?: string,
  assignmentId?: string
): Promise<QuestionSubmissionResponse> {
  // Verify enrollment
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  })
  if (!enrollment) throw new Error('Not enrolled in this course')

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { courseCode: true, title: true },
  })
  if (!course) throw new Error('Course not found')

  // Step 1: Check Knowledge Base for near-exact match
  const kbEntries = await prisma.officeHoursKBEntry.findMany({
    where: { courseId, verified: true },
    select: { id: true, question: true, answer: true },
  })

  // Simple text similarity check (keyword overlap)
  const questionLower = question.toLowerCase()
  const bestKBMatch = kbEntries
    .map((kb) => {
      const kbWords = new Set(kb.question.toLowerCase().split(/\s+/).filter(w => w.length > 3))
      const qWords = questionLower.split(/\s+/).filter(w => w.length > 3)
      const overlap = qWords.filter((w) => kbWords.has(w)).length
      const score = kbWords.size > 0 ? overlap / Math.max(kbWords.size, qWords.length) : 0
      return { ...kb, score }
    })
    .sort((a, b) => b.score - a.score)[0]

  if (bestKBMatch && bestKBMatch.score > 0.6) {
    // Auto-answer from KB
    const created = await prisma.officeHoursQuestion.create({
      data: {
        courseId,
        studentId,
        question,
        context,
        assignmentId,
        conceptSlugs: [],
        triageResult: 'auto_answered',
        confidence: bestKBMatch.score,
        aiAnswer: bestKBMatch.answer,
        resolvedAt: new Date(),
        resolvedBy: 'kb',
      },
    })

    // Increment KB use count
    await prisma.officeHoursKBEntry.update({
      where: { id: bestKBMatch.id },
      data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
    })

    return {
      id: created.id,
      triageResult: 'auto_answered',
      aiAnswer: bestKBMatch.answer,
      confidence: bestKBMatch.score,
      message: 'Found an answer from our knowledge base!',
    }
  }

  // Step 2: Gather student mastery context
  const masteries = await prisma.studentConceptMastery.findMany({
    where: { userId: studentId },
    orderBy: { masteryLevel: 'asc' },
    take: 10,
  })
  const weakConcepts = masteries
    .filter((m) => applyMasteryDecay(m) < 0.5)
    .map((m) => m.concept)
    .slice(0, 5)

  // Step 3: Gather course material context (recent KB entries as context)
  const recentKB = await prisma.officeHoursKBEntry.findMany({
    where: { courseId },
    orderBy: { useCount: 'desc' },
    take: 5,
    select: { question: true, answer: true },
  })
  const kbContext = recentKB.map((k) => `Q: ${k.question}\nA: ${k.answer}`).join('\n\n')

  // Step 4: AI Answer Attempt
  let aiAnswer: string | null = null
  let confidence: number | null = null
  let conceptSlugs: string[] = []
  let needsFaculty = true

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic()
      const assignmentInfo = assignmentId
        ? `\nThis question relates to a specific assignment.`
        : ''

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: `You are a teaching assistant for ${course.courseCode} — ${course.title}. A student is asking a question.
Answer the question using ONLY the course knowledge base and context provided below.
Do NOT make up information. If you are not confident in your answer, say so honestly.

## Knowledge Base (past answered questions)
${kbContext || '(no entries yet)'}

## Student Context
- Weak concepts: ${weakConcepts.join(', ') || 'unknown'}
${assignmentInfo}
${context ? `\nStudent notes: ${context}` : ''}

## Instructions
- Answer the student's question directly and clearly
- If the question requires subjective judgment, policy interpretation, or grading clarification, set needsFaculty to true
- Rate your confidence from 0.0 to 1.0
- Extract concept slugs (lowercase-hyphenated) the question relates to

Return JSON: { "answer": "...", "confidence": 0.0, "conceptSlugs": ["..."], "needsFaculty": true }`,
        messages: [{ role: 'user', content: question }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const parsed = safeJsonParse<{
        answer: string
        confidence: number
        conceptSlugs: string[]
        needsFaculty: boolean
      }>(text, { answer: '', confidence: 0, conceptSlugs: [], needsFaculty: true })

      aiAnswer = parsed.answer || null
      confidence = parsed.confidence
      conceptSlugs = parsed.conceptSlugs || []
      needsFaculty = parsed.needsFaculty
    } catch (err) {
      console.error('AI triage failed:', err)
    }
  }

  // Step 5: Determine triage result
  let triageResult: 'auto_answered' | 'queued' | 'clustered' = 'queued'

  if (aiAnswer && confidence !== null && confidence >= 0.8 && !needsFaculty) {
    triageResult = 'auto_answered'
  }

  // Step 6: Priority scoring
  let priority = 5
  if (assignmentId) {
    // Check if assignment is due soon
    const assignment = assignmentId
      ? await prisma.assignment.findUnique({
          where: { id: assignmentId },
          select: { dueAt: true },
        })
      : null
    if (assignment?.dueAt) {
      const hoursUntilDue = (assignment.dueAt.getTime() - Date.now()) / (1000 * 60 * 60)
      if (hoursUntilDue < 48) priority -= 2
    }
  }
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    select: { riskScore: true },
  })
  if (studentProfile?.riskScore && studentProfile.riskScore >= 0.6) priority -= 1
  if (/exam|midterm|final|test/i.test(question)) priority -= 1
  if (aiAnswer) priority += 1 // less urgent if AI has a prep answer
  priority = Math.max(1, Math.min(10, priority))

  // Step 7: Check for similar questions (clustering)
  let clusterId: string | null = null
  if (triageResult === 'queued') {
    const recentQuestions = await prisma.officeHoursQuestion.findMany({
      where: {
        courseId,
        triageResult: { in: ['queued', 'clustered'] },
        resolvedAt: null,
        createdAt: { gte: daysAgo(7) },
      },
      select: { id: true, question: true, clusterId: true },
    })

    // Simple keyword overlap clustering
    const qWords = new Set(questionLower.split(/\s+/).filter((w) => w.length > 3))
    for (const rq of recentQuestions) {
      const rqWords = rq.question.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
      const overlap = rqWords.filter((w) => qWords.has(w)).length
      const similarity = qWords.size > 0 ? overlap / Math.max(qWords.size, rqWords.length) : 0

      if (similarity > 0.5) {
        if (rq.clusterId) {
          clusterId = rq.clusterId
          await prisma.officeHoursCluster.update({
            where: { id: clusterId },
            data: { questionCount: { increment: 1 } },
          })
        } else {
          // Create new cluster
          const clusterLabel = await generateClusterLabel(question, rq.question)
          const cluster = await prisma.officeHoursCluster.create({
            data: {
              courseId,
              label: clusterLabel,
              questionCount: 2,
              conceptSlugs,
              representativeQuestionId: rq.id,
            },
          })
          clusterId = cluster.id

          // Update the matched question
          await prisma.officeHoursQuestion.update({
            where: { id: rq.id },
            data: { clusterId: cluster.id, triageResult: 'clustered' },
          })
        }
        triageResult = 'clustered'
        break
      }
    }
  }

  // Step 8: Save the question
  const created = await prisma.officeHoursQuestion.create({
    data: {
      courseId,
      studentId,
      question,
      context,
      assignmentId,
      conceptSlugs,
      triageResult,
      confidence,
      clusterId,
      priority,
      aiAnswer,
      resolvedAt: triageResult === 'auto_answered' ? new Date() : null,
      resolvedBy: triageResult === 'auto_answered' ? 'ai' : null,
    },
  })

  const messages = {
    auto_answered: 'Here\'s what I found — let me know if this helps!',
    queued: 'Your question has been sent to your professor. Here\'s what I found that might help in the meantime.',
    clustered: 'Other students asked similar questions — your professor will see these together.',
  }

  return {
    id: created.id,
    triageResult,
    aiAnswer,
    confidence,
    message: messages[triageResult],
  }
}

async function generateClusterLabel(q1: string, q2: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return 'Similar questions'
  }
  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      system: 'Summarize what these two questions have in common in 5-8 words. Return ONLY the summary text, no JSON.',
      messages: [{ role: 'user', content: `Question 1: ${q1}\nQuestion 2: ${q2}` }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return text.trim() || 'Similar questions'
  } catch {
    return 'Similar questions'
  }
}

// ── Student Queries ──────────────────────────────────────────────────────────

export async function getStudentQuestions(studentId: string, courseId?: string) {
  const where: Record<string, unknown> = { studentId }
  if (courseId) where.courseId = courseId

  return prisma.officeHoursQuestion.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { course: { select: { courseCode: true } } },
  })
}

// ── Faculty Queue ────────────────────────────────────────────────────────────

export async function getFacultyQueue(courseId: string, facultyId: string): Promise<FacultyQueueResponse> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, instructorId: facultyId },
  })
  if (!course) throw new Error('Not authorized')

  const sevenDaysAgo = daysAgo(7)

  const [questions, clusters, autoResolved, total, kbCount] = await Promise.all([
    prisma.officeHoursQuestion.findMany({
      where: { courseId, triageResult: 'queued', resolvedAt: null },
      orderBy: { priority: 'asc' },
      include: { student: { select: { name: true } } },
    }),
    prisma.officeHoursCluster.findMany({
      where: { courseId, status: 'open' },
      orderBy: { questionCount: 'desc' },
    }),
    prisma.officeHoursQuestion.count({
      where: { courseId, resolvedBy: { in: ['ai', 'kb'] }, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.officeHoursQuestion.count({
      where: { courseId, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.officeHoursKBEntry.count({ where: { courseId } }),
  ])

  // Get representative question text for clusters
  const clusterItems: ClusterItem[] = await Promise.all(
    clusters.map(async (c) => {
      let repQuestion: string | null = null
      if (c.representativeQuestionId) {
        const rep = await prisma.officeHoursQuestion.findUnique({
          where: { id: c.representativeQuestionId },
          select: { question: true },
        })
        repQuestion = rep?.question ?? null
      }
      return {
        id: c.id,
        label: c.label,
        questionCount: c.questionCount,
        conceptSlugs: c.conceptSlugs,
        representativeQuestion: repQuestion,
        status: c.status,
        createdAt: c.createdAt,
      }
    })
  )

  return {
    queue: questions.map((q) => ({
      id: q.id,
      studentName: q.student?.name?.split(' ')[0] || 'Student',
      question: q.question,
      context: q.context,
      conceptSlugs: q.conceptSlugs,
      priority: q.priority,
      aiAnswer: q.aiAnswer,
      createdAt: q.createdAt,
    })),
    clusters: clusterItems,
    stats: {
      autoResolvedThisWeek: autoResolved,
      totalThisWeek: total,
      autoResolveRate: total > 0 ? autoResolved / total : 0,
      kbSize: kbCount,
      queueSize: questions.length,
    },
  }
}

// ── Faculty Response ─────────────────────────────────────────────────────────

export async function respondToQuestion(questionId: string, facultyId: string, answer: string) {
  const q = await prisma.officeHoursQuestion.findUnique({
    where: { id: questionId },
    include: { course: { select: { instructorId: true } } },
  })
  if (!q || q.course.instructorId !== facultyId) throw new Error('Not authorized')

  await prisma.officeHoursQuestion.update({
    where: { id: questionId },
    data: {
      facultyAnswer: answer,
      resolvedAt: new Date(),
      resolvedBy: 'faculty',
    },
  })

  // Promote to KB
  await promoteToKB(questionId)
}

export async function respondToCluster(clusterId: string, facultyId: string, answer: string) {
  const cluster = await prisma.officeHoursCluster.findUnique({
    where: { id: clusterId },
    include: { course: { select: { instructorId: true } } },
  })
  if (!cluster || cluster.course.instructorId !== facultyId) throw new Error('Not authorized')

  // Update all questions in the cluster
  await prisma.officeHoursQuestion.updateMany({
    where: { clusterId },
    data: {
      facultyAnswer: answer,
      resolvedAt: new Date(),
      resolvedBy: 'faculty',
    },
  })

  await prisma.officeHoursCluster.update({
    where: { id: clusterId },
    data: {
      facultyResponse: answer,
      respondedAt: new Date(),
      respondedById: facultyId,
      status: 'responded',
    },
  })

  // Promote representative question to KB
  if (cluster.representativeQuestionId) {
    await promoteToKB(cluster.representativeQuestionId)
  }
}

// ── Feedback ─────────────────────────────────────────────────────────────────

export async function submitFeedback(questionId: string, studentId: string, helpful: boolean) {
  const q = await prisma.officeHoursQuestion.findFirst({
    where: { id: questionId, studentId },
  })
  if (!q) throw new Error('Question not found')

  await prisma.officeHoursQuestion.update({
    where: { id: questionId },
    data: { helpful },
  })

  // If helpful AI answer, promote to KB
  if (helpful && q.resolvedBy === 'ai' && q.aiAnswer) {
    await promoteToKB(questionId)
  }
}

// ── Knowledge Base ───────────────────────────────────────────────────────────

async function promoteToKB(questionId: string) {
  const q = await prisma.officeHoursQuestion.findUnique({
    where: { id: questionId },
  })
  if (!q) return

  const answer = q.facultyAnswer ?? q.aiAnswer
  if (!answer) return

  // Check if a very similar KB entry exists
  const existing = await prisma.officeHoursKBEntry.findMany({
    where: { courseId: q.courseId },
    select: { id: true, question: true },
  })

  const qLower = q.question.toLowerCase()
  const duplicate = existing.find((e) => {
    const eWords = new Set(e.question.toLowerCase().split(/\s+/).filter((w) => w.length > 3))
    const qWords = qLower.split(/\s+/).filter((w) => w.length > 3)
    const overlap = qWords.filter((w) => eWords.has(w)).length
    return eWords.size > 0 && overlap / Math.max(eWords.size, qWords.length) > 0.7
  })

  if (duplicate) {
    // Update existing
    await prisma.officeHoursKBEntry.update({
      where: { id: duplicate.id },
      data: {
        answer,
        verified: q.resolvedBy === 'faculty',
        useCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    })
  } else {
    // Create new
    await prisma.officeHoursKBEntry.create({
      data: {
        courseId: q.courseId,
        question: q.question,
        answer,
        conceptSlugs: q.conceptSlugs,
        source: q.resolvedBy === 'faculty' ? 'faculty_authored' : 'resolved',
        verified: q.resolvedBy === 'faculty',
        useCount: 1,
      },
    })
  }
}

export async function getKnowledgeBase(courseId: string) {
  return prisma.officeHoursKBEntry.findMany({
    where: { courseId },
    orderBy: { useCount: 'desc' },
  })
}

export async function addKBEntry(
  courseId: string,
  facultyId: string,
  question: string,
  answer: string
) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, instructorId: facultyId },
  })
  if (!course) throw new Error('Not authorized')

  return prisma.officeHoursKBEntry.create({
    data: {
      courseId,
      question,
      answer,
      source: 'faculty_authored',
      verified: true,
      useCount: 0,
    },
  })
}

export async function verifyKBEntry(entryId: string, facultyId: string) {
  const entry = await prisma.officeHoursKBEntry.findUnique({
    where: { id: entryId },
    include: { course: { select: { instructorId: true } } },
  })
  if (!entry || entry.course.instructorId !== facultyId) throw new Error('Not authorized')

  await prisma.officeHoursKBEntry.update({
    where: { id: entryId },
    data: { verified: true },
  })
}
