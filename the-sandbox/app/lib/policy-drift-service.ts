import { prisma } from './prisma'
import { TOS_CONTENT, PRIVACY_CONTENT, FERPA_CONTENT } from './policy-content'

export type PolicyDriftResult = {
  type: 'tos' | 'consent' | 'ferpa'
  driftDetected: boolean
  latestVersionDate: string | null
  summary: string
}

const PAGE_CONTENT: Record<string, string> = {
  tos: TOS_CONTENT,
  consent: PRIVACY_CONTENT,
  ferpa: FERPA_CONTENT,
}

/**
 * For each consent type, compares the latest ConsentVersion.content
 * against the hardcoded page text. Returns drift status per type.
 */
export async function detectPolicyDrift(): Promise<PolicyDriftResult[]> {
  const types = ['tos', 'consent', 'ferpa'] as const
  const results: PolicyDriftResult[] = []

  for (const type of types) {
    const latestVersion = await prisma.consentVersion.findFirst({
      where: { type },
      orderBy: { effectiveAt: 'desc' },
      select: { content: true, effectiveAt: true, version: true },
    })

    if (!latestVersion) {
      results.push({
        type,
        driftDetected: false,
        latestVersionDate: null,
        summary: 'No consent version published yet.',
      })
      continue
    }

    const pageText = PAGE_CONTENT[type] ?? ''
    // Normalize both strings for comparison: trim, collapse whitespace
    const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()
    const versionNorm = normalize(latestVersion.content)
    const pageNorm = normalize(pageText)

    const driftDetected = versionNorm !== pageNorm

    results.push({
      type,
      driftDetected,
      latestVersionDate: latestVersion.effectiveAt.toISOString(),
      summary: driftDetected
        ? `Version ${latestVersion.version} content differs from the current ${type === 'tos' ? '/terms' : type === 'consent' ? '/privacy' : 'FERPA'} page. Update the consent version to match current policy.`
        : `Version ${latestVersion.version} matches the current page content.`,
    })
  }

  return results
}
