'use client'

import { useEffect, useState } from 'react'
import { Phone, PhoneOff, PhoneCall, Video, Mic, MicOff } from 'lucide-react'
import { usePresence } from '../lib/presence-context'

function CallTimer() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return (
    <span className="text-white/70 text-sm font-mono tabular-nums">
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}

function AudioWave() {
  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.4, 0.7, 1, 0.6].map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-green-400 animate-pulse"
          style={{
            height: `${h * 28}px`,
            animationDelay: `${i * 80}ms`,
            animationDuration: `${600 + i * 40}ms`,
          }}
        />
      ))}
    </div>
  )
}

export default function CallOverlay() {
  const { callState, callPeer, micError, answerCall, declineCall, hangUp } = usePresence()

  if (callState === 'idle') return null

  const initials = callPeer?.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const teamsUrl = callPeer
    ? `https://teams.microsoft.com/l/call/0/0?users=${encodeURIComponent(callPeer.email)}`
    : '#'

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative w-80 rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(160deg, #1e3a8a 0%, #0033A0 50%, #1e1b4b 100%)' }}
      >
        {/* Ambient ring for incoming */}
        {callState === 'incoming' && (
          <div className="absolute inset-0 rounded-3xl border-2 border-blue-400/40 animate-ping pointer-events-none" />
        )}

        <div className="p-8 flex flex-col items-center gap-5">
          {/* Status label */}
          <div className="text-xs font-semibold uppercase tracking-widest text-white/50">
            {callState === 'calling' && 'Calling…'}
            {callState === 'incoming' && 'Incoming Call'}
            {callState === 'active' && (
              <span className="flex items-center gap-1.5 text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Connected
              </span>
            )}
          </div>

          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {initials}
            </div>
            {callState === 'calling' && (
              <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping" />
            )}
            {callState === 'active' && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-[#0033A0]" />
            )}
          </div>

          {/* Name */}
          <div className="text-center">
            <div className="text-white font-bold text-lg leading-tight">{callPeer?.name}</div>
            <div className="text-white/50 text-xs mt-0.5">{callPeer?.email}</div>
          </div>

          {/* Active: waveform + timer */}
          {callState === 'active' && (
            <div className="flex flex-col items-center gap-2 w-full">
              {micError ? (
                <div className="flex items-center gap-2 text-amber-300 text-xs">
                  <MicOff className="w-3.5 h-3.5" />
                  Mic unavailable — audio only from peer
                </div>
              ) : (
                <AudioWave />
              )}
              <CallTimer />
            </div>
          )}

          {/* Mic unavailable note on calling/incoming */}
          {micError && callState !== 'active' && (
            <div className="text-amber-300 text-xs text-center flex items-center gap-1">
              <MicOff className="w-3 h-3" />
              Mic permission needed for audio
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-4 mt-1">
            {callState === 'calling' && (
              <button
                onClick={hangUp}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg transition-colors"
                title="Cancel"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
            )}

            {callState === 'incoming' && (
              <>
                <button
                  onClick={declineCall}
                  className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg transition-colors"
                  title="Decline"
                >
                  <PhoneOff className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={answerCall}
                  className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center shadow-lg transition-colors"
                  title="Answer"
                >
                  <Phone className="w-6 h-6 text-white" />
                </button>
              </>
            )}

            {callState === 'active' && (
              <>
                <button
                  onClick={hangUp}
                  className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg transition-colors"
                  title="Hang up"
                >
                  <PhoneOff className="w-6 h-6 text-white" />
                </button>
                <a
                  href={teamsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 flex flex-col items-center justify-center shadow-lg transition-colors gap-0.5"
                  title="Escalate to Teams video"
                >
                  <Video className="w-5 h-5 text-white" />
                  <span className="text-[9px] text-white/70 font-medium leading-none">Teams</span>
                </a>
              </>
            )}
          </div>

          {/* Teams hint on incoming */}
          {callState === 'incoming' && (
            <div className="text-white/30 text-[10px] text-center">
              Audio call · <a href={teamsUrl} target="_blank" rel="noreferrer" className="underline hover:text-white/60">Escalate to Teams video</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
