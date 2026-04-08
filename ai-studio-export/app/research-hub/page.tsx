'use client'

import Link from 'next/link'
import { ArrowRight, FlaskConical } from 'lucide-react'
import { RESEARCH_TOOLS } from '../lib/research-hub'

export default function ResearchHubPage() {
  return (
    <div>
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a3a1a 0%, #1e5c1e 50%, #2d8c2d 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 50%, white 1px, transparent 1px), radial-gradient(circle at 85% 20%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="inline-flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-4 py-1.5 text-sm font-medium text-green-100 mb-4">
            <FlaskConical className="w-4 h-4" />
            <span>Research Hub</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 leading-tight">
            Research smarter,<br />
            <span className="text-green-200">publish stronger.</span>
          </h1>
          <p className="text-green-100 text-lg max-w-xl leading-relaxed">
            AI-powered tools for faculty and graduate researchers — literature search strategy, grant writing, methodology critique, and citation style guidance. Powered by Claude Sonnet.
          </p>
        </div>
      </div>

      {/* Tools grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-sm text-gray-500 mb-6 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 text-xs font-semibold">
            🎓 Faculty &amp; Graduate Researchers
          </span>
          <span>Designed for advanced research workflows.</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {RESEARCH_TOOLS.map(tool => {
            const isLive = tool.status === 'live'

            return (
              <div
                key={tool.slug}
                className={`relative bg-white rounded-2xl border-2 overflow-hidden transition-all ${
                  isLive
                    ? `${tool.border} hover:shadow-lg hover:-translate-y-0.5`
                    : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-4xl">{tool.emoji}</span>
                    {tool.status === 'coming-soon' && (
                      <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Coming Soon
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-bold text-gray-900 mb-1">{tool.title}</h2>
                  <p className={`text-sm font-semibold mb-3 ${tool.color}`}>{tool.tagline}</p>
                  <p className="text-sm text-gray-500 leading-relaxed mb-5">{tool.description}</p>

                  {/* Starter questions preview */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {tool.starterQuestions.slice(0, 2).map((q, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2.5 py-1 rounded-full border ${tool.bg} ${tool.color} border-current opacity-70 font-medium`}
                      >
                        {q}
                      </span>
                    ))}
                  </div>

                  {isLive ? (
                    <Link
                      href={`/research-hub/${tool.slug}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#1e5c1e] hover:bg-[#174f17] text-white text-sm font-semibold transition-colors"
                    >
                      Open
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <div className="w-full py-2.5 rounded-xl bg-gray-100 text-center text-sm font-medium text-gray-400">
                      Coming Soon
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-400 mt-10 max-w-xl mx-auto leading-relaxed">
          Research Hub provides AI-powered guidance — always verify citations, methodology choices, and grant requirements with authoritative sources. Consult UK Libraries and the Office of Sponsored Programs for official support.
        </p>
      </div>
    </div>
  )
}
