'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Rocket, Building2, Sparkles, Search } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ToolCard from '../components/ToolCard'
import { useAuth } from '../lib/auth-context'
import StaffToolkit from '../components/hub/StaffToolkit'
import HubSearchBar from '../components/hub/HubSearchBar'
import SwimLane from '../components/hub/SwimLane'
import DepartmentCard from '../components/hub/DepartmentCard'
import StorefrontToolCard from '../components/hub/StorefrontToolCard'
import FeaturedStorefront from '../components/hub/FeaturedStorefront'
import FeaturedHeroCard from '../components/hub/FeaturedHeroCard'
import { SWIM_LANES, ROLE_LANE_ORDER, FEATURED_TOOLS } from './hub-config'
import { useHubBundle } from '../hooks/useHubBundle'

// ─── Skeleton loaders ────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-2xl border-2 border-gray-100 bg-white p-6 animate-pulse">
      <div className="size-12 rounded-lg bg-gray-100 mb-4" />
      <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-50 rounded w-full mb-1" />
      <div className="h-3 bg-gray-50 rounded w-2/3" />
    </div>
  )
}

function SectionSkeleton({ count = 3, title }: { count?: number; title?: string }) {
  return (
    <section>
      {title && (
        <div className="h-4 bg-gray-100 rounded w-40 mb-4 animate-pulse" />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </section>
  )
}

function DeptCarouselSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden pb-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="min-w-[240px] rounded-2xl border-2 border-gray-100 bg-white p-5 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-lg bg-gray-100" />
            <div className="h-4 bg-gray-100 rounded w-20" />
          </div>
          <div className="h-3 bg-gray-50 rounded w-full mb-1" />
          <div className="h-3 bg-gray-50 rounded w-2/3" />
        </div>
      ))}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HubPage() {
  const { currentUser, evaluatorMode } = useAuth()
  const role = currentUser.role as 'STUDENT' | 'EDUCATOR' | 'ADMIN' | 'STAFF'

  // Show-all toggle for community tools
  const [showAllCommunity, setShowAllCommunity] = useState(false)

  // Single bundle request replaces 5 individual fetches
  const {
    communityTools,
    communityLoading,
    myDepartments,
    featuredDepartments,
    deptsLoading,
    dbCollections,
    collectionsLoaded,
    recommendations,
    recsLoaded,
  } = useHubBundle(currentUser.email)

  // Static fallback: role-filtered, role-ordered swim lanes (used when DB returns empty)
  const laneOrder = ROLE_LANE_ORDER[role] ?? ROLE_LANE_ORDER.ADMIN
  const orderedLanes = laneOrder
    .map(id => SWIM_LANES.find(l => l.id === id))
    .filter((l): l is (typeof SWIM_LANES)[number] => !!l && l.visibleTo.includes(role))

  // Filter featured to exclude departments user already sees in "Your Storefronts"
  const myDeptIds = new Set(myDepartments.map(d => d.id))
  const filteredFeatured = featuredDepartments.filter(d => !myDeptIds.has(d.id))

  // Featured tools for this role
  const featured = FEATURED_TOOLS[role] ?? FEATURED_TOOLS.ADMIN

  return (
    <div>
      <PageHeader
        title="Explore"
        subtitle="Campus tools and AI experiences"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

        {/* Search */}
        <HubSearchBar />

        {/* ── Tier 1: AI Literacy Storefront ── */}
        <FeaturedStorefront />

        {/* ── Tier 2: Featured Tools (3 hero cards) ── */}
        <section>
          <div className="flex items-center gap-2 mb-4 px-1">
            <Sparkles className="size-4 text-amber-500" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Featured</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map(f => (
              <FeaturedHeroCard key={f.tool.id} tool={f.tool} tagline={f.tagline} />
            ))}
          </div>
        </section>

        {/* Staff Toolkit (STAFF only — replaces hero banner) */}
        {role === 'STAFF' && <StaffToolkit />}

        {/* ── Tier 3: Curated swim lanes (capped at 5 tools each) ── */}

        {orderedLanes.map(lane => (
          <SwimLane key={lane.id} lane={lane} />
        ))}

        {/* Browse more lanes CTA */}
        <div className="text-center py-2">
          <Link
            href="/hub/browse"
            className="text-sm text-gray-500 hover:text-[#0033A0] transition-colors"
          >
            Looking for something else? Browse all tools &rarr;
          </Link>
        </div>

        {/* ── Storefronts ── */}

        {/* Your Storefronts — departments user follows or is a member of */}
        {deptsLoading ? (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="size-4 text-[#0033A0]" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Your Storefronts</h2>
            </div>
            <DeptCarouselSkeleton />
          </section>
        ) : myDepartments.length > 0 ? (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-[#0033A0]" />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Your Storefronts</h2>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {myDepartments.map(dept => (
                <div key={dept.id} className="snap-start flex-shrink-0">
                  <DepartmentCard department={dept} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Featured Storefronts */}
        {deptsLoading ? (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="size-4 text-gray-400" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Featured Storefronts</h2>
            </div>
            <DeptCarouselSkeleton />
          </section>
        ) : filteredFeatured.length > 0 ? (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-gray-400" />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Featured Storefronts</h2>
              </div>
              <Link
                href="/hub/departments"
                className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1"
              >
                Browse all <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {filteredFeatured.map(dept => (
                <div key={dept.id} className="snap-start flex-shrink-0">
                  <DepartmentCard department={dept} />
                </div>
              ))}
              {/* See all departments CTA card */}
              <Link
                href="/hub/departments"
                className="snap-start flex-shrink-0 min-w-[240px] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-5 transition-all hover:border-[#0033A0]/40 hover:bg-blue-50/50"
              >
                <Building2 className="size-6 text-gray-400" />
                <span className="text-sm font-semibold text-gray-600">Browse all departments</span>
              </Link>
            </div>
          </section>
        ) : (
          /* Always show a path to departments even if none are featured */
          <section>
            <Link
              href="/hub/departments"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-[#0033A0] transition-all text-sm font-semibold text-gray-600 hover:text-[#0033A0]"
            >
              <Building2 className="size-4" />
              Browse department storefronts
              <ArrowRight className="size-3" />
            </Link>
          </section>
        )}

        {/* ── Recommendations ── */}

        {!recsLoaded ? (
          <SectionSkeleton count={3} title="placeholder" />
        ) : recommendations.length > 0 ? (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="size-4 text-[#0033A0]" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Recommended for You</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {recommendations.map(rec => (
                <div key={rec.id} className="relative">
                  <StorefrontToolCard tool={{
                    id: rec.id,
                    name: rec.name,
                    shortDescription: rec.shortDescription ?? '',
                    category: rec.category,
                    toolType: rec.toolType,
                    thumbnailUrl: rec.thumbnailUrl,
                    approvalStatus: 'APPROVED',
                    isPortfolio: false,
                  }} />
                  <span className="absolute top-2 right-2 text-[10px] font-semibold text-[#0033A0] bg-blue-50 px-2 py-0.5 rounded-full">
                    {rec.reason}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── DB-driven collections (department storefronts) ── */}

        {!collectionsLoaded ? (
          <>
            <SectionSkeleton count={3} title="placeholder" />
            <SectionSkeleton count={3} title="placeholder" />
          </>
        ) : dbCollections.length > 0 ? (
          dbCollections.map(collection => (
            <SwimLane key={collection.id} collection={collection} />
          ))
        ) : null}

        {/* Built by Wildcats — community portfolio apps (hidden in evaluator mode) */}
        {!evaluatorMode && !communityLoading && communityTools.length > 0 && (
          <>
          <hr className="border-gray-100" />
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Rocket className="size-4 text-[#0033A0]" />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Built by Wildcats</h2>
                <span className="text-xs text-gray-400 font-medium ml-1">Apps published by students &amp; faculty</span>
              </div>
              <Link
                href="/build?tab=import"
                className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1"
              >
                Submit yours <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(showAllCommunity ? communityTools : communityTools.slice(0, 4)).map(tool => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
            {communityTools.length > 4 && (
              <button
                onClick={() => setShowAllCommunity(v => !v)}
                className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
              >
                {showAllCommunity ? 'Show less' : `Show all ${communityTools.length} community tools`}
              </button>
            )}
          </section>
          </>
        )}

        {/* Full Catalog — link instead of inline toggle */}
        <Link
          href="/hub/browse"
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-[#0033A0] transition-all text-sm font-bold text-gray-700 hover:text-[#0033A0]"
        >
          <Search className="size-4" />
          Browse full catalog
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  )
}
