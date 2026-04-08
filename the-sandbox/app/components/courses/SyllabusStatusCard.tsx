'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Network,
  Upload,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type SyllabusStatus = {
  hasParseJob: boolean
  hasCourseMap: boolean
  validationStatus: string | null
  lastParseDate: string | null
  unitCount: number | null
  nodeCount: number | null
  edgeCount: number | null
  assignmentCount: number
  objectiveCount: number
}

interface SyllabusStatusCardProps {
  courseId: string
  userEmail: string
}

const VALIDATION_BADGE: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  PASS:  { label: 'Pass',    className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  WARN:  { label: 'Warning', className: 'bg-amber-100 text-amber-700',    icon: AlertTriangle },
  BLOCK: { label: 'Blocked', className: 'bg-red-100 text-red-700',        icon: XCircle },
}

export default function SyllabusStatusCard({ courseId, userEmail }: SyllabusStatusCardProps) {
  const [status, setStatus] = useState<SyllabusStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setStatus(null)
    fetch(`/api/courses/${courseId}/syllabus-status`, {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SyllabusStatus | null) => setStatus(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [courseId, userEmail])

  if (loading) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-2xl border-2 border-gray-200 px-4 py-3">
        <Loader2 className="size-4 animate-spin text-gray-400" />
        <span className="text-xs text-gray-400">Loading syllabus status…</span>
      </div>
    )
  }

  if (!status) return null

  const hasImport = status.hasParseJob || status.hasCourseMap
  const badge = status.validationStatus ? VALIDATION_BADGE[status.validationStatus] : null
  const BadgeIcon = badge?.icon

  return (
    <div className="mt-4 rounded-2xl border-2 border-gray-200 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: status info */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-600">
          <span className="font-semibold text-gray-900 text-sm">Syllabus</span>

          {hasImport ? (
            <>
              {status.lastParseDate && (
                <span>
                  Imported{' '}
                  <span className="font-medium text-gray-900">
                    {formatDistanceToNow(new Date(status.lastParseDate), { addSuffix: true })}
                  </span>
                </span>
              )}
              {status.unitCount != null && (
                <span>
                  <span className="font-medium text-gray-900">{status.unitCount}</span> units
                </span>
              )}
              <span>
                <span className="font-medium text-gray-900">{status.assignmentCount}</span> assignments
              </span>
              <span>
                <span className="font-medium text-gray-900">{status.objectiveCount}</span> objectives
              </span>
              {badge && BadgeIcon && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                  <BadgeIcon className="size-3" />
                  {badge.label}
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-400">No syllabus imported yet</span>
          )}
        </div>

        {/* Right: action links */}
        <div className="flex items-center gap-2">
          {status.hasCourseMap ? (
            <Link
              href={`/courses/${courseId}/course-map`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#002580]"
            >
              <Network className="size-3.5" />
              View Course Map
            </Link>
          ) : (
            <Link
              href={`/courses/${courseId}/syllabus`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#002580]"
            >
              <Upload className="size-3.5" />
              Import Syllabus
            </Link>
          )}
          {hasImport && (
            <Link
              href={`/courses/${courseId}/syllabus`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              <FileText className="size-3.5" />
              {status.hasCourseMap ? 'Re-import' : 'Import Syllabus'}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
