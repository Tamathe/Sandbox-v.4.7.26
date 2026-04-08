'use client'

import { Vote } from 'lucide-react'

export interface Motion {
  text: string
  movedBy: string | null
  secondedBy: string | null
  vote: string | null
}

interface MotionBlockProps {
  motion: Motion
}

export default function MotionBlock({ motion }: MotionBlockProps) {
  return (
    <div className="border-2 border-[#0033A0]/20 bg-[#0033A0]/5 rounded-xl p-4 my-3">
      <div className="flex items-start gap-2 mb-2">
        <Vote className="size-4 text-[#0033A0] mt-0.5 shrink-0" />
        <p className="text-sm font-bold text-gray-900">
          MOTION: <span className="font-semibold">{motion.text}</span>
        </p>
      </div>
      <div className="ml-6 space-y-0.5">
        {motion.movedBy && (
          <p className="text-xs text-gray-600">
            <span className="font-semibold">Moved by:</span> {motion.movedBy}
          </p>
        )}
        {motion.secondedBy && (
          <p className="text-xs text-gray-600">
            <span className="font-semibold">Seconded by:</span> {motion.secondedBy}
          </p>
        )}
        {motion.vote && (
          <p className="text-xs font-bold text-[#0033A0]">
            Vote: {motion.vote}
          </p>
        )}
      </div>
    </div>
  )
}
