'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bot, ExternalLink, Loader2, Plus, Sparkles, Wrench } from 'lucide-react'
import StudyBuddyInterface from '../StudyBuddyInterface'

// Fix 15: module-level cache — survives tab switches, resets on page reload
let cachedStudyBuddyToolId: string | null | undefined = undefined

interface LinkedTool {
  id: string
  name: string
  shortDescription: string
  category: string
  toolType: string
}

interface CourseStudyPanelProps {
  courseId: string
  courseName: string
  courseCode: string
  userEmail: string
  linkedTools: LinkedTool[]
  canManage: boolean
  materials?: { title: string }[]
  onLinkTool?: () => void
}

export default function CourseStudyPanel({
  courseId,
  courseName,
  courseCode,
  userEmail,
  linkedTools,
  canManage,
  materials,
  onLinkTool,
}: CourseStudyPanelProps) {
  const [studyBuddyToolId, setStudyBuddyToolId] = useState<string | null>(null)
  const [loadingTool, setLoadingTool] = useState(true)

  // Fix 15: Fetch the platform Study Buddy tool, skip if already cached
  useEffect(() => {
    if (cachedStudyBuddyToolId !== undefined) {
      setStudyBuddyToolId(cachedStudyBuddyToolId)
      setLoadingTool(false)
      return
    }

    fetch('/api/tools?toolType=STUDY_BUDDY&limit=1', {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const tools = data?.tools ?? data ?? []
        const id = tools.length > 0 ? tools[0].id : null
        cachedStudyBuddyToolId = id
        setStudyBuddyToolId(id)
      })
      .catch(() => {
        cachedStudyBuddyToolId = null
        setStudyBuddyToolId(null)
      })
      .finally(() => setLoadingTool(false))
  }, [userEmail])

  // Non-Study-Buddy tools for the launcher panel
  const launcherTools = linkedTools.filter(t => t.toolType !== 'STUDY_BUDDY')

  // Fix 9: pass top material titles as suggested topics for Teach Back mode
  const suggestedTopics = materials?.slice(0, 4).map(m => m.title)

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Study Buddy — main panel */}
      <div className="flex-1 min-w-0">
        <div className="mb-3 flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-[#0033A0] to-purple-600 rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Study Buddy</h3>
            <p className="text-xs text-gray-500">Powered by {courseCode} course materials</p>
          </div>
        </div>

        <div className="h-[min(640px,calc(100vh-320px))] min-h-[400px]">
          {loadingTool ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : !studyBuddyToolId ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
              <Sparkles className="h-8 w-8 text-gray-300" />
              {canManage ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-700">No Study Buddy set up yet</p>
                    <p className="mt-1 text-xs text-gray-500 max-w-xs">Create an AI Teaching Assistant from your course materials and it will power this Study tab.</p>
                  </div>
                  <Link
                    href={`/courses?course=${courseCode}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002580] transition-colors"
                    onClick={onLinkTool}
                  >
                    <Sparkles className="h-4 w-4" />
                    Create Teaching Assistant
                  </Link>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Study Buddy not available yet</p>
                    <p className="mt-1 text-xs text-gray-400">Your instructor hasn&apos;t set up a Study Buddy for this course.</p>
                  </div>
                  <Link
                    href="/tools"
                    className="text-xs text-[#0033A0] font-medium hover:underline"
                  >
                    Browse tools in the marketplace →
                  </Link>
                </>
              )}
            </div>
          ) : (
            <StudyBuddyInterface
              toolId={studyBuddyToolId}
              toolName="Study Buddy"
              courseId={courseId}
              courseName={`${courseCode} · ${courseName}`}
              userEmail={userEmail}
              suggestedTopics={suggestedTopics}
            />
          )}
        </div>
      </div>

      {/* Course Tools launcher — right panel */}
      <div className="w-full lg:w-72 flex-shrink-0">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Tools for {courseCode}</h3>
          </div>
          {canManage && onLinkTool && (
            <button
              onClick={onLinkTool}
              className="flex items-center gap-1 text-xs text-[#0033A0] font-medium hover:text-purple-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Link
            </button>
          )}
        </div>

        <div className="space-y-2">
          {launcherTools.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
              <Wrench className="mx-auto mb-2 h-6 w-6 text-gray-300" />
              <p className="text-xs font-medium text-gray-500">No tools linked yet</p>
              {canManage && onLinkTool && (
                <button
                  onClick={onLinkTool}
                  className="mt-2 text-xs text-[#0033A0] font-medium hover:underline"
                >
                  + Link a tool
                </button>
              )}
            </div>
          ) : (
            launcherTools.map(tool => (
              <ToolLaunchCard key={tool.id} tool={tool} />
            ))
          )}
        </div>

        {/* Study tip */}
        <div className="mt-4 rounded-xl bg-[#0033A0]/5 border border-[#0033A0]/10 p-3">
          <p className="text-xs text-[#0033A0] font-medium mb-1">Tip</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            Study Buddy automatically uses all materials uploaded to this course. Upload more materials to power better quizzes and explanations.
          </p>
        </div>
      </div>
    </div>
  )
}

function ToolLaunchCard({ tool }: { tool: LinkedTool }) {
  const typeColors: Record<string, string> = {
    CHATBOT: 'bg-blue-100 text-blue-700',
    QUIZ: 'bg-violet-100 text-violet-700',
    DEBATE: 'bg-red-100 text-red-700',
    AI_INTERVIEW: 'bg-amber-100 text-amber-700',
    SIMULATION: 'bg-emerald-100 text-emerald-700',
    EXTERNAL: 'bg-gray-100 text-gray-600',
  }

  const typeLabel: Record<string, string> = {
    CHATBOT: 'Chatbot',
    QUIZ: 'Quiz',
    DEBATE: 'Debate',
    AI_INTERVIEW: 'Interview',
    SIMULATION: 'Simulation',
    EXTERNAL: 'External',
  }

  const colorClass = typeColors[tool.toolType] ?? 'bg-gray-100 text-gray-600'
  const label = typeLabel[tool.toolType] ?? tool.toolType

  return (
    <Link
      href={`/tools/${tool.id}`}
      className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:border-[#0033A0]/40 hover:shadow-md transition-all group"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${colorClass}`}>
            {label}
          </span>
        </div>
        <p className="font-medium text-gray-900 text-sm truncate">{tool.name}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-snug">{tool.shortDescription}</p>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#0033A0] flex-shrink-0 mt-1 transition-colors" />
    </Link>
  )
}
