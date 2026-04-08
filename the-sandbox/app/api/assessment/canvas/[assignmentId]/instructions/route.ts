import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { checkRateLimit } from '../../../../../lib/rate-limit';
import { getCanvasInstructionsPayload } from '../../../../../lib/assessment/assessment-canvas-service';
import { withErrorHandling } from '../../../../../lib/api-utils';
import {
  isAuthFailure,
  requireRequestUser,
} from '../../../../../lib/server-auth';

export const runtime = 'nodejs';

async function getAssignmentAccess(assignmentId: string) {
  return prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      isPublished: true,
      courseId: true,
      course: {
        select: {
          instructorId: true,
        },
      },
    },
  });
}

async function canStudentViewInstructions(userId: string, courseId: string) {
  const enrollment = await prisma.courseEnrollment.findFirst({
    where: {
      courseId,
      studentId: userId,
    },
    select: { id: true },
  });

  return Boolean(enrollment);
}

function canManageAssignment(
  user: { id: string; role: string },
  assignment: NonNullable<Awaited<ReturnType<typeof getAssignmentAccess>>>
) {
  return user.role === 'ADMIN' || (user.role === 'EDUCATOR' && assignment.course.instructorId === user.id);
}

export const GET = withErrorHandling(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ assignmentId: string }> }
  ) => {
    const auth = await requireRequestUser(req);
    if (isAuthFailure(auth)) return auth.response;

    const rateLimitError = await checkRateLimit(req, auth.user.id, 'API');
    if (rateLimitError) return rateLimitError;

    const { assignmentId } = await params;
    const assignment = await getAssignmentAccess(assignmentId);
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const facultyAccess = canManageAssignment(auth.user, assignment);
    const studentAccess =
      auth.user.role === 'STUDENT' &&
      assignment.isPublished &&
      (await canStudentViewInstructions(auth.user.id, assignment.courseId));

    if (!facultyAccess && !studentAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(await getCanvasInstructionsPayload(assignmentId), {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }
);
