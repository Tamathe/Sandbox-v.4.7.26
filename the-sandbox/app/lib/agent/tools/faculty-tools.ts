import Anthropic from '@anthropic-ai/sdk';
import { differenceInCalendarDays } from 'date-fns';
import { RecommendationStatus } from '../../../generated/prisma';
import type { AgentUser, ToolModule } from '../agent-types';
import { prisma } from '../../prisma';
import {
  getAdviseeList,
  getAdviseeStats,
  type FacultyAdviseeListItem,
} from '../../faculty/advisee-service';
import { getMyActionItems } from '../../faculty/committee-service';
import { getDraft, upsertDraft } from '../../faculty/recommendation-draft-service';

const anthropic = new Anthropic();
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

type RecommendationDraftParams = {
  facultyName: string;
  facultyTitle?: string | null;
  studentName: string;
  purpose: string;
  targetOrg: string;
  facultyNotes?: string | null;
};

function normalize(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function resolveFacultyId(args: Record<string, unknown>, user: AgentUser): string {
  const requestedFacultyId = args.facultyId as string | undefined;
  if (user.role === 'ADMIN' && requestedFacultyId) return requestedFacultyId;
  return user.id;
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

function extractTextContent(response: Anthropic.Message): string {
  return response.content
    .filter(
      (
        block,
      ): block is Anthropic.TextBlock => block.type === 'text',
    )
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

function buildSyntheticDegreeProgress(classStanding: string | null | undefined) {
  const normalizedStanding = classStanding ?? 'Sophomore';
  const standingMap: Record<
    string,
    { completed: number; remaining: number; status: string }
  > = {
    'First-Year': { completed: 24, remaining: 96, status: 'ON_TRACK' },
    Sophomore: { completed: 52, remaining: 68, status: 'ON_TRACK' },
    Junior: { completed: 81, remaining: 39, status: 'ON_TRACK' },
    Senior: { completed: 103, remaining: 17, status: 'ACTION_NEEDED' },
  };

  const baseline = standingMap[normalizedStanding] ?? standingMap['Sophomore'];
  const completionPercentage = Math.round((baseline.completed / 120) * 1000) / 10;

  return {
    _isFallback: true,
    _fallbackReason: 'No degree audit record found. This is estimated from class standing — do NOT present as the student\'s actual transcript.',
    source: 'synthetic',
    overallStatus: baseline.status,
    creditsCompleted: baseline.completed,
    creditsRequired: 120,
    creditsRemaining: baseline.remaining,
    completionPercentage,
    requirementSummary: [
      { category: 'General Education', completed: 30, required: 30, status: 'complete' },
      { category: 'Core Major', completed: Math.min(baseline.completed - 18, 54), required: 54, status: baseline.completed >= 72 ? 'in_progress' : 'not_started' },
      { category: 'Electives', completed: Math.max(Math.min(baseline.completed - 72, 18), 0), required: 18, status: baseline.completed >= 90 ? 'in_progress' : 'not_started' },
      { category: 'Capstone', completed: normalizedStanding === 'Senior' ? 3 : 0, required: 6, status: normalizedStanding === 'Senior' ? 'in_progress' : 'not_started' },
    ],
  };
}

function buildFallbackRecommendationDraft({
  facultyName,
  facultyTitle,
  studentName,
  purpose,
  targetOrg,
  facultyNotes,
}: RecommendationDraftParams): string {
  const signature = facultyTitle ? `${facultyName}, ${facultyTitle}` : facultyName;
  const notesSentence = facultyNotes
    ? ` ${facultyNotes.trim()}`
    : ' They consistently demonstrate strong judgment, follow-through, and thoughtful engagement with complex work.';

  return `To the selection committee,

I am pleased to recommend ${studentName} in support of ${studentName.split(' ')[0]}'s ${purpose.toLowerCase()} application to ${targetOrg}. I have worked with ${studentName.split(' ')[0]} in the context of rigorous faculty-guided academic work and have seen a rare combination of intellectual curiosity, reliability, and maturity.

${studentName.split(' ')[0]} stands out for the way they approach challenging problems with care and initiative.${notesSentence}

Beyond strong academic performance, ${studentName.split(' ')[0]} contributes positively to the broader learning environment. They communicate clearly, respond well to feedback, and elevate the quality of collaborative work around them.

I recommend ${studentName} without hesitation. Please feel free to contact me if additional context would be helpful.

Sincerely,
${signature}`;
}

async function generateRecommendationDraft(
  input: RecommendationDraftParams,
): Promise<{ text: string; isFallback: boolean }> {
  try {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 900,
      system: `You are drafting a polished faculty recommendation letter.

Write in the faculty member's first-person voice.
Keep the letter professional, specific, and warm.
Do not invent fake awards, GPAs, publications, or research experiences.
If details are sparse, stay general rather than hallucinating.
Return only the letter body with a greeting, 3-4 short paragraphs, and a signature block.`,
      messages: [
        {
          role: 'user',
          content: `Faculty name: ${input.facultyName}
Faculty title: ${input.facultyTitle ?? 'Faculty Member'}
Student name: ${input.studentName}
Purpose: ${input.purpose}
Target organization: ${input.targetOrg}
Faculty notes: ${input.facultyNotes ?? 'No additional notes provided.'}`,
        },
      ],
    });

    const text = extractTextContent(response);
    if (text) return { text, isFallback: false };
    return { text: buildFallbackRecommendationDraft(input), isFallback: true };
  } catch {
    return { text: buildFallbackRecommendationDraft(input), isFallback: true };
  }
}

async function resolveStudentEmail(
  facultyId: string,
  studentName: string,
  providedEmail?: string | null,
): Promise<string | null> {
  if (providedEmail) return providedEmail;

  const advisees = await getAdviseeList(facultyId);
  const advisee = advisees.find(
    (candidate) => normalize(candidate.name) === normalize(studentName),
  );
  return advisee?.email ?? null;
}

async function resolveAdvisee(
  facultyId: string,
  args: Record<string, unknown>,
): Promise<FacultyAdviseeListItem | null> {
  const advisees = await getAdviseeList(facultyId);
  const adviseeId = normalize((args.adviseeId as string | undefined) ?? (args.studentId as string | undefined));
  const studentEmail = normalize(args.studentEmail as string | undefined);
  const studentName = normalize(args.studentName as string | undefined);

  if (!adviseeId && !studentEmail && !studentName) return null;

  const exact = advisees.find((advisee) =>
    (adviseeId && normalize(advisee.id) === adviseeId) ||
    (studentEmail && normalize(advisee.email) === studentEmail) ||
    (studentName && normalize(advisee.name) === studentName),
  );
  if (exact) return exact;

  if (studentName) {
    return (
      advisees.find((advisee) => normalize(advisee.name).includes(studentName)) ??
      null
    );
  }

  return null;
}

async function getDegreeProgress(
  studentId: string,
  classStanding: string | null | undefined,
) {
  const audit = await prisma.degreeAuditResult.findFirst({
    where: { studentId },
    orderBy: { auditedAt: 'desc' },
    select: {
      auditedAt: true,
      overallStatus: true,
      percentComplete: true,
      totalCreditsCompleted: true,
      totalCreditsRequired: true,
      requirementResults: true,
      program: {
        select: {
          code: true,
          name: true,
          college: true,
          catalogYear: true,
        },
      },
    },
  });

  if (!audit) return buildSyntheticDegreeProgress(classStanding);

  return {
    source: 'degree-audit',
    auditedAt: audit.auditedAt.toISOString(),
    overallStatus: audit.overallStatus,
    creditsCompleted: audit.totalCreditsCompleted,
    creditsRequired: audit.totalCreditsRequired,
    creditsRemaining: audit.totalCreditsRequired - audit.totalCreditsCompleted,
    completionPercentage: audit.percentComplete,
    program: audit.program,
    requirementSummary: audit.requirementResults,
  };
}

async function getFacultyProfile(facultyId: string, fallbackUser: AgentUser) {
  const faculty = await prisma.user.findUnique({
    where: { id: facultyId },
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      department: true,
      college: true,
    },
  });

  return (
    faculty ?? {
      id: fallbackUser.id,
      name: fallbackUser.name,
      email: fallbackUser.email,
      title: null,
      department: null,
      college: null,
    }
  );
}

