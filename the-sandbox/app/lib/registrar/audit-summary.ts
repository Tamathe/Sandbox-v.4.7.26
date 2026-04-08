import Anthropic from '@anthropic-ai/sdk'
import type { RequirementAuditResult } from './types'
import type { StudentProfile } from '../sis'

const client = new Anthropic()

export async function generateAuditSummary(
  results: RequirementAuditResult[],
  profile: StudentProfile,
  programName: string,
): Promise<{ recommendedActions: string[] }> {
  const satisfied = results.filter((r) => r.status === 'SATISFIED').length
  const inProgress = results.filter((r) => r.status === 'IN_PROGRESS').length
  const notStarted = results.filter((r) => r.status === 'NOT_STARTED').length

  const prompt = `You are an academic advisor assistant. A degree audit has been completed for a student in ${programName}.

Summary:
- Requirements satisfied: ${satisfied}/${results.length}
- Requirements in progress: ${inProgress}
- Requirements not started: ${notStarted}
- Credits completed: ${results.reduce((s, r) => s + r.creditsCompleted, 0)}

Requirements needing attention:
${results
  .filter((r) => r.status !== 'SATISFIED')
  .map((r) => `- ${r.requirementName}: ${r.creditsCompleted}/${r.creditsRequired} credits completed`)
  .join('\n')}

Generate exactly 3 specific, actionable recommended next steps for the student. Each should be a single sentence starting with a verb. Focus on the most important gaps. Do not make graduation decisions.

Return ONLY a JSON array of 3 strings, e.g.: ["Register for...", "Meet with...", "Review..."]`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '[]'
    const actions = JSON.parse(text) as string[]
    return { recommendedActions: Array.isArray(actions) ? actions.slice(0, 3) : [] }
  } catch {
    // Fallback if AI call fails
    const fallback: string[] = []
    const missing = results.filter((r) => r.status !== 'SATISFIED')
    if (missing[0]) fallback.push(`Meet with your advisor to discuss ${missing[0].requirementName}.`)
    if (missing[1]) fallback.push(`Enroll in courses to satisfy ${missing[1].requirementName}.`)
    fallback.push('Contact the Registrar\'s Office if you have questions about your audit.')
    return { recommendedActions: fallback }
  }
}
