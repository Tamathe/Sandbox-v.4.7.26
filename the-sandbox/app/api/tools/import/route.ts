import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { importPortfolioTool } from '../../../lib/portfolio-import-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { name, shortDescription, fullDescription, externalUrl, category, techStack, repoUrl, thumbnailUrl } = parsed.data as {
    name: string; shortDescription: string; fullDescription?: string; externalUrl: string
    category?: string; techStack?: string[]; repoUrl?: string | null; thumbnailUrl?: string | null
  }

  // Validate required fields
  if (!name || !shortDescription || !externalUrl) {
    return NextResponse.json(
      { error: 'name, shortDescription, and externalUrl are required' },
      { status: 400 }
    )
  }

  // Validate HTTPS
  try {
    const url = new URL(externalUrl)
    if (url.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Only HTTPS URLs are accepted' },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid URL format' },
      { status: 400 }
    )
  }

  // Validate repoUrl if provided
  if (repoUrl) {
    try {
      new URL(repoUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid repository URL format' },
        { status: 400 }
      )
    }
  }

  const result = await importPortfolioTool({
    name,
    shortDescription,
    fullDescription: fullDescription || shortDescription,
    externalUrl,
    category: category || 'General',
    techStack: Array.isArray(techStack) ? techStack : [],
    repoUrl: repoUrl || null,
    thumbnailUrl: thumbnailUrl || null,
    creatorId: auth.user.id,
    creatorRole: auth.user.role,
  })

  return NextResponse.json(result, { status: 201 })
})
