// ─── Export Service ──────────────────────────────────────────
// CSV generation utility for staff data exports.
// No external dependencies — uses string concatenation with
// proper escaping and BOM prefix for Excel compatibility.

export interface ExportColumn {
  key: string
  label: string
  format?: 'date' | 'currency' | 'percent'
}

// ── Format helpers ──────────────────────────────────────────

function formatDate(value: unknown): string {
  if (!value) return ''
  const d = new Date(value as string | number | Date)
  if (isNaN(d.getTime())) return String(value)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatCurrency(value: unknown): string {
  if (value == null || value === '') return ''
  const n = Number(value)
  if (isNaN(n)) return String(value)
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatPercent(value: unknown): string {
  if (value == null || value === '') return ''
  const n = Number(value)
  if (isNaN(n)) return String(value)
  return `${n.toFixed(1)}%`
}

function formatValue(value: unknown, format?: ExportColumn['format']): string {
  if (format === 'date') return formatDate(value)
  if (format === 'currency') return formatCurrency(value)
  if (format === 'percent') return formatPercent(value)
  if (value == null) return ''
  return String(value)
}

// ── CSV escaping ────────────────────────────────────────────

function escapeCSVField(value: string): string {
  // If the field contains commas, quotes, or newlines, wrap in double quotes
  // and escape any internal double quotes by doubling them
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// ── Main export ─────────────────────────────────────────────

/**
 * Generate a CSV string from an array of records and column definitions.
 * Includes BOM prefix (\uFEFF) for Excel compatibility.
 */
export function generateCSV(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
): string {
  // Header row
  const header = columns.map((col) => escapeCSVField(col.label)).join(',')

  // Data rows
  const rows = data.map((record) =>
    columns
      .map((col) => {
        const raw = record[col.key]
        const formatted = formatValue(raw, col.format)
        return escapeCSVField(formatted)
      })
      .join(','),
  )

  // BOM + header + rows
  return '\uFEFF' + [header, ...rows].join('\r\n') + '\r\n'
}
