import { NextRequest, NextResponse } from 'next/server';
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth';
import { withErrorHandling } from '../../../lib/api-utils';
import { bulkUpdateTaskStatus } from '../../../lib/task-service';

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req);
  if (isAuthFailure(auth)) return auth.response;

  const parsed = await parseRequestBody(req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data as { ids?: string[]; status?: string };
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
  }
  if (!body.status || typeof body.status !== 'string') {
    return NextResponse.json({ error: 'status is required' }, { status: 400 });
  }

  const result = await bulkUpdateTaskStatus(body.ids, body.status, auth.user.id);
  return NextResponse.json(result);
});
