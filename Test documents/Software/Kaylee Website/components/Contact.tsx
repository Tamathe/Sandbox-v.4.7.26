'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface ContactProps {
  contactEmail?: string
}

const inquiryTypes = [
  { value: 'nil', label: 'NIL / Brand Partnership' },
  { value: 'media', label: 'Media / Press Inquiry' },
  { value: 'speaking', label: 'Speaking / Appearance' },
  { value: 'general', label: 'General Inquiry' },
]

export default function Contact({ contactEmail }: ContactProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    inquiryType: 'nil',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMessage('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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

  return (
    <section id="contact" className="relative py-24 md:py-36 bg-bg-primary overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px section-divider" />

      {/* Glow */}
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,51,160,0.12) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">

          {/* Left: intro text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-electric">NIL & Media</span>
              <span className="h-px w-12 bg-electric/50" />
            </div>
            <h2
              className="font-display leading-none mb-6"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: 'clamp(3rem, 7vw, 7rem)',
              }}
            >
              Work With Me
            </h2>

            <p className="text-white/60 text-base md:text-lg leading-relaxed mb-8">
              Interested in a brand partnership, content collaboration, or media feature?
              I'm open to authentic opportunities that align with my values on and off the track.
            </p>

            {/* What I offer */}
            <div className="space-y-4 mb-10">
              {[
                { icon: '🤝', title: 'NIL Partnerships', desc: 'Brand deals, product collaborations, and ambassador roles' },
                { icon: '📸', title: 'Content Creation', desc: 'Social media content, product photography, and video features' },
                { icon: '🎙️', title: 'Speaking & Appearances', desc: 'Campus events, youth clinics, and brand activations' },
                { icon: '📰', title: 'Media & Press', desc: 'Interviews, athlete profiles, and sports features' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl bg-white/3 border border-white/5">
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-white text-sm">{item.title}</p>
                    <p className="text-white/50 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Direct email */}
            {contactEmail && (
              <div>
                <p className="text-xs tracking-widest uppercase text-white/30 mb-2">Or email directly</p>
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-electric hover:text-white transition-colors font-medium"
                >
                  {contactEmail}
                </a>
              </div>
            )}
          </motion.div>

          {/* Right: form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            {status === 'success' ? (
              <motion.div
                className="card-glass rounded-2xl p-10 text-center"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-2xl font-semibold text-white mb-3">Message Received!</h3>
                <p className="text-white/60 mb-6">
                  Thanks for reaching out. I'll get back to you within 48 hours.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="text-sm text-electric hover:text-white transition-colors"
                >
                  Send another message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="card-glass rounded-2xl p-7 md:p-9 space-y-5">
                {/* Inquiry type */}
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase text-white/40 mb-2">
                    Inquiry Type
                  </label>
                  <select
                    name="inquiryType"
                    value={formData.inquiryType}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric/50 transition-all"
                  >
                    {inquiryTypes.map((t) => (
                      <option key={t.value} value={t.value} style={{ background: '#161616' }}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase text-white/40 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Alex Johnson"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric/50 transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase text-white/40 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="alex@company.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric/50 transition-all"
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase text-white/40 mb-2">
                    Company / Brand
                    <span className="text-white/20 normal-case tracking-normal font-normal ml-1">(optional)</span>
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Nike, ESPN, etc."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric/50 transition-all"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase text-white/40 mb-2">
                    Message *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Tell me about the opportunity, timeline, and what you're envisioning..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric/50 transition-all resize-none"
                  />
                </div>

                {/* Error message */}
                {status === 'error' && (
                  <p className="text-red-400 text-sm">{errorMessage}</p>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full py-4 font-semibold text-sm tracking-widest uppercase bg-electric text-black rounded-xl hover:bg-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'sending' ? (
                    <span className="flex items-center justify-center gap-2">
                      <SpinnerIcon />
                      Sending...
                    </span>
                  ) : (
                    'Send Inquiry'
                  )}
                </button>

                <p className="text-xs text-white/25 text-center">
                  I typically respond within 24–48 hours.
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 00-9-9" />
    </svg>
  )
}
