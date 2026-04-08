'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import CourseCard, { type CatalogCourseData } from './CourseCard'

export default function CatalogBrowser() {
  const { currentUser } = useAuth()
  const [query, setQuery] = useState('')
  const [prefix, setPrefix] = useState('')
  const [prefixes, setPrefixes] = useState<string[]>([])
  const [courses, setCourses] = useState<CatalogCourseData[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const pageSize = 20
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const headers: Record<string, string> = {}
  if (currentUser?.email) headers['x-demo-user-email'] = currentUser.email

  // Load prefixes on mount
  useEffect(() => {
    fetch('/api/catalog/courses?pageSize=1', { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data.prefixes) setPrefixes(data.prefixes)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const search = useCallback(
    async (q: string, p: string, pg: number) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (q) params.set('q', q)
        if (p) params.set('prefix', p)
        params.set('page', String(pg))
        params.set('pageSize', String(pageSize))

        const res = await fetch(`/api/catalog/courses?${params}`, { headers })
        if (res.ok) {
          const data = await res.json()
          setCourses(data.courses ?? [])
          setTotal(data.total ?? 0)
          if (data.prefixes && prefixes.length === 0) setPrefixes(data.prefixes)
        }
      } catch {
        setCourses([])
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser?.email],
  )

  // Debounced search on query/prefix/page change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query, prefix, page), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, prefix, page, search])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search courses by name or code..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl
                       focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
          />
        </div>
        <select
          value={prefix}
          onChange={(e) => { setPrefix(e.target.value); setPage(1) }}
          className="px-4 py-2.5 text-sm border border-gray-300 rounded-xl
                     focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
        >
          <option value="">All Subjects</option>
          {prefixes.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-gray-400">Searching catalog...</div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          {query || prefix ? 'No courses match your search.' : 'Type to search the course catalog.'}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {courses.map((c) => (
              <CourseCard key={c.coid} course={c} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>
                Showing {(page - 1) * pageSize + 1}&ndash;{Math.min(page * pageSize, total)} of {total} courses
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="px-2">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
