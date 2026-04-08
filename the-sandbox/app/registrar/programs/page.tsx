'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import { RegistrarLayout } from '../../components/registrar/RegistrarLayout'
import { RequirementBreakdown } from '../../components/registrar/RequirementBreakdown'
import { BookOpen, ChevronRight } from 'lucide-react'
import type { RequirementAuditResult } from '../../lib/registrar/types'

interface Program {
  id: string
  code: string
  name: string
  college: string
  department: string
  catalogYear: string
  totalCredits: number
  requirements: {
    id: string
    category: string
    name: string
    description: string | null
    minCredits: number
    courses: { courseCode: string; courseName: string; credits: number; isRequired: boolean }[]
  }[]
}

export default function ProgramsPage() {
  const { currentUser } = useAuth()
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Program | null>(null)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('/api/registrar/programs', { headers: { 'x-demo-user-email': currentUser.email } })
        if (res.ok) setPrograms((await res.json()).programs)
      } catch {}
      setLoading(false)
    }
    void fetch_()
  }, [currentUser.email])

  const toAuditFormat = (program: Program): RequirementAuditResult[] =>
    program.requirements.map((req) => ({
      requirementId: req.id,
      requirementName: req.name,
      category: req.category,
      status: 'NOT_STARTED',
      creditsRequired: req.minCredits,
      creditsCompleted: 0,
      creditsInProgress: 0,
      satisfyingCourses: [],
      missingSuggestions: req.courses.filter((c) => c.isRequired).map((c) => `${c.courseCode} — ${c.courseName}`),
      notes: req.description ?? undefined,
    }))

  return (
    <RegistrarLayout title="Degree Programs" subtitle="View degree requirements catalog">
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading programs…</div>
      ) : programs.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="size-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No degree programs loaded yet. Run the database seed to add sample programs.</p>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Program list */}
          <div className="w-64 flex-shrink-0 space-y-2">
            {programs.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                  selected?.id === p.id
                    ? 'bg-blue-50 border-[#0033A0] text-[#0033A0]'
                    : 'bg-white border-gray-200 hover:border-blue-300 text-gray-700'
                }`}
              >
                <div>
                  <p className="font-semibold text-sm">{p.code}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.catalogYear}</p>
                </div>
                <ChevronRight className="size-4 flex-shrink-0 text-gray-400" />
              </button>
            ))}
          </div>

          {/* Requirements detail */}
          {selected ? (
            <div className="flex-1 bg-white rounded-2xl border-2 border-gray-200 p-5">
              <div className="mb-4">
                <h2 className="text-lg font-extrabold text-gray-800">{selected.name}</h2>
                <p className="text-sm text-gray-500">{selected.college} · {selected.department}</p>
                <p className="text-sm text-gray-500 mt-1">Catalog Year: {selected.catalogYear} · Total Credits: {selected.totalCredits}</p>
              </div>
              <RequirementBreakdown requirements={toAuditFormat(selected)} />
            </div>
          ) : (
            <div className="flex-1 bg-white rounded-2xl border-2 border-gray-200 flex items-center justify-center text-gray-400 text-sm">
              Select a program to view its requirements
            </div>
          )}
        </div>
      )}
    </RegistrarLayout>
  )
}
