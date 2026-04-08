'use client'

import { motion } from 'framer-motion'
import { useSharedInView } from '@/app/hooks/useSharedInView'

interface FooterProps {
  firstName: string
  lastName: string
  tagline?: string
  socialLinks?: { instagram?: string; tiktok?: string; twitter?: string; youtube?: string }
}

const navLinks = [
  { label: 'About', href: '#about' },
  { label: 'Stats', href: '#stats' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Press', href: '#press' },
  { label: 'Contact', href: '#contact' },
]

export default function SiteFooter({ firstName, lastName, tagline, socialLinks }: FooterProps) {
  const [ref1, inView1] = useSharedInView<HTMLDivElement>()
  const [ref2, inView2] = useSharedInView<HTMLElement>()
  const [ref3, inView3] = useSharedInView<HTMLDivElement>()
  const scrollTo = (href: string) => {
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }
  const year = new Date().getFullYear()

  return (
    <footer className="relative border-t border-white/5 overflow-hidden bg-[#111111]">
      <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, var(--ps-accent) 50%, transparent 100%)', opacity: 0.3 }} />

      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 items-start mb-16">
          <motion.div ref={ref1} initial={{ opacity: 0, y: 20 }} animate={inView1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }} transition={{ duration: 0.6 }}>
            <div className="text-6xl md:text-7xl leading-none text-white mb-4" style={{ fontFamily: "var(--ps-display-font, 'Bebas Neue', Impact, sans-serif)" }}>
              {firstName}<br /><span className="ps-text-gradient-accent">{lastName}</span>
            </div>
            {tagline && <p className="text-white/40 text-sm">{tagline}</p>}
          </motion.div>

          <motion.nav ref={ref2} className="space-y-3" initial={{ opacity: 0, y: 20 }} animate={inView2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-white/30 mb-4">Navigation</p>
            {navLinks.map((link) => (
              <button key={link.href} onClick={() => scrollTo(link.href)} className="block text-sm text-white/50 hover:text-[var(--ps-accent)] transition-colors">{link.label}</button>
            ))}
          </motion.nav>

          <motion.div ref={ref3} initial={{ opacity: 0, y: 20 }} animate={inView3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-white/30 mb-4">Follow Along</p>
            <div className="flex gap-4 mb-6">
              {socialLinks?.instagram && <SocialButton href={socialLinks.instagram} label="Instagram"><InstagramIcon /></SocialButton>}
              {socialLinks?.tiktok && <SocialButton href={socialLinks.tiktok} label="TikTok"><TikTokIcon /></SocialButton>}
              {socialLinks?.twitter && <SocialButton href={socialLinks.twitter} label="Twitter / X"><TwitterIcon /></SocialButton>}
              {socialLinks?.youtube && <SocialButton href={socialLinks.youtube} label="YouTube"><YouTubeIcon /></SocialButton>}
            </div>
            <button onClick={() => scrollTo('#contact')} className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold tracking-widest uppercase border border-[var(--ps-accent)]/40 text-[var(--ps-accent)] rounded-full hover:bg-[var(--ps-accent)] hover:text-black transition-all duration-200">
              NIL Inquiries &rarr;
            </button>
          </motion.div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/20 text-center sm:text-left">&copy; {year} {firstName} {lastName}. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/15 tracking-widest uppercase">University of Kentucky</span>
            <span className="text-white/10">&middot;</span>
            <span className="text-xs text-white/15">University of Kentucky</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

function SocialButton({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="size-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-[var(--ps-accent)] hover:border-[var(--ps-accent)]/50 transition-all" aria-label={label}>
      {children}
    </a>
  )
}

function InstagramIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
}

function TikTokIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.25 8.25 0 004.84 1.56V6.81a4.85 4.85 0 01-1.07-.12z" /></svg>
}

function TwitterIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
}

function YouTubeIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
}
