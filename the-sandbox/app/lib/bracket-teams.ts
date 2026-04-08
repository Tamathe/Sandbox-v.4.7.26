// 2026 NCAA Tournament bracket data
// Regions: East, West, South, Midwest
// Game numbering:
//   East R1:   1-8  | West R1:   9-16 | South R1: 17-24 | Midwest R1: 25-32
//   East R2:  33-36 | West R2:  37-40 | South R2: 41-44 | Midwest R2: 45-48
//   East S16: 49-50 | West S16: 51-52 | South S16:53-54 | Midwest S16:55-56
//   East E8:    57  | West E8:    58  | South E8:   59  | Midwest E8:  60
//   FF:       61-62 | Championship:  63

export type Region = 'East' | 'West' | 'South' | 'Midwest'

export interface BracketTeam {
  seed: number
  name: string
  region: Region
}

export interface FirstRoundGame {
  gameNumber: number
  round: 1
  region: Region
  team1Seed: number
  team2Seed: number
}

// Seed matchup order per region: 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15
const SEED_MATCHUPS: [number, number][] = [
  [1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15],
]

export const BRACKET_TEAMS: BracketTeam[] = [
  // East Region
  { seed: 1,  name: 'Duke',           region: 'East' },
  { seed: 2,  name: 'Tennessee',      region: 'East' },
  { seed: 3,  name: 'Baylor',         region: 'East' },
  { seed: 4,  name: 'Maryland',       region: 'East' },
  { seed: 5,  name: "St. John's",     region: 'East' },
  { seed: 6,  name: 'Memphis',        region: 'East' },
  { seed: 7,  name: 'Purdue',         region: 'East' },
  { seed: 8,  name: 'Iowa State',     region: 'East' },
  { seed: 9,  name: 'South Florida',  region: 'East' },
  { seed: 10, name: 'New Mexico',     region: 'East' },
  { seed: 11, name: 'Drake',          region: 'East' },
  { seed: 12, name: 'UC San Diego',   region: 'East' },
  { seed: 13, name: 'Samford',        region: 'East' },
  { seed: 14, name: 'Colgate',        region: 'East' },
  { seed: 15, name: 'Longwood',       region: 'East' },
  { seed: 16, name: 'Hampton',        region: 'East' },

  // West Region
  { seed: 1,  name: 'Kansas',         region: 'West' },
  { seed: 2,  name: 'Auburn',         region: 'West' },
  { seed: 3,  name: 'Wisconsin',      region: 'West' },
  { seed: 4,  name: 'Connecticut',    region: 'West' },
  { seed: 5,  name: 'Gonzaga',        region: 'West' },
  { seed: 6,  name: 'Indiana',        region: 'West' },
  { seed: 7,  name: 'Louisville',     region: 'West' },
  { seed: 8,  name: 'Missouri',       region: 'West' },
  { seed: 9,  name: 'Xavier',         region: 'West' },
  { seed: 10, name: 'Colorado State', region: 'West' },
  { seed: 11, name: 'Oakland',        region: 'West' },
  { seed: 12, name: 'McNeese',        region: 'West' },
  { seed: 13, name: 'Furman',         region: 'West' },
  { seed: 14, name: 'Montana',        region: 'West' },
  { seed: 15, name: 'Wofford',        region: 'West' },
  { seed: 16, name: 'SIUE',           region: 'West' },

  // South Region
  { seed: 1,  name: 'Houston',        region: 'South' },
  { seed: 2,  name: 'Alabama',        region: 'South' },
  { seed: 3,  name: 'Florida',        region: 'South' },
  { seed: 4,  name: 'Texas A&M',      region: 'South' },
  { seed: 5,  name: 'Michigan State', region: 'South' },
  { seed: 6,  name: 'BYU',            region: 'South' },
  { seed: 7,  name: 'Texas Tech',     region: 'South' },
  { seed: 8,  name: 'Arkansas',       region: 'South' },
  { seed: 9,  name: 'Florida State',  region: 'South' },
  { seed: 10, name: 'Utah State',     region: 'South' },
  { seed: 11, name: 'VCU',            region: 'South' },
  { seed: 12, name: 'Grand Canyon',   region: 'South' },
  { seed: 13, name: 'Oral Roberts',   region: 'South' },
  { seed: 14, name: 'Morehead State', region: 'South' },
  { seed: 15, name: 'UMBC',           region: 'South' },
  { seed: 16, name: 'Southern',       region: 'South' },

  // Midwest Region
  { seed: 1,  name: 'Kentucky',       region: 'Midwest' },
  { seed: 2,  name: 'North Carolina', region: 'Midwest' },
  { seed: 3,  name: 'Illinois',       region: 'Midwest' },
  { seed: 4,  name: 'Iowa',           region: 'Midwest' },
  { seed: 5,  name: 'Michigan',       region: 'Midwest' },
  { seed: 6,  name: 'Clemson',        region: 'Midwest' },
  { seed: 7,  name: 'Oklahoma',       region: 'Midwest' },
  { seed: 8,  name: 'Creighton',      region: 'Midwest' },
  { seed: 9,  name: 'Stanford',       region: 'Midwest' },
  { seed: 10, name: 'Nevada',         region: 'Midwest' },
  { seed: 11, name: 'UAB',            region: 'Midwest' },
  { seed: 12, name: 'Liberty',        region: 'Midwest' },
  { seed: 13, name: 'Yale',           region: 'Midwest' },
  { seed: 14, name: 'Winthrop',       region: 'Midwest' },
  { seed: 15, name: 'Queens',         region: 'Midwest' },
  { seed: 16, name: 'Alcorn State',   region: 'Midwest' },
]

