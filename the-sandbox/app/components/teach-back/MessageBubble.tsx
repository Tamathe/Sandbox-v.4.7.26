'use client'

import { GraduationCap, User } from 'lucide-react'

interface MessageBubbleProps {
  role: 'ai-student' | 'user'
  content: string
}

export default function MessageBubble({ role, content }: MessageBubbleProps) {
  const isAI = role === 'ai-student'

  return (
    <div className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}>
      {isAI && (
        <div className="flex-shrink-0 size-8 rounded-full bg-amber-100 flex items-center justify-center">
          <GraduationCap className="size-4 text-amber-700" />
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isAI
            ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
            : 'bg-[#0033A0] text-white rounded-tr-sm'
        }`}
      >
        {content}
      </div>
      {!isAI && (
        <div className="flex-shrink-0 size-8 rounded-full bg-[#0033A0]/10 flex items-center justify-center">
          <User className="size-4 text-[#0033A0]" />
        </div>
      )}
    </div>
  )
}
