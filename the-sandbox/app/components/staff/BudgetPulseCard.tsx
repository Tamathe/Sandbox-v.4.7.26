'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import ExportButton from '../ExportButton'

interface BudgetVariance {
  category: string
  amount: number
  direction: string
  percentOver: number
  unitName?: string
}

interface BudgetUnit {
  unitName: string
  totalBudget: number
  spent: number
  committed: number
  remaining: number
  burnRate: number
  variances: BudgetVariance[] | null
}

export interface BudgetPulse {
  totalRemaining: number
  percentThroughYear: number
  percentBudgetSpent: number
  onTrack: boolean
  flaggedVariances: BudgetVariance[]
  units: BudgetUnit[]
}

interface BudgetPulseCardProps {
  /** If provided, uses this instead of fetching. */
  pulse?: BudgetPulse
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

export default function BudgetPulseCard({ pulse: propPulse }: BudgetPulseCardProps = {}) {
  const { currentUser } = useAuth()
  const [fetchedPulse, setFetchedPulse] = useState<BudgetPulse | null>(null)
  const [loading, setLoading] = useState(!propPulse)
  const [collapsed, setCollapsed] = useState(false)

  const data = propPulse ?? fetchedPulse

  const fetchBudget = useCallback(async () => {
    if (propPulse) return
    setLoading(true)
    try {
      const res = await fetch('/api/staff/budget', {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const json = await res.json() as BudgetPulse
        setFetchedPulse(json)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [currentUser.email, propPulse])

  useEffect(() => { void fetchBudget() }, [fetchBudget])

  const overallPercent = data ? Math.min(data.percentBudgetSpent, 100) : 0
  const isOver = data ? !data.onTrack : false

  return (
    <div className="border-2 border-gray-200 rounded-2xl p-5">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <DollarSign className="size-5 text-[#0033A0]" />
          <h2 className="text-lg font-extrabold text-gray-900">Budget Pulse</h2>
        </div>
        <div className="flex items-center gap-1">
          <ExportButton href="/api/export/budget" label="Export budget to CSV" />
          {collapsed ? <ChevronDown className="size-5 text-gray-400" /> : <ChevronUp className="size-5 text-gray-400" />}
        </div>
      </button>

      {!collapsed && (
        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded-full w-full" />
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-100 rounded-xl" />
              ))}
            </div>
          ) : data ? (
            <>
              {/* Summary line */}
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{formatCurrency(data.totalRemaining)}</span>
                {' '}remaining across {data.units.length} college{data.units.length !== 1 ? 's' : ''}
              </p>

              {/* Overall burn rate gauge */}
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Overall burn rate</span>
                  <span className={isOver ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                    {data.percentBudgetSpent.toFixed(0)}% spent
                    {' / '}
                    {data.percentThroughYear.toFixed(0)}% through FY
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${overallPercent}%` }}
                  />
                </div>
              </div>

              {/* Per-unit rows */}
              <div className="space-y-3">
                {data.units.map(unit => {
                  const spentPercent = unit.totalBudget > 0
                    ? Math.min((unit.spent / unit.totalBudget) * 100, 100)
                    : 0
                  const hasOverage = unit.variances && unit.variances.some(v => v.direction === 'over')

                  return (
                    <div key={unit.unitName} className="bg-gray-50 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-gray-800 truncate">{unit.unitName}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {hasOverage && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
                              <AlertTriangle className="size-3" />
                              Over
                            </span>
                          )}
                          <span className="text-sm text-gray-600">{formatCurrency(unit.remaining)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${hasOverage ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${spentPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400">
                          {formatCurrency(unit.spent)} of {formatCurrency(unit.totalBudget)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {spentPercent.toFixed(0)}% spent
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">Unable to load budget data.</p>
          )}
        </div>
      )}
    </div>
  )
}
