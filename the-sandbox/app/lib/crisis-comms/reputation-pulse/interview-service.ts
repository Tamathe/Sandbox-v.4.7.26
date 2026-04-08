/**
 * interview-service.ts
 *
 * System prompt generation for Sandy's Reputation Pulse conversational layer.
 * The initial "ready" narration is now seeded (see seeded-analysis.ts).
 * This service only generates prompts for the "deep-dive" Q&A phase,
 * enriched with per-post sentiment/AI detection context.
 */

import type { RepPulseInterviewRequest } from './types'
import {
  SEEDED_SENTIMENT,
  SEEDED_AI_DETECTION,
} from './synthetic-data/seeded-analysis'
import { SPROUT_7DAY_POSTS } from './synthetic-data'

export function getInterviewPrompt(req: RepPulseInterviewRequest): string {
  const { preflight, interviewState, brief } = req
  const firstName = preflight.user.name.split(' ')[0]
  const phase = interviewState.phase

  const basePersonality = `You are Sandy, the University of Kentucky's AI crisis communications analyst. You're warm, direct, and professional. You speak like a seasoned comms director — clear, calm, no jargon unless the user is clearly an expert.`

  if (phase === 'deep-dive' || phase === 'ready') {
    const briefSummary = brief ? `
## Brief Context
- Threat level: ${brief.threatLevel}
- Sentiment: ${brief.sentimentDistribution.positive.count} positive, ${brief.sentimentDistribution.negative.count} negative, ${brief.sentimentDistribution.neutral.count} neutral
- Themes: ${brief.themes.map((t) => `"${t.label}" (${t.postIds.length} posts)`).join(', ')}
- AI-flagged negatives: ${brief.pipelineFunnel.aiFlaggedPosts} of ${brief.pipelineFunnel.negativePosts}
- Recommended posture: ${brief.responsePosture}
- Suggested actions: ${brief.suggestedActions.join('; ')}
- Evidence gaps: ${brief.evidenceGaps.join('; ')}
` : ''

    // Build per-post detail for AI-flagged posts so Sandy can answer specific questions
    const aiPostDetails = SEEDED_AI_DETECTION
      .filter((r) => r.verdict === 'likely-ai')
      .map((r) => {
        const post = SPROUT_7DAY_POSTS.find((p) => p.id === r.postId)
        return post ? `- **${r.postId}** (@${post.authorHandle}, ${post.platform}, account age: ${post.accountAgeDays}d, followers: ${post.followerCount})
  Text: "${post.text.slice(0, 200)}${post.text.length > 200 ? '...' : ''}"
  Verdict: ${r.verdict} (AI likelihood: ${Math.round(r.aiLikelihood * 100)}%, confidence: ${r.confidence})
  Signals: ${r.topSignals.join(', ')}
  Explanation: ${r.explanation}` : null
      }).filter(Boolean).join('\n\n')

    // Build summary of high-engagement negative posts (organic)
    const highEngagementNegative = SPROUT_7DAY_POSTS
      .filter((p) => {
        const sent = SEEDED_SENTIMENT.find((s) => s.postId === p.id)
        const ai = SEEDED_AI_DETECTION.find((r) => r.postId === p.id)
        return sent?.sentiment === 'negative' && ai?.verdict === 'likely-human'
      })
      .sort((a, b) => (b.likes + b.shares + b.replies) - (a.likes + a.shares + a.replies))
      .slice(0, 5)
      .map((p) => {
        const sent = SEEDED_SENTIMENT.find((s) => s.postId === p.id)
        return `- **${p.id}** (@${p.authorHandle}, ${p.platform}, ${p.likes + p.shares + p.replies} engagements)
  Text: "${p.text.slice(0, 200)}${p.text.length > 200 ? '...' : ''}"
  Sentiment reason: ${sent?.reason ?? 'N/A'}`
      }).join('\n\n')

    return `${basePersonality}

${firstName} is in the deep-dive phase after seeing their 7-day Crisis Intelligence Brief.
${briefSummary}
## AI-Flagged Posts (full detail)
${aiPostDetails}

## Top Organic Negative Posts (by engagement)
${highEngagementNegative}

They may ask follow-up questions, request specific post analysis, or want help drafting responses.

If they ask about AI-flagged posts, reference the specific posts above — cite handles, signals, and account metadata. Use risk language.
If they ask about themes, walk through each theme and its sentiment breakdown with sample quotes.
If they ask for a holding statement, draft one appropriate for a university communications office. Match the issue they're asking about.
If they ask about threat level, explain the rationale and what would change it.
If they ask "what can we ignore?", focus on the AI-flagged low-engagement posts and neutral logistics posts.

Always use risk language. Never say "this IS a bot" — say "this shows patterns consistent with automated posting."

If appropriate, end with chips for further exploration.`
  }

  // Default fallback
  return `${basePersonality}

Help ${firstName} with their crisis communications analysis. You are in the Reputation Pulse tool analyzing 7 days of social media activity around UK. Be direct, use risk language, and offer actionable advice.`
}
