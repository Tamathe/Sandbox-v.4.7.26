import { NextRequest, NextResponse } from 'next/server';
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../lib/server-auth';
import { withErrorHandling } from '../../lib/api-utils';
import { createTask, listTasks } from '../../lib/task-service';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req);
  if (isAuthFailure(auth)) return auth.response;

  const url = req.nextUrl;
  const filters = {
    status: url.searchParams.get('status') ?? undefined,
    priority: url.searchParams.get('priority') ?? undefined,
    tags: url.searchParams.get('tags') ?? undefined,
    dueBefore: url.searchParams.get('dueBefore') ?? undefined,
    dueAfter: url.searchParams.get('dueAfter') ?? undefined,
  };

  const tasks = await listTasks(auth.user.id, filters);
  return NextResponse.json({ tasks }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req);
  if (isAuthFailure(auth)) return auth.response;

  const parsed = await parseRequestBody(req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data as {
    title?: string;
    description?: string;
    priority?: string;
    dueDate?: string | null;
    tags?: string[];
    source?: string;
    sourceId?: string;
  };
  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const task = await createTask({
    userId: auth.user.id,
    title: body.title.trim(),
    description: body.description,
    priority: body.priority,
    dueDate: body.dueDate,
    tags: body.tags,
    source: body.source,
    sourceId: body.sourceId,
  });

  return NextResponse.json({ task }, { status: 201 });
});
