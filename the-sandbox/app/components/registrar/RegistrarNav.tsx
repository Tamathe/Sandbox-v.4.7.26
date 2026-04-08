'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, GraduationCap, FileText, ArrowLeftRight, BookOpen, BarChart3, ClipboardList, ShieldCheck, Scale, Lock } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/registrar', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/registrar/degree-audit', label: 'Degree Audits', icon: GraduationCap },
  { href: '/registrar/petitions', label: 'Petitions', icon: FileText },
  { href: '/registrar/articulation', label: 'Transfer Credit', icon: ArrowLeftRight },
  { href: '/registrar/programs', label: 'Programs', icon: BookOpen },
  { href: '/registrar/academic-standing', label: 'Standing', icon: Scale },
  { href: '/registrar/holds', label: 'Holds', icon: Lock },
  { href: '/registrar/compliance', label: 'Compliance', icon: ShieldCheck },
  { href: '/registrar/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/registrar/reports', label: 'Reports', icon: ClipboardList },
]

export function RegistrarNav() {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <nav className="w-56 flex-shrink-0 hidden lg:block">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-[#0033A0]">
          <p className="text-xs font-bold text-white uppercase tracking-widest">Registrar Portal</p>
        </div>
        <div className="p-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-[#0033A0]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`size-4 ${active ? 'text-[#0033A0]' : 'text-gray-400'}`} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
