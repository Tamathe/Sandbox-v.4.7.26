'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { urlFor, getYouTubeId, getTikTokId } from '@/lib/sanity'
import type { GalleryItemData } from '@/lib/types'

interface GalleryProps {
  items: GalleryItemData[]
}

type FilterKey = 'all' | 'competition' | 'training' | 'lifestyle' | 'nil'

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'competition', label: '🏟 Competition' },
  { key: 'training', label: '💪 Training' },
  { key: 'lifestyle', label: '✨ Lifestyle' },
  { key: 'nil', label: '🤝 Brand' },
]

// Placeholder images from picsum for demo
const placeholderImages = [
  'https://picsum.photos/seed/athlete1/600/800',
  'https://picsum.photos/seed/athlete2/800/600',
  'https://picsum.photos/seed/athlete3/600/900',
  'https://picsum.photos/seed/athlete4/700/500',
  'https://picsum.photos/seed/athlete5/500/700',
  'https://picsum.photos/seed/athlete6/800/800',
]

export default function Gallery({ items }: GalleryProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [lightboxIndex, setLightboxIndex] = useState(-1)

  const photoItems = items.filter((item) => item.type === 'photo' && item.image)

  const filteredItems =
    activeFilter === 'all'
      ? items
      : items.filter((item) => item.category === activeFilter)

  // Lightbox slides — only photo items in filtered set
  const lightboxSlides = filteredItems
    .filter((item) => item.type === 'photo' && item.image)
    .map((item) => ({
      src: urlFor(item.image!).width(1400).height(900).url(),
      alt: item.title,
    }))

  const openLightbox = useCallback(
    (item: GalleryItemData) => {
      if (item.type !== 'photo' || !item.image) return
      const idx = lightboxSlides.findIndex(
        (s) => s.src === urlFor(item.image!).width(1400).height(900).url()
      )
      setLightboxIndex(idx >= 0 ? idx : 0)
    },
    [lightboxSlides]
  )

  return (
    <section id="gallery" className="relative py-24 md:py-36 bg-bg-primary overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px section-divider" />

      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">

        {/* Section header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-electric">Media</span>
            <span className="h-px w-12 bg-electric/50" />
          </div>
          <h2
            className="font-display leading-none"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: 'clamp(3rem, 7vw, 7rem)',
            }}
          >
            Gallery
          </h2>
        </motion.div>

        {/* Filter buttons */}
        <motion.div
          className="flex gap-2 flex-wrap mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-4 py-2 text-xs font-medium tracking-wider uppercase rounded-full transition-all duration-200 ${
                activeFilter === f.key
                  ? 'bg-electric text-black'
                  : 'border border-white/15 text-white/50 hover:text-white hover:border-white/30'
              }`}
            >
              {f.label}
            </button>
          ))}
        </motion.div>

        {/* Masonry grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFilter}
            className="masonry-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {filteredItems.map((item, i) => (
              <motion.div
                key={item._id}
                className="masonry-item"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
              >
                <GalleryCard
                  item={item}
                  placeholderSrc={placeholderImages[i % placeholderImages.length]}
                  onPhotoClick={openLightbox}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="py-20 text-center text-white/30">
            No items in this category yet.
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Lightbox
        open={lightboxIndex >= 0}
        index={lightboxIndex}
        close={() => setLightboxIndex(-1)}
        slides={lightboxSlides}
        styles={{
          container: { backgroundColor: 'rgba(0,0,0,0.97)' },
        }}
      />
    </section>
  )
}

// ── Gallery Card ─────────────────────────────────────────────────────────────

interface GalleryCardProps {
  item: GalleryItemData
  placeholderSrc: string
  onPhotoClick: (item: GalleryItemData) => void
}

function GalleryCard({ item, placeholderSrc, onPhotoClick }: GalleryCardProps) {
  const imageUrl = item.image
    ? urlFor(item.image).width(800).url()
    : placeholderSrc

  if (item.type === 'tiktok' && item.tiktokUrl) {
    const videoId = getTikTokId(item.tiktokUrl)
    return (
      <div className="rounded-xl overflow-hidden bg-bg-card border border-white/5">
        <div className="relative w-full" style={{ paddingBottom: '177%' }}>
          {videoId ? (
            <iframe
              src={`https://www.tiktok.com/embed/v2/${videoId}`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              allowFullScreen
              title={item.title}
            />
          ) : (
            <a
              href={item.tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 flex flex-col items-center justify-center bg-bg-card text-white/50 hover:text-electric transition-colors gap-2 p-4 text-center"
            >
              <TikTokBig />
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-white/30">Watch on TikTok →</p>
            </a>
          )}
        </div>
        <div className="px-3 py-2">
          <p className="text-xs text-white/40 truncate">{item.title}</p>
        </div>
      </div>
    )
  }

  if (item.type === 'youtube' && item.youtubeUrl) {
    const videoId = getYouTubeId(item.youtubeUrl)
    return (
      <div className="rounded-xl overflow-hidden bg-bg-card border border-white/5">
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          {videoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={item.title}
            />
          ) : (
            <a
              href={item.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 flex items-center justify-center bg-bg-card text-white/50 hover:text-electric transition-colors"
            >
              ▶ Watch on YouTube
            </a>
          )}
        </div>
        <div className="px-3 py-2">
          <p className="text-xs text-white/40 truncate">{item.title}</p>
        </div>
      </div>
    )
  }

  // Photo card
  return (
    <button
      onClick={() => onPhotoClick(item)}
      className="group relative block w-full rounded-xl overflow-hidden bg-bg-card cursor-pointer"
    >
      <div className="relative w-full overflow-hidden">
        <Image
          src={imageUrl}
          alt={item.title}
          width={600}
          height={400}
          className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <p className="text-white font-medium text-sm">{item.title}</p>
          {item.date && (
            <p className="text-white/50 text-xs mt-0.5">
              {new Date(item.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2 text-electric text-xs font-medium">
            <ZoomIcon /> View Full
          </div>
        </div>

        {/* Featured badge */}
        {item.isFeatured && (
          <div className="absolute top-3 right-3 bg-electric text-black text-xs font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">
            ★ Featured
          </div>
        )}
      </div>
    </button>
  )
}

function ZoomIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  )
}

function TikTokBig() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.25 8.25 0 004.84 1.56V6.81a4.85 4.85 0 01-1.07-.12z" />
    </svg>
  )
}
