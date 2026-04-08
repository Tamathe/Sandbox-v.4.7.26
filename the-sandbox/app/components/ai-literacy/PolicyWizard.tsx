'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle, Circle, BookOpen, Save, Loader2, Copy, Check } from 'lucide-react'
import AssignmentLevelMatrix from './AssignmentLevelMatrix'
import PolicyPreview from './PolicyPreview'
import { PolicyStanceBadge } from './StanceResult'
import { STANCE_DETAILS } from '../../lib/stance-constants'
import type { AIStance } from '../../generated/prisma'
import type { AssignmentAILevel } from './AssignmentLevelMatrix'

interface CourseOption {
  id: string
  courseCode: string
  title: string
  hasAIPolicy: boolean
  assignments: {
    assignmentId: string
    title: string
    category: string | null
    level: AssignmentAILevel
    suggestedLevel: AssignmentAILevel
  }[]
}

interface GeneratedPolicy {
  mainParagraph: string
  assignmentTable: { title: string; level: string; explanation: string }[]
  disclosureRequirements: string
  consequencesLanguage: string
  fullText: string
}

interface PolicyWizardProps {
  courses: CourseOption[]
  initialStance: AIStance
  userEmail: string
  onComplete: () => void
}

type Step = 'course' | 'assignments' | 'preview' | 'save'
const STEPS: { id: Step; label: string }[] = [
  { id: 'course', label: 'Course & Stance' },
  { id: 'assignments', label: 'Assignment Levels' },
  { id: 'preview', label: 'Review & Save' },
  { id: 'save', label: 'Done' },
]

const STANCES: AIStance[] = ['PROHIBIT', 'CAUTIOUS', 'GUIDED', 'INTEGRATE', 'REQUIRE']
const STANCE_LABELS: Record<AIStance, string> = {
  PROHIBIT: 'Prohibit', CAUTIOUS: 'Cautious', GUIDED: 'Guided', INTEGRATE: 'Integrate', REQUIRE: 'Require',
}

const STANCE_COLORS: Record<AIStance, { bg: string; border: string; accent: string }> = {
  PROHIBIT: { bg: 'bg-red-50', border: 'border-red-200', accent: 'border-red-300' },
  CAUTIOUS: { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'border-amber-300' },
  GUIDED: { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'border-blue-300' },
  INTEGRATE: { bg: 'bg-green-50', border: 'border-green-200', accent: 'border-green-300' },
  REQUIRE: { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'border-purple-300' },
}

