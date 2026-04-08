import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '../../../lib/rate-limit';
import { withErrorHandling } from '../../../lib/api-utils';
import {
  getPortfolio,
  recomputePortfolio,
} from '../../../lib/assessment/competency-portfolio-service';
import { isAuthFailure, requireRequestUser } from '../../../lib/server-auth';

export const runtime = 'nodejs';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req);
  if (isAuthFailure(auth)) return auth.response;
  const { user } = auth;

  const rateLimitError = await checkRateLimit(req, user.id, 'API');
  if (rateLimitError) return rateLimitError;

  return NextResponse.json(await getPortfolio(user.id), {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req);
  if (isAuthFailure(auth)) return auth.response;
  const { user } = auth;

  const rateLimitError = await checkRateLimit(req, user.id, 'API');
  if (rateLimitError) return rateLimitError;

  const payload = await recomputePortfolio(user.id);
  return NextResponse.json({
    ...payload,
    recomputed: true,
  });
});
