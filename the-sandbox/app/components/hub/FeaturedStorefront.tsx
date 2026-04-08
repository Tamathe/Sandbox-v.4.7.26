'use client'

import Link from 'next/link'
import { ArrowRight, Brain, PenTool, FileSearch, Scale, Sparkles } from 'lucide-react'

const MODULES = [
  { label: 'Stance Navigator', icon: Sparkles, route: '/ai-literacy/stance' },
  { label: 'Policy Builder', icon: Scale, route: '/ai-literacy/policy' },
  { label: 'Prompt Lab', icon: PenTool, route: '/ai-literacy/prompt-lab' },
  { label: 'Output Evaluator', icon: FileSearch, route: '/ai-literacy/output-eval' },
]

const MORE_COUNT = 6 // 10 total modules - 4 shown

export default function FeaturedStorefront() {
  return (
    <section className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#0033A0]/10 flex items-center justify-center">
            <Brain className="size-5 text-[#0033A0]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-gray-900">AI Literacy Hub</h2>
              <span className="text-[10px] font-semibold bg-[#0033A0]/10 text-[#0033A0] px-2 py-0.5 rounded-full uppercase tracking-wider">
                Storefront
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              8-module training ecosystem for faculty &amp; students
            </p>
          </div>
        </div>
        <Link
          href="/ai-literacy"
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-[#0033A0] rounded-full text-sm font-semibold text-white hover:bg-[#002580] transition-colors flex-shrink-0"
        >
          Explore <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Module pills */}
      <div className="px-6 pb-5 pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MODULES.map(mod => {
            const Icon = mod.icon
            return (
              <Link
                key={mod.label}
                href={mod.route}
                className="group flex items-center gap-2.5 rounded-xl border border-blue-100 bg-white px-3.5 py-3 hover:border-[#0033A0]/40 hover:shadow-sm transition-all"
              >
                <Icon className="size-4 text-[#0033A0] flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-700 group-hover:text-[#0033A0] transition-colors truncate">
                  {mod.label}
                </span>
              </Link>
            )
          })}
        </div>
        <div className="flex items-center justify-between mt-3">
          <Link
            href="/ai-literacy"
            className="text-xs font-semibold text-[#0033A0] hover:underline"
          >
            + {MORE_COUNT} more modules
          </Link>
          <Link
            href="/ai-literacy"
            className="sm:hidden text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1"
          >
            Explore all <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </section>
  )
}
