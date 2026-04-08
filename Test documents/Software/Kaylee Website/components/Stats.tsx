'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { StatData, MeetResultData } from '@/lib/types'

interface StatsProps {
  stats: StatData[]
  meetResults: MeetResultData[]
}

const placeOrdinal = (n: number) =>
  n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`

const seasonLabels: Record<string, string> = {
  '2024-25-indoor': '2024–25 Indoor',
  '2024-outdoor': '2024 Outdoor',
  '2023-24-indoor': '2023–24 Indoor',
  '2023-outdoor': '2023 Outdoor',
  '2022-23-indoor': '2022–23 Indoor',
  '2022-outdoor': '2022 Outdoor',
}

export default function Stats({ stats, meetResults }: StatsProps) {
  // Get unique seasons from meet results
  const seasons = Array.from(
    new Set(meetResults.map((m) => m.season).filter(Boolean))
  ) as string[]

  const [activeSeason, setActiveSeason] = useState<string>(seasons[0] ?? 'all')

  const filteredResults =
    activeSeason === 'all'
      ? meetResults
      : meetResults.filter((m) => m.season === activeSeason)

  const primaryStats = stats.filter((s) => s.isPrimary)
  const secondaryStats = stats.filter((s) => !s.isPrimary)

  return (
    <section id="stats" className="relative py-24 md:py-36 bg-bg-secondary overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px section-divider" />

      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">

        {/* Section header */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-electric">Performance</span>
            <span className="h-px w-12 bg-electric/50" />
          </div>
          <h2
            className="font-display leading-none"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: 'clamp(3rem, 7vw, 7rem)',
            }}
          >
            Stats &amp; PRs
          </h2>
        </motion.div>

        {/* ── Personal Records Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
          {/* Primary / featured PR(s) */}
          {primaryStats.map((stat, i) => (
            <motion.div
              key={stat._id}
              className="relative sm:col-span-2 lg:col-span-1 rounded-2xl overflow-hidden p-8"
              style={{ background: 'linear-gradient(135deg, rgba(0,51,160,0.3) 0%, rgba(0,212,255,0.15) 100%)', border: '1px solid rgba(0,212,255,0.3)' }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(0,212,255,0.15) 0%, transparent 60%)' }} />

              <div className="relative z-10">
                {stat.note && (
                  <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider uppercase bg-electric/20 text-electric rounded-full mb-4">
                    {stat.note}
                  </span>
                )}
                <p className="text-sm tracking-widest uppercase text-white/50 mb-2">{stat.event}</p>
                <p
                  className="font-display leading-none text-electric glow-electric mb-2"
                  style={{
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    fontSize: 'clamp(3.5rem, 8vw, 7rem)',
                  }}
                >
                  {stat.mark}
                </p>
                {stat.markImperial && (
                  <p className="text-lg text-white/50 mb-4">{stat.markImperial}</p>
                )}
                {stat.venue && (
                  <p className="text-xs text-white/40 leading-relaxed">
                    📍 {stat.venue}
                  </p>
                )}
                {stat.date && (
                  <p className="text-xs text-white/30 mt-1">
                    {new Date(stat.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            </motion.div>
          ))}

          {/* Secondary PR cards */}
          {secondaryStats.map((stat, i) => (
            <motion.div
              key={stat._id}
              className="card-glass card-glass-hover rounded-2xl p-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: (primaryStats.length + i) * 0.08 }}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs tracking-widest uppercase text-white/40">{stat.event}</p>
                {stat.note && (
                  <span className="text-xs text-yellow font-medium">{stat.note}</span>
                )}
              </div>
              <p
                className="font-display leading-none text-white mb-1"
                style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: 'clamp(2rem, 5vw, 4rem)',
                }}
              >
                {stat.mark}
              </p>
              {stat.markImperial && (
                <p className="text-sm text-white/40 mb-3">{stat.markImperial}</p>
              )}
              <div className="flex items-center gap-2 mt-auto">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stat.isIndoor ? 'bg-uk-blue/30 text-blue-300' : 'bg-yellow/10 text-yellow'}`}>
                  {stat.isIndoor ? 'Indoor' : 'Outdoor'}
                </span>
                {stat.date && (
                  <span className="text-xs text-white/30">
                    {new Date(stat.date).getFullYear()}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Meet Results Table ──────────────────────────────────────────── */}
        {meetResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
              <h3
                className="font-display text-3xl md:text-4xl"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
              >
                Meet Results
              </h3>

              {/* Season filter tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                {seasons.length > 1 && (
                  <button
                    onClick={() => setActiveSeason('all')}
                    className={`px-4 py-1.5 text-xs font-medium tracking-widest uppercase rounded-full transition-all duration-200 ${
                      activeSeason === 'all'
                        ? 'bg-electric text-black'
                        : 'border border-white/15 text-white/50 hover:text-white hover:border-white/30'
                    }`}
                  >
                    All
                  </button>
                )}
                {seasons.map((season) => (
                  <button
                    key={season}
                    onClick={() => setActiveSeason(season)}
                    className={`px-4 py-1.5 text-xs font-medium tracking-widest uppercase rounded-full transition-all duration-200 ${
                      activeSeason === season
                        ? 'bg-electric text-black'
                        : 'border border-white/15 text-white/50 hover:text-white hover:border-white/30'
                    }`}
                  >
                    {seasonLabels[season] ?? season}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden border border-white/5">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-4 md:px-6 py-3 bg-white/3 border-b border-white/5">
                <div className="col-span-4 md:col-span-4 text-xs tracking-widest uppercase text-white/30">Meet</div>
                <div className="col-span-2 hidden md:block text-xs tracking-widest uppercase text-white/30">Date</div>
                <div className="col-span-3 md:col-span-2 text-xs tracking-widest uppercase text-white/30">Mark</div>
                <div className="col-span-2 hidden md:block text-xs tracking-widest uppercase text-white/30">Place</div>
                <div className="col-span-5 md:col-span-2 text-xs tracking-widest uppercase text-white/30 text-right">Notes</div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSeason}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {filteredResults.map((result, i) => (
                    <motion.div
                      key={result._id}
                      className={`grid grid-cols-12 gap-2 px-4 md:px-6 py-4 items-center border-b border-white/5 last:border-0 transition-colors hover:bg-white/3 ${
                        result.isHighlight ? 'bg-electric/5' : ''
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div className="col-span-4 md:col-span-4">
                        <div className="flex items-center gap-2">
                          {result.isHighlight && (
                            <span className="w-1.5 h-1.5 rounded-full bg-electric flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-white text-sm leading-tight">{result.meetName}</p>
                            {result.location && (
                              <p className="text-xs text-white/30 mt-0.5 hidden sm:block">{result.location}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 hidden md:block text-sm text-white/50">
                        {result.date && new Date(result.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <span className={`font-semibold text-sm ${result.isHighlight ? 'text-electric' : 'text-white'}`}>
                          {result.mark}
                        </span>
                      </div>
                      <div className="col-span-2 hidden md:block text-sm text-white/60">
                        {result.place ? (
                          <span className={result.place <= 3 ? 'text-yellow font-semibold' : ''}>
                            {placeOrdinal(result.place)}
                          </span>
                        ) : '—'}
                      </div>
                      <div className="col-span-5 md:col-span-2 text-right">
                        {result.notes && (
                          <span className="text-xs text-white/40 italic">{result.notes}</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>

              {filteredResults.length === 0 && (
                <div className="px-6 py-12 text-center text-white/30 text-sm">
                  No results for this season yet.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
