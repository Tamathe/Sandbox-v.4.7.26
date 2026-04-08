import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getBudgetPulse } from '../../../lib/staff/budget-service'
import { generateCSV } from '../../../lib/export-service'
import type { ExportColumn } from '../../../lib/export-service'

const COLUMNS: ExportColumn[] = [
  { key: 'category', label: 'Category' },
  { key: 'budgeted', label: 'Budgeted', format: 'currency' },
  { key: 'spent', label: 'Spent', format: 'currency' },
  { key: 'remaining', label: 'Remaining', format: 'currency' },
  { key: 'variance', label: 'Variance%', format: 'percent' },
]

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const pulse = await getBudgetPulse(auth.user.id)

  // Build rows from budget units — each unit is a row with its aggregate numbers.
  // If a unit has category breakdowns, expand those as sub-rows.
  const data: Record<string, unknown>[] = []

  for (const unit of pulse.units) {
    const categories = (unit.categories ?? {}) as Record<
      string,
      { budget: number; spent: number; remaining: number }
    >

    const catKeys = Object.keys(categories)

    if (catKeys.length > 0) {
      // Expand category-level detail
      for (const catName of catKeys) {
        const cat = categories[catName]
        const variance = cat.budget > 0
          ? ((cat.spent - cat.budget) / cat.budget) * 100
          : 0
        data.push({
          category: `${unit.unitName} — ${catName}`,
          budgeted: cat.budget,
          spent: cat.spent,
          remaining: cat.remaining,
          variance,
        })
      }
    } else {
      // Unit-level summary only
      const variance = unit.totalBudget > 0
        ? ((unit.spent - unit.totalBudget) / unit.totalBudget) * 100
        : 0
      data.push({
        category: unit.unitName,
        budgeted: unit.totalBudget,
        spent: unit.spent,
        remaining: unit.remaining,
        variance,
      })
    }
  }

  const csv = generateCSV(data, COLUMNS)
  const timestamp = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="budget-report-${timestamp}.csv"`,
    },
  })
})
