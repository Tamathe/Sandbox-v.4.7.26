'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, Check } from 'lucide-react'
import ErrorBanner from '../ErrorBanner'
import type { AIStance, DisciplineFamily } from '../../generated/prisma'

interface InlinePolicyLiteProps {
  stance: AIStance
  userEmail: string
  onComplete: () => void
  onSkip: () => void
}

interface CourseForWizard {
  id: string
  courseCode: string
  title: string
  hasAIPolicy: boolean
  assignments: { title: string; level: string }[]
}

interface GeneratedPolicy {
  mainParagraph: string
  assignmentTable: { title: string; level: string; explanation: string }[]
  disclosureRequirements: string
  consequencesLanguage: string
  fullText: string
}

type Phase = 'loading' | 'ready' | 'generating' | 'preview' | 'saving' | 'done'

const STANCE_LABELS: Record<AIStance, string> = {
  PROHIBIT: 'Prohibit',
  CAUTIOUS: 'Cautious',
  GUIDED: 'Guided',
  INTEGRATE: 'Integrate',
  REQUIRE: 'Require',
}

export default function InlinePolicyLite({ stance, userEmail, onComplete, onSkip }: InlinePolicyLiteProps) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [courses, setCourses] = useState<CourseForWizard[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [savedCourseCode, setSavedCourseCode] = useState('')
  const [disciplineFamily, setDisciplineFamily] = useState<DisciplineFamily | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [generatedPolicy, setGeneratedPolicy] = useState<GeneratedPolicy | null>(null)

  // Load courses on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/ai-literacy/policy', {
          headers: { 'x-demo-user-email': userEmail },
        })
        if (!res.ok) throw new Error('Failed to load courses')
        const data = await res.json()
        setCourses(data.courses ?? [])
        setDisciplineFamily(data.disciplineFamily ?? undefined)
        if (data.courses?.length > 0) {
          setSelectedCourseId(data.courses[0].id)
        }
        setPhase('ready')
      } catch {
        setError('Could not load your courses. You can skip and do this later.')
        setPhase('ready')
      }
    }
    load()
  }, [userEmail])

  const selectedCourse = courses.find(c => c.id === selectedCourseId)

  const handleGenerate = useCallback(async () => {
    if (!selectedCourse) return
    setPhase('generating')
    setError(null)

    try {
      const genRes = await fetch('/api/ai-literacy/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({
          action: 'generate',
          stance,
          courseName: selectedCourse.title,
          assignmentLevels: selectedCourse.assignments.map(a => ({
            title: a.title,
            level: a.level,
          })),
          disciplineFamily,
        }),
      })
      if (!genRes.ok) throw new Error('Generation failed')
      const policy = await genRes.json()
      setGeneratedPolicy(policy)
      setPhase('preview')
    } catch {
      setError('Something went wrong generating your policy. Try again or skip for now.')
      setPhase('ready')
    }
  }, [selectedCourse, stance, userEmail, disciplineFamily])

  const handleSave = useCallback(async () => {
    if (!selectedCourse || !generatedPolicy) return
    setPhase('saving')
    setError(null)

    try {
      const saveRes = await fetch('/api/ai-literacy/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({
          action: 'save',
          courseId: selectedCourse.id,
          stance,
          policyText: generatedPolicy.fullText,
          policyJson: generatedPolicy,
        }),
      })
      if (!saveRes.ok) throw new Error('Save failed')

      setSavedCourseCode(selectedCourse.courseCode)
      try { localStorage.setItem('uky-last-policy-name', `${selectedCourse.courseCode} AI Policy`) } catch {}
      setPhase('done')
    } catch {
      setError('Could not save the policy. Try again.')
      setPhase('preview')
    }
  }, [selectedCourse, generatedPolicy, stance, userEmail])

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-5 max-w-2xl">
      {/* Loading */}
      {phase === 'loading' && (
        <div className="flex items-center gap-3 py-6 justify-center">
          <Loader2 className="size-5 text-[#0033A0] animate-spin" />
          <span className="text-sm text-gray-500">Loading your courses…</span>
        </div>
      )}

      {/* Ready — no courses */}
      {phase === 'ready' && courses.length === 0 && !error && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Add a course first to generate a policy. You can do this later.
          </p>
          <button
            onClick={onSkip}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Skip for now
          </button>
        </div>
      )}

      {/* Ready — courses available */}
      {phase === 'ready' && courses.length > 0 && (
        <div className="space-y-4">
          {/* Course dropdown */}
          <div>
            <label htmlFor="policy-course" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Course
            </label>
            <select
              id="policy-course"
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.courseCode} — {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            className="w-full px-6 py-2.5 bg-[#0033A0] text-white rounded-lg hover:bg-[#002880] text-sm font-medium transition-colors"
          >
            Apply recommended AI levels for your {STANCE_LABELS[stance]} stance
          </button>

          {/* Skip */}
          <button
            onClick={onSkip}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Skip for now
          </button>

          {/* Error */}
          {error && <ErrorBanner message={error} retry={handleGenerate} />}
        </div>
      )}

      {/* Generating */}
      {phase === 'generating' && (
        <div className="flex items-center gap-3 py-6 justify-center">
          <Loader2 className="size-5 text-[#0033A0] animate-spin" />
          <span className="text-sm text-gray-600">Generating policy…</span>
        </div>
      )}

      {/* Preview — show policy text before saving */}
      {phase === 'preview' && generatedPolicy && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Generated policy for {selectedCourse?.courseCode}
            </p>
            <div className="max-h-64 overflow-y-auto p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {generatedPolicy.fullText}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-[#0033A0] text-white rounded-lg hover:bg-[#002880] text-sm font-medium transition-colors"
            >
              Save to Course
            </button>
            <Link
              href="/ai-literacy/policy"
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Edit first in Policy Builder
            </Link>
          </div>

          {error && <ErrorBanner message={error} />}
        </div>
      )}

      {/* Saving */}
      {phase === 'saving' && (
        <div className="flex items-center gap-3 py-6 justify-center">
          <Loader2 className="size-5 text-[#0033A0] animate-spin" />
          <span className="text-sm text-gray-600">Saving policy to {selectedCourse?.courseCode}…</span>
        </div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="size-4 text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              Policy created for {savedCourseCode}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onComplete}
              className="px-6 py-2.5 bg-[#0033A0] text-white rounded-lg hover:bg-[#002880] text-sm font-medium transition-colors"
            >
              Done
            </button>
            <Link
              href="/ai-literacy/policy"
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Customize in Policy Builder →
            </Link>
          </div>
        </div>
      )}

      {/* Error in loading state shows here */}
      {phase === 'ready' && courses.length === 0 && error && (
        <div className="space-y-4">
          <ErrorBanner message={error} />
          <button
            onClick={onSkip}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  )
}
