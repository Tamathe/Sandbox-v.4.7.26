'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Sparkles,
  GraduationCap,
  Users,
  Target,
  Compass,
  Calendar,
  Briefcase,
  Flame,
  MapPin,
} from 'lucide-react'
import type { QuickAction, SmartStudyTarget } from '../../lib/student-home-data'
import MetricExplainer from '../shared/MetricExplainer'

const ICON_MAP: Record<QuickAction['iconName'], React.ComponentType<{ className?: string }>> = {
  'book-open': BookOpen,
  sparkles: Sparkles,
  'graduation-cap': GraduationCap,
  users: Users,
  target: Target,
  compass: Compass,
  calendar: Calendar,
  briefcase: Briefcase,
  'map-pin': MapPin,
}

interface QuickActionChipsProps {
  actions: QuickAction[]
  smartStudyTarget?: SmartStudyTarget | null
  onFlashcardReview?: () => void
}

const URGENCY_STYLES: Record<SmartStudyTarget['urgency'], string> = {
  critical: 'bg-red-50 border-red-300 text-red-800 hover:border-red-400',
  high: 'bg-amber-50 border-amber-300 text-amber-800 hover:border-amber-400',
  normal: 'bg-white border-gray-200 text-gray-700 hover:border-[#0033A0]/30 hover:text-[#0033A0]',
}

export default function QuickActionChips({ actions, smartStudyTarget, onFlashcardReview }: QuickActionChipsProps) {
  const router = useRouter()

  if (actions.length === 0 && !smartStudyTarget) return null

  function handleSmartStudy(target: SmartStudyTarget) {
    const action = target.action
    switch (action.type) {
      case 'flashcard-quick-review':
        onFlashcardReview?.()
        break
      case 'exam-prep':
        // Navigate to course → Sandy auto-sends exam prep prompt
        router.push(`/courses?course=${action.courseId}`)
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('sandy-prefill', {
            detail: { message: `Help me prepare for my upcoming exam in ${action.courseName}. Start with a diagnostic quiz to find my weak spots.`, autoSend: true },
          }))
        }, 500)
        break
      case 'tutor':
        // Navigate to course → Sandy auto-sends concept help prompt
        router.push(`/courses?course=${action.courseId}`)
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('sandy-prefill', {
            detail: { message: `Help me understand "${action.concept}" in ${action.courseName}. I'm struggling with this concept.`, autoSend: true },
          }))
        }, 500)
        break
      case 'quiz':
        // Navigate to course → Sandy auto-sends quiz prompt
        router.push(`/courses?course=${action.courseId}`)
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('sandy-prefill', {
            detail: { message: `Quiz me on ${action.courseName} to test what I know. Start with the key concepts.`, autoSend: true },
          }))
        }, 500)
        break
      case 'general-study':
        router.push('/hub')
        break
    }
  }

  return (
    <div className="relative">
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {/* Smart Study chip — always first */}
      {smartStudyTarget && (
        <button
          onClick={() => handleSmartStudy(smartStudyTarget)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold transition-all whitespace-nowrap shadow-sm cursor-pointer ${URGENCY_STYLES[smartStudyTarget.urgency]}${smartStudyTarget.urgency === 'critical' ? ' animate-pulse' : ''}`}
        >
          {smartStudyTarget.urgency === 'critical'
            ? <Flame className="size-4" />
            : <BookOpen className="size-4" />
          }
          <span className="flex flex-col items-start leading-tight">
            <span>{smartStudyTarget.label}</span>
            <span className="text-[10px] font-medium opacity-75 inline-flex items-center gap-1">
              {smartStudyTarget.sublabel}
              <MetricExplainer text="Flashcards are auto-generated from your course materials using spaced repetition. Reviewing due cards strengthens long-term retention." />
            </span>
          </span>
        </button>
      )}

      {actions.map((action) => {
        const Icon = ICON_MAP[action.iconName]
        return (
          <Link
            key={action.id}
            href={action.href}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:border-[#0033A0]/30 hover:text-[#0033A0] transition-all whitespace-nowrap shadow-sm"
          >
            <Icon className="size-4" />
            <span>{action.label}</span>
            {action.badge && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${action.badgeColor || 'bg-gray-100 text-gray-600'}`}
              >
                {action.badge}
              </span>
            )}
          </Link>
        )
      })}
    </div>
    {/* Right-edge scroll hint */}
    <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent lg:hidden" />
    </div>
  )
}
