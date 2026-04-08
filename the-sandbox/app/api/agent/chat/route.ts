/**
 * POST /api/agent/chat
 *
 * Sandy Universal Agent chat endpoint.
 * Authenticates the user, runs the agentic loop, and streams
 * typed SSE events back to the client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRequestUser, parseRequestBody, isAuthFailure } from '../../../lib/server-auth';
import { withErrorHandling } from '../../../lib/api-utils';
import { runAgentLoop } from '../../../lib/agent/agent-loop';
import type { AgentChatRequest, AgentUser } from '../../../lib/agent/agent-types';

export const POST = withErrorHandling(async (req: NextRequest) => {
  // 1. Auth
  const auth = await requireRequestUser(req);
  if (isAuthFailure(auth)) return auth.response;
  const { user } = auth;

  // 2. Parse body
  const parsed = await parseRequestBody<AgentChatRequest>(req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
  }

  // 3. Build agent user from DB user
  const agentUser: AgentUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as AgentUser['role'],
    title: user.title,
    isAdvisor: user.isAdvisor,
  };

  // 4. Run agent loop — returns a ReadableStream of SSE events
  const stream = runAgentLoop({
    request: body,
    user: agentUser,
    profileId: body.profileId,
  });

  // 5. Return as SSE stream
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Agent-Session': body.sessionId || 'none',
    },
  });
});
