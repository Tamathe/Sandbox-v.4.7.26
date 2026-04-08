import { Metadata } from 'next'

export const revalidate = 3600

import {
  BookOpen,
  MessageSquare,
  BarChart3,
  Blocks,
  GraduationCap,
  Shield,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Showcase | University of Kentucky',
  description: 'Explore 6 core platform experiences at the University of Kentucky.',
}

const EXPERIENCES = [
  {
    title: 'AI Tool Builder',
    description:
      'Educators create custom AI-powered learning tools in minutes — no coding required. Drag, configure, publish.',
    icon: Blocks,
    href: '/hub?tab=build',
    color: 'text-[#0033A0]',
    bg: 'bg-blue-50',
  },
  {
    title: 'Course Map',
    description:
      'Upload a syllabus and watch AI extract objectives, schedules, and prerequisite relationships automatically.',
    icon: BookOpen,
    href: '/hub?tab=courses',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    title: 'Sandy Concierge',
    description:
      'Context-aware AI assistant that adapts to every page — offering study plans, recommendations, and proactive nudges.',
    icon: MessageSquare,
    href: '/hub',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    title: 'Analytics Dashboard',
    description:
      'Real-time engagement metrics, at-risk student detection, and course health scoring for faculty and admins.',
    icon: BarChart3,
    href: '/analytics',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    title: 'Student Intelligence',
    description:
      'Personalized learning profiles with concept mastery tracking, study group matching, and adaptive recommendations.',
    icon: GraduationCap,
    href: '/hub?tab=tools',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
  },
  {
    title: 'Compliance & Privacy',
    description:
      'FERPA, GDPR, and COPPA compliance built in — audit trails, consent management, and data retention controls.',
    icon: Shield,
    href: '/compliance',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  },
] as const

export default function ShowcasePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900">
          University of Kentucky Experience
        </h1>
        <p className="mt-2 text-base text-gray-600">
          Six core capabilities powering the AI university of the future.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {EXPERIENCES.map((exp) => (
          <a
            key={exp.title}
            href={exp.href}
            className="group flex flex-col gap-4 rounded-2xl border-2 border-gray-200 p-6 transition-all hover:border-[#0033A0] hover:shadow-lg"
          >
            <div
              className={`flex size-12 items-center justify-center rounded-xl ${exp.bg}`}
            >
              <exp.icon className={`size-6 ${exp.color}`} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 group-hover:text-[#0033A0]">
                {exp.title}
              </h2>
              <p className="mt-1 text-sm text-gray-600">{exp.description}</p>
            </div>
          </a>
        ))}
      </div>
    </main>
  )
}
