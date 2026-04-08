'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, ArrowRight, Library } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import PageHeader from '../../../components/PageHeader'
import StarterPackCard from '../../../components/ai-literacy/StarterPackCard'
import PackSummaryCard from '../../../components/ai-literacy/PackSummaryCard'
import LoadingSpinner from '../../../components/LoadingSpinner'

interface Pack {
  id: string
  disciplineFamily: string
  label: string
  description: string
  defaultStance: string
  assignments: { title: string; originalFormat: string; redesignedFormat: string; aiLevel: string; description: string }[]
  checkpoints: { name: string; description: string; gradingWeight: string }[]
  policyExcerpt: string
  adoptionCount: number
}

interface MyPack {
  id: string
  name: string
  courseName: string
  status: string
  itemCount: number
  completedCount: number
}

export default function StarterPacksPage() {
  const { currentUser } = useAuth()
  const [packs, setPacks] = useState<Pack[]>([])
  const [courses, setCourses] = useState<{ id: string; courseCode: string; title: string }[]>([])
  const [myPacks, setMyPacks] = useState<MyPack[]>([])
  const [loading, setLoading] = useState(true)
  const [myPacksLoading, setMyPacksLoading] = useState(true)
  const [totalPacks, setTotalPacks] = useState(0)
  const [totalDisciplines, setTotalDisciplines] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function loadMain() {
      try {
        const [packsResult, coursesResult] = await Promise.allSettled([
          apiFetch<{ packs: Pack[] }>(currentUser.email, '/api/ai-literacy/starter-packs', {
            signal: controller.signal,
          }),
          apiFetch<{ courses?: { id: string; courseCode: string; title: string }[] }>(currentUser.email, '/api/ai-literacy/policy', {
            signal: controller.signal,
          }),
        ])

        if (packsResult.status === 'fulfilled') {
          const data = packsResult.value
          setPacks(data.packs)
          const total = data.packs.reduce((sum: number, p: Pack) => sum + p.adoptionCount, 0)
          const disciplines = data.packs.filter((p: Pack) => p.adoptionCount > 0).length
          setTotalPacks(total)
          setTotalDisciplines(disciplines)
        }
        if (coursesResult.status === 'fulfilled') {
          const data = coursesResult.value
          setCourses(data.courses?.map((c) => ({
            id: c.id,
            courseCode: c.courseCode,
            title: c.title,
          })) ?? [])
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
      setLoading(false)
    }

    async function loadMyPacks() {
      try {
        const data = await apiFetch<{ packs?: MyPack[] }>(currentUser.email, '/api/ai-literacy/starter-packs/my-packs', {
          signal: controller.signal,
        })
        setMyPacks(data.packs ?? [])
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        // API may not exist yet — silently ignore
      }
      setMyPacksLoading(false)
    }

    void loadMain()
    void loadMyPacks()
    return () => controller.abort()
  }, [currentUser.email])

  return (
    <>
      <PageHeader
        title="Starter Packs"
        subtitle="Personalized AI integration bundles for your courses"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Hero Section */}
        <div className="border rounded-2xl shadow-sm bg-white p-6 sm:p-8">
          <div className="max-w-2xl">
            <h2 className="text-xl font-extrabold text-gray-900">
              Get started with AI in your course
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              Answer 5 questions about your course and get a personalized pack with assignments,
              rubrics, and policy language — ready in 2 minutes.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-5">
              <Link
                href="/ai-literacy/starter-packs/builder"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-lg text-sm font-medium hover:bg-[#002880] transition-colors"
              >
                <Package className="size-4" />
                Build My Pack
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/ai-literacy/starter-packs/browse"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Library className="size-4" />
                Browse Library
              </Link>
            </div>
          </div>
        </div>

        {/* My Packs Section */}
        {myPacksLoading ? (
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 mb-4">My Packs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="border rounded-2xl shadow-sm bg-white p-4 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="size-9 rounded-xl bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : myPacks.length > 0 ? (
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 mb-4">My Packs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myPacks.map(pack => (
                <PackSummaryCard key={pack.id} {...pack} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Quick Adopt Section */}
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 mb-1">Or choose a pre-built pack:</h2>
          <p className="text-sm text-gray-500 mb-4">
            Discipline-specific bundles with policy, assignments, and checkpoints
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {packs.map(pack => (
                <StarterPackCard
                  key={pack.id}
                  {...pack}
                  courses={courses}
                  onAdopted={() => {
                    void apiFetch<{ packs: Pack[] }>(currentUser.email, '/api/ai-literacy/starter-packs')
                      .then(d => setPacks(d.packs))
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Peer Insights Bar */}
        {!loading && totalPacks > 0 && (
          <div className="border rounded-2xl shadow-sm bg-gray-50 px-6 py-4 text-center">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{totalPacks} packs</span> built across{' '}
              <span className="font-semibold text-gray-900">{totalDisciplines} disciplines</span>
            </p>
          </div>
        )}
      </div>
    </>
  )
}
