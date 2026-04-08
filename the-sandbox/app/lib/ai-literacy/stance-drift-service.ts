/**
 * Stance Drift — tracks how faculty stances evolve over time.
 * Surfaces institutional change narrative from StanceHistory data.
 */

import { prisma } from '../prisma'
import type { AIStance } from '../../generated/prisma'

export interface StanceMovement {
  from: AIStance
  to: AIStance
  count: number
}

export interface StanceDriftData {
  /** Monthly stance counts: { month: "2026-03", stances: { PROHIBIT: 2, ... } } */
  monthly: {
    month: string
    stances: Record<string, number>
  }[]
  /** Directional movements: how many moved from X → Y */
  movements: StanceMovement[]
  /** Net direction: positive = toward integration, negative = toward prohibition */
  netDirection: number
  /** Narrative summary */
  narrative: string
  totalChanges: number
}

const STANCE_ORDER: AIStance[] = ['PROHIBIT', 'CAUTIOUS', 'GUIDED', 'INTEGRATE', 'REQUIRE']

function stanceIndex(s: AIStance): number {
  return STANCE_ORDER.indexOf(s)
}

export async function getStanceDriftData(months = 6): Promise<StanceDriftData> {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)

  const history = await prisma.stanceHistory.findMany({
    where: { createdAt: { gte: cutoff } },
    select: {
      previousStance: true,
      newStance: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // Monthly breakdown: count new stances per month
  const monthMap = new Map<string, Record<string, number>>()
  for (const h of history) {
    const month = h.createdAt.toISOString().slice(0, 7) // "2026-03"
    if (!monthMap.has(month)) {
      monthMap.set(month, { PROHIBIT: 0, CAUTIOUS: 0, GUIDED: 0, INTEGRATE: 0, REQUIRE: 0 })
    }
    const m = monthMap.get(month)!
    m[h.newStance] = (m[h.newStance] ?? 0) + 1
  }

  const monthly = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, stances]) => ({ month, stances }))

  // Movement vectors (only for reassessments, not first-time)
  const movementMap = new Map<string, number>()
  let netDirection = 0
  const changesOnly = history.filter(h => h.previousStance !== null)

  for (const h of changesOnly) {
    if (!h.previousStance) continue
    const key = `${h.previousStance}->${h.newStance}`
    movementMap.set(key, (movementMap.get(key) ?? 0) + 1)
    netDirection += stanceIndex(h.newStance) - stanceIndex(h.previousStance)
  }

  const movements: StanceMovement[] = Array.from(movementMap.entries())
    .map(([key, count]) => {
      const [from, to] = key.split('->') as [AIStance, AIStance]
      return { from, to, count }
    })
    .sort((a, b) => b.count - a.count)

  // Narrative
  const totalChanges = changesOnly.length
  let narrative: string
  if (totalChanges === 0) {
    narrative = 'No stance changes recorded yet. As more faculty reassess, drift patterns will emerge.'
  } else if (netDirection > 0) {
    const pct = Math.round((movements.filter(m => stanceIndex(m.to) > stanceIndex(m.from)).reduce((s, m) => s + m.count, 0) / totalChanges) * 100)
    narrative = `${pct}% of faculty who changed stances moved toward greater AI integration. ${totalChanges} total stance change${totalChanges === 1 ? '' : 's'} in the last ${months} months.`
  } else if (netDirection < 0) {
    const pct = Math.round((movements.filter(m => stanceIndex(m.to) < stanceIndex(m.from)).reduce((s, m) => s + m.count, 0) / totalChanges) * 100)
    narrative = `${pct}% of faculty who changed stances moved toward more caution. ${totalChanges} total stance change${totalChanges === 1 ? '' : 's'} in the last ${months} months.`
  } else {
    narrative = `Faculty stance changes are balanced — equal movement in both directions. ${totalChanges} total change${totalChanges === 1 ? '' : 's'} in the last ${months} months.`
  }

  return { monthly, movements, netDirection, narrative, totalChanges }
}

export async function getDepartmentDrift(departmentName: string, months = 6): Promise<StanceDriftData> {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)

  // Get user IDs in this department
  const users = await prisma.user.findMany({
    where: { department: departmentName },
    select: { id: true },
  })
  const userIds = users.map(u => u.id)

  if (userIds.length === 0) {
    return {
      monthly: [],
      movements: [],
      netDirection: 0,
      narrative: `No faculty found in ${departmentName}.`,
      totalChanges: 0,
    }
  }

  const history = await prisma.stanceHistory.findMany({
    where: { userId: { in: userIds }, createdAt: { gte: cutoff } },
    select: { previousStance: true, newStance: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  // Reuse same logic — build monthly + movements
  const monthMap = new Map<string, Record<string, number>>()
  const movementMap = new Map<string, number>()
  let netDirection = 0
  let totalChanges = 0

  for (const h of history) {
    const month = h.createdAt.toISOString().slice(0, 7)
    if (!monthMap.has(month)) {
      monthMap.set(month, { PROHIBIT: 0, CAUTIOUS: 0, GUIDED: 0, INTEGRATE: 0, REQUIRE: 0 })
    }
    monthMap.get(month)![h.newStance]++

    if (h.previousStance) {
      const key = `${h.previousStance}->${h.newStance}`
      movementMap.set(key, (movementMap.get(key) ?? 0) + 1)
      netDirection += stanceIndex(h.newStance) - stanceIndex(h.previousStance)
      totalChanges++
    }
  }

  const monthly = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, stances]) => ({ month, stances }))

  const movements: StanceMovement[] = Array.from(movementMap.entries())
    .map(([key, count]) => {
      const [from, to] = key.split('->') as [AIStance, AIStance]
      return { from, to, count }
    })
    .sort((a, b) => b.count - a.count)

  const narrative = totalChanges === 0
    ? `No stance changes in ${departmentName} during this period.`
    : `${totalChanges} stance change${totalChanges === 1 ? '' : 's'} in ${departmentName}. Net trend: ${netDirection > 0 ? 'toward integration' : netDirection < 0 ? 'toward caution' : 'balanced'}.`

  return { monthly, movements, netDirection, narrative, totalChanges }
}
