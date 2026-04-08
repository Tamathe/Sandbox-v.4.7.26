'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ChevronRight, Wrench,
  ShieldCheck, FileText, Mail, RefreshCw, UserCheck,
  BarChart3, ClipboardList, FileSearch, Presentation,
  Brain, CheckSquare, Moon, HeartPulse,
  CalendarClock, NotebookPen, ListChecks, Forward,
  type LucideIcon,
} from 'lucide-react'

interface CollectionTool {
  slug: string
  title: string
  description: string
  icon: string
}

interface CollectionGalleryProps {
  title: string
  description: string
  tools: readonly CollectionTool[] | CollectionTool[]
  basePath: string
  accentColor?: string
}

const ICON_MAP: Record<string, LucideIcon> = {
  ShieldCheck, FileText, Mail, RefreshCw, UserCheck,
  BarChart3, ClipboardList, FileSearch, Presentation,
  Brain, CheckSquare, Moon, HeartPulse,
  CalendarClock, NotebookPen, ListChecks, Forward,
  Wrench,
}

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Wrench
}

export default function CollectionGallery({
  title,
  description,
  tools,
  basePath,
  accentColor = '#0033A0',
}: CollectionGalleryProps) {
  const [showAllTools, setShowAllTools] = useState(false)

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/hub"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-3 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Hub
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>

      {/* Tools grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(showAllTools ? tools : tools.slice(0, 4)).map((tool) => {
            const Icon = getIcon(tool.icon)
            return (
              <Link
                key={tool.slug}
                href={`${basePath}/${tool.slug}`}
                className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-[#0033A0] overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="flex items-center justify-center size-12 rounded-xl"
                      style={{ backgroundColor: `${accentColor}10` }}
                    >
                      <Icon className="size-6" style={{ color: accentColor }} />
                    </div>
                    <ChevronRight className="size-5 text-gray-300 group-hover:text-[#0033A0] transition-colors mt-1" />
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-900 mb-2">
                    {tool.title}
                  </h2>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
        {tools.length > 4 && (
          <button
            type="button"
            onClick={() => setShowAllTools(!showAllTools)}
            className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
          >
            {showAllTools ? 'Show fewer' : `Show all ${tools.length} tools`}
          </button>
        )}
      </div>
    </div>
  )
}
