'use client'

import { useParams } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import {
  ArrowLeft,
  Send,
  Loader2,
  Bot,
  User,
  LifeBuoy,
  Phone,
  Mail,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Plane,
  Accessibility,
  DollarSign,
  Stethoscope,
  Heart,
  Home,
  Activity,
  Briefcase,
  Utensils,
  Car,
  Award,
  Star,
  Shield,
  ClipboardList,
  ArrowLeftRight,
  Globe,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  Scale,
} from 'lucide-react'
import { getStudentServiceTool } from '../../lib/student-services'
import { useAuth } from '../../lib/auth-context'
import type { StudentServiceTool } from '../../lib/student-services'

// Map icon string names to lucide-react components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Plane,
  Accessibility,
  DollarSign,
  Stethoscope,
  Heart,
  Home,
  Activity,
  Briefcase,
  Utensils,
  Car,
  Award,
  Star,
  Shield,
  ClipboardList,
  ArrowLeftRight,
  Globe,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  Scale,
}

// Strip internal markers from displayed text
const PETITION_CREATED_REGEX = /\[PETITION_CREATED:[^\]]+\]/g

function stripMarkers(text: string): string {
  return text.replace(PETITION_CREATED_REGEX, '').trim()
}

// Citations: extract **Sources consulted:** block for academic-advisor
const SOURCES_BLOCK_RE = /\*\*Sources consulted:\*\*\s*([\s\S]+?)(?:\n\n|$)/

function parseSourcesList(block: string): string[] {
  return block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\d+\./.test(line))
}

import type { ChatMessage as Message } from '../../lib/types'

function ServiceIcon({ tool, className }: { tool: StudentServiceTool; className?: string }) {
  const Icon = (tool.icon && ICON_MAP[tool.icon]) ? ICON_MAP[tool.icon] : LifeBuoy
  return <Icon className={className} />
}

