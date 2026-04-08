'use client'

import { X } from 'lucide-react'
import { type ReactNode, type ElementType, useEffect } from 'react'

interface ModalShellProps {
  title: string
  icon?: ElementType
  onClose: () => void
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  zIndex?: number
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
}

export function ModalShell({
  title, icon: Icon, onClose, children,
  maxWidth = 'lg', zIndex = 60,
}: ModalShellProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40"
      style={{ zIndex }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`bg-white rounded-2xl shadow-xl w-full ${maxWidthMap[maxWidth]} overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="size-5 text-[#0033A0]" />}
            <h3 className="text-lg font-extrabold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="size-4 text-gray-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
