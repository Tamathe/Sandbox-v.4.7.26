'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ArrowRight, Lightbulb, ChevronRight } from 'lucide-react'
import { TOOL_TYPES, EXAMPLES } from './BuilderChatPanel'

type MadLibPart =
  | { type: 'text'; value: string }
  | { type: 'input'; placeholder: string; key: string }

type MadLibTemplate = {
  id: string
  label: string
  parts: MadLibPart[]
}

const MAD_LIBS_TEMPLATES: MadLibTemplate[] = [
  {
    id: 'socratic',
    label: 'Socratic Tutor',
    parts: [
      { type: 'text', value: 'Create a Socratic tutor for ' },
      { type: 'input', placeholder: 'e.g. Cell Biology', key: 'topic' },
      { type: 'text', value: ' that guides students to understand ' },
      { type: 'input', placeholder: 'e.g. mitosis vs meiosis', key: 'concept' },
      { type: 'text', value: ' without giving away the answer.' },
    ],
  },
  {
    id: 'debate',
    label: 'Debate Partner',
    parts: [
      { type: 'text', value: 'Create a debate partner that argues against ' },
      { type: 'input', placeholder: 'e.g. mandatory internships', key: 'topic' },
      { type: 'text', value: ' from the perspective of ' },
      { type: 'input', placeholder: 'e.g. a skeptical employer', key: 'persona' },
      { type: 'text', value: '.' },
    ],
  },
  {
    id: 'quiz',
    label: 'Quiz Generator',
    parts: [
      { type: 'text', value: 'Build a quiz bot that generates ' },
      { type: 'input', placeholder: 'e.g. 5', key: 'count' },
      { type: 'text', value: ' multiple-choice questions on ' },
      { type: 'input', placeholder: 'e.g. the French Revolution', key: 'topic' },
      { type: 'text', value: ' and explains wrong answers.' },
    ],
  },
]

function composeMadLibPrompt(template: MadLibTemplate, values: Record<string, string>) {
  return template.parts
    .map((part) => (part.type === 'text' ? part.value : (values[part.key] ?? '').trim()))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function BuildHubHero() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [madLibValues, setMadLibValues] = useState<Record<string, Record<string, string>>>({})

  const handleBuild = (promptOverride?: string) => {
    const promptToUse = promptOverride || input
    if (!promptToUse.trim()) return
    
    // Encode the prompt and navigate to the actual builder
    router.push(`/builder?prompt=${encodeURIComponent(promptToUse)}`)
  }

  const updateMadLibValue = (templateId: string, key: string, value: string) => {
    setMadLibValues((previous) => ({
      ...previous,
      [templateId]: {
        ...(previous[templateId] ?? {}),
        [key]: value,
      },
    }))
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-12">
      
      {/* Hero Input Section */}
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
            What do you want to teach?
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Describe a tool, simulation, or tutor. The AI will build it for you in seconds.
          </p>
        </div>

        <div className={`
          relative group bg-white rounded-2xl shadow-xl transition-all duration-300 border-2
          ${isFocused ? 'border-[#0033A0] ring-4 ring-blue-50 transform -translate-y-1' : 'border-transparent'}
        `}>
          <div className="absolute top-4 left-4">
            <div className="w-8 h-8 bg-gradient-to-br from-[#0033A0] to-purple-700 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleBuild()
              }
            }}
            placeholder="e.g., 'I want a simulation where students play a detective in a noir novel to learn about inductive reasoning...'"
            className="w-full min-h-[140px] p-6 pl-16 text-lg rounded-2xl resize-none focus:outline-none placeholder-gray-400 text-gray-800"
          />

          <div className="absolute bottom-4 right-4 flex items-center gap-3">
            <span className="text-xs text-gray-400 font-medium hidden sm:inline-block">
              Press Enter to build
            </span>
            <button
              onClick={() => handleBuild()}
              disabled={!input.trim()}
              className="bg-[#0033A0] hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              Build Tool
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3 mb-4 justify-center">
          {[
            'Cross-exam simulator for 2L Evidence students',
            'Organic chemistry tutor for pre-med students',
            'Case analysis coach for MBA strategy',
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setInput(suggestion)
                handleBuild(suggestion)
              }}
              className="text-xs bg-[#0033A0]/10 text-[#0033A0] border border-[#0033A0]/20 rounded-full px-3 py-1 hover:bg-[#0033A0]/15 transition-colors cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            Start from a template
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {MAD_LIBS_TEMPLATES.map((template) => {
            const values = madLibValues[template.id] ?? {}
            const composedPrompt = composeMadLibPrompt(template, values)
            const isComplete = template.parts.every(
              (part) => part.type === 'text' || (values[part.key] ?? '').trim()
            )

            return (
              <div
                key={template.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 inline-flex rounded-full bg-[#0033A0]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0033A0]">
                  {template.label}
                </div>
                <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm leading-relaxed text-gray-700">
                  {template.parts.map((part, index) =>
                    part.type === 'text' ? (
                      <span key={`${template.id}-${index}`}>{part.value}</span>
                    ) : (
                      <input
                        key={`${template.id}-${part.key}`}
                        value={values[part.key] ?? ''}
                        onChange={(event) => updateMadLibValue(template.id, part.key, event.target.value)}
                        placeholder={part.placeholder}
                        className="min-w-[120px] rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-sm text-[#0033A0] outline-none placeholder:text-blue-300 focus:border-[#0033A0]"
                        style={{
                          width: `${Math.max(120, ((values[part.key] || part.placeholder).length * 7) + 28)}px`,
                        }}
                      />
                    )
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleBuild(composedPrompt)}
                  disabled={!isComplete}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Build this <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Support Section: Scaffolding & Templates */}
      <div className="grid md:grid-cols-12 gap-8 pt-8">
        
        {/* Quick Start Templates */}
        <div className="md:col-span-7 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              Not sure where to start?
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TOOL_TYPES.map((tool, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(tool.prompt)
                  setIsFocused(true)
                }}
                className="text-left bg-white p-4 rounded-xl border border-gray-200 hover:border-[#0033A0] hover:shadow-md transition-all group h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tool.color}`}>
                    {tool.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#0033A0] transition-colors" />
                </div>
                <p className="text-xs text-gray-500 line-clamp-3">
                  {tool.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Inspiration / Examples */}
        <div className="md:col-span-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              See what's possible
            </h3>
          </div>

          <div className="space-y-3">
            {EXAMPLES.slice(0, 3).map((ex, i) => (
              <div 
                key={i}
                onClick={() => handleBuild(ex.prompt)}
                className="group cursor-pointer bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-gray-800 group-hover:text-purple-700 transition-colors">
                    {ex.title}
                  </span>
                </div>
                <p className="text-xs text-gray-500 italic mb-2">
                  "{ex.description}"
                </p>
                <span className="text-[10px] text-[#0033A0] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  Try this prompt <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            ))}
            
            <button 
              onClick={() => router.push('/tools')}
              className="w-full py-2 text-xs font-medium text-center text-gray-400 hover:text-[#0033A0] transition-colors"
            >
              Browse the full marketplace →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
