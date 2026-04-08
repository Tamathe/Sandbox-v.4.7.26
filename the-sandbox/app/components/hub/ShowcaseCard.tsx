'use client'

import Link from 'next/link'
import { ArrowRight, Bot } from 'lucide-react'
import type { ShowcaseTool } from '../../hub/hub-config'

interface ShowcaseCardProps {
  tool: ShowcaseTool
  elevated?: boolean
}

export default function ShowcaseCard({ tool, elevated }: ShowcaseCardProps) {
  const Icon = tool.icon

  return (
    <Link
      href={tool.route}
      className={`group flex flex-col gap-3 rounded-2xl border-2 bg-white p-5 transition-all hover:shadow-md hover:-translate-y-0.5 min-w-[220px] ${
        elevated
          ? 'border-blue-200 hover:border-[#0033A0]/60'
          : 'border-gray-200 hover:border-[#0033A0]/40'
      }`}
    >
      {/* Emoji or icon badge */}
      <div className="flex items-center gap-2.5">
        {tool.emoji ? (
          <span className="text-2xl leading-none">{tool.emoji}</span>
        ) : (
          <div className={`size-8 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center flex-shrink-0`}>
            <Icon className="size-4 text-white" />
          </div>
        )}
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Platform
        </span>
        {elevated && (
          <Bot className="size-3.5 text-[#0033A0] ml-auto" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1">
        <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#0033A0] transition-colors leading-tight">
          {tool.label}
        </h4>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
          {tool.hook}
        </p>
      </div>

      {/* CTA — appears on hover */}
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0] opacity-0 group-hover:opacity-100 transition-opacity">
        Launch <ArrowRight className="size-3" />
      </span>
    </Link>
  )
}
