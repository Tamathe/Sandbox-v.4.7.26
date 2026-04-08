'use client'

import { useState, useEffect } from 'react'
import { GraduationCap, Loader2, CheckCircle, Plus } from 'lucide-react'

interface CourseAlertsTabProps {
  userEmail: string
}

export function CourseAlertsTab({ userEmail }: CourseAlertsTabProps) {
  const [suggestions, setSuggestions] = useState<Array<{ label: string; query: string }>>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const [created, setCreated] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/uknow/alerts/faculty', { headers: { 'x-demo-user-email': userEmail } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.suggestions) setSuggestions(data.suggestions) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userEmail])

  const handleCreate = async (s: { label: string; query: string }) => {
    setCreating(s.query)
    try {
      const res = await fetch('/api/uknow/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ label: s.label, query: s.query }),
      })
      if (res.ok) {
        setCreated((prev) => new Set(prev).add(s.query))
      }
    } finally {
      setCreating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <GraduationCap className="size-12 mx-auto mb-3 text-gray-300" />
        <p className="font-semibold text-gray-700">No course-based suggestions available</p>
        <p className="text-sm mt-1">Upload course materials and add learning objectives to generate tailored alert suggestions.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="size-5 text-[#0033A0]" />
        <div>
          <h2 className="font-extrabold text-gray-900">Course Alerts</h2>
          <p className="text-sm text-gray-500">Auto-suggested alerts based on your course materials and learning objectives</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {suggestions.map((s) => {
          const isCreated = created.has(s.query)
          return (
            <div key={s.query} className="border-2 border-gray-200 rounded-2xl p-4 flex flex-col gap-2">
              <p className="font-bold text-sm text-gray-900">{s.label}</p>
              <p className="text-xs text-gray-500">{s.query}</p>
              <button
                onClick={() => handleCreate(s)}
                disabled={isCreated || creating === s.query}
                className={`mt-auto self-start text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  isCreated
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-[#0033A0] text-white hover:bg-[#002580]'
                }`}
              >
                {creating === s.query ? (
                  <Loader2 className="size-3 animate-spin inline mr-1" />
                ) : isCreated ? (
                  <CheckCircle className="size-3 inline mr-1" />
                ) : (
                  <Plus className="size-3 inline mr-1" />
                )}
                {isCreated ? 'Created' : 'Create Alert'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
