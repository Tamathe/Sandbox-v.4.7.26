'use client'

import { useParams } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Send, Loader2, Mic, MicOff, MapPin } from 'lucide-react'
import { getExperience, GalleryItem } from '../../lib/sandcastle'
import { useAuth } from '../../lib/auth-context'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function MonumentStrip({
  gallery,
  onSelect,
  disabled,
}: {
  gallery: GalleryItem[]
  onSelect: (prompt: string) => void
  disabled: boolean
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  const handleClick = (item: GalleryItem, idx: number) => {
    if (disabled) return
    setActiveIdx(idx)
    onSelect(item.prompt)
  }

  return (
    <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-1">
        <MapPin className="w-3 h-3 text-stone-500" />
        <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-widest">
          Tap a monument to explore
        </span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-3" style={{ scrollbarWidth: 'none' }}>
        {gallery.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleClick(item, idx)}
            disabled={disabled}
            className={`flex-shrink-0 flex flex-col items-center gap-1 group transition-all ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5'
            }`}
          >
            <div
              className={`w-32 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                activeIdx === idx
                  ? 'border-stone-600 shadow-md ring-2 ring-stone-300'
                  : 'border-gray-200 group-hover:border-stone-400 group-hover:shadow-sm'
              }`}
            >
              <img
                src={item.url}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span
              className={`text-[10px] font-medium text-center leading-tight max-w-[128px] transition-colors ${
                activeIdx === idx ? 'text-stone-700' : 'text-gray-500 group-hover:text-stone-600'
              }`}
            >
              {item.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function SandcastleExperiencePage() {
  const params = useParams()
  const { currentUser } = useAuth()
  const slug = params.slug as string
  const experience = getExperience(slug)
  const isNotebook = slug === 'my-notebook'

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const welcomeAddedRef = useRef(false)

  const { isRecording, interimTranscript, isSupported: micSupported, startRecording, stopRecording } =
    useSpeechRecognition()

  useEffect(() => {
    if (!experience || welcomeAddedRef.current) return
    welcomeAddedRef.current = true
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: experience.welcomeMessage,
    }])
  }, [experience])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || !experience) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: content.trim() }
    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setIsLoading(true)

    try {
      const history = messages.filter(m => m.id !== 'welcome').concat(userMsg)
      const res = await fetch('/api/sandcastle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          systemPrompt: experience.systemPrompt,
        }),
      })

      if (!res.ok) throw new Error('Chat request failed')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMessages(prev =>
          prev.map(m => m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m)
        )
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setMessages(prev =>
        prev.map(m => m.id === assistantMsg.id ? { ...m, content: `Error: ${msg}` } : m)
      )
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, experience, currentUser.email])

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input) }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const handleSaveProfile = async () => {
    if (messages.length < 3 || isSaving) return
    setIsSaving(true)
    setSaveStatus('idle')

    try {
      const transcript = messages.filter((message) => message.id !== 'welcome')
      const res = await fetch('/api/memories/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ messages: transcript }),
      })

      if (!res.ok) throw new Error('Save failed')
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  if (!experience) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🏰</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Experience not found</h1>
        <p className="text-gray-500 mb-6">This sandcastle experience does not exist yet.</p>
        <Link href="/tools?section=live" className="inline-flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-amber-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Live
        </Link>
      </div>
    )
  }

  if (experience.status === 'coming-soon') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">{experience.emoji}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{experience.title}</h1>
        <p className="text-gray-500 mb-2">{experience.description}</p>
        <p className="text-sm text-amber-600 font-semibold mb-6">Coming Soon</p>
        <Link href="/tools?section=live" className="inline-flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-amber-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Live
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header bar */}
      <div
        className="flex-shrink-0 border-b border-amber-200"
        style={{ background: 'linear-gradient(135deg, #b45309 0%, #d97706 60%, #f59e0b 100%)' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/tools?section=live"
              className="flex items-center gap-1.5 text-amber-100 hover:text-white text-sm font-medium transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Live
            </Link>
            <span className="text-amber-300 text-xs">·</span>
            {experience.image ? (
              <Image src={experience.image} alt={experience.title} width={28} height={20} className="rounded flex-shrink-0" />
            ) : (
              <span className="text-2xl flex-shrink-0">{experience.emoji}</span>
            )}
            <div className="min-w-0">
              <div className="font-bold text-white text-sm truncate">{experience.title}</div>
              <div className="text-amber-200 text-xs truncate">{experience.tagline}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isNotebook && messages.length > 2 && (
              <button
                onClick={handleSaveProfile}
                disabled={isSaving || saveStatus === 'saved'}
                className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  saveStatus === 'saved'
                    ? 'bg-green-500 text-white'
                    : saveStatus === 'error'
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-amber-700 hover:bg-amber-50'
                } disabled:opacity-70`}
              >
                {isSaving ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </span>
                ) : saveStatus === 'saved' ? (
                  '✓ Saved'
                ) : saveStatus === 'error' ? (
                  'Try again'
                ) : (
                  'Save to My Profile'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Monument photo strip */}
      {experience.gallery && experience.gallery.length > 0 && (
        <MonumentStrip
          gallery={experience.gallery}
          onSelect={sendMessage}
          disabled={isLoading}
        />
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5 text-base">
                  {experience.emoji}
                </div>
              )}
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-amber-500 text-white rounded-tr-sm'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm'
                }`}
              >
                {m.content === '' && m.role === 'assistant' ? (
                  <div className="flex items-center gap-1.5">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                ) : m.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Starter prompts */}
      {messages.length === 1 && experience.starterPrompts.length > 0 && (
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-100 px-4 py-2">
          <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
            {experience.starterPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-full bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          {isRecording && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-500 font-medium">{interimTranscript || 'Listening...'}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={isRecording ? interimTranscript || input : input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={isLoading || isRecording}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 disabled:opacity-50 max-h-24 overflow-y-auto"
              style={{ minHeight: '42px' }}
            />
            {micSupported && (
              <button
                type="button"
                onClick={() => isRecording
                  ? stopRecording()
                  : startRecording(text => { setInput(text); setTimeout(() => sendMessage(text), 100) })
                }
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
              className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center hover:bg-amber-600 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
