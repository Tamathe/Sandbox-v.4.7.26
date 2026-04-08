import { prisma } from './prisma'

export type ComplianceBreakdown = {
  tos: number
  consent: number
  ferpa: number
  categories: number
  recency: number
}

export type ComplianceScoreResult = {
  score: number
  breakdown: ComplianceBreakdown
}

const VALID_CATEGORIES = ['analytics', 'ai-personalization', 'email-communications']

export async function computeComplianceScore(userId: string): Promise<ComplianceScoreResult> {
  const [user, consentCategories] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        tosAcceptedAt: true,
        dataConsentAt: true,
        ferpaAckAt: true,
      },
    }),
    prisma.userConsentCategory.findMany({
      where: { userId },
      select: { category: true, revokedAt: true, consentedAt: true },
    }),
  ])

  if (!user) return { score: 0, breakdown: { tos: 0, consent: 0, ferpa: 0, categories: 0, recency: 0 } }

  // TOS: 25 pts
  const tos = user.tosAcceptedAt ? 25 : 0

  // Data consent: 25 pts
  const consent = user.dataConsentAt ? 25 : 0

  // FERPA: 20 pts (auto-grant for non-educators)
  const isEducatorOrAdmin = user.role === 'EDUCATOR' || user.role === 'ADMIN'
  const ferpa = isEducatorOrAdmin ? (user.ferpaAckAt ? 20 : 0) : 20

  // Consent categories: 5 pts per category (max 15)
  const activeCategories = consentCategories.filter(
    (c) => VALID_CATEGORIES.includes(c.category) && !c.revokedAt,
  )
  const categories = Math.min(activeCategories.length * 5, 15)

  // Recency: 15 pts if all within 365 days, 10 if within 730, 5 otherwise
  const now = Date.now()
  const DAY_MS = 86_400_000
  const acceptanceDates: number[] = []
  if (user.tosAcceptedAt) acceptanceDates.push(user.tosAcceptedAt.getTime())
  if (user.dataConsentAt) acceptanceDates.push(user.dataConsentAt.getTime())
  if (isEducatorOrAdmin && user.ferpaAckAt) acceptanceDates.push(user.ferpaAckAt.getTime())

  let recency = 5
  if (acceptanceDates.length > 0) {
    const oldestAge = now - Math.min(...acceptanceDates)
    if (oldestAge <= 365 * DAY_MS) recency = 15
    else if (oldestAge <= 730 * DAY_MS) recency = 10
  }

  const score = tos + consent + ferpa + categories + recency

  return { score, breakdown: { tos, consent, ferpa, categories, recency } }
}

export async function computeAllComplianceScores(): Promise<Record<string, number>> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      role: true,
      tosAcceptedAt: true,
      dataConsentAt: true,
      ferpaAckAt: true,
      consentCategories: {
        select: { category: true, revokedAt: true },
      },
    },
  })

  const now = Date.now()
  const DAY_MS = 86_400_000
  const scores: Record<string, number> = {}

  for (const user of users) {
    const tos = user.tosAcceptedAt ? 25 : 0
    const consent = user.dataConsentAt ? 25 : 0
    const isEdu = user.role === 'EDUCATOR' || user.role === 'ADMIN'
    const ferpa = isEdu ? (user.ferpaAckAt ? 20 : 0) : 20

    const activeCats = user.consentCategories.filter(
      (c) => VALID_CATEGORIES.includes(c.category) && !c.revokedAt,
    )
    const categories = Math.min(activeCats.length * 5, 15)

    const dates: number[] = []
    if (user.tosAcceptedAt) dates.push(user.tosAcceptedAt.getTime())
    if (user.dataConsentAt) dates.push(user.dataConsentAt.getTime())
    if (isEdu && user.ferpaAckAt) dates.push(user.ferpaAckAt.getTime())

    let recency = 5
    if (dates.length > 0) {
      const oldest = now - Math.min(...dates)
      if (oldest <= 365 * DAY_MS) recency = 15
      else if (oldest <= 730 * DAY_MS) recency = 10
    }

    scores[user.id] = tos + consent + ferpa + categories + recency
  }

  return scores
}
