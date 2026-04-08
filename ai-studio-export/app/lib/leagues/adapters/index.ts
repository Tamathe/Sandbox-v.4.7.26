import { LeagueKind } from '../../../generated/prisma'

import type { LeagueAdapter, LeagueKindValue } from '../types'
import { coffeeRouletteAdapter } from './coffee-roulette'
import { predictionMarketAdapter } from './prediction-market'
import { survivorPoolAdapter } from './survivor-pool'

const leagueAdapters: Partial<Record<LeagueKindValue, LeagueAdapter>> = {
  [LeagueKind.COFFEE_ROULETTE]: coffeeRouletteAdapter,
  [LeagueKind.PREDICTION_MARKET]: predictionMarketAdapter,
  [LeagueKind.SURVIVOR_POOL]: survivorPoolAdapter,
}

export function getLeagueAdapter(kind: LeagueKindValue) {
  const adapter = leagueAdapters[kind]

  if (!adapter) {
    throw new Error(`No adapter registered for ${kind}`)
  }

  return adapter
}

export const SUPPORTED_LEAGUE_KINDS = [
  LeagueKind.PREDICTION_MARKET,
  LeagueKind.SURVIVOR_POOL,
  LeagueKind.COFFEE_ROULETTE,
] satisfies LeagueKindValue[]
