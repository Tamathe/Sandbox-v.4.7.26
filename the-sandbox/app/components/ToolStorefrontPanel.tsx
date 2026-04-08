'use client'

import Link from 'next/link'
import { Building2, Loader2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import type {
  ToolStorefrontResponse,
  ToolStorefrontSummary,
} from '../lib/tool-storefronts'
import { courseHeaders, readJson } from './courses/course-utils'

interface ToolStorefrontPanelProps {
  toolId: string
  userEmail: string
  userRole: string
  initialStorefront?: ToolStorefrontSummary | null
}

function formatVisibilityLabel(visibility: string) {
  switch (visibility) {
    case 'ROLE_RESTRICTED':
      return 'Members only'
    case 'INTERNAL':
      return 'Internal'
    case 'PUBLIC':
      return 'Public'
    default:
      return 'Shared'
  }
}

export default function ToolStorefrontPanel({
  toolId,
  userEmail,
  userRole,
  initialStorefront,
}: ToolStorefrontPanelProps) {
  const [data, setData] = useState<ToolStorefrontResponse | null>(null)
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadStorefronts() {
      setLoading(true)
      setError(null)

      try {
        const response = await readJson<ToolStorefrontResponse>(
          `/api/tools/${toolId}/storefronts`,
          {
            headers: courseHeaders(userEmail),
          },
        )

        if (cancelled) return

        setData(response)
        setSelectedCollectionId((current) => current || response.availableCollections[0]?.collectionId || '')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load storefront details')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadStorefronts()

    return () => {
      cancelled = true
    }
  }, [toolId, userEmail])

  async function handleShare() {
    if (!selectedCollectionId) return

    setSharing(true)
    setError(null)
    setNotice(null)

    try {
      const response = await readJson<ToolStorefrontResponse>(
        `/api/tools/${toolId}/storefronts`,
        {
          method: 'POST',
          headers: courseHeaders(userEmail, true),
          body: JSON.stringify({ collectionId: selectedCollectionId }),
        },
      )

      setData(response)
      setSelectedCollectionId(response.availableCollections[0]?.collectionId || '')
      setNotice('Tool shared to department storefront.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share tool to storefront')
    } finally {
      setSharing(false)
    }
  }

  const storefront = data?.storefront ?? initialStorefront ?? null
  const visiblePlacements = data?.visiblePlacements ?? storefront?.placements ?? []
  const availableCollections = data?.availableCollections ?? []
  const shareHint = data?.shareHint ?? null
  const canShare =
    userRole === 'ADMIN' || userRole === 'EDUCATOR'
      ? (data?.canShare ?? false)
      : false
  const canSubmitShare = canShare && availableCollections.length > 0

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 space-y-4">
      <div>
        <h3 className="font-bold text-gray-700 text-sm">Department Storefronts</h3>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          Share approved tools into department collections as reusable templates.
        </p>
      </div>

      {storefront && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
            Storefront reach
          </div>
          <p className="mt-1 text-sm text-gray-700">
            Shared in {storefront.placementCount} collection{storefront.placementCount === 1 ? '' : 's'} across {storefront.departmentCount} department storefront{storefront.departmentCount === 1 ? '' : 's'}.
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
          Loading storefront details...
        </div>
      ) : (
        <>
          {visiblePlacements.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                Visible storefront placements
              </div>
              <div className="space-y-2">
                {visiblePlacements.map((placement) => (
                  <Link
                    key={`${placement.departmentId}-${placement.collectionId}`}
                    href={`/hub/s/${placement.departmentSlug}/${placement.collectionSlug}`}
                    className="flex items-start gap-3 rounded-xl border border-gray-200 px-3 py-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-[#0033A0]">
                      <Building2 className="size-4" />
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

          {(userRole === 'EDUCATOR' || userRole === 'ADMIN') && (
            <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0033A0]">
                  Share as template
                </div>
                <p className="mt-1 text-sm text-blue-800">
                  Place this tool in a department collection so faculty can discover it from a branded storefront.
                </p>
              </div>

              {shareHint && (
                <div className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-800">
                  {shareHint}
                </div>
              )}

              {canSubmitShare && (
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
                    onClick={() => void handleShare()}
                    disabled={sharing || !selectedCollectionId}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                  >
                    {sharing ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Share to storefront
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
