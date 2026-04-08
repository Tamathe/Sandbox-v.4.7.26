/**
 * Sandy Universal Agent — MEI (Mastery Efficiency Index) Tools
 *
 * 1 tool: get_mei_score
 *
 * Provides Sandy with awareness of MEI scores for tool assessment assignments.
 * Educators see class aggregates; students see their own score + trajectory.
 */

import type { ToolModule } from '../agent-types';
import { prisma } from '../../../lib/prisma';
import { generateMEIFeedback } from '../../../lib/mei-scoring-service';

const dimensionDescriptions = {
  durationTrend:
    'Measures how much faster the student completes sessions over time (30% weight)',
  scoreTrend:
    'Measures score improvement across sessions via linear regression (25% weight)',
  hintIndependence:
    'Measures reduction in hint usage — lower hints = higher independence (15% weight)',
  reformulationDecline:
    'Measures reduction in question rephrasing — fewer reformulations = better understanding (15% weight)',
  bloomCeiling:
    'Highest Bloom\'s Taxonomy level reached, from Remember (1) to Create (6) (15% weight)',
};

export const meiTools: ToolModule = {
  tools: [
    {
      name: 'get_mei_score',
      description:
        'Get Mastery Efficiency Index scores for a tool assessment assignment. Educators see class summary + optional specific student. Students see their own score + trajectory.',
      category: 'analytics',
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          assignmentId: {
            type: 'string',
            description: 'The assignment ID for the tool assessment',
          },
          studentId: {
            type: 'string',
            description:
              'Optional student ID to get a specific student\'s score (educator/admin only)',
          },
        },
        required: ['assignmentId'],
      },
    },
  ],

  handlers: {
    async get_mei_score(args, user) {
      try {
        const assignmentId = args.assignmentId as string;
        const studentId = args.studentId as string | undefined;

        // Load assignment and verify type
        const assignment = await prisma.assignment.findUnique({
          where: { id: assignmentId },
          select: {
            id: true,
            title: true,
            type: true,
            courseId: true,
            assessmentToolIds: true,
            minimumAttempts: true,
            createdAt: true,
            assessmentWindowEnd: true,
            course: { select: { instructorId: true, courseCode: true } },
          },
        });

        if (!assignment) {
          return { error: 'Assignment not found' };
        }

        if (assignment.type !== 'TOOL_ASSESSMENT') {
          return { error: 'This assignment is not a tool assessment — MEI scores only apply to TOOL_ASSESSMENT assignments' };
        }

        const isFaculty =
          user.role === 'ADMIN' ||
          (user.role === 'EDUCATOR' && user.id === assignment.course.instructorId);

        // ── Educator / Admin view ─────────────────────────────────────────
        if (isFaculty) {
          // Class aggregates
          const allScores = await prisma.masteryEfficiencyScore.findMany({
            where: { assignmentId },
            include: { student: { select: { id: true, name: true } } },
            orderBy: { meiScore: 'desc' },
          });

          const totalStudents = await prisma.courseEnrollment.count({
            where: { courseId: assignment.courseId },
          });

          const meiValues = allScores.map((s) => s.meiScore);
          const sorted = [...meiValues].sort((a, b) => a - b);
          const median =
            sorted.length === 0
              ? null
              : sorted.length % 2 === 1
                ? sorted[Math.floor(sorted.length / 2)]
                : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;

          const avg = (arr: number[]) =>
            arr.length === 0 ? null : Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;

          const classAggregates = {
            totalStudents,
            scoredStudents: allScores.length,
            avgMeiScore: avg(meiValues),
            medianMeiScore: median,
            avgDurationTrend: avg(allScores.map((s) => s.durationTrend)),
            avgScoreTrend: avg(allScores.map((s) => s.scoreTrend)),
            avgHintIndependence: avg(allScores.map((s) => s.hintIndependence)),
            avgReformulationDecline: avg(allScores.map((s) => s.reformulationDecline)),
            avgBloomCeiling: avg(allScores.map((s) => s.bloomCeiling)),
          };

          // If a specific student is requested
          if (studentId) {
            const studentScore = await prisma.masteryEfficiencyScore.findUnique({
              where: { assignmentId_studentId: { assignmentId, studentId } },
              include: { student: { select: { name: true } } },
            });

            if (!studentScore) {
              // Check if student is enrolled and has sessions
              const enrollment = await prisma.courseEnrollment.findFirst({
                where: { courseId: assignment.courseId, studentId },
              });

              if (!enrollment) {
                return { error: 'Student is not enrolled in this course' };
              }

              const sessionCount = await prisma.toolSession.count({
                where: {
                  userId: studentId,
                  toolId: { in: assignment.assessmentToolIds },
                  courseId: assignment.courseId,
                  score: { gte: 0.3 },
                  exitReason: 'completed',
                },
              });

              return {
                assignmentTitle: assignment.title,
                courseCode: assignment.course.courseCode,
                student: { id: studentId, scored: false },
                sessionsCompleted: sessionCount,
                minimumAttempts: assignment.minimumAttempts ?? 3,
                message: `This student has ${sessionCount}/${assignment.minimumAttempts ?? 3} qualifying sessions — not yet enough for MEI scoring.`,
                classAggregates,
                dimensionDescriptions,
              };
            }

            const dimensions = {
              durationTrend: studentScore.durationTrend,
              scoreTrend: studentScore.scoreTrend,
              hintIndependence: studentScore.hintIndependence,
              reformulationDecline: studentScore.reformulationDecline,
              bloomCeiling: studentScore.bloomCeiling,
            };

            const feedback = generateMEIFeedback(dimensions, studentScore.sessionsAnalyzed);

            return {
              assignmentTitle: assignment.title,
              courseCode: assignment.course.courseCode,
              student: {
                id: studentId,
                name: studentScore.student.name,
                scored: true,
                meiScore: studentScore.meiScore,
                dimensions,
                sessionsAnalyzed: studentScore.sessionsAnalyzed,
                computedAt: studentScore.computedAt.toISOString(),
                feedback,
              },
              classAggregates,
              dimensionDescriptions,
            };
          }

          // No specific student — return class summary
          return {
            assignmentTitle: assignment.title,
            courseCode: assignment.course.courseCode,
            classAggregates,
            topStudents: allScores.slice(0, 5).map((s) => ({
              name: s.student.name,
              meiScore: s.meiScore,
              sessionsAnalyzed: s.sessionsAnalyzed,
            })),
            dimensionDescriptions,
          };
        }

        // ── Student view ──────────────────────────────────────────────────
        if (user.role === 'STUDENT') {
          const meiScore = await prisma.masteryEfficiencyScore.findUnique({
            where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
          });

          const windowStart = assignment.createdAt;
          const windowEnd = assignment.assessmentWindowEnd ?? new Date();

          const sessions = await prisma.toolSession.findMany({
            where: {
              userId: user.id,
              toolId: { in: assignment.assessmentToolIds },
              courseId: assignment.courseId,
              startedAt: { gte: windowStart, lte: windowEnd },
              score: { gte: 0.3 },
              exitReason: 'completed',
              durationSeconds: { not: null },
            },
            orderBy: { startedAt: 'asc' },
            select: {
              startedAt: true,
              score: true,
              durationSeconds: true,
            },
          });

          const minimumAttempts = assignment.minimumAttempts ?? 3;

          if (!meiScore) {
            return {
              assignmentTitle: assignment.title,
              courseCode: assignment.course.courseCode,
              scored: false,
              sessionsCompleted: sessions.length,
              minimumAttempts,
              message: sessions.length < minimumAttempts
                ? `You have ${sessions.length}/${minimumAttempts} qualifying sessions. Complete ${minimumAttempts - sessions.length} more to get your MEI score.`
                : 'Your MEI score is being computed — check back soon.',
              trajectory: sessions.map((s) => ({
                date: s.startedAt.toISOString(),
                score: s.score,
                durationSeconds: s.durationSeconds,
              })),
              dimensionDescriptions,
            };
          }

          const dimensions = {
            durationTrend: meiScore.durationTrend,
            scoreTrend: meiScore.scoreTrend,
            hintIndependence: meiScore.hintIndependence,
            reformulationDecline: meiScore.reformulationDecline,
            bloomCeiling: meiScore.bloomCeiling,
          };

          const feedback = generateMEIFeedback(dimensions, meiScore.sessionsAnalyzed);

          return {
            assignmentTitle: assignment.title,
            courseCode: assignment.course.courseCode,
            scored: true,
            meiScore: meiScore.meiScore,
            dimensions,
            sessionsAnalyzed: meiScore.sessionsAnalyzed,
            sessionsCompleted: sessions.length,
            minimumAttempts,
            computedAt: meiScore.computedAt.toISOString(),
            feedback,
            trajectory: sessions.map((s) => ({
              date: s.startedAt.toISOString(),
              score: s.score,
              durationSeconds: s.durationSeconds,
            })),
            dimensionDescriptions,
          };
        }

        return { error: 'Access denied — only students, educators, and admins can view MEI scores' };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to fetch MEI score', status: 'failed' };
      }
    },
  },
};
