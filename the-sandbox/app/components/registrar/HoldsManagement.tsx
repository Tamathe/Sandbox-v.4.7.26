'use client'

import { useState, useMemo } from 'react'
import {
  Bot, Lock, DollarSign, Stethoscope, BookOpen, Car, Scale,
  Users, CheckCircle, Trash2, AlertTriangle, Clock,
} from 'lucide-react'
import { useStudent360 } from './Student360Context'
import type { HoldsManagementData, StudentHold, HoldType } from '../../lib/registrar/holds-management'

interface HoldsManagementProps {
  data: HoldsManagementData | null
  loading: boolean
}

// ── Badge colors by hold type ────────────────────────────────────────────────

const TYPE_BADGE: Record<HoldType, string> = {
  FINANCIAL:    'bg-red-100 text-red-800',
  ADVISING:     'bg-blue-100 text-blue-800',
  IMMUNIZATION: 'bg-amber-100 text-amber-800',
  DISCIPLINARY: 'bg-purple-100 text-purple-800',
  LIBRARY:      'bg-teal-100 text-teal-800',
  PARKING:      'bg-gray-100 text-gray-700',
}

const TYPE_LABEL: Record<HoldType, string> = {
  FINANCIAL:    'Financial',
  ADVISING:     'Advising',
  IMMUNIZATION: 'Immunization',
  DISCIPLINARY: 'Disciplinary',
  LIBRARY:      'Library',
  PARKING:      'Parking',
}

const TYPE_ICON: Record<HoldType, React.ReactNode> = {
  FINANCIAL:    <DollarSign className="size-4" />,
  ADVISING:     <Users className="size-4" />,
  IMMUNIZATION: <Stethoscope className="size-4" />,
  DISCIPLINARY: <Scale className="size-4" />,
  LIBRARY:      <BookOpen className="size-4" />,
  PARKING:      <Car className="size-4" />,
}

