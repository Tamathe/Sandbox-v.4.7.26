export const XP_LEVELS = [
  { level: 1, name: 'Explorer',  min: 0,    max: 99   },
  { level: 2, name: 'Learner',   min: 100,  max: 249  },
  { level: 3, name: 'Scholar',   min: 250,  max: 499  },
  { level: 4, name: 'Analyst',   min: 500,  max: 999  },
  { level: 5, name: 'Expert',    min: 1000, max: 1999 },
  { level: 6, name: 'Master',    min: 2000, max: null },
]

export function getLevelInfo(xp: number) {
  const tier = [...XP_LEVELS].reverse().find(t => xp >= t.min) ?? XP_LEVELS[0]
  const next = XP_LEVELS.find(t => t.level === tier.level + 1)
  const progress = next
    ? Math.round(((xp - tier.min) / (next.min - tier.min)) * 100)
    : 100
  return { ...tier, nextLevelXP: next?.min ?? null, progress }
}
