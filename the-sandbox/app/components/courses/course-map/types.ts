import type {
  CourseMapResult,
  CourseMapWeek,
  CourseMapObjective,
  CourseMapMaterial,
  CourseMapAssignment,
  ConfirmResult,
  CourseMapProgress,
  CourseMapEditEntry,
  CourseMapComparison,
  PrerequisiteGraph,
  StudentWeekProgress,
  GapAnalysisResult,
  CourseMapCommentEntry,
  WorkloadMetrics,
  CourseMapNoteEntry,
  AlignmentIssue,
  AssignmentSuggestion,
} from '../../../lib/course-map-service'
import type { SnapshotSummary, RebalanceSuggestion, ShareAnalytics, BloomLevel, BloomTagResult, CourseMapRubricResult } from '../../../lib/course-map-service'

// Re-export all types that extracted components need
export type {
  CourseMapResult,
  CourseMapWeek,
  CourseMapObjective,
  CourseMapMaterial,
  CourseMapAssignment,
  ConfirmResult,
  CourseMapProgress,
  CourseMapEditEntry,
  CourseMapComparison,
  PrerequisiteGraph,
  StudentWeekProgress,
  GapAnalysisResult,
  CourseMapCommentEntry,
  WorkloadMetrics,
  CourseMapNoteEntry,
  AlignmentIssue,
  AssignmentSuggestion,
  SnapshotSummary,
  RebalanceSuggestion,
  ShareAnalytics,
  BloomLevel,
  BloomTagResult,
  CourseMapRubricResult,
}

// ── Local types ──────────────────────────────────────────────────────────────

export type ViewState = 'loading' | 'empty' | 'generating' | 'preview' | 'saved' | 'diff'

export type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged'

export type MaterialSuggestion = {
  title: string
  materialType: string
  rationale: string
}

// ── Bloom's Taxonomy constants ──────────────────────────────────────────────

export const BLOOM_LEVELS: BloomLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']

export const BLOOM_LABELS: Record<BloomLevel, string> = {
  remember: 'Remember',
  understand: 'Understand',
  apply: 'Apply',
  analyze: 'Analyze',
  evaluate: 'Evaluate',
  create: 'Create',
}

export const BLOOM_COLORS: Record<BloomLevel, string> = {
  remember: 'bg-gray-100 text-gray-700',
  understand: 'bg-blue-100 text-blue-700',
  apply: 'bg-emerald-100 text-emerald-700',
  analyze: 'bg-amber-100 text-amber-700',
  evaluate: 'bg-purple-100 text-purple-700',
  create: 'bg-rose-100 text-rose-700',
}

export const BLOOM_PRINT_COLORS: Record<BloomLevel, string> = {
  remember: '#6b7280',
  understand: '#2563eb',
  apply: '#059669',
  analyze: '#d97706',
  evaluate: '#7c3aed',
  create: '#e11d48',
}

// ── Label constants ──────────────────────────────────────────────────────────

export const MATERIAL_TYPE_LABELS: Record<string, string> = {
  syllabus: 'Syllabus',
  lecture: 'Lecture',
  reading: 'Reading',
  assignment: 'Assignment',
  case: 'Case Study',
  rubric: 'Rubric',
  quiz: 'Quiz',
}

export const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  TEXT_SUBMISSION: 'Text / File',
  AI_EXPERIENCE: 'AI Experience',
  FILE_UPLOAD: 'File Upload',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function courseHeaders(email: string, json = false) {
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    'x-demo-user-email': email,
  }
}

export function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Diff helpers ─────────────────────────────────────────────────────────────

export function computeWeekDiff(
  oldWeeks: CourseMapWeek[],
  newWeeks: CourseMapWeek[]
): { status: DiffStatus; oldWeek: CourseMapWeek | null; newWeek: CourseMapWeek | null }[] {
  const result: { status: DiffStatus; oldWeek: CourseMapWeek | null; newWeek: CourseMapWeek | null }[] = []
  const maxLen = Math.max(oldWeeks.length, newWeeks.length)

  for (let i = 0; i < maxLen; i++) {
    const old = oldWeeks[i] ?? null
    const nw = newWeeks[i] ?? null

    if (!old && nw) {
      result.push({ status: 'added', oldWeek: null, newWeek: nw })
    } else if (old && !nw) {
      result.push({ status: 'removed', oldWeek: old, newWeek: null })
    } else if (old && nw) {
      const titleChanged = old.title !== nw.title
      const objCountChanged = old.objectives.length !== nw.objectives.length
      const matCountChanged = old.materials.length !== nw.materials.length
      const assignCountChanged = old.assignments.length !== nw.assignments.length
      const isModified = titleChanged || objCountChanged || matCountChanged || assignCountChanged
      result.push({ status: isModified ? 'modified' : 'unchanged', oldWeek: old, newWeek: nw })
    }
  }
  return result
}

