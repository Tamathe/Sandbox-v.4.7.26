'use client'

import { useState, useEffect } from 'react'
import { Users, BarChart3, GraduationCap } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import PageHeader from '../../../components/PageHeader'
import LoadingSpinner from '../../../components/LoadingSpinner'

interface CohortData {
  college: string
  totalFaculty: number
  withStance: number
  stanceCoverage: number
  quickStartCompleted: number
  quickStartRate: number
}

export default function CohortPage() {
  const { currentUser } = useAuth()
  const [cohorts, setCohorts] = useState<CohortData[]>([])
  const [pulse, setPulse] = useState<{ policyCoverage: number; totalProfilesWithStance: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const res = await fetch('/api/ai-literacy/cohort', {
          headers: { 'x-demo-user-email': currentUser.email },
          signal: controller.signal,
        })
        if (res.ok) {
          const data = await res.json()
          setCohorts(data.cohorts ?? [])
          setPulse(data.pulse ?? null)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
      setLoading(false)
    }
    void load()
    return () => controller.abort()
  }, [currentUser.email])

  if (currentUser.role !== 'ADMIN') {
    return (
      <>
        <PageHeader title="Cohort Rollout" subtitle="Admin access required" />
        <div className="max-w-6xl mx-auto px-4 py-12 text-center text-gray-500">
          This page is available to administrators only.
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Cohort Rollout"
        subtitle="Track AI literacy adoption by college — plan structured onboarding"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Summary KPIs */}
            {pulse && (
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-2xl shadow-sm p-4 bg-white">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="size-4 text-[#0033A0]" />
                    <span className="text-xs text-gray-500">Policy Coverage</span>
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900">{pulse.policyCoverage}%</p>
                </div>
                <div className="border rounded-2xl shadow-sm p-4 bg-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="size-4 text-[#0033A0]" />
                    <span className="text-xs text-gray-500">Faculty with Stances</span>
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900">{pulse.totalProfilesWithStance}</p>
                </div>
                <div className="border rounded-2xl shadow-sm p-4 bg-white">
                  <div className="flex items-center gap-2 mb-1">
                    <GraduationCap className="size-4 text-[#0033A0]" />
                    <span className="text-xs text-gray-500">Colleges</span>
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900">{cohorts.length}</p>
                </div>
              </div>
            )}

            {/* Cohort table */}
            <div className="border rounded-2xl shadow-sm p-5 bg-white">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Faculty by College</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="pb-2 font-medium">College</th>
                      <th className="pb-2 font-medium text-right">Faculty</th>
                      <th className="pb-2 font-medium text-right">Stance Taken</th>
                      <th className="pb-2 font-medium text-right">Quick Start Done</th>
                      <th className="pb-2 font-medium text-right">Stance Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohorts.map(c => (
                      <tr key={c.college} className="border-b border-gray-50">
                        <td className="py-2.5 font-medium text-gray-900">{c.college}</td>
                        <td className="py-2.5 text-right text-gray-600">{c.totalFaculty}</td>
                        <td className="py-2.5 text-right text-gray-600">{c.withStance}</td>
                        <td className="py-2.5 text-right text-gray-600">{c.quickStartCompleted}</td>
                        <td className="py-2.5 text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            c.stanceCoverage >= 60 ? 'bg-green-100 text-green-700' :
                            c.stanceCoverage >= 30 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {c.stanceCoverage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
