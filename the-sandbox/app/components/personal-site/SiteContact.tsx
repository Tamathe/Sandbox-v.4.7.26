'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSharedInView } from '@/app/hooks/useSharedInView'

interface ContactProps {
  slug: string
  contactEmail?: string
}

const inquiryTypes = [
  { value: 'nil', label: 'NIL / Brand Partnership' },
  { value: 'media', label: 'Media / Press Inquiry' },
  { value: 'speaking', label: 'Speaking / Appearance' },
  { value: 'general', label: 'General Inquiry' },
]

export default function SiteContact({ slug, contactEmail }: ContactProps) {
  const [ref1, inView1] = useSharedInView<HTMLDivElement>()
  const [ref2, inView2] = useSharedInView<HTMLDivElement>()
  const [formData, setFormData] = useState({ name: '', email: '', company: '', inquiryType: 'nil', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMessage('')

    try {
      const res = await fetch('/api/personal-site/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, slug }),
      })
      if (res.ok) {
        setStatus('success')
        setFormData({ name: '', email: '', company: '', inquiryType: 'nil', message: '' })
      } else {
        const data = await res.json()
        setErrorMessage(data.error ?? 'Something went wrong.')
        setStatus('error')
      }
    } catch {
      setErrorMessage('Network error. Please try again.')
      setStatus('error')
    }
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[var(--ps-accent)] focus:ring-1 focus:ring-[var(--ps-accent)]/50 transition-all"

  return (
    <section id="contact" className="relative py-24 md:py-36 overflow-hidden bg-[#0a0a0a]">
      <div className="absolute top-0 left-0 right-0 h-px ps-section-divider" />
      <div className="absolute top-1/2 right-0 size-[500px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,51,160,0.12) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          <motion.div ref={ref1} initial={{ opacity: 0, y: 30 }} animate={inView1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 0.7 }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[var(--ps-accent)]">NIL & Media</span>
              <span className="h-px w-12 bg-[var(--ps-accent)]/50" />
            </div>
            <h2 className="leading-none mb-6" style={{ fontFamily: "var(--ps-display-font, 'Bebas Neue', Impact, sans-serif)", fontSize: 'clamp(3rem, 7vw, 7rem)' }}>Work With Me</h2>
            <p className="text-white/60 text-base md:text-lg leading-relaxed mb-8">
              Interested in a brand partnership, content collaboration, or media feature? I&apos;m open to authentic opportunities that align with my values on and off the track.
            </p>

            <div className="space-y-4 mb-10">
              {[
                { title: 'NIL Partnerships', desc: 'Brand deals, product collaborations, and ambassador roles' },
                { title: 'Content Creation', desc: 'Social media content, product photography, and video features' },
                { title: 'Speaking & Appearances', desc: 'Campus events, youth clinics, and brand activations' },
                { title: 'Media & Press', desc: 'Interviews, athlete profiles, and sports features' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <div>
                    <p className="font-semibold text-white text-sm">{item.title}</p>
                    <p className="text-white/50 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {contactEmail && (
              <div>
                <p className="text-xs tracking-widest uppercase text-white/30 mb-2">Or email directly</p>
                <a href={`mailto:${contactEmail}`} className="text-[var(--ps-accent)] hover:text-white transition-colors font-medium">{contactEmail}</a>
              </div>
            )}
          </motion.div>

          <motion.div ref={ref2} initial={{ opacity: 0, y: 30 }} animate={inView2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 0.7, delay: 0.15 }}>
            {status === 'success' ? (
              <motion.div className="ps-card-glass rounded-2xl p-10 text-center" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <h3 className="text-2xl font-semibold text-white mb-3">Message Received!</h3>
                <p className="text-white/60 mb-6">Thanks for reaching out. I&apos;ll get back to you within 48 hours.</p>
                <button onClick={() => setStatus('idle')} className="text-sm text-[var(--ps-accent)] hover:text-white transition-colors">Send another message</button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="ps-card-glass rounded-2xl p-7 md:p-9 space-y-5">
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase text-white/40 mb-2">Inquiry Type</label>
                  <select name="inquiryType" value={formData.inquiryType} onChange={handleChange} className={inputClass} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    {inquiryTypes.map((t) => <option key={t.value} value={t.value} style={{ background: '#161616' }}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase text-white/40 mb-2">Your Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Alex Johnson" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase text-white/40 mb-2">Email Address *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="alex@company.com" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase text-white/40 mb-2">Company / Brand <span className="text-white/20 normal-case tracking-normal font-normal ml-1">(optional)</span></label>
                  <input type="text" name="company" value={formData.company} onChange={handleChange} placeholder="Nike, ESPN, etc." className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase text-white/40 mb-2">Message *</label>
                  <textarea name="message" value={formData.message} onChange={handleChange} required rows={5} placeholder="Tell me about the opportunity, timeline, and what you're envisioning..." className={`${inputClass} resize-none`} />
                </div>
                {status === 'error' && <p className="text-red-400 text-sm">{errorMessage}</p>}
                <button type="submit" disabled={status === 'sending'} className="w-full py-4 font-semibold text-sm tracking-widest uppercase bg-[var(--ps-accent)] text-black rounded-xl hover:bg-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  {status === 'sending' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25" /><path d="M21 12a9 9 0 00-9-9" /></svg>
                      Sending...
                    </span>
                  ) : 'Send Inquiry'}
                </button>
                <p className="text-xs text-white/25 text-center">I typically respond within 24&ndash;48 hours.</p>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
