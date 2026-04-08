/**
 * Splits a plain-text document into overlapping chunks suitable for embedding.
 *
 * Strategy:
 *  1. Split on double-newline paragraph boundaries first
 *  2. If a paragraph is still too long, split at sentence boundaries
 *  3. Hard-cut anything still exceeding the limit
 *
 * Target: ~2 000 chars per chunk (~512 tokens for typical English prose)
 * Overlap: 256 chars between adjacent chunks to preserve cross-boundary context
 */

export interface TextChunk {
  content: string
  chunkIndex: number
  /** Rough token estimate: chars / 4 */
  tokenCount: number
}

const CHUNK_SIZE = 2000  // chars
const OVERLAP    = 256   // chars

/** Estimate token count — good enough for size decisions */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/** Split text into overlapping chunks. Returns [] for empty/whitespace input. */
export function chunkText(text: string): TextChunk[] {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (!cleaned) return []

  // Build a flat list of segments by splitting on paragraphs, then sentences
  const segments: string[] = []
  for (const para of cleaned.split(/\n\n+/)) {
    const trimmed = para.trim()
    if (!trimmed) continue
    if (trimmed.length <= CHUNK_SIZE) {
      segments.push(trimmed)
    } else {
      // Split long paragraph at sentence boundaries (period/!/? followed by space or newline)
      const sentences = trimmed.split(/(?<=[.!?])\s+/)
      let buf = ''
      for (const sentence of sentences) {
        if (buf.length + sentence.length + 1 > CHUNK_SIZE && buf) {
          segments.push(buf.trim())
          buf = ''
        }
        buf += (buf ? ' ' : '') + sentence
      }
      if (buf.trim()) segments.push(buf.trim())
    }
  }

  if (segments.length === 0) return []

  // Merge small segments and apply overlap window
  const chunks: TextChunk[] = []
  let current = ''

  for (const seg of segments) {
    if (current.length + seg.length + 2 > CHUNK_SIZE && current) {
      chunks.push({ content: current.trim(), chunkIndex: chunks.length, tokenCount: estimateTokens(current) })
      // Start next chunk with the overlapping tail of the previous
      const overlapStart = Math.max(0, current.length - OVERLAP)
      current = current.slice(overlapStart).trimStart() + '\n\n' + seg
    } else {
      current += (current ? '\n\n' : '') + seg
    }
  }

  if (current.trim()) {
    chunks.push({ content: current.trim(), chunkIndex: chunks.length, tokenCount: estimateTokens(current) })
  }

  // Hard-cut any chunk that is still too long (should be rare)
  const result: TextChunk[] = []
  for (const chunk of chunks) {
    if (chunk.content.length <= CHUNK_SIZE * 1.5) {
      result.push({ ...chunk, chunkIndex: result.length })
    } else {
      let pos = 0
      while (pos < chunk.content.length) {
        const slice = chunk.content.slice(pos, pos + CHUNK_SIZE)
        result.push({ content: slice, chunkIndex: result.length, tokenCount: estimateTokens(slice) })
        pos += CHUNK_SIZE - OVERLAP
      }
    }
  }

  return result
}
