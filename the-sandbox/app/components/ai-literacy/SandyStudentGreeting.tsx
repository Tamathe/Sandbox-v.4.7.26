'use client'

import { MessageCircle } from 'lucide-react'

interface SandyStudentGreetingProps {
  userName?: string
  courses?: { id: string; title: string }[]
}

export default function SandyStudentGreeting({ userName, courses }: SandyStudentGreetingProps) {
  return (
    <div className="flex items-start gap-3 mb-6">
      {/* Sandy avatar */}
      <div className="size-7 bg-[#0033A0] rounded-full flex items-center justify-center shrink-0">
        <span className="text-white text-xs font-bold">S</span>
      </div>

      {/* Message bubble */}
      <div className="flex flex-col gap-2">
        <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-700">
            {userName ? `Hey ${userName} — w` : 'W'}elcome to AI Literacy! These modules will help you use AI effectively and responsibly in your coursework.
          </p>
        </div>

        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('sandy-prefill', {
              detail: { message: 'Help me with AI literacy', autoSend: false },
            }))
          }}
          className="self-start flex items-center gap-1.5 text-[#0033A0] bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
        >
          <MessageCircle className="size-4" />
          Ask Sandy
        </button>
      </div>
    </div>
  )
}
