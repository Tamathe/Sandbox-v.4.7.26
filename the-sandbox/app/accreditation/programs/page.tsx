'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'
import ProgramRollupTable from '../../components/accreditation/ProgramRollupTable'
import { useAccreditationStandards } from '../../hooks/useAccreditationStandards'
import type { ProgramCompliance } from '../../lib/accreditation/types'

export default function ProgramCompliancePage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const { standards: rawStandards, loading } = useAccreditationStandards()

  const programs = useMemo(() => {
    const programMap = new Map<string, ProgramCompliance>()
    for (const std of rawStandards) {
      const evidence = (std.evidence ?? []) as { programCode: string | null; qualityScore: number }[]
      for (const e of evidence) {
        const code = e.programCode ?? 'institution-wide'
        if (!programMap.has(code)) {
          programMap.set(code, { programCode: code, programName: code, evidenceCount: 0, qualityScore: 0, gaps: [] })
        }
        const p = programMap.get(code)!
        p.evidenceCount++
        p.qualityScore = (p.qualityScore * (p.evidenceCount - 1) + (e.qualityScore ?? 0)) / p.evidenceCount
      }
      const gaps = (std.gaps ?? []) as { severity: string; id: string }[]
      for (const g of gaps) {
        for (const [, p] of programMap) {
          if (!p.gaps.includes(g.id)) p.gaps.push(g.id)
        }
      }
    }
    return Array.from(programMap.values())
  }, [rawStandards])

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'STAFF')) {
    if (typeof window !== 'undefined') router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Program Compliance"
        subtitle="Program-level compliance roll-up for department chairs and deans"
        action={
          <Link href="/accreditation" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="animate-pulse h-48 bg-gray-100 rounded-2xl" />
        ) : (
          <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white">
            <ProgramRollupTable programs={programs} />
          </div>
        )}
      </div>
    </div>
  )
}
