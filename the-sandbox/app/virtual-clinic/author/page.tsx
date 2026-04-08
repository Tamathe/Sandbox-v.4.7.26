'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Stethoscope } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import CaseAuthorForm from '../../components/virtual-clinic/CaseAuthorForm'
import CaseImportPanel from '../../components/virtual-clinic/CaseImportPanel'
import type { ClinicalCaseInput } from '../../lib/virtual-clinic/types'

export default function CaseAuthorPage() {
  const [importedData, setImportedData] = useState<Partial<ClinicalCaseInput> | undefined>()
  const [importKey, setImportKey] = useState(0)

  const handleImported = useCallback((data: Partial<ClinicalCaseInput>) => {
    setImportedData(data)
    setImportKey((k) => k + 1)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Case Author"
        subtitle="Create or import a clinical case for Virtual Clinic encounters"
        action={
          <Link
            href="/hub"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0]"
          >
            <ArrowLeft className="size-4" />
            Back to Explore
          </Link>
        }
      >
        <div className="flex items-center gap-2 mt-2">
          <Stethoscope className="size-4 text-[#0033A0]" />
          <span className="text-xs text-gray-500">Virtual Clinic — EDUCATOR / ADMIN</span>
        </div>
      </PageHeader>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Import Panel — left / top */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-8">
              <CaseImportPanel onImported={handleImported} />
            </div>
          </div>

          {/* Author Form — right / bottom */}
          <div className="lg:col-span-8">
            <CaseAuthorForm key={importKey} initialData={importedData} />
          </div>
        </div>
      </div>
    </div>
  )
}
