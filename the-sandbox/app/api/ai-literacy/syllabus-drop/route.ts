import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import {
  extractAssignmentsFromSyllabus,
  bulkScanAssignments,
  generateComprehensivePolicy,
  processSyllabusDrop,
} from '../../../lib/ai-literacy/syllabus-drop-service'
import type { ExtractedAssignment, BulkScanResult } from '../../../lib/ai-literacy/syllabus-drop-service'
import type { AIStance, DisciplineFamily } from '../../../generated/prisma'

// POST — process syllabus: extract → scan → generate policy
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { syllabusText: string; stance?: AIStance; courseName?: string; disciplineFamily?: DisciplineFamily; action?: string; assignments?: ExtractedAssignment[]; scanResults?: BulkScanResult[] }
  const { syllabusText, stance, courseName, disciplineFamily, action } = body

  if (!syllabusText || syllabusText.trim().length < 50) {
    return NextResponse.json({ error: 'Syllabus text must be at least 50 characters' }, { status: 400 })
  }

  const validStances: AIStance[] = ['PROHIBIT', 'CAUTIOUS', 'GUIDED', 'INTEGRATE', 'REQUIRE']
  const resolvedStance: AIStance = (stance && validStances.includes(stance)) ? stance : 'GUIDED'

  // Step-by-step mode: extract only
  if (action === 'extract') {
    const assignments = await extractAssignmentsFromSyllabus(syllabusText)
    return NextResponse.json({ assignments })
  }

  // Step-by-step mode: scan provided assignments
  if (action === 'scan' && body.assignments) {
    const scanResults = await bulkScanAssignments(body.assignments)
    return NextResponse.json({ scanResults })
  }

  // Step-by-step mode: generate policy from existing scan results (no re-extraction)
  if (action === 'generate-policy' && body.scanResults) {
    const policy = await generateComprehensivePolicy(
      resolvedStance,
      courseName ?? 'Untitled Course',
      body.scanResults,
      disciplineFamily,
    )
    return NextResponse.json({ policy })
  }

  // Full pipeline (one-shot)
  const result = await processSyllabusDrop(
    syllabusText,
    resolvedStance,
    courseName ?? 'Untitled Course',
    disciplineFamily,
  )

  return NextResponse.json(result)
})
