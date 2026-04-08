'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'framer-motion'
import { urlFor } from '@/lib/sanity'
import type { HeroData } from '@/lib/types'

interface HeroProps {
  data: HeroData
}

export default function Hero({ data }: HeroProps) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  // Parallax transforms
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '25%'])
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '15%'])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const heroImageUrl = data.backgroundImage
    ? urlFor(data.backgroundImage).width(1800).height(1000).url()
    : null

  const handleCTAClick = () => {
    const target = data.ctaLink ?? '#stats'
    const el = document.querySelector(target)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      ref={ref}
      id="home"
      className="relative w-full h-screen min-h-[600px] overflow-hidden flex items-center justify-center grid-lines"
    >
      {/* Background image / gradient */}
      <motion.div className="absolute inset-0 z-0" style={{ y: bgY }}>
        {heroImageUrl ? (
          <Image
            src={heroImageUrl}
            alt="Kaylee Daniel pole vault"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        ) : (
          /* Gradient fallback when no image is set */
          <div className="w-full h-full bg-gradient-to-br from-[#0a0a0a] via-[#0d1a40] to-[#0a0a0a]">
            {/* Decorative geometric lines */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-electric to-transparent" />
              <div className="absolute bottom-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-electric/50 to-transparent" />
              <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-electric/30 to-transparent" />
              <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-electric/20 to-transparent" />
            </div>
            {/* Radial glow */}
            <div className="absolute inset-0 bg-radial-gradient" style={{
              background: 'radial-gradient(ellipse 80% 60% at 60% 40%, rgba(0,51,160,0.3) 0%, transparent 70%)'
            }} />
          </div>
        )}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-[#0a0a0a]" />
        {/* Right edge vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/60 via-transparent to-[#0a0a0a]/30" />
      </motion.div>

      {/* UK accent bar — top */}
      <div className="absolute top-0 left-0 right-0 h-1 z-10"
        style={{ background: 'linear-gradient(90deg, #0033A0 0%, #00D4FF 50%, #0033A0 100%)' }} />

      {/* Main text content */}
      <motion.div
        className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-8 lg:px-12 flex flex-col items-start"
        style={{ y: textY, opacity }}
      >
        {/* Accent badge */}
        {data.accentStat && (
          <motion.div
            className="mb-6 md:mb-8"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.2em] uppercase border border-electric/40 text-electric bg-electric/10 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-electric animate-pulse-slow" />
              {data.accentStat}
            </span>
          </motion.div>
        )}

        {/* Name — massive Bebas Neue */}
        <div className="overflow-hidden mb-2">
          <motion.h1
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              className="block leading-none text-gradient-electric"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: 'clamp(5rem, 16vw, 17rem)',
                letterSpacing: '0.02em',
              }}
            >
              {data.firstName ?? 'Kaylee'}
            </span>
          </motion.h1>
        </div>

        <div className="overflow-hidden mb-6 md:mb-8">
          <motion.h1
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
          >
            <span
              className="block leading-none text-white glow-electric"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: 'clamp(5rem, 16vw, 17rem)',
                letterSpacing: '0.02em',
              }}
            >
              {data.lastName ?? 'Daniel'}
            </span>
          </motion.h1>
        </div>

        {/* Tagline */}
        {data.tagline && (
          <motion.div
            className="flex items-center gap-3 mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <span className="w-8 h-px bg-electric" />
            <p
              className="text-sm md:text-base font-medium tracking-[0.25em] uppercase text-white/80"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              {data.tagline}
            </p>
          </motion.div>
        )}

        {/* Sub-tagline */}
        {data.subTagline && (
          <motion.p
            className="text-xs md:text-sm tracking-[0.2em] uppercase text-white/40 mb-10 ml-11"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.65 }}
          >
            {data.subTagline}
          </motion.p>
        )}

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.75 }}
        >
          <button
            onClick={handleCTAClick}
            className="group relative inline-flex items-center gap-3 px-8 py-4 font-semibold text-sm tracking-widest uppercase overflow-hidden"
            style={{ letterSpacing: '0.2em' }}
          >
            {/* Button background */}
            <span className="absolute inset-0 bg-electric transition-transform duration-300 group-hover:scale-105" />
            <span className="absolute inset-0 border border-electric/50 translate-x-1 translate-y-1 transition-transform duration-300 group-hover:translate-x-2 group-hover:translate-y-2" />
            <span className="relative text-black font-semibold z-10">{data.ctaText ?? 'See My Stats'}</span>
            <span className="relative z-10 text-black">→</span>
          </button>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <span className="text-xs tracking-[0.3em] uppercase text-white/30">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-white/30 to-transparent animate-scroll-down" />
      </motion.div>

      {/* Corner decoration — UK branding */}
      <motion.div
        className="absolute bottom-8 right-5 md:right-12 z-10 text-right"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/20">University of Kentucky</p>
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/20">Track & Field</p>
      </motion.div>
    </section>
  )
}
