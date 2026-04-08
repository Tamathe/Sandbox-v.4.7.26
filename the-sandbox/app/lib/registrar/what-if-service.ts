import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import { getSISAdapter } from '../sis'
import type { DegreeAuditResultPayload, RequirementAuditResult } from './types'

// ── Transfer Map ──────────────────────────────────────────────────────────

export interface TransferMapEntry {
  courseCode: string
  courseName: string
  credits: number
  grade: string
  currentCategory: string
  targetCategory: string | null
  transfers: boolean
}

export interface TransferMapSummary {
  entries: TransferMapEntry[]
  creditsTransfer: number
  creditsLost: number
  creditsNeeded: number
  targetTotalCredits: number
}

/**
 * Compares two audit results to determine which completed courses from
 * the current program count toward the target program.
 */
export function buildTransferMap(
  currentAudit: DegreeAuditResultPayload,
  targetAudit: DegreeAuditResultPayload,
  targetTotalCredits: number,
): TransferMapSummary {
  // Build lookup: courseCode → category for target program
  const targetSatisfying = new Map<string, string>()
  for (const req of targetAudit.requirementResults) {
    for (const course of req.satisfyingCourses) {
      const code = course.split(' (')[0].trim().toUpperCase()
      targetSatisfying.set(code, req.category)
    }
  }

  const entries: TransferMapEntry[] = []
  let creditsTransfer = 0
  let creditsLost = 0

  // Check each satisfying course in the current audit
  for (const req of currentAudit.requirementResults) {
    for (const courseStr of req.satisfyingCourses) {
      const code = courseStr.split(' (')[0].trim().toUpperCase()
      const gradeMatch = courseStr.match(/\(([^)]+)\)/)
      const grade = gradeMatch?.[1] ?? ''

      // Avoid duplicates (same course might satisfy multiple requirements)
      if (entries.some((e) => e.courseCode.toUpperCase() === code)) continue

      const targetCat = targetSatisfying.get(code) ?? null
      const transfers = targetCat !== null

      // Estimate credits from the grade context or default to 3
      const credits = 3 // We don't have credits in the satisfying string; use 3 as safe default

      entries.push({
        courseCode: code,
        courseName: code, // Will be enriched by the UI if needed
        credits,
        grade,
        currentCategory: req.category,
        targetCategory: targetCat,
        transfers,
      })

      if (transfers) {
        creditsTransfer += credits
      } else {
        creditsLost += credits
      }
    }
  }

  const creditsNeeded = Math.max(0, targetTotalCredits - creditsTransfer)

  return { entries, creditsTransfer, creditsLost, creditsNeeded, targetTotalCredits }
}

// ── Timeline Estimation ──────────────────────────────────────────────────

export interface PrereqChain {
  courses: string[]
  semestersRequired: number
}

export interface TimelineEstimate {
  program: string
  programName: string
  creditsCompleted: number
  creditsRemaining: number
  estimatedSemesters: number
  estimatedGraduation: string
  bottleneck: string | null
  prerequisiteChains: PrereqChain[]
}

export interface TimelineComparison {
  current: TimelineEstimate
  target: TimelineEstimate
  deltaSemesters: number
  deltaCredits: number
  recommendation: string
}

function advanceSemester(startSemester: string, startYear: number, count: number): string {
  const semesters = ['Spring', 'Summer', 'Fall']
  // Determine current semester index
  let semIdx = semesters.indexOf(startSemester)
  if (semIdx === -1) semIdx = 2 // default to Fall

  let year = startYear
  for (let i = 0; i < count; i++) {
    semIdx++
    if (semIdx >= semesters.length) {
      semIdx = 0
      year++
    }
  }
  return `${semesters[semIdx]} ${year}`
}

/**
 * Finds prerequisite chains among missing courses to detect bottlenecks.
 * Uses the CatalogCourse.prerequisitesRaw field for basic chain detection.
 */
async function findPrerequisiteChains(missingCodes: string[]): Promise<PrereqChain[]> {
  if (missingCodes.length === 0) return []

  const missing = new Set(missingCodes.map((c) => c.toUpperCase()))
  const courses = await prisma.catalogCourse.findMany({
    where: { courseCode: { in: missingCodes, mode: 'insensitive' } },
    select: { courseCode: true, prerequisitesRaw: true },
  })

  // Build adjacency: course → its prerequisites (that are also missing)
  const prereqMap = new Map<string, string[]>()
  for (const c of courses) {
    const code = c.courseCode.toUpperCase()
    const prereqs: string[] = []
    if (c.prerequisitesRaw) {
      // Extract course codes from prerequisitesRaw (e.g., "CS 101 and MA 113")
      const matches = c.prerequisitesRaw.match(/[A-Z]{2,4}\s+\d{3}/gi) ?? []
      for (const m of matches) {
        if (missing.has(m.toUpperCase())) {
          prereqs.push(m.toUpperCase())
        }
      }
    }
    prereqMap.set(code, prereqs)
  }

  // Find longest chain via DFS from each node
  const chains: PrereqChain[] = []
  const visited = new Set<string>()

  function dfs(code: string, path: string[]): string[] {
    if (visited.has(code)) return path
    visited.add(code)
    const prereqs = prereqMap.get(code) ?? []
    let longest = path
    for (const p of prereqs) {
      const result = dfs(p, [p, ...path])
      if (result.length > longest.length) longest = result
    }
    visited.delete(code)
    return longest
  }

  for (const code of missing) {
    const chain = dfs(code, [code])
    if (chain.length >= 2) {
      chains.push({ courses: chain, semestersRequired: chain.length })
    }
  }

  // Deduplicate: keep only chains that aren't subsets of longer chains
  chains.sort((a, b) => b.semestersRequired - a.semestersRequired)
  const unique: PrereqChain[] = []
  for (const chain of chains) {
    const key = chain.courses.join('→')
    const isSubset = unique.some((u) => u.courses.join('→').includes(key))
    if (!isSubset) unique.push(chain)
  }

  return unique.slice(0, 5) // Top 5 chains
}

