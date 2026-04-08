'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Stethoscope,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Play,
  ChevronRight,
  CalendarClock,
  RotateCcw,
  Timer,
  Brain,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import TabNav from '../components/TabNav'
import SegmentedControl from '../components/SegmentedControl'
import { useAuth } from '../lib/auth-context'
import { apiFetch } from '../lib/api-client'
import dynamic from 'next/dynamic'
import HowItWorksBanner from '../components/virtual-clinic/HowItWorksBanner'
import RecommendedNextCard from '../components/virtual-clinic/RecommendedNextCard'

const StudentGrowthChart = dynamic(() => import('../components/virtual-clinic/analytics/StudentGrowthChart'), { ssr: false })
const DomainRadarChart = dynamic(() => import('../components/virtual-clinic/analytics/DomainRadarChart'), { ssr: false })
const CaseAnalyticsPanel = dynamic(() => import('../components/virtual-clinic/analytics/CaseAnalyticsPanel'), { ssr: false })

// ─── Types ──────────────────────────────────────────────────────────────────

type ClinicalProgram = 'DNP_PSYCHIATRY' | 'COLLEGE_OF_MEDICINE'

interface ClinicalCaseListItem {
  id: string
  title: string
  chiefComplaint: string
  program: ClinicalProgram
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
  organSystems: string[]
  tags: string[]
  patientName: string
  patientAge: number
  patientSex: string
  published: boolean
  creatorId: string
  createdAt: string
}

interface EncounterListItem {
  id: string
  phase: string
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'
  completedAt: string | null
  overallScore: number | null
  overallLevel: string | null
  startedAt: string
  clinicalCase: {
    id: string
    title: string
    chiefComplaint: string
    difficulty: string
    organSystems: string[]
    patientName: string
    patientAge: number
    patientSex: string
  }
}

interface AssignmentInfo {
  caseId: string
  assignmentId: string
  title: string
  dueAt: string | null
}

// ─── Difficulty colors ──────────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, string> = {
  BEGINNER: 'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-blue-100 text-blue-700',
  ADVANCED: 'bg-amber-100 text-amber-700',
  EXPERT: 'bg-red-100 text-red-700',
}

const PROGRAM_LABELS: Record<ClinicalProgram, string> = {
  DNP_PSYCHIATRY: 'DNP Psychiatry',
  COLLEGE_OF_MEDICINE: 'College of Medicine',
}

const PROGRAM_COLORS: Record<ClinicalProgram, string> = {
  DNP_PSYCHIATRY: 'bg-purple-100 text-purple-700',
  COLLEGE_OF_MEDICINE: 'bg-teal-100 text-teal-700',
}

const LEVEL_COLORS: Record<string, string> = {
  NOVICE: 'bg-gray-100 text-gray-700',
  DEVELOPING: 'bg-blue-100 text-blue-700',
  COMPETENT: 'bg-green-100 text-green-700',
  PROFICIENT: 'bg-emerald-100 text-emerald-700',
}

