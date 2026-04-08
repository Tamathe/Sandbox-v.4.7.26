import { LeagueShell } from '../../components/leagues/LeagueShell'

export default function PredictionMarketPage() {
  return (
    <LeagueShell
      meta={{
        kind: 'PREDICTION_MARKET',
        title: 'Prediction Market',
        subtitle: 'Join with a code, bet Sand on a shared question, resolve the outcome, and let the leaderboard keep score.',
        accentClass: 'bg-[#0033A0]',
      }}
    />
  )
}