// All 63 games pre-defined (teams set for R1, later rounds TBD)
export function buildInitialGames(): { gameNumber: number; round: number; team1: string; team2: string }[] {
  const REGIONS: Region[] = ['East', 'West', 'South', 'Midwest']
  const games: { gameNumber: number; round: number; team1: string; team2: string }[] = []

  // Round 1 (8 games per region)
  REGIONS.forEach((region, regionIdx) => {
    const regionTeams = BRACKET_TEAMS.filter(t => t.region === region)
    const getTeam = (seed: number) => regionTeams.find(t => t.seed === seed)!.name

    SEED_MATCHUPS.forEach(([s1, s2], matchupIdx) => {
      games.push({
        gameNumber: regionIdx * 8 + matchupIdx + 1,
        round: 1,
        team1: getTeam(s1),
        team2: getTeam(s2),
      })
    })
  })

  // Round 2 — 4 games per region (teams TBD)
  const R2_BASE = [33, 37, 41, 45]
  REGIONS.forEach((_, i) => {
    for (let g = 0; g < 4; g++) {
      games.push({ gameNumber: R2_BASE[i] + g, round: 2, team1: 'TBD', team2: 'TBD' })
    }
  })

  // Sweet 16 — 2 per region
  const S16_BASE = [49, 51, 53, 55]
  REGIONS.forEach((_, i) => {
    games.push({ gameNumber: S16_BASE[i],     round: 3, team1: 'TBD', team2: 'TBD' })
    games.push({ gameNumber: S16_BASE[i] + 1, round: 3, team1: 'TBD', team2: 'TBD' })
  })

  // Elite Eight — 1 per region
  ;[57, 58, 59, 60].forEach(n => {
    games.push({ gameNumber: n, round: 4, team1: 'TBD', team2: 'TBD' })
  })

  // Final Four
  games.push({ gameNumber: 61, round: 5, team1: 'TBD', team2: 'TBD' })
  games.push({ gameNumber: 62, round: 5, team1: 'TBD', team2: 'TBD' })

  // Championship
  games.push({ gameNumber: 63, round: 6, team1: 'TBD', team2: 'TBD' })

  return games
}

export const ROUND_NAMES: Record<number, string> = {
  1: 'Round of 64',
  2: 'Round of 32',
  3: 'Sweet 16',
  4: 'Elite Eight',
  5: 'Final Four',
  6: 'Championship',
}

export const ROUND_POINTS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 16,
  6: 32,
}

export const REGIONS_ORDER: Region[] = ['East', 'West', 'South', 'Midwest']

// Given picks and actual game results, compute a score
export function computeScore(
  picks: Record<string, string>,
  games: { gameNumber: number; round: number; winner: string | null }[]
): number {
  let score = 0
  for (const game of games) {
    if (!game.winner) continue
    const pick = picks[String(game.gameNumber)]
    if (pick && pick === game.winner) {
      score += ROUND_POINTS[game.round] ?? 0
    }
  }
  return score
}
