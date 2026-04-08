'use client'

import { useState } from 'react'
import { Download, ExternalLink, User, Pencil, Lightbulb, Users, Briefcase, ChevronDown } from 'lucide-react'

const LEVELS = [
  {
    level: 0,
    role: 'Sole Author',
    label: 'No AI',
    icon: User,
    color: 'bg-slate-100 border-slate-300 text-slate-800',
    activeColor: 'bg-slate-800 text-white border-slate-800',
    badge: 'bg-slate-200 text-slate-700',
    activeBadge: 'bg-slate-700 text-white',
    dot: 'bg-slate-400',
    activeDot: 'bg-white',
    description:
      'Students complete all steps independently. No generative AI at any stage.',
    whenToUse:
      'The learning objective requires demonstrating mastery of a skill AI would bypass entirely.',
    examples: [
      'In-class essays testing writing fluency',
      'Math problem sets testing computation',
      'Language exams testing proficiency',
      'Lab practical exams',
    ],
    syllabus:
      'No generative AI tools may be used at any stage of this assignment. All work must be entirely your own.',
  },
  {
    level: 1,
    role: 'Primary Creator',
    label: 'Surface editing only',
    icon: Pencil,
    color: 'bg-amber-50 border-amber-300 text-amber-900',
    activeColor: 'bg-amber-600 text-white border-amber-600',
    badge: 'bg-amber-100 text-amber-700',
    activeBadge: 'bg-amber-500 text-white',
    dot: 'bg-amber-400',
    activeDot: 'bg-white',
    description:
      'Students generate all core ideas, content, and structure. AI may only assist with proofreading and minor clarity edits.',
    whenToUse:
      'You want students to do the thinking but allow basic polish — grammar, spelling, minor phrasing.',
    examples: [
      'Proofreading a finished draft for grammar',
      'Spell-checking a lab report',
      'Minor clarity edits on a completed essay',
    ],
    syllabus:
      'You may use AI tools only for proofreading and minor grammatical corrections after you have completed your own draft. AI may not generate ideas, structure, or content.',
  },
  {
    level: 2,
    role: 'Conceptual Architect',
    label: 'Thought partner',
    icon: Lightbulb,
    color: 'bg-sky-50 border-sky-300 text-sky-900',
    activeColor: 'bg-sky-600 text-white border-sky-600',
    badge: 'bg-sky-100 text-sky-700',
    activeBadge: 'bg-sky-500 text-white',
    dot: 'bg-sky-400',
    activeDot: 'bg-white',
    description:
      'Students drive conceptualization. AI serves as a brainstorming partner, but students make all decisions about what to keep or discard.',
    whenToUse:
      'You want students to own the direction but benefit from AI as a sounding board during ideation.',
    examples: [
      'Brainstorming paper topics',
      'Generating research question options to choose from',
      'Troubleshooting student-authored code',
      'Exploring counterarguments before writing',
    ],
    syllabus:
      'You may use AI as a brainstorming partner to explore ideas, but all final decisions about content, structure, and argument must be your own. Document any AI interactions in your process notes.',
  },
  {
    level: 3,
    role: 'Critical Collaborator',
    label: 'Co-creator',
    icon: Users,
    color: 'bg-indigo-50 border-indigo-300 text-indigo-900',
    activeColor: 'bg-indigo-600 text-white border-indigo-600',
    badge: 'bg-indigo-100 text-indigo-700',
    activeBadge: 'bg-indigo-500 text-white',
    dot: 'bg-indigo-400',
    activeDot: 'bg-white',
    description:
      'AI serves as a co-creator for substantial content segments. Students revise, fact-check, and integrate AI-generated material with their own analysis.',
    whenToUse:
      'The skill being assessed is revision, verification, and critical integration — not raw generation.',
    examples: [
      'Drafting paragraphs the student then substantially rewrites',
      'Generating a first-pass literature summary to verify and extend',
      'Creating code scaffolding the student modifies and debugs',
    ],
    syllabus:
      'You may use AI to generate draft content for specific sections. You are responsible for substantially revising, verifying, and integrating all AI-generated material. Submit an AI use log describing what was generated and how you modified it.',
  },
  {
    level: 4,
    role: 'Project Manager',
    label: 'Extensive AI use',
    icon: Briefcase,
    color: 'bg-emerald-50 border-emerald-300 text-emerald-900',
    activeColor: 'bg-emerald-600 text-white border-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
    activeBadge: 'bg-emerald-500 text-white',
    dot: 'bg-emerald-400',
    activeDot: 'bg-white',
    description:
      'Students leverage AI extensively. Value-add is in problem definition, evaluation of outputs, curation, and strategic integration.',
    whenToUse:
      'The skill being assessed is strategic thinking, synthesis, and evaluation — the student orchestrates AI as a tool.',
    examples: [
      'Using AI to generate and evaluate many solutions to an ill-defined problem',
      'Synthesizing multiple AI outputs into a coherent strategy',
      'Rapid prototyping then selecting and refining the best approach',
    ],
    syllabus:
      'You are expected to use AI tools strategically throughout this project. Your grade reflects problem definition, critical evaluation of AI outputs, and the quality of your final synthesis — not whether you wrote every word. Submit a detailed AI use log.',
  },
]

