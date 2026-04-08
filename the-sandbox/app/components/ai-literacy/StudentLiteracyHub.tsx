'use client'

import Link from 'next/link'
import { FileCheck, Scale, PenTool, Search, GraduationCap, ChevronRight } from 'lucide-react'
import SandyStudentGreeting from './SandyStudentGreeting'
import StudentProfileCard from './StudentProfileCard'

interface StudentLiteracyHubProps {
  currentUser: { name: string; email: string; role: string }
  profileData?: {
    materialized: boolean
    profile?: {
      practicalSkill: number; communication: number; skepticism: number
      judgment: number; readiness: number; modulesCompleted: number
    } | null
    readinessBand?: { label: string; key: string }
  } | null
}

const MODULES = [
  {
    href: '/ai-literacy/student/policies',
    icon: FileCheck,
    iconColor: 'text-blue-600',
    bgTint: 'bg-blue-50',
    title: 'My AI Policies',
    description: 'Review AI policies for your enrolled courses.',
    time: '10 min',
  },
  {
    href: '/ai-literacy/student/judgment-calls',
    icon: Scale,
    iconColor: 'text-amber-600',
    bgTint: 'bg-amber-50',
    title: 'Judgment Calls',
    description: 'Practice ethical decisions with branching scenarios.',
    time: '15 min',
  },
  {
    href: '/ai-literacy/student/prompt-craft',
    icon: PenTool,
    iconColor: 'text-green-600',
    bgTint: 'bg-green-50',
    title: 'Prompt Craft',
    description: 'Level up your prompt writing for academic work.',
    time: '15 min',
  },
  {
    href: '/ai-literacy/student/output-detective',
    icon: Search,
    iconColor: 'text-purple-600',
    bgTint: 'bg-purple-50',
    title: 'Output Detective',
    description: 'Spot errors, hallucinations, and bias in AI responses.',
    time: '15 min',
  },
  {
    href: '/ai-literacy/student/study-coach',
    icon: GraduationCap,
    iconColor: 'text-rose-600',
    bgTint: 'bg-rose-50',
    title: 'AI Study Coach',
    description: 'Learn how to use AI effectively for studying.',
    time: '20 min',
  },
] as const

export default function StudentLiteracyHub({ currentUser, profileData }: StudentLiteracyHubProps) {
  const firstName = currentUser.name.split(' ')[0]

  return (
    <div className="space-y-6">
      <SandyStudentGreeting userName={firstName} courses={[]} />

      {profileData?.materialized && profileData.profile && profileData.readinessBand ? (
        <StudentProfileCard profile={profileData.profile} readinessBand={profileData.readinessBand} />
      ) : profileData && !profileData.materialized ? (
        <p className="text-xs text-gray-500">
          Complete 2 modules to unlock your AI literacy profile
        </p>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((mod) => {
          const Icon = mod.icon
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className="block bg-white border-2 border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-5"
            >
              <div className="flex items-start justify-between">
                <div className={`size-8 rounded-full ${mod.bgTint} flex items-center justify-center`}>
                  <Icon className={`size-4 ${mod.iconColor}`} />
                </div>
                <ChevronRight className="size-4 text-gray-300" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mt-3">{mod.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{mod.description}</p>
              <p className="text-xs text-gray-400 mt-2">{mod.time}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
