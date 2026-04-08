'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../lib/auth-context'
import {
  Upload, FileText, Trash2, Building2, ShieldCheck, Loader2,
  CheckCircle, Scale, AlertTriangle, Sparkles, ChevronRight, AlertCircle, FileCheck
} from 'lucide-react'

interface UploadedDoc {
  id: string
  name: string
  size: number
  content: string
  type: string
}

const PROTOCOL_OPTIONS = [
  { id: 'informational', label: 'Informational', desc: 'Friendly guidance for general FAQs, hours, and campus locations.' },
  { id: 'regulatory', label: 'Regulatory & Policy', desc: 'Strict adherence to documents. Cites policies. No guessing. Best for Financial Aid.' },
  { id: 'transactional', label: 'Transactional', desc: 'Step-by-step troubleshooting and form assistance. Direct and procedural.' },
]

export default function ServiceBotPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [docs, setDocs] = useState<UploadedDoc[]>([])
  
  // State specific to Service Bots
  const [botName, setBotName] = useState('Student Services Assistant')
  const [department, setDepartment] = useState('')
  const [protocol, setProtocol] = useState('regulatory')
  const [escalationEmail, setEscalationEmail] = useState('')
  const [piiCertified, setPiiCertified] = useState(false)
  
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [processingFiles, setProcessingFiles] = useState(false)

  // Restrict access
  if (currentUser.role === 'STUDENT') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Staff Access Only</h2>
        <p className="text-gray-500">Only university staff and educators can create official service bots.</p>
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
    setError('')
    
    const newDocs: UploadedDoc[] = []
    const errors: string[] = []

    for (const file of Array.from(files)) {
      if (file.size > 1_000_000) { errors.push(`${file.name} is too large (max 1MB)`); continue }
      try {
        const content = await readFileAsText(file)
        newDocs.push({ id: Date.now() + Math.random() + '', name: file.name, size: file.size, content, type: file.type })
      } catch {
        errors.push(`Could not read ${file.name}`)
      }
    }

    setDocs(prev => [...prev, ...newDocs])
    if (errors.length > 0) setError(errors.join('. '))
    setProcessingFiles(false)
  }

  const buildSystemPrompt = () => {
    const protocolMap: Record<string, string> = {
      informational: 'You are a helpful, friendly university guide. Summarize information clearly.',
      regulatory: 'You are a strict regulatory assistant. You must answer questions using ONLY the provided context. If the answer is not explicitly in the documents, state that you cannot answer and refer the student to the department. Do not guess about dates or fees.',
      transactional: 'You are a technical support assistant. Provide numbered, step-by-step instructions. Be concise.',
    }

    const knowledgeSection = docs.length > 0
      ? `\n\n## Official Policy Documents\nYou have access to the following official documents. Use them as the ground truth for your answers.\n\n${docs.map(d => `### ${d.name}\n${d.content.slice(0, 15000)}`).join('\n\n')}`
      : ''

    return `You are ${botName}, an official automated assistant for the ${department || 'University'}.

${protocolMap[protocol]}

CRITICAL SAFETY RULES:
1. If a student provides Personally Identifiable Information (PII) such as a Student ID, SSN, or grades, IMMEDIATELY instruct them to delete it. Do not repeat the PII.
2. Always be professional and maintain an institutional tone.
${escalationEmail ? `3. If you cannot help, ask the student to email ${escalationEmail}.` : ''}

${knowledgeSection}`
  }

  const handleCreate = async () => {
    if (!botName.trim()) { setError('Please set a bot name'); return }
    if (!piiCertified) { setError('You must certify PII compliance'); return }
    
    setCreating(true)
    setError('')

    try {
      const systemPrompt = buildSystemPrompt()
      const payload = {
        name: botName,
        shortDescription: `Official ${department || 'University'} support assistant`,
        fullDescription: `Automated 24/7 support for ${department || 'University Services'}. capable of answering questions about policies, deadlines, and procedures.\n\n**Note:** This is an AI assistant. Please verify critical dates with official university correspondence.`,
        category: 'Student Services',
        difficultyLevel: 'All Levels',
        toolType: 'CHATBOT',
        systemPrompt,
        welcomeMessage: `Hello. I am the ${botName}. I can help answer questions regarding ${department || 'university policies'}. How can I assist you today?`,
        starterQuestions: [
          'What are the deadlines I need to know?',
          'How do I submit a request?',
          'Who do I contact for an appeal?',
        ],
        intendedAudience: `All Students`,
        learningObjectives: [
          'Quickly access official policy information',
          'Understand procedural requirements',
          'Resolve administrative blockers',
        ],
        published: false,
        // Custom metadata could go here if schema supported it
        // metadata: { isOfficial: true, protocol } 
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
        const data = await res.json()
        throw new Error(data.error || 'Failed to create service bot')
      }

      const data = await res.json()
      router.push(`/tools/${data.tool.id}`)
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
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Service Bot</h1>
            <p className="text-sm text-gray-500">Build official assistants for Financial Aid, Registrar, or Parking.</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-6">
          {(['Policy Upload', 'Configure Service', 'Review & Certify'] as const).map((label, i) => {
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
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-2 text-sm text-blue-800">
             <Scale className="w-4 h-4 mt-0.5 flex-shrink-0" />
             <p><strong>Accuracy is critical.</strong> Upload official PDF/DOCX exports of your policies. The bot will strictly adhere to these documents.</p>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors relative ${
              dragOver ? 'border-[#0033A0] bg-blue-50' : 'border-gray-300 hover:border-[#0033A0] hover:bg-blue-50/30'
            }`}
          >
             {processingFiles ? <Loader2 className="w-10 h-10 text-[#0033A0] mx-auto mb-3 animate-spin" /> : <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />}
            <p className="font-semibold text-gray-700 mb-1">Upload Policy Documents</p>
            <p className="text-sm text-gray-400">Supports .txt, .md, .csv (Max 1MB)</p>
            <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.csv" className="hidden" onChange={e => handleFiles(e.target.files)} />
          </div>

          {/* Uploaded docs list */}
          {docs.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 text-sm">Policy Documents ({docs.length})</h3>
              </div>
              <div className="space-y-2">
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <FileCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                    </div>
                    <button onClick={() => setDocs(prev => prev.filter(d => d.id !== doc.id))} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={() => setStep(2)} className="bg-[#0033A0] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#002580] transition-colors">
              Next: Configure Service
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Configure ── */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Configuration form for Bot Name, Department, Protocol similar to AvatarPage... */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0033A0]" />
              Service Identity
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bot Name</label>
                <input value={botName} onChange={e => setBotName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" placeholder="e.g. Financial Aid Assistant" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                <input value={department} onChange={e => setDepartment(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" placeholder="e.g. Office of Student Success" />
              </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Escalation Email (Optional)</label>
                <input value={escalationEmail} onChange={e => setEscalationEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" placeholder="help@university.edu" />
                <p className="text-xs text-gray-500 mt-1">Bot will refer students here if it cannot find an answer.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0033A0]" />
              Service Protocol
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {PROTOCOL_OPTIONS.map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setProtocol(opt.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    protocol === opt.id ? 'border-[#0033A0] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${protocol === opt.id ? 'border-[#0033A0]' : 'border-gray-300'}`}>
                    {protocol === opt.id && <div className="w-2 h-2 rounded-full bg-[#0033A0]" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">Back</button>
            <button onClick={() => setStep(3)} className="bg-[#0033A0] text-white px-6 py-2.5 rounded-xl font-semibold text-sm">Preview</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Review & Certify ── */}
      {step === 3 && (
        <div className="space-y-6">
            {/* Preview Card with Official Branding */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-[#0033A0] text-white px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold">{botName}</p>
                <p className="text-xs text-blue-200 uppercase tracking-widest flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Official University Service
                </p>
              </div>
            </div>
            <div className="p-5 space-y-4">
               <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 italic">
                  Hello. I am the {botName}. I can help answer questions regarding {department || 'university policies'}. How can I assist you today?
                </div>
               <div className="flex gap-2 text-xs text-gray-500">
                   <span className="bg-gray-100 px-2 py-1 rounded border">Protocol: {PROTOCOL_OPTIONS.find(p => p.id === protocol)?.label}</span>
                   <span className="bg-gray-100 px-2 py-1 rounded border">{docs.length} Official Docs</span>
               </div>
            </div>
          </div>

          {/* FERPA / PII Certification */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h4 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" />
                Compliance Certification
            </h4>
            <p className="text-sm text-amber-800 mb-4">
                This tool will be available to students. You must certify that it does not request or store restricted data.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={piiCertified} onChange={e => setPiiCertified(e.target.checked)} className="mt-1 w-4 h-4 text-[#0033A0] rounded focus:ring-[#0033A0]" />
                <span className="text-sm text-gray-700">
                    I certify that this bot is designed to provide general information and policy guidance. 
                    It is <strong>not</strong> designed to handle Personally Identifiable Information (PII) such as grades, SSNs, or financial records.
                </span>
            </label>
          </div>

          <div className="flex justify-between items-center">
            <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-700">Back</button>
            <button
              onClick={handleCreate}
              disabled={creating || !piiCertified}
              className="flex items-center gap-2 bg-[#0033A0] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#002580] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {creating ? 'Deploying Service...' : 'Deploy Official Service'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}