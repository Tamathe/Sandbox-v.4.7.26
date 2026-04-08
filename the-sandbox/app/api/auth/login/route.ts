import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../lib/prisma'
import { signSessionToken, setSessionCookie } from '../../../lib/auth-jwt'
import { checkRateLimit } from '../../../lib/rate-limit'
import { parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
    // Rate limit: 5 login attempts per minute (by IP)
    const rateLimited = await checkRateLimit(req, null, 'AUTH_LOGIN')
    if (rateLimited) return rateLimited

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const { email, password } = parsed.data as { email?: string; password?: string }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Generic error for both "not found" and "no password" (demo user)
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      )
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      )
    }

    if (user.suspended) {
      return NextResponse.json(
        { error: 'Account suspended', reason: user.suspendedReason },
        { status: 403 },
      )
    }

    const token = await signSessionToken(user.email, user.id)
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        college: user.college,
      },
    })
    setSessionCookie(response.headers, token)
    return response
  })
