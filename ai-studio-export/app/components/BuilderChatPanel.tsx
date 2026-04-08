'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Bot, User, Loader2, Mic, MicOff, Rocket, ChevronDown, ChevronUp, Layers, X } from 'lucide-react'
import { BuilderSpec } from '../lib/types'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { PrivacyFooter } from './PrivacyFooter'

export const TOOL_TYPES = [
  {
    label: 'Chatbot Tutor',
    color: 'bg-indigo-100 text-indigo-700',
    description: 'Walks students through material step by step without just giving answers.',
    prompt: 'Build a chatbot tutor for [subject]. Walk students through concepts step by step with guiding questions rather than just giving answers.',
  },
  {
    label: 'Simulation',
    color: 'bg-blue-100 text-blue-700',
    description: 'Role-play a real-world scenario — patient interview, negotiation, courtroom, historical event.',
    prompt: 'Build a simulation where students play [role] and the AI plays [character or scenario]. The goal is for students to [learning objective].',
  },
  {
    label: 'Debate Partner',
    color: 'bg-orange-100 text-orange-700',
    description: 'Students argue a position while the AI challenges their reasoning Socratically.',
    prompt: 'Build a Socratic debate partner for [topic]. Students argue for or against [position] and the AI challenges their reasoning with follow-up questions.',
  },
  {
    label: 'Adaptive Quiz',
    color: 'bg-green-100 text-green-700',
    description: 'Adaptive questions that explain the reasoning behind each answer.',
    prompt: 'Create an adaptive quiz on [topic] for [course]. After each answer, explain why the correct answer is right and what concept it tests.',
  },
  {
    label: 'Mock Interview',
    color: 'bg-purple-100 text-purple-700',
    description: 'Practice for job interviews, oral exams, or academic defenses with real-time feedback.',
    prompt: 'Build a mock interview for [context — job type, course, or exam]. Cover [question types] and give targeted feedback on each answer.',
  },
  {
    label: 'Writing Coach',
    color: 'bg-pink-100 text-pink-700',
    description: 'Reviews student writing with targeted feedback and revision suggestions.',
    prompt: 'Build a writing coach for [course or assignment type]. Students paste their draft and get targeted feedback on [focus areas like argument, evidence, structure].',
  },
  {
    label: 'Case Analyzer',
    color: 'bg-yellow-100 text-yellow-700',
    description: 'Students work through a real or hypothetical case applying course frameworks.',
    prompt: 'Build a case analysis tool for [course]. Students are presented with a [business/legal/medical/historical] scenario and must analyze it using [frameworks or concepts from the course].',
  },
  {
    label: 'Auto-Grader / Feedback',
    color: 'bg-teal-100 text-teal-700',
    description: 'Students submit text (essay, code, answer) and get instant feedback against a rubric.',
    prompt: 'Build an auto-grader for [assignment name]. Students will submit [essay/code/paragraph]. The AI should evaluate it based on these rubric criteria: [list criteria]. It should provide a score estimate and constructive feedback for improvement.',
  },
]

export const EXAMPLES = [
  {
    typeLabel: 'Debate',
    color: 'bg-orange-100 text-orange-700',
    title: 'Ethics Debate Partner',
    description: 'Students argue for or against utilitarian ethics with a Socratic opponent that challenges their reasoning',
    prompt: 'Build me a Socratic debate partner for my Ethics 201 students. They should argue for or against utilitarian ethics. The AI should challenge their reasoning, ask follow-up questions, and help them sharpen their arguments.',
  },
  {
    typeLabel: 'Simulation',
    color: 'bg-blue-100 text-blue-700',
    title: 'Patient Intake Sim',
    description: 'Nursing students practice taking patient histories while the AI plays a patient presenting with chest pain',
    prompt: 'I want a medical simulation where nursing students practice taking patient histories. The AI plays a patient presenting with chest pain. Students must ask the right questions to gather a complete history.',
  },
  {
    typeLabel: 'Interview',
    color: 'bg-purple-100 text-purple-700',
    title: 'Tech Internship Interview',
    description: 'CS students practice behavioral STAR-method questions and basic algorithms in a realistic mock interview',
    prompt: 'Build a mock job interview for computer science students preparing for technical internship interviews. Cover behavioral questions using the STAR method and basic data structures and algorithms.',
  },
  {
    typeLabel: 'Quiz',
    color: 'bg-green-100 text-green-700',
    title: 'Constitutional Law Quiz',
    description: 'Adaptive quiz on the Bill of Rights where each answer is followed by an explanation of the principle behind it',
    prompt: 'Create an adaptive quiz on the Bill of Rights and landmark Supreme Court cases for my Constitutional Law class. After each answer, explain why the correct answer is right and what principle it tests.',
  },
  {
    typeLabel: 'Tutor',
    color: 'bg-indigo-100 text-indigo-700',
    title: 'Organic Chemistry Tutor',
    description: 'Walks students through reaction mechanisms step by step instead of just giving answers',
    prompt: 'I need a chatbot tutor for my Organic Chemistry 2 class. Help students understand reaction mechanisms like SN2, elimination, and addition by walking through problems step by step rather than just giving answers.',
  },
  {
    typeLabel: 'Simulation',
    color: 'bg-blue-100 text-blue-700',
    title: 'Kentucky Legislature Sim',
    description: 'Political science students play a state senator navigating lobbyists and colleagues to pass a bill',
    prompt: 'Build a Kentucky state legislature simulation for my Political Science class. Students play a state senator trying to get a bill passed. The AI plays other legislators, lobbyists, and constituents they must persuade.',
  },
]

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const SPEC_REGEX = /<!--SPEC:([\s\S]*?)-->/
const COMPLEXITY_REGEX = /<!--COMPLEXITY:([\s\S]*?)-->/

