'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Filter } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'
import EvidenceTable from '../../components/accreditation/EvidenceTable'
import EvidenceUploadModal from '../../components/accreditation/EvidenceUploadModal'
import { useAccreditationStandards } from '../../hooks/useAccreditationStandards'

export default function EvidenceBrowserPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [showUpload, setShowUpload] = useState(false)
  const { standards: rawStandards } = useAccreditationStandards()
  const [refreshKey, setRefreshKey] = useState(0)

  const standards = useMemo(() =>
    rawStandards.map((s: Record<string, unknown>) => ({
      id: s.id as string,
      standardNumber: s.standardNumber as string,
      standardTitle: s.standardTitle as string,
    })),
    [rawStandards],
  )

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'STAFF')) {
    if (typeof window !== 'undefined') router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Evidence Browser"
        subtitle="All collected accreditation evidence — filterable, uploadable"
        action={
          <div className="flex items-center gap-3">
            <Link href="/accreditation" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="size-4" />
              Dashboard
            </Link>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#002880]"
            >
              <Upload className="size-4" />
              Upload Evidence
            </button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8" key={refreshKey}>
        <EvidenceTable />
      </div>

      {showUpload && (
        <EvidenceUploadModal
          standards={standards}
          onClose={() => setShowUpload(false)}
          onUploaded={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  )
}
