'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Check,
  CheckCircle,
  ShieldCheck,
  Plus,
  ArrowUp,
  Heart,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { ToolWithDetails } from '../lib/types'
import { StarRating } from './StarRating'


const categoryBorderColor: Record<string, string> = {
  Law:                  'border-indigo-200 hover:border-indigo-400',
  History:              'border-amber-200 hover:border-amber-400',
  STEM:                 'border-emerald-200 hover:border-emerald-400',
  Medicine:             'border-red-200 hover:border-red-400',
  Business:             'border-blue-200 hover:border-blue-400',
  Arts:                 'border-purple-200 hover:border-purple-400',
  University:           'border-sky-200 hover:border-sky-400',
  'University Service': 'border-sky-200 hover:border-sky-400',
  'Registrar Tools':    'border-blue-200 hover:border-blue-400',
  General:              'border-gray-200 hover:border-gray-400',
}

const categoryTextColor: Record<string, string> = {
  Law:                  'text-indigo-700',
  History:              'text-amber-700',
  STEM:                 'text-emerald-700',
  Medicine:             'text-red-700',
  Business:             'text-blue-700',
  Arts:                 'text-purple-700',
  University:           'text-sky-700',
  'University Service': 'text-sky-700',
  'Registrar Tools':    'text-[#0033A0]',
  General:              'text-gray-700',
}

const categoryColors: Record<string, string> = {
  Law:                  'bg-indigo-100 text-indigo-700',
  History:              'bg-amber-100 text-amber-700',
  STEM:                 'bg-emerald-100 text-emerald-700',
  Medicine:             'bg-red-100 text-red-700',
  Business:             'bg-blue-100 text-blue-700',
  Arts:                 'bg-purple-100 text-purple-700',
  University:           'bg-sky-100 text-sky-700',
  'University Service': 'bg-sky-100 text-sky-700',
  'Registrar Tools':    'bg-blue-100 text-[#0033A0]',
  General:              'bg-gray-100 text-gray-700',
}

const categoryEmoji: Record<string, string> = {
  Law:                  '⚖️',
  History:              '🏛️',
  STEM:                 '🧪',
  Medicine:             '🩺',
  Business:             '💼',
  Arts:                 '🎨',
  University:           '🎓',
  'University Service': '🏫',
  'Registrar Tools':    '📋',
  General:              '💡',
}

const difficultyColors: Record<string, string> = {
  Introductory: 'bg-green-100 text-green-700',
  Intermediate: 'bg-yellow-100 text-yellow-700',
  Advanced:     'bg-red-100 text-red-700',
}


interface ToolCardProps {
  tool: ToolWithDetails
  signals?: { label: string; color: string }[]
  inLibrary?: boolean
  onToggleLibrary?: (toolId: string, add: boolean) => void
  onOpenModal?: (tool: ToolWithDetails) => void
}

