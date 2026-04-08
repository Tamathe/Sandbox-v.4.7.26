/**
 * Sandy Universal Agent — Analytics & Reporting Tools (P1)
 *
 * 5 tools: run_cohort_analysis, generate_report, get_engagement_trends, get_bloom_distribution, get_faculty_intelligence
 *
 * Wraps existing Prisma analytics queries and course health data.
 */

import type { ToolModule } from '../agent-types';
import { prisma } from '../../prisma';
import { getAssignmentScorecard } from '../../analytics/rubric-breakdown-service';
import { getFacultyActions } from '../../analytics/action-panel-service';

export const analyticsTools: ToolModule = {
  tools: [
    {
      name: 'run_cohort_analysis',
      description:
        'Analyze a group of students by filters (course, risk level, engagement). Returns aggregate stats and distribution breakdowns.',
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course ID to scope the cohort' },
          riskThreshold: {
            type: 'number',
            description: 'Only include students with risk >= this value (0.0-1.0)',
          },
          minSessions: {
            type: 'number',
            description: 'Only include students with at least this many sessions',
          },
        },
        required: ['courseId'],
      },
    },
    {
      name: 'generate_report',
      description:
        'Create a formatted analytics report for a course or set of courses. Returns key metrics, trends, and recommendations.',
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course ID to report on' },
          reportType: {
            type: 'string',
            description: 'Type of report: "engagement", "grades", "at-risk", "comprehensive". Defaults to "comprehensive".',
          },
        },
        required: ['courseId'],
      },
    },
    {
      name: 'get_engagement_trends',
      description:
        'Get engagement metrics over time for a course: daily/weekly submission counts, active students, session trends.',
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course ID' },
          days: { type: 'number', description: 'Number of days to look back (default 30)' },
        },
        required: ['courseId'],
      },
    },
    {
      name: 'get_bloom_distribution',
      description:
        'Get the Bloom\'s taxonomy level distribution for students in a course. Shows what cognitive levels students are operating at (remember, understand, apply, analyze, evaluate, create).',
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course ID' },
        },
        required: ['courseId'],
      },
    },
    {
      name: 'get_faculty_intelligence',
      description:
        'Get a combined faculty intelligence summary: latest morning briefing (highlights + concerns), top action items (submissions to review, at-risk students, low scores), and assignment scorecard summary. Use this to give faculty a quick overview of their course health on any page.',
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: {
            type: 'string',
            description: 'Optional course ID to scope intelligence to a single course. Omit for all courses.',
          },
        },
        required: [],
      },
    },
  ],

  handlers: {
    async run_cohort_analysis(args) {
      try {
        const courseId = args.courseId as string;
        const riskThreshold = args.riskThreshold as number | undefined;
        const minSessions = args.minSessions as number | undefined;

        // Get enrolled students with profiles
        const enrollments = await prisma.courseEnrollment.findMany({
          where: { courseId },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                studentProfile: {
                  select: {
                    riskScore: true,
                    learningVelocity: true,
                    totalSessionCount: true,
                    dominantBloomLevel: true,
                    preferredModality: true,
                  },
                },
              },
            },
          },
        });

        let students = enrollments.map((e) => ({
          id: e.student.id,
          name: e.student.name,
          riskScore: e.student.studentProfile?.riskScore ?? 0,
          velocity: e.student.studentProfile?.learningVelocity ?? 0,
          sessions: e.student.studentProfile?.totalSessionCount ?? 0,
          bloomLevel: e.student.studentProfile?.dominantBloomLevel ?? 'remember',
          modality: e.student.studentProfile?.preferredModality ?? 'text',
        }));

        // Apply filters
        if (riskThreshold !== undefined) {
          students = students.filter((s) => s.riskScore >= riskThreshold);
        }
        if (minSessions !== undefined) {
          students = students.filter((s) => s.sessions >= minSessions);
        }

        // Compute aggregates
        const riskScores = students.map((s) => s.riskScore);
        const avgRisk = riskScores.length ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length : 0;

        const bloomCounts: Record<string, number> = {};
        for (const s of students) {
          bloomCounts[s.bloomLevel] = (bloomCounts[s.bloomLevel] ?? 0) + 1;
        }

        const modalityCounts: Record<string, number> = {};
        for (const s of students) {
          modalityCounts[s.modality] = (modalityCounts[s.modality] ?? 0) + 1;
        }

        return {
          courseId,
          cohortSize: students.length,
          totalEnrolled: enrollments.length,
          filters: { riskThreshold, minSessions },
          aggregates: {
            averageRiskScore: Math.round(avgRisk * 100) / 100,
            averageSessions: students.length
              ? Math.round(students.reduce((a, s) => a + s.sessions, 0) / students.length)
              : 0,
            atRiskCount: students.filter((s) => s.riskScore >= 0.5).length,
          },
          bloomDistribution: bloomCounts,
          modalityDistribution: modalityCounts,
          students: students.slice(0, 20).map((s) => ({
            id: s.id,
            name: s.name,
            riskScore: s.riskScore,
            sessions: s.sessions,
            bloomLevel: s.bloomLevel,
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to run cohort analysis', status: 'failed' };
      }
    },

    async generate_report(args) {
      try {
        const courseId = args.courseId as string;
        const reportType = (args.reportType as string) ?? 'comprehensive';

        const course = await prisma.course.findUnique({
          where: { id: courseId },
          select: {
            id: true,
            courseCode: true,
            title: true,
            _count: { select: { enrollments: true, materials: true, assignments: true } },
          },
        });

        if (!course) {
          return { error: 'Course not found' };
        }

        // Submission stats (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentSubmissions = await prisma.submission.count({
          where: { assignment: { courseId }, submittedAt: { gte: thirtyDaysAgo } },
        });

        const totalSubmissions = await prisma.submission.count({
          where: { assignment: { courseId } },
        });

        // At-risk count
        const atRiskCount = await prisma.studentProfile.count({
          where: {
            riskScore: { gte: 0.5 },
            user: { courseEnrollments: { some: { courseId } } },
          },
        });

        // Graded entries
        const gradedCount = await prisma.gradebookEntry.count({
          where: { submission: { assignment: { courseId } }, status: 'APPROVED' },
        });

        return {
          reportType,
          generatedAt: new Date().toISOString(),
          course: {
            courseCode: course.courseCode,
            title: course.title,
          },
          metrics: {
            enrollmentCount: course._count.enrollments,
            materialCount: course._count.materials,
            assignmentCount: course._count.assignments,
            totalSubmissions,
            recentSubmissions30d: recentSubmissions,
            gradedSubmissions: gradedCount,
            atRiskStudents: atRiskCount,
            submissionRate: course._count.enrollments && course._count.assignments
              ? Math.round((totalSubmissions / (course._count.enrollments * course._count.assignments)) * 100)
              : 0,
          },
          recommendations: [
            atRiskCount > 0 ? `${atRiskCount} student(s) flagged at-risk — consider targeted check-ins` : null,
            recentSubmissions < course._count.enrollments ? 'Submission activity below expected — consider a reminder or engagement activity' : null,
            course._count.materials < 3 ? 'Consider adding more course materials to support student learning' : null,
          ].filter(Boolean),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to generate report', status: 'failed' };
      }
    },

    async get_engagement_trends(args) {
      try {
        const courseId = args.courseId as string;
        const days = (args.days as number) ?? 30;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get daily submission counts (capped at 500 to avoid context bloat)
        const submissions = await prisma.submission.findMany({
          where: {
            assignment: { courseId },
            submittedAt: { gte: startDate },
          },
          select: { submittedAt: true },
          orderBy: { submittedAt: 'asc' },
          take: 500,
        });

        // Bucket by day
        const dailyCounts: Record<string, number> = {};
        for (const s of submissions) {
          const day = s.submittedAt.toISOString().split('T')[0];
          dailyCounts[day] = (dailyCounts[day] ?? 0) + 1;
        }

        // Active student count (unique submitters in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentSubmitters = await prisma.submission.findMany({
          where: {
            assignment: { courseId },
            submittedAt: { gte: sevenDaysAgo },
          },
          select: { studentId: true },
          distinct: ['studentId'],
        });

        const enrollmentCount = await prisma.courseEnrollment.count({
          where: { courseId },
        });

        return {
          courseId,
          period: { days, start: startDate.toISOString() },
          dailySubmissions: Object.entries(dailyCounts).map(([date, count]) => ({
            date,
            submissions: count,
          })),
          weeklyActiveStudents: recentSubmitters.length,
          totalEnrolled: enrollmentCount,
          engagementRate: enrollmentCount
            ? Math.round((recentSubmitters.length / enrollmentCount) * 100)
            : 0,
          trend: submissions.length > 0
            ? 'Active — submissions received in the last ' + days + ' days'
            : 'Low activity — no submissions in the last ' + days + ' days',
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to fetch engagement trends', status: 'failed' };
      }
    },

    async get_bloom_distribution(args) {
      try {
        const courseId = args.courseId as string;

        // Get student profiles for enrolled students (select only what's needed for aggregation)
        const profiles = await prisma.studentProfile.findMany({
          where: {
            user: { courseEnrollments: { some: { courseId } } },
          },
          select: {
            dominantBloomLevel: true,
          },
          take: 200,
        });

        const bloomLevels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
        const distribution: Record<string, number> = {};
        for (const level of bloomLevels) {
          distribution[level] = 0;
        }

        for (const p of profiles) {
          const level = String(p.dominantBloomLevel ?? 'remember').toLowerCase();
          distribution[level] = (distribution[level] ?? 0) + 1;
        }

        const total = profiles.length;
        const percentages: Record<string, number> = {};
        for (const [level, count] of Object.entries(distribution)) {
          percentages[level] = total ? Math.round((count / total) * 100) : 0;
        }

        // Find the dominant level across the class
        let classBloomLevel = 'remember';
        let maxCount = 0;
        for (const [level, count] of Object.entries(distribution)) {
          if (count > maxCount) {
            maxCount = count;
            classBloomLevel = level;
          }
        }

        return {
          courseId,
          studentCount: total,
          distribution,
          percentages,
          classBloomLevel,
          insight: total > 0
            ? `Most students (${percentages[classBloomLevel]}%) are operating at the "${classBloomLevel}" level. ${
                bloomLevels.indexOf(classBloomLevel) < 3
                  ? 'Consider activities that push toward higher-order thinking (analyze, evaluate, create).'
                  : 'Strong higher-order thinking present — class is ready for complex synthesis tasks.'
              }`
            : 'No student profile data available for Bloom analysis.',
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to fetch Bloom distribution', status: 'failed' };
      }
    },

    async get_faculty_intelligence(args, user) {
      try {
        const courseId = args.courseId as string | undefined;
        const userId = user.id;

        // Fetch briefing, actions, and scorecard in parallel
        const [briefing, actions, scorecardData] = await Promise.all([
          // Latest non-stale briefing
          prisma.facultyBriefing.findFirst({
            where: { userId, stale: false, ...(courseId ? { courseId } : {}) },
            orderBy: { generatedAt: 'desc' },
          }),

          // Action items
          getFacultyActions(userId, courseId),

          // Scorecard (need courseIds first, capped at 5 courses)
          (async () => {
            const courses = await prisma.course.findMany({
              where: courseId ? { id: courseId } : { instructorId: userId },
              select: { id: true, title: true },
              take: 5,
            });
            const scorecards = await Promise.all(
              courses.map(async (c) => ({
                courseId: c.id,
                courseTitle: c.title,
                assignments: await getAssignmentScorecard(c.id),
              })),
            );
            return scorecards;
          })(),
        ]);

        // Parse briefing JSON
        const briefingData = briefing?.briefingJson as {
          highlights?: string[];
          concerns?: string[];
          actionItems?: { label: string; type: string; priority: string }[];
          stats?: { label: string; value: string; delta?: string }[];
        } | null;

        // Filter scorecard to low-composite assignments only
        const lowScoringAssignments = scorecardData.flatMap((sc) =>
          sc.assignments
            .filter((a) => a.avgComposite !== null && a.avgComposite < 0.5)
            .map((a) => ({
              courseTitle: sc.courseTitle,
              assignmentTitle: a.title,
              avgComposite: a.avgComposite,
              submissionCount: a.submissionCount,
            })),
        );

        return {
          briefing: briefingData
            ? {
                highlights: briefingData.highlights ?? [],
                concerns: briefingData.concerns ?? [],
                generatedAt: briefing!.generatedAt.toISOString(),
              }
            : null,
          topActions: actions.slice(0, 3).map((a) => ({
            type: a.type,
            priority: a.priority,
            label: a.label,
            description: a.description,
          })),
          totalActionCount: actions.length,
          lowScoringAssignments,
          needsBriefingRefresh: !briefing || briefing.stale,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to fetch faculty intelligence', status: 'failed' };
      }
    },
  },
};
