'use client'

type Props = { contentRef: { markdown?: string } }

export default function ReadingLesson({ contentRef }: Props) {
  return (
    <article className="prose prose-slate max-w-none whitespace-pre-wrap">
      {contentRef?.markdown ?? '*No reading content provided.*'}
    </article>
  )
}
