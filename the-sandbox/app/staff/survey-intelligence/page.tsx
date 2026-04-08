'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import { Plus, Loader2, ClipboardList, Info } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import ProjectCard from '../../components/staff/survey-intelligence/ProjectCard'
import ProjectCreateModal from '../../components/staff/survey-intelligence/ProjectCreateModal'

interface ProjectOverview {
  id: string
  title: string
  surveyOrg: string | null
  status: string
  questionCount: number
  vaultDocCount: number
  createdAt: string
}

export default function SurveyIntelligencePage() {
  const { currentUser } = useAuth()
  const router = useRouter()

  if (currentUser.role !== 'STAFF' && currentUser.role !== 'ADMIN') {
    router.replace('/')
    return null
  }

  const [projects, setProjects] = useState<ProjectOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/staff/survey-intelligence/projects', {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) throw new Error('Failed to load projects')
      const data = await res.json()
      setProjects(data.projects ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    }
    setLoading(false)
  }, [currentUser.email])

  useEffect(() => {
    void fetchProjects()
  }, [fetchProjects])

  const handleCreated = (projectId: string) => {
    setCreateOpen(false)
    router.push(`/staff/survey-intelligence/${projectId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Survey Intelligence"
        subtitle="AI-powered institutional survey response drafting"
        action={
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-[#0033A0] text-white hover:bg-[#002580] transition-colors"
          >
            <Plus className="size-4" />
            New Project
          </button>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Simulated data banner */}
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <Info className="size-4 shrink-0" />
          <span>
            <strong>Simulated data</strong> — Demo survey project with sample vault documents
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-8 text-[#0033A0] animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <button
              onClick={() => void fetchProjects()}
              className="mt-2 text-xs text-[#0033A0] font-medium hover:underline"
            >
              Try again
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="size-12 text-gray-300 mx-auto mb-3" />
            <h2 className="text-lg font-extrabold text-gray-700">No projects yet</h2>
            <p className="text-sm text-gray-500 mt-1">
              Create a survey project to start drafting AI-powered responses.
            </p>
            <button
              onClick={() => setCreateOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-[#0033A0] text-white hover:bg-[#002580] transition-colors"
            >
              <Plus className="size-4" />
              New Project
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>

      <ProjectCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        userEmail={currentUser.email}
      />
    </div>
  )
}
