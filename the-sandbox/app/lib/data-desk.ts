export interface DataDeskField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select'
  placeholder?: string
  required: boolean
  options?: readonly string[]
}

export interface DataDeskTool {
  slug: string
  title: string
  description: string
  icon: string
  inputType: 'image' | 'text' | 'pdf' | 'form'
  model: string
  sections: readonly string[]
  fields?: readonly DataDeskField[]
}

export const DATA_DESK_TOOLS: DataDeskTool[] = [
  {
    slug: 'chart-explainer',
    title: 'Chart Explainer',
    description: 'Upload any chart or graph and get a plain-English explanation of what it shows',
    icon: 'BarChart3',
    inputType: 'image',
    model: 'claude-sonnet-4-6',
    sections: ['What This Chart Shows', 'Key Takeaways', 'Potential Misinterpretations', 'Questions to Ask'],
  },
  {
    slug: 'survey-analyzer',
    title: 'Survey Analyzer',
    description: 'Paste survey results or CSV data and get actionable insights',
    icon: 'ClipboardList',
    inputType: 'text',
    model: 'claude-haiku-4-5-20251001',
    sections: ['Response Summary', 'Key Findings', 'Notable Patterns', 'Recommendations'],
  },
  {
    slug: 'report-summarizer',
    title: 'Report Summarizer',
    description: 'Upload a report or document and get an executive summary with action items',
    icon: 'FileSearch',
    inputType: 'pdf',
    model: 'claude-haiku-4-5-20251001',
    sections: ['Executive Summary', 'Key Metrics', 'Action Items', 'Risks & Concerns'],
  },
  {
    slug: 'presentation-outliner',
    title: 'Presentation Outliner',
    description: 'Turn any topic into a structured slide deck outline with speaker notes',
    icon: 'Presentation',
    inputType: 'form',
    model: 'claude-haiku-4-5-20251001',
    sections: ['Slide Outline'],
    fields: [
      { name: 'topic', label: 'Presentation Topic', type: 'text', required: true },
      { name: 'audience', label: 'Audience', type: 'text', placeholder: 'e.g., Board of Directors, Freshman class', required: true },
      { name: 'duration', label: 'Duration', type: 'select', options: ['5 minutes', '10 minutes', '20 minutes', '30 minutes', '45 minutes'], required: true },
      { name: 'keyMessage', label: 'Key Message', type: 'textarea', placeholder: 'What is the one thing the audience should remember?', required: false },
    ],
  },
]

export function getDataDeskTool(slug: string): DataDeskTool | undefined {
  return DATA_DESK_TOOLS.find(t => t.slug === slug)
}
