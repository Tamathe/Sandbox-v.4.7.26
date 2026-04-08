'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '../lib/auth-context'
import PageHeader from '../components/PageHeader'
import OptInCard from '../components/study-match/OptInCard'
import MatchCard from '../components/study-match/MatchCard'
import type { StudyMatchSuggestion } from '../components/study-match/MatchCard'
import {
  Users,
  Loader2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'

interface StudyMatchProfile {
  id: string
  optedIn: boolean
  availableHours: Record<string, string[]> | null
  preferredSize: number
}

interface EnrolledCourse {
  courseId: string
  courseCode: string
  title: string
}

export default function StudyMatchPage() {
  return <Suspense fallback={null}><StudyMatchPageInner /></Suspense>
}

function StudyMatchPageInner() {
  const { currentUser } = useAuth()
  const searchParams = useSearchParams()
  const initialCourseId = searchParams.get('courseId') ?? ''

  const [profile, setProfile] = useState<StudyMatchProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [courses, setCourses] = useState<EnrolledCourse[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId)
  const [suggestions, setSuggestions] = useState<StudyMatchSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const headers = useCallback(
    (json = false) => ({
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      'x-demo-user-email': currentUser.email,
    }),
    [currentUser.email],
  )

  // Fetch profile
  useEffect(() => {
    setProfileLoading(true)
    fetch('/api/study-match/opt-in', { headers: headers() })
      .then((r) => r.json())
      .then((d) => setProfile(d.profile ?? null))
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, [headers])

  // Fetch enrolled courses
  useEffect(() => {
    setCoursesLoading(true)
    fetch('/api/courses/enrolled', { headers: headers() })
      .then((r) => r.json())
      .then((d) => {
        const list: EnrolledCourse[] = (d.enrollments ?? d.courses ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (e: any) => ({
            courseId: e.courseId ?? e.id,
            courseCode: e.courseCode ?? e.course?.courseCode ?? '',
            title: e.title ?? e.course?.title ?? '',
          }),
        )
        setCourses(list)
        if (!selectedCourseId && list.length > 0) {
          setSelectedCourseId(list[0].courseId)
        }
      })
      .catch(() => {})
      .finally(() => setCoursesLoading(false))
  }, [headers, selectedCourseId])

  // Fetch suggestions when course changes
  const fetchSuggestions = useCallback(async () => {
    if (!selectedCourseId || !profile?.optedIn) return
    setSuggestionsLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/study-match/suggestions?courseId=${encodeURIComponent(selectedCourseId)}`,
        { headers: headers() },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch suggestions')
      setSuggestions(data.suggestions ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSuggestionsLoading(false)
    }
  }, [selectedCourseId, profile?.optedIn, headers])

  function handleRespond(matchId: string, status: string, _chatGroupId?: string) {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === matchId ? { ...s, status } : s)),
    )
  }

  // Non-student guard
  if (currentUser.role !== 'STUDENT' && currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader title="Study Partners" subtitle="Find complementary study partners" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-gray-500">
          Study matching is available to students.
        </div>
      </div>
    )
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader title="Study Partners" subtitle="Find complementary study partners" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
          <Loader2 className="size-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  const activeSuggestions = suggestions.filter((s) => s.status === 'active')
  const pendingSuggestions = suggestions.filter(
    (s) => s.status === 'suggested' || (!s.status.includes('active') && !s.status.includes('declined')),
  )
  const declinedSuggestions = suggestions.filter((s) => s.status === 'declined')

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Study Partners"
        subtitle="AI-matched study groups based on complementary strengths"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Opt-in card */}
        <OptInCard
          profile={profile}
          userEmail={currentUser.email}
          onProfileChange={setProfile}
        />

        {/* Only show rest if opted in */}
        {profile?.optedIn && (
          <>
            {/* Course selector + find button */}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label htmlFor="sm-course-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Course
                </label>
                <select
                  id="sm-course-select"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border-2 border-gray-200 rounded-lg text-sm text-gray-900 focus:border-[#0033A0] focus:outline-none"
                >
                  {coursesLoading ? (
                    <option>Loading courses…</option>
                  ) : courses.length === 0 ? (
                    <option>No enrolled courses</option>
                  ) : (
                    courses.map((c) => (
                      <option key={c.courseId} value={c.courseId}>
                        {c.courseCode} — {c.title}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <button
                type="button"
                onClick={fetchSuggestions}
                disabled={!selectedCourseId || suggestionsLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-lg hover:bg-[#002880] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {suggestionsLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Find Study Partners
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Active matches */}
            {activeSuggestions.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-green-600" />
                  Active Study Groups
                </h2>
                {activeSuggestions.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    currentUserId={currentUser.id}
                    userEmail={currentUser.email}
                    onRespond={handleRespond}
                  />
                ))}
              </div>
            )}

            {/* Pending suggestions */}
            {pendingSuggestions.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                  <Users className="size-5 text-[#0033A0]" />
                  Suggested Matches
                </h2>
                {pendingSuggestions.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    currentUserId={currentUser.id}
                    userEmail={currentUser.email}
                    onRespond={handleRespond}
                  />
                ))}
              </div>
            )}

            {/* Declined */}
            {declinedSuggestions.length > 0 && (
              <details className="text-sm text-gray-500">
                <summary className="cursor-pointer font-medium">
                  {declinedSuggestions.length} declined match{declinedSuggestions.length > 1 ? 'es' : ''}
                </summary>
                <div className="mt-2 space-y-3">
                  {declinedSuggestions.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      currentUserId={currentUser.id}
                      userEmail={currentUser.email}
                      onRespond={handleRespond}
                    />
                  ))}
                </div>
              </details>
            )}

            {/* Empty state */}
            {!suggestionsLoading && suggestions.length === 0 && selectedCourseId && (
              <div className="border-2 border-gray-200 rounded-2xl p-8 bg-white text-center">
                <Users className="size-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600">No study partner matches yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click &quot;Find Study Partners&quot; to discover classmates with complementary strengths
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
