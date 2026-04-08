'use client'

import { useState, useRef } from 'react'
import { ClipboardCopy, Download, X, Check } from 'lucide-react'

interface RubricRow {
  criterion: string
  excellent: string
  proficient: string
  developing: string
  insufficient: string
}

interface PackExportProps {
  pack: {
    name: string
    disciplineFamily: string
    policyLanguage: string | null
    timelinePlan: { week: number; action: string }[] | null
    course?: { courseCode: string; title: string }
    items: Array<{
      id: string
      template: {
        title: string
        description: string
        aiTier: string
        aiLevel: string
        assignmentType: string
        syllabusLanguage: string
        rubricRows: RubricRow[]
        implementationNotes: string
      } | null
      customTitle: string | null
      customDescription: string | null
      customAiLevel: string | null
      customSyllabusLanguage: string | null
      customRubricRows: RubricRow[] | null
    }>
    checkpoints: Array<{
      checkpoint: { name: string; description: string; gradingWeight: string } | null
      customName: string | null
      customDescription: string | null
      customWeight: string | null
    }>
  }
  onClose: () => void
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function PackExport({ pack, onClose }: PackExportProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  const courseName = pack.course
    ? `${pack.course.courseCode} — ${pack.course.title}`
    : pack.name
  const dateStr = formatDate()
  const timeline = (pack.timelinePlan ?? []) as { week: number; action: string }[]

  const buildPlainText = (): string => {
    const lines: string[] = []

    lines.push('═══════════════════════════════════════════════')
    lines.push('AI Integration Starter Pack')
    lines.push(courseName)
    lines.push(`Generated ${dateStr} via CATS-AI · University of Kentucky`)
    lines.push('═══════════════════════════════════════════════')
    lines.push('')

    // Section 1: Policy
    lines.push('── SECTION 1: AI POLICY LANGUAGE ──────────────')
    lines.push('')
    lines.push(pack.policyLanguage ?? 'No policy language available.')
    lines.push('')

    // Section 2: Assignments
    lines.push(`── SECTION 2: ASSIGNMENTS (${pack.items.length} total) ───────────`)
    lines.push('')

    pack.items.forEach((item, idx) => {
      const title = item.customTitle ?? item.template?.title ?? 'Untitled'
      const aiLevel = item.customAiLevel ?? item.template?.aiLevel ?? 'N/A'
      const tier = item.template?.aiTier ?? 'N/A'
      const type = item.template?.assignmentType ?? 'N/A'
      const description = item.customDescription ?? item.template?.description ?? 'N/A'
      const syllabusLang = item.customSyllabusLanguage ?? item.template?.syllabusLanguage ?? ''
      const rubricRows = (item.customRubricRows ?? item.template?.rubricRows ?? []) as RubricRow[]
      const implNotes = item.template?.implementationNotes ?? ''

      lines.push(`ASSIGNMENT ${idx + 1}: ${title}`)
      lines.push(`AI Level: ${aiLevel}  ·  Tier: ${tier}  ·  Type: ${type}`)
      lines.push('')
      lines.push('Description:')
      lines.push(description)
      lines.push('')

      if (syllabusLang) {
        lines.push('Syllabus Language (copy-paste ready):')
        lines.push(syllabusLang)
        lines.push('')
      }

      if (rubricRows.length > 0) {
        lines.push('Assessment Rubric:')
        lines.push(['Criterion', 'Excellent', 'Proficient', 'Developing', 'Insufficient'].join('\t'))
        rubricRows.forEach(row => {
          lines.push([row.criterion, row.excellent, row.proficient, row.developing, row.insufficient].join('\t'))
        })
        lines.push('')
      }

      if (implNotes) {
        lines.push('Implementation Notes:')
        lines.push(implNotes)
        lines.push('')
      }

      lines.push('─────────────────────────────────────────────')
      lines.push('')
    })

    // Section 3: Checkpoints
    if (pack.checkpoints.length > 0) {
      lines.push('── SECTION 3: PROCESS CHECKPOINTS ─────────────')
      lines.push('')
      pack.checkpoints.forEach((cp, idx) => {
        const name = cp.customName ?? cp.checkpoint?.name ?? 'Checkpoint'
        const weight = cp.customWeight ?? cp.checkpoint?.gradingWeight ?? ''
        const desc = cp.customDescription ?? cp.checkpoint?.description ?? ''
        lines.push(`${idx + 1}. ${name}${weight ? ` — ${weight}` : ''}`)
        if (desc) lines.push(`   ${desc}`)
        lines.push('')
      })
    }

    // Section 4: Timeline
    if (timeline.length > 0) {
      lines.push('── SECTION 4: IMPLEMENTATION TIMELINE ─────────')
      lines.push('')
      timeline.forEach(step => {
        lines.push(`Week ${step.week}:  ${step.action}`)
      })
      lines.push('')
    }

    return lines.join('\n')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API failed silently
    }
  }

