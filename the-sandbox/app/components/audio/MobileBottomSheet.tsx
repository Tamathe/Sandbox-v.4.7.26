'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { GripHorizontal, ChevronDown } from 'lucide-react'

interface Props {
  children: ReactNode
  onClose: () => void
}

export default function MobileBottomSheet({ children, onClose }: Props) {
  const [sheetHeight, setSheetHeight] = useState(40)
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const isLocked = sheetHeight >= 85

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isLocked) return
    dragRef.current = { startY: e.touches[0].clientY, startHeight: sheetHeight }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current || isLocked) return
    const deltaY = dragRef.current.startY - e.touches[0].clientY
    const deltaPercent = (deltaY / window.innerHeight) * 100
    const next = Math.max(0, Math.min(95, dragRef.current.startHeight + deltaPercent))
    setSheetHeight(next)
  }

  const handleTouchEnd = () => {
    if (!dragRef.current || isLocked) return
    dragRef.current = null

    if (sheetHeight < 15) {
      onClose()
    } else if (sheetHeight < 60) {
      setSheetHeight(40)
    } else {
      setSheetHeight(90)
    }
  }

  useEffect(() => {
    const origOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = origOverflow
    }
  }, [])

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />

      <div
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-white shadow-2xl lg:hidden"
        style={{
          height: `${sheetHeight}vh`,
          transition: dragRef.current ? 'none' : 'height 0.3s ease-out',
        }}
      >
        {/* Handle area — drag when not locked, collapse button when locked */}
        <div
          className="flex items-center justify-center py-3 touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {isLocked ? (
            <button
              type="button"
              onClick={() => setSheetHeight(40)}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-600"
              aria-label="Collapse sheet"
            >
              <ChevronDown className="size-5" />
            </button>
          ) : (
            <GripHorizontal className="size-5 text-gray-300 cursor-grab active:cursor-grabbing" />
          )}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-safe">
          {children}
        </div>
      </div>
    </>
  )
}