async function findExistingRecommendation(
  facultyId: string,
  studentName: string,
  purpose: string,
  targetOrg: string,
  requestId?: string,
) {
  if (requestId) {
    return prisma.recommendationRequest.findFirst({
      where: {
        id: requestId,
        facultyId,
      },
    });
  }

  const candidates = await prisma.recommendationRequest.findMany({
    where: {
      facultyId,
      status: {
        in: [RecommendationStatus.PENDING, RecommendationStatus.IN_PROGRESS],
      },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  });

  return (
    candidates.find((candidate) =>
      normalize(candidate.studentName) === normalize(studentName) &&
      normalize(candidate.purpose) === normalize(purpose) &&
      normalize(candidate.targetOrg) === normalize(targetOrg),
    ) ?? null
  );
}

export const facultyTools: ToolModule = {
  tools: [
    {
      name: 'get_advisee_list',
      description:
        'List advisees for a faculty member, including registration holds, degree-audit-review needs, and the shared registration window.',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      advisorAccess: true,
      input_schema: {
        type: 'object',
        properties: {
          facultyId: {
            type: 'string',
            description: 'Optional faculty user ID. Admins can use this to inspect another faculty member.',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_advisee_detail',
      description:
        'Get a detailed advisee profile with current courses, hold details, and degree-progress context.',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      advisorAccess: true,
      reliability: 'synthetic',
      input_schema: {
        type: 'object',
        properties: {
          facultyId: {
            type: 'string',
            description: 'Optional faculty user ID. Admins can use this to inspect another faculty member.',
          },
          adviseeId: {
            type: 'string',
            description: 'Advisee ID from get_advisee_list. studentId is also accepted.',
          },
          studentId: {
            type: 'string',
            description: 'Alternative to adviseeId: the student user ID.',
          },
          studentEmail: {
            type: 'string',
            description: 'Student email address.',
          },
          studentName: {
            type: 'string',
            description: 'Student full name.',
          },
        },
        required: [],
      },
    },
    {
      name: 'draft_recommendation',
      description:
        'Draft a faculty recommendation letter for a student. If a matching request already exists, Sandy updates the stored draft; if a due date is provided for a new request, Sandy saves it to the faculty dashboard.',
      category: 'academic',
      permission: 'confirm',
      roles: ['EDUCATOR', 'ADMIN'],
      advisorAccess: true,
      reliability: 'synthetic',
      input_schema: {
        type: 'object',
        properties: {
          facultyId: {
            type: 'string',
            description: 'Optional faculty user ID. Admins can use this to draft on behalf of another faculty member.',
          },
          requestId: {
            type: 'string',
            description: 'Optional existing recommendation request ID to update.',
          },
          studentName: {
            type: 'string',
            description: 'Student full name.',
          },
          studentEmail: {
            type: 'string',
            description: 'Optional student email address.',
          },
          purpose: {
            type: 'string',
            description: 'Recommendation purpose, such as "PhD program", "Scholarship", or "Internship".',
          },
          targetOrg: {
            type: 'string',
            description: 'Target organization or program, such as "MIT EECS" or "Google STEP".',
          },
          dueDate: {
            type: 'string',
            description: 'Optional ISO 8601 due date. Include this for new requests so Sandy can save it to the dashboard.',
          },
          facultyNotes: {
            type: 'string',
            description: 'Optional faculty notes, strengths, anecdotes, or framing to include in the draft.',
          },
        },
        required: ['studentName', 'purpose', 'targetOrg'],
      },
    },
    {
      name: 'get_committee_actions',
      description:
        'List committee action items assigned to the faculty member across all committees, including due dates and statuses.',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          facultyId: {
            type: 'string',
            description: 'Optional faculty user ID. Admins can use this to inspect another faculty member.',
          },
        },
        required: [],
      },
    },
    {
      name: 'complete_committee_action',
      description:
        'Mark a committee action item complete after faculty confirmation. Optionally attach a short completion note.',
      category: 'academic',
      permission: 'confirm',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          facultyId: {
            type: 'string',
            description: 'Optional faculty user ID. Admins can use this to complete an action for another faculty member.',
          },
          actionId: {
            type: 'string',
            description: 'Committee action item ID from get_committee_actions.',
          },
          notes: {
            type: 'string',
            description: 'Optional completion note to attach to the action item.',
          },
        },
        required: ['actionId'],
      },
    },
  ],

  handlers: {
    async get_advisee_list(args, user) {
      try {
        const facultyId = resolveFacultyId(args, user);
        const [faculty, stats, advisees] = await Promise.all([
          getFacultyProfile(facultyId, user),
          getAdviseeStats(facultyId),
          getAdviseeList(facultyId),
        ]);

        return {
          faculty: {
            id: faculty.id,
            name: faculty.name,
            email: faculty.email,
            title: faculty.title,
          },
          adviseeCount: stats.total,
          holdsCount: stats.withHolds,
          degreeAuditReviewCount: stats.needsDegreeAudit,
          registrationWindow: stats.registrationWindow,
          advisees: advisees.map((advisee) => ({
            id: advisee.id,
            name: advisee.name,
            email: advisee.email,
            classStanding: advisee.classStanding,
            hasRegistrationHold: advisee.hasRegistrationHold,
            holdReason: advisee.holdReason,
            needsDegreeAuditReview: advisee.needsDegreeAuditReview,
          })),
          message: `${faculty.name} has ${stats.total} advisees, including ${stats.withHolds} with holds and ${stats.needsDegreeAudit} needing degree-audit review.`,
        };
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : 'Failed to fetch advisee list',
          status: 'failed',
        };
      }
    },

    async get_advisee_detail(args, user) {
      try {
        const facultyId = resolveFacultyId(args, user);
        const advisee = await resolveAdvisee(facultyId, args);

        if (!advisee) {
          return {
            error:
              'Advisee not found. Provide adviseeId, studentId, studentEmail, or studentName from get_advisee_list.',
            status: 'failed',
          };
        }

        const student = await prisma.user.findFirst({
          where: {
            OR: [
              { id: advisee.id },
              { email: advisee.email },
              { name: advisee.name },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            college: true,
            program: true,
            catalogYear: true,
            studentProfile: {
              select: {
                riskScore: true,
                learningVelocity: true,
                lastSessionAt: true,
                totalSessionCount: true,
                topConceptsThisWeek: true,
              },
            },
            courseEnrollments: {
              select: {
                enrolledAt: true,
                course: {
                  select: {
                    id: true,
                    courseCode: true,
                    title: true,
                    semester: true,
                    instructor: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
              orderBy: { enrolledAt: 'desc' },
              take: 8,
            },
          },
        });

        const facultyAdvisee = student
          ? await prisma.facultyAdvisee.findFirst({
              where: {
                facultyId,
                studentId: student.id,
              },
              select: {
                notes: true,
                registrationWindowStart: true,
                registrationWindowEnd: true,
              },
            })
          : null;

        const degreeProgress = student
          ? await getDegreeProgress(student.id, advisee.classStanding)
          : buildSyntheticDegreeProgress(advisee.classStanding);

        return {
          advisee: {
            id: student?.id ?? advisee.id,
            name: student?.name ?? advisee.name,
            email: student?.email ?? advisee.email,
            classStanding: advisee.classStanding,
            department: student?.department ?? 'College of Engineering',
            college: student?.college ?? 'College of Engineering',
            program: student?.program ?? 'ENG-BS',
            catalogYear: student?.catalogYear ?? '2024-2025',
            riskScore: student?.studentProfile?.riskScore ?? null,
            learningVelocity: student?.studentProfile?.learningVelocity ?? null,
            lastActive: student?.studentProfile?.lastSessionAt?.toISOString() ?? null,
            totalSessions: student?.studentProfile?.totalSessionCount ?? null,
            topConcepts: student?.studentProfile?.topConceptsThisWeek ?? [],
          },
          holds: {
            hasRegistrationHold: advisee.hasRegistrationHold,
            holdReason: advisee.holdReason,
            needsDegreeAuditReview: advisee.needsDegreeAuditReview,
            registrationWindowStart:
              facultyAdvisee?.registrationWindowStart?.toISOString() ?? null,
            registrationWindowEnd:
              facultyAdvisee?.registrationWindowEnd?.toISOString() ?? null,
            advisorNotes: facultyAdvisee?.notes ?? null,
          },
          courses:
            student?.courseEnrollments.map((enrollment) => ({
              id: enrollment.course.id,
              courseCode: enrollment.course.courseCode,
              title: enrollment.course.title,
              semester: enrollment.course.semester,
              instructor: enrollment.course.instructor?.name ?? null,
              enrolledAt: enrollment.enrolledAt.toISOString(),
            })) ?? [],
          degreeProgress,
          message: `${advisee.name} is ${advisee.hasRegistrationHold ? 'currently on hold' : 'clear to register'}${advisee.needsDegreeAuditReview ? ' and still needs a degree-audit review' : ''}.`,
        };
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : 'Failed to fetch advisee detail',
          status: 'failed',
        };
      }
    },

    async draft_recommendation(args, user) {
      try {
        const facultyId = resolveFacultyId(args, user);
        const studentName = (args.studentName as string).trim();
        const purpose = (args.purpose as string).trim();
        const targetOrg = (args.targetOrg as string).trim();
        const facultyNotes = (args.facultyNotes as string | undefined)?.trim();
        const studentEmail = await resolveStudentEmail(
          facultyId,
          studentName,
          (args.studentEmail as string | undefined) ?? null,
        );
        const faculty = await getFacultyProfile(facultyId, user);
        const existingRequest = await findExistingRecommendation(
          facultyId,
          studentName,
          purpose,
          targetOrg,
          args.requestId as string | undefined,
        );

        const dueDateInput = (args.dueDate as string | undefined)?.trim();
        const parsedDueDate = dueDateInput ? new Date(dueDateInput) : null;
        if (parsedDueDate && !isValidDate(parsedDueDate)) {
          return { error: `Invalid dueDate: ${dueDateInput}`, status: 'failed' };
        }

        // Load existing draft for context injection when resuming
        const existingDraft = existingRequest
          ? await getDraft(existingRequest.id)
          : null;

        const draftResult = await generateRecommendationDraft({
          facultyName: faculty.name,
          facultyTitle: faculty.title,
          studentName,
          purpose,
          targetOrg,
          facultyNotes: existingDraft
            ? `[EXISTING DRAFT v${existingDraft.version} — ${existingDraft.wordCount} words]\n${existingDraft.content}\n\n[FACULTY NOTES]\n${facultyNotes ?? '(none)'}`
            : facultyNotes,
        });
        const draft = draftResult.text;

        let requestId: string | null = existingRequest?.id ?? null;
        let saved = false;

        if (existingRequest) {
          const updated = await prisma.recommendationRequest.update({
            where: { id: existingRequest.id },
            data: {
              status: RecommendationStatus.IN_PROGRESS,
              draftContent: draft,
              notes: facultyNotes ?? existingRequest.notes,
              studentEmail: studentEmail ?? existingRequest.studentEmail,
              dueDate: parsedDueDate ?? existingRequest.dueDate,
            },
          });
          requestId = updated.id;
          saved = true;

          // Save to RecommendationDraft (versioned)
          await upsertDraft(updated.id, draft);
        } else if (parsedDueDate) {
          const created = await prisma.recommendationRequest.create({
            data: {
              facultyId,
              studentName,
              studentEmail,
              purpose,
              targetOrg,
              dueDate: parsedDueDate,
              status: RecommendationStatus.IN_PROGRESS,
              notes: facultyNotes ?? null,
              draftContent: draft,
              source: 'sandy',
            },
          });
          requestId = created.id;
          saved = true;

          // Save initial draft
          await upsertDraft(created.id, draft);
        }

        const effectiveDueDate =
          parsedDueDate?.toISOString() ??
          existingRequest?.dueDate.toISOString() ??
          null;

        return {
          ...(draftResult.isFallback ? {
            _isFallback: true,
            _fallbackReason: 'AI generation failed — this is a generic template letter. Please review and personalize before sending.',
          } : {}),
          status: 'draft_generated',
          saved,
          requestId,
          resumedFromVersion: existingDraft?.version ?? null,
          recommendation: {
            studentName,
            studentEmail,
            purpose,
            targetOrg,
            dueDate: effectiveDueDate,
            daysUntilDue: effectiveDueDate
              ? differenceInCalendarDays(new Date(effectiveDueDate), new Date())
              : null,
            body: draft,
          },
          message: existingDraft
            ? `Resumed and updated draft for ${studentName} (v${existingDraft.version + 1}). Changes saved to your dashboard.`
            : saved
              ? `Recommendation draft for ${studentName} is ready and saved to the faculty dashboard.`
              : `Recommendation draft for ${studentName} is ready. Add a dueDate if you want Sandy to save it as a tracked request.`,
        };
      } catch (err) {
        return {
          error:
            err instanceof Error
              ? err.message
              : 'Failed to draft recommendation letter',
          status: 'failed',
        };
      }
    },

    async get_committee_actions(args, user) {
      try {
        const facultyId = resolveFacultyId(args, user);
        const faculty = await getFacultyProfile(facultyId, user);
        const actions = await getMyActionItems(facultyId);
        const now = new Date();

        return {
          faculty: {
            id: faculty.id,
            name: faculty.name,
            email: faculty.email,
          },
          actionCount: actions.length,
          dueSoonCount: actions.filter((action) => {
            if (!action.dueDate) return false;
            const daysUntilDue = differenceInCalendarDays(
              new Date(action.dueDate),
              now,
            );
            return daysUntilDue >= 0 && daysUntilDue <= 3;
          }).length,
          actions: actions.map((action) => ({
            id: action.id,
            title: action.title,
            committeeName: action.committeeName,
            dueDate: action.dueDate,
            status: action.status,
            daysUntilDue: action.dueDate
              ? differenceInCalendarDays(new Date(action.dueDate), now)
              : null,
          })),
          message:
            actions.length > 0
              ? `${faculty.name} has ${actions.length} open committee action item${actions.length === 1 ? '' : 's'}.`
              : `${faculty.name} has no open committee action items.`,
        };
      } catch (err) {
        return {
          error:
            err instanceof Error
              ? err.message
              : 'Failed to fetch committee actions',
          status: 'failed',
        };
      }
    },

    async complete_committee_action(args, user) {
      try {
        const facultyId = resolveFacultyId(args, user);
        const actionId = args.actionId as string;
        const notes = (args.notes as string | undefined)?.trim();

        const existing = await prisma.committeeActionItem.findFirst({
          where: {
            id: actionId,
            ...(user.role === 'ADMIN'
              ? { ownerUserId: facultyId }
              : { ownerUserId: user.id }),
          },
          include: {
            committee: {
              select: {
                name: true,
              },
            },
          },
        });

        if (existing) {
          if (existing.status === 'completed') {
            return {
              status: 'already_completed',
              action: {
                id: existing.id,
                title: existing.action,
                committeeName: existing.committee.name,
                completedAt:
                  existing.completedAt?.toISOString() ?? null,
              },
              message: `"${existing.action}" was already completed.`,
            };
          }

          const updated = await prisma.committeeActionItem.update({
            where: { id: existing.id },
            data: {
              status: 'completed',
              completedAt: new Date(),
              notes: notes
                ? [existing.notes, notes].filter(Boolean).join('\n\n')
                : existing.notes,
            },
          });

          return {
            status: 'completed',
            simulated: false,
            action: {
              id: updated.id,
              title: updated.action,
              committeeName: existing.committee.name,
              completedAt: updated.completedAt?.toISOString() ?? new Date().toISOString(),
              notes: updated.notes,
            },
            message: `Marked "${updated.action}" complete for ${existing.committee.name}.`,
          };
        }

        const syntheticActions = await getMyActionItems(facultyId);
        const synthetic = syntheticActions.find((action) => action.id === actionId);
        if (synthetic) {
          return {
            status: 'completed',
            simulated: true,
            action: {
              id: synthetic.id,
              title: synthetic.title,
              committeeName: synthetic.committeeName,
              completedAt: new Date().toISOString(),
              notes: notes ?? null,
            },
            message: `Marked "${synthetic.title}" complete for ${synthetic.committeeName} (demo mode).`,
          };
        }

        return {
          error: `Committee action ${actionId} was not found.`,
          status: 'failed',
        };
      } catch (err) {
        return {
          error:
            err instanceof Error
              ? err.message
              : 'Failed to complete committee action',
          status: 'failed',
        };
      }
    },
  },
};
