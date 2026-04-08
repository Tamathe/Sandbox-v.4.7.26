/**
 * Sandy Trace — collects metadata about what context sections were
 * injected into Sandy's system prompt for transparency.
 */

import { estimateTokens } from './token-budget'

export interface SandyTraceSection {
  name: string
  tokens: number
}

export interface SandyTraceData {
  /** Sections injected into the system prompt */
  sections: SandyTraceSection[]
  /** Total estimated tokens in the system prompt */
  totalTokens: number
  /** Whether the prompt was trimmed by the budget monitor */
  wasTrimmed: boolean
  /** Sections dropped by budget trimming */
  droppedSections: string[]
  /** User preferences applied (empty object if defaults) */
  preferences: {
    tone?: string
    proactivity?: string
    responseLength?: string
  }
  /** Data sources that contributed context */
  dataSources: string[]
  /** Timestamp */
  timestamp: string
}

/**
 * Parse a system prompt to extract section names and sizes.
 */
export function collectTraceSections(prompt: string): SandyTraceSection[] {
  const sections: SandyTraceSection[] = []
  const regex = /\n\n## ([^\n]+)\n/g
  let match: RegExpExecArray | null
  const positions: { name: string; start: number }[] = []

  while ((match = regex.exec(prompt)) !== null) {
    positions.push({ name: match[1], start: match.index })
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].start
    const end = i + 1 < positions.length ? positions[i + 1].start : prompt.length
    const sectionText = prompt.slice(start, end)
    sections.push({
      name: positions[i].name,
      tokens: estimateTokens(sectionText),
    })
  }

  return sections
}

/**
 * Build a complete trace object from the assembled system prompt.
 */
export function buildTrace(
  prompt: string,
  wasTrimmed: boolean,
  droppedSections: string[],
  preferences: { tone?: string; proactivity?: string; responseLength?: string },
  dataSources: string[],
): SandyTraceData {
  const sections = collectTraceSections(prompt)
  return {
    sections,
    totalTokens: estimateTokens(prompt),
    wasTrimmed,
    droppedSections,
    preferences,
    dataSources,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Encode trace data for the x-sandy-trace response header.
 * Keeps it compact — drops section token counts to save header space.
 */
export function encodeTraceHeader(trace: SandyTraceData): string {
  const compact = {
    s: trace.sections.map(s => s.name),
    t: trace.totalTokens,
    tr: trace.wasTrimmed,
    d: trace.droppedSections,
    p: trace.preferences,
    ds: trace.dataSources,
  }
  return Buffer.from(JSON.stringify(compact)).toString('base64')
}

/**
 * Decode the x-sandy-trace header back to a user-friendly trace object.
 */
export function decodeTraceHeader(header: string): SandyTraceData | null {
  try {
    const json = typeof window !== 'undefined'
      ? atob(header)
      : Buffer.from(header, 'base64').toString('utf-8')
    const compact = JSON.parse(json) as {
      s: string[]
      t: number
      tr: boolean
      d: string[]
      p: { tone?: string; proactivity?: string; responseLength?: string }
      ds: string[]
    }
    return {
      sections: compact.s.map(name => ({ name, tokens: 0 })),
      totalTokens: compact.t,
      wasTrimmed: compact.tr,
      droppedSections: compact.d,
      preferences: compact.p,
      dataSources: compact.ds,
      timestamp: new Date().toISOString(),
    }
  } catch {
    return null
  }
}
