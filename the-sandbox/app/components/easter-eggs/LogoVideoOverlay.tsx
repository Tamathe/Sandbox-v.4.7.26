'use client'

import { useEffect, useRef, useState } from 'react'

export default function LogoVideoOverlay({ onDone }: { onDone?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Auto-dismiss after 8 seconds (video length)
    const timer = setTimeout(() => {
      setFadeOut(true)
    }, 8000)

    // After fade-out animation completes, call onDone
    const cleanup = setTimeout(() => {
      onDone?.()
    }, 8600)

    return () => {
      clearTimeout(timer)
      clearTimeout(cleanup)
    }
  }, [onDone])

  // Play video as soon as it's mounted
  useEffect(() => {
    videoRef.current?.play().catch(() => {
      // Autoplay blocked — dismiss gracefully
      onDone?.()
    })
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={() => {
        setFadeOut(true)
        setTimeout(() => onDone?.(), 500)
      }}
    >
      <video
        ref={videoRef}
        src="/logo-animation.mp4"
        className="max-w-[80vw] max-h-[80vh] rounded-2xl shadow-2xl"
        muted
        playsInline
        autoPlay
        preload="none"
      />
    </div>
  )
}
