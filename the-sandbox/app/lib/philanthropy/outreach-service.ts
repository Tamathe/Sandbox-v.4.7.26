/**
 * Philanthropy Assistant — outreach content generation.
 *
 * Generates phone scripts (Haiku, fast), emails, and follow-ups (Sonnet).
 * Prompts carried verbatim from the standalone Chaelyn Philanthropy app.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Business } from './types'

const anthropic = new Anthropic()
const SONNET = 'claude-sonnet-4-6'
const HAIKU = 'claude-haiku-4-5-20251001'

function cleanJSON(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

export interface OutreachContext {
  organization: string
  donationType: string[]
  philanthropy: string
  eventName?: string
  eventDate?: string
  desiredItems?: string[]
  city: string
  business: Business
}

// ── Phone Script (Haiku — fast) ─────────────────────────────────────────────

export async function generateScript(ctx: OutreachContext): Promise<string> {
  const itemsLine = ctx.desiredItems?.length
    ? `Specifically seeking: ${ctx.desiredItems.join(', ')}.`
    : ''

  const eventLine = ctx.eventName
    ? `Their event is called "${ctx.eventName}"${
        ctx.eventDate
          ? `, happening on ${new Date(ctx.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}`
          : ''
      }.`
    : ''

  const prompt = `You are helping ${ctx.organization}, a Greek life organization focused on "${ctx.philanthropy}", prepare for a donation solicitation phone call.

They need: ${ctx.donationType.join(' and ')}.
${eventLine}
${itemsLine}
They are located in ${ctx.city}.

Business to call:
Name: ${ctx.business.name}
Type: ${ctx.business.type}
Donation potential: ${ctx.business.donationPotential}
Community role: ${ctx.business.communityImpact}

Write a single personalized phone call script that:
- Opens with a warm, confident greeting that mentions ${ctx.business.name} by name
- Briefly introduces the caller, their organization, and their mission (2–3 sentences max)
- Makes a specific, concrete donation ask tailored to ${ctx.business.name}'s donation potential
- Mentions the community visibility and recognition the business will receive
- Handles a likely objection naturally (e.g., "If the manager isn't available…")
- Closes with a clear next step
- Is conversational and genuine — under 90 seconds when read aloud

Respond with ONLY the script text as plain prose. No preamble, no JSON, no markdown.`

  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return text.trim()
}

// ── Email ───────────────────────────────────────────────────────────────────

export async function generateEmail(
  ctx: OutreachContext,
): Promise<{ subject: string; body: string }> {
  const itemsLine = ctx.desiredItems?.length
    ? `We are specifically hoping for: ${ctx.desiredItems.join(', ')}.`
    : ''

  const eventLine = ctx.eventName
    ? `Event: "${ctx.eventName}"${
        ctx.eventDate
          ? ` on ${new Date(ctx.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}`
          : ''
      }.`
    : ''

  const prompt = `You are helping ${ctx.organization} write a professional donation request email to a local business.

Organization: ${ctx.organization}
Mission / Philanthropy: ${ctx.philanthropy}
Donation types needed: ${ctx.donationType.join(', ')}
${eventLine}
${itemsLine}
City: ${ctx.city}

Business to contact:
Name: ${ctx.business.name}
Type: ${ctx.business.type}
Their mission: ${ctx.business.mission}
Community involvement: ${ctx.business.communityImpact}
Donation potential: ${ctx.business.donationPotential}

Write a professional, warm donation request email that:
- Has a specific, compelling subject line (not generic like "Donation Request")
- Opens by acknowledging something specific about their business, mission, or community role
- Clearly explains the organization, the event or cause, and why it matters
- Makes a specific donation ask tailored to what this business could realistically provide
- Explains the donor benefits (recognition at event, social media shoutout, community goodwill, tax-deductible mention)
- Includes a clear call to action with a suggested response deadline
- Closes warmly and professionally
- Is 200–300 words in the body — not too long, not too short

Respond ONLY with valid JSON. No markdown, no preamble:
{
  "subject": "Email subject line here",
  "body": "Full email body here with \\n for paragraph breaks"
}`

  const response = await anthropic.messages.create({
    model: SONNET,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
  return JSON.parse(cleanJSON(raw))
}

// ── Follow-Up ───────────────────────────────────────────────────────────────

export async function generateFollowup(
  ctx: OutreachContext,
): Promise<{ subject: string; body: string }> {
  const eventLine = ctx.eventName
    ? `Their event is "${ctx.eventName}"${
        ctx.eventDate
          ? `, happening on ${new Date(ctx.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}`
          : ''
      }.`
    : ''

  const prompt = `You are helping ${ctx.organization} write a brief, friendly follow-up email to a business they previously contacted for a donation request.

Organization: ${ctx.organization}
Mission / Philanthropy: ${ctx.philanthropy}
${eventLine}

Business previously contacted:
Name: ${ctx.business.name}
Type: ${ctx.business.type}
Donation potential: ${ctx.business.donationPotential}

Write a short follow-up email that:
- References their previous outreach naturally (without sounding pushy or desperate)
- Reiterates the cause in one memorable sentence
- Reaffirms the specific donation ask briefly
- Creates gentle urgency by mentioning an upcoming event or deadline
- Makes it very easy for them to respond (yes, no, or redirect to someone else)
- Is warm, human, and professional
- Is under 150 words in the body

Respond ONLY with valid JSON. No markdown, no preamble:
{
  "subject": "Follow-up subject line",
  "body": "Follow-up email body with \\n for paragraph breaks"
}`

  const response = await anthropic.messages.create({
    model: SONNET,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
  return JSON.parse(cleanJSON(raw))
}
