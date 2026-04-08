'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Clock } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import type { AudioHubCoursesResponse, EpisodeCardData } from '../../../lib/audio/types'
import EpisodeCard from './EpisodeCard'
import LoadingSpinner from '../../LoadingSpinner'
import ErrorBanner from '../../ErrorBanner'
import { formatDuration } from '../../../lib/audio/format'

interface Props {
  onPlay: (episode: EpisodeCardData) => void
}

export default function CourseEpisodeList({ onPlay }: Props) {
  const { currentUser } = useAuth()
  const [data, setData] = useState<AudioHubCoursesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    if (!currentUser?.email) return
    apiFetch(currentUser.email, '/api/audio/hub/courses', { signal: controller.signal })
      .then(data => setData(data as AudioHubCoursesResponse))
      .catch(err => { if (err.name !== 'AbortError') setError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [currentUser?.email])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorBanner message={error} />
  if (!data?.courses.length) {
    return <p className="text-gray-500 text-sm py-8 text-center">No audio episodes for your courses yet.</p>
  }

  return (
    <div className="space-y-8">
      {data.courses.map(course => (
        <section key={course.courseId}>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="size-4 text-[#0033A0]" />
            <h2 className="font-extrabold text-lg text-gray-900">
              {course.courseCode} — {course.courseName}
            </h2>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="size-3" />
              {formatDuration(course.totalDuration)} total
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {course.episodes.map(ep => (
              <EpisodeCard key={ep.id} episode={ep} onPlay={onPlay} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
