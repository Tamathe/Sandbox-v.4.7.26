/**
 * Reputation Pulse preflight — user context only.
 */

import { prisma } from '../../prisma'
import type { ReputationPulsePreflight } from './types'

export async function getReputationPulsePreflight(userId: string): Promise<ReputationPulsePreflight> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, role: true },
  })

  return {
    user: { name: user.name, email: user.email, role: user.role },
  }
}
