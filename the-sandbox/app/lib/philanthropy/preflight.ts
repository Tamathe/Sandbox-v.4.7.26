/**
 * Philanthropy Assistant preflight — user context.
 */

import { prisma } from '../prisma'
import type { PhilanthropyPreflight } from './types'

export async function getPhilanthropyPreflight(
  userId: string,
): Promise<PhilanthropyPreflight> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, role: true, department: true },
  })

  // Count past campaigns stored as ToolSessions for this tool
  const pastCampaignCount = await prisma.toolSession.count({
    where: {
      userId,
      toolId: 'tool-philanthropy-assistant',
    },
  })

  return {
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    },
    pastCampaignCount,
  }
}
