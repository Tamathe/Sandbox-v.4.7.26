import { NextRequest, NextResponse } from 'next/server'
import { requireStudentUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) => {
    const auth = await requireStudentUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const { examId } = await params

    const exam = await prisma.practiceExam.findUnique({
      where: { id: examId },
      include: {
        course: { select: { courseCode: true, title: true } },
      },
    })

    if (!exam || exam.userId !== user.id) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    // If not completed, strip answers from questions
    const questions = exam.questions as unknown as Array<Record<string, unknown>>
    const sanitizedQuestions = exam.completedAt
      ? questions
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      : questions.map(({ correctAnswer, explanation, ...rest }) => rest)

    return NextResponse.json({
      id: exam.id,
      courseId: exam.courseId,
      title: exam.title,
      courseCode: exam.course.courseCode,
      courseName: exam.course.title,
      questionCount: exam.questionCount,
      estimatedMinutes: exam.estimatedMinutes,
      bloomDistribution: exam.bloomDistribution,
      conceptsTargeted: exam.conceptsTargeted,
      questions: sanitizedQuestions,
      score: exam.score,
      questionResults: exam.questionResults,
      startedAt: exam.startedAt?.toISOString() ?? null,
      completedAt: exam.completedAt?.toISOString() ?? null,
      createdAt: exam.createdAt.toISOString(),
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