function StancePolicyPreview({ stance }: { stance: AIStance }) {
  const detail = STANCE_DETAILS[stance]
  const colors = STANCE_COLORS[stance]
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(detail.syllabusLanguage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Split syllabusLanguage into paragraphs for readable rendering
  const paragraphs = detail.syllabusLanguage.split('\n\n')

  return (
    <div className={`border rounded-2xl overflow-hidden ${colors.border}`}>
      {/* Header bar */}
      <div className={`px-4 py-3 ${colors.bg} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-900">
            Sample Syllabus Language — {detail.label}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-white/60 rounded-lg transition-colors"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Policy text */}
      <div className="px-5 py-4 bg-white space-y-3 max-h-[420px] overflow-y-auto">
        {paragraphs.map((para, i) => {
          // Detect bullet sections (lines starting with •)
          const lines = para.split('\n')
          const isBulletBlock = lines.some(l => l.startsWith('•'))

          if (isBulletBlock) {
            return (
              <div key={i}>
                {lines.map((line, j) => {
                  if (line.startsWith('•')) {
                    return (
                      <div key={j} className="flex items-start gap-2 ml-1 mb-1">
                        <span className="mt-2 size-1.5 rounded-full bg-gray-400 shrink-0" />
                        <span className="text-sm text-gray-700 leading-relaxed">{line.slice(2)}</span>
                      </div>
                    )
                  }
                  // Section header (e.g., "What this means in practice:")
                  return (
                    <p key={j} className="text-sm font-semibold text-gray-800 mt-2 mb-1">{line}</p>
                  )
                })}
              </div>
            )
          }

          // Regular paragraph — check if it's a "Why this policy:" line
          if (para.startsWith('Why this policy:')) {
            return (
              <p key={i} className="text-sm text-gray-600 italic leading-relaxed">
                {para}
              </p>
            )
          }

          return (
            <p key={i} className="text-sm text-gray-700 leading-relaxed">{para}</p>
          )
        })}
      </div>

      {/* Footer — philosophy one-liner */}
      <div className={`px-5 py-3 border-t ${colors.border} ${colors.bg}`}>
        <p className="text-xs text-gray-500 italic">{detail.philosophy}</p>
      </div>
    </div>
  )
}

export default function PolicyWizard({ courses, initialStance, userEmail, onComplete }: PolicyWizardProps) {
  const [step, setStep] = useState<Step>('course')
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [stance, setStance] = useState<AIStance>(initialStance)
  const [assignments, setAssignments] = useState<CourseOption['assignments']>([])
  const [policy, setPolicy] = useState<GeneratedPolicy | null>(null)
  const [editedFullText, setEditedFullText] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishToStudents, setPublishToStudents] = useState(false)
  const [addToCoursePolicy, setAddToCoursePolicy] = useState(true)

  const selectedCourse = courses.find(c => c.id === selectedCourseId)
  const stepIndex = STEPS.findIndex(s => s.id === step)

  function selectCourse(courseId: string) {
    const course = courses.find(c => c.id === courseId)
    if (!course) return
    setSelectedCourseId(courseId)
    setAssignments(course.assignments)
  }

  function handleAssignmentChange(assignmentId: string, level: AssignmentAILevel) {
    setAssignments(prev => prev.map(a => a.assignmentId === assignmentId ? { ...a, level } : a))
  }

  async function generatePolicyPreview() {
    if (!selectedCourse) return
    setGenerating(true)
    try {
      const res = await fetch('/api/ai-literacy/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({
          action: 'generate',
          stance,
          courseName: `${selectedCourse.courseCode} — ${selectedCourse.title}`,
          assignmentLevels: assignments.map(a => ({ title: a.title, level: a.level })),
        }),
      })
      if (res.ok) {
        const data: GeneratedPolicy = await res.json()
        setPolicy(data)
        setEditedFullText(null)
      }
    } catch {
      // handle error
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!selectedCourse || !policy) return
    setSaving(true)
    try {
      const res = await fetch('/api/ai-literacy/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({
          action: 'save',
          courseId: selectedCourse.id,
          stance,
          policyText: editedFullText ?? policy.fullText,
          policyJson: {
            assignmentLevels: assignments.map(a => ({ assignmentId: a.assignmentId, title: a.title, level: a.level })),
            disclosureRequirements: policy.disclosureRequirements,
            consequencesLanguage: policy.consequencesLanguage,
          },
          publishToStudents,
          addToCoursePolicy,
        }),
      })
      if (res.ok) {
        setStep('save')
      }
    } catch {
      // handle error
    } finally {
      setSaving(false)
    }
  }

  function goNext() {
    const idx = STEPS.findIndex(s => s.id === step)
    if (idx < STEPS.length - 1) {
      const next = STEPS[idx + 1].id
      if (next === 'preview') {
        void generatePolicyPreview()
      }
      setStep(next)
    }
  }

  function goBack() {
    const idx = STEPS.findIndex(s => s.id === step)
    if (idx > 0) setStep(STEPS[idx - 1].id)
  }

  const canAdvance = step === 'course' ? !!selectedCourseId
    : step === 'assignments' ? true
    : step === 'preview' ? !!policy
    : false

  return (
    <div className="max-w-3xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            {i < stepIndex ? (
              <CheckCircle className="size-5 text-[#0033A0]" />
            ) : i === stepIndex ? (
              <Circle className="size-5 text-[#0033A0] fill-[#0033A0]" />
            ) : (
              <Circle className="size-5 text-gray-300" />
            )}
            <span className={`text-[10px] sm:text-xs ${i === stepIndex ? 'text-[#0033A0] font-semibold' : 'text-gray-400'}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="w-6 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Course + Stance (combined) */}
      {step === 'course' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Select course &amp; stance</h2>
          </div>

          {/* Course selection */}
          <div className="space-y-2">
            {courses.map(c => (
              <button
                key={c.id}
                onClick={() => selectCourse(c.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selectedCourseId === c.id
                    ? 'border-[#0033A0] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-900">{c.courseCode}</span>
                    <span className="text-gray-400 mx-1.5">—</span>
                    <span className="text-gray-600">{c.title}</span>
                  </div>
                  {c.hasAIPolicy && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">Has policy</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Inline stance picker (compact) */}
          {selectedCourseId && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">AI stance for this course</label>
                <div className="flex flex-wrap gap-2">
                  {STANCES.map(s => (
                    <button
                      key={s}
                      onClick={() => setStance(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        stance === s ? 'border-[#0033A0] bg-blue-50 text-[#0033A0]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {STANCE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live policy preview */}
              <StancePolicyPreview stance={stance} />
            </div>
          )}
        </div>
      )}

      {/* Step 3: Assignment levels */}
      {step === 'assignments' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">AI levels per assignment</h2>
            <p className="text-sm text-gray-600 mt-1">
              We&apos;ve suggested levels based on your stance and assignment types. Adjust any that don&apos;t fit.
            </p>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            We&apos;ve pre-assigned AI levels based on your stance. Hover any level to see what it means. Adjust any that don&apos;t fit your course.
          </p>
          <AssignmentLevelMatrix assignments={assignments} onChange={handleAssignmentChange} />
        </div>
      )}

      {/* Step 4: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Review your AI policy</h2>
            <p className="text-sm text-gray-600 mt-1">
              Edit any section, then save when ready. This will be added to your course policies.
            </p>
          </div>
          {generating ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Generating policy...</span>
            </div>
          ) : policy ? (
            <>
              <PolicyPreview
                mainParagraph={policy.mainParagraph}
                assignmentTable={policy.assignmentTable}
                disclosureRequirements={policy.disclosureRequirements}
                consequencesLanguage={policy.consequencesLanguage}
                fullText={editedFullText ?? policy.fullText}
                onEditFullText={setEditedFullText}
              />

              {/* Save options */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addToCoursePolicy}
                    onChange={e => setAddToCoursePolicy(e.target.checked)}
                    className="size-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
                  />
                  <span className="text-sm text-gray-700">Add to course policies (visible in Policies tab)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishToStudents}
                    onChange={e => setPublishToStudents(e.target.checked)}
                    className="size-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
                  />
                  <span className="text-sm text-gray-700">Publish to students immediately</span>
                </label>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Step 5: Success */}
      {step === 'save' && (
        <div className="text-center space-y-6 py-8">
          <div className="mx-auto size-16 bg-green-50 rounded-2xl flex items-center justify-center">
            <CheckCircle className="size-8 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Policy saved!</h2>
            <p className="text-sm text-gray-600 mt-2">
              Your AI policy for <strong>{selectedCourse?.courseCode}</strong> has been saved
              {addToCoursePolicy ? ' and added to your course policies' : ''}.
              {publishToStudents ? ' Students can now see it.' : ''}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => { setSelectedCourseId(null); setPolicy(null); setStep('course') }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Build another policy
            </button>
            <button
              onClick={onComplete}
              className="px-6 py-2 text-sm font-medium bg-[#0033A0] text-white rounded-lg hover:bg-[#002880]"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      {step !== 'save' && (
        <div className="flex justify-between mt-8 pt-4 border-t border-gray-200">
          <button
            onClick={goBack}
            disabled={stepIndex === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>

          {step === 'preview' && policy ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0033A0] text-white rounded-lg hover:bg-[#002880] font-medium text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save Policy
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!canAdvance}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0033A0] text-white rounded-lg hover:bg-[#002880] font-medium text-sm disabled:opacity-40"
            >
              Next
              <ChevronRight className="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
