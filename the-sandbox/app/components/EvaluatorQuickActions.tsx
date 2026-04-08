'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  HelpCircle, Wrench, BarChart3, GraduationCap,
  MessageSquare, FileText, X,
} from 'lucide-react'
import { useAuth } from '../lib/auth-context'

const ACTIONS = [
  { label: 'Build a tool', href: '/build?evaluator=true', icon: Wrench },
  { label: 'View analytics', href: '/analytics/faculty?evaluator=true', icon: BarChart3 },
  { label: 'Explore student view', href: '/hub?evaluator=true', icon: GraduationCap },
  { label: 'Talk to Sandy', href: null, icon: MessageSquare, sandyTrigger: true },
  { label: 'View summary', href: '/evaluate/summary', icon: FileText },
]

export default function EvaluatorQuickActions() {
  const { evaluatorMode } = useAuth()
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!evaluatorMode) return null

  return (
    <div ref={panelRef} className="fixed bottom-[280px] right-6 z-[9989] print:hidden">
      {/* Panel */}
      <div
        className={`absolute bottom-14 right-0 w-56 bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden transition-all duration-200 origin-bottom-right ${
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="px-4 py-2.5 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Quick Actions</p>
        </div>
        <div className="py-1">
          {ACTIONS.map(action => (
            <button
              key={action.label}
              onClick={() => {
                setOpen(false)
                if (action.sandyTrigger) {
                  const el = document.querySelector<HTMLElement>('[data-sandy-trigger]')
                  if (el) el.click()
                } else if (action.href) {
                  router.push(action.href)
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#0033A0] transition cursor-pointer"
            >
              <action.icon className="size-4 shrink-0" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`size-11 rounded-full shadow-lg flex items-center justify-center transition cursor-pointer ${
          open
            ? 'bg-gray-700 text-white hover:bg-gray-800'
            : 'bg-[#0033A0] text-white hover:bg-[#002880]'
        }`}
      >
        {open ? <X className="size-5" /> : <HelpCircle className="size-5" />}
      </button>
    </div>
  )
}
