'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { urlFor } from '@/lib/sanity'
import type { BioData } from '@/lib/types'

interface BioProps {
  data: BioData
}

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

export default function Bio({ data }: BioProps) {
  const photoUrl = data.photo
    ? urlFor(data.photo).width(700).height(900).url()
    : null

  const facts = data.quickFacts
  const factItems = [
    { label: 'Hometown', value: facts?.hometown },
    { label: 'Year', value: facts?.year },
    { label: 'Major', value: facts?.major },
    { label: 'Height', value: facts?.height },
  ].filter((f) => f.value)

  // Render Sanity block text or fallback
  const bioText = data.bioText
    ? data.bioText
        .map((block) =>
          block.children?.map((child) => child.text).join('')
        )
        .join('\n\n')
    : "A Division I track & field athlete competing for the University of Kentucky Wildcats, Kaylee Daniel is a two-time Nevada state pole vault champion out of Liberty High School in Las Vegas. After a standout freshman season at the University of Houston — where she posted a 4.01m outdoor PR — she transferred to Kentucky for the 2025–26 season and immediately hit a collegiate indoor PR of 4.15m. Now in her sophomore year, Kaylee balances a full academic schedule in Clinical Leadership Management with the demands of elite SEC athletics, driven by one goal: reaching her ceiling and going beyond it."

  return (
    <section id="about" className="relative py-24 md:py-36 bg-bg-primary overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-0 right-0 h-px section-divider" />
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,51,160,0.08) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Image column */}
          <motion.div
            className="relative order-2 lg:order-1"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative aspect-[3/4] max-w-md mx-auto lg:mx-0 rounded-2xl overflow-hidden">
              {/* Decorative corner frame */}
              <div className="absolute -top-2 -left-2 w-16 h-16 border-l-2 border-t-2 border-electric z-10" />
              <div className="absolute -bottom-2 -right-2 w-16 h-16 border-r-2 border-b-2 border-electric z-10" />

              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt={`${data.headline || 'Athlete'} photo`}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                /* Static fallback headshot */
                <Image
                  src="/kaylee-daniel-headshot.png"
                  alt="Kaylee Daniel — UK Athletics"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              )}

              {/* Overlay gradient at bottom */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />
            </div>

            {/* Floating stat badge */}
            <motion.div
              className="absolute -right-4 top-12 card-glass rounded-2xl px-5 py-4 hidden lg:block"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <p className="text-xs tracking-widest uppercase text-white/40 mb-1">Outdoor PR</p>
              <p
                className="text-3xl text-electric font-display leading-none"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
              >
                4.01m
              </p>
              <p className="text-xs text-white/40 mt-1">13'1.75"</p>
            </motion.div>
          </motion.div>

          {/* Text column */}
          <motion.div
            className="order-1 lg:order-2 space-y-8"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Label */}
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-electric">About</span>
              <span className="h-px w-12 bg-electric/50" />
            </motion.div>

            {/* Headline */}
            <motion.h2
              variants={fadeUp}
              className="font-display leading-none"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: 'clamp(3rem, 7vw, 7rem)',
              }}
            >
              {data.headline ?? 'Built for Height'}
            </motion.h2>

            {/* Bio paragraph */}
            <motion.div variants={fadeUp} className="space-y-4">
              {bioText.split('\n\n').map((para, i) => (
                <p key={i} className="text-white/70 leading-relaxed text-base md:text-lg">
                  {para}
                </p>
              ))}
            </motion.div>

            {/* Quick facts strip */}
            {factItems.length > 0 && (
              <motion.div
                variants={fadeUp}
                className="grid grid-cols-2 gap-4 pt-2"
              >
                {factItems.map((fact) => (
                  <div key={fact.label} className="border-l-2 border-electric/30 pl-4">
                    <p className="text-xs tracking-widest uppercase text-white/30 mb-1">{fact.label}</p>
                    <p className="font-semibold text-white text-sm">{fact.value}</p>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Pull quote */}
            {data.quote && (
              <motion.blockquote
                variants={fadeUp}
                className="relative pl-6 border-l-2 border-electric"
              >
                <p
                  className="text-xl md:text-2xl font-medium text-white/90 italic leading-snug"
                >
                  {data.quote}
                </p>
                {data.quoteAuthor && (
                  <cite className="block mt-2 text-sm text-white/40 not-italic tracking-wider">
                    — {data.quoteAuthor}
                  </cite>
                )}
              </motion.blockquote>
            )}

            {/* Download media kit */}
            {data.resumeFile && (
              <motion.div variants={fadeUp}>
                <a
                  href={data.resumeFile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-electric hover:text-white transition-colors group"
                >
                  <DownloadIcon />
                  <span className="border-b border-electric/30 group-hover:border-white/50 transition-colors">
                    Download Media Kit / NIL One-Sheet
                  </span>
                </a>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
