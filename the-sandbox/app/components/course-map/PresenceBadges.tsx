'use client'

// ── Editor colors palette ───────────────────────────────────────────────────

const EDITOR_COLORS = [
  '#dc2626', '#2563eb', '#9333ea', '#059669', '#d97706', '#db2777',
  '#0891b2', '#4f46e5', '#ea580c', '#65a30d',
]

function getEditorColor(index: number): string {
  return EDITOR_COLORS[index % EDITOR_COLORS.length]
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface EditingBadge {
  userId: string
  userName: string
  colorIndex: number
}

interface PresenceBadgesProps {
  /** Editors currently working on this node */
  editors: EditingBadge[]
  /** Position offset from top-right of node */
  offsetX?: number
  offsetY?: number
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * Small avatar badges on graph nodes being edited by other users.
 * Pulsing border animation indicates active editing.
 * Tooltip shows "{userName} is editing..."
 * Stacks multiple badges if >1 editor on same node.
 */
export default function PresenceBadges({
  editors,
  offsetX = -4,
  offsetY = -4,
}: PresenceBadgesProps) {
  if (editors.length === 0) return null

  return (
    <div
      className="absolute flex -space-x-1.5 z-20 pointer-events-auto"
      style={{ top: offsetY, right: offsetX }}
    >
      {editors.slice(0, 4).map((editor) => {
        const color = getEditorColor(editor.colorIndex)
        return (
          <div
            key={editor.userId}
            className="relative group"
          >
            <div
              className="size-5 rounded-full border-2 flex items-center justify-center text-[8px] font-bold text-white animate-pulse"
              style={{
                backgroundColor: color,
                borderColor: `${color}80`,
                boxShadow: `0 0 0 2px ${color}30`,
              }}
              title={`${editor.userName} is editing...`}
            >
              {editor.userName.charAt(0).toUpperCase()}
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50">
              <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg">
                {editor.userName} is editing...
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        )
      })}
      {editors.length > 4 && (
        <div
          className="size-5 rounded-full bg-gray-600 border-2 border-white flex items-center justify-center text-[8px] font-bold text-white"
          title={`${editors.length - 4} more editing`}
        >
          +{editors.length - 4}
        </div>
      )}
    </div>
  )
}
