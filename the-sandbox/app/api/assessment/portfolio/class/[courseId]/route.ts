import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '../../../../../lib/rate-limit';
import { withErrorHandling } from '../../../../../lib/api-utils';
import { getClassCompetencyDistribution } from '../../../../../lib/assessment/competency-portfolio-service';
import { isAuthFailure, requireCourseOwner } from '../../../../../lib/server-auth';

export const runtime = 'nodejs';

export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) => {
    const { courseId } = await params;
    const auth = await requireCourseOwner(req, courseId);
    if (isAuthFailure(auth)) return auth.response;
    const { user } = auth;

    const rateLimitError = await checkRateLimit(req, user.id, 'API');
    if (rateLimitError) return rateLimitError;

    return NextResponse.json(await getClassCompetencyDistribution(courseId), {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  }
);
