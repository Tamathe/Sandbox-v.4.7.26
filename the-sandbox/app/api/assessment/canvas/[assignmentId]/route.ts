import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { checkRateLimit } from '../../../../lib/rate-limit';
import {
  getCanvasConfigPayload,
  saveCanvasConfig,
} from '../../../../lib/assessment/assessment-canvas-service';
import { withErrorHandling } from '../../../../lib/api-utils';
import {
  isAuthFailure,
  parseRequestBody,
  requireRequestUser,
} from '../../../../lib/server-auth';
import type { AssessmentCanvasConfig } from '../../../../lib/assessment/types';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function getAssignmentAccess(assignmentId: string) {
  return prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      course: {
        select: {
          instructorId: true,
        },
      },
    },
  });
}

function canManageAssignment(
  user: { id: string; role: string },
  assignment: NonNullable<Awaited<ReturnType<typeof getAssignmentAccess>>>
) {
  return user.role === 'ADMIN' || (user.role === 'EDUCATOR' && assignment.course.instructorId === user.id);
}

function unwrapCanvasConfig(value: unknown): AssessmentCanvasConfig {
  if (isRecord(value) && 'config' in value) {
    return value.config as AssessmentCanvasConfig;
  }

  return value as AssessmentCanvasConfig;
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

    if (!canManageAssignment(auth.user, assignment)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(await getCanvasConfigPayload(assignmentId), {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }
);

export const PUT = withErrorHandling(
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

    if (!canManageAssignment(auth.user, assignment)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = await parseRequestBody(req);
    if ('error' in parsed) return parsed.error;

    return NextResponse.json(
      await saveCanvasConfig(assignmentId, unwrapCanvasConfig(parsed.data))
    );
  }
);
