'use client'

import Link from 'next/link'
import { ArrowRight, GitFork, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { useForkTool } from '../../hooks/useForkTool'

interface StorefrontTool {
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

interface StorefrontToolCardProps {
  tool: StorefrontTool
  pinned?: boolean
  showForkAction?: boolean
}

export default function StorefrontToolCard({ tool, pinned, showForkAction }: StorefrontToolCardProps) {
  const { currentUser, evaluatorMode } = useAuth()
  const { forking: isForking, handleFork } = useForkTool(tool.id, currentUser.email)

  const canFork =
    showForkAction &&
    !evaluatorMode &&
    tool.toolType !== 'EXTERNAL' &&
    tool.toolType !== 'PORTFOLIO'

  return (
    <Link
      href={`/tools/${tool.id}`}
      className="group flex flex-col gap-3 rounded-2xl border-2 border-gray-200 bg-white p-5 transition-all hover:border-[#0033A0]/40 hover:shadow-md hover:-translate-y-0.5 min-w-[220px]"
    >
      {/* Category pill + pinned badge */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          {tool.category}
        </span>
        {pinned && (
          <span className="text-[10px] font-semibold text-[#0033A0] bg-blue-50 px-1.5 py-0.5 rounded">
            Featured
          </span>
        )}
      </div>

      {/* Title + description */}
      <div className="flex-1">
        <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#0033A0] transition-colors leading-tight">
          {tool.name}
        </h4>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
          {tool.shortDescription}
        </p>
      </div>

      {/* CTA row */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0] opacity-0 group-hover:opacity-100 transition-opacity">
          Launch <ArrowRight className="size-3" />
        </span>

        {canFork && (
          <button
            type="button"
            onClick={handleFork}
            disabled={isForking}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-500 opacity-0 transition-all group-hover:opacity-100 hover:border-[#0033A0] hover:text-[#0033A0] disabled:opacity-50"
          >
            {isForking ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <GitFork className="size-3" />
            )}
            Fork
          </button>
        )}
      </div>
    </Link>
  )
}
