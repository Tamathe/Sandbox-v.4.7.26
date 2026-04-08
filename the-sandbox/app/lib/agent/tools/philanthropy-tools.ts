/**
 * Sandy Agent Tools — Philanthropy Assistant
 *
 * Enables Sandy to launch philanthropy campaigns, retrieve past campaign history,
 * and provide quick outreach coaching tips from any page.
 */

import type { ToolModule, AgentUser } from '../agent-types'
import { prisma } from '../../prisma'

export const philanthropyTools: ToolModule = {
  tools: [
    {
      name: 'start_philanthropy_campaign',
      description:
        'Navigate the user to the Philanthropy Assistant to find local businesses for donation outreach. Optionally pre-fill organization name and city. Use when the user mentions philanthropy, fundraising, donation outreach, Greek life campaigns, or finding sponsors.',
      category: 'campus' as const,
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF', 'REGISTRAR'],
      reliability: 'navigation' as const,
      input_schema: {
        type: 'object',
        properties: {
          organization: {
            type: 'string',
            description: 'Organization name to pre-fill (e.g., "Alpha Chi Omega")',
          },
          city: {
            type: 'string',
            description: 'City to search in (default: Lexington, KY)',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_campaign_history',
      description:
        'Retrieve the user\'s past philanthropy outreach campaigns including organizations, cities, and contact status summaries. Use when the user asks about their past campaigns, donation outreach history, or philanthropy progress.',
      category: 'campus' as const,
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF', 'REGISTRAR'],
      reliability: 'live' as const,
      input_schema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of past campaigns to retrieve (default: 5, max: 20)',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_outreach_tip',
      description:
        'Provide a quick philanthropy outreach coaching tip — phone call techniques, email best practices, follow-up timing, objection handling. Use when the user asks for donation outreach advice without needing to navigate away.',
      category: 'campus' as const,
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: ['cold-call', 'email', 'follow-up', 'objections', 'general'],
            description: 'What kind of outreach tip to provide',
          },
        },
        required: [],
      },
    },
  ],

  handlers: {
    start_philanthropy_campaign: async (args: Record<string, unknown>) => {
      const org = (args.organization as string) ?? null
      const city = (args.city as string) ?? null

      return {
        action: 'navigate',
        url: '/philanthropy-assistant',
        message: org
          ? `I'll take you to the Philanthropy Assistant. I'll set it up for **${org}**${city ? ` in **${city}**` : ''}. You'll get 10 local business matches with phone scripts, emails, and follow-ups.`
          : `I'll take you to the Philanthropy Assistant. You'll fill in your organization and mission, and I'll find 10 local businesses that are strong candidates for donations — plus personalized phone scripts, emails, and follow-up templates.`,
      }
    },

    get_campaign_history: async (args: Record<string, unknown>, user: AgentUser) => {
      const limit = Math.min(Math.max((args.limit as number) || 5, 1), 20)

      const campaigns = await prisma.philanthropyCampaign.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          organization: true,
          philanthropy: true,
          city: true,
          donationType: true,
          eventName: true,
          contactStatus: true,
          createdAt: true,
        },
      })

      if (campaigns.length === 0) {
        return {
          message:
            'No philanthropy campaigns found yet. Want to start one? I can take you to the Philanthropy Assistant.',
          campaignCount: 0,
          campaigns: [],
        }
      }

      const summaries = campaigns.map((c) => {
        const status = (c.contactStatus ?? {}) as Record<string, string>
        const statusCounts = Object.values(status).reduce(
          (acc, s) => {
            if (s === 'donated') acc.donated++
            else if (s === 'called' || s === 'emailed') acc.contacted++
            else if (s === 'waiting') acc.waiting++
            else if (s === 'declined') acc.declined++
            return acc
          },
          { donated: 0, contacted: 0, waiting: 0, declined: 0 },
        )

        return {
          organization: c.organization,
          philanthropy: c.philanthropy,
          city: c.city,
          donationType: c.donationType,
          eventName: c.eventName,
          createdAt: c.createdAt,
          statusSummary: statusCounts,
        }
      })

      return {
        message: `Found ${campaigns.length} campaign${campaigns.length > 1 ? 's' : ''}. Here's the overview:`,
        campaignCount: campaigns.length,
        campaigns: summaries,
      }
    },

    get_outreach_tip: async (args: Record<string, unknown>) => {
      const topic = (args.topic as string) || 'general'

      const tips: Record<string, { title: string; tip: string; example?: string }> = {
        'cold-call': {
          title: 'Cold Call Tips',
          tip: 'Call between 9-11 AM on Tuesdays or Wednesdays — business owners are most available. Ask for the owner or manager by name if you can find it on their website. Lead with your cause, not the ask.',
          example:
            '"Hi, is the owner available? My name is [Name] from [Org] — we work with [cause] here in [city] and I was hoping to chat for just 60 seconds about a community partnership."',
        },
        email: {
          title: 'Email Best Practices',
          tip: 'Subject lines should mention the business by name. Keep the body under 200 words. Include a specific ask (not just "any donation"), mention the recognition they\'ll get, and end with a clear next step and deadline.',
        },
        'follow-up': {
          title: 'Follow-Up Timing',
          tip: 'Send a follow-up 3-5 business days after your initial outreach. Reference your previous contact naturally. If no response after 2 follow-ups, move on — you want willing partners, not reluctant ones.',
        },
        objections: {
          title: 'Handling Objections',
          tip: 'The #1 objection is "we already gave to someone this year." Response: "That\'s wonderful! Would you be open to a smaller in-kind contribution instead, like a gift card for our silent auction?" Always offer a smaller alternative.',
        },
        general: {
          title: 'Outreach Fundamentals',
          tip: 'Personalization is everything. A business that sees you know their community work will respond 3x better than a generic ask. Research each business for 2 minutes before reaching out — check their Instagram, Google reviews, and website for community involvement.',
        },
      }

      const selected = tips[topic] || tips.general

      return {
        title: selected.title,
        tip: selected.tip,
        ...(selected.example && { example: selected.example }),
      }
    },
  },
}
