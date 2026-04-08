'use client'

import Link from 'next/link'
import { FileText, ChevronRight, Calendar } from 'lucide-react'

interface ProjectCardProps {
  project: {
    id: string
    title: string
    surveyOrg: string | null
    status: string
    questionCount: number
    vaultDocCount: number
    createdAt: string
  }
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-700',
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const statusStyle = STATUS_STYLES[project.status] ?? 'bg-gray-100 text-gray-700'
  const created = new Date(project.createdAt)

  return (
    <Link
      href={`/staff/survey-intelligence/${project.id}`}
      className="block border-2 border-gray-200 rounded-2xl bg-white p-5 hover:border-[#0033A0]/30 transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="size-5 text-[#0033A0] shrink-0" />
          <h3 className="text-base font-extrabold text-gray-900 leading-tight truncate">
            {project.title}
          </h3>
        </div>
        <ChevronRight className="size-5 text-gray-300 group-hover:text-[#0033A0] shrink-0 transition-colors" />
      </div>

      {project.surveyOrg && (
        <p className="text-xs text-gray-500 mb-3">{project.surveyOrg}</p>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusStyle}`}>
          {project.status}
        </span>
        <span className="text-xs text-gray-500">
          {project.questionCount} question{project.questionCount !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-gray-500">
          {project.vaultDocCount} doc{project.vaultDocCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-center gap-1 text-xs text-gray-400">
        <Calendar className="size-3" />
        Created {created.toLocaleDateString()}
      </div>
    </Link>
  )
}
