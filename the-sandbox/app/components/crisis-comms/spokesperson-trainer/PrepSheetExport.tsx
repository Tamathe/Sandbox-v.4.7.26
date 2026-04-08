'use client'

import { FileDown } from 'lucide-react'
import type { DrillScores, AnswerAnnotation } from '../../../lib/crisis-comms/spokesperson-trainer/types'

interface PrepSheetExportProps {
  scenarioTitle: string
  difficulty: string
  userRole: string
  keyMessages: string[]
  scores: DrillScores
  debriefText: string
  annotations: AnswerAnnotation[]
}

function stripMarkers(text: string): string {
  return text
    .replace(/<!--[^>]*-->/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function PrepSheetExport({
  scenarioTitle,
  difficulty,
  userRole,
  keyMessages,
  scores,
  debriefText,
  annotations,
}: PrepSheetExportProps) {
  const avg = ((scores.clarity + scores.empathy + scores.speculationControl + scores.messageDiscipline) / 4).toFixed(1)

  const weakAnswers = annotations
    .filter((a) => a.rating === 'weak')
    .slice(0, 3)

  const handleExport = () => {
    const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Crisis Spokesperson Prep Sheet — ${scenarioTitle}</title>
  <style>
    @media print { body { font-size: 11pt; } .no-print { display: none; } }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a; line-height: 1.5; }
    h1 { font-size: 22px; color: #0033A0; margin: 0 0 4px; }
    h2 { font-size: 16px; color: #0033A0; margin: 24px 0 8px; border-bottom: 2px solid #0033A0; padding-bottom: 4px; }
    h3 { font-size: 14px; margin: 16px 0 4px; }
    .meta { font-size: 13px; color: #666; margin-bottom: 20px; }
    .score-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 12px 0; }
    .score-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
    .score-card .value { font-size: 24px; font-weight: 800; color: #0033A0; }
    .score-card .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .key-msg { padding: 4px 0; display: flex; align-items: center; gap: 8px; }
    .key-msg .dot { width: 8px; height: 8px; border-radius: 50%; }
    .landed { background: #16a34a; }
    .missed { background: #dc2626; }
    .weak-answer { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin: 8px 0; }
    .improvement { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin: 4px 0; }
    .footer { margin-top: 32px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>Crisis Spokesperson Prep Sheet</h1>
  <div class="meta">${scenarioTitle} &bull; ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} &bull; ${userRole} &bull; Overall: ${avg}/10</div>

  <h2>Scores</h2>
  <div class="score-grid">
    <div class="score-card"><div class="value">${scores.clarity}</div><div class="label">Clarity</div></div>
    <div class="score-card"><div class="value">${scores.empathy}</div><div class="label">Empathy</div></div>
    <div class="score-card"><div class="value">${scores.speculationControl}</div><div class="label">Spec. Control</div></div>
    <div class="score-card"><div class="value">${scores.messageDiscipline}</div><div class="label">Msg Discipline</div></div>
  </div>

  ${keyMessages.length > 0 ? `
  <h2>Key Messages</h2>
  ${keyMessages.map((msg) => {
    const landed = annotations.some((a) => a.keyMessagesLanded.includes(msg))
    return `<div class="key-msg"><span class="dot ${landed ? 'landed' : 'missed'}"></span>${landed ? '&#10003;' : '&#10007;'} ${msg}</div>`
  }).join('')}
  ` : ''}

  ${weakAnswers.length > 0 ? `
  <h2>Top Improvement Areas</h2>
  ${weakAnswers.map((a) => `
    <div class="weak-answer">
      <h3>Q${a.questionIndex + 1}: ${a.reporterQuestion}</h3>
      <p><strong>Your answer:</strong> "${a.userAnswer}"</p>
      <p><strong>Coach note:</strong> ${a.note}</p>
    </div>
  `).join('')}
  ` : ''}

  <h2>Full Debrief</h2>
  <div>${stripMarkers(debriefText).split('\n').map((line) =>
    line.startsWith('## ') ? `<h3>${line.replace('## ', '')}</h3>` :
    line.startsWith('- ') ? `<p>&bull; ${line.replace('- ', '')}</p>` :
    line ? `<p>${line}</p>` : ''
  ).join('')}</div>

  <div class="footer">
    Crisis Spokesperson Trainer &bull; University of Kentucky CATS-AI
  </div>
</body>
</html>`

    const blob = new Blob([content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const w = window.open(url, '_blank')
    if (w) {
      w.addEventListener('load', () => {
        w.print()
      })
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0033A0] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
    >
      <FileDown className="size-4" />
      Export Prep Sheet
    </button>
  )
}
