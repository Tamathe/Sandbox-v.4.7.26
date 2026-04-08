'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Lightbulb, Play } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'

interface RecommendedCase {
  caseId: string
  title: string
  chiefComplaint: string
  difficulty: string
  organSystems: string[]
  patientName: string
  patientAge: number
  patientSex: string
  reason: string
}

const DIFFICULTY_COLORS: Record<string, string> = {
  BEGINNER: 'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-blue-100 text-blue-700',
  ADVANCED: 'bg-amber-100 text-amber-700',
  EXPERT: 'bg-red-100 text-red-700',
}

export default function RecommendedNextCard() {
  const { currentUser } = useAuth()
  const [rec, setRec] = useState<RecommendedCase | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    apiFetch<RecommendedCase | null>(
      currentUser.email,
      '/api/virtual-clinic/analytics/recommendation',
      { signal: controller.signal },
    )
      .then((data) => { if (data) setRec(data) })
      .catch(() => { /* non-fatal */ })
    return () => controller.abort()
  }, [currentUser.email])

  if (!rec) return null

  return (
    <section className="border border-blue-200 bg-blue-50/50 rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="size-5 text-[#0033A0]" />
        <h2 className="text-lg font-extrabold text-gray-900">Recommended Next Case</h2>
      </div>
      <p className="text-sm text-gray-600 mb-3">{rec.reason}</p>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 line-clamp-1">{rec.title}</h3>
          <p className="text-sm text-gray-500 line-clamp-1">
            {rec.patientName}, {rec.patientAge}{rec.patientSex[0]} — {rec.chiefComplaint}
          </p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[rec.difficulty]}`}>
              {rec.difficulty}
            </span>
            {rec.organSystems.slice(0, 2).map((os) => (
              <span key={os} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {os}
              </span>
            ))}
          </div>
        </div>
        <Link
          href={`/virtual-clinic/case/${rec.caseId}`}
          className="ml-4 inline-flex items-center gap-2 px-4 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-lg hover:bg-[#002878] transition-colors shrink-0"
        >
          <Play className="size-4" />
          View Case
        </Link>
      </div>
    </section>
  )
}
