// POST /api/onboarding/set-intent
// Stores the user's onboarding intent and returns the correct redirect URL.
// Can be called standalone (for returning users) or as part of signup flow.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser, isAuthFailure, invalidateUserCache, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

// ─── Redirect URL map ─────────────────────────────────────────────────────────

type IntentRoutingMap = Record<string, (courseId?: string | null, toolQuery?: string | null) => string>

const EDUCATOR_ROUTES: IntentRoutingMap = {
  'course-tools': (courseId) =>
    courseId ? `/tools?intent=course&courseId=${courseId}` : '/tools?intent=course',
  'browse':       () => '/tools?section=educational',
  'referred':     (_, q) => q ? `/tools?q=${encodeURIComponent(q)}` : '/tools',
  'explore':      () => '/tools?view=featured',
  'overview':     () => '/admin',
  'tool-review':  () => '/admin',
}

const STUDENT_ROUTES: IntentRoutingMap = {
  'assignment': () => '/tools?intent=assignment',
  'browse':     () => '/tools?section=educational',
  'referred':   (_, q) => q ? `/tools?q=${encodeURIComponent(q)}` : '/tools',
  'explore':    () => '/tools?view=featured',
}

const ADMIN_ROUTES: IntentRoutingMap = {
  'overview':    () => '/admin',
  'tool-review': () => '/admin',
  'browse':      () => '/tools',
}

// Sandy auto-prompts fired on first page load after routing
const INTENT_SANDY_PROMPTS: Record<string, string> = {
  'course-tools': "I just set up my account and I teach a course. Can you suggest tools that would work well for my class?",
  'assignment':   "I just joined the University of Kentucky platform. I have an assignment I'm working on — can you help me find the right tool?",
  'explore':      "I just joined the University of Kentucky platform. Show me something interesting — what's popular right now?",
  'referred':     "I'm looking for a specific tool that was recommended to me. Can you help me search for it?",
  'browse':       "I just joined the University of Kentucky platform. Give me a quick overview of what kinds of tools are available.",
  'overview':     "I just joined as an admin. Give me a quick tour of the platform.",
}

function getRedirectUrl(
  role: string,
  intent: string,
  courseId?: string | null,
  toolQuery?: string | null,
): string {
  const map =
    role === 'EDUCATOR' ? EDUCATOR_ROUTES
    : role === 'STUDENT' ? STUDENT_ROUTES
    : role === 'ADMIN'   ? ADMIN_ROUTES
    : {}

  const fn = map[intent]
  if (fn) return fn(courseId, toolQuery)
  return '/'
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { intent, courseId, toolQuery } = parsed.data as {
    intent:    string
    courseId?: string | null
    toolQuery?: string | null
  }

  if (!intent) {
    return NextResponse.json({ error: 'intent is required' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data:  {
      onboardingIntent:      intent,
      onboardingIntentSetAt: new Date(),
    },
  })
  invalidateUserCache(user.email)

  const redirectUrl = getRedirectUrl(user.role, intent, courseId, toolQuery)
  const sandyPrompt = INTENT_SANDY_PROMPTS[intent] ?? null

  return NextResponse.json({ redirectUrl, sandyPrompt })
})
