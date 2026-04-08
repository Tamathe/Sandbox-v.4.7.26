'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Clock, ChevronRight, CheckCircle, Circle } from 'lucide-react'
import Link from 'next/link'
import PageHeader from '../../../components/PageHeader'
import { useAuth } from '../../../lib/auth-context'
import { STUDENT_MODULES } from '../../../lib/student-ai-literacy-service'
import type { ModuleStatus, StudentModuleKey } from '../../../lib/ai-literacy/student-progress-service'

const MODULE_ROUTES: Record<string, string> = {
  'responsible-use': '/ai-literacy/student/responsible-use',
  'when-not-to-use': '/ai-literacy/student/when-not-to-use',
  'citing-ai': '/ai-literacy/student/citing-ai',
  'critical-evaluation': '/ai-literacy/student/critical-evaluation',
}

const INTERACTIVE_MODULES: { id: StudentModuleKey; title: string; description: string; estimatedMinutes: number }[] = [
  { id: 'policies', title: 'My AI Policies', description: 'See how each of your courses handles AI — and test your understanding.', estimatedMinutes: 10 },
  { id: 'judgment-calls', title: 'Judgment Calls', description: 'Navigate real-world AI dilemmas through branching decision scenarios.', estimatedMinutes: 15 },
  { id: 'prompt-craft', title: 'Prompt Craft', description: 'Learn to write better prompts across 5 skill levels.', estimatedMinutes: 15 },
  { id: 'output-detective', title: 'Output Detective', description: 'Spot errors, hallucinations, and bias in AI-generated responses.', estimatedMinutes: 15 },
  { id: 'study-coach', title: 'AI Study Coach', description: 'Practice using AI as a study partner with real-time coaching feedback.', estimatedMinutes: 20 },
]

function StatusBadge({ status }: { status: ModuleStatus }) {
  if (status === 'completed') {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-green-700">
        <CheckCircle className="size-3.5" /> Complete
      </span>
    )
  }
  if (status === 'in-progress') {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
        <Clock className="size-3.5" /> In Progress
      </span>
    )
  }
  return <Circle className="size-3.5 text-gray-300" />
}

export default function StudentAILiteracyPage() {
  const { currentUser } = useAuth()
  const [progress, setProgress] = useState<Record<StudentModuleKey, ModuleStatus> | null>(null)

  useEffect(() => {
    if (!currentUser) return
    const headers = { 'x-demo-user-email': currentUser.email }

    fetch('/api/ai-literacy/student/progress', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(setProgress)
      .catch(() => {})

    // Fire-and-forget: recalculate student profile so it stays fresh
    fetch('/api/ai-literacy/student/profile', { method: 'POST', headers }).catch(() => {})
  }, [currentUser])

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
          <Link href="/ai-literacy" className="hover:text-gray-900">AI Literacy</Link>
          <ChevronRight className="size-3" />
          <span>Student AI Literacy</span>
        </nav>
      </div>
      <PageHeader
        title="AI Literacy for Students"
        subtitle="Learn to use AI responsibly, understand your course expectations, and think critically about AI output"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Interactive Modules */}
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 mb-4">Modules</h2>
          <div className="space-y-4">
            {INTERACTIVE_MODULES.map(mod => (
              <Link
                key={mod.id}
                href={`/ai-literacy/student/${mod.id}`}
                className="block w-full text-left p-5 bg-white border rounded-2xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-blue-50 flex items-center justify-center">
                      <BookOpen className="size-4 text-[#0033A0]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{mod.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{mod.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {progress && <StatusBadge status={progress[mod.id]} />}
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="size-3" /> {mod.estimatedMinutes} min
                    </span>
                    <ChevronRight className="size-4 text-gray-400" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Content Lessons */}
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 mb-4">Lessons</h2>
          <div className="space-y-4">
            {STUDENT_MODULES.map(mod => (
              <Link
                key={mod.id}
                href={MODULE_ROUTES[mod.id] ?? `/ai-literacy/student/${mod.id}`}
                className="block w-full text-left p-5 bg-white border rounded-2xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-blue-50 flex items-center justify-center">
                      <BookOpen className="size-4 text-[#0033A0]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{mod.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{mod.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="size-3" /> {mod.estimatedMinutes} min
                    </span>
                    <ChevronRight className="size-4 text-gray-400" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
