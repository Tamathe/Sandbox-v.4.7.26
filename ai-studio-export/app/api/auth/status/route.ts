import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail } from '../../../lib/server-auth'

export async function GET(req: NextRequest) {
  try {
    const email = req.headers.get('x-demo-user-email')
    if (!email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        suspended: user.suspended,
        suspendedReason: user.suspendedReason,
      },
    })
  } catch (error) {
    console.error('GET /api/auth/status error:', error)
    return NextResponse.json({ error: 'Failed to fetch auth status' }, { status: 500 })
  }
}
