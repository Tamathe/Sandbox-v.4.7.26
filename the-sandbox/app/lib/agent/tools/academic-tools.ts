/**
 * Sandy Universal Agent — Academic Tools (P0 + P1)
 *
 * P0 (6): get_courses, get_course_roster, get_course_materials,
 *          get_student_progress, get_at_risk_students, get_course_health
 * P1 (4): create_assignment, grade_submission, generate_study_guide, create_quiz
 *
 * Thin wrappers around existing Prisma queries and services.
 */

import type { ToolModule } from '../agent-types';
import { prisma } from '../../prisma';

export const academicTools: ToolModule = {
  tools: [
    // ── P0 Tools ──────────────────────────────────────────────────
    {
      name: 'get_courses',
      description:
        'List courses for the current user. Educators see courses they teach; students see enrolled courses; admins see all.',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_course_roster',
      description:
        'Get the student roster for a course, including enrollment date and last activity. Returns up to 50 students per call; use offset for pagination.',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'The course ID' },
          limit: { type: 'number', description: 'Max students to return (default 50, max 50)' },
          offset: { type: 'number', description: 'Skip N students for pagination (default 0)' },
        },
        required: ['courseId'],
      },
    },
    {
      name: 'get_course_materials',
      description:
        'Get modules and materials for a course, ordered by module number.',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'The course ID' },
        },
        required: ['courseId'],
      },
    },
    {
      name: 'get_student_progress',
      description:
        'Get detailed progress for a specific student in a course: scores, activity, concepts, risk signals.',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          studentId: { type: 'string', description: 'The student user ID' },
          courseId: {
            type: 'string',
            description: 'Optional course ID to scope progress to a specific course',
          },
        },
        required: ['studentId'],
      },
    },
    {
      name: 'get_at_risk_students',
      description:
        'Get students with elevated risk scores (>= threshold) across courses. Returns students who may need intervention.',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: {
            type: 'string',
            description: 'Optional course ID to filter by a specific course',
          },
          threshold: {
            type: 'number',
            description: 'Risk score threshold (0.0-1.0). Defaults to 0.5.',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_course_health',
      description:
        'Get engagement and health metrics for a course: enrollment count, material count, assignment stats, recent submissions.',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'The course ID' },
        },
        required: ['courseId'],
      },
    },

    // ── P1 Tools ──────────────────────────────────────────────────
    {
      name: 'create_assignment',
      description:
        'Create a new assignment for a course. Specify title, description, due date, points, and category. Sandy will show a preview for your approval before creating it.',
      category: 'academic',
      permission: 'confirm',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'The course ID to create the assignment in' },
          title: { type: 'string', description: 'Assignment title' },
          description: { type: 'string', description: 'Assignment description and instructions' },
          dueAt: { type: 'string', description: 'Due date in ISO 8601 format (e.g. "2026-04-01T23:59:00Z")' },
          pointsPossible: { type: 'number', description: 'Maximum points (default 100)' },
          category: {
            type: 'string',
            description: 'Assignment category: homework, quiz, exam, project, discussion, participation. Defaults to homework.',
          },
        },
        required: ['courseId', 'title', 'description'],
      },
    },
    {
      name: 'grade_submission',
      description:
        'Run AI grading on a student submission. Sandy will show the AI-generated score and feedback for your review before finalizing.',
      category: 'academic',
      permission: 'confirm',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          submissionId: { type: 'string', description: 'The submission ID to grade' },
        },
        required: ['submissionId'],
      },
    },
    {
      name: 'generate_study_guide',
      description:
        'Generate a personalized study guide for a topic or course module. Returns structured review material with key concepts, definitions, and practice questions.',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN'],
      reliability: 'synthetic',
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'The course ID for context' },
          topic: { type: 'string', description: 'The topic or module to generate a study guide for' },
          moduleNumber: { type: 'number', description: 'Optional module number to scope content' },
        },
        required: ['courseId', 'topic'],
      },
    },
    {
      name: 'create_quiz',
      description:
        'Generate quiz questions for a topic at a specified Bloom level. Sandy will show the questions for your approval before saving them.',
      category: 'academic',
      permission: 'confirm',
      roles: ['EDUCATOR', 'ADMIN'],
      reliability: 'synthetic',
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'The course ID' },
          topic: { type: 'string', description: 'Topic to generate questions about' },
          questionCount: { type: 'number', description: 'Number of questions (5-20, default 10)' },
          bloomLevel: {
            type: 'string',
            description: 'Target Bloom taxonomy level: remember, understand, apply, analyze, evaluate, create',
          },
        },
        required: ['courseId', 'topic'],
      },
    },
  ],

  handlers: {
    // ── P0 Handlers ─────────────────────────────────────────────
    async get_courses(_args, user) {
      try {
        const where =
          user.role === 'ADMIN' || user.role === 'REGISTRAR'
            ? {}
            : user.role === 'EDUCATOR'
              ? { instructorId: user.id }
              : {
                  OR: [
                    { isPublic: true },
                    { enrollments: { some: { studentId: user.id } } },
                  ],
                };

        const courses = await prisma.course.findMany({
          where,
          select: {
            id: true,
            courseCode: true,
            title: true,
            semester: true,
            isPublic: true,
            instructor: { select: { name: true, email: true } },
            _count: { select: { enrollments: true, materials: true, assignments: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

        return {
          courses: courses.map((c) => ({
            id: c.id,
            courseCode: c.courseCode,
            title: c.title,
            semester: c.semester,
            instructor: c.instructor?.name ?? 'Unknown',
            enrollmentCount: c._count.enrollments,
            materialCount: c._count.materials,
            assignmentCount: c._count.assignments,
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to fetch courses', status: 'failed' };
      }
    },

    async get_course_roster(args) {
      try {
        const courseId = args.courseId as string;

        const limit = Math.min((args.limit as number) ?? 50, 50);
        const offset = (args.offset as number) ?? 0;

        const [enrollments, totalCount] = await Promise.all([
          prisma.courseEnrollment.findMany({
            where: { courseId },
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  studentProfile: {
                    select: {
                      riskScore: true,
                      lastSessionAt: true,
                      totalSessionCount: true,
                    },
                  },
                },
              },
            },
            orderBy: { enrolledAt: 'desc' },
            take: limit,
            skip: offset,
          }),
          prisma.courseEnrollment.count({ where: { courseId } }),
        ]);

        return {
          courseId,
          studentCount: totalCount,
          showing: enrollments.length,
          hasMore: offset + enrollments.length < totalCount,
          students: enrollments.map((e) => ({
            id: e.student.id,
            name: e.student.name,
            email: e.student.email,
            enrolledAt: e.enrolledAt.toISOString(),
            riskScore: e.student.studentProfile?.riskScore ?? null,
            lastActivity: e.student.studentProfile?.lastSessionAt?.toISOString() ?? null,
            sessionCount: e.student.studentProfile?.totalSessionCount ?? 0,
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to fetch roster', status: 'failed' };
      }
    },

    async get_course_materials(args) {
      try {
        const courseId = args.courseId as string;

        const materials = await prisma.courseMaterial.findMany({
          where: { courseId },
          select: {
            id: true,
            title: true,
            materialType: true,
            moduleNumber: true,
            isVisible: true,
            createdAt: true,
          },
          orderBy: [{ moduleNumber: 'asc' }, { createdAt: 'asc' }],
        });

        return {
          courseId,
          materialCount: materials.length,
          materials: materials.map((m) => ({
            id: m.id,
            title: m.title,
            type: m.materialType,
            module: m.moduleNumber,
            visible: m.isVisible,
            createdAt: m.createdAt.toISOString(),
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to fetch materials', status: 'failed' };
      }
    },

    async get_student_progress(args) {
      try {
        const studentId = args.studentId as string;
        const courseId = args.courseId as string | undefined;

        const student = await prisma.user.findUnique({
          where: { id: studentId },
          select: {
            id: true,
            name: true,
            email: true,
            studentProfile: {
              select: {
                riskScore: true,
                riskUpdatedAt: true,
                learningVelocity: true,
                totalSessionCount: true,
                lastSessionAt: true,
                topConceptsThisWeek: true,
                dominantBloomLevel: true,
                preferredModality: true,
              },
            },
          },
        });

        if (!student) {
          return { error: 'Student not found' };
        }

        const submissionWhere: Record<string, unknown> = { studentId };
        if (courseId) {
          submissionWhere.assignment = { courseId };
        }

        const submissions = await prisma.submission.findMany({
          where: submissionWhere,
          select: {
            id: true,
            submittedAt: true,
            assignment: {
              select: { id: true, title: true, courseId: true, pointsPossible: true },
            },
            gradebookEntry: {
              select: { aiScore: true, facultyScore: true, status: true },
            },
          },
          orderBy: { submittedAt: 'desc' },
          take: 20,
        });

        const profile = student.studentProfile;
        return {
          student: {
            id: student.id,
            name: student.name,
            email: student.email,
          },
          riskScore: profile?.riskScore ?? null,
          learningVelocity: profile?.learningVelocity ?? null,
          totalSessions: profile?.totalSessionCount ?? 0,
          lastActive: profile?.lastSessionAt?.toISOString() ?? null,
          topConcepts: profile?.topConceptsThisWeek ?? [],
          bloomLevel: profile?.dominantBloomLevel ?? null,
          preferredModality: profile?.preferredModality ?? null,
          recentSubmissions: submissions.map((s) => ({
            assignmentTitle: s.assignment.title,
            courseId: s.assignment.courseId,
            submittedAt: s.submittedAt.toISOString(),
            pointsPossible: s.assignment.pointsPossible,
            aiScore: s.gradebookEntry?.aiScore ?? null,
            facultyScore: s.gradebookEntry?.facultyScore ?? null,
            status: s.gradebookEntry?.status ?? 'PENDING',
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to fetch student progress', status: 'failed' };
      }
    },

    async get_at_risk_students(args) {
      try {
        const courseId = args.courseId as string | undefined;
        const threshold = (args.threshold as number) ?? 0.5;

        const profileWhere: Record<string, unknown> = {
          riskScore: { gte: threshold },
        };

        if (courseId) {
          profileWhere.user = {
            courseEnrollments: { some: { courseId } },
          };
        }

        const profiles = await prisma.studentProfile.findMany({
          where: profileWhere,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                courseEnrollments: {
                  select: {
                    course: { select: { id: true, courseCode: true, title: true } },
                  },
                },
              },
            },
          },
          orderBy: { riskScore: 'desc' },
          take: 20,
        });

        return {
          threshold,
          count: profiles.length,
          students: profiles.map((p) => ({
            id: p.user.id,
            name: p.user.name,
            email: p.user.email,
            riskScore: p.riskScore,
            learningVelocity: p.learningVelocity,
            lastActive: p.lastSessionAt?.toISOString() ?? null,
            sessionCount: p.totalSessionCount,
            enrolledCourses: p.user.courseEnrollments.map((e) => ({
              id: e.course.id,
              code: e.course.courseCode,
              title: e.course.title,
            })),
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to fetch at-risk students', status: 'failed' };
      }
    },

    async get_course_health(args) {
      try {
        const courseId = args.courseId as string;

        const course = await prisma.course.findUnique({
          where: { id: courseId },
          select: {
            id: true,
            courseCode: true,
            title: true,
            _count: {
              select: {
                enrollments: true,
                materials: true,
                assignments: true,
              },
            },
          },
        });

        if (!course) {
          return { error: 'Course not found' };
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentSubmissions = await prisma.submission.count({
          where: {
            assignment: { courseId },
            submittedAt: { gte: sevenDaysAgo },
          },
        });

        const atRiskCount = await prisma.studentProfile.count({
          where: {
            riskScore: { gte: 0.5 },
            user: { courseEnrollments: { some: { courseId } } },
          },
        });

        const upcomingAssignments = await prisma.assignment.findMany({
          where: {
            courseId,
            dueAt: { gte: new Date() },
            isPublished: true,
          },
          select: { id: true, title: true, dueAt: true, category: true },
          orderBy: { dueAt: 'asc' },
          take: 5,
        });

        return {
          courseId: course.id,
          courseCode: course.courseCode,
          title: course.title,
          enrollmentCount: course._count.enrollments,
          materialCount: course._count.materials,
          assignmentCount: course._count.assignments,
          recentSubmissions7d: recentSubmissions,
          atRiskStudentCount: atRiskCount,
          upcomingAssignments: upcomingAssignments.map((a) => ({
            id: a.id,
            title: a.title,
            dueAt: a.dueAt?.toISOString() ?? null,
            category: a.category,
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to fetch course health', status: 'failed' };
      }
    },

    // ── P1 Handlers ─────────────────────────────────────────────
    async create_assignment(args, user) {
      try {
        const courseId = args.courseId as string;
        const title = args.title as string;
        const description = args.description as string;
        const dueAt = args.dueAt ? new Date(args.dueAt as string) : null;
        const pointsPossible = (args.pointsPossible as number) ?? 100;
        const category = (args.category as string) ?? 'homework';

        const assignment = await prisma.assignment.create({
          data: {
            courseId,
            title,
            description,
            type: 'LEGACY_SUBMISSION',
            dueAt,
            pointsPossible,
            category,
            isPublished: true,
          },
          select: {
            id: true,
            title: true,
            description: true,
            dueAt: true,
            pointsPossible: true,
            category: true,
            isPublished: true,
          },
        });

        return {
          status: 'created',
          assignment: {
            id: assignment.id,
            title: assignment.title,
            description: assignment.description,
            dueAt: assignment.dueAt?.toISOString() ?? null,
            pointsPossible: assignment.pointsPossible,
            category: assignment.category,
          },
          message: `Assignment "${title}" created successfully with ${pointsPossible} points.`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to create assignment', status: 'failed' };
      }
    },

    async grade_submission(args) {
      try {
        const submissionId = args.submissionId as string;

        const submission = await prisma.submission.findUnique({
          where: { id: submissionId },
          select: {
            id: true,
            student: { select: { name: true } },
            assignment: { select: { title: true, pointsPossible: true, courseId: true } },
            gradebookEntry: { select: { aiScore: true, status: true } },
          },
        });

        if (!submission) {
          return { error: 'Submission not found' };
        }

        // Call grading service
        const { scoreSubmission } = await import('../../grading-service');
        await scoreSubmission(submissionId);

        // Fetch updated grade
        const updated = await prisma.gradebookEntry.findFirst({
          where: { submissionId },
          select: { aiScore: true, aiRawFeedback: true, status: true },
        });

        return {
          status: 'graded',
          submissionId,
          studentName: submission.student.name,
          assignmentTitle: submission.assignment.title,
          pointsPossible: submission.assignment.pointsPossible,
          aiScore: updated?.aiScore ?? null,
          feedback: updated?.aiRawFeedback ?? 'Grading complete — see gradebook for details.',
          message: `AI grading complete for ${submission.student.name}'s "${submission.assignment.title}" submission. Score: ${updated?.aiScore ?? 'N/A'}/${submission.assignment.pointsPossible}. Ready for your review.`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to grade submission', status: 'failed' };
      }
    },

    async generate_study_guide(args) {
      try {
        const courseId = args.courseId as string;
        const topic = args.topic as string;
        const moduleNumber = args.moduleNumber as number | undefined;

        // Fetch course materials for context
        const materialWhere: Record<string, unknown> = { courseId };
        if (moduleNumber !== undefined) {
          materialWhere.moduleNumber = moduleNumber;
        }

        const materials = await prisma.courseMaterial.findMany({
          where: materialWhere,
          select: { title: true, materialType: true, moduleNumber: true },
          orderBy: { moduleNumber: 'asc' },
          take: 10,
        });

        const course = await prisma.course.findUnique({
          where: { id: courseId },
          select: { title: true, courseCode: true },
        });

        // Generate a structured study guide (synthetic for demo)
        return {
          status: 'generated',
          courseCode: course?.courseCode ?? courseId,
          courseTitle: course?.title ?? 'Unknown Course',
          topic,
          studyGuide: {
            title: `Study Guide: ${topic}`,
            keyConcepts: [
              `Core principles of ${topic}`,
              `Key terminology and definitions`,
              `Important frameworks and models`,
              `Real-world applications`,
            ],
            reviewQuestions: [
              `What are the fundamental principles underlying ${topic}?`,
              `How does ${topic} connect to previous topics covered in this course?`,
              `Give an example of how ${topic} applies in a professional context.`,
              `Compare and contrast the major approaches to ${topic}.`,
              `What are common misconceptions about ${topic}?`,
            ],
            relatedMaterials: materials.map((m) => ({
              title: m.title,
              type: m.materialType,
              module: m.moduleNumber,
            })),
            studyTips: [
              'Review key terms before diving into practice problems',
              'Create a concept map connecting related ideas',
              'Teach the material to a peer to test your understanding',
            ],
          },
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to generate study guide', status: 'failed' };
      }
    },

    async create_quiz(args) {
      try {
        const courseId = args.courseId as string;
        const topic = args.topic as string;
        const questionCount = Math.min(Math.max((args.questionCount as number) ?? 10, 5), 20);
        const bloomLevel = (args.bloomLevel as string) ?? 'understand';

        const course = await prisma.course.findUnique({
          where: { id: courseId },
          select: { title: true, courseCode: true },
        });

        // Generate quiz questions (synthetic for demo, structured for approval card)
        const questions = Array.from({ length: questionCount }, (_, i) => ({
          number: i + 1,
          bloomLevel,
          question: `[${bloomLevel.charAt(0).toUpperCase() + bloomLevel.slice(1)}] Question ${i + 1} about ${topic} in ${course?.courseCode ?? courseId}`,
          options: [
            { label: 'A', text: `Option A for question ${i + 1}` },
            { label: 'B', text: `Option B for question ${i + 1}` },
            { label: 'C', text: `Option C for question ${i + 1}` },
            { label: 'D', text: `Option D for question ${i + 1}` },
          ],
          correctAnswer: 'A',
          explanation: `Explanation for why A is correct for question ${i + 1} about ${topic}.`,
        }));

        return {
          status: 'preview',
          courseCode: course?.courseCode ?? courseId,
          courseTitle: course?.title ?? 'Unknown Course',
          topic,
          bloomLevel,
          questionCount: questions.length,
          questions,
          message: `Generated ${questions.length} ${bloomLevel}-level questions about "${topic}". Review and approve to save to the course.`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to create quiz', status: 'failed' };
      }
    },
  },
};
