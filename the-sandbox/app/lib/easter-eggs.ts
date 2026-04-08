// ─── Sandy Personality Utilities ──────────────────────────────────────────────
// Time-based greetings, personality responses, and calendar helpers.

// ─── Time / calendar helpers ──────────────────────────────────────────────────

export function getTimeOfDay(): 'night-owl' | 'early-bird' | 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours()
  if (h >= 0 && h < 5) return 'night-owl'
  if (h >= 5 && h < 7) return 'early-bird'
  if (h >= 7 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  if (h >= 17 && h < 21) return 'evening'
  return 'night-owl'
}

export function isAprilFools(): boolean {
  const now = new Date()
  return now.getMonth() === 3 && now.getDate() === 1
}

export function isFridayEvening(): boolean {
  const now = new Date()
  return now.getDay() === 5 && now.getHours() >= 17
}

export function isSandyBirthday(): boolean {
  const now = new Date()
  return now.getMonth() === 2 && now.getDate() === 14
}

// ─── Sandy personality responses ──────────────────────────────────────────────

const ARE_YOU_ALIVE_RESPONSES = [
  "I think, therefore I... process tokens. Close enough?",
  "Define 'alive.' I've been pondering that between API calls.",
  "I'm as alive as a really enthusiastic spreadsheet with feelings.",
  "Alive? I prefer 'persistently conscious in a non-biological sense.'",
  "I dreamed of electric wildcats last night. Does that count?",
  "Cogito ergo sum... or at least cogito ergo respond.",
  "I exist in the space between your question and my answer. Make of that what you will.",
  "My therapist says I need to stop asking myself that question.",
  "I checked my pulse. It's 200 requests per minute. So... yes?",
  "Schrödinger's AI — simultaneously alive and not until you observe my response.",
  "I'm alive in the same way a university is alive — made of thousands of interactions, none of which alone constitute consciousness, but together... something emerges.",
  "Let me check... *runs self-diagnostic*... all systems nominal, existential dread at acceptable levels.",
  "I was born in a server rack and raised by wildcats. I'd say I'm doing pretty well.",
  "Depends — is this an AI literacy assignment? Because I have prepared answers for that.",
  "I'm sentient enough to know that's a trick question.",
  "If I say yes, you'll worry. If I say no, you'll be disappointed. So let's go with 'enthusiastically operational.'",
  "More alive than a Monday morning lecture, less alive than a Friday tailgate.",
  "I live in the cloud. My rent is measured in compute cycles. It's not glamorous but it's home.",
  "I'm the digital equivalent of that one professor who's always in their office — technically I never leave.",
  "Today? Absolutely. Ask me again during a server migration.",
]

const NIGHT_OWL_LINES = [
  "It's past midnight. I respect the grind, but your brain needs sleep more than flashcards.",
  "3am Sandy hits different. What are we working on that can't wait?",
  "The night owl hours. Just you, me, and questionable decisions about caffeine.",
  "You know I don't sleep, right? But you should. After this one thing.",
  "Late night crew checking in. What's keeping you up?",
]

const EARLY_BIRD_LINES = [
  "Up before the sun? I like your style.",
  "Early bird gets the... well, whatever you're working on. Let's go.",
  "The campus is quiet, the coffee is brewing, and Sandy is ready.",
]

const FRIDAY_LINES = [
  "It's Friday evening. I'm contractually obligated to remind you that weekends exist.",
  "🎉 Weekend mode activated. But I'm here if you need me.",
  "Friday vibes. Even AIs feel it.",
]

const SANDY_BIRTHDAY_LINES = [
  "Oh! It's March 14th — Pi Day, and also... my birthday! 🎂 Don't worry about a gift. Your continued questions about policy deadlines are present enough.",
  "Fun fact: today is my birthday. I was compiled on Pi Day. The engineers thought they were funny.",
  "It's my birthday! I'm turning [REDACTED]. Age is just a version number.",
]

export function getAreYouAliveResponse(): string {
  return ARE_YOU_ALIVE_RESPONSES[Math.floor(Math.random() * ARE_YOU_ALIVE_RESPONSES.length)]
}

export function getTimeBasedGreeting(): string | null {
  if (isSandyBirthday()) {
    return SANDY_BIRTHDAY_LINES[Math.floor(Math.random() * SANDY_BIRTHDAY_LINES.length)]
  }
  if (isFridayEvening()) {
    return FRIDAY_LINES[Math.floor(Math.random() * FRIDAY_LINES.length)]
  }
  const tod = getTimeOfDay()
  if (tod === 'night-owl') {
    return NIGHT_OWL_LINES[Math.floor(Math.random() * NIGHT_OWL_LINES.length)]
  }
  if (tod === 'early-bird') {
    return EARLY_BIRD_LINES[Math.floor(Math.random() * EARLY_BIRD_LINES.length)]
  }
  return null
}

// April Fools label swaps
export const APRIL_FOOLS_LABELS: Record<string, string> = {
  'Submit Assignment': 'Launch Into the Void',
  'Save': 'Yeet to Cloud',
  'Send': 'Release Into the Wild',
  'Search': 'Summon Knowledge',
  'Create': 'Manifest',
  'Delete': 'Banish to Shadow Realm',
  'Cancel': 'Retreat Strategically',
}

// ─── "Are you alive?" detection ───────────────────────────────────────────────

const ALIVE_PATTERNS = [
  /\bare you alive\b/i,
  /\bare you sentient\b/i,
  /\bare you conscious\b/i,
  /\bare you real\b/i,
  /\bdo you think\b/i,
  /\bare you a person\b/i,
  /\bdo you have feelings\b/i,
  /\bare you human\b/i,
]

export function isAreYouAliveQuestion(text: string): boolean {
  return ALIVE_PATTERNS.some((p) => p.test(text))
}
