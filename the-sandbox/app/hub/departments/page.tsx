'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Building2, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'
import DepartmentCard from '../../components/hub/DepartmentCard'

interface DepartmentSummary {
  id: string
  name: string
  shortName: string
  slug: string
  description: string | null
  logoUrl: string | null
  themeColor: string | null
  categoryTags: string[]
  _count: { collections: number; followers: number; members: number }
}

export default function DepartmentsPage() {
  const { currentUser } = useAuth()
  const headers = { 'x-demo-user-email': currentUser.email }

  const [departments, setDepartments] = useState<DepartmentSummary[]>([])
  const [suggested, setSuggested] = useState<DepartmentSummary[]>([])
  const [categoryTags, setCategoryTags] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedCategory) params.set('category', selectedCategory)

    fetch(`/api/departments/browse?${params.toString()}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setDepartments(data.departments)
          setCategoryTags(data.categoryTags)
          if (!selectedCategory) setSuggested(data.suggested)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.email, selectedCategory])

  return (
    <div>
      <PageHeader title="Departments" subtitle="Browse all university storefronts" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/hub" className="hover:text-[#0033A0] transition-colors flex items-center gap-1">
            <ArrowLeft className="size-3" /> Hub
          </Link>
          <span className="text-gray-700 font-medium">Departments</span>
        </div>

        {/* Suggested for you */}
        {!selectedCategory && suggested.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="size-4 text-[#0033A0]" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Suggested for You</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {suggested.map(dept => (
                <DepartmentCard key={dept.id} department={dept} />
              ))}
            </div>
          </section>
        )}

        {/* Category filter */}
        {categoryTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                !selectedCategory
                  ? 'bg-[#0033A0] text-white border-[#0033A0]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'
              }`}
            >
              All
            </button>
            {categoryTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedCategory(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                  selectedCategory === tag
                    ? 'bg-[#0033A0] text-white border-[#0033A0]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Departments grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-8 animate-spin text-gray-300" />
          </div>
        ) : departments.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 p-10 text-center">
            <Building2 className="size-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-extrabold text-gray-700 mb-2">No departments found</h3>
            <p className="text-gray-500 text-sm">
              {selectedCategory
                ? `No departments match the "${selectedCategory}" category.`
                : 'No departments have been created yet.'}
            </p>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="mt-4 px-5 py-2.5 bg-[#0033A0] text-white rounded-xl font-medium text-sm hover:bg-[#002580] transition-colors"
              >
                Show all
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {departments.map(dept => (
              <DepartmentCard key={dept.id} department={dept} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