export async function estimateTimeline(
  programCode: string,
  programName: string,
  auditResult: DegreeAuditResultPayload,
  totalCreditsRequired: number,
): Promise<TimelineEstimate> {
  // Count credits that actually apply to this program
  const creditsCompleted = auditResult.requirementResults.reduce(
    (sum, r) => sum + r.creditsCompleted,
    0,
  )
  const creditsRemaining = Math.max(0, totalCreditsRequired - creditsCompleted)

  // Base estimate: 15 credits/semester (standard full-time load)
  const baseSemesters = Math.ceil(creditsRemaining / 15)

  // Find bottleneck prerequisite chains
  const missingCodes = auditResult.requirementResults
    .flatMap((r) => r.missingSuggestions)
    .map((s) => s.split(' — ')[0].trim())
    .filter(Boolean)
  const chains = await findPrerequisiteChains(missingCodes)
  const longestChain = chains[0] ?? null

  // Timeline = max(credit-based, chain-based)
  const chainSemesters = longestChain?.semestersRequired ?? 0
  const estimatedSemesters = Math.max(baseSemesters, chainSemesters)

  // Calculate graduation semester
  const now = new Date()
  const month = now.getMonth()
  const currentSemester = month < 5 ? 'Spring' : month < 8 ? 'Summer' : 'Fall'
  const currentYear = now.getFullYear()
  const estimatedGraduation = estimatedSemesters === 0
    ? `${currentSemester} ${currentYear}`
    : advanceSemester(currentSemester, currentYear, estimatedSemesters)

  const bottleneck = longestChain
    ? `${longestChain.courses.join(' → ')} (${longestChain.semestersRequired}-course chain)`
    : null

  return {
    program: programCode,
    programName,
    creditsCompleted,
    creditsRemaining,
    estimatedSemesters,
    estimatedGraduation,
    bottleneck,
    prerequisiteChains: chains,
  }
}

export async function compareTimelines(
  studentId: string,
  currentAudit: DegreeAuditResultPayload,
  targetAudit: DegreeAuditResultPayload,
  currentProgram: { code: string; name: string; totalCredits: number },
  targetProgram: { code: string; name: string; totalCredits: number },
): Promise<TimelineComparison> {
  const [current, target] = await Promise.all([
    estimateTimeline(currentProgram.code, currentProgram.name, currentAudit, currentProgram.totalCredits),
    estimateTimeline(targetProgram.code, targetProgram.name, targetAudit, targetProgram.totalCredits),
  ])

  const deltaSemesters = target.estimatedSemesters - current.estimatedSemesters
  const deltaCredits = target.creditsRemaining - current.creditsRemaining

  const recommendation = await generateWhatIfRecommendation(
    { current, target, deltaSemesters, deltaCredits },
    buildTransferMap(currentAudit, targetAudit, targetProgram.totalCredits),
  )

  return { current, target, deltaSemesters, deltaCredits, recommendation }
}

// ── AI Recommendation ────────────────────────────────────────────────────

export async function generateWhatIfRecommendation(
  comparison: Omit<TimelineComparison, 'recommendation'>,
  transferMap: TransferMapSummary,
): Promise<string> {
  const prompt = `A student is exploring switching from ${comparison.current.programName} to ${comparison.target.programName}.

Key facts:
- Credits that transfer: ${transferMap.creditsTransfer}
- Credits lost: ${transferMap.creditsLost}
- New credits needed: ${transferMap.creditsNeeded}
- Current program: ${comparison.current.estimatedSemesters} semesters remaining
- Target program: ${comparison.target.estimatedSemesters} semesters remaining
- Delta: ${comparison.deltaSemesters > 0 ? '+' : ''}${comparison.deltaSemesters} semesters
- Bottleneck: ${comparison.target.bottleneck ?? 'none detected'}

Write exactly ONE sentence (max 40 words) of honest, actionable advice. Be warm but direct. Focus on the single most important factor (bottleneck, credit loss, or timeline). Do NOT say "consult your advisor" — they already know that.`

  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 128,
      messages: [{ role: 'user', content: prompt }],
    })
    return msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : ''
  } catch {
    // Fallback recommendation
    if (comparison.deltaSemesters > 2) {
      return `Switching adds ${comparison.deltaSemesters} semesters — the prerequisite chain is the main factor, not just credits.`
    }
    if (comparison.deltaSemesters <= 0) {
      return `Your credits transfer well — switching may not add any time to your degree.`
    }
    return `This switch adds about ${comparison.deltaSemesters} semester${comparison.deltaSemesters === 1 ? '' : 's'} — mostly from courses you haven't started yet.`
  }
}
