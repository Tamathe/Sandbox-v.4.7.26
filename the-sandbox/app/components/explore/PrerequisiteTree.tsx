'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, BookOpen } from 'lucide-react'

export interface PrerequisiteNode {
  courseCode: string
  title: string
  credits: number
  prerequisites: PrerequisiteNode[]
}

interface PrerequisiteTreeProps {
  node: PrerequisiteNode
  depth?: number
}

function TreeNode({ node, depth = 0 }: PrerequisiteTreeProps) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.prerequisites.length > 0

  return (
    <div className={depth > 0 ? 'ml-5 border-l border-gray-200 pl-3' : ''}>
      <button
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={`flex items-center gap-2 py-1.5 text-sm w-full text-left
                   ${hasChildren ? 'cursor-pointer hover:text-[#0033A0]' : 'cursor-default'}`}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="size-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="size-4 text-gray-400 shrink-0" />
          )
        ) : (
          <BookOpen className="size-4 text-gray-300 shrink-0" />
        )}
        <span className="font-semibold text-gray-900">{node.courseCode}</span>
        <span className="text-gray-500 truncate">{node.title}</span>
        {node.credits > 0 && (
          <span className="text-xs text-gray-400 shrink-0">{node.credits} cr</span>
        )}
      </button>

      {expanded && hasChildren && (
        <div className="mt-0.5">
          {node.prerequisites.map((child) => (
            <TreeNode key={child.courseCode} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function PrerequisiteTree({ node }: { node: PrerequisiteNode }) {
  if (node.prerequisites.length === 0) {
    return <p className="text-sm text-gray-400 italic">No prerequisites found in catalog.</p>
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
        Prerequisite Chain
      </h4>
      <TreeNode node={node} />
    </div>
  )
}
