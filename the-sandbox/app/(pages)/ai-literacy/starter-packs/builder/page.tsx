'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Shield, AlertTriangle, ThumbsUp, Rocket, ChevronLeft, ArrowRight, Package, Check } from 'lucide-react'
import { useAuth } from '../../../../lib/auth-context'
import { apiFetch } from '../../../../lib/api-client'
import PageHeader from '../../../../components/PageHeader'
import ErrorBanner from '../../../../components/ErrorBanner'

type DisciplineFamily = 'STEM' | 'HUMANITIES' | 'SOCIAL_SCIENCES' | 'ARTS' | 'PROFESSIONAL' | 'HEALTH_SCIENCES'

const DISCIPLINES: { key: DisciplineFamily; label: string; emoji: string }[] = [
  { key: 'STEM', label: 'STEM', emoji: '🔬' },
  { key: 'HUMANITIES', label: 'Humanities', emoji: '📚' },
  { key: 'SOCIAL_SCIENCES', label: 'Social Sciences', emoji: '🌍' },
  { key: 'ARTS', label: 'Arts', emoji: '🎨' },
  { key: 'PROFESSIONAL', label: 'Professional', emoji: '💼' },
  { key: 'HEALTH_SCIENCES', label: 'Health Sciences', emoji: '🏥' },
]

const COMFORT_LEVELS = [
  { key: 'NERVOUS', label: 'Nervous', desc: 'I want strict guardrails and minimal AI involvement', Icon: Shield },
  { key: 'CAUTIOUS', label: 'Cautious', desc: 'Open to AI but want clear boundaries', Icon: AlertTriangle },
  { key: 'OPEN', label: 'Open', desc: 'Ready to experiment with guided AI use', Icon: ThumbsUp },
  { key: 'ENTHUSIASTIC', label: 'Enthusiastic', desc: 'Eager to push AI integration forward', Icon: Rocket },
]

const ASSIGNMENT_TYPES = [
  'Essay', 'Lab', 'Problem Set', 'Case Study', 'Presentation', 'Project', 'Exam', 'Discussion',
]

const TOTAL_STEPS = 5

interface CourseOption {
  id: string
  courseCode: string
  title: string
}

