import { getDataDeskTool } from './data-desk'

const SYSTEM_PROMPTS: Record<string, string> = {
  'chart-explainer':
    `Analyze the uploaded chart or graph. Organize your response under these Markdown section headers:

## What This Chart Shows
Describe the chart type, axes, data series, and what it represents in plain English.

## Key Takeaways
Bullet the 3-5 most important insights a viewer should take from this chart.

## Potential Misinterpretations
Identify ways this chart could be misleading — truncated axes, missing context, cherry-picked ranges, etc.

## Questions to Ask
Suggest 3-4 follow-up questions someone should ask before drawing conclusions from this chart.

Output ONLY the analysis. No preamble.`,

  'survey-analyzer':
    `Analyze the provided survey data or results. Organize your response under these Markdown section headers:

## Response Summary
Overview of the data — sample size, key demographics, response rates if available.

## Key Findings
The 3-5 most significant results with specific numbers/percentages.

## Notable Patterns
Trends, correlations, or surprising results that stand out.

## Recommendations
Actionable next steps based on the findings.

Output ONLY the analysis. No preamble.`,

  'report-summarizer':
    `Summarize the provided report or document. Organize your response under these Markdown section headers:

## Executive Summary
2-3 paragraph overview of the document's purpose, key arguments, and conclusions.

## Key Metrics
Bullet the most important numbers, statistics, or data points from the report.

## Action Items
Concrete next steps or recommendations mentioned in or implied by the report.

## Risks & Concerns
Issues, risks, or limitations flagged in the report or that you identify.

Output ONLY the summary. No preamble.`,

  'presentation-outliner':
    `Create a structured slide deck outline. Organize your response under this Markdown section header:

## Slide Outline

For each slide, format as:

### Slide N: [Title]
- Bullet point 1
- Bullet point 2
- Bullet point 3

**Speaker Notes:** [2-3 sentences the presenter should say]

Include an appropriate number of slides for the specified duration. Each slide should have 3-5 bullet points and speaker notes.

Output ONLY the outline. No preamble.`,
}

export function getSystemPrompt(slug: string): string {
  return SYSTEM_PROMPTS[slug] ?? 'You are a helpful data analysis assistant. Provide clear, structured analysis.'
}

export function buildUserMessage(slug: string, content: string): string {
  const tool = getDataDeskTool(slug)
  if (!tool) return content

  switch (slug) {
    case 'chart-explainer':
      return 'Please analyze the chart/graph I have uploaded.'
    case 'survey-analyzer':
      return `Here is the survey data to analyze:\n\n${content}`
    case 'report-summarizer':
      return `Here is the report text to summarize:\n\n${content}`
    case 'presentation-outliner':
      return content
    default:
      return content
  }
}

export function buildFormMessage(formData: Record<string, string>): string {
  const tool = getDataDeskTool('presentation-outliner')
  if (!tool?.fields) return Object.values(formData).join('\n\n')

  const parts = tool.fields
    .filter(f => formData[f.name]?.trim())
    .map(f => `**${f.label}:** ${formData[f.name].trim()}`)

  return `Create a presentation outline based on these details:\n\n${parts.join('\n\n')}`
}
