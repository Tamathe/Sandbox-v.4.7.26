const INSIGHT_PROMPTS: Record<string, string> = {
  mindfulness:
    `Analyze these daily mood and energy tracking entries. Identify patterns:
- Days of the week when mood or energy tends to dip
- Correlation between exercise and mood/energy
- Any concerning trends (sustained low mood, declining energy)

Be warm, specific, and actionable. Reference specific days or patterns you see in the data. Keep your response to 2-3 short paragraphs. Do not give medical advice — suggest lifestyle adjustments and recommend professional support if you see sustained low mood.`,

  habits:
    `Analyze these daily habit tracking entries. Identify patterns:
- Which habits have the best/worst completion rates
- Days when habits tend to break (weekends, specific weekdays)
- Streak lengths and consistency trends

Be encouraging and specific. Celebrate strengths ("You've been consistent with X") and offer one concrete tip for the weakest habit. Keep to 2-3 short paragraphs.`,

  sleep:
    `Analyze these sleep log entries. Identify patterns:
- Average hours slept and quality distribution
- Bedtime/wake time consistency
- Nights with poor sleep and any common factors
- Correlation between sleep quality and hours slept

Be specific with numbers ("You averaged X hours"). Flag any nights under 6 hours and look for patterns. Keep to 2-3 short paragraphs. Do not give medical advice but suggest consulting a healthcare provider if you see persistent issues.`,

  journal:
    `Analyze these symptom journal entries. Identify patterns:
- Most frequent symptoms
- Common triggers and their correlation with symptoms
- Severity trends over time
- Any symptom + trigger combinations that appear together

Be gentle and specific. Note correlations ("Headaches appeared N times, each time with trigger X"). Keep to 2-3 short paragraphs. Do not diagnose — suggest consulting a healthcare provider for persistent or worsening symptoms.`,
}

export function getInsightPrompt(slug: string): string {
  return INSIGHT_PROMPTS[slug] ?? 'Analyze these wellness tracking entries and identify meaningful patterns. Be specific and actionable.'
}

export function formatEntriesForPrompt(
  entries: { date: Date | string; data: unknown }[],
  slug: string,
): string {
  return entries
    .map((e, i) => {
      const date = new Date(e.date)
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const data = e.data as Record<string, unknown>

      let summary: string
      switch (slug) {
        case 'mindfulness':
          summary = `Mood: ${data.mood}/10, Energy: ${data.energy}/10, Exercise: ${data.exercise}${data.notes ? `, Notes: ${data.notes}` : ''}`
          break
        case 'habits': {
          const habits = data.habits as { name: string; completed: boolean }[]
          const completed = habits.filter(h => h.completed).length
          summary = `${completed}/${habits.length} habits completed (${habits.filter(h => h.completed).map(h => h.name).join(', ')})`
          break
        }
        case 'sleep':
          summary = `${data.hoursSlept}h, Quality: ${data.quality}, Bed: ${data.bedtime}, Wake: ${data.wakeTime}${data.notes ? `, Notes: ${data.notes}` : ''}`
          break
        case 'journal': {
          const symptoms = data.symptoms as string[]
          const triggers = data.triggers as string[]
          summary = `Severity: ${data.severity}/10, Symptoms: ${symptoms.join(', ')}, Triggers: ${triggers.join(', ')}${data.notes ? `, Notes: ${data.notes}` : ''}`
          break
        }
        default:
          summary = JSON.stringify(data)
      }

      return `Day ${i + 1} (${dayName} ${dateStr}): ${summary}`
    })
    .join('\n')
}
