'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../lib/auth-context'
import {
  Upload, FileText, Trash2, Brain, Mic, Loader2,
  CheckCircle, BookOpen, User, Sparkles, ChevronRight, AlertCircle
} from 'lucide-react'

interface UploadedDoc {
  id: string
  name: string
  size: number
  content: string
  type: string
}

const STYLE_OPTIONS = [
  { id: 'warm', label: 'Warm & Encouraging', desc: 'Supportive, patient, celebrates effort' },
  { id: 'socratic', label: 'Socratic', desc: 'Asks questions back, guides students to the answer' },
  { id: 'direct', label: 'Direct & Concise', desc: 'Clear, to the point, no fluff' },
  { id: 'scholarly', label: 'Scholarly', desc: 'Rigorous, cites sources, intellectually demanding' },
]

export default function AvatarPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [docs, setDocs] = useState<UploadedDoc[]>([])
  const [avatarName, setAvatarName] = useState(`Prof. ${currentUser.name.split(' ').pop()}`)
  const [courseCode, setCourseCode] = useState('')
  const [courseDescription, setCourseDescription] = useState('')
  const [teachingStyle, setTeachingStyle] = useState('warm')
  const [focusAreas, setFocusAreas] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [processingFiles, setProcessingFiles] = useState(false)
  const [pasteText, setPasteText] = useState('')

  if (currentUser.role === 'STUDENT') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Educators only</h2>
        <p className="text-gray-500">Only educators can create TA tools.</p>
      </div>
    )
  }

  const readFileAsText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    setProcessingFiles(true)
    setError('') // Clear previous errors at start of new batch
    
    const newDocs: UploadedDoc[] = []
    const errors: string[] = []
    const existingNames = new Set(docs.map(d => d.name))

    for (const file of Array.from(files)) {
      if (file.size > 500_000) { errors.push(`${file.name} is too large (max 500KB)`); continue }
      if (existingNames.has(file.name)) { errors.push(`${file.name} already added`); continue }
      try {
        const content = await readFileAsText(file)
        newDocs.push({ id: crypto.randomUUID(), name: file.name, size: file.size, content, type: file.type })
        existingNames.add(file.name)
      } catch {
        errors.push(`Could not read ${file.name}`)
      }
    }

    setDocs(prev => [...prev, ...newDocs])
    if (errors.length > 0) setError(errors.join('. '))
    setProcessingFiles(false)
  }

  const buildSystemPrompt = () => {
    const styleMap: Record<string, string> = {
      warm: 'You are warm, encouraging, and patient. Celebrate student effort and progress.',
      socratic: 'You use the Socratic method — respond to questions with guiding questions that lead students to discover the answer themselves.',
      direct: 'You are concise and direct. No fluff. Give clear, actionable answers.',
      scholarly: 'You are rigorous and scholarly. Cite relevant concepts, demand precision, and challenge students to think more deeply.',
    }

    // Budget ~180K characters (~45K tokens) for knowledge base, leaving room for conversation
    const KNOWLEDGE_CHAR_BUDGET = 180_000
    let remainingBudget = KNOWLEDGE_CHAR_BUDGET
    const docSections = docs.map(d => {
      if (remainingBudget <= 0) {
        return `### ${d.name}\n[Omitted - context budget exceeded. Remove larger documents to include this one.]`
      }
      // Cut at last paragraph boundary within budget, not mid-sentence
      const limit = Math.min(d.content.length, remainingBudget)
      const cutPoint = d.content.lastIndexOf('\n\n', limit) > 0 ? d.content.lastIndexOf('\n\n', limit) : limit
      remainingBudget -= cutPoint
      return `### ${d.name}\n${d.content.slice(0, cutPoint)}`
    })

    const knowledgeSection = docs.length > 0
      ? `\n\n## Your Knowledge Base\nAnswer questions using ONLY the course materials below. If a question falls outside this material, say: "That topic isn't covered in the materials I have access to - please check the course resources or ask your instructor directly." Do NOT draw on outside knowledge for course-specific questions.\n\n${docSections.join('\n\n')}`
      : ''

    return `You are ${avatarName}, an AI teaching assistant for ${courseCode || 'this course'}.

${courseDescription ? `About this course: ${courseDescription}` : ''}

${styleMap[teachingStyle]}

${focusAreas ? `Key focus areas for this course: ${focusAreas}` : ''}

Your role is to help students understand course material, answer questions, and support their learning journey. You represent your instructor's knowledge and pedagogical approach.${knowledgeSection}`
  }

  const handleCreate = async () => {
    if (!avatarName.trim()) { setError('Please set a TA name'); return }
    setCreating(true)
    setError('')

    try {
      const systemPrompt = buildSystemPrompt()
      const payload = {
        name: `${avatarName} — AI Teaching Assistant`,
        shortDescription: `24/7 AI TA for ${courseCode || 'this course'} powered by course materials`,
        fullDescription: `An AI teaching assistant that embodies ${avatarName}'s knowledge and teaching style. Ask questions about course material, get explanations, and get help understanding concepts anytime.\n\n${courseDescription}`,
        category: 'General',
        difficultyLevel: 'Introductory',
        toolType: 'CHATBOT',
        systemPrompt,
        welcomeMessage: `Hi! I'm ${avatarName}, your AI teaching assistant for ${courseCode || 'this course'}. I'm here 24/7 to help you understand the material, answer questions, and support your learning. What can I help you with today?`,
        starterQuestions: [
          'Can you explain the main concepts from the last lecture?',
          'I\'m confused about this topic — can you help?',
          'What should I focus on for the upcoming assessment?',
        ],
        intendedAudience: `Students enrolled in ${courseCode || 'this course'}`,
        learningObjectives: [
          'Get immediate answers to course-related questions',
          'Deepen understanding of course material',
          'Prepare for assessments with guided review',
        ],
        published: false,
      }

      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message =
          res.status === 413 ? 'Your knowledge base is too large. Remove some documents and try again.' :
          res.status === 401 ? 'Session expired. Please refresh the page.' :
          res.status === 422 ? `Validation error: ${data.error ?? 'Check your inputs and try again.'}` :
          data.error ?? `Something went wrong (${res.status})`
        throw new Error(message)
      }

      const data = await res.json()
      if (!data?.id) throw new Error('TA was created but could not be opened. Check your tools list.')
      router.push(`/tools/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  const totalWords = docs.reduce((sum, d) => sum + d.content.split(/\s+/).length, 0)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#0033A0] rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Your AI TA</h1>
            <p className="text-sm text-gray-500">Upload your course materials. Your students get a 24/7 version of you.</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-6">
          {(['Upload Docs', 'Configure TA', 'Review & Create'] as const).map((label, i) => {
            const s = (i + 1) as 1 | 2 | 3
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-sm font-medium ${step === s ? 'text-[#0033A0]' : step > s ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step > s ? 'bg-green-500 text-white' : step === s ? 'bg-[#0033A0] text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {step > s ? <CheckCircle className="w-3.5 h-3.5" /> : s}
                  </div>
                  <span className="hidden sm:block">{label}</span>
                </div>
                {i < 2 && <ChevronRight className="w-4 h-4 text-gray-300" />}
              </div>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── STEP 1: Upload ── */}
      {step === 1 && (
        <div className="space-y-5">
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors relative ${
              dragOver ? 'border-[#0033A0] bg-blue-50' : 'border-gray-300 hover:border-[#0033A0] hover:bg-blue-50/30'
            }`}
          >
            {processingFiles ? (
              <Loader2 className="w-10 h-10 text-[#0033A0] mx-auto mb-3 animate-spin" />
            ) : (
              <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            )}
            <p className="font-semibold text-gray-700 mb-1">Drop files here or click to upload</p>
            <p className="text-sm text-gray-400">Supports .txt, .md, .csv · Max 500KB each · Paste text below for PDF/DOCX content</p>
            <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.csv,.js,.ts,.json" className="hidden" onChange={e => handleFiles(e.target.files)} />
          </div>

          {/* Paste text option */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              Paste content directly (for PDFs, slides, transcripts)
            </h3>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              rows={5}
              placeholder="Paste lecture notes, syllabus content, transcript text, or any course material here..."
              className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-400">Click "Add" to include this text in your knowledge base</p>
              <button
                type="button"
                disabled={!pasteText.trim()}
                onClick={() => {
                  const text = pasteText.trim()
                  if (text) {
                    setDocs(prev => [...prev, {
                      id: crypto.randomUUID(),
                      name: 'Pasted content',
                      size: text.length,
                      content: text,
                      type: 'text/plain',
                    }])
                    setPasteText('')
                  }
                }}
                className="text-xs font-semibold bg-[#0033A0] text-white px-3 py-1.5 rounded-lg hover:bg-[#002580] transition-colors disabled:opacity-40"
              >
                Add to knowledge base
              </button>
            </div>
          </div>

          {/* Uploaded docs list */}
          {docs.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 text-sm">Knowledge Base ({docs.length} {docs.length === 1 ? 'document' : 'documents'})</h3>
                <span className={`text-xs font-medium ${totalWords > 15000 ? 'text-amber-600' : 'text-gray-400'}`}>
                  ~{totalWords.toLocaleString()} words{totalWords > 15000 ? ' - large knowledge base, some content may be trimmed' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-400">{doc.content.split(/\s+/).length.toLocaleString()} words</p>
                    </div>
                    <button onClick={() => setDocs(prev => prev.filter(d => d.id !== doc.id))} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="bg-[#0033A0] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#002580] transition-colors"
            >
              {docs.length > 0 ? 'Continue with knowledge base' : 'Continue without documents'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Configure ── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-[#0033A0]" />
              TA Identity
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">TA Name</label>
              <input
                value={avatarName}
                onChange={e => setAvatarName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
                placeholder="e.g. Prof. Rivera"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Course Code</label>
              <input
                value={courseCode}
                onChange={e => setCourseCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
                placeholder="e.g. LAW 756: Evidence Rules"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Course Description (optional)</label>
              <textarea
                value={courseDescription}
                onChange={e => setCourseDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 resize-none"
                placeholder="Brief description of the course and what students should get from interacting with your TA..."
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Mic className="w-4 h-4 text-[#0033A0]" />
              Teaching Style
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STYLE_OPTIONS.map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setTeachingStyle(opt.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    teachingStyle === opt.id ? 'border-[#0033A0] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-[#0033A0]" />
              Focus Areas (optional)
            </h3>
            <textarea
              value={focusAreas}
              onChange={e => setFocusAreas(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 resize-none"
              placeholder="e.g. Hearsay exceptions, character evidence rules, expert witness standards, trial procedure..."
            />
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="bg-[#0033A0] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#002580] transition-colors"
            >
              Preview TA →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Review ── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-[#0033A0] text-white px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                {avatarName.charAt(0)}
              </div>
              <div>
                <p className="font-bold">{avatarName}</p>
                <p className="text-xs text-blue-200">{courseCode || 'AI Teaching Assistant'}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 bg-green-500/20 rounded-lg px-2.5 py-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-green-200 font-medium">Always available</span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Teaching Style</p>
                <p className="text-sm text-gray-700">{STYLE_OPTIONS.find(s => s.id === teachingStyle)?.label}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Knowledge Base</p>
                <p className="text-sm text-gray-700">
                  {docs.length > 0
                    ? `${docs.length} document${docs.length > 1 ? 's' : ''} — ~${totalWords.toLocaleString()} words`
                    : 'No documents uploaded — TA will use general knowledge'
                  }
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Welcome Message Preview</p>
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 italic">
                  Hi! I&apos;m {avatarName}, your AI teaching assistant for {courseCode || 'this course'}. I&apos;m here 24/7 to help you understand the material, answer questions, and support your learning. What can I help you with today?
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <strong>How it works:</strong> Your TA is created as a draft tool. You can test it, then publish it so students can find it in the marketplace. In production, embeddings would enable true semantic search across your documents — for now, the full content is injected into context.
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
              ← Back
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 bg-[#0033A0] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#002580] transition-colors disabled:opacity-60"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              {creating ? 'Creating TA...' : 'Create My TA'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
