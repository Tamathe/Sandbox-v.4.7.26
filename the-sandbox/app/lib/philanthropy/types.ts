/**
 * AXO Philanthropy Assistant — shared types.
 */

export type PhilanthropyPhase = 'form' | 'generating' | 'results' | 'outreach'

export interface Business {
  name: string
  type: string
  categories: string[]
  mission: string
  communityImpact: string
  donationPotential: string
  location: string
  latitude: number
  longitude: number
  phone: string
  email: string
  website: string
  likeliness: 'High' | 'Medium' | 'Low'
}

export type ContactStatus = '' | 'called' | 'emailed' | 'waiting' | 'donated' | 'declined'

export type OutreachTab = 'phone' | 'email' | 'followup'

export interface EmailContent {
  subject: string
  body: string
}

export interface CampaignFormData {
  organization: string
  donationType: string[]
  otherDonationType: string
  philanthropy: string
  eventName: string
  eventDate: string
  desiredItems: string[]
  otherItems: string
  city: string
}

export interface PhilanthropyPreflight {
  user: {
    name: string
    email: string
    role: string
    department: string | null
  }
  pastCampaignCount: number
}

export const DONATION_TYPES = [
  { label: 'Event Sponsorships', icon: '🎪' },
  { label: 'Silent Auction Items', icon: '🏷️' },
  { label: 'Scholarships / Monetary', icon: '🎓' },
  { label: 'In-Kind Donations', icon: '📦' },
  { label: 'Other', icon: '✏️' },
] as const

export const DONATION_ITEMS = [
  'Restaurant Gift Certificates',
  'Gift Baskets',
  'Experiences & Activities',
  'Apparel & Merchandise',
  'Spa & Wellness',
  'Entertainment (Tickets, Passes)',
  'Artwork or Décor',
  'Food & Beverage Products',
] as const

export const CONTACT_STATUSES = [
  { value: '' as const, label: 'Not Contacted' },
  { value: 'called' as const, label: 'Called' },
  { value: 'emailed' as const, label: 'Emailed' },
  { value: 'waiting' as const, label: 'Waiting' },
  { value: 'donated' as const, label: 'Got Donation' },
  { value: 'declined' as const, label: 'Declined' },
] as const

export const LOADING_MESSAGES = [
  'Collecting your answers — org name, city, mission, donation type…',
  'Integrating your inputs into a custom AI prompt…',
  'Sending your request to Claude, our AI…',
  'The AI is reading your organization\'s profile…',
  'Searching for real businesses in your city…',
  'Researching which local companies give back to their communities…',
  'Cross-checking businesses against your philanthropy mission…',
  'Evaluating what each business could realistically donate…',
  'Scoring each business by how likely they are to say yes…',
  'Pinning each business to a spot on the map…',
  'Checking for community involvement and charitable history…',
  'Matching business types to your specific donation needs…',
  'Ranking results from most to least promising…',
  'Formatting results into a structured list…',
  'Double-checking the AI\'s work before handing it over…',
  'Almost there — finishing up your results…',
] as const

export const LIKELINESS_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }
