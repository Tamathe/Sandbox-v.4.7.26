'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Loader2, Search, X } from 'lucide-react'
import { useAuth } from '../../../../lib/auth-context'
import PageHeader from '../../../../components/PageHeader'
import StorefrontToolCard from '../../../../components/hub/StorefrontToolCard'

interface CollectionTool {
  id: string
  name: string
  shortDescription: string
  category: string
  toolType: string
  thumbnailUrl: string | null
  approvalStatus: string
  isPortfolio: boolean
  creator: { id: string; name: string; role: string } | null
}

interface CollectionToolEntry {
  id: string
  displayOrder: number
  pinned: boolean
  tool: CollectionTool
}

interface Collection {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  emoji: string | null
  tools: CollectionToolEntry[]
  _count: { tools: number }
}

const SORTS = [
  { value: 'order', label: 'Curated' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'category', label: 'Category' },
]

export default function CollectionPage() {
  const { slug, collectionSlug } = useParams<{ slug: string; collectionSlug: string }>()
  const { currentUser } = useAuth()

  const [collection, setCollection] = useState<Collection | null>(null)
  const [deptName, setDeptName] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('order')

  useEffect(() => {
    const headers = { 'x-demo-user-email': currentUser.email }
    // Fetch collection + department name in parallel
    Promise.all([
      fetch(`/api/departments/${slug}/collections/${collectionSlug}`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setCollection(data) }),
      fetch(`/api/departments/${slug}`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(dept => { if (dept) setDeptName(dept.shortName || dept.name) }),
    ])
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug, collectionSlug, currentUser.email])

  if (loading) {
    return (
      <div>
        <PageHeader title="Collection" subtitle="Loading..." />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex justify-center">
          <Loader2 className="size-8 animate-spin text-gray-300" />
        </div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div>
        <PageHeader title="Not Found" subtitle="This collection doesn't exist" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-gray-500 mb-4">The collection you&apos;re looking for doesn&apos;t exist.</p>
          <Link href={`/hub/s/${slug}`} className="text-sm font-semibold text-[#0033A0] hover:underline">
            Back to storefront
          </Link>
        </div>
      </div>
    )
  }

  // Filter + sort
  const approvedTools = collection.tools.filter(e => e.tool.approvalStatus === 'APPROVED')
  let displayed = approvedTools

  if (search) {
    const q = search.toLowerCase()
    displayed = displayed.filter(e =>
      e.tool.name.toLowerCase().includes(q) || e.tool.shortDescription.toLowerCase().includes(q)
    )
  }

  if (sort === 'name') {
    displayed = [...displayed].sort((a, b) => a.tool.name.localeCompare(b.tool.name))
  } else if (sort === 'category') {
    displayed = [...displayed].sort((a, b) => a.tool.category.localeCompare(b.tool.category))
  }

  return (
    <div>
      <PageHeader
        title={collection.name}
        subtitle={deptName ? `${deptName} Collection` : 'Collection'}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/hub" className="hover:text-[#0033A0] transition-colors flex items-center gap-1">
            <ArrowLeft className="size-3" /> Hub
          </Link>
          <ChevronRight className="size-3" />
          <Link href={`/hub/s/${slug}`} className="hover:text-[#0033A0] transition-colors">
            {deptName}
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-gray-700 font-medium">{collection.name}</span>
        </div>

        {/* Description */}
        {collection.description && (
          <p className="text-gray-500 max-w-2xl leading-relaxed">{collection.description}</p>
        )}

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-1 items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-within:border-[#0033A0] focus-within:ring-1 focus-within:ring-[#0033A0] max-w-md">
            <Search className="size-4 text-gray-400 ml-3 flex-shrink-0" />
            <input
              type="text"
              placeholder="Filter tools..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 text-sm text-gray-800 outline-none placeholder-gray-400 bg-transparent"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {SORTS.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSort(s.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  sort === s.value
                    ? 'bg-[#0033A0] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tools grid */}
        {displayed.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 p-10 text-center">
            <p className="text-gray-500">
              {search ? `No tools match "${search}"` : 'No tools in this collection yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayed.map(entry => (
              <StorefrontToolCard
                key={entry.id}
                tool={entry.tool}
                pinned={entry.pinned}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
