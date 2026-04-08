import { LeagueShell } from '../../components/leagues/LeagueShell'

export default function CoffeeRoulettePage() {
  return (
    <LeagueShell
      meta={{
        kind: 'COFFEE_ROULETTE',
        title: 'Coffee Roulette',
        subtitle: 'Turn the same five-part loop into lightweight community building: join code, pairings, confirmations, leaderboard, Monday nudge.',
        accentClass: 'bg-gradient-to-r from-[#0033A0] to-sky-600',
      }}
    />
  )
}
