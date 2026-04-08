'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Check,
  CheckCircle,
  ShieldCheck,
  Plus,
  ArrowUp,
  Heart,
  MessageSquare,
  ExternalLink,
  Bot,
  Clock,
  Scale,
  Landmark,
  FlaskConical,
  Stethoscope,
  Briefcase,
  Palette,
  Lightbulb,
  Building2,
  FlaskRound,
  Swords,
  Mic2,
  HelpCircle,
} from 'lucide-react'

const toolTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  CHATBOT:      { label: 'Chatbot',      icon: Bot,         color: 'bg-violet-600 text-white' },
  STUDY_BUDDY:  { label: 'Study Buddy',  icon: Bot,         color: 'bg-violet-600 text-white' },
  EXTERNAL:     { label: 'External',     icon: ExternalLink, color: 'bg-gray-800 text-white' },
  SIMULATION:   { label: 'Simulation',   icon: FlaskRound,  color: 'bg-teal-600 text-white' },
  QUIZ:         { label: 'Quiz',         icon: HelpCircle,  color: 'bg-amber-600 text-white' },
  AI_INTERVIEW: { label: 'Interview',    icon: Mic2,        color: 'bg-rose-600 text-white' },
  DEBATE:       { label: 'Debate',       icon: Swords,      color: 'bg-orange-600 text-white' },
}
import { ToolWithDetails } from '../lib/types'
import { StarRating } from './StarRating'

const categoryColors: Record<string, string> = {
  Law: 'bg-indigo-100 text-indigo-700',
  History: 'bg-amber-100 text-amber-700',
  STEM: 'bg-emerald-100 text-emerald-700',
  Medicine: 'bg-red-100 text-red-700',
  Business: 'bg-blue-100 text-blue-700',
  Arts: 'bg-purple-100 text-purple-700',
  University: 'bg-sky-100 text-sky-700',
  'University Service': 'bg-sky-100 text-sky-700',
  General: 'bg-gray-100 text-gray-700',
}

const categoryThumbnailBg: Record<string, string> = {
  Law: 'bg-indigo-600',
  History: 'bg-amber-600',
  STEM: 'bg-emerald-600',
  Medicine: 'bg-red-600',
  Business: 'bg-blue-600',
  Arts: 'bg-purple-600',
  University: 'bg-sky-600',
  'University Service': 'bg-[#0033A0]',
  General: 'bg-gray-500',
}

const categoryIcons: Record<string, React.ReactNode> = {
  Law: <Scale className="w-12 h-12 text-white" />,
  History: <Landmark className="w-12 h-12 text-white" />,
  STEM: <FlaskConical className="w-12 h-12 text-white" />,
  Medicine: <Stethoscope className="w-12 h-12 text-white" />,
  Business: <Briefcase className="w-12 h-12 text-white" />,
  Arts: <Palette className="w-12 h-12 text-white" />,
  University: <Building2 className="w-12 h-12 text-white" />,
  'University Service': <Building2 className="w-12 h-12 text-white" />,
  General: <Lightbulb className="w-12 h-12 text-white" />,
}

const difficultyColors: Record<string, string> = {
  Introductory: 'bg-green-100 text-green-700',
  Intermediate: 'bg-yellow-100 text-yellow-700',
  Advanced: 'bg-red-100 text-red-700',
}

const roleColors: Record<string, string> = {
  EDUCATOR: 'bg-blue-100 text-blue-700',
  STUDENT: 'bg-green-100 text-green-700',
  ADMIN: 'bg-red-100 text-red-700',
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
  const bgClass = categoryThumbnailBg[tool.category] || 'bg-gray-500'
  const icon = categoryIcons[tool.category] || <Lightbulb className="w-12 h-12 text-white" />
  const catColorClass = categoryColors[tool.category] || 'bg-gray-100 text-gray-700'

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
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-200 h-full flex flex-col">
        <div className={`relative h-36 ${bgClass} flex items-center justify-center`}>
          {tool.thumbnailUrl ? (
            <Image
              src={tool.thumbnailUrl}
              alt={tool.name}
              fill
              className="object-cover"
            />
          ) : (
            <span aria-hidden="true">{icon}</span>
          )}
          <div className="absolute top-3 left-3 flex flex-col items-start gap-1">
            {tool.featured && (
              <div className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                Featured
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
          {(() => {
            const tc = toolTypeConfig[tool.toolType] ?? toolTypeConfig.EXTERNAL
            const TypeIcon = tc.icon
            return (
              <div className={`absolute top-3 right-3 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shadow-sm ${tc.color}`}>
                <TypeIcon className="w-3 h-3" />
                {tc.label}
              </div>
            )
          })()}
          {signals && signals.length > 0 && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
              {signals.map((s, i) => (
                <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-sm ${s.color}`}>
                  {s.label}
                </span>
              ))}
            </div>
          )}
          {onToggleLibrary && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onToggleLibrary(tool.id, !inLibrary)
              }}
              aria-label={inLibrary ? 'Remove from library' : 'Add to library'}
              title={inLibrary ? 'Remove from library' : 'Add to library'}
              className={`absolute bottom-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm ${
                inLibrary
                  ? 'bg-[#0033A0] text-white hover:bg-red-500'
                  : 'bg-white/90 text-gray-600 hover:bg-[#0033A0] hover:text-white'
              }`}
            >
              {inLibrary ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${catColorClass}`}>
              {tool.category}
            </span>
          </div>

          <h3 className="font-semibold text-gray-900 text-base leading-snug mb-1.5 group-hover:text-[#0033A0] transition-colors line-clamp-2">
            {tool.name}
          </h3>

          <p className="text-gray-500 text-sm leading-snug mb-3 flex-1 line-clamp-2">
            {tool.shortDescription}
          </p>

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
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${roleColors[tool.creator.role]}`}
            >
              {tool.creator.role}
            </span>
          </Link>

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

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
            <div className="flex min-w-0 items-center gap-3 text-gray-500 text-xs">
              {tool.estimatedMinutes && (
                <span className="flex items-center gap-1 text-sm font-medium text-slate-600 flex-shrink-0">
                  <Clock className="w-4 h-4 text-[#0033A0]" />
                  {tool.estimatedMinutes} min
                </span>
              )}
              <span
                className={`flex items-center gap-0.5 ${tool.hasUpvoted ? 'text-[#0033A0] font-semibold' : ''}`}
              >
                <ArrowUp className="w-3.5 h-3.5" />
                {tool._count.upvotes}
              </span>
              <span
                className={`flex items-center gap-0.5 ${tool.hasFavorited ? 'text-pink-500 font-semibold' : ''}`}
              >
                <Heart className="w-3.5 h-3.5" />
                {tool._count.favorites}
              </span>
              <span className="flex items-center gap-0.5">
                <MessageSquare className="w-3.5 h-3.5" />
                {tool._count.comments}
              </span>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                difficultyColors[tool.difficultyLevel] || 'bg-gray-100 text-gray-600'
              }`}
            >
              {tool.difficultyLevel}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