  const handleDownloadPdf = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Action bar */}
        <div
          className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between shrink-0"
          data-pack-export-actions
        >
          <h2 className="font-extrabold text-gray-900 text-lg">Export Pack</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check className="size-3.5 text-green-600" /> : <ClipboardCopy className="size-3.5" />}
              {copied ? 'Copied!' : 'Copy All'}
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#0033A0] rounded-lg hover:bg-[#002880] transition-colors"
            >
              <Download className="size-3.5" />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center size-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Document content */}
        <div className="overflow-y-auto flex-1">
          <div ref={printRef} className="p-8 pack-export-document">
            {/* Print-only styles */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * { visibility: hidden !important; }
                .pack-export-document, .pack-export-document * { visibility: visible !important; }
                .pack-export-document {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  padding: 1in !important;
                  font-family: Georgia, 'Times New Roman', serif !important;
                  font-size: 11pt !important;
                  color: #000 !important;
                }
                [data-pack-export-actions] { display: none !important; }
                .pack-export-section { page-break-inside: avoid; }
                .pack-export-rubric-table { border-collapse: collapse; width: 100%; }
                .pack-export-rubric-table th,
                .pack-export-rubric-table td {
                  border: 1px solid #333 !important;
                  padding: 4pt 6pt !important;
                  font-size: 9pt !important;
                }
                .pack-export-assignment { page-break-inside: avoid; }
              }
            ` }} />

            {/* Header */}
            <div className="text-center mb-8 pb-6" style={{ borderBottom: '3px double #0033A0' }}>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">AI Integration Starter Pack</h1>
              <p className="text-sm text-gray-700 font-medium">{courseName}</p>
              <p className="text-xs text-gray-500 mt-1">Generated {dateStr} via CATS-AI · University of Kentucky</p>
            </div>

            {/* Section 1: Policy */}
            <div className="mb-8 pack-export-section">
              <h2 className="text-sm font-extrabold text-[#0033A0] uppercase tracking-wider mb-3 pb-1" style={{ borderBottom: '1px solid #0033A0' }}>
                Section 1: AI Policy Language
              </h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {pack.policyLanguage ?? 'No policy language available.'}
              </p>
            </div>

            {/* Section 2: Assignments */}
            <div className="mb-8 pack-export-section">
              <h2 className="text-sm font-extrabold text-[#0033A0] uppercase tracking-wider mb-4 pb-1" style={{ borderBottom: '1px solid #0033A0' }}>
                Section 2: Assignments ({pack.items.length} total)
              </h2>

              <div className="space-y-6">
                {pack.items.map((item, idx) => {
                  const title = item.customTitle ?? item.template?.title ?? 'Untitled'
                  const aiLevel = item.customAiLevel ?? item.template?.aiLevel ?? 'N/A'
                  const tier = item.template?.aiTier ?? 'N/A'
                  const type = item.template?.assignmentType ?? 'N/A'
                  const description = item.customDescription ?? item.template?.description ?? 'N/A'
                  const syllabusLang = item.customSyllabusLanguage ?? item.template?.syllabusLanguage ?? ''
                  const rubricRows = (item.customRubricRows ?? item.template?.rubricRows ?? []) as RubricRow[]
                  const implNotes = item.template?.implementationNotes ?? ''

                  return (
                    <div key={item.id} className="pack-export-assignment border rounded-xl p-5 bg-gray-50/50">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-semibold text-gray-900">
                          Assignment {idx + 1}: {title}
                        </h3>
                        <div className="flex items-center gap-2 shrink-0 text-[10px] font-medium">
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{aiLevel}</span>
                          <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{tier}</span>
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{type}</span>
                        </div>
                      </div>

                      <div className="space-y-4 text-sm">
                        <div>
                          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{description}</p>
                        </div>

                        {syllabusLang && (
                          <div>
                            <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Syllabus Language (copy-paste ready)</h4>
                            <p className="text-gray-700 whitespace-pre-wrap bg-white border rounded-lg p-3 text-xs">{syllabusLang}</p>
                          </div>
                        )}

                        {rubricRows.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Assessment Rubric</h4>
                            <div className="overflow-x-auto">
                              <table className="pack-export-rubric-table w-full text-xs text-gray-600" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr>
                                    <th className="text-left py-2 px-2 font-semibold text-gray-700 bg-gray-100 border border-gray-200">Criterion</th>
                                    <th className="text-left py-2 px-2 font-semibold text-gray-700 bg-gray-100 border border-gray-200">Excellent</th>
                                    <th className="text-left py-2 px-2 font-semibold text-gray-700 bg-gray-100 border border-gray-200">Proficient</th>
                                    <th className="text-left py-2 px-2 font-semibold text-gray-700 bg-gray-100 border border-gray-200">Developing</th>
                                    <th className="text-left py-2 px-2 font-semibold text-gray-700 bg-gray-100 border border-gray-200">Insufficient</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rubricRows.map((row, i) => (
                                    <tr key={i}>
                                      <td className="py-1.5 px-2 font-medium text-gray-700 border border-gray-200">{row.criterion}</td>
                                      <td className="py-1.5 px-2 border border-gray-200">{row.excellent}</td>
                                      <td className="py-1.5 px-2 border border-gray-200">{row.proficient}</td>
                                      <td className="py-1.5 px-2 border border-gray-200">{row.developing}</td>
                                      <td className="py-1.5 px-2 border border-gray-200">{row.insufficient}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {implNotes && (
                          <div>
                            <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Implementation Notes</h4>
                            <p className="text-gray-700 whitespace-pre-wrap">{implNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Section 3: Checkpoints */}
            {pack.checkpoints.length > 0 && (
              <div className="mb-8 pack-export-section">
                <h2 className="text-sm font-extrabold text-[#0033A0] uppercase tracking-wider mb-3 pb-1" style={{ borderBottom: '1px solid #0033A0' }}>
                  Section 3: Process Checkpoints
                </h2>
                <div className="space-y-3">
                  {pack.checkpoints.map((cp, idx) => {
                    const name = cp.customName ?? cp.checkpoint?.name ?? 'Checkpoint'
                    const weight = cp.customWeight ?? cp.checkpoint?.gradingWeight ?? ''
                    const desc = cp.customDescription ?? cp.checkpoint?.description ?? ''
                    return (
                      <div key={idx} className="flex items-start gap-3">
                        <span className="text-sm font-semibold text-[#0033A0] shrink-0">{idx + 1}.</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {name}
                            {weight && <span className="text-gray-400 font-normal"> — {weight}</span>}
                          </p>
                          {desc && <p className="text-xs text-gray-600 mt-0.5">{desc}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Section 4: Timeline */}
            {timeline.length > 0 && (
              <div className="pack-export-section">
                <h2 className="text-sm font-extrabold text-[#0033A0] uppercase tracking-wider mb-3 pb-1" style={{ borderBottom: '1px solid #0033A0' }}>
                  Section 4: Implementation Timeline
                </h2>
                <div className="space-y-2">
                  {timeline.map((step, i) => (
                    <p key={i} className="text-sm text-gray-700">
                      <span className="font-semibold">Week {step.week}:</span>  {step.action}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
