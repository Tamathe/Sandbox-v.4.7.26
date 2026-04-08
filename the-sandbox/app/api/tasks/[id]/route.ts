import { NextRequest, NextResponse } from 'next/server';
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth';
import { withErrorHandling } from '../../../lib/api-utils';
import { updateTask, deleteTask } from '../../../lib/task-service';

export const PATCH = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req);
  if (isAuthFailure(auth)) return auth.response;

  const { id } = await context.params;
  const parsed = await parseRequestBody(req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data as {
    title?: string;
    description?: string | null;
    priority?: string;
    status?: string;
    dueDate?: string | null;
    tags?: string[];
  };

  const task = await updateTask(id, auth.user.id, {
    title: body.title,
    description: body.description,
    priority: body.priority,
    status: body.status,
    dueDate: body.dueDate,
    tags: body.tags,
  });

  return NextResponse.json({ task });
});

export const DELETE = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req);
  if (isAuthFailure(auth)) return auth.response;

  const { id } = await context.params;
  await deleteTask(id, auth.user.id);

  return NextResponse.json({ ok: true });
});
