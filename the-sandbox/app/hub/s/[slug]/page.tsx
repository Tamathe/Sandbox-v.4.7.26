'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Globe, Mail, Users, FolderOpen, Heart, Wrench,
  Loader2, ChevronRight, Settings, TrendingUp,
} from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import PageHeader from '../../../components/PageHeader'
import StorefrontToolCard from '../../../components/hub/StorefrontToolCard'

interface CollectionToolEntry {
  id: string
  displayOrder: number
  pinned: boolean
  tool: {
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
}

interface Collection {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  emoji: string | null
  displayOrder: number
  pinned: boolean
  tools: CollectionToolEntry[]
  _count: { tools: number }
}

interface Department {
  id: string
  name: string
  shortName: string
  slug: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  themeColor: string | null
  websiteUrl: string | null
  contactEmail: string | null
  featured: boolean
  collections: Collection[]
  members: Array<{ id: string; role: string; user: { id: string; name: string; email: string; role: string; avatarUrl: string | null } }>
  _count: { collections: number; followers: number; members: number }
}

interface PopularTool {
  id: string
  name: string
  shortDescription: string | null
  category: string
  toolType: string
  thumbnailUrl: string | null
  sessionsThisWeek: number
}

export default function StorefrontPage() {
  const { slug } = useParams<{ slug: string }>()
  const { currentUser } = useAuth()

  const [department, setDepartment] = useState<Department | null>(null)
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [popularTools, setPopularTools] = useState<PopularTool[]>([])

  useEffect(() => {
    fetch(`/api/departments/${slug}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setDepartment(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    // Check follow status
    fetch(`/api/departments/${slug}/followers`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setFollowing(data.following) })
      .catch(() => {})

    // Fetch popular tools this week
    fetch(`/api/departments/${slug}/popular`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.tools) setPopularTools(data.tools) })
      .catch(() => {})
  }, [slug, currentUser.email])

  // Follow status now checked via API on mount (see useEffect above)

  const toggleFollow = async () => {
    if (!department) return
    setFollowLoading(true)
    try {
      const method = following ? 'DELETE' : 'POST'
      const res = await fetch(`/api/departments/${slug}/followers`, {
        method,
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setFollowing(data.following)
      }
    } catch {
      // silently ignore
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Storefront" subtitle="Loading..." />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex justify-center">
          <Loader2 className="size-8 animate-spin text-gray-300" />
        </div>
      </div>
    )
  }

  if (!department) {
    return (
      <div>
        <PageHeader title="Not Found" subtitle="This department doesn't exist" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-gray-500 mb-4">The department storefront you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/hub" className="text-sm font-semibold text-[#0033A0] hover:underline">
            Back to Hub
          </Link>
        </div>
      </div>
    )
  }

  const color = department.themeColor ?? '#0033A0'

  // Check if current user is OWNER or EDITOR
  const userMembership = department.members.find(m => m.user.email === currentUser.email)
  const canManage = currentUser.role === 'ADMIN' || (userMembership && (userMembership.role === 'OWNER' || userMembership.role === 'EDITOR'))

  // Deduplicate all tools across collections for the "All Tools" section
  const allToolsMap = new Map<string, CollectionToolEntry['tool']>()
  for (const coll of department.collections) {
    for (const entry of coll.tools) {
      if (entry.tool.approvalStatus === 'APPROVED') {
        allToolsMap.set(entry.tool.id, entry.tool)
      }
    }
  }
  const allTools = Array.from(allToolsMap.values())

  return (
    <div>
      <PageHeader
        title={department.shortName}
        subtitle={department.name}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/hub" className="hover:text-[#0033A0] transition-colors flex items-center gap-1">
            <ArrowLeft className="size-3" /> Hub
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-gray-700 font-medium">{department.shortName}</span>
        </div>

        {/* Department Header */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          {/* Color bar */}
          <div className="h-2" style={{ backgroundColor: color }} />
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  {department.name}
                </h1>
                {department.description && (
                  <p className="text-gray-500 mt-2 max-w-2xl leading-relaxed">
                    {department.description}
                  </p>
                )}

                {/* Stats + links */}
                <div className="flex items-center gap-5 mt-4 flex-wrap">
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <FolderOpen className="size-4" />
                    {department._count.collections} collections
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Users className="size-4" />
                    {department._count.followers} followers
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Wrench className="size-4" />
                    {allTools.length} tools
                  </span>
                  {department.websiteUrl && (
                    <a
                      href={department.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-[#0033A0] hover:underline"
                    >
                      <Globe className="size-3.5" /> Website
                    </a>
                  )}
                  {department.contactEmail && (
                    <a
                      href={`mailto:${department.contactEmail}`}
                      className="flex items-center gap-1 text-sm text-[#0033A0] hover:underline"
                    >
                      <Mail className="size-3.5" /> Contact
                    </a>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {canManage && (
                  <Link
                    href={`/hub/s/${department.slug}/settings`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="size-4" />
                    Settings
                  </Link>
                )}
                <button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    following
                      ? 'bg-blue-50 text-[#0033A0] border border-[#0033A0]/20 hover:bg-blue-100'
                      : 'bg-[#0033A0] text-white hover:bg-[#002580]'
                  }`}
                >
                  <Heart className={`size-4 ${following ? 'fill-[#0033A0]' : ''}`} />
                  {following ? 'Following' : 'Follow'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Collection rows */}
        {department.collections.map(collection => {
          const approvedTools = collection.tools.filter(e => e.tool.approvalStatus === 'APPROVED')
          if (approvedTools.length === 0) return null
          return (
            <section key={collection.id}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {collection.emoji && <span className="text-lg">{collection.emoji}</span>}
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    {collection.name}
                  </h3>
                  <span className="text-xs text-gray-400">
                    {approvedTools.length} tools
                  </span>
                </div>
                <Link
                  href={`/hub/s/${department.slug}/${collection.slug}`}
                  className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1"
                >
                  View all <ChevronRight className="size-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {approvedTools.map(entry => (
                  <StorefrontToolCard
                    key={entry.id}
                    tool={entry.tool}
                    pinned={entry.pinned}
                  />
                ))}
              </div>
            </section>
          )
        })}

        {/* Popular this week */}
        {allTools.length > 0 && (
          <>
            <hr className="border-gray-100" />
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="size-4 text-[#0033A0]" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Popular in {department.shortName} This Week
                </h3>
              </div>
              {popularTools.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {popularTools.map(tool => (
                    <StorefrontToolCard key={tool.id} tool={{
                      id: tool.id,
                      name: tool.name,
                      shortDescription: tool.shortDescription ?? '',
                      category: tool.category,
                      toolType: tool.toolType,
                      thumbnailUrl: tool.thumbnailUrl,
                      approvalStatus: 'APPROVED',
                      isPortfolio: false,
                    }} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
                  <p className="text-sm text-gray-400">No activity yet — be the first to try these tools!</p>
                  {allTools.slice(0, 3).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                      {allTools.slice(0, 3).map(tool => (
                        <StorefrontToolCard key={tool.id} tool={tool} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
