'use client'

import { useState } from 'react'
import { motion, AnimatePresence, type TargetAndTransition } from 'framer-motion'
import type { StatData, MeetResultData } from '@/app/lib/personal-site/types'
import { useSharedInView } from '@/app/hooks/useSharedInView'

interface StatsProps {
  stats: StatData[]
  meetResults: MeetResultData[]
}

const placeOrdinal = (n: number) =>
  n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`

const seasonLabels: Record<string, string> = {
  '2025-26-indoor': '2025\u201326 Indoor',
  '2024-25-outdoor': '2024\u201325 Outdoor',
  '2024-25-indoor': '2024\u201325 Indoor',
  '2024-outdoor': '2024 Outdoor',
  '2023-24-indoor': '2023\u201324 Indoor',
}

function AnimatedStatCard({ index, delay, children, className, style, whileHover }: { index: number; delay: number; children: React.ReactNode; className?: string; style?: React.CSSProperties; whileHover?: TargetAndTransition }) {
  const [ref, inView] = useSharedInView<HTMLDivElement>()
  return (
    <motion.div ref={ref} className={className} style={style} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 0.6, delay: index * delay }} whileHover={whileHover}>
      {children}
    </motion.div>
  )
}

export default function SiteStats({ stats, meetResults }: StatsProps) {
  const [ref1, inView1] = useSharedInView<HTMLDivElement>()
  const [ref2, inView2] = useSharedInView<HTMLDivElement>()
  const seasons = Array.from(new Set(meetResults.map((m) => m.season).filter(Boolean))) as string[]
  const [activeSeason, setActiveSeason] = useState<string>(seasons[0] ?? 'all')

  const filteredResults = activeSeason === 'all' ? meetResults : meetResults.filter((m) => m.season === activeSeason)
  const primaryStats = stats.filter((s) => s.isPrimary)
  const secondaryStats = stats.filter((s) => !s.isPrimary)

  return (
    <section id="stats" className="relative py-24 md:py-36 overflow-hidden bg-[#111111]">
      <div className="absolute top-0 left-0 right-0 h-px ps-section-divider" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[800px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
        <motion.div ref={ref1} className="mb-16" initial={{ opacity: 0, y: 30 }} animate={inView1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 0.7 }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[var(--ps-accent)]">Performance</span>
            <span className="h-px w-12 bg-[var(--ps-accent)]/50" />
          </div>
          <h2 className="leading-none" style={{ fontFamily: "var(--ps-display-font, 'Bebas Neue', Impact, sans-serif)", fontSize: 'clamp(3rem, 7vw, 7rem)' }}>
            Stats &amp; PRs
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
          {primaryStats.map((stat, i) => (
            <AnimatedStatCard key={stat.id} index={i} delay={0.1} className="relative sm:col-span-2 lg:col-span-1 rounded-2xl overflow-hidden p-8" style={{ background: 'linear-gradient(135deg, rgba(0,51,160,0.3) 0%, rgba(0,212,255,0.15) 100%)', border: '1px solid rgba(0,212,255,0.3)' }} whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}>
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500" style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(0,212,255,0.15) 0%, transparent 60%)' }} />
              <div className="relative z-10">
                {stat.note && <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider uppercase bg-[var(--ps-accent)]/20 text-[var(--ps-accent)] rounded-full mb-4">{stat.note}</span>}
                <p className="text-sm tracking-widest uppercase text-white/50 mb-2">{stat.event}</p>
                <p className="leading-none text-[var(--ps-accent)] ps-glow-accent mb-2" style={{ fontFamily: "var(--ps-display-font, 'Bebas Neue', Impact, sans-serif)", fontSize: 'clamp(3.5rem, 8vw, 7rem)' }}>{stat.mark}</p>
                {stat.markImperial && <p className="text-lg text-white/50 mb-4">{stat.markImperial}</p>}
                {stat.venue && <p className="text-xs text-white/40 leading-relaxed">{stat.venue}</p>}
                {stat.date && <p className="text-xs text-white/30 mt-1">{new Date(stat.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>}
              </div>
            </AnimatedStatCard>
          ))}

          {secondaryStats.map((stat, i) => (
            <AnimatedStatCard key={stat.id} index={primaryStats.length + i} delay={0.08} className="ps-card-glass ps-card-glass-hover rounded-2xl p-6">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs tracking-widest uppercase text-white/40">{stat.event}</p>
                {stat.note && <span className="text-xs text-yellow-400 font-medium">{stat.note}</span>}
              </div>
              <p className="leading-none text-white mb-1" style={{ fontFamily: "var(--ps-display-font, 'Bebas Neue', Impact, sans-serif)", fontSize: 'clamp(2rem, 5vw, 4rem)' }}>{stat.mark}</p>
              {stat.markImperial && <p className="text-sm text-white/40 mb-3">{stat.markImperial}</p>}
              <div className="flex items-center gap-2 mt-auto">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stat.isIndoor ? 'bg-blue-900/30 text-blue-300' : 'bg-yellow-500/10 text-yellow-400'}`}>
                  {stat.isIndoor ? 'Indoor' : 'Outdoor'}
                </span>
                {stat.date && <span className="text-xs text-white/30">{new Date(stat.date).getFullYear()}</span>}
              </div>
            </AnimatedStatCard>
          ))}
        </div>

        {meetResults.length > 0 && (
          <motion.div ref={ref2} initial={{ opacity: 0, y: 30 }} animate={inView2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 0.7 }}>
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
              <h3 className="text-3xl md:text-4xl" style={{ fontFamily: "var(--ps-display-font, 'Bebas Neue', Impact, sans-serif)" }}>Meet Results</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {seasons.length > 1 && (
                  <button onClick={() => setActiveSeason('all')} className={`px-4 py-1.5 text-xs font-medium tracking-widest uppercase rounded-full transition-all duration-200 ${activeSeason === 'all' ? 'bg-[var(--ps-accent)] text-black' : 'border border-white/15 text-white/50 hover:text-white hover:border-white/30'}`}>All</button>
                )}
                {seasons.map((season) => (
                  <button key={season} onClick={() => setActiveSeason(season)} className={`px-4 py-1.5 text-xs font-medium tracking-widest uppercase rounded-full transition-all duration-200 ${activeSeason === season ? 'bg-[var(--ps-accent)] text-black' : 'border border-white/15 text-white/50 hover:text-white hover:border-white/30'}`}>
                    {seasonLabels[season] ?? season}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-white/5">
              <div className="grid grid-cols-12 gap-2 px-4 md:px-6 py-3 bg-white/[0.03] border-b border-white/5">
                <div className="col-span-4 md:col-span-4 text-xs tracking-widest uppercase text-white/30">Meet</div>
                <div className="col-span-2 hidden md:block text-xs tracking-widest uppercase text-white/30">Date</div>
                <div className="col-span-3 md:col-span-2 text-xs tracking-widest uppercase text-white/30">Mark</div>
                <div className="col-span-2 hidden md:block text-xs tracking-widest uppercase text-white/30">Place</div>
                <div className="col-span-5 md:col-span-2 text-xs tracking-widest uppercase text-white/30 text-right">Notes</div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={activeSeason} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {filteredResults.map((result, i) => (
                    <motion.div key={result.id} className={`grid grid-cols-12 gap-2 px-4 md:px-6 py-4 items-center border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.03] ${result.isHighlight ? 'bg-[var(--ps-accent)]/5' : ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <div className="col-span-4 md:col-span-4">
                        <div className="flex items-center gap-2">
                          {result.isHighlight && <span className="w-1.5 h-1.5 rounded-full bg-[var(--ps-accent)] flex-shrink-0" />}
                          <div>
                            <p className="font-medium text-white text-sm leading-tight">{result.meetName}</p>
                            {result.location && <p className="text-xs text-white/30 mt-0.5 hidden sm:block">{result.location}</p>}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 hidden md:block text-sm text-white/50">{result.date && new Date(result.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      <div className="col-span-3 md:col-span-2">
                        <span className={`font-semibold text-sm ${result.isHighlight ? 'text-[var(--ps-accent)]' : 'text-white'}`}>{result.mark}</span>
                      </div>
                      <div className="col-span-2 hidden md:block text-sm text-white/60">
                        {result.place ? <span className={result.place <= 3 ? 'text-yellow-400 font-semibold' : ''}>{placeOrdinal(result.place)}</span> : '\u2014'}
                      </div>
                      <div className="col-span-5 md:col-span-2 text-right">
                        {result.notes && <span className="text-xs text-white/40 italic">{result.notes}</span>}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>

              {filteredResults.length === 0 && (
                <div className="px-6 py-12 text-center text-white/30 text-sm">No results for this season yet.</div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
