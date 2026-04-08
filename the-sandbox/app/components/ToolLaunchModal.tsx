'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  X,
  Play,
  Plus,
  Check,
  ExternalLink,
  ArrowUpRight,
  Scale,
  Landmark,
  FlaskConical,
  Stethoscope,
  Briefcase,
  Palette,
  Lightbulb,
  Building2,
} from 'lucide-react'
import { ToolWithDetails } from '../lib/types'

const categoryThumbnailBg: Record<string, string> = {
  Law: 'bg-indigo-600',
  History: 'bg-amber-600',
  STEM: 'bg-emerald-600',
  Medicine: 'bg-red-600',
  Business: 'bg-blue-600',
  Arts: 'bg-purple-600',
  University: 'bg-sky-600',
  General: 'bg-gray-500',
}

const categoryColors: Record<string, string> = {
  Law: 'bg-indigo-100 text-indigo-700',
  History: 'bg-amber-100 text-amber-700',
  STEM: 'bg-emerald-100 text-emerald-700',
  Medicine: 'bg-red-100 text-red-700',
  Business: 'bg-blue-100 text-blue-700',
  Arts: 'bg-purple-100 text-purple-700',
  University: 'bg-sky-100 text-sky-700',
  General: 'bg-gray-100 text-gray-700',
}

const difficultyColors: Record<string, string> = {
  Introductory: 'bg-green-100 text-green-700',
  Intermediate: 'bg-yellow-100 text-yellow-700',
  Advanced: 'bg-red-100 text-red-700',
}

const categoryIcons: Record<string, React.ElementType> = {
  Law: Scale,
  History: Landmark,
  STEM: FlaskConical,
  Medicine: Stethoscope,
  Business: Briefcase,
  Arts: Palette,
  University: Building2,
  General: Lightbulb,
}

interface ToolLaunchModalProps {
  tool: ToolWithDetails
  inLibrary: boolean
  onClose: () => void
  onToggleLibrary: (toolId: string, add: boolean) => void
}

export default function ToolLaunchModal({
  tool,
  inLibrary,
  onClose,
  onToggleLibrary,
}: ToolLaunchModalProps) {
  const router = useRouter()

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const handleLaunch = () => {
    if (tool.toolType === 'EXTERNAL' && tool.externalUrl) {
      window.open(tool.externalUrl, '_blank', 'noopener,noreferrer')
      onClose()
      return
    }

    router.push(`/tools/${tool.id}?launch=true`)
    onClose()
  }

  const bgClass = categoryThumbnailBg[tool.category] || 'bg-gray-500'
  const Icon = categoryIcons[tool.category] || Lightbulb

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tool-launch-modal-title"
          className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl pointer-events-auto"
          onClick={(event) => event.stopPropagation()}
        >
          <div className={`relative flex h-40 items-center justify-center ${bgClass}`}>
            {tool.thumbnailUrl ? (
              <Image
                src={tool.thumbnailUrl}
                alt={tool.name}
                fill
                className="object-cover"
              />
            ) : (
              <Icon className="h-12 w-12 text-white" />
            )}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
              aria-label="Close launch modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[tool.category] || 'bg-gray-100 text-gray-700'}`}>
                {tool.category}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${difficultyColors[tool.difficultyLevel] || 'bg-gray-100 text-gray-600'}`}>
                {tool.difficultyLevel}
              </span>
            </div>

            <h2 id="tool-launch-modal-title" className="mb-2 text-lg font-extrabold text-gray-900">
              {tool.name}
            </h2>
            <p className="mb-5 line-clamp-3 text-sm leading-relaxed text-gray-500">
              {tool.shortDescription}
            </p>

            <div className="mb-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleLaunch}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0033A0] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
              >
                {tool.toolType === 'EXTERNAL' ? (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Open Tool
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Launch
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => onToggleLibrary(tool.id, !inLibrary)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                  inLibrary
                    ? 'border-[#0033A0]/30 bg-[#0033A0]/10 text-[#0033A0] hover:border-red-200 hover:bg-red-50 hover:text-red-600'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-[#0033A0]/30 hover:bg-[#0033A0]/5 hover:text-[#0033A0]'
                }`}
              >
                {inLibrary ? (
                  <>
                    <Check className="h-4 w-4" />
                    In Library
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Get
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400">
              <Link
                href={`/profile/${tool.creator.id}`}
                onClick={onClose}
                className="flex items-center gap-1.5 transition-colors hover:text-[#0033A0]"
              >
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0033A0] text-[9px] font-semibold text-white">
                  {tool.creator.name.charAt(0)}
                </div>
                {tool.creator.name}
              </Link>
              <span>{tool._count.sessions ?? 0} sessions</span>
              <Link
                href={`/tools/${tool.id}`}
                onClick={onClose}
                className="flex items-center gap-0.5 transition-colors hover:text-[#0033A0]"
              >
                View details <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
