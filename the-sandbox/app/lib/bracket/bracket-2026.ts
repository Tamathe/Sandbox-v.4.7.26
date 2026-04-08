// 2026 NCAA Tournament — static bracket data
// 64 teams, 4 regions, 63 games
// Game IDs: {region}-r{round}-g{n} | ff-g1 | ff-g2 | championship

export type BracketRegion = 'east' | 'west' | 'south' | 'midwest'

export interface BracketTeam {
  id: string           // stable storage key, e.g. "duke-east"
  name: string         // "Duke"
  abbreviation: string // "DUKE"
  seed: number         // 1–16
  region: BracketRegion
}

export interface BracketGame {
  id: string                                      // e.g. "east-r1-g1"
  round: number                                   // 1–6
  region: BracketRegion | 'final_four' | 'championship'
  slotA: string                                   // teamId (r1) or upstream gameId (r2+)
  slotB: string
  slotAIsGame: boolean                            // true → slotA is a gameId
  slotBIsGame: boolean
}

// ─── Teams ───────────────────────────────────────────────────────────────────

export const BRACKET_TEAMS: BracketTeam[] = [
  // IDs are stable storage keys so existing contest picks keep working.
  // East
  { id: 'duke-east',        name: 'Duke',              abbreviation: 'DUKE',  seed: 1,  region: 'east' },
  { id: 'tennessee-east',   name: 'UConn',             abbreviation: 'UCONN', seed: 2,  region: 'east' },
  { id: 'baylor-east',      name: 'Michigan State',    abbreviation: 'MSU',   seed: 3,  region: 'east' },
  { id: 'maryland-east',    name: 'Kansas',            abbreviation: 'KU',    seed: 4,  region: 'east' },
  { id: 'stjohns-east',     name: "St. John's",        abbreviation: 'STJ',   seed: 5,  region: 'east' },
  { id: 'memphis-east',     name: 'Louisville',        abbreviation: 'LOU',   seed: 6,  region: 'east' },
  { id: 'purdue-east',      name: 'UCLA',              abbreviation: 'UCLA',  seed: 7,  region: 'east' },
  { id: 'iowast-east',      name: 'Ohio State',        abbreviation: 'OSU',   seed: 8,  region: 'east' },
  { id: 'southfl-east',     name: 'TCU',               abbreviation: 'TCU',   seed: 9,  region: 'east' },
  { id: 'newmex-east',      name: 'UCF',               abbreviation: 'UCF',   seed: 10, region: 'east' },
  { id: 'drake-east',       name: 'South Florida',     abbreviation: 'USF',   seed: 11, region: 'east' },
  { id: 'ucsd-east',        name: 'Northern Iowa',     abbreviation: 'UNI',   seed: 12, region: 'east' },
  { id: 'samford-east',     name: 'California Baptist',abbreviation: 'CBU',   seed: 13, region: 'east' },
  { id: 'colgate-east',     name: 'North Dakota State',abbreviation: 'NDSU',  seed: 14, region: 'east' },
  { id: 'longwood-east',    name: 'Furman',            abbreviation: 'FUR',   seed: 15, region: 'east' },
  { id: 'hampton-east',     name: 'Siena',             abbreviation: 'SIENA', seed: 16, region: 'east' },

  // West
  { id: 'kansas-west',      name: 'Arizona',           abbreviation: 'ARIZ',  seed: 1,  region: 'west' },
  { id: 'auburn-west',      name: 'Purdue',            abbreviation: 'PUR',   seed: 2,  region: 'west' },
  { id: 'wisconsin-west',   name: 'Gonzaga',           abbreviation: 'GONZ',  seed: 3,  region: 'west' },
  { id: 'uconn-west',       name: 'Arkansas',          abbreviation: 'ARK',   seed: 4,  region: 'west' },
  { id: 'gonzaga-west',     name: 'Wisconsin',         abbreviation: 'WIS',   seed: 5,  region: 'west' },
  { id: 'indiana-west',     name: 'BYU',               abbreviation: 'BYU',   seed: 6,  region: 'west' },
  { id: 'louisville-west',  name: 'Miami (FL)',        abbreviation: 'MIA',   seed: 7,  region: 'west' },
  { id: 'missouri-west',    name: 'Villanova',         abbreviation: 'NOVA',  seed: 8,  region: 'west' },
  { id: 'xavier-west',      name: 'Utah State',        abbreviation: 'USU',   seed: 9,  region: 'west' },
  { id: 'coloradost-west',  name: 'Missouri',          abbreviation: 'MIZ',   seed: 10, region: 'west' },
  { id: 'oakland-west',     name: 'Texas',             abbreviation: 'TEX',   seed: 11, region: 'west' },
  { id: 'mcneese-west',     name: 'High Point',        abbreviation: 'HPU',   seed: 12, region: 'west' },
  { id: 'furman-west',      name: "Hawai'i",           abbreviation: 'HAW',   seed: 13, region: 'west' },
  { id: 'montana-west',     name: 'Kennesaw State',    abbreviation: 'KENN',  seed: 14, region: 'west' },
  { id: 'wofford-west',     name: 'Queens',            abbreviation: 'QUE',   seed: 15, region: 'west' },
  { id: 'siue-west',        name: 'LIU',               abbreviation: 'LIU',   seed: 16, region: 'west' },

  // South
  { id: 'houston-south',    name: 'Florida',           abbreviation: 'FLA',   seed: 1,  region: 'south' },
  { id: 'alabama-south',    name: 'Houston',           abbreviation: 'HOU',   seed: 2,  region: 'south' },
  { id: 'florida-south',    name: 'Illinois',          abbreviation: 'ILL',   seed: 3,  region: 'south' },
  { id: 'texasam-south',    name: 'Nebraska',          abbreviation: 'NEB',   seed: 4,  region: 'south' },
  { id: 'michiganst-south', name: 'Vanderbilt',        abbreviation: 'VAN',   seed: 5,  region: 'south' },
  { id: 'byu-south',        name: 'North Carolina',    abbreviation: 'UNC',   seed: 6,  region: 'south' },
  { id: 'texastech-south',  name: "Saint Mary's",      abbreviation: 'SMC',   seed: 7,  region: 'south' },
  { id: 'arkansas-south',   name: 'Clemson',           abbreviation: 'CLEM',  seed: 8,  region: 'south' },
  { id: 'floridast-south',  name: 'Iowa',              abbreviation: 'IOWA',  seed: 9,  region: 'south' },
  { id: 'utahst-south',     name: 'Texas A&M',         abbreviation: 'TAMU',  seed: 10, region: 'south' },
  { id: 'vcu-south',        name: 'VCU',               abbreviation: 'VCU',   seed: 11, region: 'south' },
  { id: 'grandcanyon-south',name: 'McNeese',           abbreviation: 'MCN',   seed: 12, region: 'south' },
  { id: 'oralroberts-south',name: 'Troy',              abbreviation: 'TROY',  seed: 13, region: 'south' },
  { id: 'morehd-south',     name: 'Penn',              abbreviation: 'PENN',  seed: 14, region: 'south' },
  { id: 'umbc-south',       name: 'Idaho',             abbreviation: 'IDHO',  seed: 15, region: 'south' },
  { id: 'southern-south',   name: 'Prairie View A&M',  abbreviation: 'PVAM',  seed: 16, region: 'south' },

  // Midwest
  { id: 'kentucky-midwest',     name: 'Michigan',         abbreviation: 'MICH', seed: 1,  region: 'midwest' },
  { id: 'northcarolina-midwest',name: 'Iowa State',       abbreviation: 'ISU',  seed: 2,  region: 'midwest' },
  { id: 'illinois-midwest',     name: 'Virginia',         abbreviation: 'UVA',  seed: 3,  region: 'midwest' },
  { id: 'iowa-midwest',         name: 'Alabama',          abbreviation: 'ALA',  seed: 4,  region: 'midwest' },
  { id: 'michigan-midwest',     name: 'Texas Tech',       abbreviation: 'TTU',  seed: 5,  region: 'midwest' },
  { id: 'clemson-midwest',      name: 'Tennessee',        abbreviation: 'TENN', seed: 6,  region: 'midwest' },
  { id: 'oklahoma-midwest',     name: 'Kentucky',         abbreviation: 'UK',   seed: 7,  region: 'midwest' },
  { id: 'creighton-midwest',    name: 'Georgia',          abbreviation: 'UGA',  seed: 8,  region: 'midwest' },
  { id: 'stanford-midwest',     name: 'Saint Louis',      abbreviation: 'SLU',  seed: 9,  region: 'midwest' },
  { id: 'nevada-midwest',       name: 'Santa Clara',      abbreviation: 'SCU',  seed: 10, region: 'midwest' },
  { id: 'uab-midwest',          name: 'Miami (OH)',       abbreviation: 'M-OH', seed: 11, region: 'midwest' },
  { id: 'liberty-midwest',      name: 'Akron',            abbreviation: 'AKR',  seed: 12, region: 'midwest' },
  { id: 'yale-midwest',         name: 'Hofstra',          abbreviation: 'HOF',  seed: 13, region: 'midwest' },
  { id: 'winthrop-midwest',     name: 'Wright State',     abbreviation: 'WRST', seed: 14, region: 'midwest' },
  { id: 'queens-midwest',       name: 'Tennessee State',  abbreviation: 'TSU',  seed: 15, region: 'midwest' },
  { id: 'alcornst-midwest',     name: 'Howard',           abbreviation: 'HOW',  seed: 16, region: 'midwest' },
]

