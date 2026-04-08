import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { prisma } from '../../../../../../lib/prisma'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { projectId } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { format?: string }

  const format = body.format ?? 'markdown'
  if (format !== 'markdown') {
    return NextResponse.json({ error: 'Only "markdown" format is supported' }, { status: 400 })
  }

  // Verify project ownership
  const project = await prisma.surveyProject.findUnique({
    where: { id: projectId, creatorId: auth.user.id },
    include: {
      questions: { orderBy: { questionNumber: 'asc' } },
    },
  })
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Export approved responses first; fall back to any drafted/refined
  const exportable = project.questions.filter(
    (q) => q.status === 'approved' || q.status === 'drafted' || q.status === 'refined',
  )

  if (exportable.length === 0) {
    return NextResponse.json({ error: 'No drafted or approved responses to export' }, { status: 400 })
  }

  const lines: string[] = [
    `# ${project.title}`,
    '',
    project.surveyOrg ? `**Organization:** ${project.surveyOrg}` : '',
    `**Exported:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    `**Questions:** ${exportable.length}`,
    '',
    '---',
    '',
  ].filter(Boolean)

  for (const q of exportable) {
    lines.push(`## Question ${q.questionNumber}: ${q.questionText}`)
    lines.push('')
    lines.push(`**Category:** ${q.category} | **Status:** ${q.status}${q.wordLimit ? ` | **Word Limit:** ${q.wordLimit}` : ''}`)
    lines.push('')
    lines.push(q.draftResponse ?? '_No response drafted._')
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  const content = lines.join('\n')

  return NextResponse.json({ content, questionCount: exportable.length })
})
