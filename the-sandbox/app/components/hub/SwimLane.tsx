'use client'

import Link from 'next/link'
import { ArrowRight, Bot } from 'lucide-react'
import type { SwimLane as SwimLaneType } from '../../hub/hub-config'
import { LANE_TOOL_CAP } from '../../hub/hub-config'
import ShowcaseCard from './ShowcaseCard'
import StorefrontToolCard from './StorefrontToolCard'

// DB-driven collection shape (from /api/collections/platform or /api/hub/personalized)
export interface DBCollection {
  id: string
  name: string
  slug: string
  emoji?: string | null
  department?: { name: string; shortName: string; slug: string } | null
  tools: {
    id: string
    pinned?: boolean
    tool: {
      id: string
      name: string
      shortDescription: string
      category: string
      toolType: string
      thumbnailUrl?: string | null
      approvalStatus: string
      isPortfolio: boolean
      creator?: { id: string; name: string; role: string } | null
    }
  }[]
}

interface SwimLaneStaticProps {
  lane: SwimLaneType
  collection?: never
  /** Override the default tool cap. Pass 0 for unlimited. */
  maxTools?: number
}

interface SwimLaneDBProps {
  collection: DBCollection
  lane?: never
  maxTools?: number
}

type SwimLaneProps = SwimLaneStaticProps | SwimLaneDBProps

export default function SwimLane(props: SwimLaneProps) {
  const cap = props.maxTools ?? LANE_TOOL_CAP

  // DB-driven mode
  if (props.collection) {
    const { collection } = props

    // Hide entirely if no tools
    if (collection.tools.length === 0) return null

    return (
      <section>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 px-1">
          {collection.emoji ? `${collection.emoji} ` : ''}{collection.name}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {collection.tools.map(ct => (
            <StorefrontToolCard key={ct.tool.id} tool={ct.tool} pinned={ct.pinned} />
          ))}
        </div>
      </section>
    )
  }

  // Static mode (fallback from hub-config)
  const { lane } = props

  // Hide entirely if no tools
  if (lane.tools.length === 0) return null

  const visibleTools = cap > 0 ? lane.tools.slice(0, cap) : lane.tools
  const hasMore = cap > 0 && lane.tools.length > cap

  if (lane.elevated) {
    return (
      <section className="bg-blue-50/30 border border-blue-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              {lane.title}
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#0033A0]/10 text-[#0033A0] px-2 py-0.5 rounded-full uppercase tracking-wider">
              <Bot className="size-3" />
              Sandy-Powered
            </span>
          </div>
          {hasMore && (
            <Link
              href="/hub/browse"
              className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1"
            >
              See all {lane.tools.length} <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleTools.map(tool => (
            <ShowcaseCard key={tool.id} tool={tool} elevated />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
          {lane.title}
        </h3>
        {hasMore && (
          <Link
            href="/hub/browse"
            className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1"
          >
            See all {lane.tools.length} <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleTools.map(tool => (
          <ShowcaseCard key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  )
}
