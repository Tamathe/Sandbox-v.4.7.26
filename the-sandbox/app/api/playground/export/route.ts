import { NextRequest, NextResponse } from 'next/server'
import { buildPlaygroundExportZip, sanitizeExportName } from '../../../lib/playground-export'
import { requireDemoUser } from '../../../lib/playground-storage'
import { parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (request: NextRequest) => {
  await requireDemoUser(request)

  const parsed = await parseRequestBody<{ code?: string; appName?: string }>(request)
  if ('error' in parsed) return parsed.error
  const code = parsed.data.code?.trim() ?? ''
  const appName = parsed.data.appName?.trim() ?? 'my-sandbox-app'

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
})
