'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { urlFor } from '@/lib/sanity'
import type { PressEntryData } from '@/lib/types'

interface PressProps {
  entries: PressEntryData[]
}

const typeConfig = {
  press: { label: 'Press', color: 'text-electric bg-electric/10 border-electric/20' },
  partnership: { label: 'Partnership', color: 'text-yellow bg-yellow/10 border-yellow/20' },
  interview: { label: 'Interview', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  award: { label: 'Award', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
}

const cardVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
}

export default function Press({ entries }: PressProps) {
  const featuredEntries = entries.filter((e) => e.isFeatured)
  const regularEntries = entries.filter((e) => !e.isFeatured)

  return (
    <section id="press" className="relative py-24 md:py-36 bg-bg-secondary overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px section-divider" />
      <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)' }} />

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
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-electric">Highlights</span>
            <span className="h-px w-12 bg-electric/50" />
          </div>
          <h2
            className="font-display leading-none"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: 'clamp(3rem, 7vw, 7rem)',
            }}
          >
            Press &amp; NIL
          </h2>
          <p className="text-white/50 mt-4 max-w-xl text-base">
            Media features, brand partnerships, and recognition — building a brand beyond the track.
          </p>
        </motion.div>

        {/* Featured entries — larger cards */}
        {featuredEntries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {featuredEntries.map((entry, i) => (
              <motion.div
                key={entry._id}
                custom={i}
                variants={cardVariant}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <PressCard entry={entry} featured />
              </motion.div>
            ))}
          </div>
        )}

        {/* Regular entries — smaller grid */}
        {regularEntries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularEntries.map((entry, i) => (
              <motion.div
                key={entry._id}
                custom={i + featuredEntries.length}
                variants={cardVariant}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <PressCard entry={entry} featured={false} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ── Press Card ───────────────────────────────────────────────────────────────

function PressCard({ entry, featured }: { entry: PressEntryData; featured: boolean }) {
  const logoUrl = entry.logo
    ? urlFor(entry.logo).width(120).height(60).url()
    : null

  const config = typeConfig[entry.type] ?? typeConfig.press

  const content = (
    <div className={`card-glass card-glass-hover rounded-2xl p-6 h-full flex flex-col ${featured ? 'p-7 md:p-8' : ''}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold tracking-wider uppercase border rounded-full ${config.color}`}>
          {config.label}
        </span>
        {entry.date && (
          <span className="text-xs text-white/30 shrink-0">
            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Logo */}
      {logoUrl && (
        <div className="mb-4">
          <Image
            src={logoUrl}
            alt={entry.publication ?? 'Publication logo'}
            width={80}
            height={40}
            className="object-contain h-8 w-auto opacity-70"
          />
        </div>
      )}

      {/* Publication name */}
      {entry.publication && !logoUrl && (
        <p className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-2">
          {entry.publication}
        </p>
      )}

      {/* Title */}
      <h3 className={`font-semibold text-white leading-snug mb-3 ${featured ? 'text-xl md:text-2xl' : 'text-base'}`}>
        {entry.title}
      </h3>

      {/* Description */}
      {entry.description && (
        <p className="text-white/55 text-sm leading-relaxed mb-4 flex-1">
          {entry.description}
        </p>
      )}

      {/* CTA */}
      {entry.url && (
        <div className="mt-auto pt-2">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-electric group-hover:text-white transition-colors">
            Read More
            <ArrowIcon />
          </span>
        </div>
      )}
    </div>
  )

  if (entry.url) {
    return (
      <a
        href={entry.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full group"
      >
        {content}
      </a>
    )
  }

  return <div className="h-full">{content}</div>
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="transition-transform group-hover:translate-x-1">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}
