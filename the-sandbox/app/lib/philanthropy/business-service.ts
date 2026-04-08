/**
 * Philanthropy Assistant — business generation service.
 *
 * Uses Sonnet to generate 10 local businesses matching a donation campaign profile.
 * Prompts carried verbatim from the standalone Chaelyn Philanthropy app.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Business, CampaignFormData } from './types'

const anthropic = new Anthropic()
const MODEL = 'claude-sonnet-4-6'

function cleanJSON(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function buildBusinessPrompt(form: CampaignFormData): string {
  const itemsLine =
    form.desiredItems.length > 0
      ? `Specific donation items sought: ${form.desiredItems.join(', ')}.`
      : ''

  const eventLine = form.eventName
    ? `Event: ${form.eventName}${
        form.eventDate
          ? ` on ${new Date(form.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}`
          : ''
      }.`
    : ''

  return `You are a philanthropy outreach coordinator helping a Greek life organization find local businesses to approach for donations.

Organization: ${form.organization}
Donation types needed: ${form.donationType.join(', ')}
Philanthropy / mission focus: ${form.philanthropy}
${eventLine}
${itemsLine}
City / area: ${form.city}

Generate a list of exactly 10 real or highly plausible local businesses in ${form.city} that would be strong candidates for donation requests. Prioritize:
- Businesses with a known history of community involvement, non-profit partnerships, or charitable giving
- Businesses that align with the organization's philanthropy mission where possible
- Locally owned businesses or chain locations with local decision-making authority
- A diverse range of business types, sizes, and price points

Respond ONLY with a valid JSON array. No preamble, no explanation, no markdown code fences. The array must contain exactly 10 objects with this exact structure:
[
  {
    "name": "Business Name",
    "type": "Category (e.g., Brewery, Boutique, Spa)",
    "categories": ["tag1", "tag2"],
    "mission": "10 words max describing their brand mission",
    "communityImpact": "10 words max about community involvement",
    "donationPotential": "10 words max listing specific donatable items",
    "location": "Neighborhood or street, ${form.city}",
    "latitude": 38.0406,
    "longitude": -84.5037,
    "phone": "(859) 555-0100",
    "email": "contact@businessname.com",
    "website": "businessname.com",
    "likeliness": "High"
  }
]

Keep every string field under 15 words. likeliness must be exactly "High", "Medium", or "Low". latitude and longitude must be realistic decimal coordinates (numbers, not strings) for the business's actual or approximate location in ${form.city}. Phone, email, and website should be realistic best guesses for the business.`
}

export async function generateBusinesses(form: CampaignFormData): Promise<Business[]> {
  const prompt = buildBusinessPrompt(form)

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3072,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const businesses = JSON.parse(cleanJSON(raw)) as Business[]

  if (!Array.isArray(businesses) || businesses.length === 0) {
    throw new Error('AI returned an invalid business list. Please try again.')
  }

  return businesses
}
