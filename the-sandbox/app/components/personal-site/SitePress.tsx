'use client'

import { motion } from 'framer-motion'
import type { PressEntryData } from '@/app/lib/personal-site/types'
import { useSharedInView } from '@/app/hooks/useSharedInView'

interface PressProps {
  entries: PressEntryData[]
}

const typeConfig: Record<string, { label: string; color: string }> = {
  press: { label: 'Press', color: 'text-[var(--ps-accent)] bg-[var(--ps-accent)]/10 border-[var(--ps-accent)]/20' },
  partnership: { label: 'Partnership', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  interview: { label: 'Interview', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  award: { label: 'Award', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
}

const cardVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as const } }),
}

function AnimatedPressCard({ entry, index, children }: { entry: PressEntryData; index: number; children: React.ReactNode }) {
  const [ref, inView] = useSharedInView<HTMLDivElement>()
  return (
    <motion.div ref={ref} custom={index} variants={cardVariant} initial="hidden" animate={inView ? "visible" : "hidden"}>
      {children}
    </motion.div>
  )
}

export default function SitePress({ entries }: PressProps) {
  const [ref1, inView1] = useSharedInView<HTMLDivElement>()
  const featuredEntries = entries.filter((e) => e.isFeatured)
  const regularEntries = entries.filter((e) => !e.isFeatured)

  return (
    <section id="press" className="relative py-24 md:py-36 overflow-hidden bg-[#111111]">
      <div className="absolute top-0 left-0 right-0 h-px ps-section-divider" />
      <div className="absolute -bottom-40 -left-40 size-[600px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
        <motion.div ref={ref1} className="mb-16" initial={{ opacity: 0, y: 30 }} animate={inView1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 0.7 }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[var(--ps-accent)]">Highlights</span>
            <span className="h-px w-12 bg-[var(--ps-accent)]/50" />
          </div>
          <h2 className="leading-none" style={{ fontFamily: "var(--ps-display-font, 'Bebas Neue', Impact, sans-serif)", fontSize: 'clamp(3rem, 7vw, 7rem)' }}>Press &amp; NIL</h2>
          <p className="text-white/50 mt-4 max-w-xl text-base">Media features, brand partnerships, and recognition &mdash; building a brand beyond the track.</p>
        </motion.div>

        {featuredEntries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {featuredEntries.map((entry, i) => (
              <AnimatedPressCard key={entry.id} entry={entry} index={i}>
                <PressCard entry={entry} featured />
              </AnimatedPressCard>
            ))}
          </div>
        )}

        {regularEntries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularEntries.map((entry, i) => (
              <AnimatedPressCard key={entry.id} entry={entry} index={i + featuredEntries.length}>
                <PressCard entry={entry} featured={false} />
              </AnimatedPressCard>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function PressCard({ entry, featured }: { entry: PressEntryData; featured: boolean }) {
  const config = typeConfig[entry.type] ?? typeConfig.press

  const content = (
    <div className={`ps-card-glass ps-card-glass-hover rounded-2xl p-6 h-full flex flex-col ${featured ? 'p-7 md:p-8' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold tracking-wider uppercase border rounded-full ${config.color}`}>{config.label}</span>
        {entry.date && <span className="text-xs text-white/30 shrink-0">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
      </div>
      {entry.publication && <p className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-2">{entry.publication}</p>}
      <h3 className={`font-semibold text-white leading-snug mb-3 ${featured ? 'text-xl md:text-2xl' : 'text-base'}`}>{entry.title}</h3>
      {entry.description && <p className="text-white/55 text-sm leading-relaxed mb-4 flex-1">{entry.description}</p>}
      {entry.url && (
        <div className="mt-auto pt-2">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ps-accent)] group-hover:text-white transition-colors">
            Read More
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </span>
        </div>
      )}
    </div>
  )

  if (entry.url) {
    return <a href={entry.url} target="_blank" rel="noopener noreferrer" className="block h-full group">{content}</a>
  }
  return <div className="h-full">{content}</div>
}
