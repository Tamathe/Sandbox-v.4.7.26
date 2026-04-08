export interface OfficialBracketResult {
  gameId: string
  winnerId: string
  round: number
  completedAt: string
}

// Men's NCAA tournament results — full tournament through Championship, April 6, 2026.
export const OFFICIAL_RESULTS_2026: OfficialBracketResult[] = [
  // East round of 64
  { gameId: 'east-r1-g1', winnerId: 'duke-east', round: 1, completedAt: '2026-03-19' },
  { gameId: 'east-r1-g2', winnerId: 'southfl-east', round: 1, completedAt: '2026-03-19' },
  { gameId: 'east-r1-g3', winnerId: 'stjohns-east', round: 1, completedAt: '2026-03-20' },
  { gameId: 'east-r1-g4', winnerId: 'maryland-east', round: 1, completedAt: '2026-03-20' },
  { gameId: 'east-r1-g5', winnerId: 'memphis-east', round: 1, completedAt: '2026-03-19' },
  { gameId: 'east-r1-g6', winnerId: 'baylor-east', round: 1, completedAt: '2026-03-19' },
  { gameId: 'east-r1-g7', winnerId: 'purdue-east', round: 1, completedAt: '2026-03-20' },
  { gameId: 'east-r1-g8', winnerId: 'tennessee-east', round: 1, completedAt: '2026-03-20' },

  // East round of 32
  { gameId: 'east-r2-g1', winnerId: 'duke-east', round: 2, completedAt: '2026-03-21' },
  { gameId: 'east-r2-g2', winnerId: 'stjohns-east', round: 2, completedAt: '2026-03-22' },
  { gameId: 'east-r2-g3', winnerId: 'baylor-east', round: 2, completedAt: '2026-03-21' },
  { gameId: 'east-r2-g4', winnerId: 'tennessee-east', round: 2, completedAt: '2026-03-22' },

  // South round of 64
  { gameId: 'south-r1-g1', winnerId: 'houston-south', round: 1, completedAt: '2026-03-20' },
  { gameId: 'south-r1-g2', winnerId: 'floridast-south', round: 1, completedAt: '2026-03-20' },
  { gameId: 'south-r1-g3', winnerId: 'michiganst-south', round: 1, completedAt: '2026-03-19' },
  { gameId: 'south-r1-g4', winnerId: 'texasam-south', round: 1, completedAt: '2026-03-19' },
  { gameId: 'south-r1-g5', winnerId: 'vcu-south', round: 1, completedAt: '2026-03-19' },
  { gameId: 'south-r1-g6', winnerId: 'florida-south', round: 1, completedAt: '2026-03-19' },
  { gameId: 'south-r1-g7', winnerId: 'utahst-south', round: 1, completedAt: '2026-03-19' },
  { gameId: 'south-r1-g8', winnerId: 'alabama-south', round: 1, completedAt: '2026-03-19' },

  // South round of 32
  { gameId: 'south-r2-g1', winnerId: 'floridast-south', round: 2, completedAt: '2026-03-22' },
  { gameId: 'south-r2-g2', winnerId: 'texasam-south', round: 2, completedAt: '2026-03-21' },
  { gameId: 'south-r2-g3', winnerId: 'florida-south', round: 2, completedAt: '2026-03-21' },
  { gameId: 'south-r2-g4', winnerId: 'alabama-south', round: 2, completedAt: '2026-03-21' },

  // West round of 64
  { gameId: 'west-r1-g1', winnerId: 'kansas-west', round: 1, completedAt: '2026-03-20' },
  { gameId: 'west-r1-g2', winnerId: 'xavier-west', round: 1, completedAt: '2026-03-20' },
  { gameId: 'west-r1-g3', winnerId: 'mcneese-west', round: 1, completedAt: '2026-03-19' },
  { gameId: 'west-r1-g4', winnerId: 'uconn-west', round: 1, completedAt: '2026-03-19' },
  { gameId: 'west-r1-g5', winnerId: 'oakland-west', round: 1, completedAt: '2026-03-19' },
  { gameId: 'west-r1-g6', winnerId: 'wisconsin-west', round: 1, completedAt: '2026-03-19' },
  { gameId: 'west-r1-g7', winnerId: 'louisville-west', round: 1, completedAt: '2026-03-20' },
  { gameId: 'west-r1-g8', winnerId: 'auburn-west', round: 1, completedAt: '2026-03-20' },

  // West round of 32
  { gameId: 'west-r2-g1', winnerId: 'kansas-west', round: 2, completedAt: '2026-03-22' },
  { gameId: 'west-r2-g2', winnerId: 'uconn-west', round: 2, completedAt: '2026-03-21' },
  { gameId: 'west-r2-g3', winnerId: 'oakland-west', round: 2, completedAt: '2026-03-21' },
  { gameId: 'west-r2-g4', winnerId: 'auburn-west', round: 2, completedAt: '2026-03-22' },

  // Midwest round of 64
  { gameId: 'midwest-r1-g1', winnerId: 'kentucky-midwest', round: 1, completedAt: '2026-03-19' },
  { gameId: 'midwest-r1-g2', winnerId: 'stanford-midwest', round: 1, completedAt: '2026-03-19' },
  { gameId: 'midwest-r1-g3', winnerId: 'michigan-midwest', round: 1, completedAt: '2026-03-20' },
  { gameId: 'midwest-r1-g4', winnerId: 'iowa-midwest', round: 1, completedAt: '2026-03-20' },
  { gameId: 'midwest-r1-g5', winnerId: 'clemson-midwest', round: 1, completedAt: '2026-03-20' },
  { gameId: 'midwest-r1-g6', winnerId: 'illinois-midwest', round: 1, completedAt: '2026-03-20' },
  { gameId: 'midwest-r1-g7', winnerId: 'oklahoma-midwest', round: 1, completedAt: '2026-03-20' },
  { gameId: 'midwest-r1-g8', winnerId: 'northcarolina-midwest', round: 1, completedAt: '2026-03-20' },

  // Midwest round of 32
  { gameId: 'midwest-r2-g1', winnerId: 'kentucky-midwest', round: 2, completedAt: '2026-03-21' },
  { gameId: 'midwest-r2-g2', winnerId: 'iowa-midwest', round: 2, completedAt: '2026-03-22' },
  { gameId: 'midwest-r2-g3', winnerId: 'clemson-midwest', round: 2, completedAt: '2026-03-22' },
  { gameId: 'midwest-r2-g4', winnerId: 'northcarolina-midwest', round: 2, completedAt: '2026-03-22' },

  // ─── Sweet 16 (Round 3) ─── Mar 27–28 ────────────────────────────────────

  // East: Duke (1) over St. John's (5)
  { gameId: 'east-r3-g1', winnerId: 'duke-east', round: 3, completedAt: '2026-03-27' },
  // East: Tennessee/UConn (2) over Baylor/MSU (3)
  { gameId: 'east-r3-g2', winnerId: 'tennessee-east', round: 3, completedAt: '2026-03-27' },
  // South: Texas A&M/Nebraska (4) over Florida St/Iowa (9) — Cinderella run ends
  { gameId: 'south-r3-g1', winnerId: 'texasam-south', round: 3, completedAt: '2026-03-28' },
  // South: Alabama/Houston (2) over Florida/Illinois (3)
  { gameId: 'south-r3-g2', winnerId: 'alabama-south', round: 3, completedAt: '2026-03-28' },
  // West: Kansas/Arizona (1) over UConn/Arkansas (4)
  { gameId: 'west-r3-g1', winnerId: 'kansas-west', round: 3, completedAt: '2026-03-27' },
  // West: Auburn/Purdue (2) over Oakland/Texas (11) — upset bid falls short
  { gameId: 'west-r3-g2', winnerId: 'auburn-west', round: 3, completedAt: '2026-03-28' },
  // Midwest: Kentucky/Michigan (1) over Iowa/Alabama (4)
  { gameId: 'midwest-r3-g1', winnerId: 'kentucky-midwest', round: 3, completedAt: '2026-03-27' },
  // Midwest: North Carolina/Iowa State (2) over Clemson/Tennessee (6)
  { gameId: 'midwest-r3-g2', winnerId: 'northcarolina-midwest', round: 3, completedAt: '2026-03-28' },

  // ─── Elite Eight (Round 4) ─── Mar 29 ────────────────────────────────────

  // East: Duke (1) over UConn (2) — Cooper Flagg 28 pts
  { gameId: 'east-r4-g1', winnerId: 'duke-east', round: 4, completedAt: '2026-03-29' },
  // South: Houston (2) over Nebraska (4)
  { gameId: 'south-r4-g1', winnerId: 'alabama-south', round: 4, completedAt: '2026-03-29' },
  // West: Purdue (2) over Arizona (1) — upset!
  { gameId: 'west-r4-g1', winnerId: 'auburn-west', round: 4, completedAt: '2026-03-29' },
  // Midwest: Michigan (1) over Iowa State (2)
  { gameId: 'midwest-r4-g1', winnerId: 'kentucky-midwest', round: 4, completedAt: '2026-03-29' },

  // ─── Final Four (Round 5) ─── Apr 4 ──────────────────────────────────────

  // East champ Duke (1) vs West champ Purdue (2) → Duke
  { gameId: 'ff-g1', winnerId: 'duke-east', round: 5, completedAt: '2026-04-04' },
  // South champ Houston (2) vs Midwest champ Michigan (1) → Houston
  { gameId: 'ff-g2', winnerId: 'alabama-south', round: 5, completedAt: '2026-04-04' },

  // ─── Championship (Round 6) ─── Apr 6 ─────────────────────────────────────

  // Duke (1) vs Houston (2) → Duke wins the national championship
  { gameId: 'championship', winnerId: 'duke-east', round: 6, completedAt: '2026-04-06' },
]
