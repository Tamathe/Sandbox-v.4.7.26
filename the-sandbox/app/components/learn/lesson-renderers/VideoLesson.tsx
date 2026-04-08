'use client'

type Props = { contentRef: { url?: string; durationSec?: number } }

export default function VideoLesson({ contentRef }: Props) {
  if (!contentRef?.url) return <p className="text-sm text-slate-500">No video URL.</p>
  const isYoutube = /youtube\.com|youtu\.be/.test(contentRef.url)
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm">
      {isYoutube ? (
        <iframe
          src={contentRef.url.replace('watch?v=', 'embed/')}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video src={contentRef.url} controls className="w-full" />
      )}
    </div>
  )
}
