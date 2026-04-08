'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Stethoscope, ChevronLeft, Play, CalendarClock, Info } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'

type ClinicalProgram = 'DNP_PSYCHIATRY' | 'COLLEGE_OF_MEDICINE'

interface ClinicalCaseDetail {
  id: string
  title: string
  chiefComplaint: string
  program: ClinicalProgram
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
  organSystems: string[]
  learningObjectives: string[]
  patientName: string
  patientAge: number
  patientSex: string
}

interface AssignmentInfo {
  caseId: string
  assignmentId: string
  title: string
  dueAt: string | null
}

const DURATION_ESTIMATES: Record<string, string> = {
  BEGINNER: '~15 minutes',
  INTERMEDIATE: '~25 minutes',
  ADVANCED: '~35 minutes',
  EXPERT: '~45 minutes',
}

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

export default function DoorNotePage() {
  const { caseId } = useParams<{ caseId: string }>()
  const { currentUser } = useAuth()
  const router = useRouter()

  const [clinicalCase, setClinicalCase] = useState<ClinicalCaseDetail | null>(null)
  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const [caseData, assignments] = await Promise.allSettled([
          apiFetch<ClinicalCaseDetail>(currentUser.email, `/api/virtual-clinic/cases/${caseId}`, { signal: controller.signal }),
          apiFetch<AssignmentInfo[]>(currentUser.email, '/api/virtual-clinic/assignments', { signal: controller.signal }),
        ])

        if (caseData.status === 'fulfilled') {
          setClinicalCase(caseData.value)
        } else {
          setError('Failed to load case data')
        }

        if (assignments.status === 'fulfilled') {
          const match = assignments.value.find((a) => a.caseId === caseId)
          if (match) setAssignment(match)
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError('Failed to load case data')
      } finally {
        setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [currentUser.email, caseId])

  async function handleBeginEncounter() {
    setStarting(true)
    try {
      const encounter = await apiFetch<{ id: string }>(currentUser.email, '/api/virtual-clinic/encounters', {
        method: 'POST',
        body: JSON.stringify({ caseId }),
      })
      router.push(`/virtual-clinic/encounter/${encounter.id}`)
    } catch {
      setError('Failed to start encounter')
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full size-8 border-b-2 border-[#0033A0]" />
        </div>
      </main>
    )
  }

  if (!clinicalCase) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/virtual-clinic" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ChevronLeft className="size-4" />
          Back to Cases
        </Link>
        <div className="border rounded-2xl shadow-sm p-8 text-center text-gray-500">
          <p>{error || 'Case not found'}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/virtual-clinic" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="size-4" />
        Back to Cases
      </Link>

      <div className="border rounded-2xl shadow-sm p-8 space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="size-10 rounded-full bg-blue-50 flex items-center justify-center mb-3">
            <Stethoscope className="size-5 text-[#0033A0]" />
          </div>
          <h1 className="text-lg font-extrabold text-gray-900">{clinicalCase.title}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {clinicalCase.patientName}, {clinicalCase.patientAge}{clinicalCase.patientSex[0]}
          </p>
        </div>

        <p className="text-sm text-gray-700 text-center">{clinicalCase.chiefComplaint}</p>

        <div className="flex items-center justify-center gap-3">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PROGRAM_COLORS[clinicalCase.program]}`}>
            {PROGRAM_LABELS[clinicalCase.program]}
          </span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${DIFFICULTY_COLORS[clinicalCase.difficulty]}`}>
            {clinicalCase.difficulty}
          </span>
          <span className="text-xs text-gray-500">
            {DURATION_ESTIMATES[clinicalCase.difficulty]}
          </span>
        </div>

        {clinicalCase.organSystems.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {clinicalCase.organSystems.map((os) => (
              <span key={os} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                {os}
              </span>
            ))}
          </div>
        )}

        <hr className="border-gray-200" />

        {clinicalCase.learningObjectives.length > 0 && (
          <div>
            <h2 className="text-sm font-extrabold text-gray-900 mb-2">Learning Objectives</h2>
            <ul className="space-y-1.5">
              {clinicalCase.learningObjectives.map((obj, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">&#8226;</span>
                  {obj}
                </li>
              ))}
            </ul>
          </div>
        )}

        {assignment && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="size-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Assigned — {assignment.title}</p>
              {assignment.dueAt && (
                <p className="text-blue-600 mt-0.5">
                  Due {new Date(assignment.dueAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        <button
          onClick={handleBeginEncounter}
          disabled={starting}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#0033A0] text-white text-sm font-semibold rounded-lg hover:bg-[#002878] transition-colors disabled:opacity-50"
        >
          {starting ? (
            <div className="animate-spin rounded-full size-4 border-b-2 border-white" />
          ) : (
            <Play className="size-4" />
          )}
          Begin Encounter
        </button>
      </div>
    </main>
  )
}
