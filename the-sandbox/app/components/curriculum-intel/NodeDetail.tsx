'use client'

import {
  X,
  BookOpen,
  GitBranch,
  BarChart3,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import type { NodeDetail as NodeDetailType, BloomLevel } from '../../lib/curriculum-intel/types'
import { BLOOM_COLORS } from '../../lib/curriculum-intel/types'

const UK_BLUE = '#0033A0'

interface NodeDetailProps {
  node: NodeDetailType
  onClose: () => void
  onNavigate?: (nodeId: string) => void
}

export default function NodeDetail({ node, onClose, onNavigate }: NodeDetailProps) {
  const bloomColor = node.bloomLevel ? BLOOM_COLORS[node.bloomLevel] : '#6b7280'

  return (
    <div className="border rounded-2xl shadow-sm bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b bg-gray-50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: bloomColor }}
            >
              {node.bloomLevel ?? 'unclassified'}
            </span>
            <span className="text-[10px] text-gray-400 uppercase font-medium">
              {node.type}
            </span>
            {node.department && (
              <span className="text-[10px] text-gray-400">
                {node.department}
              </span>
            )}
          </div>
          <h3 className="text-base font-extrabold text-gray-900">{node.label}</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg">
          <X className="size-4 text-gray-500" />
        </button>
      </div>

      {/* Mastery metrics */}
      <div className="grid grid-cols-3 gap-3 p-4 border-b">
        <div className="text-center">
          <div className="text-xl font-extrabold text-gray-900">
            {node.avgMastery != null ? `${(node.avgMastery * 100).toFixed(0)}%` : '--'}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Avg Mastery</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-extrabold text-gray-900">
            {node.masteryVariance != null ? node.masteryVariance.toFixed(2) : '--'}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Variance</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-extrabold text-gray-900">
            {node.courses.length}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Courses</div>
        </div>
      </div>

      {/* Courses */}
      {node.courses.length > 0 && (
        <div className="p-4 border-b">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
            <BookOpen className="size-3.5" /> Courses
          </h4>
          <div className="space-y-1">
            {node.courses.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate">{c.courseId}</span>
                <div className="flex gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px]">
                    {c.role}
                  </span>
                  {c.bloomLevel && (
                    <span
                      className="px-1.5 py-0.5 rounded text-white text-[10px]"
                      style={{ backgroundColor: BLOOM_COLORS[c.bloomLevel as BloomLevel] ?? '#6b7280' }}
                    >
                      {c.bloomLevel}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prerequisites */}
      {node.prerequisites.length > 0 && (
        <div className="p-4 border-b">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
            <ArrowLeft className="size-3.5" /> Prerequisites ({node.prerequisites.length})
          </h4>
          <div className="space-y-1">
            {node.prerequisites.map(p => (
              <button
                key={p.id}
                onClick={() => onNavigate?.(p.id)}
                className="flex items-center justify-between w-full text-xs text-left hover:bg-gray-50 rounded-lg px-2 py-1"
              >
                <span className="text-gray-700 truncate">{p.label}</span>
                <span className="text-gray-400 text-[10px] flex-shrink-0 ml-2">
                  strength: {p.strength.toFixed(1)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dependents */}
      {node.dependents.length > 0 && (
        <div className="p-4">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
            <ArrowRight className="size-3.5" /> Dependents ({node.dependents.length})
          </h4>
          <div className="space-y-1">
            {node.dependents.map(d => (
              <button
                key={d.id}
                onClick={() => onNavigate?.(d.id)}
                className="flex items-center justify-between w-full text-xs text-left hover:bg-gray-50 rounded-lg px-2 py-1"
              >
                <span className="text-gray-700 truncate">{d.label}</span>
                <span className="text-gray-400 text-[10px] flex-shrink-0 ml-2">
                  strength: {d.strength.toFixed(1)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Best tool/course */}
      {(node.bestCourse || node.bestTool) && (
        <div className="p-4 border-t bg-blue-50">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[#0033A0] mb-1">
            <BarChart3 className="size-3.5" /> Best Performers
          </h4>
          {node.bestCourse && (
            <p className="text-xs text-gray-600">
              Best course: <span className="font-medium">{node.bestCourse}</span>
            </p>
          )}
          {node.bestTool && (
            <p className="text-xs text-gray-600">
              Best tool: <span className="font-medium">{node.bestTool}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
