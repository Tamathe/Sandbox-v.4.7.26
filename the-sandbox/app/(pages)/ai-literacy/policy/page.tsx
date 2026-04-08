'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, FileText, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../../lib/auth-context'
import PageHeader from '../../../components/PageHeader'
import PolicyWizard from '../../../components/ai-literacy/PolicyWizard'
import PolicyGapDashboard from '../../../components/ai-literacy/PolicyGapDashboard'
import PathwayNav from '../../../components/ai-literacy/PathwayNav'
import type { AIStance } from '../../../generated/prisma'
import LoadingSpinner from '../../../components/LoadingSpinner'

type Tab = 'builder' | 'gap'

export default function PolicyBuilderPage() {
  const { currentUser } = useAuth()
  const [tab, setTab] = useState<Tab>('builder')
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Array<{
    id: string
    courseCode: string
    title: string
    hasAIPolicy: boolean
    assignments: Array<{
      assignmentId: string
      title: string
      category: string | null
      level: 'PROHIBITED' | 'LIMITED' | 'GUIDED' | 'REQUIRED'
      suggestedLevel: 'PROHIBITED' | 'LIMITED' | 'GUIDED' | 'REQUIRED'
    }>
  }>>([])
  const [stance, setStance] = useState<AIStance>('GUIDED')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/ai-literacy/policy', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (res.ok) {
          const data = await res.json()
          setCourses(data.courses)
          if (data.stance) setStance(data.stance)
        }
      } catch {
        // handle error
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [currentUser.email])

  const isAdmin = currentUser.role === 'ADMIN'

  return (
    <>
      <PageHeader
        title="AI Policy Framework Builder"
        subtitle="Generate structured, stance-aware AI policies for your courses"
        action={
          <Link href="/ai-literacy" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="size-4" />
            AI Literacy Hub
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-8">
          <button
            onClick={() => setTab('builder')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'builder'
                ? 'border-[#0033A0] text-[#0033A0]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="size-4" />
            Build Policy
          </button>
          <button
            onClick={() => setTab('gap')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'gap'
                ? 'border-[#0033A0] text-[#0033A0]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="size-4" />
            Policy Coverage {isAdmin ? '(All Courses)' : '(My Courses)'}
          </button>
        </div>

        {tab === 'builder' && (
          loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner label="Loading your courses..." />
            </div>
          ) : courses.length === 0 ? (
            <div className="max-w-md mx-auto text-center py-12">
              <FileText className="size-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900">No courses found</h3>
              <p className="text-sm text-gray-500 mt-2">
                You need at least one course to build an AI policy. Create a course first, then come back here.
              </p>
            </div>
          ) : (
            <PolicyWizard
              courses={courses}
              initialStance={stance}
              userEmail={currentUser.email}
              onComplete={() => setTab('gap')}
            />
          )
        )}

        {tab === 'gap' && (
          <div className="border rounded-2xl shadow-sm p-6 bg-white space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">AI Policy Coverage</h3>
              <p className="text-sm text-gray-600 mt-1">
                {isAdmin
                  ? 'All courses across the university and their AI policy status.'
                  : 'Your courses and their AI policy status.'}
              </p>
            </div>
            <PolicyGapDashboard />
          </div>
        )}

        <PathwayNav />
      </div>
    </>
  )
}
