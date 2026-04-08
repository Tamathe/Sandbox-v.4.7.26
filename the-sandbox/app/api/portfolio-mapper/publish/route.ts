import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { publishPortfolio, unpublishPortfolio } from '../../../lib/portfolio-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const { portfolioId } = parsed.data as { portfolioId: string }

    const result = await publishPortfolio(portfolioId, auth.user.id)
    return NextResponse.json(result)
  })

export const DELETE = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const { portfolioId } = parsed.data as { portfolioId: string }

    await unpublishPortfolio(portfolioId, auth.user.id)
    return NextResponse.json({ unpublished: true })
  })
