'use client'

import Link from 'next/link'
import { ArrowRight, Compass } from 'lucide-react'
import { CAMPUS_TOOLS } from '../lib/campus-navigator'

export default function CampusNavigatorPage() {
  return (
    <div>
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #001f6b 0%, #0033A0 50%, #1a56d6 100%)' }}
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
          <div className="inline-flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-4 py-1.5 text-sm font-medium text-blue-100 mb-4">
            <Compass className="w-4 h-4" />
            <span>Campus Navigator</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 leading-tight">
            Navigate UK<br />
            <span className="text-blue-200">with confidence.</span>
          </h1>
          <p className="text-blue-100 text-lg max-w-xl leading-relaxed">
            AI-powered tools to help you plan your courses, understand your degree, prep for advising, and find scholarship money — all in one place.
          </p>
        </div>
      </div>

      {/* Tools grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {CAMPUS_TOOLS.map(tool => {
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
                      href={`/campus-navigator/${tool.slug}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#0033A0] hover:bg-[#002580] text-white text-sm font-semibold transition-colors"
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
          Campus Navigator is an AI-powered guide — always verify important decisions with your academic advisor, the UK Registrar, and official university sources.
        </p>
      </div>
    </div>
  )
}
