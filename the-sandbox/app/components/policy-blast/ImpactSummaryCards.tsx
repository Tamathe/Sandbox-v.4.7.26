'use client'

import { BookOpen, Users, GraduationCap, Brain, ShieldCheck, FileText } from 'lucide-react'

interface ImpactSummaryCardsProps {
  affectedCourses: number
  affectedFaculty: number
  affectedStudents: number
  conflictingAIPolicies: number
  triggeredCompliance: number
  activePetitions: number
}

const cards = [
  { key: 'affectedCourses', label: 'Courses', icon: BookOpen },
  { key: 'affectedFaculty', label: 'Faculty', icon: Users },
  { key: 'affectedStudents', label: 'Students', icon: GraduationCap },
  { key: 'conflictingAIPolicies', label: 'AI Policies', icon: Brain },
  { key: 'triggeredCompliance', label: 'Compliance', icon: ShieldCheck },
  { key: 'activePetitions', label: 'Petitions', icon: FileText },
] as const

export default function ImpactSummaryCards(props: ImpactSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(({ key, label, icon: Icon }) => {
        const value = props[key]
        return (
          <div
            key={key}
            className="border rounded-2xl shadow-sm bg-white p-4 text-center"
          >
            <Icon className="size-5 text-[#0033A0] mx-auto mb-1" />
            <p className="text-2xl font-extrabold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        )
      })}
    </div>
  )
}
