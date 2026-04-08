'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, BookOpen, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import PageHeader from '../components/PageHeader'
import TabNav from '../components/TabNav'
import ProgramGrid from '../components/explore/ProgramGrid'
import type { ProgramCardData } from '../components/explore/ProgramCard'
import CatalogBrowser from '../components/explore/CatalogBrowser'
import CurrentProgramBanner from '../components/explore/CurrentProgramBanner'
import WhatIfPanel from '../components/explore/WhatIfPanel'

const TABS = [
  { id: 'programs', label: 'Programs', icon: GraduationCap },
  { id: 'catalog', label: 'Course Catalog', icon: BookOpen },
] as const

// Advisor contacts by college (shared with student-services)
const ADVISOR_URLS: Record<string, string> = {
  'College of Arts & Sciences': 'https://myuk.uky.edu/gps',
  'College of Engineering': 'https://myuk.uky.edu/gps',
  'Gatton College of Business & Economics': 'https://myuk.uky.edu/gps',
  'College of Nursing': 'https://myuk.uky.edu/gps',
  'J. David Rosenberg College of Law': 'https://myuk.uky.edu/gps',
}

interface AuditResult {
  overallStatus: string
  percentComplete: number
  totalCreditsCompleted: number
  totalCreditsRequired: number
  requirementResults: Array<{
    requirementId?: string
    requirementName: string
    category: string
    status: 'SATISFIED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'DEFICIENT'
    creditsRequired: number
    creditsCompleted: number
    creditsInProgress: number
    satisfyingCourses: string[]
    missingSuggestions: string[]
  }>
}

interface TimelineEstimate {
  program: string
  programName: string
  creditsCompleted: number
  creditsRemaining: number
  estimatedSemesters: number
  estimatedGraduation: string
  bottleneck: string | null
}

interface WhatIfData {
  current: AuditResult
  target: AuditResult
  transferMap: {
    entries: Array<{
      courseCode: string
      courseName: string
      credits: number
      grade: string
      currentCategory: string
      targetCategory: string | null
      transfers: boolean
    }>
    creditsTransfer: number
    creditsLost: number
    creditsNeeded: number
    targetTotalCredits: number
  }
  timeline: {
    current: TimelineEstimate
    target: TimelineEstimate
    deltaSemesters: number
    deltaCredits: number
    recommendation: string
  }
  currentProgram: { code: string; name: string }
  targetProgram: { code: string; name: string; college: string }
}

export default function ExploreMajorsPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('programs')
  const [programs, setPrograms] = useState<ProgramCardData[]>([])
  const [loading, setLoading] = useState(true)

  // User's current program (fetched from DB, not available on DemoUser)
  const [userProgram, setUserProgram] = useState<string | null>(null)

  // What-If state
  const [targetProgramCode, setTargetProgramCode] = useState<string | null>(null)
  const [whatIfData, setWhatIfData] = useState<WhatIfData | null>(null)
  const [whatIfLoading, setWhatIfLoading] = useState(false)
  const [whatIfError, setWhatIfError] = useState<string | null>(null)

  const headers: Record<string, string> = {}
  if (currentUser?.email) headers['x-demo-user-email'] = currentUser.email

  // Load programs + user's current program on mount
  useEffect(() => {
    // Fetch all programs
    fetch('/api/degree-plan/programs', { headers })
      .then((r) => r.json())
      .then((data) => {
        const mapped: ProgramCardData[] = (data ?? []).map((p: {
          id: string
          code: string
          name: string
          college: string
          department: string
          totalCredits: number
          _count?: { requirements: number }
        }) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          college: p.college,
          department: p.department,
          totalCredits: p.totalCredits,
          requirementCount: p._count?.requirements ?? 0,
        }))
        setPrograms(mapped)
      })
      .catch(() => setPrograms([]))
      .finally(() => setLoading(false))

    // Fetch user's current audit to learn their program
    fetch('/api/students/me/degree-audit', { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data.audit?.program?.code) {
          setUserProgram(data.audit.program.code)
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.email])

  // Run what-if audit when target changes
  const runWhatIf = useCallback(
    async (programCode: string) => {
      if (programCode === userProgram) {
        // Don't compare against yourself
        setTargetProgramCode(null)
        setWhatIfData(null)
        return
      }

      setTargetProgramCode(programCode)
      setWhatIfLoading(true)
      setWhatIfError(null)
      setWhatIfData(null)

      try {
        const res = await fetch(
          `/api/students/me/degree-audit/what-if?program=${encodeURIComponent(programCode)}`,
          { headers },
        )
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error ?? 'Failed to run what-if audit')
        }
        const data = await res.json()
        setWhatIfData(data)
        // Learn user's current program from the what-if response
        if (data.currentProgram?.code && !userProgram) {
          setUserProgram(data.currentProgram.code)
        }
      } catch (e) {
        setWhatIfError(e instanceof Error ? e.message : 'Something went wrong')
      } finally {
        setWhatIfLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser?.email, userProgram],
  )

  const handleCreatePlan = async () => {
    if (!whatIfData) return
    try {
      const res = await fetch('/api/degree-plan', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `What-If: ${whatIfData.targetProgram.name}`,
          programId: programs.find((p) => p.code === targetProgramCode)?.id,
        }),
      })
      if (res.ok) {
        router.push('/degree-plan')
      }
    } catch {
      // Silent fail — user can create plan manually
    }
  }

  const handleBookAdvisor = () => {
    const college = whatIfData?.targetProgram.college ?? ''
    const url = ADVISOR_URLS[college] ?? 'https://myuk.uky.edu/gps'
    window.open(url, '_blank')
  }

  const handleCloseWhatIf = () => {
    setTargetProgramCode(null)
    setWhatIfData(null)
    setWhatIfError(null)
  }

  // Find current program info from loaded programs
  const currentProgramInfo = programs.find((p) => p.code === userProgram)

  return (
    <div>
      <PageHeader
        title="Explore Majors"
        subtitle="See how your credits transfer to any program at UK"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Current Program Banner */}
        <CurrentProgramBanner
          programName={currentProgramInfo?.name ?? userProgram ?? null}
          college={currentProgramInfo?.college ?? currentUser?.college ?? null}

          percentComplete={whatIfData?.current?.percentComplete}
        />

        {/* What-If Panel (shown when exploring a target) */}
        {targetProgramCode && (
          <div>
            {whatIfLoading && (
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-12
                              flex flex-col items-center justify-center gap-3">
                <Loader2 className="size-8 animate-spin text-[#0033A0]" />
                <p className="text-sm text-gray-500">
                  Running what-if analysis for {programs.find((p) => p.code === targetProgramCode)?.name ?? targetProgramCode}...
                </p>
              </div>
            )}

            {whatIfError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
                {whatIfError}
              </div>
            )}

            {whatIfData && (
              <WhatIfPanel
                targetAudit={whatIfData.target}
                transferMap={whatIfData.transferMap}
                timeline={whatIfData.timeline}
                targetProgram={whatIfData.targetProgram}
                onClose={handleCloseWhatIf}
                onCreatePlan={handleCreatePlan}
                onBookAdvisor={handleBookAdvisor}
              />
            )}
          </div>
        )}

        {/* Tabs */}
        <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === 'programs' && (
          loading ? (
            <div className="text-center py-12 text-sm text-gray-400">Loading programs...</div>
          ) : (
            <ProgramGrid
              programs={programs}
              currentProgramCode={userProgram ?? null}
              onExplore={runWhatIf}
            />
          )
        )}

        {activeTab === 'catalog' && <CatalogBrowser />}
      </div>
    </div>
  )
}