export default function ToolCard({ tool, signals, inLibrary, onToggleLibrary, onOpenModal }: ToolCardProps) {
  const router = useRouter()
  const borderClass = categoryBorderColor[tool.category] || 'border-gray-200 hover:border-gray-400'
  const taglineColor = categoryTextColor[tool.category] || 'text-gray-600'
  const catColorClass = categoryColors[tool.category] || 'bg-gray-100 text-gray-700'
  const emoji = categoryEmoji[tool.category] || '🛠️'

  const openTool = () => {
    if (onOpenModal) {
      onOpenModal(tool)
    } else {
      router.push(`/tools/${tool.id}`)
    }
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={openTool}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openTool()
        }
      }}
      className="group block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0033A0] focus-visible:ring-offset-2 rounded-2xl"
    >
      <div className={`relative bg-white rounded-2xl border-2 overflow-hidden transition-all ${borderClass} hover:shadow-lg hover:-translate-y-0.5 h-full flex flex-col`}>
        <div className="p-6 flex flex-col flex-1">

          {/* Top row: emoji + badges */}
          <div className="flex items-start justify-between mb-4">
            <span className="text-4xl leading-none">{emoji}</span>
            <div className="flex flex-col items-end gap-1">
              {tool.featured && (
                <div className="bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  Featured
                </div>
              )}
              {tool.creator.role === 'STUDENT' && (
                <div className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm uppercase tracking-[0.18em]">
                  Student-made
                </div>
              )}
              {tool.isOfficialService && (
                <div className="flex items-center gap-1 bg-[#0033A0] text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm">
                  <ShieldCheck className="w-3 h-3" />
                  UK Official
                </div>
              )}
              {tool.approvalStatus === 'APPROVED' && !tool.isOfficialService && (
                <div className="flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </div>
              )}
            </div>
          </div>

          {/* Category pill */}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit mb-2 ${catColorClass}`}>
            {tool.category}
          </span>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-[#0033A0] transition-colors line-clamp-2 leading-snug">
            {tool.name}
          </h3>

          {/* Short description as tagline */}
          <p className={`text-sm font-medium mb-3 line-clamp-2 leading-snug ${taglineColor}`}>
            {tool.shortDescription}
          </p>

          {/* Creator row */}
          <Link
            href={`/profile/${tool.creator.id}`}
            onClick={(event) => event.stopPropagation()}
            className="flex items-center gap-1.5 mb-3 group/creator w-fit"
          >
            <div className="w-5 h-5 bg-[#0033A0] rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
              {tool.creator.name.charAt(0)}
            </div>
            <span className="text-xs text-gray-600 group-hover/creator:text-[#0033A0] group-hover/creator:underline truncate transition-colors">
              {tool.creator.name}
            </span>
          </Link>

          {/* Star rating */}
          {(tool._count.ratings ?? 0) > 3 && tool.avgRating !== null && tool.avgRating !== undefined && (
            <div className="mb-3">
              <StarRating
                readOnly
                size="sm"
                avg={tool.avgRating}
                count={tool._count.ratings ?? 0}
                userRating={null}
              />
            </div>
          )}

          {/* Starter questions preview — show up to 2, like collection cards */}
          {tool.starterQuestions && tool.starterQuestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tool.starterQuestions.slice(0, 2).map((q, i) => (
                <span
                  key={i}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium line-clamp-1 max-w-full opacity-80 ${catColorClass} border-current`}
                >
                  {q}
                </span>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 mt-auto">
            <div className="flex min-w-0 items-center gap-3 text-gray-500 text-xs">
              {tool.estimatedMinutes && (
                <span className="flex items-center gap-1 text-sm font-medium text-slate-600 flex-shrink-0">
                  <Clock className="w-4 h-4 text-[#0033A0]" />
                  {tool.estimatedMinutes} min
                </span>
              )}
              <span className={`flex items-center gap-0.5 ${tool.hasUpvoted ? 'text-[#0033A0] font-semibold' : ''}`}>
                <ArrowUp className="w-3.5 h-3.5" />
                {tool._count.upvotes}
              </span>
              <span className={`flex items-center gap-0.5 ${tool.hasFavorited ? 'text-pink-500 font-semibold' : ''}`}>
                <Heart className="w-3.5 h-3.5" />
                {tool._count.favorites}
              </span>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${difficultyColors[tool.difficultyLevel] || 'bg-gray-100 text-gray-600'}`}>
              {tool.difficultyLevel}
            </span>
          </div>

          {/* CTA */}
          <div className="mt-4">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openTool() }}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#0033A0] hover:bg-[#002580] text-white text-sm font-semibold transition-colors"
            >
              Open
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Library toggle */}
          {onToggleLibrary && (
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); onToggleLibrary(tool.id, !inLibrary) }}
              aria-label={inLibrary ? 'Remove from library' : 'Add to library'}
              title={inLibrary ? 'Remove from library' : 'Add to library'}
              className={`mt-2 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl border text-xs font-medium transition-all ${
                inLibrary
                  ? 'border-red-200 text-red-500 hover:bg-red-50'
                  : 'border-gray-200 text-gray-500 hover:border-[#0033A0] hover:text-[#0033A0]'
              }`}
            >
              {inLibrary ? <><Check className="w-3.5 h-3.5" /> In Library</> : <><Plus className="w-3.5 h-3.5" /> Save to Library</>}
            </button>
          )}

        </div>
      </div>
    </div>
  )
}
