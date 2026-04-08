export interface WellnessField {
  name: string
  label: string
  type: 'slider' | 'select' | 'textarea' | 'time' | 'checklist' | 'tags'
  placeholder?: string
  min?: number
  max?: number
  step?: number
  options?: readonly string[]
  defaults?: readonly string[]
  suggestions?: readonly string[]
}

export interface WellnessChartConfig {
  primary: string
  secondary?: string
  type: 'area' | 'bar' | 'line' | 'scatter'
  qualityOverlay?: boolean
  tagsOverlay?: boolean
}

export interface WellnessHubTool {
  slug: string
  title: string
  description: string
  icon: string
  entryFields: readonly WellnessField[]
  chartConfig: WellnessChartConfig
}

export const WELLNESS_HUB_TOOLS: WellnessHubTool[] = [
  {
    slug: 'mindfulness',
    title: 'Mindfulness Coach',
    description: 'Track your mood and energy daily, discover patterns with AI insights',
    icon: 'Brain',
    entryFields: [
      { name: 'mood', label: 'Mood', type: 'slider', min: 1, max: 10 },
      { name: 'energy', label: 'Energy', type: 'slider', min: 1, max: 10 },
      { name: 'exercise', label: 'Exercise Today', type: 'select', options: ['None', 'Light walk', 'Moderate', 'Intense workout'] },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'How are you feeling today?' },
    ],
    chartConfig: { primary: 'mood', secondary: 'energy', type: 'area' },
  },
  {
    slug: 'habits',
    title: 'Habit Tracker',
    description: 'Build streaks and track daily habits with AI consistency coaching',
    icon: 'CheckSquare',
    entryFields: [
      { name: 'habits', label: 'Daily Habits', type: 'checklist', defaults: ['Exercise', 'Read 30 min', 'Drink 8 glasses water', 'Review notes', 'Meditate'] },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Any reflections on today?' },
    ],
    chartConfig: { primary: 'completionRate', type: 'bar' },
  },
  {
    slug: 'sleep',
    title: 'Sleep Log',
    description: 'Log sleep patterns and get AI analysis of your rest quality',
    icon: 'Moon',
    entryFields: [
      { name: 'hoursSlept', label: 'Hours Slept', type: 'slider', min: 0, max: 14, step: 0.5 },
      { name: 'quality', label: 'Sleep Quality', type: 'select', options: ['Poor', 'Fair', 'Good', 'Great'] },
      { name: 'bedtime', label: 'Bedtime', type: 'time' },
      { name: 'wakeTime', label: 'Wake Time', type: 'time' },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Dreams, disruptions, how you feel...' },
    ],
    chartConfig: { primary: 'hoursSlept', type: 'line', qualityOverlay: true },
  },
  {
    slug: 'journal',
    title: 'Symptom Journal',
    description: 'Track symptoms and triggers, AI identifies patterns over time',
    icon: 'HeartPulse',
    entryFields: [
      { name: 'symptoms', label: 'Symptoms', type: 'tags', suggestions: ['Headache', 'Fatigue', 'Anxiety', 'Nausea', 'Back pain', 'Insomnia', 'Brain fog'] },
      { name: 'severity', label: 'Overall Severity', type: 'slider', min: 1, max: 10 },
      { name: 'triggers', label: 'Possible Triggers', type: 'tags', suggestions: ['Stress', 'Poor sleep', 'Skipped meal', 'Screen time', 'Weather', 'Caffeine'] },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional context...' },
    ],
    chartConfig: { primary: 'severity', type: 'scatter', tagsOverlay: true },
  },
]

export function getWellnessHubTool(slug: string): WellnessHubTool | undefined {
  return WELLNESS_HUB_TOOLS.find(t => t.slug === slug)
}
