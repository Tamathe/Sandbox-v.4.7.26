'use client'

import { BookOpen, Users, UsersRound, FileText, Radio } from 'lucide-react'
import type { CrossCourseResource } from '../../lib/concept-bridge/types'

interface Props {
  resources: CrossCourseResource[]
  concept: string
}

const RESOURCE_ICONS: Record<string, typeof BookOpen> = {
  flashcards: BookOpen,
  'peer-experts': Users,
  'study-groups': UsersRound,
  materials: FileText,
  'live-rooms': Radio,
}

const RESOURCE_COLORS: Record<string, string> = {
  flashcards: 'bg-amber-50 text-amber-700 border-amber-200',
  'peer-experts': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'study-groups': 'bg-blue-50 text-[#0033A0] border-blue-200',
  materials: 'bg-purple-50 text-purple-700 border-purple-200',
  'live-rooms': 'bg-rose-50 text-rose-700 border-rose-200',
}

const RESOURCE_LABELS: Record<string, string> = {
  flashcards: 'Flashcards',
  'peer-experts': 'Peer Experts',
  'study-groups': 'Study Groups',
  materials: 'Course Materials',
  'live-rooms': 'Commons Sessions',
}

export default function BridgeResourceList({ resources, concept }: Props) {
  if (resources.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        No cross-course resources found for &quot;{concept}&quot;.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {resources.map((resource, i) => {
        const Icon = RESOURCE_ICONS[resource.type] ?? FileText
        const colorClass = RESOURCE_COLORS[resource.type] ?? 'bg-gray-50 text-gray-700 border-gray-200'
        const label = RESOURCE_LABELS[resource.type] ?? resource.type

        return (
          <div
            key={`${resource.type}-${resource.sourceCourse}-${i}`}
            className="flex items-start gap-3 p-3 border rounded-xl hover:shadow-sm transition-shadow"
          >
            <div className={`p-2 rounded-lg border ${colorClass}`}>
              <Icon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs text-gray-400">
                  {Math.round(resource.score * 100)}% match
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-0.5">{resource.reason}</p>
              <p className="text-xs text-gray-400 mt-1">
                From: {resource.sourceCourse} &middot; Concept: {resource.bridgedConcept}
              </p>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 shrink-0">
              {resource.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
