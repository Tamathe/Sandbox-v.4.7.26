'use client'

import Link from 'next/link'
import { ArrowLeft, Lightbulb, Shield, TrendingUp, FileSearch, Rocket, ArrowRight } from 'lucide-react'

const TOOLS = [
  {
    slug: 'idea-to-launch',
    title: 'Idea to Launch',
    description:
      'Walk through the complete journey from initial spark to IP protection and action plan. Sandy guides you through 6 phases: idea validation, IP landscape, market sizing, protection strategy, pitch building, and next steps.',
    icon: Rocket,
    gradient: 'from-amber-500 to-orange-600',
    phases: ['The Spark', 'IP Landscape', 'Market Validation', 'Protection Strategy', 'Pitch Builder', 'Action Plan'],
    ready: true,
  },
  {
    slug: 'patent-primer',
    title: 'Patent Primer',
    description:
      'Understand the basics of patent law, prior art searches, and provisional filing. Designed for researchers and students with no legal background.',
    icon: Shield,
    gradient: 'from-blue-500 to-indigo-600',
    phases: [],
    ready: false,
  },
  {
    slug: 'market-sizer',
    title: 'Market Sizer',
    description:
      'Estimate your Total Addressable Market (TAM), Serviceable Available Market (SAM), and Serviceable Obtainable Market (SOM) with Sandy\'s guidance.',
    icon: TrendingUp,
    gradient: 'from-emerald-500 to-teal-600',
    phases: [],
    ready: false,
  },
  {
    slug: 'prior-art-scout',
    title: 'Prior Art Scout',
    description:
      'Upload your invention disclosure and get an AI-powered prior art analysis covering patents, academic papers, and existing products.',
    icon: FileSearch,
    gradient: 'from-purple-500 to-violet-600',
    phases: [],
    ready: false,
  },
]

export default function InnovationLabPageClient() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/hub"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] transition-colors mb-4"
          >
            <ArrowLeft className="size-4" />
            Back to Hub
          </Link>
          <div className="flex items-center gap-3">
            <div className="size-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center">
              <Lightbulb className="size-6 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-2xl text-gray-900">Innovation Lab</h1>
              <p className="text-sm text-gray-500">
                Turn your ideas into protected, fundable ventures
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tools grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TOOLS.map((tool) => {
            const Icon = tool.icon
            return (
              <div
                key={tool.slug}
                className={`bg-white border-2 rounded-2xl overflow-hidden transition-all ${
                  tool.ready
                    ? 'border-gray-200 hover:border-[#0033A0] hover:shadow-lg cursor-pointer'
                    : 'border-gray-100 opacity-60'
                }`}
              >
                {tool.ready ? (
                  <Link href={`/innovation-lab/${tool.slug}`} className="block p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`size-12 bg-gradient-to-br ${tool.gradient} rounded-xl flex items-center justify-center shrink-0`}
                      >
                        <Icon className="size-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h2 className="font-extrabold text-lg text-gray-900">{tool.title}</h2>
                          <ArrowRight className="size-5 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                        {tool.phases.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {tool.phases.map((phase) => (
                              <span
                                key={phase}
                                className="text-[10px] font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                              >
                                {phase}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`size-12 bg-gradient-to-br ${tool.gradient} rounded-xl flex items-center justify-center shrink-0`}
                      >
                        <Icon className="size-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h2 className="font-extrabold text-lg text-gray-900">{tool.title}</h2>
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                            Coming Soon
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
