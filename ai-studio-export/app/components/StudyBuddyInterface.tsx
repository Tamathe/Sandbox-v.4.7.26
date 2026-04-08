'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Send, Bot, User, Loader2, BookOpen, Brain, Layers,
  Upload, FileText, X, Mic, MicOff, ChevronDown, ChevronUp,
  HelpCircle, GraduationCap, Swords, PenLine, ArrowLeft,
  CheckCircle, Lock, RotateCcw, Sparkles, Copy,
} from 'lucide-react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

type Screen = 'select' | 'chat' | 'wrapup'
type Mode = 'tutor' | 'quiz' | 'flashcards' | 'socratic' | 'teach-back' | 'debate' | 'essay'

interface ModeConfig {
  id: Mode
  label: string
  icon: React.ElementType
  color: string
  bg: string
  border: string
  activePill: string
  description: string
  badge?: string
  banner?: { icon: React.ElementType; text: string; color: string }
}

const MODES: ModeConfig[] = [
  {
    id: 'tutor',
    label: 'Explain It',
    icon: BookOpen,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200 hover:border-blue-400',
    activePill: 'bg-blue-600',
    description: 'Ask questions, get clear explanations',
  },
  {
    id: 'quiz',
    label: 'Quiz Me',
    icon: Brain,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200 hover:border-violet-400',
    activePill: 'bg-violet-600',
    description: 'Test your knowledge with questions',
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    icon: Layers,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200 hover:border-emerald-400',
    activePill: 'bg-emerald-600',
    description: 'Practice key terms and concepts',
  },
  {
    id: 'socratic',
    label: 'Socratic',
    icon: HelpCircle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200 hover:border-amber-400',
    activePill: 'bg-amber-600',
    description: 'Work through it yourself — no answers given',
    badge: 'Challenge',
    banner: {
      icon: Lock,
      text: "Socratic mode — I won't give direct answers. I'll only ask questions. Work through it.",
      color: 'bg-amber-50 border-amber-200 text-amber-800',
    },
  },
  {
    id: 'teach-back',
    label: 'Teach Back',
    icon: GraduationCap,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200 hover:border-purple-400',
    activePill: 'bg-purple-600',
    description: "Explain a concept to me — I'll poke holes",
    badge: 'Challenge',
    banner: {
      icon: GraduationCap,
      text: "You're the teacher now. Explain a concept and I'll ask questions until I understand.",
      color: 'bg-purple-50 border-purple-200 text-purple-800',
    },
  },
  {
    id: 'debate',
    label: 'Debate',
    icon: Swords,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200 hover:border-red-400',
    activePill: 'bg-red-600',
    description: "State your position — I'll argue the other side",
    badge: 'Advanced',
    banner: {
      icon: Swords,
      text: "Debate mode — take a position and I'll push back hard. Strengthen your argument.",
      color: 'bg-red-50 border-red-200 text-red-800',
    },
  },
  {
    id: 'essay',
    label: 'Essay Coach',
    icon: PenLine,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200 hover:border-teal-400',
    activePill: 'bg-teal-600',
    description: 'Paste your draft and get structured feedback',
  },
]

// Helper: detect multiple-choice options in quiz responses
function extractMultipleChoiceOptions(text: string): string[] | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const choices = lines.filter(l => /^[A-D][).]\s+\S/.test(l))
  return choices.length >= 3 ? choices : null
}

// Helper: detect structured flashcard format (Term/Definition)
function extractFlashcard(text: string): { front: string; back: string } | null {
  const patterns = [
    /\*\*(?:Term|Front|Question)\*\*[:\s]+(.+?)[\n\r]+\*\*(?:Definition|Back|Answer)\*\*[:\s]+([\s\S]+?)(?:\n\n|$)/i,
    /^(?:Term|Front|Q)[:\s]+(.+?)[\n\r]+(?:Definition|Back|A)[:\s]+([\s\S]+?)(?:\n\n|$)/im,
  ]
  for (const pattern of patterns) {
    const match = text.trim().match(pattern)
    if (match) {
      return { front: match[1].trim(), back: match[2].trim() }
    }
  }
  return null
}

