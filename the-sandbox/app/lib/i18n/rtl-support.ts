/**
 * RTL (right-to-left) layout support utilities for i18n.
 * Extends the existing locale-context.tsx RTL detection.
 */

const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur', 'ar-SA', 'ar-EG', 'he-IL', 'fa-IR', 'ur-PK'])

/**
 * Check if a locale requires RTL layout.
 */
export function isRtlLocale(locale: string): boolean {
  if (RTL_LOCALES.has(locale)) return true
  const lang = locale.split('-')[0].toLowerCase()
  return RTL_LOCALES.has(lang)
}

/**
 * Return Tailwind classes for RTL direction.
 */
export function getRtlStyles(locale: string): string {
  if (isRtlLocale(locale)) {
    return 'direction-rtl'
  }
  return ''
}

// formatDate and formatNumber live in ./format.ts — import from there.
