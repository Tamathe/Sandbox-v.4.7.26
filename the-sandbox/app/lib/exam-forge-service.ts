/**
 * Exam Forge Service — Personalized Practice Exam Generation
 *
 * Generates practice exams tailored to each student's concept mastery,
 * spaced repetition state, misconceptions, and Bloom level gaps.
 * Grades submissions and updates SR/mastery state accordingly.
 *
 * Exports:
 *   generatePracticeExam  — build + persist a personalized practice exam
 *   submitPracticeExam    — grade answers and update learning state
 *   listPracticeExams     — metadata-only list for a student
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import { applyMasteryDecay } from './mastery-decay'
import { getDueConcepts, computeNextReview } from './sr-scheduler'
import type { ConceptStateForScheduler } from './sr-scheduler'
import { upsertConceptMastery } from './concept-mastery-service'
import { format } from 'date-fns'
import type { Prisma } from '../generated/prisma'

const anthropic = new Anthropic()
const SONNET_MODEL = 'claude-sonnet-4-6'
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExamStrategy {
  weakConceptsTargeted: { concept: string; currentMastery: number; reason: string }[]
  staleConceptsTargeted: { concept: string; daysSinceReview: number }[]
  misconceptionsProbed: { concept: string; misconception: string }[]
  bloomGaps: { objective: string; expected: string; current: number }[]
}

export interface ExamQuestion {
  id: string
  concept: string
  objectiveId?: string
  bloomLevel: string
  type: 'multiple_choice' | 'short_answer' | 'scenario' | 'explain'
  question: string
  options?: string[]
  correctAnswer: string
  explanation: string
  misconceptionProbe?: string
  points: number
}

interface QuestionResult {
  questionId: string
  studentAnswer: string
  correct: boolean
  score: number
  feedback: string
}

export interface PracticeExamResponse {
  id: string
  title: string
  courseCode: string
  courseName: string
  questionCount: number
  estimatedMinutes: number
  bloomDistribution: Record<string, number>
  conceptsTargeted: string[]
  questions: Omit<ExamQuestion, 'correctAnswer' | 'explanation'>[]
}

export interface ExamResultResponse {
  examId: string
  score: number
  questionCount: number
  correctCount: number
  questionResults: QuestionResult[]
  weaknesses: string[]
}

export interface PracticeExamSummary {
  id: string
  title: string
  courseCode: string
  courseName: string
  questionCount: number
  score: number | null
  completedAt: string | null
  createdAt: string
}

interface GenerateOptions {
  targetAssignmentId?: string
  questionCount?: number
}

// ── generatePracticeExam ─────────────────────────────────────────────────────

export async function generatePracticeExam(
  userId: string,
  courseId: string,
  options: GenerateOptions = {},
): Promise<PracticeExamResponse> {
  const questionCount = Math.min(Math.max(options.questionCount ?? 10, 5), 20)

  // 1. Fetch course info
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, courseCode: true },
  })
  if (!course) throw new Error('Course not found')

  // 2. Fetch StudentConceptMastery + apply decay → sort by weakness
  // Filter by coursesEncountered containing courseId (not just firstCourseId)
  const allMasteries = await prisma.studentConceptMastery.findMany({
    where: { userId },
  })
  const masteries = allMasteries.filter((m) => m.coursesEncountered.includes(courseId))
  const decayed = masteries
    .map((m) => ({ concept: m.concept, effective: applyMasteryDecay(m) }))
    .sort((a, b) => a.effective - b.effective)

  // 3. Fetch overdue SR concepts
  const dueConcepts = await getDueConcepts(userId, courseId)

  // 4. Fetch fired misconceptions
  const firedSlugs = dueConcepts.flatMap((dc) => dc.firedMisconceptions)
  const misconceptions = firedSlugs.length > 0
    ? await prisma.misconceptionTaxonomy.findMany({
        where: { courseId, id: { in: firedSlugs } },
        select: { conceptSlug: true, misconceptionText: true },
      })
    : []

  // 5. Fetch LearningObjective + StudentObjectiveProgress → Bloom gaps
  const objectives = await prisma.learningObjective.findMany({
    where: { courseId },
    select: { id: true, title: true, bloomLevel: true },
  })
  const progressRecords = await prisma.studentObjectiveProgress.findMany({
    where: { studentId: userId, courseId },
    select: { objectiveId: true, masteryLevel: true },
  })
  const progressMap = new Map(progressRecords.map((p) => [p.objectiveId, p.masteryLevel]))

  const bloomGaps = objectives
    .filter((o) => {
      const status = progressMap.get(o.id) ?? 'not_started'
      return status !== 'mastered'
    })
    .map((o) => ({
      objective: o.title,
      expected: o.bloomLevel ?? 'understand',
      current: progressMap.get(o.id) === 'struggling' ? 1 : 0,
    }))

  // 6. Fetch target assignment (by ID or next upcoming exam within 14 days)
  let targetAssignment: { id: string; title: string; dueAt: Date | null } | null = null
  if (options.targetAssignmentId) {
    targetAssignment = await prisma.assignment.findUnique({
      where: { id: options.targetAssignmentId },
      select: { id: true, title: true, dueAt: true },
    })
  } else {
    const fourteenDaysOut = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    targetAssignment = await prisma.assignment.findFirst({
      where: {
        courseId,
        category: { in: ['quiz', 'exam', 'midterm', 'final'] },
        dueAt: { gte: new Date(), lte: fourteenDaysOut },
      },
      orderBy: { dueAt: 'asc' },
      select: { id: true, title: true, dueAt: true },
    })
  }

  // 7. Build ExamStrategy
  const weakCount = Math.ceil(questionCount * 0.3)
  const staleCount = Math.ceil(questionCount * 0.25)
  const misconceptionCount = Math.ceil(questionCount * 0.2)
  const bloomGapCount = questionCount - weakCount - staleCount - misconceptionCount

  const strategy: ExamStrategy = {
    weakConceptsTargeted: decayed.slice(0, weakCount).map((d) => ({
      concept: d.concept,
      currentMastery: Math.round(d.effective * 100) / 100,
      reason: 'Low effective mastery after decay',
    })),
    staleConceptsTargeted: dueConcepts.slice(0, staleCount).map((dc) => ({
      concept: dc.conceptSlug,
      daysSinceReview: dc.daysOverdue,
    })),
    misconceptionsProbed: misconceptions.slice(0, misconceptionCount).map((m) => ({
      concept: m.conceptSlug,
      misconception: m.misconceptionText,
    })),
    bloomGaps: bloomGaps.slice(0, bloomGapCount),
  }

  // Collect all concepts targeted
  const conceptsTargeted = [
    ...new Set([
      ...strategy.weakConceptsTargeted.map((w) => w.concept),
      ...strategy.staleConceptsTargeted.map((s) => s.concept),
      ...strategy.misconceptionsProbed.map((m) => m.concept),
    ]),
  ]

  // 8. Call Sonnet to generate questions
  const examTitle = targetAssignment
    ? `${targetAssignment.title} Practice — ${format(new Date(), 'MMM d')}`
    : `${course.courseCode} Practice Exam — ${format(new Date(), 'MMM d')}`

  const aiPrompt = `You are an expert educator creating a personalized practice exam.

Course: ${course.courseCode} — ${course.title}
Title: ${examTitle}
Question count: ${questionCount}

EXAM STRATEGY (these inform which concepts to target):
Weak concepts (30%): ${JSON.stringify(strategy.weakConceptsTargeted)}
Stale concepts needing review (25%): ${JSON.stringify(strategy.staleConceptsTargeted)}
Misconceptions to probe (20%): ${JSON.stringify(strategy.misconceptionsProbed)}
Bloom level gaps (25%): ${JSON.stringify(strategy.bloomGaps)}

Generate exactly ${questionCount} exam questions. Each question must have:
- id: "q1", "q2", etc.
- concept: the concept slug being tested
- bloomLevel: one of "remember", "understand", "apply", "analyze", "evaluate", "create"
- type: one of "multiple_choice", "short_answer", "scenario", "explain"
- question: the question text
- options: array of 4 options (for multiple_choice only, omit for other types)
- correctAnswer: the correct answer (letter A-D for MC, full text for others)
- explanation: brief explanation of why this is correct
- misconceptionProbe: if testing a misconception, describe which one (optional)
- points: relative weight 1-3

Question type distribution: ~40% multiple_choice, ~30% short_answer, ~20% scenario, ~10% explain.
Bloom level distribution should match the gaps identified.

Respond with ONLY a JSON array of question objects. No other text.`

  const aiResponse = await anthropic.messages.create({
    model: SONNET_MODEL,
    max_tokens: 4000,
    messages: [{ role: 'user', content: aiPrompt }],
  })

  let questions: ExamQuestion[] = []
  const textBlock = aiResponse.content.find((b) => b.type === 'text')
  if (textBlock && textBlock.type === 'text') {
    try {
      const parsed = JSON.parse(textBlock.text)
      if (Array.isArray(parsed)) {
        questions = parsed.map((q: Record<string, unknown>, i: number) => ({
          id: (q.id as string) || `q${i + 1}`,
          concept: (q.concept as string) || 'general',
          objectiveId: q.objectiveId as string | undefined,
          bloomLevel: (q.bloomLevel as string) || 'understand',
          type: (q.type as ExamQuestion['type']) || 'short_answer',
          question: (q.question as string) || '',
          options: Array.isArray(q.options) ? (q.options as string[]) : undefined,
          correctAnswer: (q.correctAnswer as string) || '',
          explanation: (q.explanation as string) || '',
          misconceptionProbe: q.misconceptionProbe as string | undefined,
          points: (typeof q.points === 'number' ? q.points : 1) as number,
        }))
      }
    } catch {
      // Fallback: generate basic questions
    }
  }

  // If AI failed to produce questions, create minimal fallback
  if (questions.length === 0) {
    const fallbackConcepts = conceptsTargeted.length > 0
      ? conceptsTargeted
      : ['general-knowledge']
    questions = fallbackConcepts.slice(0, questionCount).map((concept, i) => ({
      id: `q${i + 1}`,
      concept,
      bloomLevel: 'understand',
      type: 'short_answer' as const,
      question: `Explain the key concepts related to ${concept.replace(/-/g, ' ')} in ${course.courseCode}.`,
      correctAnswer: `A thorough explanation of ${concept.replace(/-/g, ' ')}.`,
      explanation: `This tests understanding of ${concept.replace(/-/g, ' ')}.`,
      points: 1,
    }))
  }

  // Build bloom distribution
  const bloomDistribution: Record<string, number> = {}
  for (const q of questions) {
    bloomDistribution[q.bloomLevel] = (bloomDistribution[q.bloomLevel] ?? 0) + 1
  }

  // Estimate time: ~2 min per MC, ~3 min per short_answer, ~5 min per scenario, ~4 min per explain
  const timeMap: Record<string, number> = {
    multiple_choice: 2,
    short_answer: 3,
    scenario: 5,
    explain: 4,
  }
  const estimatedMinutes = questions.reduce((t, q) => t + (timeMap[q.type] ?? 3), 0)

  // 9. Create PracticeExam record
  const exam = await prisma.practiceExam.create({
    data: {
      userId,
      courseId,
      title: examTitle,
      targetAssignmentId: targetAssignment?.id ?? null,
      strategy: strategy as unknown as Prisma.InputJsonValue,
      questions: questions as unknown as Prisma.InputJsonValue,
      questionCount: questions.length,
      estimatedMinutes,
      conceptsTargeted,
      bloomDistribution,
    },
  })

  // 10. Return exam (questions WITHOUT answers)
  return {
    id: exam.id,
    title: examTitle,
    courseCode: course.courseCode,
    courseName: course.title,
    questionCount: questions.length,
    estimatedMinutes,
    bloomDistribution,
    conceptsTargeted,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    questions: questions.map(({ correctAnswer, explanation, ...rest }) => rest),
  }
}

// ── submitPracticeExam ───────────────────────────────────────────────────────

export async function submitPracticeExam(
  examId: string,
  userId: string,
  answers: { questionId: string; answer: string }[],
): Promise<ExamResultResponse> {
  const exam = await prisma.practiceExam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      userId: true,
      courseId: true,
      questions: true,
      conceptsTargeted: true,
      completedAt: true,
    },
  })
  if (!exam || exam.userId !== userId) throw new Error('Exam not found')
  if (exam.completedAt) throw new Error('Exam already submitted')

  const questions = exam.questions as unknown as ExamQuestion[]
  const answerMap = new Map(answers.map((a) => [a.questionId, a.answer]))

  // Grade each question — MC instantly, open-ended via Haiku in parallel
  const questionResults: QuestionResult[] = new Array(questions.length)
  const aiGradingPromises: Promise<void>[] = []

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const studentAnswer = answerMap.get(q.id) ?? ''

    if (q.type === 'multiple_choice') {
      // Exact match for MC (case-insensitive, trim)
      const expected = q.correctAnswer.trim().toUpperCase()
      const given = studentAnswer.trim().toUpperCase()
      const correct = given === expected || given === expected.charAt(0)
      questionResults[i] = {
        questionId: q.id,
        studentAnswer,
        correct,
        score: correct ? 1.0 : 0.0,
        feedback: correct
          ? 'Correct!'
          : `The correct answer is ${q.correctAnswer}. ${q.explanation}`,
      }
    } else {
      // Placeholder — will be filled by parallel Haiku call
      questionResults[i] = {
        questionId: q.id,
        studentAnswer,
        correct: false,
        score: 0.5,
        feedback: `Expected: ${q.correctAnswer}`,
      }

      const idx = i
      aiGradingPromises.push(
        (async () => {
          try {
            const gradeResponse = await anthropic.messages.create({
              model: HAIKU_MODEL,
              max_tokens: 300,
              messages: [
                {
                  role: 'user',
                  content: `You are grading a student's answer to a practice exam question.

Question: ${q.question}
Expected answer: ${q.correctAnswer}
Student's answer: ${studentAnswer}

Score from 0.0 to 1.0 (be generous — partial credit counts). Provide brief constructive feedback.

Respond in this exact JSON format:
{"score": 0.0, "feedback": "..."}`,
                },
              ],
            })

            const tb = gradeResponse.content.find((b) => b.type === 'text')
            if (tb && tb.type === 'text') {
              try {
                const parsed = JSON.parse(tb.text)
                if (typeof parsed.score === 'number') {
                  questionResults[idx].score = Math.min(1.0, Math.max(0.0, parsed.score))
                }
                if (typeof parsed.feedback === 'string') {
                  questionResults[idx].feedback = parsed.feedback
                }
              } catch {
                // keep defaults
              }
            }
            questionResults[idx].correct = questionResults[idx].score >= 0.6
          } catch (err) {
            console.error(`[exam-forge] Haiku grading failed for ${q.id}:`, err)
            // keep defaults (0.5 score)
          }
        })(),
      )
    }
  }

  // Wait for all Haiku grading to complete in parallel
  await Promise.all(aiGradingPromises)

  let totalScore = 0
  for (const r of questionResults) {
    totalScore += r.score
  }

  const overallScore = questions.length > 0 ? totalScore / questions.length : 0

  // Update PracticeExam record
  await prisma.practiceExam.update({
    where: { id: examId },
    data: {
      score: Math.round(overallScore * 100) / 100,
      questionResults: questionResults as unknown as Prisma.InputJsonValue,
      completedAt: new Date(),
    },
  })

  // Update ConceptState for each tested concept
  const conceptScores = new Map<string, { total: number; count: number }>()
  for (const q of questions) {
    const result = questionResults.find((r) => r.questionId === q.id)
    if (result) {
      const existing = conceptScores.get(q.concept) ?? { total: 0, count: 0 }
      existing.total += result.score
      existing.count += 1
      conceptScores.set(q.concept, existing)
    }
  }

  for (const [conceptSlug, scores] of conceptScores) {
    const avgScore = scores.total / scores.count

    // Update StudentConceptMastery (encounter tracking + mastery level)
    await upsertConceptMastery(userId, conceptSlug, exam.courseId, avgScore)

    // Update ConceptState SR scheduling
    const conceptState = await prisma.conceptState.findUnique({
      where: {
        userId_courseId_conceptSlug: {
          userId,
          courseId: exam.courseId,
          conceptSlug,
        },
      },
      select: { stabilityFactor: true, missedReviews: true, bloomHighWater: true },
    })

    if (conceptState) {
      const srState: ConceptStateForScheduler = {
        stabilityFactor: conceptState.stabilityFactor,
        missedReviews: conceptState.missedReviews,
        bloomHighWater: conceptState.bloomHighWater,
      }
      const updated = computeNextReview(srState, avgScore)

      await prisma.conceptState.update({
        where: {
          userId_courseId_conceptSlug: {
            userId,
            courseId: exam.courseId,
            conceptSlug,
          },
        },
        data: {
          stabilityFactor: updated.stabilityFactor,
          nextReviewAt: updated.nextReviewAt,
          missedReviews: updated.missedReviews,
          bloomHighWater: updated.bloomHighWater ?? undefined,
        },
      })
    }
  }

  // Identify weaknesses (concepts with avg score < 0.6)
  const weaknesses: string[] = []
  for (const [concept, scores] of conceptScores) {
    if (scores.total / scores.count < 0.6) {
      weaknesses.push(concept)
    }
  }

  return {
    examId: exam.id,
    score: Math.round(overallScore * 100) / 100,
    questionCount: questions.length,
    correctCount: questionResults.filter((r) => r.correct).length,
    questionResults,
    weaknesses,
  }
}

// ── listPracticeExams ────────────────────────────────────────────────────────

export async function listPracticeExams(
  userId: string,
  courseId?: string,
): Promise<PracticeExamSummary[]> {
  const exams = await prisma.practiceExam.findMany({
    where: {
      userId,
      ...(courseId ? { courseId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      questionCount: true,
      score: true,
      completedAt: true,
      createdAt: true,
      course: { select: { courseCode: true, title: true } },
    },
  })

  return exams.map((e) => ({
    id: e.id,
    title: e.title,
    courseCode: e.course.courseCode,
    courseName: e.course.title,
    questionCount: e.questionCount,
    score: e.score,
    completedAt: e.completedAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
  }))
}

// ── getExamForgeStats (educator view) ───────────────────────────────────────

export interface ExamForgeStatsResponse {
  totalGenerated: number
  totalCompleted: number
  avgScore: number | null
  conceptWeaknesses: { concept: string; avgScore: number; attempts: number }[]
}

export async function getExamForgeStats(courseId: string): Promise<ExamForgeStatsResponse> {
  const exams = await prisma.practiceExam.findMany({
    where: { courseId },
    select: {
      score: true,
      completedAt: true,
      questionResults: true,
      questions: true,
    },
  })

  const totalGenerated = exams.length
  const completed = exams.filter((e) => e.completedAt !== null)
  const totalCompleted = completed.length

  const avgScore =
    totalCompleted > 0
      ? completed.reduce((sum, e) => sum + (e.score ?? 0), 0) / totalCompleted
      : null

  // Aggregate concept scores across all completed exams
  const conceptScores = new Map<string, { total: number; count: number }>()
  for (const exam of completed) {
    const questions = exam.questions as unknown as { id: string; concept: string }[]
    const results = exam.questionResults as unknown as { questionId: string; score: number }[]
    if (!Array.isArray(questions) || !Array.isArray(results)) continue

    for (const q of questions) {
      const result = results.find((r) => r.questionId === q.id)
      if (result) {
        const existing = conceptScores.get(q.concept) ?? { total: 0, count: 0 }
        existing.total += result.score
        existing.count += 1
        conceptScores.set(q.concept, existing)
      }
    }
  }

  const conceptWeaknesses = [...conceptScores.entries()]
    .map(([concept, scores]) => ({
      concept,
      avgScore: Math.round((scores.total / scores.count) * 100) / 100,
      attempts: scores.count,
    }))
    .sort((a, b) => a.avgScore - b.avgScore)

  return { totalGenerated, totalCompleted, avgScore, conceptWeaknesses }
}