function ageColor(days: number): string {
  if (days > 60) return 'text-red-600 font-semibold'
  if (days > 30) return 'text-amber-600 font-semibold'
  return 'text-gray-500'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

// ── Component ────────────────────────────────────────────────────────────────

export default function HoldsManagement({ data, loading }: HoldsManagementProps) {
  const { openStudent360 } = useStudent360()
  const [filter, setFilter] = useState<HoldType | 'ALL'>('ALL')
  const [releasedIds, setReleasedIds] = useState<Set<string>>(new Set())
  const [bulkReleased, setBulkReleased] = useState(false)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  // Filter + remove released holds
  const activeHolds = useMemo(() => {
    if (!data) return []
    return data.holds.filter(h => {
      if (releasedIds.has(h.id)) return false
      if (filter !== 'ALL' && h.type !== filter) return false
      return true
    })
  }, [data, filter, releasedIds])

  // Bulk-releasable in current view
  const bulkReleasableInView = useMemo(() => {
    return activeHolds.filter(h => h.bulkReleasable)
  }, [activeHolds])

  // Oldest hold age
  const oldestAge = useMemo(() => {
    if (!data) return 0
    const active = data.holds.filter(h => !releasedIds.has(h.id))
    return active.length > 0 ? Math.max(...active.map(h => h.ageDays)) : 0
  }, [data, releasedIds])

  // Active counts for summary
  const activeCount = useMemo(() => {
    if (!data) return 0
    return data.holds.filter(h => !releasedIds.has(h.id)).length
  }, [data, releasedIds])

  const activeStudents = useMemo(() => {
    if (!data) return 0
    const active = data.holds.filter(h => !releasedIds.has(h.id))
    return new Set(active.map(h => h.studentId)).size
  }, [data, releasedIds])

  const activeBulkReleasable = useMemo(() => {
    if (!data) return 0
    return data.holds.filter(h => !releasedIds.has(h.id) && h.bulkReleasable).length
  }, [data, releasedIds])

  // Type counts for filter pills
  const typeCounts = useMemo(() => {
    if (!data) return {} as Record<string, number>
    const counts: Record<string, number> = { ALL: 0 }
    for (const h of data.holds) {
      if (releasedIds.has(h.id)) continue
      counts.ALL = (counts.ALL || 0) + 1
      counts[h.type] = (counts[h.type] || 0) + 1
    }
    return counts
  }, [data, releasedIds])

  function releaseHold(hold: StudentHold) {
    setReleasedIds(prev => new Set([...prev, hold.id]))
    showBanner(`Released ${TYPE_LABEL[hold.type].toLowerCase()} hold for ${hold.studentName}`)
  }

  function releaseBulk() {
    const ids = bulkReleasableInView.map(h => h.id)
    setReleasedIds(prev => new Set([...prev, ...ids]))
    setBulkReleased(true)
    showBanner(`Released ${ids.length} hold${ids.length !== 1 ? 's' : ''} in bulk`)
  }

  function releaseSandyRecommended() {
    if (!data) return
    const eligible = data.holds.filter(h => !releasedIds.has(h.id) && h.bulkReleasable)
    const ids = eligible.map(h => h.id)
    setReleasedIds(prev => new Set([...prev, ...ids]))
    showBanner(`Released ${ids.length} hold${ids.length !== 1 ? 's' : ''} per Sandy's recommendation`)
  }

  function showBanner(msg: string) {
    setSuccessBanner(msg)
    setTimeout(() => setSuccessBanner(null), 4000)
  }

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="border-2 rounded-2xl p-4 bg-white">
              <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mb-2" />
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="border-2 rounded-2xl p-6 bg-white">
          <div className="size-64 bg-gray-100 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  // ── Render ─────────────────────────────────────────────────────────────────

  const filterTypes: (HoldType | 'ALL')[] = ['ALL', 'FINANCIAL', 'ADVISING', 'IMMUNIZATION', 'DISCIPLINARY', 'LIBRARY', 'PARKING']

  return (
    <div className="space-y-6">
      {/* Success banner */}
      {successBanner && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-medium">
          <CheckCircle className="size-4 text-green-600 shrink-0" />
          {successBanner}
        </div>
      )}

      {/* ── Summary strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border-2 rounded-2xl p-4 bg-white">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Active Holds</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{activeCount}</p>
        </div>
        <div className="border-2 rounded-2xl p-4 bg-white">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Students Affected</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{activeStudents}</p>
        </div>
        <div className="border-2 rounded-2xl p-4 bg-white">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bulk Releasable</p>
          <p className="text-2xl font-extrabold text-green-700 mt-1">{activeBulkReleasable}</p>
        </div>
        <div className="border-2 rounded-2xl p-4 bg-white">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Oldest Hold</p>
          <p className={`text-2xl font-extrabold mt-1 ${oldestAge > 60 ? 'text-red-600' : oldestAge > 30 ? 'text-amber-600' : 'text-gray-900'}`}>
            {oldestAge}d
          </p>
        </div>
      </div>

      {/* ── Sandy insights ──────────────────────────────────────────────────── */}
      <div className="border-2 rounded-2xl p-5 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-xl bg-[#0033A0] flex items-center justify-center shrink-0 mt-0.5">
            <Bot className="size-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-extrabold text-[#0033A0] mb-2">Sandy — Holds Intelligence</h3>
            <ul className="space-y-1.5">
              {data.sandyInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-[#0033A0] mt-0.5 shrink-0">•</span>
                  {insight}
                </li>
              ))}
            </ul>
            {activeBulkReleasable > 0 && (
              <button
                onClick={releaseSandyRecommended}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002680] transition-colors cursor-pointer"
              >
                <CheckCircle className="size-4" />
                Release {activeBulkReleasable} Hold{activeBulkReleasable !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter pills ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {filterTypes.map(t => {
          const isActive = filter === t
          const count = typeCounts[t] ?? 0
          const label = t === 'ALL' ? 'All' : TYPE_LABEL[t]
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#0033A0] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t !== 'ALL' && TYPE_ICON[t]}
              {label}
              <span className={`ml-0.5 text-xs ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Holds table ─────────────────────────────────────────────────────── */}
      <div className="border-2 rounded-2xl bg-white overflow-hidden">
        {/* Bulk release bar */}
        {bulkReleasableInView.length > 0 && !bulkReleased && (
          <div className="flex items-center justify-between px-5 py-3 bg-green-50 border-b border-green-200">
            <p className="text-sm text-green-800 font-medium">
              {bulkReleasableInView.length} hold{bulkReleasableInView.length !== 1 ? 's' : ''} eligible for bulk release
            </p>
            <button
              onClick={releaseBulk}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors cursor-pointer"
            >
              <CheckCircle className="size-4" />
              Release {bulkReleasableInView.length} Hold{bulkReleasableInView.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}

        {activeHolds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <CheckCircle className="size-8 mb-2" />
            <p className="text-sm font-medium">No holds to display</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Student</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Placed By</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500">Age</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500">Amount</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(showAll ? activeHolds : activeHolds.slice(0, 4)).map(hold => (
                  <tr key={hold.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    {/* Student */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openStudent360(hold.studentId)}
                        className="text-left cursor-pointer hover:underline"
                      >
                        <p className="font-medium text-gray-900">{hold.studentName}</p>
                        <p className="text-xs text-gray-500">{hold.studentEmail}</p>
                      </button>
                    </td>
                    {/* Type badge */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE[hold.type]}`}>
                        {TYPE_ICON[hold.type]}
                        {TYPE_LABEL[hold.type]}
                      </span>
                    </td>
                    {/* Description */}
                    <td className="py-3 px-4 text-gray-700 max-w-xs truncate">{hold.description}</td>
                    {/* Placed by */}
                    <td className="py-3 px-4 text-gray-600">{hold.placedBy}</td>
                    {/* Age */}
                    <td className={`py-3 px-4 text-right ${ageColor(hold.ageDays)}`}>
                      {hold.ageDays}d
                    </td>
                    {/* Amount */}
                    <td className="py-3 px-4 text-right text-gray-700">
                      {hold.amount !== undefined ? formatCurrency(hold.amount) : '—'}
                    </td>
                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => releaseHold(hold)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Release hold"
                      >
                        <Trash2 className="size-4" />
                        Release
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {activeHolds.length > 4 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full py-2.5 text-sm font-medium text-[#0033A0] hover:bg-blue-50 transition-colors border-t border-gray-100"
              >
                {showAll ? 'Show fewer' : `Show all ${activeHolds.length} holds`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