interface Doc {
  id: string
  filename: string
  wordCount: number
  source: 'course' | 'student'
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface StudyBuddyInterfaceProps {
  toolId: string
  toolName: string
  welcomeMessage?: string | null
  starterQuestions?: string[]
  userEmail: string
  courseId?: string
  courseName?: string
  suggestedTopics?: string[]
}

export default function StudyBuddyInterface({
  toolId,
  toolName,
  welcomeMessage,
  starterQuestions = [],
  userEmail,
  courseId,
  courseName,
  suggestedTopics,
}: StudyBuddyInterfaceProps) {
  const [screen, setScreen] = useState<Screen>('select')
  const [mode, setMode] = useState<Mode>('tutor')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [docs, setDocs] = useState<Doc[]>([])
  const [docsOpen, setDocsOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  // Fix 2b: dismiss banner
  const [noBannerDismissed, setNoBannerDismissed] = useState(false)
  // Fix 3: pending mode switch confirmation
  const [pendingModeSwitch, setPendingModeSwitch] = useState<Mode | '__back__' | null>(null)
  // Fix 12: wrap-up summary
  const [wrapupSummary, setWrapupSummary] = useState<string>('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  // Quiz score tracking
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 })
  // Flashcard flip state
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set())

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Fix 1: sessionIdRef avoids stale closure in sendMessage
  const sessionIdRef = useRef<string | null>(null)
  // Session start time for duration tracking
  const sessionStartRef = useRef<number>(Date.now())

  const { isRecording, interimTranscript, isSupported, startRecording, stopRecording } = useSpeechRecognition()

  const currentModeConfig = MODES.find(m => m.id === mode)!

