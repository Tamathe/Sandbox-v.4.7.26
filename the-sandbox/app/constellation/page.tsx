'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Stars, GraduationCap, Brain } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import TabNav from '../components/TabNav'
import type {
  SemesterConstellation,
  DegreeArc,
  ConstellationNode,
} from '../lib/constellation-service'
import SemesterConstellationView from '../components/constellation/SemesterConstellation'
import ConstellationLegend from '../components/constellation/ConstellationLegend'
import ConstellationStats from '../components/constellation/ConstellationStats'
import DegreeArcTimeline from '../components/constellation/DegreeArcTimeline'
import PrerequisiteUnpackerPanel from '../components/prerequisite/PrerequisiteUnpackerPanel'

type Tab = 'semester' | 'degree'

export default function ConstellationPage() {
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('semester')

  const [semesterData, setSemesterData] = useState<SemesterConstellation | null>(null)
  const [degreeData, setDegreeData] = useState<DegreeArc | null>(null)
  const [semesterLoading, setSemesterLoading] = useState(true)
  const [degreeLoading, setDegreeLoading] = useState(false)
  const [semesterError, setSemesterError] = useState<string | null>(null)
  const [degreeError, setDegreeError] = useState<string | null>(null)
  const [unpackTarget, setUnpackTarget] = useState<{ concept: string; courseId: string } | null>(null)

  // Fetch semester constellation on mount
  useEffect(() => {
    setSemesterLoading(true)
    setSemesterError(null)
    fetch('/api/constellation/semester', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load semester constellation')
        return res.json() as Promise<SemesterConstellation>
      })
      .then(setSemesterData)
      .catch((err) => setSemesterError(err.message))
      .finally(() => setSemesterLoading(false))
  }, [currentUser.email])

  // Fetch degree arc lazily when tab is selected
  useEffect(() => {
    if (activeTab !== 'degree' || degreeData) return
    setDegreeLoading(true)
    setDegreeError(null)
    fetch('/api/constellation/degree-arc', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load degree arc')
        return res.json() as Promise<DegreeArc>
      })
      .then(setDegreeData)
      .catch((err) => setDegreeError(err.message))
      .finally(() => setDegreeLoading(false))
  }, [activeTab, currentUser.email, degreeData])

  const handleNodeClick = useCallback((node: ConstellationNode) => {
    // Only show unpacker for weak concept nodes (mastery < 0.4)
    if (node.type !== 'concept' || (node.masteryLevel ?? 0) >= 0.4) {
      setUnpackTarget(null)
      return
    }
    // Find which course cluster contains this node
    const cluster = semesterData?.courses.find((c) =>
      c.nodes.some((n) => n.id === node.id),
    )
    if (!cluster) return
    setUnpackTarget({ concept: node.label, courseId: cluster.courseId })
  }, [semesterData])

  const currentSemester = semesterData?.semester ?? ''

  const tabs = [
    { id: 'semester', label: 'Semester View', icon: Stars },
    { id: 'degree', label: 'Degree Arc', icon: GraduationCap },
  ] as const

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Pattern A Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Knowledge Constellation</h1>
              <p className="text-sm text-gray-500 mt-1">
                Visualize your learning across courses and your entire degree
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <TabNav
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as Tab)}
            className="mt-4 -mb-px"
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'semester' && (
          <>
            {semesterLoading && <SkeletonLoader />}
            {semesterError && <ErrorMessage message={semesterError} />}
            {semesterData && !semesterLoading && (
              <div className="space-y-6">
                <SemesterConstellationView
                  data={semesterData}
                  onNodeClick={handleNodeClick}
                />
                {/* Prerequisite Unpacker Panel — shown when a weak concept node is clicked */}
                {unpackTarget && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Brain className="size-3.5" />
                      <span>Click any weak concept node (red) to trace its prerequisites</span>
                    </div>
                    <PrerequisiteUnpackerPanel
                      concept={unpackTarget.concept}
                      courseId={unpackTarget.courseId}
                      onClose={() => setUnpackTarget(null)}
                    />
                  </div>
                )}
                {!unpackTarget && semesterData.courses.some((c) =>
                  c.nodes.some((n) => n.type === 'concept' && (n.masteryLevel ?? 0) < 0.4),
                ) && (
                  <p className="flex items-center gap-2 text-xs text-gray-400 italic">
                    <Brain className="size-3.5 shrink-0" />
                    Click a weak concept node to ask &ldquo;Why am I struggling?&rdquo;
                  </p>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <ConstellationLegend />
                  </div>
                  <ConstellationStats data={semesterData} />
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'degree' && (
          <>
            {degreeLoading && <SkeletonLoader />}
            {degreeError && <ErrorMessage message={degreeError} />}
            {degreeData && !degreeLoading && (
              <DegreeArcTimeline
                data={degreeData}
                currentSemester={currentSemester}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SkeletonLoader() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gray-100 animate-pulse h-80" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-gray-100 animate-pulse h-32" />
        <div className="rounded-2xl bg-gray-100 animate-pulse h-32" />
      </div>
    </div>
  )
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 flex flex-col items-center gap-3 text-center">
      <AlertCircle className="size-10 text-red-400" />
      <p className="text-sm text-gray-600">{message}</p>
      <p className="text-xs text-gray-400">Try refreshing the page or switching users.</p>
    </div>
  )
}
