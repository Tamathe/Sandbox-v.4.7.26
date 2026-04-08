import { LeagueShell } from '../../components/leagues/LeagueShell'

export default function SurvivorPoolPage() {
  return (
    <LeagueShell
      meta={{
        kind: 'SURVIVOR_POOL',
        title: 'Survivor Pool',
        subtitle: 'One pick per cycle. No repeats. The league engine handles join codes, standings, and the weekly loop.',
        accentClass: 'bg-gradient-to-r from-[#0033A0] to-[#2458c4]',
      }}
    />
  )
}
