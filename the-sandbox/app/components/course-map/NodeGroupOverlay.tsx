'use client'

import { ChevronRight, Layers } from 'lucide-react'
import type { NodeGroup } from '../../lib/course-map/visualization-service'
import { VisualizationService } from '../../lib/course-map/visualization-service'

// ── Types ────────────────────────────────────────────────────────────────────

interface NodeGroupOverlayProps {
  groups: NodeGroup[]
  onToggleGroup: (groupId: string) => void
  nodeWidth?: number
  nodeHeight?: number
}

// ── Component ────────────────────────────────────────────────────────────────

export default function NodeGroupOverlay({
  groups,
  onToggleGroup,
  nodeWidth = 240,
  nodeHeight = 80,
}: NodeGroupOverlayProps) {
  if (groups.length === 0) return null

  return (
    <>
      {groups.map((group) => {
        const borderColor = VisualizationService.getGroupBorderColor(group.label)

        if (group.collapsed) {
          // Collapsed: show single summary node at group center
          const cx = group.boundingBox.x + group.boundingBox.width / 2 - nodeWidth / 2
          const cy = group.boundingBox.y + group.boundingBox.height / 2 - nodeHeight / 2

          return (
            <div
              key={group.id}
              className="absolute"
              style={{
                left: cx,
                top: cy,
                width: nodeWidth,
                zIndex: 5,
              }}
            >
              <button
                onClick={() => onToggleGroup(group.id)}
                className="w-full bg-white border-2 rounded-2xl px-4 py-3 text-left hover:shadow-md transition-shadow"
                style={{ borderColor }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Layers className="size-4 shrink-0 text-gray-400" />
                    <span className="text-sm font-bold text-gray-900 truncate">
                      {group.label}
                    </span>
                  </div>
                  <span
                    className="shrink-0 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: borderColor }}
                  >
                    {group.nodeIds.length}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Click to expand {group.nodeIds.length} nodes
                </p>
              </button>
            </div>
          )
        }

        // Expanded: render group bounding box behind nodes
        return (
          <div
            key={group.id}
            className="absolute rounded-2xl pointer-events-none"
            style={{
              left: group.boundingBox.x,
              top: group.boundingBox.y,
              width: group.boundingBox.width,
              height: group.boundingBox.height,
              backgroundColor: group.color,
              border: `2px solid ${borderColor}`,
              zIndex: 0,
            }}
          >
            {/* Group header */}
            <div
              className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none"
              onClick={() => onToggleGroup(group.id)}
            >
              <ChevronRight
                className="size-3.5 text-gray-500 transition-transform rotate-90"
              />
              <span className="text-xs font-semibold text-gray-600">
                {group.label}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {group.nodeIds.length} nodes
              </span>
            </div>
          </div>
        )
      })}
    </>
  )
}
