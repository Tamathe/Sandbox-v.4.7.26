'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Database, ArrowRight, GraduationCap, Building2, BriefcaseBusiness } from 'lucide-react'
import { SANDBOX_DATASETS } from '../lib/datasets'

const FILTERS = ['All', 'University', 'Student Success', 'Courseware'] as const

const CATEGORY_ICONS = {
  University: Building2,
  'Student Success': BriefcaseBusiness,
  Courseware: GraduationCap,
}

export default function DatasetsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')

  const datasets = filter === 'All'
    ? SANDBOX_DATASETS
    : SANDBOX_DATASETS.filter(dataset => dataset.category === filter)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#0033A0] via-blue-700 to-sky-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200 mb-3">
              Shared Data
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-3">
              University and course datasets you can build from
            </h1>
            <p className="text-blue-100 text-base sm:text-lg leading-relaxed">
              These shared knowledge sources are meant to seed new tools, prototypes, and campus-facing experiences without starting from a blank slate.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === option
                  ? 'bg-[#0033A0] text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {datasets.map((dataset) => {
            const Icon = CATEGORY_ICONS[dataset.category]
            const builderHref = `/builder?prompt=${encodeURIComponent(dataset.builderPrompt)}`
            const publishHref = `/publish?dataset=${encodeURIComponent(dataset.id)}`

            return (
              <div key={dataset.id} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0033A0] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                          {dataset.category}
                        </span>
                        <span className="text-xs text-gray-400">{dataset.owner}</span>
                      </div>
                      <h2 className="text-base font-bold text-gray-900">{dataset.title}</h2>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {dataset.coverage}
                  </div>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed mb-4">{dataset.summary}</p>

                <div className="mb-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 mb-2">
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dataset.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 mb-2">
                    Sample uses
                  </div>
                  <ul className="space-y-2">
                    {dataset.sampleUses.map((useCase) => (
                      <li key={useCase} className="flex items-start gap-2 text-sm text-gray-600">
                        <Database className="w-4 h-4 mt-0.5 text-[#0033A0] flex-shrink-0" />
                        <span>{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={builderHref}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002580] transition-colors"
                  >
                    Build from this dataset
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href={publishHref}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Link it in publish
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