// ─── Game helpers ─────────────────────────────────────────────────────────────

function teamId(region: BracketRegion, seed: number): string {
  const t = BRACKET_TEAMS.find(t => t.region === region && t.seed === seed)
  if (!t) throw new Error(`Team not found: ${region} seed ${seed}`)
  return t.id
}

// Seed matchup order: 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15
const SEED_PAIRS: [number, number][] = [
  [1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15],
]

function buildRegionGames(region: BracketRegion): BracketGame[] {
  const r = region
  const games: BracketGame[] = []

  // Round 1 — 8 games (team IDs)
  SEED_PAIRS.forEach(([s1, s2], i) => {
    games.push({
      id: `${r}-r1-g${i + 1}`,
      round: 1,
      region: r,
      slotA: teamId(r, s1),
      slotB: teamId(r, s2),
      slotAIsGame: false,
      slotBIsGame: false,
    })
  })

  // Round 2 — 4 games (winners of r1 pairs)
  // g1→g2, g3→g4, g5→g6, g7→g8
  for (let i = 0; i < 4; i++) {
    games.push({
      id: `${r}-r2-g${i + 1}`,
      round: 2,
      region: r,
      slotA: `${r}-r1-g${i * 2 + 1}`,
      slotB: `${r}-r1-g${i * 2 + 2}`,
      slotAIsGame: true,
      slotBIsGame: true,
    })
  }

  // Round 3 (Sweet 16) — 2 games
  games.push({
    id: `${r}-r3-g1`,
    round: 3,
    region: r,
    slotA: `${r}-r2-g1`,
    slotB: `${r}-r2-g2`,
    slotAIsGame: true,
    slotBIsGame: true,
  })
  games.push({
    id: `${r}-r3-g2`,
    round: 3,
    region: r,
    slotA: `${r}-r2-g3`,
    slotB: `${r}-r2-g4`,
    slotAIsGame: true,
    slotBIsGame: true,
  })

  // Round 4 (Elite 8) — 1 game
  games.push({
    id: `${r}-r4-g1`,
    round: 4,
    region: r,
    slotA: `${r}-r3-g1`,
    slotB: `${r}-r3-g2`,
    slotAIsGame: true,
    slotBIsGame: true,
  })

  return games
}

