'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Timer, Play, Pause, RotateCcw, Coffee } from 'lucide-react'

interface PomodoroTimerProps {
  onFocusEnd?: () => void   // Called when a focus block ends (triggers break)
  onBreakEnd?: () => void   // Called when a break ends (triggers next focus)
  onSessionEnd?: () => void // Called when all cycles complete
}

type Phase = 'focus' | 'break' | 'long-break' | 'idle' | 'done'

const PRESETS = {
  focus: 25 * 60,       // 25 minutes
  break: 5 * 60,        // 5 minutes
  longBreak: 15 * 60,   // 15 minutes
  cycles: 4,
}

export default function PomodoroTimer({ onFocusEnd, onBreakEnd, onSessionEnd }: PomodoroTimerProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [secondsLeft, setSecondsLeft] = useState(PRESETS.focus)
  const [isRunning, setIsRunning] = useState(false)
  const [cycle, setCycle] = useState(1)
  const [totalFocusSeconds, setTotalFocusSeconds] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startPhase = useCallback((nextPhase: Phase) => {
    clearTimer()
    setPhase(nextPhase)
    switch (nextPhase) {
      case 'focus':
        setSecondsLeft(PRESETS.focus)
        break
      case 'break':
        setSecondsLeft(PRESETS.break)
        break
      case 'long-break':
        setSecondsLeft(PRESETS.longBreak)
        break
      case 'done':
        setSecondsLeft(0)
        setIsRunning(false)
        onSessionEnd?.()
        return
    }
    setIsRunning(true)
  }, [clearTimer, onSessionEnd])

  // Timer tick
  useEffect(() => {
    if (!isRunning || phase === 'idle' || phase === 'done') {
      clearTimer()
      return
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          // Phase complete
          if (phase === 'focus') {
            setTotalFocusSeconds(t => t + PRESETS.focus)
            onFocusEnd?.()
            if (cycle >= PRESETS.cycles) {
              startPhase('long-break')
            } else {
              startPhase('break')
            }
          } else if (phase === 'break') {
            onBreakEnd?.()
            setCycle(c => c + 1)
            startPhase('focus')
          } else if (phase === 'long-break') {
            onBreakEnd?.()
            startPhase('done')
          }
          return 0
        }
        if (phase === 'focus') {
          setTotalFocusSeconds(t => t + 1)
        }
        return prev - 1
      })
    }, 1000)

    return clearTimer
  }, [isRunning, phase, cycle, clearTimer, startPhase, onFocusEnd, onBreakEnd])

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60)
    const sec = s % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  const progress = (() => {
    const total = phase === 'focus' ? PRESETS.focus : phase === 'break' ? PRESETS.break : phase === 'long-break' ? PRESETS.longBreak : 1
    return Math.max(0, ((total - secondsLeft) / total) * 100)
  })()

  const phaseColor = phase === 'focus' ? 'text-[#0033A0]' : phase === 'break' || phase === 'long-break' ? 'text-emerald-600' : 'text-gray-500'
  const bgColor = phase === 'focus' ? 'bg-[#0033A0]' : phase === 'break' || phase === 'long-break' ? 'bg-emerald-500' : 'bg-gray-300'

  if (phase === 'idle') {
    return (
      <button
        onClick={() => startPhase('focus')}
        className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-[#0033A0] transition-colors"
        aria-label="Start Pomodoro timer — 25 minute focus blocks"
      >
        <Timer className="size-3.5" />
        <span className="font-medium">Pomodoro</span>
      </button>
    )
  }

  if (phase === 'done') {
    return (
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-emerald-600 font-semibold">Session complete!</span>
        <span className="text-gray-400">{Math.round(totalFocusSeconds / 60)}min focused</span>
        <button onClick={() => { setPhase('idle'); setCycle(1); setTotalFocusSeconds(0) }} className="text-gray-400 hover:text-gray-600">
          <RotateCcw className="size-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2" role="timer" aria-label={`${phase === 'focus' ? 'Focus' : 'Break'} timer: ${formatTime(secondsLeft)} remaining`}>
      {/* Progress bar */}
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${bgColor}`} style={{ width: `${progress}%` }} />
      </div>

      {/* Time display */}
      <span className={`text-[11px] font-mono font-semibold tabular-nums ${phaseColor}`}>
        {formatTime(secondsLeft)}
      </span>

      {/* Phase label */}
      <span className={`text-[10px] font-medium ${phaseColor}`}>
        {phase === 'focus' ? (
          <><Timer className="size-3 inline -mt-0.5 mr-0.5" />Focus {cycle}/{PRESETS.cycles}</>
        ) : (
          <><Coffee className="size-3 inline -mt-0.5 mr-0.5" />{phase === 'long-break' ? 'Long break' : 'Break'}</>
        )}
      </span>

      {/* Play/Pause */}
      <button
        onClick={() => setIsRunning(r => !r)}
        className={`size-5 rounded flex items-center justify-center transition-colors ${phaseColor} hover:bg-gray-100`}
        aria-label={isRunning ? 'Pause timer' : 'Resume timer'}
      >
        {isRunning ? <Pause className="size-3" /> : <Play className="size-3" />}
      </button>

      {/* Reset */}
      <button
        onClick={() => { clearTimer(); setPhase('idle'); setCycle(1); setIsRunning(false); setTotalFocusSeconds(0) }}
        className="text-gray-400 hover:text-gray-600"
        aria-label="Reset timer"
      >
        <RotateCcw className="size-3" />
      </button>
    </div>
  )
}
