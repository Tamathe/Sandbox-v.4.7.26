'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import SegmentedControl from '../../components/SegmentedControl'
import {
  ArrowLeft,
  Lightbulb,
  Target,
  FileText,
  HelpCircle,
  Eye,
  EyeOff,
  Loader2,
  FlaskConical,
  GraduationCap,
} from 'lucide-react'
import FlashcardCarousel from '../../components/lecture-debrief/FlashcardCarousel'
import CheckQuestionCard from '../../components/lecture-debrief/CheckQuestionCard'
import CoverageTable from '../../components/lecture-debrief/CoverageTable'

interface ConceptExtraction {
  slug: string
  label: string
  bloomLevel: number
  isNew: boolean
  isReinforcement: boolean
}

const BLOOM_LABELS = ['', 'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']

type TabId = 'concepts' | 'coverage' | 'guide' | 'questions'

const FACULTY_TABS: { id: TabId; label: string; icon: typeof Lightbulb }[] = [
  { id: 'concepts', label: 'Concepts', icon: Lightbulb },
  { id: 'coverage', label: 'Coverage', icon: Target },
  { id: 'guide', label: 'Study Guide', icon: FileText },
  { id: 'questions', label: 'Questions', icon: HelpCircle },
]

export default function DebriefDetailPage({
  params,
}: {
  params: Promise<{ debriefId: string }>
}) {
  const { debriefId } = use(params)
  const { currentUser } = useAuth()
  const router = useRouter()

  const isEducator = currentUser?.role === 'EDUCATOR' || currentUser?.role === 'ADMIN'
  const isStudent = currentUser?.role === 'STUDENT' || currentUser?.role === 'ADMIN'

  const [debrief, setDebrief] = useState<Record<string, unknown> | null>(null)
  const [studentGuide, setStudentGuide] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>(isEducator ? 'concepts' : 'guide')
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    if (!currentUser) return

    setLoading(true)

    // Fetch debrief
    fetch(`/api/lecture-debrief/${debriefId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setDebrief(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    // If student, also fetch personalized guide
    if (isStudent && !isEducator) {
      fetch(`/api/lecture-debrief/${debriefId}/study-guide`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) setStudentGuide(data)
        })
        .catch(() => {})
    }
  }, [debriefId, currentUser, isStudent, isEducator])

  async function handlePublishToggle() {
    if (!currentUser || !debrief) return
    setPublishing(true)
    const isPublished = !!(debrief.publishedAt)
    await fetch(`/api/lecture-debrief/${debriefId}/publish`, {
      method: isPublished ? 'DELETE' : 'POST',
      headers: { 'x-demo-user-email': currentUser.email },
    })
    // Refresh
    const res = await fetch(`/api/lecture-debrief/${debriefId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
    const data = await res.json()
    if (!data.error) setDebrief(data)
    setPublishing(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!debrief) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Debrief not found.</p>
      </div>
    )
  }

  const concepts = (debrief.conceptsExtracted as ConceptExtraction[] | null) ?? []
  const covered = (debrief.objectivesCovered as Record<string, unknown>[] | null) ?? []
  const gaps = (debrief.coverageGaps as Record<string, unknown>[] | null) ?? []
  const studyGuide = (debrief.studyGuide as Record<string, unknown>[] | null) ?? []
  const flashcards = (debrief.flashcards as Record<string, unknown>[] | null) ?? []
  const checkQuestions = (debrief.checkQuestions as Record<string, unknown>[] | null) ?? []
  const courseCode = (debrief.course as Record<string, unknown>)?.courseCode as string || ''
  const studentContext = studentGuide?.studentContext as Record<string, unknown> | undefined

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header — Pattern A */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            type="button"
            onClick={() => router.push('/lecture-debrief')}
            className="flex items-center gap-1 text-gray-400 hover:text-[#0033A0] text-sm mb-3 cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            Back to Debriefs
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">
                {(debrief.title as string) || 'Lecture Debrief'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {courseCode} · {new Date(debrief.lectureDate as string).toLocaleDateString()} ·{' '}
                {concepts.length} concepts
              </p>
            </div>

            {isEducator && debrief.status === 'complete' && (
              <button
                type="button"
                onClick={handlePublishToggle}
                disabled={publishing}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  debrief.publishedAt
                    ? 'border-2 border-gray-200 text-gray-700 hover:border-[#0033A0]'
                    : 'bg-[#0033A0] text-white hover:bg-[#002580]'
                }`}
              >
                {publishing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : debrief.publishedAt ? (
                  <>
                    <EyeOff className="size-4" /> Unpublish
                  </>
                ) : (
                  <>
                    <Eye className="size-4" /> Publish to Students
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Student personalized banner */}
        {studentContext && (
          <div className="mb-6 p-4 rounded-2xl bg-blue-50 border-2 border-blue-200">
            <div className="flex items-start gap-3">
              <Lightbulb className="size-5 text-[#0033A0] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-[#0033A0]">Personalized for you</p>
                <p className="text-sm text-blue-800 mt-0.5">
                  {studentContext.focusRecommendation as string}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs (faculty sees all 4, student sees guide + questions) */}
        {isEducator ? (
          <SegmentedControl
            value={activeTab}
            onChange={setActiveTab}
            options={FACULTY_TABS.map(t => ({ value: t.id, label: <><t.icon className="size-4" />{t.label}</> }))}
            className="mb-6"
          />
        ) : (
          <SegmentedControl
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: 'guide' as TabId, label: <><FileText className="size-4" />Study Guide</> },
              { value: 'questions' as TabId, label: <><HelpCircle className="size-4" />Check Questions</> },
            ]}
            className="mb-6"
          />
        )}

        {/* Tab Content */}
        {activeTab === 'concepts' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {concepts.map((c, i) => (
              <div
                key={i}
                className="rounded-2xl border-2 border-gray-200 bg-white p-4 hover:border-[#0033A0] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-bold text-gray-900">{c.label}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-[#0033A0] font-medium shrink-0 ml-2">
                    {BLOOM_LABELS[c.bloomLevel] || `L${c.bloomLevel}`}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 font-mono">{c.slug}</p>
                <div className="flex gap-1.5 mt-3">
                  {c.isNew && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                      New
                    </span>
                  )}
                  {c.isReinforcement && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">
                      Reinforcement
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'coverage' && (
          <CoverageTable
            covered={covered as unknown as Parameters<typeof CoverageTable>[0]['covered']}
            gaps={gaps as unknown as Parameters<typeof CoverageTable>[0]['gaps']}
          />
        )}

        {activeTab === 'guide' && (
          <div className="space-y-8">
            {/* Study Guide Sections */}
            <div className="space-y-4">
              {(studyGuide as { heading: string; content: string; conceptSlugs: string[] }[]).map(
                (section, i) => {
                  const weakConcepts = (studentContext?.weakConcepts as string[]) ?? []
                  const isWeak = section.conceptSlugs?.some((s: string) => weakConcepts.includes(s))

                  return (
                    <div
                      key={i}
                      className={`rounded-2xl border-2 bg-white p-6 ${
                        isWeak ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'
                      }`}
                    >
                      {isWeak && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium mb-2 inline-block">
                          Focus area
                        </span>
                      )}
                      <h3 className="text-base font-extrabold text-gray-900 mb-3">
                        {section.heading}
                      </h3>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        {section.content.split('\n').map((line: string, j: number) => (
                          <p key={j}>{line}</p>
                        ))}
                      </div>
                    </div>
                  )
                }
              )}
            </div>

            {/* Flashcards */}
            {(flashcards as { front: string; back: string; conceptSlug: string; bloomLevel: number }[]).length > 0 && (
              <div className="rounded-2xl border-2 border-gray-200 bg-white p-6">
                <h3 className="text-base font-extrabold text-gray-900 mb-4">Flashcards</h3>
                <FlashcardCarousel
                  flashcards={flashcards as { front: string; back: string; conceptSlug: string; bloomLevel: number }[]}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-4">
            {(checkQuestions as unknown as Parameters<typeof CheckQuestionCard>[0]['question'][]).map(
              (q, i) => (
                <CheckQuestionCard key={i} question={q} index={i} />
              )
            )}

            {/* Cross-tool CTAs */}
            {isStudent && (
              <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    const courseId = debrief.courseId as string
                    router.push(`/exam-forge?courseId=${courseId}`)
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-200 hover:border-[#0033A0] bg-white text-sm font-semibold text-gray-700 hover:text-[#0033A0] transition-colors cursor-pointer"
                >
                  <FlaskConical className="size-4" />
                  Practice with Exam Forge
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/teach-back')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-200 hover:border-[#0033A0] bg-white text-sm font-semibold text-gray-700 hover:text-[#0033A0] transition-colors cursor-pointer"
                >
                  <GraduationCap className="size-4" />
                  Teach It Back
                </button>
              </div>
            )}
          </div>
        )}

        {/* Processing status */}
        {debrief.status === 'processing' && (
          <div className="mt-8 p-6 rounded-2xl border-2 border-amber-200 bg-amber-50 text-center">
            <Loader2 className="size-8 animate-spin text-amber-500 mx-auto mb-3" />
            <p className="text-sm font-bold text-amber-800">Generating your debrief...</p>
            <p className="text-xs text-amber-600 mt-1">
              Running 4-pass analysis: concepts → syllabus mapping → study guide → check questions
            </p>
          </div>
        )}

        {debrief.status === 'failed' && (
          <div className="mt-8 p-6 rounded-2xl border-2 border-red-200 bg-red-50 text-center">
            <p className="text-sm font-bold text-red-800">Debrief generation failed</p>
            <p className="text-xs text-red-600 mt-1">Please try again with different content.</p>
          </div>
        )}
      </div>
    </div>
  )
}