// ─── Full bracket ─────────────────────────────────────────────────────────────

const REGIONS: BracketRegion[] = ['east', 'west', 'south', 'midwest']

const REGIONAL_GAMES: BracketGame[] = REGIONS.flatMap(buildRegionGames)

const FINAL_FOUR_GAMES: BracketGame[] = [
  // East vs West
  {
    id: 'ff-g1',
    round: 5,
    region: 'final_four',
    slotA: 'east-r4-g1',
    slotB: 'west-r4-g1',
    slotAIsGame: true,
    slotBIsGame: true,
  },
  // South vs Midwest
  {
    id: 'ff-g2',
    round: 5,
    region: 'final_four',
    slotA: 'south-r4-g1',
    slotB: 'midwest-r4-g1',
    slotAIsGame: true,
    slotBIsGame: true,
  },
]

const CHAMPIONSHIP_GAME: BracketGame = {
  id: 'championship',
  round: 6,
  region: 'championship',
  slotA: 'ff-g1',
  slotB: 'ff-g2',
  slotAIsGame: true,
  slotBIsGame: true,
}

export const BRACKET_2026 = {
  teams: BRACKET_TEAMS,
  games: [...REGIONAL_GAMES, ...FINAL_FOUR_GAMES, CHAMPIONSHIP_GAME],
} as const

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getTeamById(id: string): BracketTeam | undefined {
  return BRACKET_TEAMS.find(t => t.id === id)
}

export function getGameById(id: string): BracketGame | undefined {
  return BRACKET_2026.games.find(g => g.id === id)
}

export function getTeamsByRegion(region: BracketRegion): BracketTeam[] {
  return BRACKET_TEAMS.filter(t => t.region === region).sort((a, b) => a.seed - b.seed)
}

export function getGamesByRegion(region: BracketRegion | 'final_four' | 'championship'): BracketGame[] {
  return BRACKET_2026.games.filter(g => g.region === region)
}

export function getGamesByRound(round: number): BracketGame[] {
  return BRACKET_2026.games.filter(g => g.round === round)
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
  1: 1, 2: 2, 3: 4, 4: 8, 5: 16, 6: 32,
}

// ─── Tournament Schedule ─────────────────────────────────────────────────────

export interface TournamentRoundSchedule {
  round: number
  label: string
  dates: string        // human-readable date range
  startDate: string    // ISO date for comparison
}

export const TOURNAMENT_SCHEDULE: TournamentRoundSchedule[] = [
  { round: 1, label: 'Round of 64',  dates: 'Mar 19–20',  startDate: '2026-03-19' },
  { round: 2, label: 'Round of 32',  dates: 'Mar 21–22',  startDate: '2026-03-21' },
  { round: 3, label: 'Sweet 16',     dates: 'Mar 27–28',  startDate: '2026-03-27' },
  { round: 4, label: 'Elite Eight',  dates: 'Mar 29',     startDate: '2026-03-29' },
  { round: 5, label: 'Final Four',   dates: 'Apr 4',      startDate: '2026-04-04' },
  { round: 6, label: 'Championship', dates: 'Apr 6',      startDate: '2026-04-06' },
]

export const REGIONS_ORDER: BracketRegion[] = ['east', 'west', 'south', 'midwest']

export const REGION_LABELS: Record<BracketRegion, string> = {
  east: 'East',
  west: 'West',
  south: 'South',
  midwest: 'Midwest',
}