function formatDuration(startedAt: string, completedAt: string | null): string | null {
  if (!completedAt) return null
  const secs = Math.floor((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000)
  if (secs < 60) return '<1m'
  const hrs = Math.floor(secs / 3600)
  const mins = Math.floor((secs % 3600) / 60)
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function VirtualClinicPage() {
  const { currentUser } = useAuth()
  const searchParams = useSearchParams()
  const organFilter = searchParams.get('filter')
  const programParam = searchParams.get('program')
  const isEducator = currentUser.role === 'EDUCATOR' || currentUser.role === 'ADMIN'

  const [selectedProgram, setSelectedProgram] = useState<ClinicalProgram>(
    (programParam === 'COLLEGE_OF_MEDICINE' ? 'COLLEGE_OF_MEDICINE' : 'DNP_PSYCHIATRY') as ClinicalProgram
  )
  const [activeTab, setActiveTab] = useState('cases')
  const [cases, setCases] = useState<ClinicalCaseListItem[]>([])
  const [encounters, setEncounters] = useState<EncounterListItem[]>([])
  const [myCases, setMyCases] = useState<ClinicalCaseListItem[]>([])
  const [assignments, setAssignments] = useState<AssignmentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAnalyticsCase, setSelectedAnalyticsCase] = useState<string | null>(null)
  const [studentDomainAverages, setStudentDomainAverages] = useState<{ history: number; exam: number; differential: number; plan: number; communication: number } | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const fetches: Promise<unknown>[] = [
          apiFetch<ClinicalCaseListItem[]>(currentUser.email, `/api/virtual-clinic/cases?published=true&program=${selectedProgram}`, { signal: controller.signal }),
          apiFetch<EncounterListItem[]>(currentUser.email, '/api/virtual-clinic/encounters', { signal: controller.signal }),
        ]

        if (isEducator) {
          fetches.push(
            apiFetch<ClinicalCaseListItem[]>(currentUser.email, `/api/virtual-clinic/cases?creatorId=${currentUser.id}&program=${selectedProgram}`, { signal: controller.signal }),
          )
        } else {
          // Students: fetch assignment data for their enrolled courses
          fetches.push(
            apiFetch<AssignmentInfo[]>(currentUser.email, '/api/virtual-clinic/assignments', { signal: controller.signal }),
          )
        }

        const results = await Promise.allSettled(fetches)

        if (results[0].status === 'fulfilled') setCases(results[0].value as ClinicalCaseListItem[])
        if (results[1].status === 'fulfilled') setEncounters(results[1].value as EncounterListItem[])
        if (results[2]?.status === 'fulfilled') {
          if (isEducator) setMyCases(results[2].value as ClinicalCaseListItem[])
          else setAssignments(results[2].value as AssignmentInfo[])
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError('Failed to load Virtual Clinic data')
      } finally {
        setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [currentUser.email, currentUser.id, isEducator, selectedProgram])

  const publishedCases = useMemo(() => {
    const published = cases.filter((c) => c.published)
    if (!organFilter) return published
    const filterLower = organFilter.toLowerCase()
    return published.filter((c) => c.organSystems.some((os) => os.toLowerCase().includes(filterLower)))
  }, [cases, organFilter])
  const inProgressEncounters = encounters.filter((e) => e.status === 'IN_PROGRESS')
  const abandonedEncounters = encounters.filter((e) => e.status === 'ABANDONED')
  const completedEncounters = encounters.filter((e) => e.status === 'COMPLETED')

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8">
        <PageHeader title="Virtual Clinic" subtitle="AI-powered clinical reasoning simulations" />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full size-8 border-b-2 border-[#0033A0]" />
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      <PageHeader
        title="Virtual Clinic"
        subtitle="Practice clinical reasoning with AI-powered patient encounters"
        action={
          isEducator ? (
            <Link
              href="/virtual-clinic/author"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-lg hover:bg-[#002878] transition-colors"
            >
              <Plus className="size-4" />
              Author New Case
            </Link>
          ) : undefined
        }
      />

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="size-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ─── Program Switcher ──────────────────────────────────────────── */}
      <SegmentedControl
        value={selectedProgram}
        onChange={(val) => { setSelectedProgram(val); setLoading(true) }}
        options={[
          { value: 'DNP_PSYCHIATRY' as ClinicalProgram, label: <span className="inline-flex items-center gap-1.5"><Brain className="size-4" />DNP Psychiatry</span> },
          { value: 'COLLEGE_OF_MEDICINE' as ClinicalProgram, label: <span className="inline-flex items-center gap-1.5"><Stethoscope className="size-4" />College of Medicine</span> },
        ]}
        className="max-w-md"
      />

      {!isEducator && <HowItWorksBanner completedEncounterCount={completedEncounters.length} />}

      <TabNav
        tabs={[
          { id: 'cases', label: 'Cases' },
          { id: 'analytics', label: 'Analytics' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'cases' && (
        <div className="space-y-10">
          {/* ─── Educator: My Cases ──────────────────────────────────────── */}
          {isEducator && (
            <section>
              <h2 className="text-lg font-extrabold text-gray-900 mb-4">My Cases</h2>
              {myCases.length === 0 ? (
                <div className="border rounded-2xl shadow-sm p-8 text-center text-gray-500">
                  <FileText className="size-8 mx-auto mb-2 text-gray-300" />
                  <p>You haven&apos;t authored any cases yet.</p>
                  <Link href="/virtual-clinic/author" className="text-[#0033A0] font-medium hover:underline mt-2 inline-block">
                    Create your first case
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myCases.map((c) => (
                    <div key={c.id} className="border rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 line-clamp-1">{c.title}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {c.published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{c.chiefComplaint}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[c.difficulty]}`}>
                          {c.difficulty}
                        </span>
                        <Link
                          href={`/virtual-clinic/author?caseId=${c.id}`}
                          className="text-sm text-[#0033A0] font-medium hover:underline inline-flex items-center gap-1"
                        >
                          Edit <ChevronRight className="size-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ─── In-Progress Encounters ──────────────────────────────────── */}
          {inProgressEncounters.length > 0 && (
            <section>
              <h2 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="size-5 text-amber-500" />
                In Progress
              </h2>
              <div className="space-y-3">
                {inProgressEncounters.map((e) => (
                  <Link
                    key={e.id}
                    href={`/virtual-clinic/encounter/${e.id}`}
                    className="flex items-center justify-between border rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{e.clinicalCase.title}</h3>
                      <p className="text-sm text-gray-500">
                        {e.clinicalCase.patientName}, {e.clinicalCase.patientAge}{e.clinicalCase.patientSex[0]} — Phase: {e.phase.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[e.clinicalCase.difficulty]}`}>
                        {e.clinicalCase.difficulty}
                      </span>
                      <span className="text-sm text-[#0033A0] font-medium">Resume</span>
                      <ChevronRight className="size-4 text-gray-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ─── Abandoned Encounters ─────────────────────────────────────── */}
          {abandonedEncounters.length > 0 && (
            <section>
              <h2 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="size-5 text-amber-500" />
                Abandoned
              </h2>
              <div className="space-y-3">
                {abandonedEncounters.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between border border-amber-200 bg-amber-50 rounded-2xl shadow-sm p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{e.clinicalCase.title}</h3>
                      <p className="text-sm text-gray-500">
                        {e.clinicalCase.patientName}, {e.clinicalCase.patientAge}{e.clinicalCase.patientSex[0]} — Started {new Date(e.startedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        Abandoned
                      </span>
                      <Link
                        href={`/virtual-clinic/case/${e.clinicalCase.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
                      >
                        <RotateCcw className="size-3.5" />
                        Start Over
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── Recommended Next Case ────────────────────────────────────── */}
          {!isEducator && completedEncounters.length > 0 && <RecommendedNextCard />}

          {/* ─── Available Cases ─────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-gray-900">Available Cases</h2>
              {organFilter && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                    Filtered: {organFilter}
                  </span>
                  <Link href="/virtual-clinic" className="text-gray-500 hover:text-gray-700 underline">
                    Clear
                  </Link>
                </div>
              )}
            </div>
            {publishedCases.length === 0 ? (
              <div className="border rounded-2xl shadow-sm p-8 text-center text-gray-500">
                <Stethoscope className="size-8 mx-auto mb-2 text-gray-300" />
                <p>No published cases available yet.</p>
                {isEducator && (
                  <Link href="/virtual-clinic/author" className="text-[#0033A0] font-medium hover:underline mt-2 inline-block">
                    Author the first case
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {publishedCases.map((c) => {
                  const caseAssignment = assignments.find((a) => a.caseId === c.id)
                  return (
                    <div key={c.id} className="border rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 line-clamp-1">{c.title}</h3>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          {caseAssignment && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                              <CalendarClock className="size-3" />
                              Assigned
                            </span>
                          )}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PROGRAM_COLORS[c.program]}`}>
                            {PROGRAM_LABELS[c.program]}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[c.difficulty]}`}>
                            {c.difficulty}
                          </span>
                        </div>
                      </div>
                      {caseAssignment?.dueAt && (
                        <p className="text-xs text-blue-600 mb-1">
                          Due {new Date(caseAssignment.dueAt).toLocaleDateString()}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">{c.chiefComplaint}</p>
                      <p className="text-xs text-gray-400 mb-3">
                        {c.patientName}, {c.patientAge}{c.patientSex[0]}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {c.organSystems.slice(0, 3).map((os) => (
                          <span key={os} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {os}
                          </span>
                        ))}
                        {c.organSystems.length > 3 && (
                          <span className="text-xs text-gray-400">+{c.organSystems.length - 3}</span>
                        )}
                      </div>
                      <div className="mt-auto">
                        <Link
                          href={`/virtual-clinic/case/${c.id}`}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-lg hover:bg-[#002878] transition-colors"
                        >
                          <Play className="size-4" />
                          View Case
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ─── Completed Encounters ────────────────────────────────────── */}
          {completedEncounters.length > 0 && (
            <section>
              <h2 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="size-5 text-green-500" />
                Past Encounters
              </h2>
              <div className="space-y-3">
                {completedEncounters.map((e) => {
                  const duration = formatDuration(e.startedAt, e.completedAt)
                  return (
                    <Link
                      key={e.id}
                      href={`/virtual-clinic/encounter/${e.id}`}
                      className="flex items-center justify-between border rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">{e.clinicalCase.title}</h3>
                        <p className="text-sm text-gray-500">
                          {e.clinicalCase.patientName}, {e.clinicalCase.patientAge}{e.clinicalCase.patientSex[0]} — {new Date(e.startedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {duration && (
                          <span className="flex items-center gap-1 text-xs text-gray-400" title="Encounter duration">
                            <Timer className="size-3" />
                            {duration}
                          </span>
                        )}
                        {e.overallScore !== null && (
                          <span className="text-sm font-semibold text-gray-700">{Math.round(e.overallScore)}%</span>
                        )}
                        {e.overallLevel && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${LEVEL_COLORS[e.overallLevel] ?? 'bg-gray-100 text-gray-600'}`}>
                            {e.overallLevel}
                          </span>
                        )}
                        <span className="text-sm text-[#0033A0] font-medium">Review</span>
                        <ChevronRight className="size-4 text-gray-400" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {!isEducator ? (
            <>
              <StudentGrowthChart />
              {studentDomainAverages && (
                <DomainRadarChart scores={studentDomainAverages} label="Your Domain Averages" />
              )}
              {!studentDomainAverages && completedEncounters.length > 0 && (
                <StudentDomainLoader onLoad={setStudentDomainAverages} />
              )}
              {completedEncounters.length === 0 && (
                <div className="border rounded-2xl shadow-sm p-8 text-center text-gray-500">
                  <Stethoscope className="size-8 mx-auto mb-2 text-gray-300" />
                  <p>Complete your first encounter to see analytics.</p>
                </div>
              )}
            </>
          ) : (
            <>
              {myCases.length === 0 ? (
                <div className="border rounded-2xl shadow-sm p-8 text-center text-gray-500">
                  <FileText className="size-8 mx-auto mb-2 text-gray-300" />
                  <p>Author a case to see analytics.</p>
                  <Link href="/virtual-clinic/author" className="text-[#0033A0] font-medium hover:underline mt-2 inline-block">
                    Create your first case
                  </Link>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="analytics-case-select" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Select a case to view analytics
                    </label>
                    <select
                      id="analytics-case-select"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full max-w-md focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent"
                      value={selectedAnalyticsCase ?? ''}
                      onChange={(e) => setSelectedAnalyticsCase(e.target.value || null)}
                    >
                      <option value="">Choose a case...</option>
                      {myCases.map((c) => (
                        <option key={c.id} value={c.id}>{c.title} {c.published ? '' : '(Draft)'}</option>
                      ))}
                    </select>
                  </div>
                  {selectedAnalyticsCase && (
                    <CaseAnalyticsPanel caseId={selectedAnalyticsCase} />
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </main>
  )
}

// Small helper that fetches domain averages for the radar chart
function StudentDomainLoader({ onLoad }: { onLoad: (d: { history: number; exam: number; differential: number; plan: number; communication: number }) => void }) {
  const { currentUser } = useAuth()

  useEffect(() => {
    const controller = new AbortController()
    apiFetch<{ domainAverages: { history: number; exam: number; differential: number; plan: number; communication: number } }>(
      currentUser.email,
      '/api/virtual-clinic/analytics/student',
      { signal: controller.signal },
    )
      .then((data) => onLoad(data.domainAverages))
      .catch(() => { /* non-fatal */ })
    return () => controller.abort()
  }, [currentUser.email, onLoad])

  return null
}
