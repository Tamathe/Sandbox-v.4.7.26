'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { HEROES } from '../../hub/hub-config'

interface HeroBannerProps {
  role: 'STUDENT' | 'EDUCATOR' | 'ADMIN' | 'STAFF'
}

export default function HeroBanner({ role }: HeroBannerProps) {
  const hero = HEROES.find(h => h.role === role)
  if (!hero) return null

  const Icon = hero.tool.icon

  return (
    <Link
      href={hero.tool.route}
      className="group relative block rounded-2xl overflow-hidden bg-white border-2 border-gray-200 hover:border-[#0033A0] hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="h-1 bg-[#0033A0]" />
      <div className="flex items-center gap-5 p-6 sm:p-8">
        <div className="flex-shrink-0 size-14 rounded-2xl bg-[#0033A0]/10 flex items-center justify-center">
          <Icon className="size-7 text-[#0033A0]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
            {hero.tool.label}
          </h2>
          <p className="text-sm text-gray-500 mt-1 max-w-lg">
            {hero.tool.hook}
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-[#0033A0] rounded-full text-sm font-semibold text-white group-hover:bg-[#002580] transition-colors flex-shrink-0">
          Launch <ArrowRight className="size-4" />
        </span>
      </div>
    </Link>
  )
}
