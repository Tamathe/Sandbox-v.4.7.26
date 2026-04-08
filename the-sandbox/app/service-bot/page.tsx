'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../lib/auth-context'
import {
  Upload, FileText, Trash2, Building2, ShieldCheck, Loader2,
  CheckCircle, Scale, AlertTriangle, Sparkles, ChevronRight, AlertCircle, FileCheck,
} from 'lucide-react'
import { buildServiceBotSystemPrompt, ServiceProtocol } from '../lib/service-bot-prompt'

interface UploadedDoc {
  id: string
  name: string
  size: number
  content: string
  type: string
}

const PROTOCOL_OPTIONS: { id: ServiceProtocol; label: string; desc: string; icon: React.ElementType }[] = [
  {
    id: 'informational',
    label: 'Informational',
    desc: 'Answers general questions. No advice or decisions. e.g. "What are your office hours?"',
    icon: FileText,
  },
  {
    id: 'regulatory',
    label: 'Regulatory',
    desc: 'Explains policies and eligibility rules. Always defers individual cases to staff. e.g. Financial Aid, Housing',
    icon: Scale,
  },
  {
    id: 'transactional',
    label: 'Transactional',
    desc: 'Guides students through multi-step processes. e.g. Parking permit, course withdrawal, ID card',
    icon: FileCheck,
  },
]