// ── Export helpers ────────────────────────────────────────────────────────────

function generateMarkdown(weeks: CourseMapWeek[], courseCode?: string): string {
  const lines: string[] = []
  lines.push(`# Course Map${courseCode ? ` — ${courseCode}` : ''}`)
  lines.push(`Generated: ${new Date().toLocaleDateString()}\n`)

  for (const week of weeks) {
    lines.push(`## Week ${week.weekNumber}: ${week.title}`)
    if (week.topic) lines.push(`**Topic:** ${week.topic}`)
    if (week.startDate) lines.push(`**Dates:** ${week.startDate}${week.endDate ? ` — ${week.endDate}` : ''}`)
    lines.push('')

    if (week.objectives.length > 0) {
      lines.push('### Objectives')
      for (const o of week.objectives) lines.push(`- ${o.title}`)
      lines.push('')
    }

    if (week.materials.length > 0) {
      lines.push('### Materials')
      for (const m of week.materials) lines.push(`- [${MATERIAL_TYPE_LABELS[m.materialType] ?? m.materialType}] ${m.title}`)
      lines.push('')
    }

    if (week.assignments.length > 0) {
      lines.push('### Assignments')
      for (const a of week.assignments) {
        const pts = a.pointsPossible != null ? ` (${a.pointsPossible} pts)` : ''
        const due = a.dueDate ? ` — Due: ${a.dueDate}` : ''
        lines.push(`- **${a.title}** [${ASSIGNMENT_TYPE_LABELS[a.type] ?? a.type}]${pts}${due}`)
      }
      lines.push('')
    }

    if (week.toolSuggestions.length > 0) {
      lines.push('### Suggested Tools')
      for (const ts of week.toolSuggestions) lines.push(`- ${ts.title} (${ts.toolType}) — ${ts.rationale}`)
      lines.push('')
    }

    lines.push('---\n')
  }

  return lines.join('\n')
}

export function downloadMarkdown(weeks: CourseMapWeek[], courseCode?: string) {
  const md = generateMarkdown(weeks, courseCode)
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `course-map${courseCode ? `-${courseCode}` : ''}.md`
  a.click()
  URL.revokeObjectURL(url)
}