export default function StudentServiceToolPage() {
  const params = useParams()
  const { currentUser } = useAuth()
  const slug = params.slug as string
  const tool = getStudentServiceTool(slug)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [petitionId, setPetitionId] = useState<string | null>(null)
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const welcomeAddedRef = useRef(false)

  // Seed welcome message based on tool type
  useEffect(() => {
    if (!tool || welcomeAddedRef.current) return
    welcomeAddedRef.current = true

    const welcomeText = (() => {
      switch (tool.slug) {
        case 'isss-navigator':
          return "Welcome to the Immigration & Visa Navigator. I can help you understand your F-1 or J-1 status, OPT/CPT processes, I-20 requirements, and more. I'm not an immigration attorney — for anything that affects your visa status, please confirm with an ISSS advisor. How can I help you today?"
        case 'drc-readiness':
          return "Welcome to the Disability Accommodations Guide. Getting accommodations at UK is a different process than high school — I'm here to walk you through exactly what you need. What would you like to know about the DRC affiliation process?"
        case 'financial-aid-appeal':
          return "Losing financial aid is serious, and the appeal process can feel overwhelming. I'll guide you through it step by step. Which type of appeal are you working on — SAP (satisfactory academic progress), income reduction, unusual circumstances, or something else?"
        case 'pre-professional-advisor':
          return "Welcome to the Pre-Professional Track Advisor. I can help you with semester-by-semester planning, application timelines, shadowing requirements, and UK-specific resources. Which pre-professional track are you pursuing — pre-med, pre-law, pre-dental, pre-vet, pre-pharmacy, pre-PA, pre-OT/PT, or pre-optometry?"
        case 'counseling-navigator':
          return "Welcome. I'm here to help you understand UK's counseling options and prepare for your intake call. I'm not a therapist — I won't remember this conversation after it ends. What's on your mind today?"
        case 'food-basic-needs':
          return "Welcome. I'm here to help you find food, emergency funds, and other basic needs resources at UK. No judgment — a lot of students need these resources and don't know they exist. What can I help you find today?"
        case 'first-gen-guide':
          return "Welcome. Being first-gen means you're navigating college without a roadmap that was handed to you — and there's a lot of useful information you may not know exists yet. I can help you find TRIO, McNair, scholarship renewal info, and practical tips for navigating UK. What's on your mind?"
        case 'veterans-benefits':
          return "Welcome. I can help you understand your GI Bill chapter options, Yellow Ribbon, VA Work-Study, and UK veteran resources. Before making any benefit changes, always verify with the UK Veterans Center — but I can help you understand your options first. What would you like to know?"
        case 'career-coach':
          return "Welcome to the Career & Internship Coach. I can help with resume feedback, cover letter drafts, interview practice, and internship search strategy. To get started — what are you working on, and what role or field are you targeting?"
        case 'health-insurance':
          return "Welcome. I can help you understand the UK student health insurance plan, how to waive it if you're covered by a parent's plan, Student Health billing, and coverage questions. What can I help you figure out?"
        case 'registrar-navigator':
          return "Welcome to the Registrar Navigation Assistant. I can help you understand late withdrawals, grade appeals, enrollment verification, major changes, and other Registrar processes. What are you trying to navigate?"
        case 'transfer-credit':
          return "Welcome. I can help you understand how UK evaluates transfer credits, what to do with unassigned credits, how to read your degree audit, and how to petition for course equivalencies. What's your situation?"
        case 'study-abroad':
          return "Welcome to the Study Abroad Advisor. I can help you explore programs, understand course pre-approval, figure out financial aid portability, and plan your timeline. Where are you in the process — just starting to explore, or already eyeing specific programs?"
        case 'grad-school-coach':
          return "Welcome to the Graduate School Application Coach. I can help with statement of purpose drafting, recommender strategy, program selection, and application timelines. To get started — what field are you applying in, and what stage of the process are you at?"
        case 'grad-funding':
          return "Welcome to the Graduate Funding & Fellowships advisor. I can help you find NSF GRFP, NIH F31, UK internal fellowships, travel grants, and funding strategy. What funding opportunities are you exploring?"
        case 'parking-appeals':
          return "Welcome to the Parking & Transportation Guide. I can help with citation appeals, permit options, shuttle routes, and anything else Transportation Services related. What do you need help with?"
        case 'title-ix-guide':
          return "Welcome. Before we begin, I want to be clear about what this tool can and cannot do. I can provide information about UK's Title IX reporting options, the difference between confidential and mandatory reporters, and campus support resources. I cannot advise you on whether to report anything, and you do not need to share any details of a specific incident to use this tool. If you're in immediate danger, please call 911. UK's confidential resources are available 24/7 — I'll share them at the start of our conversation. What would you like to know?"
        case 'conduct-guide':
          return "Welcome. Being involved in a conduct process — whether as a respondent or trying to understand the process — can feel overwhelming. I can help you understand how the process works, what your rights are, and what to expect. You don't have to share details of your specific situation to get useful information. What would you like to understand about the conduct or academic integrity process?"
        case 'housing-appeal':
          return "Welcome. Housing situations can be stressful, and knowing your options matters. I can help you understand the housing contract release process, how to request roommate conflict mediation, and what to include in an appeal. What's your situation?"
        case 'legal-aid':
          return "Important: This tool provides information about legal resources and general legal processes only. It cannot provide legal advice, represent you, or evaluate the merits of your situation. For actual legal advice, contact UK Student Legal Services directly at slc@uky.edu. With that said — I can help you understand what UK Student Legal Services offers, general Kentucky tenant rights, how to read a lease, or the student conduct hearing process from a procedural standpoint. What would you like to know?"
        case 'academic-advisor':
          return "Hi, I'm Sandy — your AI academic advisor for UK. I can help you understand degree requirements, plan your schedule, and navigate university policies. For official decisions, your college advisor is always the final word. What would you like to explore?"
        default:
          return `Welcome to the ${tool.title}. How can I help you today?`
      }
    })()

    setMessages([{ id: 'welcome', role: 'assistant', content: welcomeText }])
  }, [tool])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loading || !tool) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: content.trim() }
    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setLoading(true)
    setStreamingMsgId(assistantMsg.id)

    try {
      const history = messages.filter(m => m.id !== 'welcome').concat(userMsg)

      const res = await fetch(`/api/student-services/${slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(err.error ?? 'Request failed')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullResponse += chunk
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsg.id
              ? { ...m, content: stripMarkers(fullResponse) }
              : m,
          ),
        )
      }

      // Check for petition created marker
      const petitionMatch = /\[PETITION_CREATED:([^\]]+)\]/.exec(fullResponse)
      if (petitionMatch) {
        setPetitionId(petitionMatch[1])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsg.id ? { ...m, content: `_Error: ${msg}_` } : m,
        ),
      )
    } finally {
      setLoading(false)
      setStreamingMsgId(null)
    }
  }, [messages, loading, tool, slug, currentUser.email])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // 404
  if (!tool) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <LifeBuoy className="size-12 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Service not found</h1>
        <p className="text-gray-500 mb-6">This student service tool doesn&apos;t exist.</p>
        <Link
          href="/student-services"
          className="inline-flex items-center gap-2 bg-[#0033A0] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#002580] transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Student Services
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Crisis banner — only for crisisLineEnabled tools */}
      {tool.crisisLineEnabled && (
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2.5">
          <div className="max-w-3xl mx-auto flex items-center gap-2.5 flex-wrap">
            <Phone className="size-4 text-amber-700 flex-shrink-0" />
            <span className="text-sm text-amber-800">
              <span className="font-semibold">Crisis support available 24/7:</span>{' '}
              UK Counseling Crisis Line{' '}
              <a href="tel:+18592578701" className="font-bold underline">
                859-257-8701
              </a>{' '}
              press 1 &nbsp;·&nbsp; National Crisis Line{' '}
              <a href="tel:988" className="font-bold underline">
                988
              </a>
            </span>
          </div>
        </div>
      )}

      {/* Legal disclaimer banner — only for requiresLegalDisclaimer tools */}
      {tool.requiresLegalDisclaimer && (
        <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-4 py-2.5">
          <div className="max-w-3xl mx-auto flex items-center gap-2.5 flex-wrap">
            <AlertTriangle className="size-4 text-red-700 flex-shrink-0" />
            <span className="text-sm text-red-800">
              This tool provides information only. It cannot provide legal advice or represent you in any proceeding.
            </span>
          </div>
        </div>
      )}

      {/* Header — Pattern A compact */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/student-services"
            className="flex items-center gap-1.5 text-gray-400 hover:text-[#0033A0] text-sm font-medium transition-colors flex-shrink-0"
          >
            <ArrowLeft className="size-4" />
            <LifeBuoy className="size-3.5" />
            <span className="hidden sm:inline">Student Services</span>
          </Link>
          <span className="text-gray-300 text-xs">·</span>
          <div className="size-7 rounded-lg bg-[#0033A0]/10 flex items-center justify-center flex-shrink-0">
            <ServiceIcon tool={tool} className="size-4 text-[#0033A0]" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 text-sm truncate">{tool.title}</div>
            <div className="text-gray-500 text-xs truncate">{tool.subtitle}</div>
          </div>
        </div>
      </div>

      {/* Petition confirmed banner */}
      {petitionId && (
        <div className="flex-shrink-0 bg-green-50 border-b border-green-200 px-4 py-2.5">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <CheckCircle className="size-4 text-green-600 flex-shrink-0" />
            <span className="text-sm text-green-800">
              <span className="font-semibold">Your petition draft has been saved.</span>{' '}
              Petition ID: <span className="font-mono text-xs">{petitionId}</span>
              {' '}— the relevant office will receive this when you confirm.
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
        {messages.map(msg => {
          const isStreaming = msg.id === streamingMsgId
          const sourcesMatch =
            !isStreaming && msg.role === 'assistant' && tool.showCitationsInline
              ? SOURCES_BLOCK_RE.exec(msg.content)
              : null
          const sourcesBlock = sourcesMatch ? sourcesMatch[1] : null
          const displayContent = sourcesBlock
            ? msg.content.replace(SOURCES_BLOCK_RE, '').trim()
            : msg.content

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`size-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  msg.role === 'user' ? 'bg-gray-200' : 'bg-[#0033A0]'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="size-4 text-gray-600" />
                ) : (
                  <Bot className="size-4 text-white" />
                )}
              </div>
              <div className="flex flex-col max-w-[85%]">
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-[#0033A0] text-white rounded-tr-sm'
                      : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
                  }`}
                >
                  {msg.content === '' && msg.role === 'assistant' ? (
                    <div className="flex items-center gap-1.5">
                      {[0, 150, 300].map(d => (
                        <span
                          key={d}
                          className="size-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${d}ms` }}
                        />
                      ))}
                    </div>
                  ) : msg.role === 'assistant' ? (
                    <DynamicMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        ul: ({ children }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        code: ({ children }) => (
                          <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono">
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {displayContent}
                    </DynamicMarkdown>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>

                {/* Citation list — only for completed assistant messages with showCitationsInline */}
                {tool.showCitationsInline && sourcesBlock && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Sources</p>
                    <ul className="space-y-0.5">
                      {parseSourcesList(sourcesBlock).map((src, i) => (
                        <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                          <ExternalLink className="size-3 shrink-0 mt-0.5 text-gray-400" />
                          <span>{src}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Escalation footer — sticky */}
      {tool.escalationEmail && (
        <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-2 flex items-center gap-2">
          <Mail className="size-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500">
            Need to speak with someone directly?{' '}
            <a
              href={`mailto:${tool.escalationEmail}`}
              className="text-[#0033A0] font-medium hover:underline"
            >
              {tool.escalationEmail}
            </a>
          </span>
        </div>
      )}

      {/* Privacy note */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-1 flex items-center gap-1.5">
        <span className="text-[10px] text-gray-400">
          UKY Protected Environment · AI guidance only — not a substitute for official advising
        </span>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            disabled={loading}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50 overflow-hidden"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
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
  )
}