export default function ServiceBotPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [docs, setDocs] = useState<UploadedDoc[]>([])
  const [pasteText, setPasteText] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [department, setDepartment] = useState('')
  const [protocol, setProtocol] = useState<ServiceProtocol>('informational')
  const [focusAreas, setFocusAreas] = useState('')
  const [escalationEmail, setEscalationEmail] = useState('')
  const [piiCertified, setPiiCertified] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [processingFiles, setProcessingFiles] = useState(false)

  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Administrators only</h2>
        <p className="text-gray-500">Service bot creation is restricted to university administrators.</p>
      </div>
    )
  }

  const readFileAsText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    setProcessingFiles(true)
    setError('')
    const existingNames = new Set(docs.map((d) => d.name))
    const newDocs: UploadedDoc[] = []
    const errors: string[] = []

    for (const file of Array.from(files)) {
      if (existingNames.has(file.name)) { errors.push(`${file.name} already added`); continue }
      if (file.size > 500_000) { errors.push(`${file.name} is too large (max 500KB)`); continue }
      try {
        const content = await readFileAsText(file)
        newDocs.push({ id: crypto.randomUUID(), name: file.name, size: file.size, content, type: file.type })
      } catch {
        errors.push(`Could not read ${file.name}`)
      }
    }

    setDocs((prev) => [...prev, ...newDocs])
    if (errors.length > 0) setError(errors.join('. '))
    setProcessingFiles(false)
  }

  const totalWords = docs.reduce((sum, d) => sum + d.content.split(/\s+/).length, 0)

  const handleCreate = async () => {
    if (!serviceName.trim()) { setError('Please enter a service name'); return }
    if (!piiCertified) { setError('You must certify PII compliance before creating a service bot'); return }
    setCreating(true)
    setError('')

    try {
      const payload = {
        name: `${serviceName} — Virtual Assistant`,
        shortDescription: `Official AI assistant for ${serviceName}${department ? `, ${department}` : ''} at UK`,
        fullDescription: `An official University of Kentucky service bot for ${serviceName}. ` +
          `Helps students navigate ${protocol} information and processes 24/7. ` +
          `All responses are grounded in official university policy documents.`,
        category: 'University Service',
        difficultyLevel: 'Introductory',
        toolType: 'CHATBOT',
        systemPrompt: buildServiceBotSystemPrompt({ serviceName, department, protocol, focusAreas, escalationEmail, docs }),
        welcomeMessage: `Hi! I'm the ${serviceName} virtual assistant at UK. How can I help you today?`,
        starterQuestions: [
          'What are your office hours and how can I contact you?',
          'What documents or steps do I need to get started?',
          'Where can I find more information about this topic?',
        ],
        intendedAudience: 'All University of Kentucky students and staff',
        learningObjectives: [
          'Get accurate information about university services',
          'Navigate university processes with confidence',
          'Find the right contact and resources quickly',
        ],
        personaName: serviceName.trim() || 'UK Official Assistant',
        published: true,
        isOfficialService: true,
        serviceProtocol: protocol,
        escalationEmail: escalationEmail || null,
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
          res.status === 403 ? 'Only administrators can create service bots.' :
          res.status === 422 ? `Validation error: ${data.error ?? 'Check your inputs.'}` :
          data.error ?? `Something went wrong (${res.status})`
        throw new Error(message)
      }

      const data = await res.json()
      if (!data?.id) throw new Error('Service bot was created but could not be opened.')
      router.push(`/tools/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  const STEP_LABELS = ['Upload Policy Docs', 'Configure Service', 'Review & Deploy'] as const

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#0033A0] rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create a Service Bot</h1>
            <p className="text-sm text-gray-500">Deploy an official UK service assistant. Appears in the marketplace with a verified university badge.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-6">
          {STEP_LABELS.map((label, i) => {
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

      {step === 1 && (
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Only upload <strong>approved, public-facing policy documents</strong>. Do not upload documents containing student PII, internal communications, or draft policies.
            </p>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-[#0033A0] bg-blue-50' : 'border-gray-300 hover:border-[#0033A0] hover:bg-blue-50/30'
            }`}
          >
            {processingFiles ? (
              <Loader2 className="w-10 h-10 text-[#0033A0] mx-auto mb-3 animate-spin" />
            ) : (
              <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            )}
            <p className="font-semibold text-gray-700 mb-1">Drop policy documents here or click to upload</p>
            <p className="text-sm text-gray-400">Supports .txt, .md, .csv · Max 500KB each · Paste text below for PDF content</p>
            <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.csv" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              Paste policy text (for PDFs, web pages)
            </h3>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={5}
              placeholder="Paste policy text, FAQ content, or procedure guides here..."
              className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-400">Click "Add" to include in knowledge base</p>
              <button
                type="button"
                disabled={!pasteText.trim()}
                onClick={() => {
                  const text = pasteText.trim()
                  if (text) {
                    setDocs((prev) => [...prev, { id: crypto.randomUUID(), name: 'Pasted policy content', size: text.length, content: text, type: 'text/plain' }])
                    setPasteText('')
                  }
                }}
                className="text-xs font-semibold bg-[#0033A0] text-white px-3 py-1.5 rounded-lg hover:bg-[#002580] transition-colors disabled:opacity-40"
              >
                Add to knowledge base
              </button>
            </div>
          </div>

          {docs.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 text-sm">Policy Documents ({docs.length})</h3>
                <span className={`text-xs font-medium ${totalWords > 10000 ? 'text-amber-600' : 'text-gray-400'}`}>
                  ~{totalWords.toLocaleString()} words{totalWords > 10000 ? ' — large knowledge base, some content may be trimmed' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-400">{doc.content.split(/\s+/).length.toLocaleString()} words</p>
                    </div>
                    <button onClick={() => setDocs((prev) => prev.filter((d) => d.id !== doc.id))} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={() => setStep(2)} className="bg-[#0033A0] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#002580] transition-colors">
              {docs.length > 0 ? 'Continue with policy documents' : 'Continue without documents'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0033A0]" />
              Service Identity
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Name</label>
              <input
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
                placeholder="e.g. Financial Aid Office, UK Parking & Transportation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Department / Division (optional)</label>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
                placeholder="e.g. Division of Student Affairs"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Escalation Email (optional)</label>
              <input
                type="email"
                value={escalationEmail}
                onChange={(e) => setEscalationEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
                placeholder="e.g. finaid@uky.edu"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Focus Areas (optional)</label>
              <textarea
                value={focusAreas}
                onChange={(e) => setFocusAreas(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 resize-none"
                placeholder="e.g. FAFSA, scholarship appeals, SAP requirements..."
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#0033A0]" />
              Service Protocol
            </h3>
            <p className="text-xs text-gray-500">This determines how the bot handles sensitive or consequential questions.</p>
            <div className="space-y-3">
              {PROTOCOL_OPTIONS.map((opt) => {
                const Icon = opt.icon
                return (
                  <div
                    key={opt.id}
                    onClick={() => setProtocol(opt.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      protocol === opt.id ? 'border-[#0033A0] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${protocol === opt.id ? 'text-[#0033A0]' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700 font-medium">← Back</button>
            <button
              onClick={() => {
                if (!serviceName.trim()) { setError('Please enter a service name before continuing'); return }
                setError('')
                setStep(3)
              }}
              className="bg-[#0033A0] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#002580] transition-colors"
            >
              Review →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-[#0033A0] text-white px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                {serviceName.charAt(0) || 'U'}
              </div>
              <div>
                <p className="font-bold">{serviceName || 'Service Name'}</p>
                <p className="text-xs text-blue-200">{department || 'University of Kentucky'}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span className="text-xs text-white font-semibold">UK Official</span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Protocol</p>
                <p className="text-sm text-gray-700 capitalize">{protocol}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Knowledge Base</p>
                <p className="text-sm text-gray-700">
                  {docs.length > 0
                    ? `${docs.length} document${docs.length > 1 ? 's' : ''} — ~${totalWords.toLocaleString()} words`
                    : 'No documents — bot will use general knowledge only'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Visibility</p>
                <p className="text-sm text-gray-700">Published immediately · Appears in Marketplace with UK Official badge</p>
              </div>
            </div>
          </div>

          <div className={`rounded-xl border-2 p-4 transition-colors ${piiCertified ? 'border-green-300 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={piiCertified}
                onChange={(e) => setPiiCertified(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
              />
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">PII & Compliance Certification</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  I certify that the uploaded documents do not contain personally identifiable information (PII), FERPA-protected student records, or confidential university data. I understand this bot will be publicly accessible to all UK students.
                </p>
              </div>
            </label>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              <strong>Admin deployment:</strong> This bot is published immediately with an Official UK badge and APPROVED status. It will appear in the Marketplace and can be updated from the tool detail page.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-700 font-medium">← Back</button>
            <button
              onClick={handleCreate}
              disabled={creating || !piiCertified || !serviceName.trim()}
              className="flex items-center gap-2 bg-[#0033A0] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#002580] transition-colors disabled:opacity-60"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {creating ? 'Deploying...' : 'Deploy Service Bot'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
