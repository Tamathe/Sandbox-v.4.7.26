'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'framer-motion'
import type { HeroData } from '@/app/lib/personal-site/types'

interface HeroProps {
  data: HeroData
}

export default function SiteHero({ data }: HeroProps) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '25%'])
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '15%'])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const handleCTAClick = () => {
    const target = data.ctaLink ?? '#stats'
    const el = document.querySelector(target)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      ref={ref}
      id="home"
      className="relative w-full h-screen min-h-[600px] overflow-hidden flex items-center justify-center ps-grid-lines"
    >
      <motion.div className="absolute inset-0 z-0" style={{ y: bgY }}>
        {data.backgroundImageUrl ? (
          <Image src={data.backgroundImageUrl} alt={`${data.firstName} ${data.lastName}`} fill priority sizes="100vw" className="object-cover object-center" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0a0a0a] via-[#0d1a40] to-[#0a0a0a]">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--ps-accent)] to-transparent" />
              <div className="absolute bottom-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--ps-accent)]/50 to-transparent" />
              <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-[var(--ps-accent)]/30 to-transparent" />
              <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-[var(--ps-accent)]/20 to-transparent" />
            </div>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 60% 40%, rgba(0,51,160,0.3) 0%, transparent 70%)' }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/60 via-transparent to-[#0a0a0a]/30" />
      </motion.div>

      <div className="absolute top-0 left-0 right-0 h-1 z-10" style={{ background: `linear-gradient(90deg, var(--ps-secondary) 0%, var(--ps-accent) 50%, var(--ps-secondary) 100%)` }} />

      <motion.div className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-8 lg:px-12 flex flex-col items-start" style={{ y: textY, opacity }}>
        {data.accentStat && (
          <motion.div className="mb-6 md:mb-8" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <span className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.2em] uppercase border border-[var(--ps-accent)]/40 text-[var(--ps-accent)] bg-[var(--ps-accent)]/10 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ps-accent)] animate-pulse" />
              {data.accentStat}
            </span>
          </motion.div>
        )}

        <div className="overflow-hidden mb-2">
          <motion.h1 initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
            <span className="block leading-none ps-text-gradient-accent" style={{ fontFamily: "var(--ps-display-font, 'Bebas Neue', Impact, sans-serif)", fontSize: 'clamp(5rem, 16vw, 17rem)', letterSpacing: '0.02em' }}>
              {data.firstName ?? 'First'}
            </span>
          </motion.h1>
        </div>

        <div className="overflow-hidden mb-6 md:mb-8">
          <motion.h1 initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}>
            <span className="block leading-none text-white ps-glow-accent" style={{ fontFamily: "var(--ps-display-font, 'Bebas Neue', Impact, sans-serif)", fontSize: 'clamp(5rem, 16vw, 17rem)', letterSpacing: '0.02em' }}>
              {data.lastName ?? 'Last'}
            </span>
          </motion.h1>
        </div>

        {data.tagline && (
          <motion.div className="flex items-center gap-3 mb-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
            <span className="w-8 h-px bg-[var(--ps-accent)]" />
            <p className="text-sm md:text-base font-medium tracking-[0.25em] uppercase text-white/80" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
              {data.tagline}
            </p>
          </motion.div>
        )}

        {data.subTagline && (
          <motion.p className="text-xs md:text-sm tracking-[0.2em] uppercase text-white/40 mb-10 ml-11" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.65 }}>
            {data.subTagline}
          </motion.p>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.75 }}>
          <button onClick={handleCTAClick} className="group relative inline-flex items-center gap-3 px-8 py-4 font-semibold text-sm tracking-widest uppercase overflow-hidden" style={{ letterSpacing: '0.2em' }}>
            <span className="absolute inset-0 bg-[var(--ps-accent)] transition-transform duration-300 group-hover:scale-105" />
            <span className="absolute inset-0 border border-[var(--ps-accent)]/50 translate-x-1 translate-y-1 transition-transform duration-300 group-hover:translate-x-2 group-hover:translate-y-2" />
            <span className="relative text-black font-semibold z-10">{data.ctaText ?? 'See My Stats'}</span>
            <span className="relative z-10 text-black">&rarr;</span>
          </button>
        </motion.div>
      </motion.div>

      <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
        <span className="text-xs tracking-[0.3em] uppercase text-white/30">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-white/30 to-transparent animate-bounce" />
      </motion.div>

      <motion.div className="absolute bottom-8 right-5 md:right-12 z-10 text-right" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/20">University of Kentucky</p>
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/20">Track & Field</p>
      </motion.div>
    </section>
  )
}
