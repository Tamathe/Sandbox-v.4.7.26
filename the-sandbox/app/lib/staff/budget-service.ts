// ─── Staff Budget Service ────────────────────────────────────
// Aggregated budget views for staff. Reads StaffBudgetSnapshot
// models and provides pulse summaries + detail views.

import { prisma } from '../prisma'
import type { StaffBudgetSnapshot } from '../../generated/prisma'

// ─── Types ──────────────────────────────────────────────────

export interface BudgetVariance {
  unitName: string
  category: string
  amount: number
  direction: 'over' | 'under'
  percentOver: number
}

export interface BudgetPulseSummary {
  totalRemaining: number
  percentThroughYear: number
  percentBudgetSpent: number
  onTrack: boolean                     // spent% <= year% + 5% tolerance
  flaggedVariances: BudgetVariance[]
  units: StaffBudgetSnapshot[]
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Calculate how far through the fiscal year we are (July 1 start).
 * Returns 0–100.
 */
function getFiscalYearProgress(): number {
  const now = new Date()
  const month = now.getMonth() // 0-indexed
  const day = now.getDate()

  // UK fiscal year runs July 1 – June 30
  const fyMonth = month >= 6 ? month - 6 : month + 6
  const daysInMonth = new Date(now.getFullYear(), month + 1, 0).getDate()
  const fractionOfMonth = day / daysInMonth

  return Math.round(((fyMonth + fractionOfMonth) / 12) * 100)
}

/**
 * Extract flagged variances from a budget snapshot.
 * Flags any category where spending exceeds budget by more than 10%.
 */
function extractVariances(snapshot: StaffBudgetSnapshot): BudgetVariance[] {
  const variances: BudgetVariance[] = []
  const raw = snapshot.variances as Array<{
    category: string
    amount: number
    direction: 'over' | 'under'
    percentOver: number
  }> | null

  if (!raw || !Array.isArray(raw)) return variances

  for (const v of raw) {
    if (v.direction === 'over' && v.percentOver > 10) {
      variances.push({
        unitName: snapshot.unitName,
        category: v.category,
        amount: v.amount,
        direction: v.direction,
        percentOver: v.percentOver,
      })
    }
  }

  return variances
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Aggregate budget across all units for a user.
 * Returns the latest snapshot per unit and computes pulse metrics.
 */
export async function getBudgetPulse(userId: string): Promise<BudgetPulseSummary> {
  // Get the most recent snapshot date for this user
  const latestSnapshot = await prisma.staffBudgetSnapshot.findFirst({
    where: { userId },
    orderBy: { snapshotDate: 'desc' },
    select: { snapshotDate: true },
  })

  if (!latestSnapshot) {
    return {
      totalRemaining: 0,
      percentThroughYear: getFiscalYearProgress(),
      percentBudgetSpent: 0,
      onTrack: true,
      flaggedVariances: [],
      units: [],
    }
  }

  // Get all unit snapshots from the latest date
  const units = await prisma.staffBudgetSnapshot.findMany({
    where: {
      userId,
      snapshotDate: latestSnapshot.snapshotDate,
    },
    orderBy: { unitName: 'asc' },
  })

  // Aggregate totals
  let totalBudget = 0
  let totalSpent = 0
  let totalCommitted = 0
  let totalRemaining = 0
  const allVariances: BudgetVariance[] = []

  for (const unit of units) {
    totalBudget += unit.totalBudget
    totalSpent += unit.spent
    totalCommitted += unit.committed
    totalRemaining += unit.remaining
    allVariances.push(...extractVariances(unit))
  }

  const percentThroughYear = getFiscalYearProgress()
  const percentBudgetSpent = totalBudget > 0
    ? Math.round(((totalSpent + totalCommitted) / totalBudget) * 100)
    : 0

  // On track if spent% is within 5 percentage points of year progress
  const onTrack = percentBudgetSpent <= percentThroughYear + 5

  return {
    totalRemaining,
    percentThroughYear,
    percentBudgetSpent,
    onTrack,
    flaggedVariances: allVariances,
    units,
  }
}

/**
 * Detailed budget view for a single unit.
 * Returns the latest snapshot for the specified unit.
 */
export async function getBudgetDetail(
  userId: string,
  unitName: string,
): Promise<StaffBudgetSnapshot | null> {
  return prisma.staffBudgetSnapshot.findFirst({
    where: { userId, unitName },
    orderBy: { snapshotDate: 'desc' },
  })
}

/**
 * After a PO is approved, increment the committed amount in the relevant
 * budget snapshot. Also reduces remaining by the same amount.
 */
export async function updateBudgetAfterApproval(
  userId: string,
  unitName: string,
  amount: number,
  category: string,
): Promise<void> {
  // Find the latest snapshot for this unit
  const snapshot = await prisma.staffBudgetSnapshot.findFirst({
    where: { userId, unitName },
    orderBy: { snapshotDate: 'desc' },
  })

  if (!snapshot) return

  // Update category breakdown if present
  const categories = (snapshot.categories ?? {}) as Record<
    string,
    { budget: number; spent: number; remaining: number }
  >

  if (categories[category]) {
    categories[category].spent += amount
    categories[category].remaining -= amount
  }

  await prisma.staffBudgetSnapshot.update({
    where: { id: snapshot.id },
    data: {
      committed: snapshot.committed + amount,
      remaining: snapshot.remaining - amount,
      categories,
    },
  })
}
