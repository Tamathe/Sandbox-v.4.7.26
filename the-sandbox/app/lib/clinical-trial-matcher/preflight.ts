// ─── Clinical Trial Matcher Preflight ─────────────────────────────────────────

import { prisma } from '../prisma'
import type { MatcherPreflight } from './types'

export async function getClinicalTrialMatcherPreflight(userId: string): Promise<MatcherPreflight> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, role: true },
  })

  return {
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
    },
  }
}
