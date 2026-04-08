import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../lib/prisma'
import { signSessionToken, setSessionCookie } from '../../../lib/auth-jwt'
import { checkRateLimit } from '../../../lib/rate-limit'
import { parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
    // Rate limit: 3 signup attempts per minute (by IP)
    const rateLimited = await checkRateLimit(req, null, 'AUTH_SIGNUP')
    if (rateLimited) return rateLimited

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const { email, password, name } = parsed.data as {
      email?: string
      password?: string
      name?: string
    }

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 },
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      )
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      )
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name.trim(),
        passwordHash,
        role: 'STUDENT',
      },
    })

    // Sign JWT and set session cookie
    const token = await signSessionToken(user.email, user.id)
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
    setSessionCookie(response.headers, token)
    return response
  })