  // Fix 1: Create session on mount, write to ref so sendMessage never reads stale state
  useEffect(() => {
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
      body: JSON.stringify({ toolId, courseId }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.sessionId) {
          setSessionId(data.sessionId)
          sessionIdRef.current = data.sessionId
        }
      })
      .catch(() => {})
  }, [toolId, userEmail, courseId])

  // Restore last-used mode from localStorage
  useEffect(() => {
    const last = localStorage.getItem(`study-buddy-last-mode-${toolId}`)
    if (last && MODES.find(m => m.id === last)) {
      setMode(last as Mode)
    }
  }, [toolId])

  // Load documents
  useEffect(() => {
    async function loadDocs() {
      try {
        const url = `/api/study/${toolId}/documents${sessionIdRef.current ? `?sessionId=${sessionIdRef.current}` : ''}`
        const res = await fetch(url, { headers: { 'x-demo-user-email': userEmail } })
        if (!res.ok) return
        const data: { id: string; filename: string; wordCount: number; toolId: string | null }[] = await res.json()
        setDocs(data.map(d => ({ ...d, source: d.toolId ? 'course' : 'student' })))
      } catch { /* non-critical */ }
    }
    loadDocs()
  }, [toolId, sessionId, userEmail])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (interimTranscript) setInput(interimTranscript)
  }, [interimTranscript])

  // Fix 2a: Auto-open docs panel when entering chat with zero docs
  useEffect(() => {
    if (screen === 'chat' && docs.length === 0) {
      setDocsOpen(true)
    }
  }, [screen, docs.length])

  const enterMode = (selectedMode: Mode) => {
    setMode(selectedMode)
    setMessages([])
    setQuizScore({ correct: 0, total: 0 })
    setFlippedCards(new Set())
    sessionStartRef.current = Date.now()
    setScreen('chat')
    localStorage.setItem(`study-buddy-last-mode-${toolId}`, selectedMode)
    // No auto-prompts — student taps the Start button in the welcome area (Fix 5)
  }

  // Fix 1: sendMessage reads sessionId from ref to avoid stale closure
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: content.trim() }
    const assistantId = (Date.now() + 1).toString()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '' }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setIsLoading(true)

    try {
      const history = [...messages, userMsg]
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({
          toolId,
          messages: history.map(m => ({ role: m.role, content: m.content })),
          sessionId: sessionIdRef.current,  // Fix 1: read from ref, not stale closure
          mode,
          courseId,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to connect' }))
        throw new Error(err.error || 'Failed to connect')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value)
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m))
      }

      // Quiz score detection: parse AI feedback for correct/incorrect signals
      if (mode === 'quiz' && fullText) {
        const lower = fullText.toLowerCase()
        const isCorrect = /\b(correct!|that'?s right|well done|exactly right|yes,? that'?s|great job)\b/.test(lower)
        const isIncorrect = /\b(not quite|incorrect|that'?s not|wrong|actually,? the (correct|right)|try again)\b/.test(lower)
        const lastUserMsg = history.filter(m => m.role === 'user').at(-1)?.content ?? ''
        const looksLikeAnswer = /^[A-D]$|^[A-D][).]/i.test(lastUserMsg.trim()) || lastUserMsg.trim().split(' ').length <= 8
        if (looksLikeAnswer && (isCorrect || isIncorrect)) {
          setQuizScore(prev => ({
            correct: prev.correct + (isCorrect ? 1 : 0),
            total: prev.total + 1,
          }))
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `⚠️ ${msg}` } : m))
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, toolId, userEmail, mode, courseId])

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (sessionIdRef.current) formData.append('sessionId', sessionIdRef.current)

      const res = await fetch(`/api/study/${toolId}/upload`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }

      const doc = await res.json()
      setDocs(prev => [...prev, { id: doc.id, filename: doc.filename, wordCount: doc.wordCount, source: 'student' }])

      // Announce the new doc without clearing conversation history
      const notice: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `📄 Loaded **${doc.filename}** (${doc.wordCount.toLocaleString()} words) — I'll use this material going forward.`,
      }
      setMessages(prev => [...prev, notice])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const removeDoc = async (docId: string) => {
    const removed = docs.find(d => d.id === docId)
    try {
      await fetch(`/api/study/${toolId}/upload?docId=${docId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': userEmail },
      })
      setDocs(prev => prev.filter(d => d.id !== docId))
      if (removed) {
        const notice: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Removed **${removed.filename}** from my context.`,
        }
        setMessages(prev => [...prev, notice])
      }
    } catch { /* non-critical */ }
  }

  const handleMic = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording((finalText: string) => {
        if (finalText.trim()) sendMessage(finalText)
      })
    }
  }

  // Fix 12: AI-generated wrap-up summary
  const generateSummary = useCallback(async (currentMessages: Message[]) => {
    if (currentMessages.length < 4) return
    setSummaryLoading(true)
    try {
      const summaryPrompt = `Based on this study session, write a brief wrap-up in exactly this format:
**Covered:** [2-3 topics we discussed, comma separated]
**Strong:** [one thing the student clearly understood]
**Review:** [one thing to revisit]
Be specific. Use course terminology. Maximum 3 sentences total.`

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({
          toolId,
          messages: [
            ...currentMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: summaryPrompt },
          ],
          sessionId: sessionIdRef.current,
          mode,
          courseId,
        }),
      })
      if (!res.ok) return

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value)
        setWrapupSummary(text)
      }
    } catch { /* non-critical */ }
    finally { setSummaryLoading(false) }
  }, [toolId, userEmail, mode, courseId])

  const messageCount = messages.filter(m => m.role === 'user').length

  // ── SCREEN: SELECT ─────────────────────────────────────────────────────────
  if (screen === 'select') {
    return (
      <div className="flex flex-col h-full bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-[#0033A0] to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">{toolName}</h2>
              <p className="text-xs text-gray-500">
                {courseName ? `Studying ${courseName}` : 'How do you want to study today?'}
              </p>
            </div>
            {/* Fix 11: always show both course badge AND docs badge when applicable */}
            <div className="ml-auto flex items-center gap-2">
              {courseName && (
                <span className="text-xs bg-[#0033A0]/10 text-[#0033A0] px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                  {courseName}
                </span>
              )}
              {docs.length > 0 && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                  {docs.length} doc{docs.length !== 1 ? 's' : ''} ready
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mode grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {welcomeMessage && (
            <p className="text-sm text-gray-500 text-center mb-4 px-2">{welcomeMessage}</p>
          )}

          {/* Fix 2b: No materials banner (standalone launch only) */}
          {!courseId && docs.length === 0 && !noBannerDismissed && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm mb-4">
              <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-amber-800">No course materials attached</p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Study Buddy works best with your course notes. Upload a PDF below to get started.
                </p>
              </div>
              <button onClick={() => setNoBannerDismissed(true)} className="text-amber-400 hover:text-amber-600 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {MODES.map(m => {
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  onClick={() => enterMode(m.id)}
                  className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 bg-white transition-all text-left shadow-sm hover:shadow-md ${m.border}`}
                >
                  {m.badge && (
                    <span className="absolute top-2.5 right-2.5 text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                      {m.badge}
                    </span>
                  )}
                  {m.id === mode && !m.badge && (
                    <span className="absolute top-2.5 right-2.5 text-[10px] font-semibold bg-[#0033A0]/10 text-[#0033A0] px-1.5 py-0.5 rounded-full">
                      Last used
                    </span>
                  )}
                  <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${m.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{m.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{m.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Docs panel */}
        <div className="bg-white border-t border-gray-200">
          <button
            onClick={() => setDocsOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <span>Study Materials</span>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {docs.length} doc{docs.length !== 1 ? 's' : ''}
              </span>
            </div>
            {docsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {docsOpen && <DocsPanel docs={docs} uploading={uploading} uploadError={uploadError} fileInputRef={fileInputRef} onUpload={handleUpload} onRemove={removeDoc} />}
          <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md" className="hidden" onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }} />
        </div>
      </div>
    )
  }

  // ── SCREEN: WRAP-UP ────────────────────────────────────────────────────────
  if (screen === 'wrapup') {
    const Icon = currentModeConfig.icon
    const elapsedMs = Date.now() - sessionStartRef.current
    const elapsedMin = Math.floor(elapsedMs / 60000)
    const elapsedSec = Math.floor((elapsedMs % 60000) / 1000)
    const durationStr = elapsedMin > 0 ? `${elapsedMin}m ${elapsedSec}s` : `${elapsedSec}s`
    return (
      <div className="flex flex-col h-full bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 items-center justify-center p-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Session Complete</h2>
        {mode === 'quiz' && quizScore.total > 0 ? (
          <div className="text-center mb-6">
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {quizScore.correct}/{quizScore.total}
            </p>
            <p className="text-sm text-gray-500">
              questions correct in{' '}
              <span className={`font-medium ${currentModeConfig.color}`}>{currentModeConfig.label}</span> mode
            </p>
            {quizScore.total >= 5 && (
              <p className="text-xs mt-1 text-gray-400">
                {Math.round((quizScore.correct / quizScore.total) * 100)}% accuracy
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-6 text-center">
            Great work! You exchanged {messageCount} message{messageCount !== 1 ? 's' : ''} in{' '}
            <span className={`font-medium ${currentModeConfig.color}`}>{currentModeConfig.label}</span> mode.
          </p>
        )}

        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${currentModeConfig.bg} mb-2`}>
          <Icon className={`w-5 h-5 ${currentModeConfig.color}`} />
          <span className={`text-sm font-medium ${currentModeConfig.color}`}>{currentModeConfig.label} mode</span>
        </div>
        <p className="text-xs text-gray-400 mb-6">Session time: {durationStr}</p>

        {/* Fix 12: AI-generated session summary */}
        {(summaryLoading || wrapupSummary) && (
          <div className="w-full max-w-xs bg-white rounded-xl border border-gray-200 px-4 py-3 text-left mb-5">
            {summaryLoading && !wrapupSummary ? (
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating summary...
              </div>
            ) : (
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="text-xs text-gray-700 leading-relaxed mb-1 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                }}
              >
                {wrapupSummary}
              </ReactMarkdown>
            )}
          </div>
        )}

        {wrapupSummary && !summaryLoading && (
          <button
            onClick={() => navigator.clipboard.writeText(wrapupSummary)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 bg-white rounded-lg px-3 py-1.5 font-medium transition-all mb-4"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy summary
          </button>
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => {
              setMessages([])
              setWrapupSummary('')
              setSummaryLoading(false)
              setQuizScore({ correct: 0, total: 0 })
              setScreen('chat')
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0033A0] text-white rounded-xl font-medium text-sm hover:bg-[#002580] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Study Again
          </button>
          <button
            onClick={() => {
              setMessages([])
              setWrapupSummary('')
              setSummaryLoading(false)
              setQuizScore({ correct: 0, total: 0 })
              setScreen('select')
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Switch Mode
          </button>
        </div>
      </div>
    )
  }

  // ── SCREEN: CHAT ───────────────────────────────────────────────────────────

  // Fix 5: Updated per-mode welcome messages
  const defaultWelcome =
    mode === 'quiz'
      ? `Ready to quiz you on ${courseName ?? 'your materials'}. Tap the button below when you're ready — I'll ask one question at a time and explain each answer.`
      : mode === 'flashcards'
      ? `Let's drill the key terms${courseName ? ` from ${courseName}` : ''}. Tap below to start — I'll show the question first, then reveal the answer when you respond.`
      : mode === 'tutor'
      ? `Ask me anything about your course material.`
      : mode === 'socratic'
      ? `Tell me what topic you're working on and we'll reason through it together — I'll only ask questions.`
      : mode === 'teach-back'
      ? `You're the teacher. Pick a topic and start explaining it to me — I'll ask questions until I really understand.`
      : mode === 'debate'
      ? `State your position on any topic. I'll argue the other side as hard as I can.`
      : mode === 'essay'
      ? `Paste your draft or describe your essay challenge. I'll give you structured feedback across thesis, argument, evidence, and prose.`
      : `Ready. What do you want to work on?`

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
      {/* Chat header */}
      <div className="bg-white border-b border-gray-200 px-3 py-2.5 flex items-center gap-2">
        {/* Fix 3: back arrow guards against losing chat */}
        <button
          onClick={() => {
            if (messages.length > 2) {
              setPendingModeSwitch('__back__')
            } else {
              setMessages([])
              setScreen('select')
            }
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Mode pills */}
        <div className="flex gap-1.5 flex-1 overflow-x-auto scrollbar-none">
          {MODES.map(m => {
            const Icon = m.icon
            return (
              <button
                key={m.id}
                // Fix 3: guard mode switches against losing chat
                onClick={() => {
                  if (m.id === mode) return
                  if (messages.length > 2) {
                    setPendingModeSwitch(m.id)
                  } else {
                    setMode(m.id)
                    setMessages([])
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  m.id === mode
                    ? `${m.activePill} text-white shadow-sm`
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {m.label}
              </button>
            )
          })}
        </div>

        {/* Fix 10: "Done" button with border and icon */}
        <button
          onClick={() => {
            setScreen('wrapup')
            void generateSummary(messages)
          }}
          disabled={messageCount === 0}
          title="End your session and get an AI summary"
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 bg-white rounded-lg px-2.5 py-1.5 font-medium whitespace-nowrap disabled:opacity-25 transition-all flex-shrink-0"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Wrap Up
        </button>
      </div>

      {/* Fix 3: Mode switch confirmation banner */}
      {pendingModeSwitch && (
        <div className="flex items-center justify-between gap-3 bg-gray-900 text-white px-4 py-2.5 text-sm">
          <span className="font-medium">Switching modes will clear this chat.</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setPendingModeSwitch(null)}
              className="text-gray-300 hover:text-white px-3 py-1 rounded-lg text-xs font-medium"
            >
              Keep chat
            </button>
            <button
              onClick={() => {
                if (pendingModeSwitch === '__back__') {
                  setMessages([])
                  setScreen('select')
                } else {
                  setMode(pendingModeSwitch as Mode)
                  setMessages([])
                }
                setPendingModeSwitch(null)
              }}
              className="bg-white text-gray-900 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-gray-100"
            >
              Switch anyway
            </button>
          </div>
        </div>
      )}

      {/* Mode banner (for challenge modes) */}
      {currentModeConfig.banner && (
        <div className={`flex items-start gap-2.5 px-4 py-2.5 border-b text-xs ${currentModeConfig.banner.color}`}>
          {(() => { const BannerIcon = currentModeConfig.banner!.icon; return <BannerIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> })()}
          <span>{currentModeConfig.banner.text}</span>
        </div>
      )}

      {/* Teach Back feedback phase progress bar */}
      {mode === 'teach-back' && messages.filter(m => m.role === 'user').length < 5 && messages.length > 0 && (
        <div className="px-4 py-1.5 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <div
                key={n}
                className={`w-4 h-1.5 rounded-full transition-colors ${
                  n <= messages.filter(m => m.role === 'user').length
                    ? 'bg-purple-500'
                    : 'bg-purple-200'
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] text-purple-600 font-medium">
            Keep explaining — full feedback after a few more exchanges
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#0033A0] to-purple-700 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 max-w-[85%]">
                <p className="text-gray-800 text-sm leading-relaxed">{defaultWelcome}</p>
              </div>
            </div>

            {/* Essay Coach paste zone */}
            {mode === 'essay' && (
              <div className="ml-11 mt-2">
                <div className="bg-white border-2 border-dashed border-teal-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-teal-700 mb-2">Paste your draft here</p>
                  <textarea
                    placeholder="Paste your essay, paragraph, or thesis statement..."
                    rows={6}
                    className="w-full text-sm text-gray-800 placeholder-gray-400 outline-none resize-none"
                    onKeyDown={e => e.stopPropagation()}
                    onChange={e => setInput(e.target.value)}
                    value={input}
                  />
                  {input.trim().length > 50 && (
                    <button
                      onClick={() => sendMessage(input)}
                      className="mt-2 text-xs bg-teal-600 text-white rounded-xl px-4 py-2 font-medium hover:bg-teal-700 transition-colors"
                    >
                      Get feedback →
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Or just describe your essay challenge in the chat below</p>
              </div>
            )}

            {/* Fix 5: explicit start buttons for quiz and flashcards */}
            {mode === 'quiz' && (
              <div className="ml-11">
                <button
                  onClick={() => sendMessage('Give me a quiz question from the course materials.')}
                  className="text-xs bg-[#0033A0] text-white rounded-xl px-4 py-2 font-medium hover:bg-[#002580] transition-colors shadow-sm"
                >
                  Start quiz →
                </button>
              </div>
            )}
            {mode === 'flashcards' && (
              <div className="ml-11">
                <button
                  onClick={() => sendMessage('Give me the first flashcard.')}
                  className="text-xs bg-emerald-600 text-white rounded-xl px-4 py-2 font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  Start flashcards →
                </button>
              </div>
            )}

            {/* Starter questions for tutor mode */}
            {starterQuestions.length > 0 && mode === 'tutor' && (
              <div className="ml-11 flex flex-wrap gap-2">
                {starterQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-left text-xs bg-white border border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0] text-gray-600 rounded-xl px-3 py-2 transition-all shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Fix 9: Teach Back topic suggestion chips */}
            {mode === 'teach-back' && suggestedTopics && suggestedTopics.length > 0 && (
              <div className="ml-11 flex flex-wrap gap-2 mt-1">
                {suggestedTopics.map((topic, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(`I want to explain: ${topic}`)}
                    className="text-left text-xs bg-purple-50 border border-purple-200 hover:border-purple-400 hover:bg-purple-100 text-purple-700 rounded-xl px-3 py-2 transition-all font-medium"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            )}

            {/* Debate topic suggestion chips */}
            {mode === 'debate' && suggestedTopics && suggestedTopics.length > 0 && (
              <div className="ml-11 flex flex-wrap gap-2 mt-1">
                {suggestedTopics.map((topic, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(`I want to argue: ${topic}`)}
                    className="text-left text-xs bg-red-50 border border-red-200 hover:border-red-400 hover:bg-red-100 text-red-700 rounded-xl px-3 py-2 transition-all font-medium"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id}>
            <div className={`relative group flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                msg.role === 'user' ? 'bg-gray-200' : 'bg-gradient-to-br from-[#0033A0] to-purple-700'
              }`}>
                {msg.role === 'user'
                  ? <User className="w-4 h-4 text-gray-600" />
                  : <Bot className="w-4 h-4 text-white" />
                }
              </div>
              {/* Copy button for assistant messages (hover reveal) */}
              {msg.role === 'assistant' && msg.content !== '' && !isLoading && (
                <div className="absolute -bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => navigator.clipboard.writeText(msg.content)}
                    title="Copy to clipboard"
                    className="bg-white border border-gray-200 rounded-lg p-1 text-gray-400 hover:text-gray-700 shadow-sm"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Flashcard card UI for assistant messages in flashcard mode */}
              {msg.role === 'assistant' && mode === 'flashcards' && msg.content !== '' && (() => {
                const card = extractFlashcard(msg.content)
                if (card) {
                  const isFlipped = flippedCards.has(msg.id)
                  return (
                    <div className="bg-white border-2 border-emerald-200 rounded-2xl overflow-hidden shadow-sm max-w-sm">
                      <div className="px-5 py-4">
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">
                          {isFlipped ? 'Definition' : 'Term'}
                        </p>
                        <p className="text-sm text-gray-900 font-medium leading-snug">
                          {isFlipped ? card.back : card.front}
                        </p>
                      </div>
                      <button
                        onClick={() => setFlippedCards(prev => {
                          const next = new Set(prev)
                          if (next.has(msg.id)) next.delete(msg.id)
                          else next.add(msg.id)
                          return next
                        })}
                        className="w-full py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-t border-emerald-200 transition-colors"
                      >
                        {isFlipped ? '← Hide answer' : 'Reveal answer →'}
                      </button>
                    </div>
                  )
                }
                return null
              })() || (
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-[#0033A0] text-white rounded-tr-sm'
                  : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
              }`}>
                {msg.content === '' && msg.role === 'assistant' ? (
                  <div className="flex items-center gap-1.5">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                ) : msg.role === 'assistant' ? (
                  <ReactMarkdown
                    components={{
                      p:      ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                      em:     ({ children }) => <em className="italic">{children}</em>,
                      ul:     ({ children }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
                      ol:     ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
                      li:     ({ children }) => <li>{children}</li>,
                      code:   ({ children }) => <code className="bg-gray-200 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                    }}
                  >{msg.content}</ReactMarkdown>
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>
              )}
            </div>

            {/* Fix 7: Multiple choice quick-reply buttons for quiz mode */}
            {msg.role === 'assistant' &&
              msg.id === messages.filter(m => m.role === 'assistant').at(-1)?.id &&
              !isLoading &&
              mode === 'quiz' && (() => {
                const choices = extractMultipleChoiceOptions(msg.content)
                if (!choices) return null
                return (
                  <div className="ml-11 flex flex-col gap-1.5 mt-2">
                    {choices.map((choice, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(choice.substring(0, 1))}
                        className="text-left text-sm bg-white border border-gray-200 hover:border-violet-400 hover:bg-violet-50 text-gray-700 rounded-xl px-4 py-2.5 transition-all shadow-sm"
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                )
              })()
            }

            {/* Socratic nudge button */}
            {msg.role === 'assistant' &&
              msg.id === messages.filter(m => m.role === 'assistant').at(-1)?.id &&
              !isLoading &&
              mode === 'socratic' && (
                <div className="ml-11 mt-1.5">
                  <button
                    onClick={() => sendMessage("I'm stuck. Can you give me a small nudge — just a hint, not the answer?")}
                    className="text-xs text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-xl px-3 py-1.5 font-medium transition-colors"
                  >
                    💡 Give me a nudge
                  </button>
                </div>
              )
            }
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Docs strip (collapsed by default in chat) */}
      <div className="bg-white border-t border-gray-100">
        <button
          onClick={() => setDocsOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-gray-400" />
            <span>Study Materials ({docs.length})</span>
          </div>
          {docsOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        </button>
        {docsOpen && <DocsPanel docs={docs} uploading={uploading} uploadError={uploadError} fileInputRef={fileInputRef} onUpload={handleUpload} onRemove={removeDoc} />}
        <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md" className="hidden" onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-3">
        {isRecording && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-500 font-medium">{interimTranscript || 'Listening...'}</span>
          </div>
        )}
        <form
          onSubmit={e => { e.preventDefault(); sendMessage(input) }}
          className="flex items-end gap-2"
        >
          <textarea
            value={isRecording ? interimTranscript || input : input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            placeholder={
              mode === 'tutor' ? 'Ask a question...' :
              mode === 'socratic' ? 'Tell me what topic you\'re working on...' :
              mode === 'teach-back' ? 'Start explaining...' :
              mode === 'debate' ? 'State your position...' :
              mode === 'essay' ? 'Paste your draft or describe your essay...' :
              isRecording ? 'Listening...' : 'Type a message...'
            }
            disabled={isLoading || isRecording}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50 overflow-hidden"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          {isSupported && (
            <button
              type="button"
              onClick={handleMic}
              disabled={isLoading}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              } disabled:opacity-50`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 bg-gradient-to-br from-[#0033A0] to-purple-700 text-white rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Shared docs panel ──────────────────────────────────────────────────────

function DocsPanel({
  docs, uploading, uploadError, fileInputRef, onUpload, onRemove,
}: {
  docs: Doc[]
  uploading: boolean
  uploadError: string
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onUpload: (file: File) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="px-4 pb-3 space-y-1.5">
      {docs.length === 0 && (
        <p className="text-xs text-gray-400 italic py-1">No documents loaded yet. Upload your notes or syllabus below.</p>
      )}
      {docs.map(doc => (
        <div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-700 font-medium truncate">{doc.filename}</span>
            <span className="text-xs text-gray-400 whitespace-nowrap">{doc.wordCount.toLocaleString()} words</span>
            {doc.source === 'course' && (
              <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">course</span>
            )}
          </div>
          {doc.source === 'student' && (
            <button onClick={() => onRemove(doc.id)} className="ml-2 text-gray-400 hover:text-red-500 flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 text-xs text-[#0033A0] font-medium hover:text-purple-700 disabled:opacity-50 mt-1"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? 'Uploading...' : 'Upload notes or syllabus'}
        </button>
        <p className="text-[10px] text-gray-400 mt-0.5">Accepts PDF, .txt, or .md — not Word docs</p>
        {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
      </div>
    </div>
  )
}