export default function PackBuilderPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [prefilled, setPrefilled] = useState<string[]>([]) // which fields were pre-filled

  // Streaming build state
  const [buildPhase, setBuildPhase] = useState('')
  const [buildMessage, setBuildMessage] = useState('')
  const [buildItems, setBuildItems] = useState<{ templateId: string; title: string; description: string; aiTier: string; aiLevel: string; assignmentType: string }[]>([])
  const [policyText, setPolicyText] = useState('')
  const [timelineSteps, setTimelineSteps] = useState<{ week: number; action: string }[]>([])
  const [packId, setPackId] = useState<string | null>(null)
  const [buildError, setBuildError] = useState<string | null>(null)

  // Form state
  const [discipline, setDiscipline] = useState<DisciplineFamily | null>(null)
  const [courseId, setCourseId] = useState('')
  const [courseDescription, setCourseDescription] = useState('')
  const [comfortLevel, setComfortLevel] = useState('')
  const [assignmentTypes, setAssignmentTypes] = useState<string[]>([])
  const [concerns, setConcerns] = useState('')

  // Course options
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await apiFetch<{ courses?: CourseOption[] }>(currentUser.email, '/api/courses')
        setCourses(data.courses ?? [])
      } catch (err) {
        console.error('Failed to load courses for starter pack builder:', err)
      }
      setCoursesLoading(false)
    }
    void loadCourses()
  }, [currentUser.email])

  // Read URL params + fetch profile data to pre-fill form
  useEffect(() => {
    const paramDiscipline = searchParams.get('discipline') as DisciplineFamily | null
    const paramComfort = searchParams.get('comfort')
    const paramCourseId = searchParams.get('courseId')

    if (paramDiscipline) { setDiscipline(paramDiscipline); setPrefilled(p => [...p, 'discipline']) }
    if (paramComfort) { setComfortLevel(paramComfort); setPrefilled(p => [...p, 'comfort']) }
    if (paramCourseId) { setCourseId(paramCourseId); setPrefilled(p => [...p, 'course']) }

    // Then try to fetch profile data to fill any remaining gaps
    async function loadProfile() {
      try {
        const data = await apiFetch<{ profile?: { disciplineFamily?: DisciplineFamily; comfort?: number } }>(
          currentUser.email,
          '/api/ai-literacy/quick-start?view=progress',
        )
        // If discipline not already set from URL params
        if (!paramDiscipline && data.profile?.disciplineFamily) {
          setDiscipline(data.profile.disciplineFamily)
          setPrefilled(p => [...p, 'discipline'])
        }
        // Map comfort score to comfort level if not already set
        if (!paramComfort && data.profile?.comfort != null) {
          const score = data.profile.comfort as number
          const level = score <= 30 ? 'NERVOUS' : score <= 50 ? 'CAUTIOUS' : score <= 75 ? 'OPEN' : 'ENTHUSIASTIC'
          setComfortLevel(level)
          setPrefilled(p => [...p, 'comfort'])
        }
      } catch {
        // Non-fatal — profile pre-fill is a nice-to-have
      }
      setProfileLoaded(true)
    }

    void loadProfile()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps — intentionally run once

  // Smart step skipping — jump past pre-filled steps
  useEffect(() => {
    if (!profileLoaded) return
    // Find first step that needs user input
    if (prefilled.includes('discipline') && step === 1) {
      setStep(2) // skip discipline, go to course
    }
  }, [profileLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  const canProceed = () => {
    switch (step) {
      case 1: return discipline !== null
      case 2: return courseId !== ''
      case 3: return comfortLevel !== ''
      case 4: return assignmentTypes.length > 0
      case 5: return true // concerns are optional
      default: return false
    }
  }

  const toggleAssignmentType = (type: string) => {
    setAssignmentTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setBuildPhase('starting')
    setBuildMessage('Starting...')
    setBuildItems([])
    setPolicyText('')
    setTimelineSteps([])
    setPackId(null)
    setBuildError(null)

    try {
      const res = await fetch('/api/ai-literacy/starter-packs/builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          discipline,
          courseId,
          courseDescription,
          comfortLevel,
          assignmentTypes,
          concerns: concerns || undefined,
        }),
      })

      if (!res.ok || !res.body) {
        setBuildError('Failed to start builder')
        setSubmitting(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Parse SSE events from buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // keep incomplete line in buffer

        let currentEventType = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim()
          } else if (line.startsWith('data: ') && currentEventType) {
            try {
              const data = JSON.parse(line.slice(6))
              switch (data.type) {
                case 'status':
                  setBuildPhase(data.phase)
                  setBuildMessage(data.message)
                  break
                case 'template_selected':
                  setBuildItems(prev => [...prev, {
                    templateId: data.templateId,
                    title: data.title,
                    description: data.description,
                    aiTier: data.aiTier,
                    aiLevel: data.aiLevel,
                    assignmentType: data.assignmentType,
                  }])
                  break
                case 'policy_chunk':
                  setPolicyText(prev => prev + data.text)
                  break
                case 'timeline':
                  setTimelineSteps(data.steps)
                  break
                case 'complete':
                  setPackId(data.packId)
                  break
                case 'error':
                  setBuildError(data.message)
                  break
              }
            } catch { /* skip malformed */ }
            currentEventType = ''
          }
        }
      }
    } catch {
      setBuildError('Connection lost')
      setSubmitting(false)
    }
  }

  if (submitting) {
    return (
      <>
        <PageHeader
          title="Build Your Pack"
          subtitle="Answer a few questions and we'll create a personalized AI integration pack"
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Phase indicator */}
          <div className="flex items-center gap-3 mb-8">
            {!packId && <Loader2 className="size-5 animate-spin text-[#0033A0]" />}
            <span className="text-sm font-medium text-gray-700">{buildMessage}</span>
          </div>

          {/* Error state */}
          {buildError && (
            <div className="mb-6">
              <ErrorBanner message={buildError} retry={() => { setSubmitting(false); setBuildError(null) }} />
            </div>
          )}

          {/* Assignment cards appearing one by one */}
          {buildItems.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Selected Assignments</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {buildItems.map((item) => (
                  <div
                    key={item.templateId}
                    className="border rounded-2xl shadow-sm bg-white p-4 transition-opacity duration-300"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-[#0033A0]">
                        {item.aiTier}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Policy text streaming in */}
          {policyText && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Your AI Policy</h3>
              <div className="border rounded-2xl shadow-sm bg-white p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{policyText}</p>
                {!packId && <span className="inline-block w-0.5 h-4 bg-[#0033A0] animate-pulse ml-0.5" />}
              </div>
            </div>
          )}

          {/* Timeline */}
          {timelineSteps.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Implementation Timeline</h3>
              <div className="border rounded-2xl shadow-sm bg-white p-4 space-y-2">
                {timelineSteps.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-xs font-mono text-gray-400 shrink-0 w-12">Week {s.week}</span>
                    <span className="text-gray-700">{s.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Complete — show CTA to view pack */}
          {packId && (
            <div className="text-center py-6">
              <div className="inline-flex items-center gap-2 text-green-600 mb-4">
                <Check className="size-5" />
                <span className="font-semibold">Your pack is ready!</span>
              </div>
              <div>
                <button
                  onClick={() => router.push(`/ai-literacy/starter-packs/${packId}`)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#0033A0] text-white rounded-lg text-sm font-medium hover:bg-[#002880] transition-colors"
                >
                  View Your Pack
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Build Your Pack"
        subtitle="Answer a few questions and we'll create a personalized AI integration pack"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const stepNum = i + 1
            const isCurrent = stepNum === step
            const isCompleted = stepNum < step || (
              (stepNum === 1 && prefilled.includes('discipline')) ||
              (stepNum === 3 && prefilled.includes('comfort'))
            )
            return (
              <div
                key={stepNum}
                className={`size-3 rounded-full transition-colors ${
                  isCompleted ? 'bg-[#0033A0]' :
                  isCurrent ? 'ring-2 ring-[#0033A0] bg-white' :
                  'bg-gray-200'
                }`}
              />
            )
          })}
        </div>

        {/* Step Content */}
        <div className="border rounded-2xl shadow-sm bg-white p-6 sm:p-8">
          {/* Step 1: Discipline */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">What discipline is your course in?</h2>
              <p className="text-sm text-gray-500 mb-6">Select the family that best fits your course</p>
              {prefilled.includes('discipline') && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 mb-3">
                  <Check className="size-3.5" />
                  <span>Pre-filled from your profile</span>
                  <button onClick={() => { setPrefilled(p => p.filter(f => f !== 'discipline')); setStep(1) }} className="text-gray-400 hover:text-gray-600 ml-1 underline">Edit</button>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {DISCIPLINES.map(d => (
                  <button
                    key={d.key}
                    onClick={() => setDiscipline(d.key)}
                    className={`p-5 border rounded-2xl text-center transition-all ${
                      discipline === d.key
                        ? 'ring-2 ring-[#0033A0] border-[#0033A0] bg-blue-50/50'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="text-2xl mb-2">{d.emoji}</div>
                    <div className="text-sm font-semibold text-gray-900">{d.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Course */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">Which course is this for?</h2>
              <p className="text-sm text-gray-500 mb-6">Select your course and describe it briefly</p>
              <div className="space-y-4">
                {coursesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="size-4 animate-spin" /> Loading courses...
                  </div>
                ) : (
                  <select
                    value={courseId}
                    onChange={e => setCourseId(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#0033A0] outline-none"
                  >
                    <option value="">Select a course</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.courseCode} — {c.title}</option>
                    ))}
                  </select>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tell us about your course
                  </label>
                  <textarea
                    value={courseDescription}
                    onChange={e => setCourseDescription(e.target.value)}
                    rows={3}
                    placeholder="Format, topics, class size, student level, etc."
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#0033A0] outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Comfort Level */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">How comfortable are you with AI in your classroom?</h2>
              <p className="text-sm text-gray-500 mb-6">This helps us calibrate the pack to your comfort level</p>
              {prefilled.includes('comfort') && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 mb-3">
                  <Check className="size-3.5" />
                  <span>Pre-filled from your profile</span>
                  <button onClick={() => { setPrefilled(p => p.filter(f => f !== 'comfort')); setStep(3) }} className="text-gray-400 hover:text-gray-600 ml-1 underline">Edit</button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COMFORT_LEVELS.map(level => (
                  <button
                    key={level.key}
                    onClick={() => setComfortLevel(level.key)}
                    className={`p-5 border rounded-2xl text-left transition-all ${
                      comfortLevel === level.key
                        ? 'ring-2 ring-[#0033A0] border-[#0033A0] bg-blue-50/50'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <level.Icon className={`size-6 mb-2 ${
                      comfortLevel === level.key ? 'text-[#0033A0]' : 'text-gray-400'
                    }`} />
                    <div className="text-sm font-semibold text-gray-900">{level.label}</div>
                    <p className="text-xs text-gray-500 mt-1">{level.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Assignment Types */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">What types of assignments do you use?</h2>
              <p className="text-sm text-gray-500 mb-6">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {ASSIGNMENT_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => toggleAssignmentType(type)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      assignmentTypes.includes(type)
                        ? 'bg-[#0033A0] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Concerns */}
          {step === 5 && (
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">Any specific concerns?</h2>
              <p className="text-sm text-gray-500 mb-6">Optional — help us address your worries in the pack</p>
              <textarea
                value={concerns}
                onChange={e => setConcerns(e.target.value)}
                rows={4}
                placeholder="Any specific concerns about AI in your classroom?"
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#0033A0] outline-none resize-none"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="size-4" />
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step === 5 && (
              <button
                onClick={handleSubmit}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-lg text-sm font-medium hover:bg-[#002880] disabled:opacity-50 transition-colors"
              >
                Next
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-lg text-sm font-medium hover:bg-[#002880] disabled:opacity-50 transition-colors"
              >
                <Package className="size-4" />
                Build My Pack
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
