'use client'

import { useCallback, useEffect, useState } from 'react'
import { Brain, BarChart3, Activity, Columns3 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import type { ConceptDifficulty } from '../../lib/classroom-intelligence/types'
import WeeklyPulseView from './WeeklyPulseView'
import ConceptHeatmap from './ConceptHeatmap'
import EffectivenessChart from './EffectivenessChart'
import PulseHistoryChart from './PulseHistoryChart'
import CrossSectionTable from './CrossSectionTable'

interface Course {
  id: string
  title: string
  code: string
}

type Tab = 'pulse' | 'insights' | 'interventions' | 'cross-section'

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'pulse', label: 'Pulse', icon: Activity },
  { key: 'insights', label: 'Insights', icon: Brain },
  { key: 'interventions', label: 'Interventions', icon: BarChart3 },
  { key: 'cross-section', label: 'Cross-Section', icon: Columns3 },
]

interface TeachingIntelligenceDashboardProps {
  initialCourseId?: string
}

export default function TeachingIntelligenceDashboard({ initialCourseId }: TeachingIntelligenceDashboardProps) {
  const { currentUser } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId ?? '')
  const [tab, setTab] = useState<Tab>('pulse')
  const [selectedConcept, setSelectedConcept] = useState<ConceptDifficulty | null>(null)

  const fetchCourses = useCallback(async () => {
    if (!currentUser?.email) return
    try {
      const res = await apiFetch<Course[]>(currentUser.email, '/api/courses/mine')
      setCourses(res)
      if (!selectedCourseId && res.length > 0) {
        setSelectedCourseId(res[0].id)
      }
    } catch {
      // silent — courses empty
    }
  }, [currentUser?.email, selectedCourseId])

  useEffect(() => { fetchCourses() }, [fetchCourses])

  const selectedCourse = courses.find((c) => c.id === selectedCourseId)

  return (
    <div className="space-y-6">
      {/* Header + course selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Brain className="size-5 text-[#0033A0]" />
          <h1 className="font-extrabold text-2xl text-gray-900">Teaching Intelligence</h1>
        </div>
        <select
          value={selectedCourseId}
          onChange={(e) => {
            setSelectedCourseId(e.target.value)
            setSelectedConcept(null)
          }}
          className="border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0033A0]/40"
        >
          {courses.length === 0 && <option value="">No courses</option>}
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {/* Mobile tabs */}
      <div className="flex md:hidden gap-1 overflow-x-auto pb-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === key
                ? 'bg-[#0033A0] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Icon className="size-3" />
            {label}
          </button>
        ))}
      </div>

      {!selectedCourseId ? (
        <p className="text-sm text-gray-400 text-center py-10">Select a course to view teaching intelligence.</p>
      ) : (
        <>
          {/* Desktop: two-column layout */}
          <div className="hidden md:grid md:grid-cols-5 gap-6">
            {/* Left column (60%) */}
            <div className="col-span-3 space-y-6">
              <WeeklyPulseView courseId={selectedCourseId} />
              <ConceptHeatmap courseId={selectedCourseId} onSelect={setSelectedConcept} />
              <PulseHistoryChart courseId={selectedCourseId} />
            </div>
            {/* Right column (40%) */}
            <div className="col-span-2 space-y-6">
              <EffectivenessChart courseId={selectedCourseId} />
              {selectedCourse?.code && (
                <CrossSectionTable courseCode={selectedCourse.code} />
              )}
            </div>
          </div>

          {/* Mobile: tab-based views */}
          <div className="md:hidden space-y-6">
            {tab === 'pulse' && (
              <>
                <WeeklyPulseView courseId={selectedCourseId} />
                <PulseHistoryChart courseId={selectedCourseId} />
              </>
            )}
            {tab === 'insights' && (
              <ConceptHeatmap courseId={selectedCourseId} onSelect={setSelectedConcept} />
            )}
            {tab === 'interventions' && (
              <EffectivenessChart courseId={selectedCourseId} />
            )}
            {tab === 'cross-section' && selectedCourse?.code && (
              <CrossSectionTable courseCode={selectedCourse.code} />
            )}
          </div>
        </>
      )}

      {/* Concept detail slide-out */}
      {selectedConcept && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l shadow-xl overflow-y-auto">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-lg text-gray-900">{selectedConcept.conceptLabel}</h2>
              <button
                onClick={() => setSelectedConcept(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Mastery Rate</span>
                <span className="font-extrabold">{Math.round(selectedConcept.masteryRate * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Difficulty</span>
                <span className="font-extrabold">{selectedConcept.difficulty.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Encounters</span>
                <span className="font-extrabold">{selectedConcept.encounterCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sandy Questions</span>
                <span className="font-extrabold">{selectedConcept.sandyQuestionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">7-day Trend</span>
                <span className={`font-extrabold ${selectedConcept.delta7d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedConcept.delta7d >= 0 ? '+' : ''}{Math.round(selectedConcept.delta7d * 100)}%
                </span>
              </div>
              {selectedConcept.misconceptions.length > 0 && (
                <div className="mt-4">
                  <p className="font-extrabold text-gray-700 mb-2">Misconceptions</p>
                  {selectedConcept.misconceptions.map((m, i) => (
                    <div key={i} className="bg-red-50 border border-red-100 rounded-xl p-3 mb-2">
                      <p className="font-semibold text-red-800 text-xs">{m.type} ({m.count}x)</p>
                      <p className="text-red-600 text-xs mt-1">{m.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
