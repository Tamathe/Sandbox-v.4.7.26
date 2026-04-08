'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '../lib/auth-context'
import { useState, useEffect } from 'react'
import { ArrowRight, Gamepad2, Sparkles } from 'lucide-react'
import { SANDCASTLE_EXPERIENCES, CATEGORY_ORDER, SandcastleCategory } from '../lib/sandcastle'

const CATEGORY_LABELS: Record<SandcastleCategory, string> = {
  'Educator Tools': 'Educator Tools',
  'Game': 'Games & Challenges',
  'Role-Play': 'AI Role-Play Experiences',
  'Sports AI': 'Sports & Competition',
  'Club & Organizer': 'Clubs & Organizers',
}

const CATEGORY_DESCRIPTIONS: Record<SandcastleCategory, string> = {
  'Educator Tools': 'AI-powered tools for faculty — stress-test assignments, build rubrics, and design better learning experiences.',
  'Game': 'Test your mind, compete for scores, and challenge friends.',
  'Role-Play': 'Step into another world and talk to characters from history and fiction.',
  'Sports AI': 'AI-powered strategy tools for brackets, drafts, and game-day decisions.',
  'Club & Organizer': 'Find venues, send emails, make posters, and run your group — AI handles the logistics.',
}

export default function SandcastlePage() {
  const { currentUser } = useAuth()
  const [activeCategory, setActiveCategory] = useState<SandcastleCategory | 'All'>('All')
  const [comingSoonClicked, setComingSoonClicked] = useState<string | null>(null)

  const visibleCategories = currentUser.role === 'STUDENT'
    ? CATEGORY_ORDER.filter((category) => category !== 'Educator Tools')
    : CATEGORY_ORDER

  const filteredExperiences = activeCategory === 'All'
    ? SANDCASTLE_EXPERIENCES
    : SANDCASTLE_EXPERIENCES.filter(e => e.category === activeCategory)

  const grouped = visibleCategories.reduce<Record<string, typeof SANDCASTLE_EXPERIENCES>>((acc, cat) => {
    const items = filteredExperiences.filter(e => e.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  return (
    <div>
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #b45309 0%, #d97706 40%, #f59e0b 100%)' }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="inline-flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-4 py-1.5 text-sm font-medium text-amber-50 mb-4">
            <Gamepad2 className="w-4 h-4" />
            <span>The Commons</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 leading-tight">
            Play, Explore,<br />
            <span className="text-amber-200">and Connect</span>
          </h1>
          <p className="text-amber-100 text-lg max-w-xl leading-relaxed">
            The open space of campus life — games, role-play, sports, clubs, and community built by everyone.
          </p>
        </div>
      </div>

      {/* Category filter bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveCategory('All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === 'All' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {visibleCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeCategory === cat ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Experiences */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {Object.entries(grouped).map(([category, experiences]) => (
          <section key={category}>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-900">{CATEGORY_LABELS[category as SandcastleCategory]}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{CATEGORY_DESCRIPTIONS[category as SandcastleCategory]}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {experiences.map(exp => {
                const isLive = exp.status === 'live'

                return (
                  <div
                    key={exp.slug}
                    className={`relative bg-white rounded-2xl border overflow-hidden transition-all ${
                      isLive
                        ? 'border-gray-200 hover:border-amber-300 hover:shadow-md hover:-translate-y-0.5'
                        : 'border-gray-200 opacity-60'
                    }`}
                  >
                    {/* Header band */}
                    <div className="px-5 pt-5 pb-3">
                      <div className="flex items-start justify-between mb-3">
                        {exp.image ? (
                          <Image src={exp.image} alt={exp.title} width={44} height={32} className="rounded-lg" />
                        ) : (
                          <span className="text-3xl">{exp.emoji}</span>
                        )}
                        <div className="flex items-center gap-1.5">
                          {exp.status === 'coming-soon' && (
                            <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Coming Soon
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${exp.categoryColor}`}>
                        {exp.category}
                      </span>
                      <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{exp.title}</h3>
                      <p className="text-xs text-amber-600 font-medium mb-2">{exp.tagline}</p>
                      <p className="text-sm text-gray-500 leading-relaxed">{exp.description}</p>
                    </div>

                    <div className="px-5 pb-5">
                      {isLive ? (
                        <Link
                          href={`/sandcastle/${exp.slug}`}
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
                        >
                          Launch
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setComingSoonClicked(exp.slug)
                            setTimeout(() => setComingSoonClicked(null), 2500)
                          }}
                          className="w-full cursor-pointer rounded-xl bg-gray-100 py-2.5 text-center text-sm font-medium text-gray-400 transition-colors hover:bg-gray-200"
                        >
                          {comingSoonClicked === exp.slug ? '🏗️ Coming soon - stay tuned!' : 'Coming Soon'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        {/* Build your own CTA */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-8 text-center">
          <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Add Something to The Commons</h3>
          <p className="text-gray-600 text-sm mb-5 max-w-xl mx-auto">
            Have an idea for a game, role-play scenario, community tool, or AI-powered organizer? Build it in the Studio and publish it here.
          </p>
          <Link
            href="/studio"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Open the Studio
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