export default function AIUseScaleVisual() {
  const [activeLevel, setActiveLevel] = useState<number | null>(null)
  const [copiedLevel, setCopiedLevel] = useState<number | null>(null)

  const handleCopySyllabus = (level: number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedLevel(level)
      setTimeout(() => setCopiedLevel(null), 2000)
    })
  }

  const active = activeLevel !== null ? LEVELS[activeLevel] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-gray-900 text-lg">CELT Student AI Use Scale</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Developed by UK&apos;s Center for the Enhancement of Learning &amp; Teaching
          </p>
        </div>
        <a
          href="https://celt.uky.edu/student-ai-use-scale"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0033A0] hover:underline shrink-0"
        >
          <ExternalLink className="size-3.5" />
          View on CELT website
        </a>
      </div>

      {/* Interactive Scale Bar */}
      <div className="relative">
        {/* Progress track */}
        <div className="hidden sm:flex items-center justify-between relative">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 bg-gray-200 rounded-full" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-gradient-to-r from-slate-400 via-sky-400 to-emerald-400 rounded-full"
            style={{ width: activeLevel !== null ? `${(activeLevel / 4) * 100}%` : '0%', transition: 'width 0.3s ease' }}
          />
          {LEVELS.map((l) => (
            <button
              key={l.level}
              onClick={() => setActiveLevel(activeLevel === l.level ? null : l.level)}
              className="relative z-10 flex flex-col items-center gap-2 group"
            >
              <div className={`size-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                activeLevel === l.level ? l.activeColor : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
              } ${activeLevel === l.level ? 'scale-110 shadow-lg' : 'hover:scale-105'}`}>
                <l.icon className="size-5" />
              </div>
              <div className="text-center">
                <div className={`text-xs font-bold ${activeLevel === l.level ? 'text-gray-900' : 'text-gray-500'}`}>
                  Level {l.level}
                </div>
                <div className={`text-[10px] leading-tight max-w-[80px] ${activeLevel === l.level ? 'text-gray-700' : 'text-gray-400'}`}>
                  {l.role}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Mobile: vertical list */}
        <div className="sm:hidden space-y-2">
          {LEVELS.map((l) => (
            <button
              key={l.level}
              onClick={() => setActiveLevel(activeLevel === l.level ? null : l.level)}
              className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                activeLevel === l.level ? l.activeColor : l.color
              }`}
            >
              <l.icon className="size-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold">Level {l.level}</span>
                <span className="text-sm opacity-80 ml-1.5">— {l.role}</span>
              </div>
              <ChevronDown className={`size-4 shrink-0 transition-transform ${activeLevel === l.level ? 'rotate-180' : ''}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Expanded Detail Card */}
      {active && (
        <div className={`rounded-2xl border-2 p-5 space-y-4 transition-all ${active.color}`}>
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-full flex items-center justify-center ${active.activeColor}`}>
              <active.icon className="size-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-base">
                Level {active.level}: Student as {active.role}
              </h4>
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${active.badge}`}>
                {active.label}
              </span>
            </div>
          </div>

          <p className="text-sm leading-relaxed">{active.description}</p>

          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1.5">When to use</h5>
            <p className="text-sm leading-relaxed">{active.whenToUse}</p>
          </div>

          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1.5">Examples</h5>
            <ul className="space-y-1">
              {active.examples.map((ex, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className={`mt-1.5 size-1.5 rounded-full shrink-0 ${activeLevel !== null ? LEVELS[activeLevel].activeDot : 'bg-gray-400'}`} />
                  {ex}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-white/60 border border-black/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-bold uppercase tracking-wider opacity-70">Sample syllabus language</h5>
              <button
                onClick={() => handleCopySyllabus(active.level, active.syllabus)}
                className="text-xs font-semibold text-[#0033A0] hover:underline"
              >
                {copiedLevel === active.level ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-sm leading-relaxed italic">&ldquo;{active.syllabus}&rdquo;</p>
          </div>
        </div>
      )}

      {/* Prompt to select */}
      {!active && (
        <div className="text-center py-4 text-sm text-gray-400">
          Select a level above to see details, examples, and sample syllabus language
        </div>
      )}

      {/* PDF Downloads */}
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href="/tools/ai-use-scale/student-ai-use-scale.pdf"
          download
          className="flex-1 flex items-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:border-[#0033A0] hover:text-[#0033A0]"
        >
          <Download className="size-4 shrink-0" />
          <div>
            <div>AI Use Scale — Faculty Guide</div>
            <div className="text-xs font-normal text-gray-400">PDF from CELT</div>
          </div>
        </a>
        <a
          href="/tools/ai-use-scale/student-resource-ai-use-levels.pdf"
          download
          className="flex-1 flex items-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:border-[#0033A0] hover:text-[#0033A0]"
        >
          <Download className="size-4 shrink-0" />
          <div>
            <div>When Can I Use GAI? — Student Handout</div>
            <div className="text-xs font-normal text-gray-400">PDF from CELT</div>
          </div>
        </a>
      </div>
    </div>
  )
}
