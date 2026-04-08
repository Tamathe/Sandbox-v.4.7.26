'use client'

import { BuilderSpec } from '../lib/types'
import { Bot, Scale, HelpCircle, Mic, MessagesSquare, CheckCircle2 } from 'lucide-react'

const TYPE_META: Record<string, { label: string; color: string; icon: React.ReactNode; desc: string }> = {
  CHATBOT: {
    label: 'AI Tutor',
    color: 'bg-blue-100 text-blue-700',
    icon: <Bot className="w-4 h-4" />,
    desc: 'Conversational AI assistant',
  },
  SIMULATION: {
    label: 'Simulation',
    color: 'bg-purple-100 text-purple-700',
    icon: <MessagesSquare className="w-4 h-4" />,
    desc: 'Immersive role-play experience',
  },
  QUIZ: {
    label: 'Quiz',
    color: 'bg-green-100 text-green-700',
    icon: <HelpCircle className="w-4 h-4" />,
    desc: 'Adaptive AI assessment',
  },
  AI_INTERVIEW: {
    label: 'AI Interview',
    color: 'bg-yellow-100 text-yellow-700',
    icon: <Mic className="w-4 h-4" />,
    desc: 'Structured expert dialogue',
  },
  DEBATE: {
    label: 'Debate',
    color: 'bg-red-100 text-red-700',
    icon: <Scale className="w-4 h-4" />,
    desc: 'Opposing perspectives in dialogue',
  },
}

interface PreviewPanelProps {
  spec: BuilderSpec
}

export default function PreviewPanel({ spec }: PreviewPanelProps) {
  const meta = TYPE_META[spec.toolType] || TYPE_META.CHATBOT
  const hasContent = !!(spec.name || spec.shortDescription)

  if (!hasContent) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center px-8 max-w-sm">
          <div className="w-20 h-20 bg-gradient-to-br from-[#0033A0] to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-gray-800 font-semibold text-lg mb-2">Your Tool Preview</h3>
          <p className="text-gray-400 text-sm">As you describe your idea, a live preview will appear here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-md mx-auto space-y-4">
        {/* Tool card preview */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="bg-gradient-to-br from-[#0033A0] to-purple-700 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white text-base leading-tight">
                  {spec.name || 'Your Tool Name'}
                </h3>
                <p className="text-blue-200 text-xs mt-0.5">
                  {spec.shortDescription || 'Short description will appear here'}
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 space-y-3">
            {/* Type + category badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color}`}>
                {meta.icon}
                {meta.label}
              </span>
              {spec.category && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  {spec.category}
                </span>
              )}
              {spec.difficultyLevel && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  {spec.difficultyLevel}
                </span>
              )}
            </div>

            {/* Description */}
            {spec.fullDescription && (
              <p className="text-gray-700 text-sm leading-relaxed">{spec.fullDescription}</p>
            )}

            {/* Persona (for simulations) */}
            {spec.persona?.name && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5">
                <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">Simulating</div>
                <div className="font-semibold text-gray-800 text-sm">{spec.persona.name}</div>
                {spec.persona.role && <div className="text-gray-500 text-xs">{spec.persona.role}</div>}
              </div>
            )}

            {/* Welcome message */}
            {spec.welcomeMessage && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Welcome Message</div>
                <p className="text-gray-700 text-sm italic">&ldquo;{spec.welcomeMessage}&rdquo;</p>
              </div>
            )}

            {/* Starter questions */}
            {spec.starterQuestions?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Starter Questions</div>
                <div className="space-y-1.5">
                  {spec.starterQuestions.slice(0, 3).map((q, i) => (
                    <div key={i} className="text-xs text-[#0033A0] bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                      {q}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Learning objectives */}
            {spec.learningObjectives?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Learning Objectives</div>
                <div className="space-y-1">
                  {spec.learningObjectives.map((obj, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{obj}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audience */}
            {spec.intendedAudience && (
              <div className="text-xs text-gray-500">
                <span className="font-semibold text-gray-600">For: </span>
                {spec.intendedAudience}
              </div>
            )}
          </div>
        </div>

        {/* Ready indicator */}
        {spec.ready && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-green-800">Ready to build!</div>
              <div className="text-xs text-green-600">Click &ldquo;Build This Tool&rdquo; in the chat to deploy.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
