'use client'

import { useState } from 'react'
import { Package, ChevronDown, ChevronUp, Check, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface StarterPackAssignment {
  title: string
  originalFormat: string
  redesignedFormat: string
  aiLevel: string
  description: string
}

interface StarterPackCheckpoint {
  name: string
  description: string
  gradingWeight: string
}

interface StarterPackCardProps {
  id: string
  disciplineFamily: string
  label: string
  description: string
  defaultStance: string
  assignments: StarterPackAssignment[]
  checkpoints: StarterPackCheckpoint[]
  policyExcerpt: string
  adoptionCount: number
  courses: { id: string; courseCode: string; title: string }[]
  onAdopted?: () => void
}

export default function StarterPackCard({
  disciplineFamily,
  label,
  description,
  defaultStance,
  assignments,
  checkpoints,
  policyExcerpt,
  adoptionCount,
  courses,
  onAdopted,
}: StarterPackCardProps) {
  const { currentUser } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [adopting, setAdopting] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState('')
  const [adopted, setAdopted] = useState(false)

  const handleAdopt = async () => {
    if (!selectedCourse) return
    setAdopting(true)

    const res = await fetch('/api/ai-literacy/starter-packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ courseId: selectedCourse, disciplineFamily }),
    })

    setAdopting(false)
    if (res.ok) {
      setAdopted(true)
      onAdopted?.()
    }
  }

  return (
    <div className="border rounded-2xl shadow-sm bg-white overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Package className="size-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{label}</h3>
              <p className="text-xs text-gray-500">Default stance: {defaultStance} · {adoptionCount} adopted</p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600"
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>

        <p className="text-xs text-gray-600 mt-3">{description}</p>

        {/* Compact preview */}
        {!expanded && (
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span>{assignments.length} assignments</span>
            <span>{checkpoints.length} checkpoints</span>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t px-5 py-4 space-y-4 bg-gray-50/50">
          {/* Policy excerpt */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Policy Excerpt</h4>
            <p className="text-xs text-gray-600 italic">&quot;{policyExcerpt}&quot;</p>
          </div>

          {/* Assignments */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Redesigned Assignments</h4>
            <div className="space-y-2">
              {assignments.map((a, i) => (
                <div key={i} className="p-3 bg-white border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{a.title}</span>
                    <span
                      title={
                        a.aiLevel === 'PROHIBITED' ? 'No AI tools allowed for this assignment' :
                        a.aiLevel === 'LIMITED' ? 'AI for brainstorming and grammar only' :
                        a.aiLevel === 'GUIDED' ? 'AI allowed with disclosure required' :
                        'AI use is mandatory'
                      }
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.aiLevel === 'PROHIBITED' ? 'bg-red-100 text-red-700' :
                      a.aiLevel === 'LIMITED' ? 'bg-amber-100 text-amber-700' :
                      a.aiLevel === 'GUIDED' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>{a.aiLevel}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{a.originalFormat} → {a.redesignedFormat}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Checkpoints */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Process Checkpoints</h4>
            <div className="space-y-1.5">
              {checkpoints.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700">{c.name}: {c.description}</span>
                  <span className="text-gray-400 shrink-0 ml-2">{c.gradingWeight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Adopt */}
          {!adopted ? (
            <div className="flex items-center gap-3">
              <select
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0033A0] outline-none"
              >
                <option value="">Select a course</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.courseCode} — {c.title}</option>
                ))}
              </select>
              <button
                onClick={handleAdopt}
                disabled={!selectedCourse || adopting}
                className="flex items-center gap-2 px-5 py-2 bg-[#0033A0] text-white rounded-lg text-sm font-medium hover:bg-[#002880] disabled:opacity-50 transition-colors"
              >
                {adopting ? <Loader2 className="size-4 animate-spin" /> : <Package className="size-4" />}
                Adopt
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <Check className="size-4" /> Pack adopted! Policy and assignments created.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
