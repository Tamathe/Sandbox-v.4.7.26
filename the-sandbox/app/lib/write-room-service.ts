import { getWriteRoomTool } from './write-room'

const SYSTEM_PROMPTS: Record<string, string> = {
  'resume-builder':
    'Generate a professional resume in Markdown. Use ## for section headers (Summary, Experience, Education, Skills). Use bullet points for accomplishments. Start each bullet with a strong action verb. Quantify results where possible. Output ONLY the resume content in Markdown. No preamble, no meta-commentary.',

  'cover-letter':
    'Write a 3-4 paragraph cover letter in Markdown. Opening: hook + role. Middle: 2 paragraphs connecting experience to requirements. Closing: call to action. Output ONLY the letter, no preamble, no meta-commentary.',

  'email-rewriter':
    'Rewrite the email with the requested tone. Output ONLY the rewritten email. Preserve the core message and all factual content. No preamble, no meta-commentary.',

  'linkedin-optimizer':
    'Output 4 sections separated by ## Headline, ## About, ## Experience Bullets, ## Skills to Add. Each section contains the optimized content. Output ONLY the sections, no preamble, no meta-commentary.',
}

export function getSystemPrompt(slug: string): string {
  return SYSTEM_PROMPTS[slug] ?? 'You are a helpful writing assistant. Output only the requested content.'
}

export function buildUserMessage(slug: string, formData: Record<string, string>): string {
  const tool = getWriteRoomTool(slug)
  if (!tool) return Object.values(formData).join('\n\n')

  const parts = tool.fields
    .filter(f => formData[f.name]?.trim())
    .map(f => `**${f.label}:** ${formData[f.name].trim()}`)

  return parts.join('\n\n')
}
