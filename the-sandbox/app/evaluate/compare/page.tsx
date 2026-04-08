'use client'

import Link from 'next/link'
import {
  FileText, Clock, BarChart3, Brain, MessageSquare,
  Zap, Bot, TrendingUp, Sparkles, Target,
  ArrowRight, ArrowLeft, X, Check,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

const COMPARISONS = [
  {
    without: { icon: FileText, title: 'Static PDF syllabus', description: 'Students receive a flat document with no interactivity, no feedback loop, and no way to test understanding.' },
    with: { icon: Zap, title: 'AI-generated interactive tools', description: 'Faculty describe a learning experience in plain language. The platform builds a fully functional AI tool in minutes.' },
  },
  {
    without: { icon: Clock, title: 'Manual office hours scheduling', description: 'Students wait for a 15-minute slot days away. Questions go unanswered when they matter most.' },
    with: { icon: Bot, title: 'Sandy concierge available 24/7', description: 'An AI assistant on every page — context-aware, page-aware, and always ready to help students and faculty.' },
  },
  {
    without: { icon: BarChart3, title: 'End-of-semester evaluations only', description: 'Faculty learn what went wrong after grades are submitted. No chance to course-correct mid-semester.' },
    with: { icon: TrendingUp, title: 'Real-time analytics dashboards', description: 'Every student interaction generates measurable learning signals. At-risk students are flagged before it\'s too late.' },
  },
  {
    without: { icon: X, title: 'No real-time learning signals', description: 'Engagement is invisible until exam day. Faculty teach blind, students struggle in silence.' },
    with: { icon: Sparkles, title: 'Adaptive, personalized learning paths', description: 'AI tracks mastery across concepts and recommends the next best activity for each student.' },
  },
  {
    without: { icon: Brain, title: 'One-size-fits-all content', description: 'The same material, the same pace, the same experience for every student regardless of background or ability.' },
    with: { icon: Target, title: 'Instant feedback and mastery tracking', description: 'Students get immediate, actionable feedback. Faculty see who\'s mastered what — down to the concept level.' },
  },
]

export default function EvaluatorComparePage() {
  const { evaluatorMode } = useAuth()

  const ctaHref = evaluatorMode ? '/build?evaluator=true' : '/evaluate'
  const ctaLabel = evaluatorMode ? 'Build your first AI tool' : 'Experience it yourself'

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
      {/* Header */}
      <div>
        <Link
          href="/evaluate/summary"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-4"
        >
          <ArrowLeft className="size-4" />
          Back to summary
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-900">
          Education Without vs. With University of Kentucky
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          See how AI transforms every layer of the teaching and learning experience.
        </p>
      </div>

      {/* Column headers (desktop) */}
      <div className="hidden md:grid md:grid-cols-2 gap-6">
        <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5">
          <X className="size-4 text-gray-400" />
          <span className="text-sm font-bold text-gray-600">Without University of Kentucky</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5">
          <Check className="size-4 text-[#0033A0]" />
          <span className="text-sm font-bold text-[#0033A0]">With University of Kentucky</span>
        </div>
      </div>

      {/* Comparison rows */}
      <div className="space-y-6">
        {COMPARISONS.map((row, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Without */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-5 flex gap-4">
              <div className="size-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <row.without.icon className="size-5 text-gray-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-700">{row.without.title}</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{row.without.description}</p>
              </div>
            </div>

            {/* With */}
            <div className="rounded-2xl border-2 border-[#0033A0]/20 bg-blue-50/50 p-5 flex gap-4">
              <div className="size-10 rounded-xl bg-[#0033A0]/10 flex items-center justify-center shrink-0">
                <row.with.icon className="size-5 text-[#0033A0]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{row.with.title}</h3>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{row.with.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex justify-center pt-2">
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-8 py-3.5 text-sm font-bold text-white shadow transition hover:bg-[#002880]"
        >
          {ctaLabel}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}
