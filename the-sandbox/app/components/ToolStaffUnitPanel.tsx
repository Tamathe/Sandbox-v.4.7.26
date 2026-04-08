'use client'

import Link from 'next/link'
import { BriefcaseBusiness, Loader2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import type {
  ToolStaffUnitResponse,
  ToolStaffUnitSummary,
} from '../lib/tool-staff-units'
import { courseHeaders, readJson } from './courses/course-utils'

interface ToolStaffUnitPanelProps {
  toolId: string
  userEmail: string
  userRole: string
  initialStaffUnits?: ToolStaffUnitSummary | null
}

function formatVisibilityLabel(visibility: string) {
  switch (visibility) {
    case 'ROLE_RESTRICTED':
      return 'Members only'
    case 'INTERNAL':
      return 'Internal'
    case 'HIDDEN':
      return 'Hidden'
    default:
      return 'Public'
  }
}

export default function ToolStaffUnitPanel({
  toolId,
  userEmail,
  userRole,
  initialStaffUnits,
}: ToolStaffUnitPanelProps) {
  const [data, setData] = useState<ToolStaffUnitResponse | null>(null)
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadStaffUnits() {
      setLoading(true)
      setError(null)

      try {
        const response = await readJson<ToolStaffUnitResponse>(
          `/api/tools/${toolId}/staff-units`,
          {
            headers: courseHeaders(userEmail),
          },
        )

        if (cancelled) return

        setData(response)
        setSelectedCollectionId((current) => current || response.availableCollections[0]?.collectionId || '')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load staff unit details')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadStaffUnits()

    return () => {
      cancelled = true
    }
  }, [toolId, userEmail])

  async function handleAssign() {
    if (!selectedCollectionId) return

    setAssigning(true)
    setError(null)
    setNotice(null)

    try {
      const response = await readJson<ToolStaffUnitResponse>(
        `/api/tools/${toolId}/staff-units`,
        {
          method: 'POST',
          headers: courseHeaders(userEmail, true),
          body: JSON.stringify({ collectionId: selectedCollectionId }),
        },
      )

      setData(response)
      setSelectedCollectionId(response.availableCollections[0]?.collectionId || '')
      setNotice('Tool assigned to staff unit.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign tool to staff unit')
    } finally {
      setAssigning(false)
    }
  }

  const staffUnits = data?.staffUnits ?? initialStaffUnits ?? null
  const visiblePlacements = data?.visiblePlacements ?? staffUnits?.placements ?? []
  const availableCollections = data?.availableCollections ?? []
  const installHint = data?.installHint ?? null
  const canInstall =
    userRole === 'ADMIN' || userRole === 'EDUCATOR' || userRole === 'STAFF'
      ? (data?.canInstall ?? false)
      : false

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 space-y-4">
      <div>
        <h3 className="font-bold text-gray-700 text-sm">Staff Units</h3>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          Assign tools into administrative and student-service unit collections for operational rollout.
        </p>
      </div>

      {staffUnits && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
            Staff unit reach
          </div>
          <p className="mt-1 text-sm text-gray-700">
            Installed in {staffUnits.placementCount} collection{staffUnits.placementCount === 1 ? '' : 's'} across {staffUnits.departmentCount} staff unit{staffUnits.departmentCount === 1 ? '' : 's'}.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          Loading staff unit details...
        </div>
      ) : (
        <>
          {visiblePlacements.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                Visible staff unit installs
              </div>
              <div className="space-y-2">
                {visiblePlacements.map((placement) => (
                  <Link
                    key={`${placement.departmentId}-${placement.collectionId}`}
                    href={`/hub/s/${placement.departmentSlug}/${placement.collectionSlug}`}
                    className="flex items-start gap-3 rounded-xl border border-gray-200 px-3 py-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-[#0033A0]">
                      <BriefcaseBusiness className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">
                        {placement.departmentShortName}
                      </div>
                      <div className="text-sm text-gray-600">{placement.collectionName}</div>
                      <div className="text-xs text-gray-400">
                        {formatVisibilityLabel(placement.visibility)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(userRole === 'ADMIN' || userRole === 'EDUCATOR' || userRole === 'STAFF') && (
            <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0033A0]">
                  Assign to staff unit
                </div>
                <p className="mt-1 text-sm text-blue-800">
                  Install this tool into a managed staff-unit collection without requiring public template approval.
                </p>
              </div>

              {installHint && (
                <div className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-800">
                  {installHint}
                </div>
              )}

              {canInstall && availableCollections.length > 0 && (
                <>
                  <select
                    value={selectedCollectionId}
                    onChange={(event) => setSelectedCollectionId(event.target.value)}
                    className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#0033A0]"
                  >
                    {availableCollections.map((collection) => (
                      <option key={collection.collectionId} value={collection.collectionId}>
                        {collection.departmentShortName} - {collection.collectionName}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => void handleAssign()}
                    disabled={assigning || !selectedCollectionId}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                  >
                    {assigning ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Assign to staff unit
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