export function generatePrintLayout(
  weeks: CourseMapWeek[],
  courseCode?: string,
  metadata?: { totalWeeks: number; totalObjectives: number; totalAssignments: number; documentsProcessed: number; notice: string | null } | null,
  rubrics?: Map<string, CourseMapRubricResult>,
) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const totalObjectives = metadata?.totalObjectives ?? weeks.reduce((s, w) => s + w.objectives.length, 0)
  const totalAssignments = metadata?.totalAssignments ?? weeks.reduce((s, w) => s + w.assignments.length, 0)

  const weekSections = weeks.map((week) => {
    const dateRange = week.startDate
      ? `<p class="date-range">${week.startDate}${week.endDate ? ` — ${week.endDate}` : ''}</p>`
      : ''

    const objectives = week.objectives.length > 0
      ? `<h3>Objectives</h3><ol>${week.objectives.map((o) => {
          const bloomBadge = o.bloomLevel
            ? ` <span class="bloom-badge" style="background:${BLOOM_PRINT_COLORS[o.bloomLevel]}15;color:${BLOOM_PRINT_COLORS[o.bloomLevel]};border:1px solid ${BLOOM_PRINT_COLORS[o.bloomLevel]}40">${escHtml(BLOOM_LABELS[o.bloomLevel])}</span>`
            : ''
          return `<li>${escHtml(o.title)}${bloomBadge}${o.description ? `<br><span class="desc">${escHtml(o.description)}</span>` : ''}</li>`
        }).join('')}</ol>`
      : ''

    const materials = week.materials.length > 0
      ? `<h3>Materials</h3><ul>${week.materials.map((m) => `<li><span class="label">${escHtml(MATERIAL_TYPE_LABELS[m.materialType] ?? m.materialType)}</span> ${escHtml(m.title)}</li>`).join('')}</ul>`
      : ''

    const assignments = week.assignments.length > 0
      ? `<h3>Assignments</h3><ul>${week.assignments.map((a, aIdx) => {
          const pts = a.pointsPossible != null ? ` — ${a.pointsPossible} pts` : ''
          const due = a.dueDate ? ` — Due: ${a.dueDate}` : ''
          const rubric = rubrics?.get(`${week.weekNumber}-${aIdx}`)
          const rubricHtml = rubric
            ? `<div style="margin:4px 0 0 16px;padding:4px 8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;font-size:9pt"><strong style="color:#15803d">Rubric:</strong> ${rubric.criteria.map((c) => `${escHtml(c.criterion)} (${c.weight}%)`).join(', ')}</div>`
            : ''
          return `<li><strong>${escHtml(a.title)}</strong> <span class="label">${escHtml(ASSIGNMENT_TYPE_LABELS[a.type] ?? a.type)}</span>${pts}${due}${rubricHtml}</li>`
        }).join('')}</ul>`
      : ''

    const tools = week.toolSuggestions.length > 0
      ? `<h3>Suggested Tools</h3><ul>${week.toolSuggestions.map((t) => `<li><strong>${escHtml(t.title)}</strong> (${escHtml(t.toolType)})<br><span class="desc">${escHtml(t.rationale)}</span></li>`).join('')}</ul>`
      : ''

    return `<div class="week-section">
      <h2>Week ${week.weekNumber}: ${escHtml(week.title)}</h2>
      ${dateRange}${objectives}${materials}${assignments}${tools}
    </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>Course Map${courseCode ? ` — ${courseCode}` : ''}</title>
<style>
  @page { margin: 0.75in; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a; font-size: 12pt; line-height: 1.5; }
  .header { border-bottom: 3px solid #0033A0; padding-bottom: 12px; margin-bottom: 24px; }
  .header h1 { color: #0033A0; font-size: 22pt; margin: 0 0 4px 0; }
  .header .meta { color: #555; font-size: 10pt; margin: 0; }
  .week-section { border: 1px solid #ccc; border-radius: 6px; padding: 16px 20px; margin-bottom: 16px; page-break-inside: avoid; }
  h2 { color: #0033A0; font-size: 14pt; margin: 0 0 4px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  h3 { color: #333; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.5px; margin: 12px 0 6px 0; }
  .date-range { color: #666; font-size: 10pt; margin: 4px 0 8px 0; font-style: italic; }
  ol, ul { padding-left: 22px; margin: 4px 0 8px 0; }
  li { margin-bottom: 4px; font-size: 11pt; }
  .label { display: inline-block; background: #f0f4ff; color: #0033A0; font-size: 9pt; padding: 1px 6px; border-radius: 3px; font-family: Arial, sans-serif; }
  .desc { color: #666; font-size: 10pt; }
  .bloom-badge { display: inline-block; font-size: 8pt; padding: 1px 6px; border-radius: 3px; font-family: Arial, sans-serif; margin-left: 4px; font-weight: 600; }
  .footer { border-top: 2px solid #0033A0; margin-top: 32px; padding-top: 10px; text-align: center; color: #888; font-size: 9pt; }
  @media print {
    body { padding: 0; }
    .week-section { break-inside: avoid; border-color: #999; }
  }
</style></head><body>
<div class="header">
  <h1>${courseCode ? `${escHtml(courseCode)} — ` : ''}Course Map</h1>
  <p class="meta">Generated: ${escHtml(dateStr)} &nbsp;|&nbsp; ${weeks.length} weeks &nbsp;|&nbsp; ${totalObjectives} objectives &nbsp;|&nbsp; ${totalAssignments} assignments</p>
</div>
${weekSections}
<div class="footer">University of Kentucky &nbsp;|&nbsp; ${escHtml(now.toLocaleString())}</div>
</body></html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }
}

// ── CSV Export Helper ────────────────────────────────────────────────────────

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function generateCSV(weeks: CourseMapWeek[]): string {
  const rows: string[] = ['Week,Title,Topic,Start Date,End Date,Item Type,Item Title,Details']

  for (const week of weeks) {
    const wNum = String(week.weekNumber)
    const wTitle = csvEscape(week.title)
    const wTopic = csvEscape(week.topic ?? '')
    const wStart = week.startDate ?? ''
    const wEnd = week.endDate ?? ''
    const prefix = [wNum, wTitle, wTopic, wStart, wEnd]

    let hasItems = false

    for (const o of week.objectives) {
      hasItems = true
      rows.push([...prefix, 'Objective', csvEscape(o.title), csvEscape(o.description ?? '')].join(','))
    }

    for (const m of week.materials) {
      hasItems = true
      rows.push([...prefix, 'Material', csvEscape(m.title), csvEscape(MATERIAL_TYPE_LABELS[m.materialType] ?? m.materialType)].join(','))
    }

    for (const a of week.assignments) {
      hasItems = true
      const details: string[] = []
      if (a.type) details.push(ASSIGNMENT_TYPE_LABELS[a.type] ?? a.type)
      if (a.pointsPossible != null) details.push(`${a.pointsPossible} pts`)
      if (a.dueDate) details.push(`Due: ${a.dueDate}`)
      rows.push([...prefix, 'Assignment', csvEscape(a.title), csvEscape(details.join(' | '))].join(','))
    }

    for (const t of week.toolSuggestions) {
      hasItems = true
      rows.push([...prefix, 'Tool Suggestion', csvEscape(t.title), csvEscape(`${t.toolType} — ${t.rationale}`)].join(','))
    }

    if (!hasItems) {
      rows.push([...prefix, '', '', ''].join(','))
    }
  }

  return rows.join('\n')
}

export function downloadCSV(weeks: CourseMapWeek[], courseCode?: string) {
  const csv = generateCSV(weeks)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `course-map${courseCode ? `-${courseCode}` : ''}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── iCal Export Helper ───────────────────────────────────────────────────────

export function generateICalExport(weeks: CourseMapWeek[], courseId: string, courseCode?: string): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//University of Kentucky//Course Map//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  function formatDateAllDay(dateStr: string): string {
    const d = new Date(dateStr)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
  }

  function nextDay(dateStr: string): string {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + 1)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
  }

  const prefix = courseCode ? `${courseCode} — ` : ''

  for (const week of weeks) {
    if (week.startDate) {
      const dtstart = formatDateAllDay(week.startDate)
      const dtend = week.endDate ? nextDay(week.endDate) : nextDay(week.startDate)
      lines.push('BEGIN:VEVENT')
      lines.push(`UID:coursemap-${courseId}-week-${week.weekNumber}@sandbox`)
      lines.push(`DTSTART;VALUE=DATE:${dtstart}`)
      lines.push(`DTEND;VALUE=DATE:${dtend}`)
      lines.push(`SUMMARY:${prefix}Week ${week.weekNumber}: ${week.title}`)
      lines.push(`DESCRIPTION:${week.objectives.length} objectives\\, ${week.materials.length} materials\\, ${week.assignments.length} assignments`)
      lines.push('END:VEVENT')
    }

    // Assignment due dates
    week.assignments.forEach((a, aIdx) => {
      if (!a.dueDate) return
      const dtstart = formatDateAllDay(a.dueDate)
      const dtend = nextDay(a.dueDate)
      const pts = a.pointsPossible != null ? ` (${a.pointsPossible} pts)` : ''
      lines.push('BEGIN:VEVENT')
      lines.push(`UID:coursemap-${courseId}-assign-${week.weekNumber}-${aIdx}@sandbox`)
      lines.push(`DTSTART;VALUE=DATE:${dtstart}`)
      lines.push(`DTEND;VALUE=DATE:${dtend}`)
      lines.push(`SUMMARY:${courseCode ? `${courseCode} ` : ''}DUE: ${a.title}`)
      lines.push(`DESCRIPTION:${a.type}${pts}`)
      lines.push('END:VEVENT')
    })
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function hasAnyDates(weeks: CourseMapWeek[]): boolean {
  return weeks.some((w) => w.startDate || w.assignments.some((a) => a.dueDate))
}
