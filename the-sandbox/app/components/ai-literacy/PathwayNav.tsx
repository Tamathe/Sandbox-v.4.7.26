'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'

interface PathwayStep {
  label: string
  href: string
}

const EDUCATOR_PATHWAY: PathwayStep[] = [
  { label: 'Stance Navigator', href: '/ai-literacy/stance' },
  { label: 'Policy Builder', href: '/ai-literacy/policy' },
  { label: 'Assignment Redesign', href: '/ai-literacy/assignments' },
  { label: 'Syllabus Drop', href: '/ai-literacy/syllabus-drop' },
  { label: 'Process Assessment', href: '/ai-literacy/process' },
  { label: 'Prompt Lab', href: '/ai-literacy/prompt-lab' },
  { label: 'Output Evaluator', href: '/ai-literacy/output-eval' },
  { label: 'Pedagogy Hub', href: '/ai-literacy/pedagogy' },
  { label: 'Discipline Identity', href: '/ai-literacy/discipline' },
  { label: 'Advising Framework', href: '/ai-literacy/advising' },
]

const STUDENT_PATHWAY: PathwayStep[] = [
  { label: 'My AI Policies', href: '/ai-literacy/student/policies' },
  { label: 'Judgment Calls', href: '/ai-literacy/student/judgment-calls' },
  { label: 'Prompt Craft', href: '/ai-literacy/student/prompt-craft' },
  { label: 'Output Detective', href: '/ai-literacy/student/output-detective' },
  { label: 'AI Study Coach', href: '/ai-literacy/student/study-coach' },
]

export default function PathwayNav() {
  const pathname = usePathname()

  const isStudent = pathname.startsWith('/ai-literacy/student/')
  const pathway = isStudent ? STUDENT_PATHWAY : EDUCATOR_PATHWAY
  const currentIndex = pathway.findIndex(s => s.href === pathname)

  if (currentIndex === -1) return null

  const prev = currentIndex > 0 ? pathway[currentIndex - 1] : null
  const next = currentIndex < pathway.length - 1 ? pathway[currentIndex + 1] : null
  const stepNumber = currentIndex + 1
  const totalSteps = pathway.length

  return (
    <nav aria-label="Module pathway" className="mt-12 border-t-2 border-gray-100 pt-8">
      {/* Step dots */}
      <div className="flex items-center justify-center gap-1.5 mb-6">
        {pathway.map((step, idx) => (
          <Link
            key={step.href}
            href={step.href}
            aria-label={`${step.label}${idx === currentIndex ? ' (current)' : ''}`}
            className={`block rounded-full transition-all ${
              idx === currentIndex
                ? 'size-3 bg-[#0033A0]'
                : idx < currentIndex
                  ? 'size-2.5 bg-[#0033A0]/30'
                  : 'size-2.5 bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Label */}
      <p className="text-center text-xs text-gray-400 mb-4">
        Module {stepNumber} of {totalSteps}
      </p>

      {/* Prev / Hub / Next */}
      <div className="flex items-center justify-between gap-4">
        {prev ? (
          <Link
            href={prev.href}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#0033A0] transition-colors group"
          >
            <ChevronLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">{prev.label}</span>
            <span className="sm:hidden">Previous</span>
          </Link>
        ) : (
          <div />
        )}

        <Link
          href="/ai-literacy"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#0033A0] transition-colors"
        >
          <LayoutGrid className="size-3.5" />
          All Modules
        </Link>

        {next ? (
          <Link
            href={next.href}
            className="flex items-center gap-2 text-sm font-medium text-[#0033A0] hover:text-[#0033A0]/80 transition-colors group"
          >
            <span className="hidden sm:inline">{next.label}</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ) : (
          <Link
            href="/ai-literacy"
            className="flex items-center gap-2 text-sm font-medium text-[#0033A0] hover:text-[#0033A0]/80 transition-colors group"
          >
            <span>Back to Hub</span>
            <ChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>
    </nav>
  )
}
