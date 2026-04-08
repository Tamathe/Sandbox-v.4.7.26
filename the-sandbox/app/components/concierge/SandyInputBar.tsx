'use client'

import { Send, Loader2, Mic, Volume2 } from 'lucide-react'

interface SandyInputBarProps {
  input: string
  setInput: (value: string) => void
  loading: boolean
  onSubmit: (content: string) => void
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  // Voice
  isRecording: boolean
  isSupported: boolean
  continuousMode: boolean
  onMicPointerDown: (e: React.PointerEvent) => void
  onMicPointerUp: () => void
  onMicPointerLeave: () => void
  // Voice conversation mode
  voiceMode: boolean
  isSpeaking: boolean
  onToggleVoiceMode: () => void
  // Avatar
  avatarMode: boolean
  avatarMeta: { facultyName: string; courseCode: string } | null
}

export default function SandyInputBar({
  input,
  setInput,
  loading,
  onSubmit,
  inputRef,
  isRecording,
  isSupported,
  continuousMode,
  onMicPointerDown,
  onMicPointerUp,
  onMicPointerLeave,
  voiceMode,
  isSpeaking,
  onToggleVoiceMode,
  avatarMode,
  avatarMeta,
}: SandyInputBarProps) {
  const placeholder = isSpeaking
    ? 'Sandy is speaking...'
    : isRecording || continuousMode
    ? 'Listening...'
    : avatarMode && avatarMeta
    ? `Ask ${avatarMeta.facultyName} about this course...`
    : 'Ask Sandy anything...'

  return (
    <div className="flex-shrink-0 border-t border-gray-200 bg-white">
      {/* Voice mode active banner */}
      {voiceMode && (
        <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-[#0033A0]/5 border-b border-[#0033A0]/10">
          {isSpeaking ? (
            <>
              <span className="flex gap-0.5 items-end h-3">
                <span className="w-0.5 bg-[#0033A0] rounded-full animate-pulse" style={{ height: '8px', animationDelay: '0ms' }} />
                <span className="w-0.5 bg-[#0033A0] rounded-full animate-pulse" style={{ height: '12px', animationDelay: '150ms' }} />
                <span className="w-0.5 bg-[#0033A0] rounded-full animate-pulse" style={{ height: '6px', animationDelay: '300ms' }} />
                <span className="w-0.5 bg-[#0033A0] rounded-full animate-pulse" style={{ height: '10px', animationDelay: '450ms' }} />
              </span>
              <span className="text-[11px] font-medium text-[#0033A0]">Sandy is speaking</span>
            </>
          ) : continuousMode || isRecording ? (
            <>
              <span className="size-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[11px] font-medium text-[#0033A0]">Listening</span>
            </>
          ) : (
            <span className="text-[11px] text-gray-500">Voice conversation active</span>
          )}
        </div>
      )}

      <div className="p-3">
        <form onSubmit={e => { e.preventDefault(); onSubmit(input) }} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(input) } }}
            placeholder={placeholder}
            disabled={loading}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50 overflow-hidden"
            style={{ minHeight: '40px', maxHeight: '80px' }}
          />
          {/* Voice mode toggle */}
          <button
            type="button"
            onClick={onToggleVoiceMode}
            title={voiceMode ? 'Turn off voice conversation' : 'Start voice conversation'}
            className={`size-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 relative ${
              voiceMode
                ? 'bg-[#0033A0] text-white hover:bg-[#0033A0]/90'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
            }`}
          >
            <Volume2 className="size-4" />
            {isSpeaking && voiceMode && (
              <span className="absolute -top-0.5 -right-0.5 size-2.5 bg-[#0033A0] rounded-full animate-pulse ring-2 ring-white" />
            )}
          </button>
          {/* Mic button */}
          {isSupported && (
            <button
              type="button"
              onPointerDown={onMicPointerDown}
              onPointerUp={onMicPointerUp}
              onPointerLeave={onMicPointerLeave}
              disabled={loading && !voiceMode}
              title={continuousMode ? 'Click to stop listening' : 'Click to listen · Hold to talk'}
              className={`size-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 relative select-none ${
                voiceMode && (isRecording || continuousMode)
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <Mic className="size-4" />
              {(isRecording || continuousMode) && (
                <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="size-9 bg-[#0033A0] text-white rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}
