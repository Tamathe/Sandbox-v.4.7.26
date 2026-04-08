'use client'

import { useState } from 'react'
import { ArrowLeft, Heart, ChevronRight, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import PageHeader from '../../../components/PageHeader'
import PathwayNav from '../../../components/ai-literacy/PathwayNav'

interface DisciplineReflection {
  id: string
  prompt: string
  context: string
  placeholder: string
}

const REFLECTIONS: DisciplineReflection[] = [
  {
    id: 'core-values',
    prompt: 'What does your discipline uniquely value in student work?',
    context: 'Think beyond "original thinking" — every discipline says that. What is specific to YOUR field? For a historian, it might be hermeneutics and source criticism. For a creative writer, it might be authentic voice. For a philosopher, it might be the quality of argumentation.',
    placeholder: 'In my discipline, we value...',
  },
  {
    id: 'ai-cannot',
    prompt: 'What can AI NOT do in your field?',
    context: 'AI can generate text, solve equations, and summarize sources. But what requires human judgment that AI lacks? Physical lab work? Ethical deliberation? Aesthetic sensibility? Clinical intuition? Close reading of ambiguous texts?',
    placeholder: 'AI cannot...',
  },
  {
    id: 'why-matters',
    prompt: 'Why does learning to do this WITHOUT AI matter?',
    context: 'This is the question your students will ask. "Why can\'t I just use AI?" Your answer should connect to the deeper purpose of your discipline, not just "because it\'s the rules."',
    placeholder: 'It matters because...',
  },
  {
    id: 'what-changes',
    prompt: 'What SHOULD change in your teaching because of AI?',
    context: 'Even if your stance is Prohibit, AI has changed the landscape. Are there assignments that no longer test what they used to test? Skills that are now more important than before? Assessment formats that need updating?',
    placeholder: 'What should change is...',
  },
  {
    id: 'commitment',
    prompt: 'Write your discipline\'s commitment statement.',
    context: 'A humanities department wrote: "We remain committed to the core principles of hermeneutics, empathy, and argument-based narrative. Our work must always be grounded in verifiable, traceable evidence." What would yours say?',
    placeholder: 'Our discipline is committed to...',
  },
]

const PEER_VOICES = [
  {
    quote: 'As a profession, historians have long embraced new technologies and perspectives as we continually reflect on and revise the way we study the past. In some cases, this means making use of AI in research and teaching. In others, it means privileging pedagogical methods designed to provoke deep engagement with texts.',
    discipline: 'History',
    source: 'DUS Survey respondent',
  },
  {
    quote: 'English professors, and the humanities in general, are in crisis about AI. We feel there is little to no institutional support for teaching students that AI-generated ideas and content is not the same as thinking and writing for themselves.',
    discipline: 'English',
    source: 'DUS Survey respondent',
  },
  {
    quote: 'We are committed to helping students learn to think and communicate in sophisticated ways on their own. We are incorporating AI very selectively into our teaching.',
    discipline: 'Humanities (general)',
    source: 'DUS Survey respondent',
  },
  {
    quote: 'Our advisory board was quite clear that graduates are expected to use these tools and use them well.',
    discipline: 'Professional program',
    source: 'DUS Survey respondent',
  },
  {
    quote: 'Assignments seem pointless, tedious — instructors need to be much more creative in how they educate and understand that the same old methods often were not great to begin with.',
    discipline: 'Not specified',
    source: 'DUS Survey respondent',
  },
]

export default function DisciplineIdentityPage() {
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [copiedStatement, setCopiedStatement] = useState(false)

  function updateResponse(id: string, value: string) {
    setResponses(prev => ({ ...prev, [id]: value }))
  }

  const statementText = responses['commitment'] ?? ''

  async function copyStatement() {
    if (!statementText) return
    await navigator.clipboard.writeText(statementText)
    setCopiedStatement(true)
    setTimeout(() => setCopiedStatement(false), 2000)
  }

  return (
    <>
      <PageHeader
        title="Discipline Identity Workshop"
        subtitle="Articulate what your discipline uniquely values — and how AI fits (or doesn't)"
        action={
          <Link href="/ai-literacy" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="size-4" />
            AI Literacy Hub
          </Link>
        }
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Empathetic intro — concise */}
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-700">
            A space to think clearly about what your discipline values and why that still matters — regardless of where you stand on AI.
          </p>
        </div>

        {/* Guided reflections */}
        <div className="space-y-6">
          <h2 className="text-lg font-extrabold text-gray-900">Guided Reflection</h2>
          {REFLECTIONS.map((r, i) => (
            <div key={r.id} className="border rounded-2xl shadow-sm p-5 bg-white">
              <div className="flex items-start gap-3">
                <div className="size-7 rounded-full bg-[#0033A0] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900">{r.prompt}</h3>
                  <p className="text-xs text-gray-500 mt-1">{r.context}</p>
                  <textarea
                    value={responses[r.id] ?? ''}
                    onChange={e => updateResponse(r.id, e.target.value)}
                    placeholder={r.placeholder}
                    rows={3}
                    className="w-full mt-3 p-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent resize-y"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Copy commitment statement */}
        {statementText && (
          <div className="border rounded-2xl shadow-sm p-5 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-800">Your Discipline Commitment Statement</h3>
              <button onClick={copyStatement} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                {copiedStatement ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copiedStatement ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-sm text-blue-700 italic">&ldquo;{statementText}&rdquo;</p>
          </div>
        )}

        {/* Peer voices */}
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-gray-900">Peer Voices</h2>
          <p className="text-sm text-gray-600">What other faculty at UK are saying — from the DUS survey.</p>
          {PEER_VOICES.map((v, i) => (
            <div key={i} className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-sm text-gray-700 italic">&ldquo;{v.quote}&rdquo;</p>
              <p className="text-xs text-gray-400 mt-2">{v.discipline} — {v.source}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <PathwayNav />
      </div>
    </>
  )
}