interface ComplexityHint {
  reason: string
  chatOption: string
  appOption: string
}

function extractSpec(text: string): BuilderSpec | null {
  const match = text.match(SPEC_REGEX)
  if (!match) return null
  try {
    return JSON.parse(match[1]) as BuilderSpec
  } catch {
    return null
  }
}

function extractComplexity(text: string): ComplexityHint | null {
  const match = text.match(COMPLEXITY_REGEX)
  if (!match) return null
  try {
    return JSON.parse(match[1]) as ComplexityHint
  } catch {
    return null
  }
}

function cleanText(text: string): string {
  return text.replace(SPEC_REGEX, '').replace(COMPLEXITY_REGEX, '').trim()
}

function extractLatestSpec(text: string): BuilderSpec | null {
  const matches = [...text.matchAll(/<!--SPEC:([\s\S]*?)-->/g)]
  const last = matches.at(-1)
  if (!last) return null
  try {
    return JSON.parse(last[1]) as BuilderSpec
  } catch {
    return null
  }
}

interface BuilderChatPanelProps {
  sessionId: string | null
  userEmail: string
  userName: string
  onSpecUpdate: (spec: BuilderSpec) => void
  onBuildRequest: () => void
  currentSpec: BuilderSpec
  initialPrompt?: string
  forkedFromName?: string
}

