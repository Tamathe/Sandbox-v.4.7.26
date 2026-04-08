import { NextRequest, NextResponse } from 'next/server'
import { buildPlaygroundExportZip, sanitizeExportName } from '../../../lib/playground-export'
import { handlePlaygroundError, requireDemoUser } from '../../../lib/playground-storage'

export async function POST(request: NextRequest) {
  try {
    await requireDemoUser(request)

    const body = (await request.json()) as { code?: string; appName?: string }
    const code = body.code?.trim() ?? ''
    const appName = body.appName?.trim() ?? 'my-sandbox-app'

    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 })
    }

    const zipBuffer = await buildPlaygroundExportZip(appName, code)

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${sanitizeExportName(appName)}.zip"`,
      },
    })
  } catch (error) {
    return handlePlaygroundError(error, 'POST /api/playground/export error:')
  }
}
