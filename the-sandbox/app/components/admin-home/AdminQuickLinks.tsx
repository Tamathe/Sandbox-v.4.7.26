'use client'

import Link from 'next/link'
import { Zap, LayoutDashboard, Users, ShieldCheck, Bot, Newspaper, BarChart3, type LucideIcon } from 'lucide-react'
import type { QuickLink } from './useAdminHome'

// ─── Icon Map ────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Bot,
  Newspaper,
  BarChart3,
}

// ─── Types ───────────────────────────────────────────────────

interface AdminQuickLinksProps {
  links: QuickLink[]
}

// ─── Component ───────────────────────────────────────────────

export default function AdminQuickLinks({ links }: AdminQuickLinksProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="size-4 text-gray-900" />
        <h2 className="text-base font-extrabold text-gray-900">Quick Links</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {links.map((link) => {
          const Icon = ICON_MAP[link.icon] ?? LayoutDashboard
          return (
            <Link key={link.href} href={link.href}>
              <div className="bg-gray-50 hover:bg-gray-100 rounded-xl p-3 transition-colors flex items-center gap-3">
                <div className="size-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Icon className="size-4 text-[#0033A0]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">{link.title}</p>
                  <p className="text-xs text-gray-400">{link.description}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
