'use client'

// ─── Sandy Pip ──────────────────────────────────────────────
// A small floating widget — Sandy's ambient presence.
// Always visible (bottom-left), shows voice state, last response.
// Click mic to toggle voice. Click bubble to open full panel.

import { useState, useEffect, useRef } from 'react'
import { Bot, Mic, Volume2, X } from 'lucide-react'
import { useSandyAmbient } from './concierge/SandyAmbientContext'

export default function SandyPip() {
  const {
    messages, loading, submit,
    isRecording, isSupported, continuousMode,
    handleMicPointerDown, handleMicPointerUp, handleMicPointerLeave,
    voiceMode, isSpeaking, toggleVoiceMode,
    openPanel,
  } = useSandyAmbient()

  const [showBubble, setShowBubble] = useState(false)
  const [bubbleText, setBubbleText] = useState('')
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastMsgCountRef = useRef(0)

  // Show a floating bubble when Sandy responds and the panel might not be visible
  useEffect(() => {
    const assistantMsgs = messages.filter(m => m.role === 'assistant' && m.content && m.id !== 'briefing-greeting')
    if (assistantMsgs.length > lastMsgCountRef.current) {
      const latest = assistantMsgs[assistantMsgs.length - 1]
      if (latest.content.length > 0 && !loading) {
        // Truncate for the bubble
        const text = latest.content.length > 120
          ? latest.content.slice(0, 117) + '...'
          : latest.content
        setBubbleText(text)
        setShowBubble(true)

        // Auto-dismiss after 8 seconds
        if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current)
        bubbleTimerRef.current = setTimeout(() => setShowBubble(false), 8000)
      }
    }
    lastMsgCountRef.current = assistantMsgs.length
  }, [messages, loading])

  // Determine pip state
  const isActive = voiceMode || isRecording || continuousMode || isSpeaking || loading
  const stateLabel = isSpeaking
    ? 'Speaking'
    : loading
    ? 'Thinking'
    : isRecording || continuousMode
    ? 'Listening'
    : voiceMode
    ? 'Voice on'
    : null

  return (
    <>
      {/* ─── Floating transcript bubble ─── */}
      {showBubble && bubbleText && (
        <div className="hidden lg:block fixed bottom-24 left-4 z-40 max-w-xs animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div
            className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm shadow-lg px-4 py-3 cursor-pointer relative group"
            onClick={() => { setShowBubble(false); openPanel() }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setShowBubble(false) }}
              className="absolute -top-2 -right-2 size-5 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <X className="size-3 text-gray-500" />
            </button>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{bubbleText}</p>
            <p className="text-[10px] text-gray-400 mt-1.5">Click to open Sandy</p>
          </div>
          {/* Arrow pointing to pip */}
          <div className="ml-6 -mt-[1px] size-2.5 bg-white border-b border-r border-gray-200 rotate-45" />
        </div>
      )}

      {/* ─── Pip widget ─── */}
      <div className="hidden lg:flex fixed bottom-6 left-4 z-40 items-center gap-2">
        {/* Main pip circle */}
        <button
          onClick={() => openPanel()}
          className={`relative size-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
            isActive
              ? 'bg-[#0033A0] text-white ring-4 ring-[#0033A0]/20'
              : 'bg-white border-2 border-gray-200 text-[#0033A0] hover:border-[#0033A0]/40 hover:shadow-xl'
          }`}
          aria-label="Open Sandy"
        >
          <Bot className="size-5" />

          {/* Pulsing ring when active */}
          {(isRecording || continuousMode) && (
            <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-50" />
          )}
          {isSpeaking && (
            <span className="absolute inset-0 rounded-full border-2 border-[#0033A0] animate-ping opacity-30" />
          )}
          {loading && (
            <span className="absolute inset-0 rounded-full border-2 border-[#0033A0]/50 animate-pulse" />
          )}
        </button>

        {/* State label */}
        {stateLabel && (
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm ${
            isRecording || continuousMode
              ? 'bg-red-50 text-red-600 border border-red-200'
              : isSpeaking
              ? 'bg-blue-50 text-[#0033A0] border border-blue-200'
              : 'bg-gray-50 text-gray-600 border border-gray-200'
          }`}>
            {stateLabel}
          </span>
        )}

        {/* Mic toggle (quick access without opening panel) */}
        {isSupported && (
          <button
            onPointerDown={handleMicPointerDown}
            onPointerUp={handleMicPointerUp}
            onPointerLeave={handleMicPointerLeave}
            className={`size-9 rounded-full shadow-sm flex items-center justify-center transition-colors select-none ${
              isRecording || continuousMode
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-white border border-gray-200 text-gray-500 hover:text-[#0033A0] hover:border-[#0033A0]/30'
            }`}
            title={continuousMode ? 'Stop listening' : 'Hold to talk · Click to listen'}
            aria-label="Mic"
          >
            <Mic className="size-4" />
          </button>
        )}

        {/* Voice mode toggle */}
        <button
          onClick={toggleVoiceMode}
          className={`size-9 rounded-full shadow-sm flex items-center justify-center transition-colors ${
            voiceMode
              ? 'bg-[#0033A0] text-white hover:bg-[#002880]'
              : 'bg-white border border-gray-200 text-gray-400 hover:text-[#0033A0] hover:border-[#0033A0]/30'
          }`}
          title={voiceMode ? 'Turn off voice mode' : 'Turn on voice conversation'}
          aria-label="Voice mode"
        >
          <Volume2 className="size-4" />
          {isSpeaking && voiceMode && (
            <span className="absolute -top-0.5 -right-0.5 size-2 bg-[#0033A0] rounded-full animate-pulse ring-2 ring-white" />
          )}
        </button>
      </div>
    </>
  )
}
