'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, FileCheck, Shield, ShieldAlert, ShieldCheck,
  BookOpen, Loader2, CheckCircle, AlertCircle,
} from 'lucide-react'
import { useAuth } from '../../../../lib/auth-context'
import PageHeader from '../../../../components/PageHeader'
import ClarityCheck from '../../../../components/ai-literacy/ClarityCheck'
import PathwayNav from '../../../../components/ai-literacy/PathwayNav'

interface CourseWithPolicy {
  course: { id: string; title: string; code: string; instructor: string }
  policy: {
    id: string
    stance: string
    policyText: string
    publishedToStudents: boolean
    publishedAt: string | null
  } | null
  clarityScore: number | null
  hasTakenClarityCheck: boolean
}

const STANCE_LABELS: Record<string, string> = {
  PROHIBIT: 'No AI Use',
  CAUTIOUS: 'Limited AI Use',
  GUIDED: 'Guided AI Use',
  INTEGRATE: 'AI Integrated',
  REQUIRE: 'AI Required',
}

const STANCE_DESCRIPTIONS: Record<string, string> = {
  PROHIBIT: 'AI tools are not permitted for coursework in this class.',
  CAUTIOUS: 'AI may be used for brainstorming and grammar checking only.',
  GUIDED: 'AI use varies by assignment — check each one.',
  INTEGRATE: 'AI is a standard tool — use it critically and document your process.',
  REQUIRE: 'AI use is mandatory — you\'ll be assessed on how well you use it.',
}

const STANCE_COLORS: Record<string, { bg: string; text: string; border: string; icon: typeof Shield }> = {
  PROHIBIT: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: ShieldAlert },
  CAUTIOUS: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Shield },
  GUIDED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: ShieldCheck },
  INTEGRATE: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: ShieldCheck },
  REQUIRE: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: BookOpen },
}

function CoursePolicyCard({ data, onClarityComplete }: {
  data: CourseWithPolicy
  onClarityComplete: (courseId: string, score: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { course, policy, clarityScore, hasTakenClarityCheck } = data

  if (!policy) {
    return (
      <div className="border-2 border-gray-200 rounded-2xl shadow-sm p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">{course.code}</p>
            <h3 className="text-sm font-bold text-gray-900 mt-0.5">{course.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{course.instructor}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
          <AlertCircle className="size-3.5" />
          <span>No AI policy published yet — check with your instructor.</span>
        </div>
      </div>
    )
  }

  const stance = policy.stance
  const colors = STANCE_COLORS[stance] ?? STANCE_COLORS.GUIDED
  const StanceIcon = colors.icon

  return (
    <div className="border-2 border-gray-200 rounded-2xl shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium">{course.code}</p>
          <h3 className="text-sm font-bold text-gray-900 mt-0.5">{course.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{course.instructor}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasTakenClarityCheck && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              clarityScore! >= 80 ? 'bg-green-100 text-green-700' : clarityScore! >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}>
              <CheckCircle className="size-3" />
              {clarityScore}%
            </span>
          )}
        </div>
      </div>

      {/* Stance badge */}
      <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${colors.bg} ${colors.text}`}>
        <StanceIcon className="size-3.5" />
        {STANCE_LABELS[stance] ?? stance}
      </div>

      {/* Short description */}
      <p className="text-xs text-gray-600 mt-2">{STANCE_DESCRIPTIONS[stance] ?? ''}</p>

      {/* Expand/collapse full policy */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs font-medium text-[#0033A0] hover:underline"
      >
        {expanded ? 'Hide full policy' : 'Read full policy'}
      </button>

      {expanded && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
          {policy.policyText}
        </div>
      )}

      {/* Clarity Check */}
      <div className="mt-4">
        {hasTakenClarityCheck ? (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <CheckCircle className="size-3 text-green-500" />
            You scored {clarityScore}% on the clarity check
          </p>
        ) : (
          <ClarityCheck
            courseId={course.id}
            policyId={policy.id}
            onComplete={(score) => onClarityComplete(course.id, score)}
          />
        )}
      </div>
    </div>
  )
}

export default function StudentPoliciesPage() {
  const { currentUser } = useAuth()
  const [courses, setCourses] = useState<CourseWithPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    fetch('/api/ai-literacy/student/policies', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.courses) setCourses(data.courses)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentUser.email])

  const handleClarityComplete = (courseId: string, score: number) => {
    setCourses((prev) =>
      prev.map((c) =>
        c.course.id === courseId
          ? { ...c, clarityScore: score, hasTakenClarityCheck: true }
          : c,
      ),
    )
  }

  const withPolicy = courses.filter((c) => c.policy)
  const withoutPolicy = courses.filter((c) => !c.policy)
  const reviewed = courses.filter((c) => c.hasTakenClarityCheck).length
  const total = withPolicy.length

  return (
    <>
      <PageHeader
        title="My AI Policies"
        subtitle="Understand what's allowed in each of your courses"
        action={
          <Link
            href="/ai-literacy"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="size-4" /> Back
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-gray-400" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16">
            <FileCheck className="size-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">You&apos;re not enrolled in any courses yet.</p>
            <Link href="/courses" className="text-sm text-[#0033A0] hover:underline mt-2 inline-block">
              Browse courses
            </Link>
          </div>
        ) : (
          <>
            {/* Progress summary */}
            {total > 0 && (
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0033A0] rounded-full transition-all"
                    style={{ width: `${total > 0 ? (reviewed / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 shrink-0">
                  {reviewed}/{total} reviewed
                </span>
              </div>
            )}

            {/* Courses with policies */}
            {withPolicy.length > 0 && (
              <div className="space-y-4">
                {withPolicy.map((c) => (
                  <CoursePolicyCard
                    key={c.course.id}
                    data={c}
                    onClarityComplete={handleClarityComplete}
                  />
                ))}
              </div>
            )}

            {/* Courses without policies */}
            {withoutPolicy.length > 0 && (
              <div className="mt-8">
                <h2 className="text-base font-extrabold text-gray-900 mb-3">
                  No Policy Yet
                </h2>
                <div className="space-y-3">
                  {withoutPolicy.map((c) => (
                    <CoursePolicyCard
                      key={c.course.id}
                      data={c}
                      onClarityComplete={handleClarityComplete}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <PathwayNav />
      </div>
    </>
  )
}
