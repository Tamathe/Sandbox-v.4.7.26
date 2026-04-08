import Anthropic from '@anthropic-ai/sdk'

export interface ScriptTurn {
  speaker: 'A' | 'B'
  text: string
}

export interface PodcastScript {
  title: string
  turns: ScriptTurn[]
  totalWords: number
}

const TARGET_WORDS: Record<string, number> = {
  '5min': 750,
  '15min': 2250,
  '30min': 4500,
  'full': 6000,
}

const anthropic = new Anthropic()

/**
 * Generates a two-host podcast dialogue from educational source text using Claude.
 * Returns a structured PodcastScript with speaker turns.
 */
export async function generatePodcastScript(
  sourceText: string,
  sourceName: string,
  duration: string,
  hostAName = 'Alex',
  hostBName = 'Sam',
): Promise<PodcastScript> {
  const targetWords = TARGET_WORDS[duration] ?? 2250

  const systemPrompt = `You are a podcast script writer for the University of Kentucky's educational platform.
Create engaging two-host podcast dialogue that accurately explains educational content.

Rules:
- Use only spoken dialogue — no stage directions, markdown, or narration
- Speaker A is ${hostAName}, Speaker B is ${hostBName}
- Alternate speakers naturally; aim for 1–4 sentences per turn
- Target ${targetWords} total words across all dialogue
- Be accurate to the source material — never introduce facts not in the source
- Use clear, accessible language for university students
- Open with a brief introduction naming both hosts and the topic
- Close with a clear 1–2 sentence takeaway

Return ONLY valid JSON with no markdown fences:
{
  "title": "Episode title (max 80 characters)",
  "turns": [
    { "speaker": "A", "text": "..." },
    { "speaker": "B", "text": "..." }
  ]
}`

  const userPrompt = `Create a ${duration} podcast episode from the following content titled "${sourceName}":

${sourceText.slice(0, 20000)}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  // Strip accidental markdown code fences if the model adds them
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

  const parsed = JSON.parse(jsonStr) as {
    title?: unknown
    turns?: unknown[]
  }

  const rawTurns = Array.isArray(parsed.turns) ? parsed.turns : []
  const turns: ScriptTurn[] = rawTurns
    .filter((t): t is { speaker: 'A' | 'B'; text: string } => {
      if (typeof t !== 'object' || t === null) return false
      const rec = t as Record<string, unknown>
      return (
        (rec.speaker === 'A' || rec.speaker === 'B') &&
        typeof rec.text === 'string' &&
        (rec.text as string).trim() !== ''
      )
    })
    .map((t) => ({ speaker: t.speaker, text: t.text }))

  const totalWords = turns.reduce((sum, t) => sum + t.text.split(/\s+/).length, 0)

  return {
    title: typeof parsed.title === 'string' ? parsed.title.slice(0, 80) : sourceName,
    turns,
    totalWords,
  }
}