export default function BuilderChatPanel({
  sessionId,
  userEmail,
  userName,
  onSpecUpdate,
  onBuildRequest,
  currentSpec,
  initialPrompt = '',
  forkedFromName,
}: BuilderChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const [showTypes, setShowTypes] = useState(false)
  const [complexityHint, setComplexityHint] = useState<ComplexityHint | null>(null)
  const [complexityDismissed, setComplexityDismissed] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<Message[]>([])
  const recordingBaseInputRef = useRef('')
  const userScrolledUpRef = useRef(false)
  const exchangeCount = messages.filter(m => m.role === 'user').length

  const { isRecording, interimTranscript, isSupported, startRecording, stopRecording } = useSpeechRecognition()

  // Only auto-scroll when the user hasn't manually scrolled up
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Detect manual scroll — if user scrolls up, stop hijacking; if they reach the bottom, re-enable
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolledUpRef.current = distanceFromBottom > 80
  }, [])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    if (!initialPrompt || messages.length > 0 || input.trim()) return
    setInput(initialPrompt)
  }, [initialPrompt, messages.length, input])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: content.trim() }
    const assistantId = (Date.now() + 1).toString()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '' }

    userScrolledUpRef.current = false  // snap back to bottom when user sends
    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setShowExamples(false)
    setShowTypes(false)
    setIsLoading(true)

    try {
      const history = [...messagesRef.current, userMsg]
      const res = await fetch('/api/builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          sessionId,
          userEmail,
          currentSpec,
        }),
      })

      if (!res.ok) throw new Error('Builder unavailable')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value)
        const clean = cleanText(fullText)
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: clean } : m))

        const streamedSpec = extractLatestSpec(fullText)
        if (streamedSpec) {
          onSpecUpdate(streamedSpec)
        }
      }

      const spec = extractLatestSpec(fullText) || extractSpec(fullText)
      if (spec) onSpecUpdate(spec)

      const hint = extractComplexity(fullText)
      if (hint) setComplexityHint(hint)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `Warning: ${msg}` } : m))
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, sessionId, userEmail, onSpecUpdate, currentSpec])

  const displayedInput =
    isRecording && interimTranscript
      ? [recordingBaseInputRef.current.trim(), interimTranscript.trim()].filter(Boolean).join(' ')
      : input

  const handleMic = () => {
    if (isRecording) {
      stopRecording()
      recordingBaseInputRef.current = ''
    } else {
      recordingBaseInputRef.current = input
      startRecording((finalText: string) => {
        const trimmed = finalText.trim()
        if (!trimmed) return
        setInput(prev => prev.trim() ? `${prev.trim()} ${trimmed}` : trimmed)
        recordingBaseInputRef.current = ''
      })
    }
  }

  const showBuildButton = currentSpec.ready && (exchangeCount >= 2 || !!forkedFromName)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-[#0033A0] to-purple-700 flex-shrink-0">
        <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-white">AI Builder</div>
          <div className="text-blue-200 text-xs">Describe your vision and we will turn it into a working draft</div>
        </div>
      </div>

      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 mb-2">
                Quick Start
              </div>
              <div className="space-y-2 text-sm text-blue-900">
                <p>1. Describe the experience you want students to have.</p>
                <p>2. Review the live preview and refine anything that feels off.</p>
                <p>3. Build when the draft feels classroom-ready.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#0033A0] to-purple-700 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 max-w-[85%]">
                <p className="text-gray-800 text-sm leading-relaxed">
                  Hey {userName.split(' ')[0]}! I&apos;m your AI builder. Tell me what you want to create: a simulation, debate, quiz, interview, or chatbot tutor. What experience do you have in mind?
                </p>
              </div>
            </div>

            <div className="ml-11">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowExamples(v => !v); setShowTypes(false) }}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#0033A0] hover:text-purple-700 transition-colors"
                >
                  {showExamples ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showExamples ? 'Hide examples' : 'Show me examples'}
                </button>

                <span className="text-gray-300 text-xs">|</span>

                <button
                  onClick={() => { setShowTypes(v => !v); setShowExamples(false) }}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#0033A0] transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  {showTypes ? 'Hide tool types' : 'What can I build?'}
                  {showTypes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showExamples && (
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(ex.prompt)}
                      className="text-left bg-white border border-gray-200 hover:border-[#0033A0] hover:shadow-sm rounded-xl px-4 py-3 transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ex.color}`}>
                          {ex.typeLabel}
                        </span>
                        <span className="text-sm font-semibold text-gray-800 group-hover:text-[#0033A0] transition-colors">
                          {ex.title}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{ex.description}</p>
                    </button>
                  ))}
                </div>
              )}

              {showTypes && (
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {TOOL_TYPES.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(t.prompt); setShowTypes(false) }}
                      className="text-left bg-white border border-gray-200 hover:border-[#0033A0] hover:shadow-sm rounded-xl px-4 py-3 transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.color}`}>
                          {t.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{t.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              msg.role === 'user' ? 'bg-gray-200' : 'bg-gradient-to-br from-[#0033A0] to-purple-700'
            }`}>
              {msg.role === 'user'
                ? <User className="w-4 h-4 text-gray-600" />
                : <Bot className="w-4 h-4 text-white" />
              }
            </div>
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
          </div>
        ))}

        {showBuildButton && (
          <div className="flex justify-center pt-2">
            <button
              onClick={onBuildRequest}
              className="flex items-center gap-2 bg-gradient-to-r from-[#0033A0] to-purple-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg hover:opacity-90 transition-opacity text-sm"
            >
              <Rocket className="w-4 h-4" />
              Build This Tool
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {complexityHint && !complexityDismissed && (
        <div className="mx-3 mb-0 mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold text-amber-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 flex-shrink-0" />
              Heads up — this one might need more than a chat tool
            </div>
            <button
              type="button"
              onClick={() => setComplexityDismissed(true)}
              className="text-amber-400 hover:text-amber-600 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1.5 text-amber-800">{complexityHint.reason}</p>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setComplexityDismissed(true)}
              className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-left text-xs font-medium text-amber-900 hover:bg-amber-50 transition-colors"
            >
              <span className="font-semibold">Keep it simple</span> — {complexityHint.chatOption}
            </button>
            <a
              href="/playground"
              className="block w-full rounded-xl bg-gradient-to-r from-[#0033A0] to-purple-700 px-3 py-2 text-left text-xs font-semibold text-white hover:opacity-90 transition-opacity"
            >
              <span className="block">Build a real app in Playground →</span>
              <span className="block font-normal opacity-80 mt-0.5">{complexityHint.appOption}</span>
            </a>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-3">
        {isRecording && (
          <div className="flex items-center justify-between gap-3 mb-2 px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-500 font-medium">{interimTranscript || 'Listening...'}</span>
            </div>
            <span className="text-[11px] text-gray-500">
              Voice fills the box. Review, then send.
            </span>
          </div>
        )}
        {!isRecording && isSupported && (
          <div className="mb-2 px-1 text-[11px] text-gray-500">
            Use the microphone to draft text, then edit and send when you are ready.
          </div>
        )}
        <form
          onSubmit={e => { e.preventDefault(); sendMessage(input) }}
          className="flex items-end gap-2"
        >
          <textarea
            value={displayedInput}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            placeholder={isRecording ? 'Listening...' : 'Describe your tool idea...'}
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
        <PrivacyFooter />
      </div>
    </div>
  )
}
