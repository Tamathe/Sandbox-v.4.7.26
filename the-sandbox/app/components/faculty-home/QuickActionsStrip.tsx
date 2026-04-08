'use client'

import Link from 'next/link'
import {
  Blocks,
  ClipboardCheck,
  Clock3,
  FilePlus2,
  FileSignature,
  Megaphone,
  Wand2,
} from 'lucide-react'
import type { FacultyHomepageV2Data } from '../../lib/faculty/homepage-types'

interface QuickActionsStripProps {
  quickActions: FacultyHomepageV2Data['quickActions']
  onOpenGradingQueue?: () => void
}

type SandyAction = {
  label: string
  message: string
  tool: string
}

function openSandyAction(action: SandyAction) {
  window.dispatchEvent(
    new CustomEvent('uky-sandy-tool', {
      detail: {
        tool: action.tool,
        message: action.message,
      },
    }),
  )

  window.dispatchEvent(
    new CustomEvent('sandy-prefill', {
      detail: {
        message: action.message,
        autoSend: true,
      },
    }),
  )
}

export default function QuickActionsStrip({ quickActions, onOpenGradingQueue, activeCourseId, recentDraft }: QuickActionsStripProps & { activeCourseId?: string; recentDraft?: { id: string; name: string } }) {
  const buttonClassName =
    'group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 whitespace-nowrap snap-start transition-colors hover:border-[#0033A0] hover:bg-[#0033A0] hover:text-white'

  // Build contextual Sandy actions based on current urgencies
  const allSandyActions: Array<{ label: string; icon: typeof Megaphone; action: SandyAction; priority: number }> = [
    {
      label: 'Post announcement',
      icon: Megaphone,
      priority: 3,
      action: {
        label: 'Post announcement',
        tool: 'post_announcement',
        message: 'Help me post a course announcement to my students today.',
      },
    },
    {
      label: 'Create assignment',
      icon: FilePlus2,
      priority: 4,
      action: {
        label: 'Create assignment',
        tool: 'create_assignment',
        message: 'Help me create a new assignment for my course.',
      },
    },
    {
      label: 'Schedule office hours',
      icon: Clock3,
      priority: 5,
      action: {
        label: 'Schedule office hours',
        tool: 'block_time',
        message: 'Help me schedule office hours this week and block the time on my calendar.',
      },
    },
    {
      label: 'Write recommendation',
      icon: FileSignature,
      priority: 6,
      action: {
        label: 'Write recommendation',
        tool: 'draft_recommendation',
        message: 'Start a recommendation letter draft and ask me for the student, purpose, and target organization.',
      },
    },
  ]

  // Sort by priority (lower = higher priority), cap at 4
  const sandyActions = allSandyActions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 4)

  return (
    <div className="flex gap-3 overflow-x-auto py-3 snap-x snap-mandatory scrollbar-hide">
      {/* Grade submissions — opens cross-course grading queue modal */}
      <button
        type="button"
        onClick={onOpenGradingQueue}
        className={buttonClassName}
      >
        <ClipboardCheck className="size-4 shrink-0" />
        <span>Grade submissions</span>
      </button>

      {/* Resume draft — contextual, only if an unpublished draft exists */}
      {recentDraft && (
        <Link
          href={`/publish?edit=${recentDraft.id}`}
          className={buttonClassName}
        >
          <Wand2 className="size-4 shrink-0" />
          <span>Resume draft</span>
        </Link>
      )}

      {/* Sandy-powered actions */}
      {sandyActions.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => openSandyAction(item.action)}
          className={buttonClassName}
        >
          <item.icon className="size-4 shrink-0" />
          <span>{item.label}</span>
        </button>
      ))}

      {/* Build a tool — context-aware launch */}
      <Link
        href={activeCourseId ? `/build?courseId=${activeCourseId}` : '/build'}
        className={buttonClassName}
      >
        <Blocks className="size-4 shrink-0" />
        <span>Build a tool</span>
      </Link>
    </div>
  )
}
