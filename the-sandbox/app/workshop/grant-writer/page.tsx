'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import {
  ArrowLeft, Send, Loader2, Bot, User, Mic, MicOff,
  Wrench, Download, Upload, FileText, X, Plus, Sparkles,
} from 'lucide-react'
import { getWorkshopTool } from '../../lib/workshop'
import { useAuth } from '../../lib/auth-context'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'

import type { ChatMessage as Message } from '../../lib/types'

interface UploadedDocument {
  id: string
  filename: string
  fileType: string
  wordCount: number
  pageCount: number
  extractedText: string
  role: 'cv' | 'rfp' | 'supplemental'
}

const PRE_UPLOAD_STARTERS = [
  'What makes a strong Specific Aims page?',
  'How should I structure a budget justification?',
  'What do NSF reviewers look for in Broader Impacts?',
  'Tips for writing a compelling significance section',
]

const POST_UPLOAD_STARTERS = [
  'Draft Specific Aims',
  'Draft Significance',
  'Draft Approach',
  'Draft Budget Justification',
]

export default function GrantWriterPage() {
  const tool = getWorkshopTool('grant-writer')
  const { currentUser } = useAuth()

  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isUploading, setIsUploading] = useState<string | null>(null) // 'cv' | 'rfp' | 'supplemental' | null
  const [analysisText, setAnalysisText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const welcomeAddedRef = useRef(false)

  const { isRecording, interimTranscript, isSupported: micSupported, startRecording, stopRecording } =
    useSpeechRecognition()

  useEffect(() => {
    if (!tool || welcomeAddedRef.current) return
    welcomeAddedRef.current = true
    setMessages([{ id: 'welcome', role: 'assistant', content: tool.welcomeMessage }])
  }, [tool])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (interimTranscript) setInput(interimTranscript)
  }, [interimTranscript])

  const cvDoc = documents.find(d => d.role === 'cv')
  const rfpDoc = documents.find(d => d.role === 'rfp')
  const supplementalDocs = documents.filter(d => d.role === 'supplemental')
  const hasBothDocs = !!cvDoc && !!rfpDoc

  // Auto-analyze when both docs uploaded
  const analysisTriggeredRef = useRef(false)
  useEffect(() => {
    if (!hasBothDocs || analysisTriggeredRef.current || !tool) return
    analysisTriggeredRef.current = true
    runAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBothDocs])

  const runAnalysis = useCallback(async () => {
    if (!tool) return
    setIsAnalyzing(true)
    try {
      const allText = documents.map(d => `[${d.role.toUpperCase()}: ${d.filename}]\n${d.extractedText}`).join('\n\n---\n\n')
      const res = await fetch('/api/workshop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          slug: 'grant-writer',
          messages: [{ role: 'user', content: 'Analyze both uploaded documents. Summarize the grant opportunity, my qualifications and fit, and identify any gaps. Be concise.' }],
          uploadedContent: allText,
        }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value)
        setAnalysisText(text)
      }
    } catch {
      setAnalysisText('_Could not generate analysis. You can still ask questions in the chat._')
    } finally {
      setIsAnalyzing(false)
    }
  }, [tool, documents, currentUser.email])

  const handleFileUpload = useCallback(async (docRole: 'cv' | 'rfp' | 'supplemental', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setIsUploading(docRole)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/workshop/upload?slug=grant-writer', {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error || 'Upload failed')
      }

      const data = await res.json()
      const doc: UploadedDocument = {
        id: `${docRole}-${Date.now()}`,
        filename: data.filename,
        fileType: data.fileType,
        wordCount: data.wordCount,
        pageCount: data.pageCount,
        extractedText: data.extractedText,
        role: docRole,
      }

      setDocuments(prev => {
        // For cv/rfp, replace existing; for supplemental, append
        if (docRole === 'supplemental') return [...prev, doc]
        return [...prev.filter(d => d.role !== docRole), doc]
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setMessages(prev => [...prev, {
        id: `upload-err-${Date.now()}`,
        role: 'assistant',
        content: `_Could not process file: ${msg}_`,
      }])
    } finally {
      setIsUploading(null)
    }
  }, [currentUser.email])

  const removeDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id))
  }, [])

  const handleExport = useCallback(() => {
    const exportable = messages.filter(m => m.id !== 'welcome')
    if (exportable.length === 0) return
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const transcript = exportable
      .map(m => `${m.role === 'user' ? 'You' : 'Grant Writing Assistant'}: ${m.content}`)
      .join('\n\n')
    const lines = [
      'Workshop — Grant Writing Assistant',
      `Exported: ${date}`,
      '-'.repeat(40),
      '',
      transcript,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workshop-grant-writer-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [messages])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loading || !tool) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: content.trim() }
    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setLoading(true)

    try {
      const allText = documents.length > 0
        ? documents.map(d => `[${d.role.toUpperCase()}: ${d.filename}]\n${d.extractedText}`).join('\n\n---\n\n')
        : undefined

      const history = messages.filter(m => m.id !== 'welcome').concat(userMsg)
      const res = await fetch('/api/workshop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          slug: 'grant-writer',
          messages: history.map(m => ({ role: m.role, content: m.content })),
          uploadedContent: allText,
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
        prev.map(m => m.id === assistantMsg.id ? { ...m, content: `_Error: ${msg}_` } : m)
      )
    } finally {
      setLoading(false)
    }
  }, [messages, loading, tool, currentUser.email, documents])

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input) }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
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

  if (!tool) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔧</div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Tool not found</h1>
        <p className="text-gray-500 mb-6">This Workshop tool doesn&apos;t exist yet.</p>
        <Link
          href="/hub"
          className="inline-flex items-center gap-2 bg-[#0033A0] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#002580] transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Hub
        </Link>
      </div>
    )
  }

  const starterQuestions = hasBothDocs ? POST_UPLOAD_STARTERS : PRE_UPLOAD_STARTERS
  const showStarterQuestions = messages.length <= 1 && !loading
  const hasExportableMessages = messages.filter(m => m.id !== 'welcome').length > 0
  const modelLabel = 'Claude Sonnet'

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div
        className="flex-shrink-0 border-b border-white/20"
        style={{ background: tool.headerGradient }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/hub"
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors flex-shrink-0"
          >
            <ArrowLeft className="size-4" />
            <Wrench className="size-3.5" />
            <span className="hidden sm:inline">Workshop</span>
          </Link>
          <span className="text-white/30 text-xs">&middot;</span>
          <span className="text-2xl flex-shrink-0">{tool.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white text-sm truncate">{tool.title}</div>
            <div className="text-white/70 text-xs truncate">{tool.tagline}</div>
          </div>
          <span className="flex-shrink-0 text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
            In Development
          </span>
          {hasExportableMessages && (
            <button
              type="button"
              onClick={handleExport}
              title="Export conversation"
              className="flex-shrink-0 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Download className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main content: left upload pane + right chat pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left pane — Documents */}
        <div className="w-1/3 border-r border-gray-200 bg-white flex flex-col overflow-y-auto">
          <div className="p-4 space-y-4">
            <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <FileText className="size-4 text-amber-600" />
              Documents
            </h2>

            {/* CV Upload Zone */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your CV</div>
              {cvDoc ? (
                <div className="flex items-start gap-2">
                  <FileText className="size-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">{cvDoc.filename}</div>
                    <div className="text-xs text-gray-400">
                      {cvDoc.pageCount > 0 && `${cvDoc.pageCount} pages · `}{cvDoc.wordCount.toLocaleString()} words
                    </div>
                  </div>
                  <button onClick={() => removeDocument(cvDoc.id)} className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : isUploading === 'cv' ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="size-4 animate-spin" />
                  Processing...
                </div>
              ) : (
                <label className="flex items-center gap-2 text-sm text-gray-400 hover:text-amber-600 cursor-pointer transition-colors">
                  <Upload className="size-4" />
                  Upload CV (PDF or TXT)
                  <input
                    type="file"
                    className="hidden"
                    accept="application/pdf,text/plain"
                    onChange={(e) => handleFileUpload('cv', e)}
                  />
                </label>
              )}
            </div>

            {/* RFP Upload Zone */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Grant RFP / NOFO</div>
              {rfpDoc ? (
                <div className="flex items-start gap-2">
                  <FileText className="size-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">{rfpDoc.filename}</div>
                    <div className="text-xs text-gray-400">
                      {rfpDoc.pageCount > 0 && `${rfpDoc.pageCount} pages · `}{rfpDoc.wordCount.toLocaleString()} words
                    </div>
                  </div>
                  <button onClick={() => removeDocument(rfpDoc.id)} className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : isUploading === 'rfp' ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="size-4 animate-spin" />
                  Processing...
                </div>
              ) : (
                <label className="flex items-center gap-2 text-sm text-gray-400 hover:text-amber-600 cursor-pointer transition-colors">
                  <Upload className="size-4" />
                  Upload RFP / NOFO (PDF or TXT)
                  <input
                    type="file"
                    className="hidden"
                    accept="application/pdf,text/plain"
                    onChange={(e) => handleFileUpload('rfp', e)}
                  />
                </label>
              )}
            </div>

            {/* Supplemental docs */}
            {supplementalDocs.map(doc => (
              <div key={doc.id} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <FileText className="size-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">{doc.filename}</div>
                    <div className="text-xs text-gray-400">
                      {doc.pageCount > 0 && `${doc.pageCount} pages · `}{doc.wordCount.toLocaleString()} words
                    </div>
                  </div>
                  <button onClick={() => removeDocument(doc.id)} className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Upload another file button */}
            {hasBothDocs && (
              <label className="flex items-center gap-2 text-sm text-gray-400 hover:text-amber-600 cursor-pointer transition-colors px-1">
                {isUploading === 'supplemental' ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Upload another file
                    <input
                      type="file"
                      className="hidden"
                      accept="application/pdf,text/plain"
                      onChange={(e) => handleFileUpload('supplemental', e)}
                    />
                  </>
                )}
              </label>
            )}

            {/* Analysis section */}
            {(isAnalyzing || analysisText) && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="size-4 text-amber-600" />
                  <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">AI Analysis</span>
                  {isAnalyzing && <Loader2 className="size-3 animate-spin text-amber-600" />}
                </div>
                <div className="text-xs text-gray-600 leading-relaxed prose prose-xs max-w-none">
                  <DynamicMarkdown
                    components={{
                      p:      ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                      ul:     ({ children }) => <ul className="list-disc pl-3 space-y-0.5 mt-1">{children}</ul>,
                      ol:     ({ children }) => <ol className="list-decimal pl-3 space-y-0.5 mt-1">{children}</ol>,
                      li:     ({ children }) => <li>{children}</li>,
                      h1:     ({ children }) => <h1 className="font-bold text-sm mt-2 mb-1">{children}</h1>,
                      h2:     ({ children }) => <h2 className="font-bold text-xs mt-2 mb-1">{children}</h2>,
                      h3:     ({ children }) => <h3 className="font-semibold text-xs mt-1.5 mb-0.5">{children}</h3>,
                    }}
                  >
                    {analysisText}
                  </DynamicMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right pane — Chat */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`size-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    msg.role === 'user' ? 'bg-gray-200' : 'bg-[#0033A0]'
                  }`}
                >
                  {msg.role === 'user'
                    ? <User className="size-4 text-gray-600" />
                    : <Bot className="size-4 text-white" />
                  }
                </div>
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-[#0033A0] text-white rounded-tr-sm'
                      : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
                  }`}
                >
                  {msg.content === '' && msg.role === 'assistant' ? (
                    <div className="flex items-center gap-1.5">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="size-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  ) : msg.role === 'assistant' ? (
                    <DynamicMarkdown
                      components={{
                        p:          ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                        strong:     ({ children }) => <strong className="font-bold">{children}</strong>,
                        em:         ({ children }) => <em className="italic">{children}</em>,
                        ul:         ({ children }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
                        ol:         ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
                        li:         ({ children }) => <li>{children}</li>,
                        h1:         ({ children }) => <h1 className="font-bold text-base mt-2 mb-1">{children}</h1>,
                        h2:         ({ children }) => <h2 className="font-bold text-sm mt-2 mb-1">{children}</h2>,
                        h3:         ({ children }) => <h3 className="font-semibold text-sm mt-1.5 mb-0.5">{children}</h3>,
                        code:       ({ children }) => <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                        blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-600">{children}</blockquote>,
                        a:          ({ href, children }) => <a href={href} className="text-[#0033A0] underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                      }}
                    >
                      {msg.content}
                    </DynamicMarkdown>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
              </div>
            ))}

            {showStarterQuestions && (
              <div className="flex flex-wrap gap-2 ml-11">
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

            <div ref={messagesEndRef} />
          </div>

          {/* Privacy note */}
          <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-1.5">
            <span className="text-[10px] text-gray-400">
              UKY Protected Environment &middot; Data is not used to train external models &middot; Powered by {modelLabel}
            </span>
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-white p-3">
            {messages.length <= 1 && (
              <p className="mb-2 text-[11px] text-gray-400 px-1">
                {hasBothDocs
                  ? 'Your documents are loaded. Ask me to draft any section of your grant application.'
                  : 'Upload your CV and grant RFP on the left, or ask a general grant writing question below.'}
              </p>
            )}
            {isRecording && (
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="size-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-red-500 font-medium">{interimTranscript || 'Listening...'}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={isRecording ? interimTranscript || input : input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasBothDocs ? 'Ask me to draft a section...' : 'Ask a grant writing question...'}
                disabled={loading || isRecording}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50 overflow-hidden"
                style={{ minHeight: '42px', maxHeight: '200px' }}
              />
              {micSupported && (
                <button
                  type="button"
                  onClick={handleMic}
                  disabled={loading}
                  className={`size-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
                    isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {isRecording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </button>
              )}
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="size-10 bg-[#0033A0] hover:bg-[#002580] text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
