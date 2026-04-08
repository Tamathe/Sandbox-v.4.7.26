import type { SuccessScoreResult } from './types'

export interface GentleNudge {
  message: string
  action: string
  priority: number
  category: string
}

const NUDGE_TEMPLATES = {
  study_restart: [
    "Hey! I noticed it's been a bit since we studied together. Want to pick up where we left off?",
    "It's been a few days — ready to jump back into your flashcards? I'll make it quick.",
    "I've been keeping your study materials warm. Want to do a quick 10-minute review?",
  ],
  assignment_reminder: [
    "I see you have some assignments coming up. Want me to help you plan your approach?",
    "There's an assignment I can help you with. Want to work through it together?",
    "I noticed you haven't started on a few things yet — no pressure, but I'm here if you want to talk through them.",
  ],
  general_checkin: [
    "Hey, I haven't seen you around much lately. Everything okay? I'm here if you need anything.",
    "It's been a while! Whenever you're ready, I've got some things saved up for you.",
    "Welcome back! Want me to catch you up on what you've missed?",
  ],
  concept_help: [
    "I noticed a couple of concepts that might benefit from a quick review. Want me to explain them differently?",
    "Some of the recent material has been tricky — want to try a different approach with Study Buddy?",
    "I have some ideas for making the tough stuff click. Want to give it a try?",
  ],
  social_reconnect: [
    "There are some study groups meeting soon — want me to find one that fits your schedule?",
    "A few of your classmates are in The Commons right now. Want to join?",
    "Sometimes studying with others makes things click. Want me to set up a study session?",
  ],
}

/** Generate a gentle nudge for a student based on their success profile */
export function generateNudge(result: SuccessScoreResult): GentleNudge | null {
  if (result.composite >= 70) return null

  const lowSignals = new Set(result.signals.filter(s => s.score < 40).map(s => s.signal))

  if (lowSignals.has('flashcardConsistency') || lowSignals.has('studySessionCadence')) {
    const templates = NUDGE_TEMPLATES.study_restart
    return {
      message: templates[Math.floor(Math.random() * templates.length)],
      action: 'Open Study Buddy with their last topic',
      priority: 7,
      category: 'study-action',
    }
  }

  if (lowSignals.has('assignmentSubmission')) {
    const templates = NUDGE_TEMPLATES.assignment_reminder
    return {
      message: templates[Math.floor(Math.random() * templates.length)],
      action: 'Show upcoming assignments with Sandy help offer',
      priority: 8,
      category: 'study-action',
    }
  }

  if (lowSignals.has('conceptMasterySlope')) {
    const templates = NUDGE_TEMPLATES.concept_help
    return {
      message: templates[Math.floor(Math.random() * templates.length)],
      action: 'Launch Study Buddy in Tutor mode on struggling concepts',
      priority: 6,
      category: 'study-action',
    }
  }

  if (lowSignals.has('commonsParticipation')) {
    const templates = NUDGE_TEMPLATES.social_reconnect
    return {
      message: templates[Math.floor(Math.random() * templates.length)],
      action: 'Show active Commons sessions',
      priority: 4,
      category: 'social',
    }
  }

  if (result.pattern?.type === 'broad_disengagement' || result.pattern?.type === 'sudden_absence') {
    const templates = NUDGE_TEMPLATES.general_checkin
    return {
      message: templates[Math.floor(Math.random() * templates.length)],
      action: 'Show personalized dashboard with easy re-entry points',
      priority: 9,
      category: 'wellbeing',
    }
  }

  return null
}
