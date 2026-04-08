'use client'

import { useMemo } from 'react'

// ── Editor colors palette (shared with page.tsx) ────────────────────────────

const EDITOR_COLORS = [
  '#dc2626', '#2563eb', '#9333ea', '#059669', '#d97706', '#db2777',
  '#0891b2', '#4f46e5', '#ea580c', '#65a30d',
]

function getEditorColor(index: number): string {
  return EDITOR_COLORS[index % EDITOR_COLORS.length]
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface RemoteCursorData {
  userId: string
  userName: string
  x: number
  y: number
  lastUpdated: number
  colorIndex: number
}

interface LiveCursorsProps {
  cursors: RemoteCursorData[]
  /** Fade cursors after this many ms of inactivity (default 10000) */
  fadeAfterMs?: number
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * Renders colored cursors on the graph canvas for each remote user.
 * Each cursor shows a user name label + colored pointer SVG.
 * Smooth CSS transition animation + auto-fade after inactivity.
 */
export default function LiveCursors({ cursors, fadeAfterMs = 10000 }: LiveCursorsProps) {
  const now = useMemo(() => Date.now(), [cursors]) // eslint-disable-line react-hooks/exhaustive-deps

  if (cursors.length === 0) return null

  return (
    <>
      {cursors.map((cursor) => {
        const color = getEditorColor(cursor.colorIndex)
        const age = now - cursor.lastUpdated
        // Fade out over 2s after fadeAfterMs of inactivity
        const opacity = age > fadeAfterMs
          ? Math.max(0, 1 - (age - fadeAfterMs) / 2000)
          : age > fadeAfterMs * 0.7
            ? 0.7
            : 1

        if (opacity <= 0) return null

        return (
          <div
            key={`live-cursor-${cursor.userId}`}
            className="absolute pointer-events-none z-30 transition-all duration-150 ease-out"
            style={{ left: cursor.x, top: cursor.y, opacity }}
          >
            {/* Cursor pointer SVG */}
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none" aria-hidden="true">
              <path
                d="M0 0L16 12H6L3 20L0 0Z"
                fill={color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>
            {/* Name label */}
            <span
              className="absolute left-4 top-4 px-1.5 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap shadow-sm"
              style={{ backgroundColor: color }}
            >
              {cursor.userName}
            </span>
          </div>
        )
      })}
    </>
  )
}
