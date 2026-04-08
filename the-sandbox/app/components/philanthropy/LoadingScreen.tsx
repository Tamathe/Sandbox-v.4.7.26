'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingScreenProps {
  message: string
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  const [elapsed, setElapsed] = useState(0)
  const [progress, setProgress] = useState(5)
  const startRef = useRef(0)

  // Initialize start time on mount
  useEffect(() => {
    startRef.current = Date.now()
  }, [])

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (startRef.current) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Exponential progress curve — fast start, slows approaching 90%
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        const remaining = 90 - prev
        return prev + remaining * 0.04
      })
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Loader2 className="size-10 text-[#0033A0] animate-spin mb-6" />
      <h2 className="text-xl font-extrabold text-gray-900 mb-2">
        Finding Your Best Matches
      </h2>
      <p className="text-sm text-gray-500 max-w-md mb-6 min-h-[2.5rem]">{message}</p>
      <div className="w-72 h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-[#0033A0] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">{elapsed}s</p>
    </div>
  )
}
