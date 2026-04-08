'use client'

import Link from 'next/link'
import { ArrowRight, Gamepad2, Trophy, Users, Coffee, TrendingUp, BookOpen, Film, Target } from 'lucide-react'
import PageHeader from '../components/PageHeader'

// ─── Zone definitions ──────────────────────────────────────────────────────────
// Accent bar color is the only zone-specific color. Cards are always white.
// (Manifest §3 — no colored card background fills)

const CAMPUS_ZONES = [
  {
    id: 'commons',
    title: 'The Commons',
    description: 'Games, role-play, sports strategy, and club tools — open experiences built for campus life.',
    icon: Gamepad2,
    accentBar: 'bg-amber-400',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    cta: { href: '/sandcastle', label: 'Enter The Commons' },
    highlights: [
      { label: 'Games & Challenges', icon: Gamepad2 },
      { label: 'AI Role-Play', icon: Users },
      { label: 'Sports Strategy', icon: Trophy },
      { label: 'Club Organizers', icon: Coffee },
    ],
  },
  {
    id: 'competition',
    title: 'Competitions',
    description: 'Brackets, prediction markets, and survivor pools — campus-wide competitions with real stakes.',
    icon: Trophy,
    accentBar: 'bg-[#0033A0]',
    iconBg: 'bg-blue-50',
    iconColor: 'text-[#0033A0]',
    cta: { href: '/tools/ncaa-bracket', label: 'NCAA Bracket Challenge' },
    highlights: [
      { label: 'March Madness Bracket', icon: Trophy },
      { label: 'Prediction Markets', icon: TrendingUp },
      { label: 'Survivor Pools', icon: Target },
    ],
  },
  {
    id: 'community',
    title: 'Community',
    description: 'Build ongoing leagues, run coffee roulette meetups, and track standing with the people in your orbit.',
    icon: Coffee,
    accentBar: 'bg-emerald-500',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    cta: { href: '/tools/coffee-roulette', label: 'Browse Leagues' },
    highlights: [
      { label: 'Coffee Roulette', icon: Coffee },
      { label: 'Survivor Pool', icon: Users },
    ],
  },
]

// ─── Featured spots ────────────────────────────────────────────────────────────

const FEATURED_SPOTS = [
  {
    href: '/tools/ncaa-bracket',
    label: 'NCAA Bracket Challenge',
    description: 'Create or join a pool. Fill your bracket. Compete across the university.',
    icon: Trophy,
    iconBg: 'bg-blue-50',
    iconColor: 'text-[#0033A0]',
    border: 'border-blue-200 hover:border-[#0033A0]/40',
  },
  {
    href: '/tools/book-recommender',
    label: 'Book Recommender',
    description: 'Build your taste profile and get 8 AI-curated reads — new releases weekly.',
    icon: BookOpen,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    border: 'border-amber-200 hover:border-amber-400',
  },
  {
    href: '/sandcastle/experience/film-discussion-circle',
    label: 'Film Discussion Circle',
    description: "Guided AI discussion and analysis of any film you're watching.",
    icon: Film,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    border: 'border-purple-200 hover:border-purple-400',
  },
  {
    href: '/tools/coffee-roulette',
    label: 'Coffee Roulette',
    description: 'Weekly random partner matching. Meet someone new. Rate the meet.',
    icon: Coffee,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    border: 'border-emerald-200 hover:border-emerald-400',
  },
]

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CampusPage() {
  return (
    <div>

      {/* Standard page header — Pattern A (Manifest §1) */}
      <PageHeader
        title="Campus Life"
        subtitle="Community, competitions, and culture — open experiences built for UK students."
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* Zone cards — white cards with accent bar (Manifest §3 — accent bar pattern) */}
        <section>
          <h2 className="text-base font-extrabold text-gray-900 mb-5">Explore</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CAMPUS_ZONES.map(zone => {
              const ZoneIcon = zone.icon
              return (
                <div
                  key={zone.id}
                  className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col"
                >
                  {/* 4px accent bar — sole zone color signal */}
                  <div className={`h-1 ${zone.accentBar}`} />

                  <div className="p-6 flex flex-col flex-1">
                    {/* Icon box */}
                    <div className={`size-10 rounded-xl flex items-center justify-center mb-4 ${zone.iconBg}`}>
                      <ZoneIcon className={`size-5 ${zone.iconColor}`} />
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 mb-1">{zone.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1">{zone.description}</p>

                    {/* Highlight chips — standard gray pills (Manifest §6) */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {zone.highlights.map(h => {
                        const HIcon = h.icon
                        return (
                          <span
                            key={h.label}
                            className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2.5 py-1 text-[11px] font-medium text-gray-600"
                          >
                            <HIcon className="size-3" />
                            {h.label}
                          </span>
                        )
                      })}
                    </div>

                    {/* CTA — UK Blue primary button */}
                    <Link
                      href={zone.cta.href}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#0033A0] hover:bg-[#002580] text-white text-sm font-semibold transition-colors"
                    >
                      {zone.cta.label}
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Featured spots */}
        <section>
          <h2 className="text-base font-extrabold text-gray-900 mb-5">Popular Right Now</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURED_SPOTS.map(spot => {
              const Icon = spot.icon
              return (
                <Link
                  key={spot.href}
                  href={spot.href}
                  className={`group flex flex-col gap-3 rounded-2xl border-2 bg-white p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${spot.border}`}
                >
                  <div className={`size-10 rounded-xl flex items-center justify-center ${spot.iconBg}`}>
                    <Icon className={`size-5 ${spot.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 group-hover:text-[#0033A0] transition-colors">
                      {spot.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{spot.description}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-1 text-xs font-semibold text-[#0033A0] opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ArrowRight className="size-3" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

      </div>
    </div>
  )
}
