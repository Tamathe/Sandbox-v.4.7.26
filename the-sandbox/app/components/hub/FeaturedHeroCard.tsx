'use client'

import Link from 'next/link'
import { ArrowRight, Star } from 'lucide-react'
import type { ShowcaseTool } from '../../hub/hub-config'

interface FeaturedHeroCardProps {
  tool: ShowcaseTool
  tagline: string
}

export default function FeaturedHeroCard({ tool, tagline }: FeaturedHeroCardProps) {
  const Icon = tool.icon

  return (
    <Link
      href={tool.route}
      className="group relative flex flex-col gap-4 rounded-2xl border-2 border-gray-200 bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-1 hover:border-[#0033A0]/50"
    >
      {/* Featured badge */}
      <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
        <Star className="size-3 fill-amber-400 text-amber-400" />
        Featured
      </span>

      {/* Icon + emoji */}
      <div className="flex items-center gap-3">
        {tool.emoji ? (
          <span className="text-3xl leading-none">{tool.emoji}</span>
        ) : (
          <div className={`size-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center flex-shrink-0`}>
            <Icon className="size-6 text-white" />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1">
        <h3 className="text-base font-extrabold text-gray-900 group-hover:text-[#0033A0] transition-colors">
          {tool.label}
        </h3>
        <p className="text-sm text-gray-600 mt-1 leading-relaxed">
          {tool.hook}
        </p>
        <p className="text-xs text-[#0033A0] font-semibold mt-2">
          {tagline}
        </p>
      </div>

      {/* CTA */}
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0033A0] opacity-0 group-hover:opacity-100 transition-opacity">
        Launch <ArrowRight className="size-4" />
      </span>
    </Link>
  )
}
