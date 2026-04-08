'use client'

type Props = {
  contentRef: { systemPrompt?: string; model?: string; starterMessages?: string[] }
}

export default function ChatbotLesson({ contentRef }: Props) {
  const starters = contentRef?.starterMessages ?? []
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Conversational lesson</h3>
      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
        Model: {contentRef?.model ?? 'claude-haiku-4-5'}
      </p>
      {starters.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Try asking:</p>
          <ul className="mt-2 space-y-1">
            {starters.map((s, i) => (
              <li key={i} className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-6 text-sm text-slate-600">
        The chat interface for this lesson plugs into the existing /api/chat streaming endpoint.
      </p>
    </div>
  )
}
