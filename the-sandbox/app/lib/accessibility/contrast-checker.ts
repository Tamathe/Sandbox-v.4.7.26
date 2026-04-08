/**
 * ADA Compliance — Color Contrast Validation
 *
 * WCAG 2.1 AA contrast ratio checks for HTML content. Parses inline styles,
 * <style> blocks, and common Tailwind color classes to detect foreground/background
 * pairs that fail the 4.5:1 (normal text) or 3:1 (large text) thresholds.
 *
 * Suggests the nearest accessible color alternative for each violation.
 */

import { scoreToGrade } from './types'
import type { AccessibilityGrade, ContrastResult, ContrastViolation } from './types'

// ── Color utilities ──────────────────────────────────────────────────────────

/** Parse hex color (#RGB or #RRGGBB) to [r, g, b] (0-255). */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ]
  }
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ]
}

/** Convert [r, g, b] (0-255) back to hex. */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`
}

/** Parse rgb(r, g, b) or rgba(r, g, b, a) to hex. Returns null if unparseable. */
function parseRgbString(str: string): string | null {
  const match = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (!match) return null
  return rgbToHex(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]))
}

/**
 * WCAG 2.1 relative luminance.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * WCAG contrast ratio between two colors.
 * Returns a value >= 1.0 (1:1 = identical, 21:1 = max contrast).
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1)
  const l2 = relativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Find the nearest accessible foreground color by adjusting lightness.
 * Iteratively darkens or lightens the foreground until it meets the required ratio.
 */
export function suggestAccessibleColor(
  foreground: string,
  background: string,
  requiredRatio: number,
): string {
  const bgLum = relativeLuminance(background)
  const fgRgb = hexToRgb(foreground)

  // Determine direction: if fg is lighter than bg, darken fg; else lighten
  const fgLum = relativeLuminance(foreground)
  const shouldDarken = fgLum > bgLum

  let best = foreground
  let bestRatio = contrastRatio(foreground, background)

  for (let step = 1; step <= 50; step++) {
    const factor = shouldDarken ? 1 - step * 0.02 : 1 + step * 0.02
    const adjusted = rgbToHex(
      fgRgb[0] * factor,
      fgRgb[1] * factor,
      fgRgb[2] * factor,
    )
    const ratio = contrastRatio(adjusted, background)

    if (ratio >= requiredRatio) {
      return adjusted
    }
    if (ratio > bestRatio) {
      best = adjusted
      bestRatio = ratio
    }
  }

  // Fallback: try black or white
  if (contrastRatio('#000000', background) >= requiredRatio) return '#000000'
  if (contrastRatio('#ffffff', background) >= requiredRatio) return '#ffffff'
  return best
}

/**
 * Find the nearest accessible background color.
 */
function suggestAccessibleBackground(
  foreground: string,
  background: string,
  requiredRatio: number,
): string {
  const bgRgb = hexToRgb(background)
  const fgLum = relativeLuminance(foreground)
  const bgLum = relativeLuminance(background)
  const shouldLighten = bgLum < fgLum

  for (let step = 1; step <= 50; step++) {
    const factor = shouldLighten ? 1 + step * 0.02 : 1 - step * 0.02
    const adjusted = rgbToHex(
      bgRgb[0] * factor,
      bgRgb[1] * factor,
      bgRgb[2] * factor,
    )
    const ratio = contrastRatio(foreground, adjusted)
    if (ratio >= requiredRatio) return adjusted
  }

  if (contrastRatio(foreground, '#ffffff') >= requiredRatio) return '#ffffff'
  if (contrastRatio(foreground, '#000000') >= requiredRatio) return '#000000'
  return background
}

// ── Tailwind color map (common classes → hex) ────────────────────────────────

const TAILWIND_COLORS: Record<string, string> = {
  // Grays
  'gray-50': '#f9fafb', 'gray-100': '#f3f4f6', 'gray-200': '#e5e7eb',
  'gray-300': '#d1d5db', 'gray-400': '#9ca3af', 'gray-500': '#6b7280',
  'gray-600': '#4b5563', 'gray-700': '#374151', 'gray-800': '#1f2937', 'gray-900': '#111827',
  // Reds
  'red-50': '#fef2f2', 'red-100': '#fee2e2', 'red-200': '#fecaca',
  'red-500': '#ef4444', 'red-600': '#dc2626', 'red-700': '#b91c1c',
  // Blues
  'blue-50': '#eff6ff', 'blue-100': '#dbeafe', 'blue-200': '#bfdbfe',
  'blue-500': '#3b82f6', 'blue-600': '#2563eb', 'blue-700': '#1d4ed8',
  // Greens
  'green-50': '#f0fdf4', 'green-100': '#dcfce7', 'green-200': '#bbf7d0',
  'green-500': '#22c55e', 'green-600': '#16a34a', 'green-700': '#15803d',
  // Yellows / Ambers
  'yellow-50': '#fefce8', 'yellow-500': '#eab308', 'amber-500': '#f59e0b',
  // Common UI
  'white': '#ffffff', 'black': '#000000',
  'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-700': '#334155', 'slate-900': '#0f172a',
  'zinc-50': '#fafafa', 'zinc-100': '#f4f4f5', 'zinc-700': '#3f3f46', 'zinc-900': '#18181b',
}

// ── HTML parsing ─────────────────────────────────────────────────────────────

interface ColorPair {
  element: string
  foreground: string
  background: string
  isLargeText: boolean
}

/** Extract color pairs from inline styles in HTML content. */
function extractInlineStyles(html: string): ColorPair[] {
  const pairs: ColorPair[] = []

  // Match elements with style attributes containing color/background
  const stylePattern = /style\s*=\s*["']([^"']+)["']/gi
  let match

  while ((match = stylePattern.exec(html)) !== null) {
    const styleStr = match[1]
    let fg: string | null = null
    let bg: string | null = null
    let isLarge = false

    // Extract color
    const colorMatch = styleStr.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)
    if (colorMatch) fg = parseColor(colorMatch[1].trim())

    // Extract background-color
    const bgMatch = styleStr.match(/background(?:-color)?\s*:\s*([^;]+)/i)
    if (bgMatch) bg = parseColor(bgMatch[1].trim())

    // Detect large text (font-size >= 18px or >= 14px bold)
    const sizeMatch = styleStr.match(/font-size\s*:\s*(\d+(?:\.\d+)?)(px|pt|em|rem)/i)
    if (sizeMatch) {
      const size = parseFloat(sizeMatch[1])
      const unit = sizeMatch[2].toLowerCase()
      const pxSize = unit === 'pt' ? size * 1.333 : unit === 'em' || unit === 'rem' ? size * 16 : size
      isLarge = pxSize >= 18 || (pxSize >= 14 && /font-weight\s*:\s*(bold|[7-9]00)/i.test(styleStr))
    }

    // Build element description from surrounding context
    const contextStart = Math.max(0, match.index - 30)
    const context = html.substring(contextStart, match.index)
    const tagMatch = context.match(/<(\w+)/)
    const element = tagMatch ? `<${tagMatch[1]}>` : 'element'

    if (fg && bg) {
      pairs.push({ element: `${element} (inline style)`, foreground: fg, background: bg, isLargeText: isLarge })
    } else if (fg) {
      // No explicit bg — assume white
      pairs.push({ element: `${element} (inline style)`, foreground: fg, background: '#ffffff', isLargeText: isLarge })
    } else if (bg && bg !== '#ffffff' && bg !== '#000000') {
      // Colored background with default text
      pairs.push({ element: `${element} (inline style)`, foreground: '#000000', background: bg, isLargeText: isLarge })
    }
  }

  return pairs
}

/** Extract color pairs from <style> blocks. */
function extractStyleBlocks(html: string): ColorPair[] {
  const pairs: ColorPair[] = []
  const styleBlockPattern = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let blockMatch

  while ((blockMatch = styleBlockPattern.exec(html)) !== null) {
    const css = blockMatch[1]

    // Parse CSS rules
    const rulePattern = /([^{}]+)\{([^}]+)\}/g
    let ruleMatch
    while ((ruleMatch = rulePattern.exec(css)) !== null) {
      const selector = ruleMatch[1].trim()
      const declarations = ruleMatch[2]

      let fg: string | null = null
      let bg: string | null = null

      const colorMatch = declarations.match(/(?:^|;)\s*color\s*:\s*([^;!]+)/i)
      if (colorMatch) fg = parseColor(colorMatch[1].trim())

      const bgMatch = declarations.match(/background(?:-color)?\s*:\s*([^;!]+)/i)
      if (bgMatch) bg = parseColor(bgMatch[1].trim())

      if (fg && bg) {
        pairs.push({ element: selector, foreground: fg, background: bg, isLargeText: false })
      } else if (fg) {
        pairs.push({ element: selector, foreground: fg, background: '#ffffff', isLargeText: false })
      } else if (bg && bg !== '#ffffff') {
        pairs.push({ element: selector, foreground: '#000000', background: bg, isLargeText: false })
      }
    }
  }

  return pairs
}

/** Extract color pairs from Tailwind classes. */
function extractTailwindColors(html: string): ColorPair[] {
  const pairs: ColorPair[] = []
  const classPattern = /class\s*=\s*["']([^"']+)["']/gi
  let match

  while ((match = classPattern.exec(html)) !== null) {
    const classes = match[1].split(/\s+/)

    let fg: string | null = null
    let bg: string | null = null
    let isLarge = false

    for (const cls of classes) {
      // text-{color}
      const textMatch = cls.match(/^text-([\w-]+)$/)
      if (textMatch && TAILWIND_COLORS[textMatch[1]]) {
        fg = TAILWIND_COLORS[textMatch[1]]
      }

      // bg-{color}
      const bgMatch = cls.match(/^bg-([\w-]+)$/)
      if (bgMatch && TAILWIND_COLORS[bgMatch[1]]) {
        bg = TAILWIND_COLORS[bgMatch[1]]
      }

      // Detect large text hints
      if (/^text-(xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/.test(cls)) isLarge = true
      if (/^font-(bold|extrabold|black)$/.test(cls) && /^text-(lg|xl)$/.test(cls)) isLarge = true
    }

    // Build element context
    const contextStart = Math.max(0, match.index - 20)
    const context = html.substring(contextStart, match.index)
    const tagMatch = context.match(/<(\w+)/)
    const element = tagMatch ? `<${tagMatch[1]}>` : 'element'

    if (fg && bg) {
      pairs.push({ element: `${element} (Tailwind)`, foreground: fg, background: bg, isLargeText: isLarge })
    }
  }

  return pairs
}

/** Parse a CSS color value to hex. Supports hex, rgb(), named colors. */
function parseColor(value: string): string | null {
  // Hex
  if (/^#[0-9a-f]{3,6}$/i.test(value)) return value.toLowerCase()

  // rgb/rgba
  const rgbResult = parseRgbString(value)
  if (rgbResult) return rgbResult

  // Named colors (common subset)
  const named: Record<string, string | null> = {
    white: '#ffffff', black: '#000000', red: '#ff0000', green: '#008000',
    blue: '#0000ff', yellow: '#ffff00', gray: '#808080', grey: '#808080',
    orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', brown: '#a52a2a',
    navy: '#000080', teal: '#008080', maroon: '#800000', silver: '#c0c0c0',
    transparent: null,
  }
  return named[value.toLowerCase()] ?? null
}

// ── Main check function ──────────────────────────────────────────────────────

/**
 * Check HTML content for WCAG AA contrast violations.
 * Parses inline styles, <style> blocks, and Tailwind color classes.
 */
export function checkContrast(htmlContent: string): ContrastResult {
  // Collect all color pairs from different sources
  const pairs = [
    ...extractInlineStyles(htmlContent),
    ...extractStyleBlocks(htmlContent),
    ...extractTailwindColors(htmlContent),
  ]

  // Deduplicate by fg+bg+element
  const seen = new Set<string>()
  const unique = pairs.filter((p) => {
    const key = `${p.foreground}|${p.background}|${p.element}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const violations: ContrastViolation[] = []

  for (const pair of unique) {
    const ratio = contrastRatio(pair.foreground, pair.background)
    const requiredRatio = pair.isLargeText ? 3.0 : 4.5

    if (ratio < requiredRatio) {
      violations.push({
        element: pair.element,
        foreground: pair.foreground,
        background: pair.background,
        ratio: Math.round(ratio * 100) / 100,
        requiredRatio,
        isLargeText: pair.isLargeText,
        level: 'AA',
        suggestion: {
          adjustedForeground: suggestAccessibleColor(pair.foreground, pair.background, requiredRatio),
          adjustedBackground: suggestAccessibleBackground(pair.foreground, pair.background, requiredRatio),
        },
      })
    }
  }

  const score = unique.length === 0
    ? 1.0
    : Math.max(0, 1 - violations.length / Math.max(unique.length, 1))

  return {
    passes: violations.length === 0,
    violations,
    score: Math.round(score * 100) / 100,
    checkedPairs: unique.length,
  }
}

/**
 * Grade the contrast result.
 */
export function contrastGrade(result: ContrastResult): AccessibilityGrade {
  return scoreToGrade(result.score)
}
