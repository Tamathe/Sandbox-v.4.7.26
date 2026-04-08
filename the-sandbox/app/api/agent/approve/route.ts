/**
 * POST /api/agent/approve
 *
 * Resolves a pending approval request from the agent loop.
 * The client sends the approval ID and decision (approved/rejected/edited).
 * The agent loop is paused awaiting this resolution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth';
import { getApprovalManager } from '../../../lib/agent/agent-loop';
import type { ApprovalDecision } from '../../../lib/agent/agent-types';
import { withErrorHandling } from '../../../lib/api-utils'

interface ApproveBody {
  sessionId: string;
  approvalId: string;
  decision: ApprovalDecision;
  editedArgs?: Record<string, unknown>;
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  // 1. Auth
  const auth = await requireRequestUser(req);
  if (isAuthFailure(auth)) return auth.response;

  // 2. Parse body
  const parsed = await parseRequestBody(req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data as ApproveBody;

  if (!body.sessionId || !body.approvalId || !body.decision) {
    return NextResponse.json(
      { error: 'sessionId, approvalId, and decision are required' },
      { status: 400 },
    );
  }

  const validDecisions: ApprovalDecision[] = ['approved', 'rejected', 'edited'];
  if (!validDecisions.includes(body.decision)) {
    return NextResponse.json(
      { error: `decision must be one of: ${validDecisions.join(', ')}` },
      { status: 400 },
    );
  }

  // 3. Resolve the approval
  const manager = getApprovalManager(body.sessionId);
  const resolved = manager.resolve(body.approvalId, body.decision);

  if (!resolved) {
    return NextResponse.json(
      { error: 'No pending approval found with that ID (may have timed out)' },
      { status: 404 },
    );
  }

  // 4. Return success
  return NextResponse.json({
    status: 'resolved',
    approvalId: body.approvalId,
    decision: body.decision,
  });
})
