import { NextRequest, NextResponse } from 'next/server'
import {
  getPlaygroundAppRole,
  handlePlaygroundError,
  requireDemoUser,
  signPlaygroundStorageToken,
} from '../../../lib/playground-storage'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const appId = searchParams.get('appId')?.trim() ?? ''

    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 })
    }

    const user = await requireDemoUser(request)
    const role = await getPlaygroundAppRole(appId, user)
    const token = signPlaygroundStorageToken({
      userId: user.id,
      email: user.email,
      appId,
      role,
    })

    return NextResponse.json({ token, expiresIn: 3600 })
  } catch (error) {
    return handlePlaygroundError(error, 'GET /api/playground/token error:')
  }
}
